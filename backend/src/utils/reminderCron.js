const cron = require('node-cron');
const Booking = require('../models/Booking');
const Event = require('../models/Event');
const Notification = require('../models/Notification');

/**
 * Core reminder logic — finds all UPCOMING events happening tomorrow
 * and sends EVENT_REMINDER notifications to all confirmed attendees.
 * Can be called manually or triggered by the cron.
 */
const runReminderJob = async () => {
  console.log('⏰ [ReminderCron] Running event reminder job...');

  const now = new Date();

  // Calculate tomorrow's date range (midnight to midnight)
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(now.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  // Find all UPCOMING events happening tomorrow
  const upcomingEvents = await Event.find({
    date: { $gte: tomorrowStart, $lte: tomorrowEnd },
    status: 'UPCOMING'
  });

  if (upcomingEvents.length === 0) {
    console.log('ℹ️  [ReminderCron] No events scheduled for tomorrow. Skipping.');
    return { sent: 0, events: 0 };
  }

  console.log(`📅 [ReminderCron] Found ${upcomingEvents.length} event(s) happening tomorrow.`);

  let totalNotificationsSent = 0;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  for (const event of upcomingEvents) {
    // Find all confirmed bookings for this event
    const bookings = await Booking.find({
      event: event._id,
      status: 'CONFIRMED'
    });

    if (bookings.length === 0) continue;

    const eventDateStr = new Date(event.date).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const message = `<b>🎉 Reminder</b>: Your event "${event.title}" is tomorrow (${eventDateStr}) at ${event.location}. Don't forget your ticket!`;

    for (const booking of bookings) {
      try {
        // Duplicate guard: skip if reminder already sent today for this user+event
        const alreadySent = await Notification.findOne({
          recipient: booking.user,
          event: event._id,
          type: 'EVENT_REMINDER',
          createdAt: { $gte: todayStart }
        });

        if (alreadySent) {
          console.log(`  ⚠️  Reminder already sent to user ${booking.user} for "${event.title}". Skipping.`);
          continue;
        }

        await Notification.create({
          recipient: booking.user,
          message,
          type: 'EVENT_REMINDER',
          booking: booking._id,
          event: event._id
        });

        totalNotificationsSent++;
      } catch (err) {
        console.error(`  ❌ Failed to send reminder to user ${booking.user}:`, err.message);
      }
    }
  }

  console.log(`✅ [ReminderCron] Done! Sent ${totalNotificationsSent} reminder notification(s).`);
  return { sent: totalNotificationsSent, events: upcomingEvents.length };
};

/**
 * Finds all UPCOMING events whose date has passed and marks them as COMPLETED.
 */
const updateEventStatuses = async () => {
  try {
    const now = new Date();
    
    // Find events that need to be completed
    const eventsToComplete = await Event.find({ 
      date: { $lt: now }, 
      status: 'UPCOMING' 
    });

    if (eventsToComplete.length === 0) return;

    const eventIds = eventsToComplete.map(e => e._id);

    // 1. Mark events as COMPLETED
    const result = await Event.updateMany(
      { _id: { $in: eventIds } },
      { $set: { status: 'COMPLETED' } }
    );

    // 2. Unlock Promoter Commissions
    const AffiliatePartnership = require('../models/AffiliatePartnership');
    const User = require('../models/User');

    // Find partnerships that are not yet withdrawable for these events
    const partnershipsToUnlock = await AffiliatePartnership.find({ 
      eventId: { $in: eventIds }, 
      isWithdrawable: false 
    });

    if (partnershipsToUnlock.length > 0) {
      await AffiliatePartnership.updateMany(
        { _id: { $in: partnershipsToUnlock.map(p => p._id) } },
        { $set: { isWithdrawable: true } }
      );

      for (const p of partnershipsToUnlock) {
        if (p.totalCommissionEarned > 0) {
          await User.updateOne(
            { _id: p.promoterId },
            { 
              $inc: { 
                pendingCommission: -p.totalCommissionEarned,
                withdrawableCommission: p.totalCommissionEarned
              } 
            }
          );
        }
      }
    }
    
    console.log(`✅ [ReminderCron] Auto-completed ${result.modifiedCount} past event(s) and unlocked commissions.`);
  } catch (error) {
    console.error('❌ [ReminderCron] Error in auto-completion:', error.message);
  }
};

/**
 * Schedules background jobs.
 */
const startReminderCron = () => {
  // 1. Run daily event reminder at 08:00 AM
  cron.schedule('0 8 * * *', async () => {
    try {
      await runReminderJob();
    } catch (err) {
      console.error('❌ [ReminderCron] Critical error in reminder job:', err.message);
    }
  });

  // 2. Run every day at midnight to update past events to COMPLETED
  cron.schedule('0 0 * * *', async () => {
    try {
      await updateEventStatuses();
    } catch (err) {
      console.error('❌ [ReminderCron] Critical error in status update job:', err.message);
    }
  });

  console.log('✅ [ReminderCron] Background jobs initialized (Daily Reminders & Auto-Completion).');

  // Run once immediately on startup to sync existing past events
  updateEventStatuses();
};

const runAbandonedCheckoutJob = async () => {
  const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const bookings = await Booking.aggregate([
    {
      $match: {
        status: 'PENDING',
        paymentStatus: 'PENDING',
        abandonedEmailSent: false,
        createdAt: { $lte: thirtyMinsAgo, $gte: twentyFourHoursAgo },
        stripePaymentId: { $exists: true, $ne: null }
      }
    },
    { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'user' } },
    { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    { $lookup: { from: 'events', localField: 'event', foreignField: '_id', as: 'event' } },
    { $unwind: { path: '$event', preserveNullAndEmptyArrays: true } }
  ]);

  if (bookings.length === 0) {
    console.log('ℹ️  [ReminderCron] No abandoned checkouts found. Skipping.');
    return { sent: 0 };
  }

  const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  const { sendAbandonedCheckoutEmail } = require('./email');
  let totalSent = 0;

  for (const booking of bookings) {
    try {
      if (!booking.user || !booking.event) continue;

      let checkoutUrl = '';
      if (booking.stripePaymentId && booking.stripePaymentId.startsWith('cs_')) {
        const session = await stripe.checkout.sessions.retrieve(booking.stripePaymentId);
        if (session.url) {
          checkoutUrl = session.url;
        }
      }

      if (!checkoutUrl) {
        console.warn(`⚠️ [ReminderCron] No active Stripe session URL for booking ${booking._id}`);
        continue;
      }

      await sendAbandonedCheckoutEmail(booking.user, booking.event, checkoutUrl);
      await Booking.updateOne({ _id: booking._id }, { $set: { abandonedEmailSent: true } });
      totalSent++;
    } catch (err) {
      console.error(`❌ [ReminderCron] Failed to process abandoned checkout for ${booking._id}:`, err.message);
    }
  }

  console.log(`✅ [ReminderCron] Sent ${totalSent} abandoned checkout email(s).`);
  return { sent: totalSent };
};

module.exports = { startReminderCron, runReminderJob, runAbandonedCheckoutJob };
