const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', { apiVersion: '2023-10-16' });
const { requireAuth } = require('../../utils/authGuard');

const Event = require('../../models/Event');

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
    return session.url;
  }

  return `${APP_URL}/checkout-success?eventId=${eventId}&ticketType=${ticketType}&quantity=${quantity}&sessionId=MOCK_SESSION_${Date.now()}`;
};
