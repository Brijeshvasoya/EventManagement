const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', { apiVersion: '2023-10-16' });
const { requireAuth } = require('../../utils/authGuard');

const Event = require('../../models/Event');
const Booking = require('../../models/Booking');

exports.createCheckoutSession = async (eventId, ticketType, quantity, user, promoCode) => {
  requireAuth(user);
  const APP_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');
  if (event.status === 'COMPLETED') throw new Error('Cannot book a ticket. Event is already completed.');
  if (event.status === 'CANCELLED') throw new Error('Cannot book a ticket. Event is cancelled.');
  
  // Prevent booking if event date has passed
  if (new Date(event.date) < new Date()) {
    throw new Error('Cannot book a ticket. Event date has already passed.');
  }

  const ticket = event.ticketTypes.find(t => t.name === ticketType);
  if (!ticket) throw new Error('Ticket type not found for this event');

  // CAPACITY VALIDATION
  const bookedStats = await Booking.aggregate([
    { $match: { event: event._id, status: { $in: ['CONFIRMED', 'CHECKED_IN'] } } },
    { $group: { _id: null, total: { $sum: "$quantity" } } }
  ]);
  const totalBooked = bookedStats.length > 0 ? bookedStats[0].total : 0;

  if (totalBooked + quantity > event.capacity) {
    throw new Error(`Event Sold Out! Only ${Math.max(0, event.capacity - totalBooked)} total spots remaining.`);
  }

  // Per-tier capacity check
  const typeBookedStats = await Booking.aggregate([
    { $match: { event: event._id, ticketType, status: { $in: ['CONFIRMED', 'CHECKED_IN'] } } },
    { $group: { _id: null, total: { $sum: "$quantity" } } }
  ]);
  const typeBooked = typeBookedStats.length > 0 ? typeBookedStats[0].total : 0;

  if (ticket.capacity && (typeBooked + quantity > ticket.capacity)) {
    throw new Error(`This ticket tier is sold out! Only ${Math.max(0, ticket.capacity - typeBooked)} tickets left in ${ticketType}.`);
  }

  let totalAmount = ticket.price * quantity;
  let appliedPromoId = null;
  let affiliatePartnershipId = null;

  if (promoCode) {
    // First check affiliate promo codes
    const AffiliatePartnership = require('../../models/AffiliatePartnership');
    const affiliatePartnership = await AffiliatePartnership.findOne({
      promoCode: promoCode.toUpperCase(),
      status: 'APPROVED'
    });

    if (affiliatePartnership && affiliatePartnership.eventId.toString() === eventId) {
      // Affiliate promo code — use customer discount percentage
      const discountPerTicket = (ticket.price * (affiliatePartnership.customerDiscount || 0)) / 100;
      totalAmount = (ticket.price - discountPerTicket) * quantity;
      affiliatePartnershipId = affiliatePartnership._id;
    } else {
      // Fallback to regular promo codes
      const PromoCode = require('../../models/PromoCode');
      const promo = await PromoCode.findOne({
        code: promoCode.toUpperCase(),
        isActive: true,
        expiresAt: { $gte: new Date() }
      });

      if (promo && promo.usageCount < promo.usageLimit && (!promo.eventId || promo.eventId.toString() === eventId)) {
        if (promo.code.startsWith('REWARD')) {
          const userIdStr = user.id._id ? user.id._id.toString() : user.id.toString();
          if (promo.organizer.toString() !== userIdStr) {
            throw new Error('This reward code is exclusive to another user.');
          }
        }
        if (promo.discountType === 'PERCENTAGE') {
          totalAmount = totalAmount * (1 - promo.discountValue / 100);
        } else {
          totalAmount = Math.max(0, totalAmount - promo.discountValue);
        }
        appliedPromoId = promo._id;
      }
    }
  }

  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_mock') {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: {
            name: `${event.title} - ${ticketType} (x${quantity})`,
            description: `Promo Applied: ${promoCode || 'None'}`
          },
          unit_amount: Math.round(totalAmount * 100)
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: user.email,
      allow_promotion_codes: false, // We handle it manually now
      metadata: {
        eventId, userId: user.id, ticketType, quantity: quantity.toString(),
        promoCode: promoCode || '',
        affiliatePartnershipId: affiliatePartnershipId ? affiliatePartnershipId.toString() : ''
      },
      success_url: `${APP_URL}/checkout-success?eventId=${eventId}&ticketType=${ticketType}&quantity=${quantity}&sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/checkout-cancel?sessionId={CHECKOUT_SESSION_ID}`,
    });

    // Create a PENDING booking record
    await Booking.create({
      event: eventId,
      user: user.id,
      ticketType,
      quantity,
      amountPaid: totalAmount,
      stripePaymentId: session.id,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      abandonedEmailSent: false,
      affiliatePartnershipId: affiliatePartnershipId || undefined
    });

    return session.url;
  }

  return `${APP_URL}/checkout-success?eventId=${eventId}&ticketType=${ticketType}&quantity=${quantity}&sessionId=MOCK_SESSION_${Date.now()}`;
};

