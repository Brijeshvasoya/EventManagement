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

  if (promoCode) {
    const PromoCode = require('../../models/PromoCode');
    const promo = await PromoCode.findOne({
      code: promoCode.toUpperCase(),
      isActive: true,
      expiresAt: { $gte: new Date() }
    });

    if (promo && promo.usageCount < promo.usageLimit && (!promo.eventId || promo.eventId.toString() === eventId)) {
      if (promo.discountType === 'PERCENTAGE') {
        totalAmount = totalAmount * (1 - promo.discountValue / 100);
      } else {
        totalAmount = Math.max(0, totalAmount - promo.discountValue);
      }
      appliedPromoId = promo._id;
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
      metadata: { eventId, userId: user.id, ticketType, quantity: quantity.toString(), promoCode: promoCode || '' },
      success_url: `${APP_URL}/checkout-success?eventId=${eventId}&ticketType=${ticketType}&quantity=${quantity}&sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/checkout-cancel`,
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
      paymentStatus: 'PENDING'
    });

    return session.url;
  }

  return `${APP_URL}/checkout-success?eventId=${eventId}&ticketType=${ticketType}&quantity=${quantity}&sessionId=MOCK_SESSION_${Date.now()}`;
};

exports.createPlanCheckoutSession = async (planId, user) => {
  requireAuth(user);
  const APP_URL = process.env.FRONTEND_URL || 'http://localhost:3001';
  const User = require('../../models/User');
  const fullUser = await User.findById(user.id).select('planId planExpiresAt isPlanPurchased');

  if (planId !== 'BASIC' && planId !== 'PRO') throw new Error('Invalid plan');

  // ── Prorated Upgrade Logic (BASIC → PRO mid-cycle) ──────────────────────
  const BASIC_PRICE = 799;   // ₹ per month
  const PRO_PRICE   = 2499;  // ₹ per month

  const isActiveBasic =
    fullUser?.isPlanPurchased &&
    fullUser?.planId === 'BASIC' &&
    fullUser?.planExpiresAt &&
    new Date(fullUser.planExpiresAt) > new Date();

  let finalAmount = planId === 'PRO' ? PRO_PRICE : BASIC_PRICE; // in ₹
  let proratedCredit = 0;

  if (planId === 'PRO' && isActiveBasic) {
    // Days remaining on current Basic plan
    const msLeft = new Date(fullUser.planExpiresAt) - new Date();
    const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
    proratedCredit = Math.round((BASIC_PRICE / 30) * daysLeft);
    finalAmount = Math.max(0, PRO_PRICE - proratedCredit);
  }

  const amountPaise = finalAmount * 100; // convert to paise
  const planName = planId === 'PRO' ? `Pro Plan${proratedCredit > 0 ? ` (Upgrade — ₹${proratedCredit} credit applied)` : ''}` : 'Basic Plan';

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
      metadata: { userId: user.id, planId, proratedCredit: proratedCredit.toString() },
      success_url: `${APP_URL}/billing?success=true&sessionId={CHECKOUT_SESSION_ID}&planId=${planId}&proratedCredit=${proratedCredit}`,
      cancel_url: `${APP_URL}/plans?canceled=true`,
    });
    return session.url;
  }
  return `${APP_URL}/billing?success=true&sessionId=MOCK_SESSION_${Date.now()}&planId=${planId}&proratedCredit=${proratedCredit}`;
};

exports.confirmPlanPurchase = async (sessionId, planId, user, proratedCredit = 0) => {
  requireAuth(user);
  const User = require('../../models/User');
  const fullUser = await User.findById(user.id);
  if (!fullUser) throw new Error('User not found');

  const PlanInvoice = require('../../models/PlanInvoice');
  const startDate = new Date();

  // ── Upgrade (BASIC → PRO mid-cycle): immediate plan switch ───────────────
  const isUpgrade = fullUser.planId === 'BASIC' && planId === 'PRO' &&
    fullUser.isPlanPurchased && fullUser.planExpiresAt && new Date(fullUser.planExpiresAt) > new Date();

  let endDate;
  if (isUpgrade) {
    // Pro cycle starts now and runs 30 days from today
    endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  } else {
    endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  fullUser.isPlanPurchased = true;
  fullUser.planId = planId;
  fullUser.planExpiresAt = endDate;
  // Clear any scheduled downgrade if organizer upgraded
  fullUser.scheduledPlanId = null;
  fullUser.scheduledDowngradeAt = null;
  await fullUser.save();

  // Record the invoice — idempotency check to prevent duplicates
  const existing = await PlanInvoice.findOne({ stripeSessionId: sessionId });
  if (!existing) {
    const BASIC_PRICE = 799;
    const PRO_PRICE   = 2499;
    const credit = Number(proratedCredit) || 0;
    const amount = planId === 'BASIC' ? BASIC_PRICE : Math.max(0, PRO_PRICE - credit);
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
    id: fullUser.id, email: fullUser.email, role: fullUser.role, name: fullUser.name,
    isPlanPurchased: fullUser.isPlanPurchased, planId: fullUser.planId,
    planExpiresAt: fullUser.planExpiresAt,
    scheduledPlanId: fullUser.scheduledPlanId,
    scheduledDowngradeAt: fullUser.scheduledDowngradeAt,
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
    id: fullUser.id, email: fullUser.email, role: fullUser.role, name: fullUser.name,
    isPlanPurchased: fullUser.isPlanPurchased, planId: fullUser.planId,
    planExpiresAt: fullUser.planExpiresAt,
    scheduledPlanId: null,
    scheduledDowngradeAt: null,
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

