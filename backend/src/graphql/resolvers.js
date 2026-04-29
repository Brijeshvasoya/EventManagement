const { GraphQLError } = require('graphql');
const { withFilter } = require('graphql-subscriptions');
const QRCode = require('qrcode');
const authService = require('../modules/auth/authService');
const eventService = require('../modules/events/eventService');
const bookingService = require('../modules/bookings/bookingService');
const Vendor = require('../models/Vendor');
const notificationService = require('../modules/notifications/notificationService');

const stripeService = require('../modules/payments/stripeService');
const analyticsService = require('../modules/analytics/analyticsService');
const { pubsub, EVENTS } = require('../utils/pubsub');

const resolvers = {
  Query: {
    me: (_, __, { user }) => authService.getMe(user),
    events: (_, args) => eventService.getEvents(args),
    event: (_, { id }) => eventService.getEventById(id),
    myEvents: async (_, __, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const Event = require('../models/Event');
      return await Event.find({ organizer: user.id }).sort({ date: -1 });
    },
    myBookings: (_, __, { user }) => bookingService.getMyBookings(user),
    vendors: async () => await Vendor.find({}),
    myVendors: async (_, __, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      return await Vendor.find({ organizer: user.id });
    },
    vendor: (_, { id }) => Vendor.findById(id),
    myAnalytics: (_, __, { user }) => analyticsService.getOrganizerAnalytics(user),
    myNotifications: (_, __, { user }) => notificationService.getNotifications(user),
    unreadNotificationCount: (_, __, { user }) => notificationService.getUnreadCount(user),
    feedbackInfo: (_, { bookingId }) => bookingService.getPublicBookingForFeedback(bookingId),
    allUsers: async (_, __, { user }) => {
      if (!user || user.role !== 'SUPER_ADMIN') throw new GraphQLError('Unauthorized');
      const User = require('../models/User');
      return await User.find({ role: { $ne: 'SUPER_ADMIN' } }).sort({ createdAt: -1 });
    }
  },
  Mutation: {
    register: (_, args) => authService.register(args),
    login: (_, args) => authService.login(args),
    createEvent: (_, { input }, { user }) => eventService.createEvent(input, user),
    bookEvent: (_, args, { user }) => bookingService.bookEvent(args, user),
    cancelBooking: (_, { bookingId }, { user }) => bookingService.cancelBooking(bookingId, user),
    createCheckoutSession: (_, { eventId, ticketType, quantity }, { user }) => stripeService.createCheckoutSession(eventId, ticketType, quantity, user),
    createPlanCheckoutSession: (_, { planId }, { user }) => stripeService.createPlanCheckoutSession(planId, user),
    confirmPlanPurchase: (_, { sessionId, planId }, { user }) => stripeService.confirmPlanPurchase(sessionId, planId, user),
    updateEvent: (_, { id, input }, { user }) => eventService.updateEvent(id, input, user),
    deleteEvent: (_, { id }, { user }) => eventService.deleteEvent(id, user),
    updateProfile: (_, { name, email, currentPassword, newPassword }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      return authService.updateProfile(user.id, { name, email, currentPassword, newPassword });
    },
    createVendor: async (_, { input }, { user }) => {
      if (!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) throw new GraphQLError('Unauthorized');
      const { eventIds, ...vendorData } = input;

      // Safety: Verify all assigned events belong to this organizer (unless Admin)
      if (eventIds && eventIds.length > 0 && user.role !== 'ADMIN') {
        const Event = require('../models/Event');
        const userEvents = await Event.find({ _id: { $in: eventIds }, organizer: user.id });
        if (userEvents.length !== eventIds.length) {
          throw new GraphQLError('You can only assign vendors to your own events');
        }
      }

      const vendor = new Vendor({ ...vendorData, events: eventIds, organizer: user.id });
      await vendor.save();
      return vendor;
    },
    updateVendor: async (_, { id, input }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const vendor = await Vendor.findById(id);
      if (!vendor) throw new GraphQLError('Vendor not found');
      if (vendor.organizer.toString() !== user.id && user.role !== 'ADMIN') throw new GraphQLError('Forbidden');

      const { eventIds, ...vendorData } = input;

      // Safety: Verify all newly assigned events belong to this organizer (unless Admin)
      if (eventIds && eventIds.length > 0 && user.role !== 'ADMIN') {
        const Event = require('../models/Event');
        const userEvents = await Event.find({ _id: { $in: eventIds }, organizer: user.id });
        if (userEvents.length !== eventIds.length) {
          throw new GraphQLError('You can only assign vendors to your own events');
        }
      }

      Object.assign(vendor, { ...vendorData, events: eventIds });
      await vendor.save();
      return vendor;
    },
    deleteVendor: async (_, { id }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const vendor = await Vendor.findById(id);
      if (!vendor) throw new GraphQLError('Vendor not found');
      if (vendor.organizer.toString() !== user.id && user.role !== 'ADMIN') throw new GraphQLError('Forbidden');
      await Vendor.findByIdAndDelete(id);
      return true;
    },
    verifyTicket: (_, { bookingId }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      return bookingService.verifyTicket(bookingId);
    },
    markNotificationAsRead: (_, { id }, { user }) => notificationService.markAsRead(id, user),
    markAllNotificationsAsRead: (_, __, { user }) => notificationService.markAllAsRead(user),
    redeemReward: async (_, { rewardId, points }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const User = require('../models/User');
      const fullUser = await User.findById(user.id);
      if (!fullUser) throw new GraphQLError('User not found');
      if (fullUser.loyaltyPoints < points) throw new GraphQLError('Not enough loyalty points');

      fullUser.loyaltyPoints -= points;
      if (!fullUser.redeemedRewards) fullUser.redeemedRewards = [];
      fullUser.redeemedRewards.push(rewardId);
      await fullUser.save();

      // Create a notification for the user
      await notificationService.createNotification({
        recipient: user.id,
        title: 'Reward Redeemed',
        message: `Congratulations! You have redeemed "${rewardId}". Check your email for details.`,
        type: 'REWARD_REDEEMED'
      });

      return fullUser;
    },
    forgotPassword: (_, { email }) => authService.forgotPassword(email),
    resetPassword: (_, { token, password }) => authService.resetPassword(token, password),
    submitFeedback: (_, args) => bookingService.submitFeedback(args),
    logout: () => true,
  },
  Feedback: {
    booking: (parent, _, { loaders }) => loaders.bookingLoader.load(parent.booking.toString()),
    event: (parent, _, { loaders }) => loaders.eventLoader.load(parent.event.toString()),
    organizer: (parent, _, { loaders }) => loaders.userLoader.load(parent.organizer.toString()),
    user: (parent, _, { loaders }) => loaders.userLoader.load(parent.user.toString()),
  },
  Vendor: {
    organizer: (parent, _, { loaders }) => {
      const id = parent.organizer._id ? parent.organizer._id.toString() : parent.organizer.toString();
      return loaders.userLoader.load(id);
    },
    events: (parent, _, { loaders }) => {
      if (!parent.events || parent.events.length === 0) return [];
      const ids = parent.events.map(e => e._id ? e._id.toString() : e.toString());
      return loaders.eventLoader.loadMany(ids);
    }
  },
  Event: {
    organizer: (parent, _, { loaders }) => {
      const id = parent.organizer._id ? parent.organizer._id.toString() : parent.organizer.toString();
      return loaders.userLoader.load(id);
    },
    isBooked: async (parent, _, { user }) => {
      if (!user) return false;
      return bookingService.checkIfBooked(parent.id, user.id);
    },
    bookedCount: async (parent) => {
      const Booking = require('../models/Booking');
      const stats = await Booking.aggregate([
        { $match: { event: parent._id || parent.id, status: 'CONFIRMED' } },
        { $group: { _id: null, total: { $sum: "$quantity" } } }
      ]);
      return stats.length > 0 ? stats[0].total : 0;
    },
    attendees: async (parent, _, { user }) => {
      if (!user) return null;
      return bookingService.getEventAttendees(parent.id, user);
    },
    vendors: async (parent) => {
      return await Vendor.find({ events: parent.id });
    }
  },
  Booking: {
    event: (parent, _, { loaders }) => {
      const id = parent.event._id ? parent.event._id.toString() : parent.event.toString();
      return loaders.eventLoader.load(id);
    },
    user: (parent, _, { loaders }) => {
      const id = parent.user._id ? parent.user._id.toString() : parent.user.toString();
      return loaders.userLoader.load(id);
    },
    qrCode: async (parent) => {
      try {
        const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
        return await QRCode.toDataURL(`${baseUrl}/v/${parent.id}`);
      } catch (e) {
        return null; // fallback gracefully if qrcode fails
      }
    }
  },
  Notification: {
    recipient: (parent, _, { loaders }) => {
      const id = parent.recipient?._id ? parent.recipient._id.toString() : parent.recipient?.toString();
      return id ? loaders.userLoader.load(id) : null;
    },
    booking: (parent, _, { loaders }) => {
      const id = parent.booking?._id ? parent.booking._id.toString() : parent.booking?.toString();
      return id ? loaders.bookingLoader.load(id) : null;
    },
    event: (parent, _, { loaders }) => {
      const id = parent.event?._id ? parent.event._id.toString() : parent.event?.toString();
      return id ? loaders.eventLoader.load(id) : null;
    },
  },
  User: {
    createdAt: (parent) => parent.createdAt ? (typeof parent.createdAt === 'string' ? parent.createdAt : parent.createdAt.toISOString()) : null,
    loyaltyPoints: async (parent) => {
      try {
        const Booking = require('../models/Booking');
        const userId = parent._id || parent.id;

        // Count any booking that isn't cancelled
        const count = await Booking.countDocuments({
          user: userId,
          status: { $ne: 'CANCELLED' }
        });

        const storedPoints = parent.loyaltyPoints || 0;
        const hasRedeemed = parent.redeemedRewards && parent.redeemedRewards.length > 0;

        // If 0 points and no redemptions, definitely fallback to count
        if (storedPoints === 0 && !hasRedeemed) {
          return count * 100;
        }

        return Math.max(storedPoints, count * 100);
      } catch (e) {
        return parent.loyaltyPoints || 0;
      }
    },
    redeemedRewards: (parent) => parent.redeemedRewards || [],
    averageRating: async (parent) => {
      if (parent.role !== 'ORGANIZER') return null;
      return parent.averageRating || 0;
    }
  },
  Subscription: {
    notificationAdded: {
      subscribe: withFilter(
        () => {
          console.log('📡 New Subscription request for NOTIFICATION_ADDED');
          return pubsub.asyncIterableIterator([EVENTS.NOTIFICATION_ADDED]);
        },
        (payload, variables, { user }) => {
          if (!user) {
            console.log('Subscription filter failed: No user in context');
            return false;
          }

          if (!payload || !payload.notificationAdded) {
            console.log('Subscription filter failed: No payload');
            return false;
          }

          // Convert everything to string for safe comparison (handling both .id and ._id)
          const recipientId = (payload.notificationAdded.recipient?._id || payload.notificationAdded.recipient || '').toString();
          const userId = (user.id || user._id || '').toString();

          if (!recipientId || !userId) {
            console.log(`Subscription filter: Missing IDs (recipient=${recipientId}, user=${userId})`);
            return false;
          }

          const isMatch = recipientId === userId;
          console.log(`Subscription filter: recipient=${recipientId}, user=${userId}, match=${isMatch}`);
          return isMatch;
        }
      ),
      resolve: (payload) => {
        return payload.notificationAdded;
      }
    }
  }
};
module.exports = resolvers;
