const Booking = require('../../models/Booking');
const Event = require('../../models/Event');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { sendTicketEmail } = require('../../utils/email');
const { generateTicketPDF } = require('../../utils/pdfGenerator');
const User = require('../../models/User');
const { requireAuth } = require('../../utils/authGuard');
const notificationService = require('../notifications/notificationService');

const bookingService = {
  getMyBookings: async (user) => {
    requireAuth(user);
    return Booking.find({ user: user.id, status: { $ne: 'CANCELLED' } }).sort({ createdAt: -1 });
  },

  bookEvent: async ({ eventId, ticketType, amountPaid, stripePaymentId, paymentIntentId, quantity }, user) => {
    requireAuth(user);
    // Extract ID string if an object was passed accidentally
    const cleanEventId = typeof eventId === 'object' ? (eventId._id || eventId.id) : eventId;

    const event = await Event.findById(cleanEventId).populate('organizer');
    if (!event) throw new Error('Event not found');

    // Prevent double processing the same payment session
    let booking = await Booking.findOne({ stripePaymentId });
    let isNewBooking = false;

    if (booking) {
      if (booking.status === 'CONFIRMED') return booking;

      booking.status = 'CONFIRMED';
      booking.paymentStatus = 'PAID';
      booking.paymentIntentId = paymentIntentId;
      if (amountPaid) booking.amountPaid = amountPaid;
      await booking.save();
    } else {
      isNewBooking = true;
      booking = await Booking.create({
        event: cleanEventId,
        user: user.id,
        ticketType: ticketType || 'REGULAR',
        amountPaid: amountPaid || 0,
        stripePaymentId,
        paymentIntentId,
        status: 'CONFIRMED',
        paymentStatus: 'PAID',
        quantity: quantity || 1
      });
    }

    // Increment Loyalty Points (100 pts per booking)
    if (isNewBooking || booking.status === 'CONFIRMED') {
      await User.findByIdAndUpdate(user.id, { $inc: { loyaltyPoints: 100 } });
    }

    // Notify Organizer
    if (event.organizer) {
      try {
        const userName = user.name || (await User.findById(user.id)).name || 'A user';
        await notificationService.createNotification({
          recipient: event.organizer._id,
          message: `<b>${userName}</b> has booked <b>${booking.quantity}</b> ticket(s) for your event "${event.title}"`,
          type: 'BOOKING_CONFIRMED',
          bookingId: booking._id,
          eventId: event._id
        });
      } catch (err) {
        console.error('Failed to create notification for organizer:', err.message);
      }
    }

    // Notify Attendee (user who just booked)
    try {
      const eventDateStr = new Date(parseInt(event.date) || event.date).toLocaleDateString('en-IN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      await notificationService.createNotification({
        recipient: user.id,
        message: `<b>🎟️ Booking Confirmed</b>: Your booking for "${event.title}" is confirmed! ${booking.quantity} ticket(s) on ${eventDateStr} at ${event.location}.`,
        type: 'TICKET_BOOKED',
        bookingId: booking._id,
        eventId: event._id
      });
    } catch (err) {
      console.error('Failed to create booking notification for attendee:', err.message);
    }

    // ASYNC EMAIL RECEIPT: Fetch full user if needed & generate PDF attachment
    (async () => {

      try {
        const fullUser = (user.email && user.name) ? user : await User.findById(user.id || user);
        if (fullUser) {
          // Generate the PDF buffer
          const pdfBuffer = await generateTicketPDF(fullUser, booking, event);

          // Send email with the attachment
          await sendTicketEmail(fullUser, booking, event, pdfBuffer);
        } else {
          console.error('❌ Could not send ticket email: Recipient user details not found');
        }
      } catch (e) {
        console.error('Email/PDF generation failed but booking saved:', e.message);
      }
    })();

    return booking;
  },

  cancelBooking: async (bookingId, user) => {
    requireAuth(user);
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.user.toString() !== user.id) throw new Error('Unauthorized');
    if (booking.status === 'CANCELLED') throw new Error('Already cancelled');

    // AUTO STRIPE REFUND
    if (booking.stripePaymentId) {
      try {
        let paymentIntentId = booking.stripePaymentId;

        // If it's a Checkout Session ID (starts with cs_), retrieve the session to get the Payment Intent ID
        if (paymentIntentId.startsWith('cs_')) {
          const session = await stripe.checkout.sessions.retrieve(paymentIntentId);
          paymentIntentId = session.payment_intent;
        }

        if (paymentIntentId) {
          // Calculate refund amount (75% of amountPaid)
          // Stripe uses cents for amounts, so if amountPaid is in USD, we multiply by 100
          const refundAmount = Math.round(booking.amountPaid * 0.75 * 100);

          if (refundAmount > 0) {
            await stripe.refunds.create({
              payment_intent: paymentIntentId,
              amount: refundAmount,
              reason: 'requested_by_customer'
            });
            booking.paymentStatus = 'REFUNDED';
          } else {
            console.log(`ℹ️ No refund processed for booking ID: ${bookingId} (Amount was $0)`);
          }
        } else {
          console.warn(`⚠️ No payment intent found for booking ID: ${bookingId}`);
        }
      } catch (err) {
        console.error('❌ Refund Failed (might be already processed):', err.message);
      }
    }

    booking.status = 'CANCELLED';
    await booking.save();

    // Deduct Loyalty Points on cancellation
    await User.findByIdAndUpdate(user.id, { $inc: { loyaltyPoints: -100 } });

    // Notify Attendee about cancellation
    try {
      const cancelledEvent = await Event.findById(booking.event);
      const refundNote = booking.amountPaid > 0
        ? ` A 75% refund of ₹${(booking.amountPaid * 0.75).toFixed(2)} has been initiated.`
        : '';
      await notificationService.createNotification({
        recipient: user.id,
        message: `<b>❌ Booking Cancelled</b>: Your booking for "${cancelledEvent?.title || 'the event'}" has been cancelled.${refundNote}`,
        type: 'EVENT_CANCELLED',
        bookingId: booking._id,
        eventId: booking.event
      });
    } catch (err) {
      console.error('Failed to create cancellation notification for attendee:', err.message);
    }

    return true;
  },

  checkIfBooked: async (eventId, userId) => {
    const booking = await Booking.findOne({ event: eventId, user: userId, status: 'CONFIRMED' });
    return !!booking;
  },

  getEventAttendees: async (eventId, user) => {
    requireAuth(user);
    // Check if user is the organizer of the event
    const event = await Event.findById(eventId);
    if (!event) throw new Error('Event not found');

    // Only the organizer or an admin should see the attendee list
    if (event.organizer.toString() !== user.id && user.role !== 'ADMIN') {
      return null;
    }

    return Booking.find({ event: eventId }).sort({ createdAt: -1 });
  },

  verifyTicket: async (bookingId) => {
    const booking = await Booking.findById(bookingId).populate('user').populate('event');
    if (!booking) throw new Error('Invalid ticket: Booking not found.');

    if (booking.status === 'CHECKED_IN') {
      throw new Error(`Already checked in: Ticket was scanned on ${new Date(booking.updatedAt).toLocaleTimeString()}.`);
    }

    if (booking.status !== 'CONFIRMED') {
      throw new Error(`Access Denied: Ticket is ${booking.status}.`);
    }

    // DATE VALIDATION: Only allow check-in on the day of the event
    const eventDate = new Date(parseInt(booking.event.date) || booking.event.date);
    const today = new Date();

    // Compare YYYY-MM-DD
    if (eventDate.toDateString() !== today.toDateString()) {
      throw new Error(`Access Denied: This ticket is valid for ${eventDate.toLocaleDateString()}. Verification is only permitted on the scheduled day of the event.`);
    }

    booking.status = 'CHECKED_IN';
    await booking.save();

    return booking;
  },

  updatePaymentStatus: async (stripeId, status, paymentStatus) => {
    // stripeId can be session ID or payment intent ID or charge ID
    // We try to find by either stripePaymentId (session) or paymentIntentId
    const booking = await Booking.findOne({
      $or: [{ stripePaymentId: stripeId }, { paymentIntentId: stripeId }]
    });

    if (!booking) {
      console.warn(`⚠️ updatePaymentStatus: No booking found for ID ${stripeId}`);
      return null;
    }

    if (status) booking.status = status;
    if (paymentStatus) booking.paymentStatus = paymentStatus;

    await booking.save();
    return booking;
  }
};

module.exports = bookingService;