exports.createPlanCheckoutSession = async (planId, user, interval = 'MONTH') => {
  requireAuth(user);
  const APP_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
  const User = require('../../models/User');
  const fullUser = await User.findById(user.id).select('planId planExpiresAt isPlanPurchased');

  if (planId !== 'BASIC' && planId !== 'PRO') throw new Error('Invalid plan');
  if (interval !== 'MONTH' && interval !== 'YEAR') throw new Error('Invalid interval');

  // Pricing Configuration
  const PRICES = {
    BASIC: { MONTH: 799, YEAR: 7990 },
    PRO: { MONTH: 2499, YEAR: 24990 }
  };

  const isActivePlan =
    fullUser?.isPlanPurchased &&
    fullUser?.planExpiresAt &&
    new Date(fullUser.planExpiresAt) > new Date();

  let finalAmount = PRICES[planId][interval];
  let proratedCredit = 0;

  // ── Upgrade Logic (Any transition to a more expensive plan) ──────────────
  if (isActivePlan) {
    const currentPricePerMonth = fullUser.planId === 'PRO' ? PRICES.PRO.MONTH : PRICES.BASIC.MONTH;
    const newPricePerMonth = planId === 'PRO' ? PRICES.PRO.MONTH : PRICES.BASIC.MONTH;
    
    // Check if it's an upgrade (either tier upgrade or same tier but moving to yearly)
    const isTierUpgrade = (fullUser.planId === 'BASIC' && planId === 'PRO');
    // Note: interval change from MONTH to YEAR is also an upgrade in terms of commitment, 
    // but here we check if the new total price is higher to justify proration.
    
    if (isTierUpgrade || (fullUser.planId === planId && interval === 'YEAR')) {
      const msLeft = new Date(fullUser.planExpiresAt) - new Date();
      const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
      
      // Calculate remaining value of current plan
      // If they were on yearly, we divide by 365, if monthly by 30
      // Actually, we can just use a simple approximation for now or check current interval if stored.
      // For simplicity, we'll assume the current plan was monthly if it's not specified.
      // But let's just use the Monthly price as base for daily credit calculation.
      proratedCredit = Math.round((currentPricePerMonth / 30) * daysLeft);
      finalAmount = Math.max(0, finalAmount - proratedCredit);
    }
  }

  const amountPaise = Math.round(finalAmount * 100);
  const planName = `${planId} Plan (${interval === 'MONTH' ? 'Monthly' : 'Yearly'})${proratedCredit > 0 ? ` - Upgrade Credit Applied` : ''}`;

  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_mock') {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: { name: planName },
          unit_amount: amountPaise
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: user.email,
      metadata: { userId: user.id, planId, interval, proratedCredit: proratedCredit.toString() },
      success_url: `${APP_URL}/billing?success=true&sessionId={CHECKOUT_SESSION_ID}&planId=${planId}&interval=${interval}&proratedCredit=${proratedCredit}`,
      cancel_url: `${APP_URL}/plans?canceled=true`,
    });
    return session.url;
  }
  return `${APP_URL}/billing?success=true&sessionId=MOCK_SESSION_${Date.now()}&planId=${planId}&interval=${interval}&proratedCredit=${proratedCredit}`;
};

exports.confirmPlanPurchase = async (sessionId, planId, user, proratedCredit = 0, interval = 'MONTH') => {
  requireAuth(user);
  const User = require('../../models/User');
  const fullUser = await User.findById(user.id);
  if (!fullUser) throw new Error('User not found');

  const PlanInvoice = require('../../models/PlanInvoice');
  const startDate = new Date();

  // Calculate duration in days
  const durationDays = interval === 'YEAR' ? 365 : 30;
  const endDate = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  fullUser.isPlanPurchased = true;
  fullUser.planId = planId;
  fullUser.planInterval = interval;
  fullUser.planExpiresAt = endDate;
  fullUser.scheduledPlanId = null;
  fullUser.scheduledDowngradeAt = null;
  await fullUser.save();

  // Record the invoice
  const existing = await PlanInvoice.findOne({ stripeSessionId: sessionId });
  if (!existing) {
    const PRICES = {
      BASIC: { MONTH: 799, YEAR: 7990 },
      PRO: { MONTH: 2499, YEAR: 24990 }
    };
    const credit = Number(proratedCredit) || 0;
    const amount = Math.max(0, PRICES[planId][interval] - credit);
    
    await PlanInvoice.create({
      organizer: fullUser._id,
      planId,
      amount,
      currency: 'INR',
      status: 'PAID',
      stripeSessionId: sessionId,
      planStartDate: startDate,
      planEndDate: endDate,
    });
  }

  const { signToken } = require('../../utils/jwt');
  const token = signToken({
    id: fullUser.id, email: fullUser.email, role: fullUser.role, name: fullUser.name
  });
  return { token, user: fullUser };
};

