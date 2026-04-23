const mongoose = require('mongoose');
const Notification = require('../../models/Notification');
const { requireAuth } = require('../../utils/authGuard');

const notificationService = {
  getNotifications: async (user) => {
    requireAuth(user);
    const userId = user.id || user._id;
    console.log(`🔔 Fetching notifications for recipient ID: ${userId}`);
    
    const notifications = await Notification.find({ 
      recipient: new mongoose.Types.ObjectId(userId) 
    })
      .sort({ createdAt: -1 })
      .populate('booking')
      .populate('event');
    
    console.log(`✅ Found ${notifications.length} notifications`);
    return notifications;
  },

  getUnreadCount: async (user) => {
    requireAuth(user);
    const userId = user.id || user._id;
    const count = await Notification.countDocuments({ 
      recipient: new mongoose.Types.ObjectId(userId), 
      read: false 
    });
    console.log(`🔢 Unread count for ${userId}: ${count}`);
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
    return Notification.create({
      recipient,
      message,
      type,
      booking: bookingId,
      event: eventId
    });
  }
};

module.exports = notificationService;
