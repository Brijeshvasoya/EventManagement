const mongoose = require('mongoose');
const { GraphQLError } = require('graphql');
const { withFilter } = require('graphql-subscriptions');
const QRCode = require('qrcode');
const authService = require('../modules/auth/authService');
const eventService = require('../modules/events/eventService');
const bookingService = require('../modules/bookings/bookingService');
const Vendor = require('../models/Vendor');
const notificationService = require('../modules/notifications/notificationService');

const stripeService = require('../modules/payments/stripeService');
const razorpayService = require('../modules/payments/razorpayService');
const analyticsService = require('../modules/analytics/analyticsService');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Event = require('../models/Event');
const SupportTicket = require('../models/SupportTicket');
const AffiliatePartnership = require('../models/AffiliatePartnership');
const CommissionPayout = require('../models/CommissionPayout');
const { pubsub, EVENTS } = require('../utils/pubsub');

const resolvers = {
  Query: {
    me: async (_, __, { user }) => {
      if (!user) return null;
      const User = require('../models/User');
      return await User.findById(user.id);
    },
    events: (_, args) => eventService.getEvents(args),
    event: (_, { id }) => eventService.getEventById(id),
    myEvents: async (_, { limit = 1000, offset = 0 }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const Event = require('../models/Event');
      return await Event.find({ organizer: user.id })
        .sort({ date: -1 })
        .skip(offset)
        .limit(limit);
    },
    myBookings: (_, __, { user }) => bookingService.getMyBookings(user),
    booking: async (_, { id }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error('Invalid Booking ID format. Please use the full 24-character ID.');
      }
      const booking = await Booking.findById(id).populate('user event');
      if (!booking) throw new Error('Booking not found');
      return booking;
    },
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
    },
    myPayouts: async (_, __, { user }) => {
      if (!user || user.role !== 'ORGANIZER') return [];
      const Payout = require('../models/Payout');
      return Payout.find({ organizer: user.id }).sort({ createdAt: -1 });
    },
    allPayouts: async (_, __, { user }) => {
      if (!user || user.role !== 'SUPER_ADMIN') return [];
      const Payout = require('../models/Payout');
      return Payout.find().sort({ createdAt: -1 });
    },
    myBilling: async (_, __, { user }) => {
      if (!user || user.role !== 'ORGANIZER') throw new GraphQLError('Unauthorized');
      const User = require('../models/User');
      const PlanInvoice = require('../models/PlanInvoice');
      const fullUser = await User.findById(user.id);
      const invoices = await PlanInvoice.find({ organizer: user.id }).sort({ createdAt: -1 });
      const isPlanActive = fullUser.isPlanPurchased &&
        fullUser.planExpiresAt &&
        new Date(fullUser.planExpiresAt) > new Date();

      // Prorated upgrade preview: if user is on BASIC, calculate how much they'd pay to upgrade to PRO
      const BASIC_PRICE = 799;
      const PRO_PRICE = 2499;
      let proratedUpgradeAmount = PRO_PRICE; // default full price
      if (fullUser.planId === 'BASIC' && isPlanActive && fullUser.planExpiresAt) {
        const msLeft = new Date(fullUser.planExpiresAt) - new Date();
        const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
        const credit = Math.round((BASIC_PRICE / 30) * daysLeft);
        proratedUpgradeAmount = Math.max(0, PRO_PRICE - credit);
      }

      return {
        currentPlan: fullUser.planId || null,
        planExpiresAt: fullUser.planExpiresAt ? fullUser.planExpiresAt.toISOString() : null,
        isPlanActive: !!isPlanActive,
        scheduledPlanId: fullUser.scheduledPlanId || null,
        scheduledDowngradeAt: fullUser.scheduledDowngradeAt ? fullUser.scheduledDowngradeAt.toISOString() : null,
        proratedUpgradeAmount,
        invoices: invoices.map(inv => ({
          id: inv._id.toString(),
          planId: inv.planId,
          amount: inv.amount,
          currency: inv.currency,
          status: inv.status,
          stripeSessionId: inv.stripeSessionId,
          planStartDate: inv.planStartDate.toISOString(),
          planEndDate: inv.planEndDate.toISOString(),
          createdAt: inv.createdAt.toISOString(),
        }))
      };
    },
    validatePromoCode: async (_, { code, eventId }) => {
      const PromoCode = require('../models/PromoCode');
      const promo = await PromoCode.findOne({
        code: code.toUpperCase(),
        isActive: true,
        expiresAt: { $gte: new Date() }
      });

      if (!promo) throw new Error('Invalid or expired promo code');
      if (promo.usageCount >= promo.usageLimit) throw new Error('Promo code usage limit reached');
      if (promo.eventId && promo.eventId.toString() !== eventId) throw new Error('This code is not valid for this event');

      return promo;
    },
    myPromoCodes: async (_, __, { user }) => {
      if (!user || user.role !== 'ORGANIZER') throw new Error('Unauthorized');
      const PromoCode = require('../models/PromoCode');
      return await PromoCode.find({ organizer: user.id }).sort({ createdAt: -1 });
    },
    mySupportTickets: async (_, { status, type, eventId, limit = 20, offset = 0 }, { user, loaders }) => {
      if (!user) throw new GraphQLError('Unauthorized');

      // Safety: Force clean ID
      const userId = (user.id && typeof user.id === 'object' && user.id._id)
        ? user.id._id.toString()
        : user.id?.toString() || user.id;

      let query = {};

      // 1. Base Role-based Visibility
      if (user.role === 'SUPER_ADMIN') {
        query.type = 'ORGANIZER_TO_ADMIN';
      } else if (user.role === 'ORGANIZER') {
        query.$or = [
          { organizer: userId },
          { user: userId, type: 'ORGANIZER_TO_ADMIN' }
        ];
      } else {
        query.user = userId;
      }

      // 2. Apply Dynamic Filters
      if (status) query.status = status;
      if (type) query.type = type;
      if (eventId) query.event = eventId;

      try {
        const tickets = await SupportTicket.find(query)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit);

        // Manual Robust Population
        const populatedTickets = await Promise.all(tickets.map(async (ticket) => {
          const t = ticket.toObject();
          // Ensure Ticket ID is mapped
          t.id = ticket._id.toString();

          try {
            if (t.user && typeof t.user === 'string' && !t.user.startsWith('{')) {
              t.user = await loaders.userLoader.load(t.user);
            }
            if (t.organizer && typeof t.organizer === 'string' && !t.organizer.startsWith('{')) {
              t.organizer = await loaders.userLoader.load(t.organizer);
            }
            if (t.event && typeof t.event === 'string' && !t.event.startsWith('{')) {
              t.event = await loaders.eventLoader.load(t.event);
            }

            // Ensure Message IDs are mapped
            if (t.messages) {
              t.messages = await Promise.all(t.messages.map(async (msg) => {
                const m = { ...msg, id: msg._id?.toString() || msg.id };
                if (m.sender && typeof m.sender === 'string' && !m.sender.startsWith('{')) {
                  m.sender = await loaders.userLoader.load(m.sender);
                }
                return m;
              }));
            }
          } catch (e) {
            console.error('Error populating ticket:', t.id, e);
          }
          return t;
        }));

        return populatedTickets.filter(t => t.user && typeof t.user === 'object');
      } catch (error) {
        console.error('Final fallback error:', error);
        return [];
      }
    },
    // ── Affiliate Queries ──
    getMyPromoterRequests: async (_, __, { user }) => {
      if (!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) return [];
      return AffiliatePartnership.find({ organizerId: user.id }).sort({ createdAt: -1 });
    },
    getMyPromoterPayoutRequests: async (_, __, { user }) => {
      if (!user || (user.role !== 'ORGANIZER' && user.role !== 'ADMIN')) return [];
      return CommissionPayout.find({ organizerId: user.id }).sort({ createdAt: -1 });
    },
    getMyPromotions: async (_, __, { user }) => {
      if (!user) return [];
      return AffiliatePartnership.find({ promoterId: user.id }).sort({ createdAt: -1 });
    },
    getMyCommissionPayouts: async (_, __, { user }) => {
      if (!user) return [];
      return CommissionPayout.find({ promoterId: user.id }).sort({ createdAt: -1 });
    },
    getAllPromoters: async (_, __, { user }) => {
      if (!user || user.role !== 'SUPER_ADMIN') throw new GraphQLError('Unauthorized');
      return User.find({ isPromoter: true }).sort({ createdAt: -1 });
    },
    getAllAffiliatePartnerships: async (_, __, { user }) => {
      if (!user || user.role !== 'SUPER_ADMIN') throw new GraphQLError('Unauthorized');
      return AffiliatePartnership.find().sort({ createdAt: -1 });
    },
    validateAffiliateCode: async (_, { code, eventId }) => {
      const partnership = await AffiliatePartnership.findOne({
        promoCode: code.toUpperCase(),
        status: 'APPROVED'
      });
      if (!partnership) return { valid: false, message: 'Invalid promo code' };
      if (partnership.eventId.toString() !== eventId) return { valid: false, message: 'This code is not valid for this event' };

      const event = await Event.findById(eventId);
      if (!event) return { valid: false, message: 'Event not found' };
      if (new Date(event.date) < new Date()) return { valid: false, message: 'Event has already passed' };

      const originalPrice = event.ticketTypes.length > 0 ? event.ticketTypes[0].price : 0;
      const discountAmount = (originalPrice * (partnership.customerDiscount || 0)) / 100;
      const sellingPrice = originalPrice - discountAmount;

      return {
        valid: true,
        sellingPrice,
        originalPrice,
        discountAmount,
        discountPercentage: partnership.customerDiscount,
        pricingModel: partnership.pricingModel,
        message: partnership.customerDiscount > 0
          ? `Special Discount Applied! You save ₹${discountAmount.toFixed(2)} (${partnership.customerDiscount}% off)`
          : 'Promo code applied!'
      };
    },
    getAffiliateEvents: async (_, __, { user }) => {
      if (!user) return [];
      return Event.find({ isAffiliateEnabled: true, status: 'UPCOMING' }).sort({ date: 1 });
    }
  },
  Mutation: {
    register: (_, args) => authService.register(args),
    login: (_, args) => authService.login(args),
    createEvent: (_, { input }, { user }) => eventService.createEvent(input, user),
    bookEvent: (_, args, { user }) => bookingService.bookEvent(args, user),
    cancelBooking: (_, { bookingId }, { user }) => bookingService.cancelBooking(bookingId, user),
    createCheckoutSession: (_, { eventId, ticketType, quantity, promoCode }, { user }) => stripeService.createCheckoutSession(eventId, ticketType, quantity, user, promoCode),
    createPlanCheckoutSession: (_, { planId, interval }, { user }) => stripeService.createPlanCheckoutSession(planId, user, interval || 'MONTH'),
    confirmPlanPurchase: (_, { sessionId, planId, proratedCredit, interval }, { user }) => stripeService.confirmPlanPurchase(sessionId, planId, user, proratedCredit || 0, interval || 'MONTH'),
    scheduleDowngrade: (_, { targetPlanId }, { user }) => stripeService.scheduleDowngrade(targetPlanId, user),
    cancelScheduledDowngrade: (_, __, { user }) => stripeService.cancelScheduledDowngrade(user),
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
    verifyTicket: (_, { bookingId, count }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      return bookingService.verifyTicket(bookingId, count);
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
    requestPayout: async (_, { amount }, { user }) => {
      if (!user || user.role !== 'ORGANIZER') throw new GraphQLError('Unauthorized');

      const User = require('../models/User');
      const fullUser = await User.findById(user.id);

      // Calculate available payout on the fly to ensure accuracy
      const Booking = require('../models/Booking');
      const Event = require('../models/Event');
      const Payout = require('../models/Payout');

      const events = await Event.find({ organizer: user.id });
      const eventIds = events.map(e => e._id);

      const bookings = await Booking.aggregate([
        { $match: { event: { $in: eventIds }, paymentStatus: 'PAID', status: { $in: ['CONFIRMED', 'CHECKED_IN'] } } },
        { $group: { _id: null, total: { $sum: "$amountPaid" } } }
      ]);

      const totalRevenue = bookings.length > 0 ? bookings[0].total : 0;

      const payouts = await Payout.aggregate([
        { $match: { organizer: user.id, status: { $in: ['COMPLETED', 'PENDING'] } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]);

      const totalWithdrawnAndPending = payouts.length > 0 ? payouts[0].total : 0;
      const availablePayout = Math.max(0, (totalRevenue * 0.9) - totalWithdrawnAndPending);

      if (amount > availablePayout) {
        throw new GraphQLError(`Insufficient balance. Maximum you can withdraw is ₹${availablePayout.toFixed(2)} (after 10% platform fee).`);
      }

      const payout = new Payout({ organizer: user.id, amount });
      await payout.save();
      return payout;
    },
    approvePayout: async (_, { payoutId }, { user }) => {
      if (!user || user.role !== 'SUPER_ADMIN') throw new GraphQLError('Unauthorized');

      const Payout = require('../models/Payout');
      const User = require('../models/User');

      const payout = await Payout.findById(payoutId);
      if (!payout) throw new GraphQLError('Payout not found');
      if (payout.status === 'COMPLETED') throw new GraphQLError('Payout already completed');

      const organizer = await User.findById(payout.organizer);
      if (!organizer) throw new GraphQLError('Organizer not found');

      // Attempt Razorpay Payout
      try {
        await razorpayService.processPayout(payout, organizer);
      } catch (e) {
        throw new GraphQLError(`Razorpay Payout Failed: ${e.message}`);
      }

      payout.status = 'COMPLETED';
      await payout.save();
      return payout;
    },
    updateBankDetails: async (_, { accountHolderName, accountNumber, bankName, ifscCode }, { user }) => {
      if (!user || user.role !== 'ORGANIZER') throw new GraphQLError('Unauthorized');
      const User = require('../models/User');
      const updatedUser = await User.findByIdAndUpdate(
        user.id,
        { bankDetails: { accountHolderName, accountNumber, bankName, ifscCode } },
        { new: true }
      );
      return updatedUser;
    },
    joinWaitlist: async (_, { eventId }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const Waitlist = require('../models/Waitlist');
      const Event = require('../models/Event');

      const event = await Event.findById(eventId);
      if (!event) throw new GraphQLError('Event not found');

      const existing = await Waitlist.findOne({ event: eventId, user: user.id });
      if (existing) throw new GraphQLError('You are already on the waitlist for this event');

      await Waitlist.create({ event: eventId, user: user.id });
      return true;
    },
    createPromoCode: async (_, { input }, { user }) => {
      if (!user || user.role !== 'ORGANIZER') throw new Error('Unauthorized');
      const PromoCode = require('../models/PromoCode');
      return await PromoCode.create({ ...input, organizer: user.id });
    },
    updatePromoCode: async (_, { id, input }, { user }) => {
      if (!user || user.role !== 'ORGANIZER') throw new Error('Unauthorized');
      const PromoCode = require('../models/PromoCode');
      const promo = await PromoCode.findOne({ _id: id, organizer: user.id });
      if (!promo) throw new Error('Promo code not found or unauthorized');
      return await PromoCode.findByIdAndUpdate(id, input, { new: true });
    },
    deletePromoCode: async (_, { id }, { user }) => {
      if (!user || user.role !== 'ORGANIZER') throw new Error('Unauthorized');
      const PromoCode = require('../models/PromoCode');
      const result = await PromoCode.deleteOne({ _id: id, organizer: user.id });
      return result.deletedCount > 0;
    },
    triggerAbandonedCheckout: async (_, { sessionId }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const stripeService = require('../modules/payments/stripeService');
      return await stripeService.triggerAbandonedCheckoutEmail(sessionId, user);
    },
    confirmPayment: (_, { bookingId }, { user }) => bookingService.confirmPaymentManually(bookingId, user),
    createSupportTicket: async (_, { eventId, type, subject, description }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      if (user.role === 'SUPER_ADMIN') throw new GraphQLError('Super Admins cannot create support tickets');

      let organizerId = null;
      if (type === 'USER_TO_ORGANIZER' && eventId) {
        const Event = require('../models/Event');
        const event = await Event.findById(eventId);
        if (event) organizerId = event.organizer;
      }
      const ticket = new SupportTicket({
        user: user.id.toString(),
        event: eventId,
        organizer: organizerId,
        type,
        subject,
        description,
        messages: [{
          message: description,
          sender: user.id.toString()
        }]
      });
      await ticket.save();
      return ticket;
    },
    replyToSupportTicket: async (_, { ticketId, message }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const ticket = await SupportTicket.findById(ticketId);
      if (!ticket) throw new GraphQLError('Ticket not found');

      // Security Check: Only involved parties can reply
      const isCreator = ticket.user.toString() === user.id;
      const isAssignedOrganizer = ticket.organizer?.toString() === user.id;
      const isAdminTask = ticket.type === 'ORGANIZER_TO_ADMIN' && user.role === 'SUPER_ADMIN';

      if (!isCreator && !isAssignedOrganizer && !isAdminTask) {
        throw new GraphQLError('Forbidden: You are not authorized to reply to this ticket');
      }

      ticket.messages.push({ message, sender: user.id.toString() });
      // ticket.status = 'OPEN'; // Removed automatic re-open as per user feedback
      await ticket.save();

      pubsub.publish(EVENTS.TICKET_UPDATED, { ticketUpdated: ticket });

      return ticket;
    },
    reopenSupportTicket: async (_, { ticketId }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const ticket = await SupportTicket.findById(ticketId);
      if (!ticket) throw new GraphQLError('Ticket not found');

      const isCreator = ticket.user.toString() === user.id;
      const isAssignedOrganizer = ticket.organizer?.toString() === user.id;
      const isAdminTask = ticket.type === 'ORGANIZER_TO_ADMIN' && user.role === 'SUPER_ADMIN';

      if (!isCreator && !isAssignedOrganizer && !isAdminTask) {
        throw new GraphQLError('Forbidden');
      }

      ticket.status = 'OPEN';
      await ticket.save();

      pubsub.publish(EVENTS.TICKET_UPDATED, { ticketUpdated: ticket });

      return ticket;
    },
    resolveSupportTicket: async (_, { ticketId }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const ticket = await SupportTicket.findById(ticketId);
      if (!ticket) throw new GraphQLError('Ticket not found');

      // Security Check: Creator or Responder can resolve
      const isCreator = ticket.user.toString() === user.id;
      const isAssignedOrganizer = ticket.organizer?.toString() === user.id;
      const isAdminTask = ticket.type === 'ORGANIZER_TO_ADMIN' && user.role === 'SUPER_ADMIN';

      if (!isCreator && !isAssignedOrganizer && !isAdminTask) {
        throw new GraphQLError('Forbidden: You are not authorized to resolve this ticket');
      }

      ticket.status = 'RESOLVED';
      await ticket.save();

      pubsub.publish(EVENTS.TICKET_UPDATED, { ticketUpdated: ticket });

      return ticket;
    },
    // ── Affiliate Mutations ──
    becomePromoter: async (_, __, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const fullUser = await User.findById(user.id);
      if (!fullUser) throw new GraphQLError('User not found');

      fullUser.isPromoter = true;
      await fullUser.save();

      // Reuse existing createConnectAccount for Stripe onboarding
      const onboardingUrl = await stripeService.createConnectAccount(user);
      return onboardingUrl;
    },
    requestAffiliatePartnership: async (_, { eventId }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const fullUser = await User.findById(user.id);
      if (!fullUser || !fullUser.isPromoter) throw new GraphQLError('You must become a promoter first');

      const event = await Event.findById(eventId);
      if (!event) throw new GraphQLError('Event not found');
      if (!event.isAffiliateEnabled) throw new GraphQLError('This event does not accept promoter applications');
      if (event.organizer.toString() === user.id) throw new GraphQLError('You cannot promote your own event');

      const existing = await AffiliatePartnership.findOne({ promoterId: user.id, eventId });
      if (existing) throw new GraphQLError('You have already applied to promote this event');

      const partnership = new AffiliatePartnership({
        promoterId: user.id,
        eventId,
        organizerId: event.organizer
      });
      await partnership.save();

      // Notify organizer
      await notificationService.createNotification({
        recipient: event.organizer,
        title: 'New Promoter Application',
        message: `${fullUser.name} wants to promote your event "${event.title}".`,
        type: 'AFFILIATE_REQUEST',
        event: eventId
      });

      return partnership;
    },
    approveAffiliatePartnership: async (_, { partnershipId, pricingModel, promoterSellingPrice, commissionPercent, customerDiscount }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const partnership = await AffiliatePartnership.findById(partnershipId);
      if (!partnership) throw new GraphQLError('Partnership not found');
      if (partnership.organizerId.toString() !== user.id) throw new GraphQLError('Unauthorized: not your event');
      if (partnership.status !== 'PENDING') throw new GraphQLError('This request has already been processed');

      // Validate pricing model
      const event = await Event.findById(partnership.eventId);
      const originalPrice = event.ticketTypes.length > 0 ? event.ticketTypes[0].price : 0;
      if (commissionPercent < 0 || commissionPercent > 50) {
        throw new GraphQLError('Commission must be between 0% and 50%');
      }
      if (customerDiscount < 0 || customerDiscount > 100) {
        throw new GraphQLError('Customer discount must be between 0% and 100%');
      }

      // Generate unique promo code
      const promoter = await User.findById(partnership.promoterId);
      const nameSlug = (promoter.name || 'PROMO').split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '');
      const discStr = Math.floor(customerDiscount || 0);
      const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase(); // 2 chars
      const promoCode = `${nameSlug}${discStr}${randomSuffix}`;

      partnership.status = 'APPROVED';
      partnership.pricingModel = 'PERCENTAGE'; // Unified model
      partnership.commissionPercent = commissionPercent;
      partnership.customerDiscount = customerDiscount;
      partnership.promoCode = promoCode;
      partnership.approvedAt = new Date();
      await partnership.save();

      // Notify promoter
      await notificationService.createNotification({
        recipient: partnership.promoterId,
        title: 'Partnership Approved!',
        message: `Your request to promote "${event.title}" has been approved! Your promo code is: ${promoCode}`,
        type: 'AFFILIATE_APPROVED',
        event: partnership.eventId
      });

      return partnership;
    },
    rejectAffiliatePartnership: async (_, { partnershipId }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const partnership = await AffiliatePartnership.findById(partnershipId);
      if (!partnership) throw new GraphQLError('Partnership not found');
      if (partnership.organizerId.toString() !== user.id) throw new GraphQLError('Unauthorized: not your event');

      partnership.status = 'REJECTED';
      await partnership.save();

      const event = await Event.findById(partnership.eventId);
      await notificationService.createNotification({
        recipient: partnership.promoterId,
        title: 'Partnership Rejected',
        message: `Your request to promote "${event?.title || 'an event'}" has been rejected.`,
        type: 'AFFILIATE_REJECTED',
        event: partnership.eventId
      });

      return partnership;
    },
    requestCommissionPayout: async (_, { partnershipId, amount }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const promoter = await User.findById(user.id);
      if (!promoter || !promoter.isPromoter) throw new GraphQLError('Not a promoter');

      const partnership = await AffiliatePartnership.findById(partnershipId);
      if (!partnership) throw new GraphQLError('Partnership not found');
      if (partnership.promoterId.toString() !== user.id) throw new GraphQLError('Unauthorized');

      // Check event is completed
      const event = await Event.findById(partnership.eventId);
      if (!event || (new Date(event.date) > new Date() && event.status !== 'COMPLETED')) {
        throw new GraphQLError('Commission can only be withdrawn after the event is completed.');
      }

      // Check withdrawable balance
      const withdrawable = partnership.totalCommissionEarned - partnership.totalCommissionPaidOut;
      if (amount > withdrawable) {
        throw new GraphQLError(`Insufficient balance. Available: ₹${withdrawable.toFixed(2)}, Requested: ₹${amount}`);
      }
      if (amount < 100) throw new GraphQLError('Minimum payout amount is ₹100');

      // Check no pending payout for same partnership
      const existingPending = await CommissionPayout.findOne({ promoterId: user.id, partnershipId, status: 'PENDING' });
      if (existingPending) throw new GraphQLError('You already have a pending payout request for this partnership');

      // Check Stripe Connect onboarding
      if (!promoter.stripeAccountId) {
        throw new GraphQLError('Please complete your Stripe account setup before requesting a payout.');
      }

      const payout = new CommissionPayout({
        promoterId: user.id,
        organizerId: partnership.organizerId,
        partnershipId,
        eventId: partnership.eventId,
        amount
      });
      await payout.save();

      // Notify organizer
      await notificationService.createNotification({
        recipient: partnership.organizerId,
        title: 'Commission Payout Request',
        message: `${promoter.name} is requesting a commission payout of ₹${amount} for "${event.title}".`,
        type: 'COMMISSION_PAYOUT_REQUEST',
        event: partnership.eventId
      });

      return payout;
    },
    approveCommissionPayout: async (_, { payoutId }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const payout = await CommissionPayout.findById(payoutId);
      if (!payout) throw new GraphQLError('Payout not found');
      if (payout.organizerId.toString() !== user.id) throw new GraphQLError('Unauthorized: not your promoter');
      if (payout.status !== 'PENDING') throw new GraphQLError('Payout already processed');

      const promoter = await User.findById(payout.promoterId);
      if (!promoter || !promoter.stripeAccountId) {
        throw new GraphQLError('Promoter has not set up their Stripe account yet');
      }

      // Process transfer via Stripe Connect (reuse existing function)
      try {
        const transfer = await stripeService.createTransfer(payout, promoter);
        payout.stripeTransferId = transfer.id;
      } catch (e) {
        payout.status = 'FAILED';
        await payout.save();
        throw new GraphQLError(`Stripe transfer failed: ${e.message}`);
      }

      payout.status = 'COMPLETED';
      payout.processedAt = new Date();
      await payout.save();

      // Update partnership paid-out amount
      const partnership = await AffiliatePartnership.findById(payout.partnershipId);
      if (partnership) {
        partnership.totalCommissionPaidOut += payout.amount;
        await partnership.save();
      }

      // Update promoter user
      promoter.withdrawableCommission = Math.max(0, promoter.withdrawableCommission - payout.amount);
      await promoter.save();

      // Notify promoter
      await notificationService.createNotification({
        recipient: payout.promoterId,
        title: 'Payout Approved!',
        message: `Your commission payout of ₹${payout.amount} has been approved and sent to your bank account.`,
        type: 'COMMISSION_PAYOUT_COMPLETED'
      });

      return payout;
    },
    rejectCommissionPayout: async (_, { payoutId }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const payout = await CommissionPayout.findById(payoutId);
      if (!payout) throw new GraphQLError('Payout not found');
      if (payout.organizerId.toString() !== user.id) throw new GraphQLError('Unauthorized');
      if (payout.status !== 'PENDING') throw new GraphQLError('Payout already processed');

      payout.status = 'REJECTED';
      await payout.save();

      await notificationService.createNotification({
        recipient: payout.promoterId,
        title: 'Payout Rejected',
        message: `Your commission payout request of ₹${payout.amount} has been rejected.`,
        type: 'COMMISSION_PAYOUT_REJECTED'
      });

      return payout;
    },
    toggleAffiliateEnabled: async (_, { eventId, enabled }, { user }) => {
      if (!user) throw new GraphQLError('Unauthorized');
      const event = await Event.findById(eventId);
      if (!event) throw new GraphQLError('Event not found');
      if (event.organizer.toString() !== user.id) throw new GraphQLError('Unauthorized: not your event');
      event.isAffiliateEnabled = enabled;
      await event.save();
      return event;
    },
  },
  PromoCode: {
    event: async (parent) => {
      if (!parent.eventId) return null;
      const Event = require('../models/Event');
      return await Event.findById(parent.eventId);
    }
  },
  Feedback: {
    booking: (parent, _, { loaders }) => loaders.bookingLoader.load(parent.booking.toString()),
    event: (parent, _, { loaders }) => loaders.eventLoader.load(parent.event.toString()),
    organizer: (parent, _, { loaders }) => loaders.userLoader.load(parent.organizer.toString()),
    user: (parent, _, { loaders }) => loaders.userLoader.load(parent.user.toString()),
  },
  Payout: {
    organizer: (parent, _, { loaders }) => {
      const id = parent.organizer._id ? parent.organizer._id.toString() : parent.organizer.toString();
      return loaders.userLoader.load(id);
    },
    createdAt: (parent) => parent.createdAt ? (typeof parent.createdAt === 'string' ? parent.createdAt : parent.createdAt.toISOString()) : null
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
    isOnWaitlist: async (parent, _, { user }) => {
      if (!user) return false;
      const Waitlist = require('../models/Waitlist');
      const entry = await Waitlist.findOne({ event: parent.id, user: user.id });
      return !!entry;
    },
    waitlistCount: async (parent) => {
      const Waitlist = require('../models/Waitlist');
      return Waitlist.countDocuments({ event: parent._id || parent.id });
    },
    bookedCount: async (parent) => {
      const Booking = require('../models/Booking');
      const mongoose = require('mongoose');
      const eventId = new mongoose.Types.ObjectId(parent._id || parent.id);
      const stats = await Booking.aggregate([
        { $match: { event: eventId, status: { $in: ['CONFIRMED', 'CHECKED_IN'] } } },
        { $group: { _id: null, total: { $sum: "$quantity" } } }
      ]);
      return stats.length > 0 ? stats[0].total : 0;
    },
    checkedInCount: async (parent) => {
      const Booking = require('../models/Booking');
      const mongoose = require('mongoose');
      const eventId = new mongoose.Types.ObjectId(parent._id || parent.id);
      const stats = await Booking.aggregate([
        { $match: { event: eventId, status: { $in: ['CONFIRMED', 'CHECKED_IN'] } } },
        { $group: { _id: null, total: { $sum: "$checkedInCount" } } }
      ]);
      return stats.length > 0 ? stats[0].total : 0;
    },
    attendees: async (parent, _, { user }) => {
      if (!user) return null;
      return bookingService.getEventAttendees(parent.id, user);
    },
    vendors: async (parent) => {
      return await Vendor.find({ events: parent.id });
    },
    feedbacks: async (parent) => {
      const Feedback = require('../models/Feedback');
      return await Feedback.find({ event: parent.id }).sort({ createdAt: -1 });
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
    },
    paymentUrl: async (parent) => {
      if (parent.status !== 'PENDING') return null;
      return await stripeService.getCheckoutUrl(parent.stripePaymentId);
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
    planExpiresAt: (parent) => parent.planExpiresAt ? (typeof parent.planExpiresAt === 'string' ? parent.planExpiresAt : parent.planExpiresAt.toISOString()) : null,
    scheduledDowngradeAt: (parent) => parent.scheduledDowngradeAt ? (typeof parent.scheduledDowngradeAt === 'string' ? parent.scheduledDowngradeAt : parent.scheduledDowngradeAt.toISOString()) : null,
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
    },
    totalWithdrawn: async (parent) => {
      if (parent.role !== 'ORGANIZER') return 0;
      try {
        const Payout = require('../models/Payout');
        const payouts = await Payout.aggregate([
          { $match: { organizer: parent._id || parent.id, status: 'COMPLETED' } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);
        return payouts.length > 0 ? payouts[0].total : 0;
      } catch (e) {
        return 0;
      }
    },
    availablePayout: async (parent) => {
      if (parent.role !== 'ORGANIZER') return 0;
      try {
        const Booking = require('../models/Booking');
        const Event = require('../models/Event');
        const Payout = require('../models/Payout');

        const organizerId = parent._id || parent.id;
        const events = await Event.find({ organizer: organizerId });
        const eventIds = events.map(e => e._id);

        const bookings = await Booking.aggregate([
          { $match: { event: { $in: eventIds }, paymentStatus: 'PAID', status: { $in: ['CONFIRMED', 'CHECKED_IN'] } } },
          { $group: { _id: null, total: { $sum: "$amountPaid" } } }
        ]);

        const totalRevenue = bookings.length > 0 ? bookings[0].total : 0;

        const payouts = await Payout.aggregate([
          { $match: { organizer: organizerId, status: { $in: ['COMPLETED', 'PENDING'] } } },
          { $group: { _id: null, total: { $sum: "$amount" } } }
        ]);

        const totalWithdrawnAndPending = payouts.length > 0 ? payouts[0].total : 0;

        const available = (totalRevenue * 0.9) - totalWithdrawnAndPending;
        return Math.max(0, available);
      } catch (e) {
        return 0;
      }
    }
  },
  Subscription: {
    notificationAdded: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([EVENTS.NOTIFICATION_ADDED]),
        (payload, variables, { user }) => {
          if (!user || !payload?.notificationAdded) return false;
          const recipientId = (payload.notificationAdded.recipient?._id || payload.notificationAdded.recipient || '').toString();
          const userId = (user.id || user._id || '').toString();
          return recipientId === userId;
        }
      ),
      resolve: (payload) => payload.notificationAdded
    },
    ticketUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([EVENTS.TICKET_UPDATED]),
        (payload, variables) => {
          return payload.ticketUpdated.id.toString() === variables.ticketId.toString();
        }
      ),
      resolve: (payload) => payload.ticketUpdated
    },
    checkInUpdated: {
      subscribe: withFilter(
        () => pubsub.asyncIterableIterator([EVENTS.CHECK_IN_UPDATED]),
        (payload, variables) => {
          return payload.checkInUpdated.event.toString() === variables.eventId;
        }
      ),
      resolve: (payload) => payload.checkInUpdated
    }
  },
  SupportTicket: {
    user: (parent, _, { loaders }) => loaders.userLoader.load(parent.user.toString()),
    organizer: (parent, _, { loaders }) => parent.organizer ? loaders.userLoader.load(parent.organizer.toString()) : null,
    event: (parent, _, { loaders }) => parent.event ? loaders.eventLoader.load(parent.event.toString()) : null,
  },
  SupportMessage: {
    sender: (parent, _, { loaders }) => loaders.userLoader.load(parent.sender.toString()),
  },
  // ── Affiliate Type Resolvers ──
  AffiliatePartnership: {
    promoter: (parent, _, { loaders }) => loaders.userLoader.load(parent.promoterId.toString()),
    event: (parent, _, { loaders }) => loaders.eventLoader.load(parent.eventId.toString()),
    organizer: (parent, _, { loaders }) => loaders.userLoader.load(parent.organizerId.toString()),
    requestedAt: (parent) => parent.requestedAt ? (typeof parent.requestedAt === 'string' ? parent.requestedAt : parent.requestedAt.toISOString()) : null,
    approvedAt: (parent) => parent.approvedAt ? (typeof parent.approvedAt === 'string' ? parent.approvedAt : parent.approvedAt.toISOString()) : null,
  },
  CommissionPayout: {
    promoter: (parent, _, { loaders }) => loaders.userLoader.load(parent.promoterId.toString()),
    organizer: (parent, _, { loaders }) => loaders.userLoader.load(parent.organizerId.toString()),
    partnership: async (parent) => await AffiliatePartnership.findById(parent.partnershipId),
    event: (parent, _, { loaders }) => loaders.eventLoader.load(parent.eventId.toString()),
    createdAt: (parent) => parent.createdAt ? (typeof parent.createdAt === 'string' ? parent.createdAt : parent.createdAt.toISOString()) : null,
    processedAt: (parent) => parent.processedAt ? (typeof parent.processedAt === 'string' ? parent.processedAt : parent.processedAt.toISOString()) : null,
  }
};
module.exports = resolvers;
