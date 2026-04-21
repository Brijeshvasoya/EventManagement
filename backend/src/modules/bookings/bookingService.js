const Booking = require('../../models/Booking');
const Event = require('../../models/Event');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { sendTicketEmail } = require('../../utils/email');
const User = require('../../models/User');

const bookingService = {
  getMyBookings: async (user) => {
    return Booking.find({ user: user.id, status: { $ne: 'CANCELLED' } }).sort({ createdAt: -1 });
  },

  bookEvent: async ({ eventId, ticketType, amountPaid, stripePaymentId, paymentIntentId, quantity }, user) => {
    // Extract ID string if an object was passed accidentally
    const cleanEventId = typeof eventId === 'object' ? (eventId._id || eventId.id) : eventId;

    const event = await Event.findById(cleanEventId);
    if (!event) throw new Error('Event not found');

    // Prevent double processing the same payment session
    let booking = await Booking.findOne({ stripePaymentId });

    if (booking) {
      if (booking.status === 'CONFIRMED') return booking;
      
      booking.status = 'CONFIRMED';
      booking.paymentStatus = 'PAID';
      booking.paymentIntentId = paymentIntentId;
      if (amountPaid) booking.amountPaid = amountPaid;
      await booking.save();
    } else {
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

    // ASYNC EMAIL RECEIPT: Fetch full user if needed (e.g. if called from Webhook with minimal user info)
    (async () => {
      try {
        const fullUser = (user.email && user.name) ? user : await User.findById(user.id || user);
        if (fullUser) {
          await sendTicketEmail(fullUser, booking, event);
        } else {
          console.error('❌ Could not send ticket email: Recipient user details not found');
        }
      } catch (e) {
        console.error('Email failed but booking saved:', e.message);
      }
    })();

    return booking;
  },

  cancelBooking: async (bookingId, user) => {
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
            console.log(`✅ Partial Refund (75%) successful for booking ID: ${bookingId}. Amount: $${booking.amountPaid * 0.75}`);
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
    return true;
  },

  checkIfBooked: async (eventId, userId) => {
    const booking = await Booking.findOne({ event: eventId, user: userId, status: 'CONFIRMED' });
    return !!booking;
  },

  getEventAttendees: async (eventId, user) => {
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
