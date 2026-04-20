const Stripe = require('stripe');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', { apiVersion: '2023-10-16' });
const bookingService = require('../bookings/bookingService');

exports.stripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (endpointSecret) {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } else {
      // Fallback for local testing without signature strictly if mock
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error(`⚠️  Webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 1. Success case: Checkout Session Completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { eventId, userId, ticketType, quantity } = session.metadata;

    try {
      await bookingService.bookEvent({
        eventId,
        ticketType: ticketType || 'REGULAR',
        quantity: parseInt(quantity) || 1,
        amountPaid: session.amount_total / 100,
        stripePaymentId: session.id
      }, { id: userId, role: 'USER' }); 
      console.log(`✅ Webhook: Success - Ticket booked for User ${userId}`);
    } catch (e) {
      console.error('❌ Webhook: Booking error -', e.message);
    }
  }

  // 2. Failure case: Payment Intent Failed
  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    console.warn(`⚠️ Webhook: Payment Failed for Intent ${intent.id} - Reason: ${intent.last_payment_error?.message}`);
    // Future: Here we could notify the user via email if needed
  }

  // 3. Expiry case: Checkout Session Expired
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    console.log(`⏳ Webhook: Session Expired - User abandoned the checkout for Event ${session.metadata?.eventId}`);
  }

  // Acknowledge receipt to Stripe
  res.status(200).json({ received: true });
};
