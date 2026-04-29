const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', { apiVersion: '2023-10-16' });
const { requireAuth } = require('../../utils/authGuard');

const Event = require('../../models/Event');
const Booking = require('../../models/Booking');

exports.createCheckoutSession = async (eventId, ticketType, quantity, user) => {
  requireAuth(user);
  const APP_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

  const event = await Event.findById(eventId);
  if (!event) throw new Error('Event not found');

  const ticket = event.ticketTypes.find(t => t.name === ticketType);
  if (!ticket) throw new Error('Ticket type not found for this event');

  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_mock') {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${event.title} - ${ticketType}`,
            description: `Quantity: ${quantity} ticket(s)`
          },
          unit_amount: Math.round(ticket.price * 100)
        },
        quantity: quantity,
      }],
      mode: 'payment',
      customer_email: user.email,
      allow_promotion_codes: true,
      metadata: { eventId, userId: user.id, ticketType, quantity: quantity.toString() },
      success_url: `${APP_URL}/checkout-success?eventId=${eventId}&ticketType=${ticketType}&quantity=${quantity}&sessionId={CHECKOUT_SESSION_ID}`,
      cancel_url: `${APP_URL}/checkout-cancel`,
    });

    // Create a PENDING booking record
    await Booking.create({
      event: eventId,
      user: user.id,
      ticketType,
      quantity,
      amountPaid: ticket.price * quantity,
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

  let amount = 0;
  let planName = '';
  if (planId === 'BASIC') { amount = 79900; planName = 'Basic Plan'; }
  else if (planId === 'PRO') { amount = 249900; planName = 'Pro Plan'; }
  else throw new Error('Invalid plan');

  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_mock') {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'inr',
          product_data: { name: planName },
          unit_amount: amount
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: user.email,
      metadata: { userId: user.id, planId },
      success_url: `${APP_URL}/plans?success=true&sessionId={CHECKOUT_SESSION_ID}&planId=${planId}`,
      cancel_url: `${APP_URL}/plans?canceled=true`,
    });
    return session.url;
  }
  return `${APP_URL}/plans?success=true&sessionId=MOCK_SESSION_${Date.now()}&planId=${planId}`;
};

exports.confirmPlanPurchase = async (sessionId, planId, user) => {
  requireAuth(user);
  const User = require('../../models/User');
  const fullUser = await User.findById(user.id);
  if (!fullUser) throw new Error('User not found');

  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'sk_test_mock') {
    // In a real app, we might verify sessionId with Stripe API
  }

  fullUser.isPlanPurchased = true;
  fullUser.planId = planId;
  const startDate = new Date();
  const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  fullUser.planExpiresAt = endDate;
  await fullUser.save();

  // Record the invoice
  const PlanInvoice = require('../../models/PlanInvoice');
  const amount = planId === 'BASIC' ? 799 : 2499;
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

  const { signToken } = require('../../utils/jwt');
  const token = signToken({ id: fullUser.id, email: fullUser.email, role: fullUser.role, name: fullUser.name, isPlanPurchased: fullUser.isPlanPurchased, planId: fullUser.planId, planExpiresAt: fullUser.planExpiresAt });
  return { token, user: fullUser };
};
