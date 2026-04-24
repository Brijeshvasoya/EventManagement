const mongoose = require('mongoose');
const Notification = require('../../models/Notification');
const { requireAuth } = require('../../utils/authGuard');

const notificationService = {
  getNotifications: async (user) => {
    requireAuth(user);
    const userId = user.id || user._id;

    const notifications = await Notification.find({
      recipient: new mongoose.Types.ObjectId(userId),
      read: false
    })
      .sort({ createdAt: -1 })
      .populate('booking')
      .populate('event');

    return notifications;
  },

  getUnreadCount: async (user) => {
    requireAuth(user);
    const userId = user.id || user._id;
    const count = await Notification.countDocuments({
      recipient: new mongoose.Types.ObjectId(userId),
      read: false
    });
    return count;
  },

  markAsRead: async (notificationId, user) => {
    requireAuth(user);
    const userId = user.id || user._id;
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { read: true },
      { new: true }
    );
    return notification;
  },

  markAllAsRead: async (user) => {
    requireAuth(user);
    const userId = user.id || user._id;
    await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true }
    );
    return true;
  },

  createNotification: async ({ recipient, message, type, bookingId, eventId }) => {
    const { pubsub, EVENTS } = require('../../utils/pubsub');
    const notification = await Notification.create({
      recipient,
      message,
      type,
      booking: bookingId,
      event: eventId
    });

    // Publish to subscriptions
    pubsub.publish(EVENTS.NOTIFICATION_ADDED, {
      notificationAdded: notification
    });

    return notification;
  }
};

module.exports = notificationService;
