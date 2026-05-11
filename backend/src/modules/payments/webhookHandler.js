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
    const { eventId, userId, ticketType, quantity, promoCode } = session.metadata;

    try {
      await bookingService.bookEvent({
        eventId,
        ticketType: ticketType || 'REGULAR',
        quantity: parseInt(quantity) || 1,
        amountPaid: session.amount_total / 100,
        stripePaymentId: session.id,
        paymentIntentId: session.payment_intent // Capture the PI ID
      }, { id: userId, role: 'USER' });

      // Handle Promo Code usage increment
      if (promoCode) {
        const PromoCode = require('../../models/PromoCode');
        await PromoCode.findOneAndUpdate(
          { code: promoCode.toUpperCase(), isActive: true },
          { $inc: { usageCount: 1 } }
        );
      }

      // Handle Affiliate Commission tracking
      const affiliatePartnershipId = session.metadata?.affiliatePartnershipId;
      if (affiliatePartnershipId) {
        try {
          const AffiliatePartnership = require('../../models/AffiliatePartnership');
          const User = require('../../models/User');
          const partnership = await AffiliatePartnership.findById(affiliatePartnershipId);
          
          if (partnership) {
            const ticketQty = parseInt(quantity) || 1;
            
            // OPTION 2: If the buyer is the promoter themselves, they get the discount (applied at checkout)
            // but they DO NOT earn commission on their own purchase.
            if (partnership.promoterId.toString() === userId) {
              console.log(`ℹ️ Self-booking detected for promoter ${userId}. Discount applied, but no commission or sale count recorded.`);
              // We do nothing else here — the booking is confirmed but metrics stay same
            } else {
              const commission = (partnership.commissionPercent / 100) * (session.amount_total / 100);

              // Update partnership stats
              partnership.usageCount += ticketQty;
              partnership.totalCommissionEarned += commission;
              await partnership.save();

              // Update promoter's pending commission
              await User.findByIdAndUpdate(partnership.promoterId, {
                $inc: {
                  pendingCommission: commission,
                  totalCommissionEarned: commission,
                  totalTicketsSold: ticketQty
                }
              });

              console.log(`🤝 Affiliate commission tracked: ₹${commission} for partnership ${affiliatePartnershipId}`);
            }
          }
        } catch (affiliateErr) {
          console.error('❌ Webhook: Affiliate commission error -', affiliateErr.message);
        }
      }
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
    } catch (e) {
      console.error('❌ Webhook: Refund update error -', e.message);
    }
  }

  // 4. Expiry case: Checkout Session Expired
  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;

    try {
      await bookingService.updatePaymentStatus(session.id, 'CANCELLED', 'FAILED');
    } catch (e) {
      console.error('❌ Webhook: Expiry update error -', e.message);
    }
  }

  // Acknowledge receipt to Stripe
  res.status(200).json({ received: true });
};
