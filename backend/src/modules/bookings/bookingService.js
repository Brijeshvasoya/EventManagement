const Booking = require('../../models/Booking');
const Event = require('../../models/Event');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { sendTicketEmail } = require('../../utils/email');
const { generateTicketPDF } = require('../../utils/pdfGenerator');
const User = require('../../models/User');
const { requireAuth } = require('../../utils/authGuard');
const notificationService = require('../notifications/notificationService');

const Feedback = require('../../models/Feedback');

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
    if (booking && booking.status === 'CONFIRMED') return booking;

    // CAPACITY VALIDATION (Final check before confirmation)
    const bookedStats = await Booking.aggregate([
      { $match: { event: event._id, status: { $in: ['CONFIRMED', 'CHECKED_IN'] } } },
      { $group: { _id: null, total: { $sum: "$quantity" } } }
    ]);
    const totalBooked = bookedStats.length > 0 ? bookedStats[0].total : 0;

    const requestedQty = quantity || 1;
    if (totalBooked + requestedQty > event.capacity) {
      throw new Error(`Sold out! The event capacity has been reached.`);
    }

    // Check specific ticket type capacity
    const ticket = event.ticketTypes.find(t => t.name === (ticketType || 'REGULAR'));
    if (ticket && ticket.capacity) {
      const typeBookedStats = await Booking.aggregate([
        { $match: { event: event._id, ticketType: ticket.name, status: { $in: ['CONFIRMED', 'CHECKED_IN'] } } },
        { $group: { _id: null, total: { $sum: "$quantity" } } }
      ]);
      const typeBooked = typeBookedStats.length > 0 ? typeBookedStats[0].total : 0;
      if (typeBooked + requestedQty > ticket.capacity) {
        throw new Error(`This ticket tier (${ticket.name}) is sold out.`);
      }
    }

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
          title: 'New Booking',
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
        title: 'Booking Confirmed',
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
    let refundSucceeded = false;
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
            // ✅ Only mark REFUNDED if Stripe call succeeded
            booking.paymentStatus = 'REFUNDED';
            refundSucceeded = true;
          } else {
            console.log(`ℹ️ No refund processed for booking ID: ${bookingId} (Amount was $0)`);
          }
        } else {
          console.warn(`⚠️ No payment intent found for booking ID: ${bookingId}`);
        }
      } catch (err) {
        console.error('❌ Refund Failed (might be already processed):', err.message);
        // paymentStatus stays as PAID — don't incorrectly mark as REFUNDED
      }
    }

    booking.status = 'CANCELLED';
    // ✅ Save booking AFTER paymentStatus is finalized — so email reads correct value
    // ✅ Save booking AFTER paymentStatus is finalized — so email reads correct value
    await booking.save();

    // Check Waitlist: Hybrid Priority Approach
    (async () => {
      try {
        const Waitlist = require('../../models/Waitlist');
        // 1. Find the first person in line
        const nextInLine = await Waitlist.findOne({ event: booking.event, status: 'WAITING' }).sort({ createdAt: 1 }).populate('user');
        
        if (nextInLine) {
          const event = await Event.findById(booking.event);
          
          // Helper to notify a user
          const sendSpotNotification = async (userId, eventTitle, isExclusive = false) => {
            const urgencyMsg = isExclusive 
              ? `You have an <b>exclusive 5-minute window</b> to grab this spot!` 
              : `It's first-come, first-served! ⚡`;

            await notificationService.createNotification({
              recipient: userId,
              title: 'Spot Available! 🎟️',
              message: `Good news! A spot has opened up for "<b>${eventTitle}</b>". ${urgencyMsg} Book now before it's gone!`,
              type: 'TICKET_BOOKED',
              eventId: event._id
            });
          };

          // 2. Notify the first person immediately (Exclusive window)
          await sendSpotNotification(nextInLine.user._id, event.title, true);
          nextInLine.status = 'NOTIFIED';
          await nextInLine.save();

          // 3. Wait 5 minutes, then notify everyone else if spots are still open
          setTimeout(async () => {
            try {
              // Re-check capacity
              const currentEvent = await Event.findById(booking.event);
              const bookedStats = await Booking.aggregate([
                { $match: { event: currentEvent._id, status: { $in: ['CONFIRMED', 'CHECKED_IN'] } } },
                { $group: { _id: null, total: { $sum: "$quantity" } } }
              ]);
              const totalBooked = bookedStats.length > 0 ? bookedStats[0].total : 0;

              if (totalBooked < currentEvent.capacity) {
                // Spots still available! Notify the rest of the waitlist
                const remainingWaitlist = await Waitlist.find({ 
                  event: currentEvent._id, 
                  status: 'WAITING' 
                }).populate('user');

                for (const entry of remainingWaitlist) {
                  await sendSpotNotification(entry.user._id, currentEvent.title, false);
                  entry.status = 'NOTIFIED';
                  await entry.save();
                }
              }
            } catch (err) {
              console.error('Waitlist secondary notification failed:', err.message);
            }
          }, 5 * 60 * 1000); // 5 minutes
        }
      } catch (err) {
        console.error('Waitlist primary notification failed:', err.message);
      }
    })();

    // Deduct Loyalty Points on cancellation
    await User.findByIdAndUpdate(user.id, { $inc: { loyaltyPoints: -100 } });

    // Notify Attendee about cancellation
    try {
      const cancelledEvent = await Event.findById(booking.event).populate('organizer');
      const refundNote = refundSucceeded && booking.amountPaid > 0
        ? ` A 75% refund of $${(booking.amountPaid * 0.75).toFixed(2)} has been initiated.`
        : '';

      // Notify Attendee
      await notificationService.createNotification({
        recipient: user.id,
        title: 'Booking Cancelled',
        message: `<b>❌ Booking Cancelled</b>: Your booking for "${cancelledEvent?.title || 'the event'}" has been cancelled.${refundNote}`,
        type: 'EVENT_CANCELLED',
        bookingId: booking._id,
        eventId: booking.event
      });

      // Notify Organizer
      if (cancelledEvent?.organizer) {
        const userName = user.name || (await User.findById(user.id))?.name || 'A user';
        await notificationService.createNotification({
          recipient: cancelledEvent.organizer._id,
          title: 'Ticket Cancelled',
          message: `<b>⚠️ Cancellation</b>: <b>${userName}</b> has cancelled their booking for your event "${cancelledEvent.title}". ${booking.quantity} seat(s) are now available.`,
          type: 'EVENT_CANCELLED',
          bookingId: booking._id,
          eventId: booking.event
        });
      }
    } catch (err) {
      console.error('Failed to create cancellation notifications:', err.message);
    }

    // ASYNC EMAIL DISPATCH: Send cancellation email AFTER refund status is confirmed & saved
    (async () => {
      try {
        const fullUser = (user.email && user.name) ? user : await User.findById(user.id);
        const cancelledEvent = await Event.findById(booking.event);
        if (fullUser && cancelledEvent) {
          const { sendCancellationEmail } = require('../../utils/email');
          const { generateRefundSlipPDF } = require('../../utils/pdfGenerator');

          // ✅ Use the saved booking object — which has the correct final paymentStatus
          const pdfBuffer = await generateRefundSlipPDF(fullUser, booking, cancelledEvent);

          await sendCancellationEmail(fullUser, booking, cancelledEvent, pdfBuffer);
          console.log(`✅ Refund slip emailed to ${fullUser.email} (Status: ${booking.paymentStatus})`);
        }
      } catch (e) {
        console.error('❌ Cancellation email failed but booking updated:', e.message);
      }
    })();

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
    if (event.organizer.toString() !== user.id && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
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

    // Verification is only allowed within 2 hours before the event starts
    const diffInMs = eventDate.getTime() - today.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours > 2) {
      throw new Error('Access Denied: Ticket verification opens 2 hours before the event starts.');
    }

    // Compare YYYY-MM-DD
    if (eventDate.toDateString() !== today.toDateString()) {
      throw new Error(`Access Denied: This ticket is valid for ${eventDate.toLocaleDateString()}. Verification is only permitted on the scheduled day of the event.`);
    }

    booking.status = 'CHECKED_IN';
    await booking.save();

    // Notify Attendee about successful check-in
    try {
      await notificationService.createNotification({
        recipient: booking.user._id,
        title: 'Ticket Checked In',
        message: `<b>✅ Checked In</b>: You have successfully checked in for "${booking.event.title}". Enjoy the event!`,
        type: 'TICKET_CHECKED_IN',
        bookingId: booking._id,
        eventId: booking.event._id
      });
    } catch (err) {
      console.error('Failed to create check-in notification:', err.message);
    }

    // ASYNC EMAIL DISPATCH: Send feedback request email
    (async () => {
      try {
        const { sendCheckInFeedbackEmail } = require('../../utils/email');
        await sendCheckInFeedbackEmail(booking.user, booking, booking.event);
      } catch (e) {
        console.error('❌ Feedback email failed but check-in successful:', e.message);
      }
    })();

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
  },

  getPublicBookingForFeedback: async (bookingId) => {
    const booking = await Booking.findById(bookingId).populate('event');
    if (!booking) throw new Error('Booking not found');
    if (booking.status !== 'CHECKED_IN') throw new Error("You can submit feedback only after you have checked in to the event.");

    // Populate organizer name for display
    const Event = require('../../models/Event'); // ensure populated
    const populatedEvent = await Event.findById(booking.event).populate('organizer');

    // Check for existing feedback
    const existingFeedback = await Feedback.findOne({ booking: bookingId });

    return {
      id: booking.id,
      eventTitle: populatedEvent.title,
      organizerName: populatedEvent.organizer?.name || 'Organizer',
      status: booking.status,
      existingRating: existingFeedback?.rating,
      existingComment: existingFeedback?.comment
    };
  },

  submitFeedback: async ({ bookingId, rating, comment }) => {
    if (rating < 1 || rating > 5) throw new Error('Rating must be between 1 and 5');

    const booking = await Booking.findById(bookingId).populate('event');
    if (!booking) throw new Error('Booking not found');

    // Check if feedback already exists
    const existingFeedback = await Feedback.findOne({ booking: bookingId });
    if (existingFeedback) throw new Error('Feedback already submitted for this booking');

    // We only allow feedback for CHECKED_IN bookings
    if (booking.status !== 'CHECKED_IN') {
      throw new Error('Feedback can only be submitted for valid, checked-in tickets.');
    }

    const event = booking.event;
    const organizerId = event.organizer;

    // Create Feedback (using the user from the booking itself)
    const feedback = await Feedback.create({
      booking: bookingId,
      event: event._id,
      organizer: organizerId,
      user: booking.user,
      rating,
      comment
    });

    // Update Organizer Stats
    const organizer = await User.findById(organizerId);
    if (organizer) {
      const currentTotal = organizer.averageRating * organizer.numReviews;
      organizer.numReviews += 1;
      organizer.averageRating = (currentTotal + rating) / organizer.numReviews;
      await organizer.save();
    }

    return feedback;
  }
};

module.exports = bookingService;
