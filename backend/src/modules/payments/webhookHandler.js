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
        stripePaymentId: session.id,
        paymentIntentId: session.payment_intent // Capture the PI ID
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
    
    try {
      await bookingService.updatePaymentStatus(intent.id, 'CANCELLED', 'FAILED');
      console.log(`📉 Webhook: Updated booking status to FAILED for Intent ${intent.id}`);
    } catch (e) {
      console.error('❌ Webhook: Update error -', e.message);
    }
  }

  // 3. Refund case: Charge Refunded
  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    console.log(`💰 Webhook: Charge Refunded - ${charge.id}`);

    try {
      // Find by payment_intent which is usually what we store
      await bookingService.updatePaymentStatus(charge.payment_intent, 'CANCELLED', 'REFUNDED');
      console.log(`🔄 Webhook: Updated booking status to REFUNDED for PI ${charge.payment_intent}`);
    } catch (e) {
      console.error('❌ Webhook: Refund update error -', e.message);
    }
  }

  // 4. Expiry case: Checkout Session Expired
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    console.log(`⏳ Webhook: Session Expired - User abandoned the checkout for Event ${session.metadata?.eventId}`);
    
    try {
      await bookingService.updatePaymentStatus(session.id, 'CANCELLED', 'FAILED');
    } catch (e) {
      console.error('❌ Webhook: Expiry update error -', e.message);
    }
  }

  // Acknowledge receipt to Stripe
  res.status(200).json({ received: true });
};