// ── Scheduled Downgrade (PRO → BASIC end-of-cycle) ───────────────────────
exports.scheduleDowngrade = async (targetPlanId, user) => {
  requireAuth(user);
  if (targetPlanId !== 'BASIC') throw new Error('Downgrade target must be BASIC');
  const User = require('../../models/User');
  const fullUser = await User.findById(user.id);
  if (!fullUser) throw new Error('User not found');
  if (fullUser.planId !== 'PRO') throw new Error('You are not on the Pro plan');
  const isPlanActive = fullUser.isPlanPurchased && fullUser.planExpiresAt && new Date(fullUser.planExpiresAt) > new Date();
  if (!isPlanActive) throw new Error('No active plan found');

  fullUser.scheduledPlanId = 'BASIC';
  fullUser.scheduledDowngradeAt = fullUser.planExpiresAt; // activate at cycle end
  await fullUser.save();

  const { signToken } = require('../../utils/jwt');
  const token = signToken({
    id: fullUser.id, email: fullUser.email, role: fullUser.role, name: fullUser.name,
    isPlanPurchased: fullUser.isPlanPurchased, planId: fullUser.planId,
    planInterval: fullUser.planInterval,
    planExpiresAt: fullUser.planExpiresAt,
    scheduledPlanId: fullUser.scheduledPlanId,
    scheduledDowngradeAt: fullUser.scheduledDowngradeAt,
  });
  return { token, user: fullUser };
};

// ── Cancel Scheduled Downgrade ────────────────────────────────────────────
exports.cancelScheduledDowngrade = async (user) => {
  requireAuth(user);
  const User = require('../../models/User');
  const fullUser = await User.findById(user.id);
  if (!fullUser) throw new Error('User not found');

  fullUser.scheduledPlanId = null;
  fullUser.scheduledDowngradeAt = null;
  await fullUser.save();

  const { signToken } = require('../../utils/jwt');
  const token = signToken({
    id: fullUser.id, email: fullUser.email, role: fullUser.role, name: fullUser.name
  });
  return { token, user: fullUser };
};

exports.createConnectAccount = async (user) => {
  requireAuth(user);
  const User = require('../../models/User');
  const fullUser = await User.findById(user.id);
  if (!fullUser) throw new Error('User not found');

  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_mock') {
    let accountId = fullUser.stripeAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: fullUser.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
      });
      accountId = account.id;
      fullUser.stripeAccountId = accountId;
      await fullUser.save();
    }

    const APP_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${APP_URL}/transactions?stripe=refresh`,
      return_url: `${APP_URL}/transactions?stripe=success`,
      type: 'account_onboarding',
    });

    return accountLink.url;
  }

  return 'https://connect.stripe.com/setup/s/mock_onboarding_link';
};

exports.createTransfer = async (payout, organizer) => {
  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_mock') {
    if (!organizer.stripeAccountId) {
      throw new Error('Organizer has not linked a Stripe account');
    }

    const transfer = await stripe.transfers.create({
      amount: Math.round(payout.amount * 100),
      currency: 'inr',
      destination: organizer.stripeAccountId,
      description: `Payout for request ${payout._id}`,
      metadata: { payoutId: payout._id.toString() }
    });

    return transfer;
  }
  return { id: 'tr_mock_' + Date.now() };
};

exports.triggerAbandonedCheckoutEmail = async (sessionId, user) => {
  const Booking = require('../../models/Booking');
  const Event = require('../../models/Event');

  const booking = await Booking.findOne({ stripePaymentId: sessionId, status: 'PENDING', abandonedEmailSent: false });
  if (!booking) return false;

  let checkoutUrl = '';
  if (sessionId.startsWith('cs_')) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    checkoutUrl = session.url;
  }
  if (!checkoutUrl) return false;

  const event = await Event.findById(booking.event);
  if (!event) return false;

  const { sendAbandonedCheckoutEmail } = require('../../utils/email');
  await sendAbandonedCheckoutEmail(user, event, checkoutUrl);

  booking.abandonedEmailSent = true;
  await Booking.updateOne({ _id: booking._id }, { $set: { abandonedEmailSent: true } });

  return true;
};


exports.getCheckoutUrl = async (sessionId) => {
  if (!sessionId) return null;
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === 'sk_test_mock') {
    return null;
  }
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    return session.url;
  } catch (e) {
    console.error('Error retrieving stripe session:', e);
    return null;
  }
};
