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
 * Schedules the reminder job to run every day at 08:00 AM server time.
 */
const startReminderCron = () => {
  cron.schedule('0 8 * * *', async () => {
    try {
      await runReminderJob();
    } catch (err) {
      console.error('❌ [ReminderCron] Critical error:', err.message);
    }
  });

  console.log('✅ [ReminderCron] Daily event reminder cron scheduled (runs at 08:00 AM every day).');
};

module.exports = { startReminderCron, runReminderJob };
