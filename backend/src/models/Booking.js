const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: { type: String, enum: ['PENDING', 'CONFIRMED', 'CANCELLED', 'CHECKED_IN'], default: 'PENDING' },
  ticketType: { type: String, default: 'REGULAR' },
  quantity: { type: Number, default: 1 },
  amountPaid: { type: Number, default: 0 },
  paymentStatus: { type: String, enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'], default: 'PENDING' },
  stripePaymentId: { type: String, index: { unique: true, sparse: true } },
  paymentIntentId: { type: String, index: { unique: true, sparse: true } }
}, { timestamps: true });

// Uniqueness is primarily managed by stripePaymentId to allow multiple bookings per user/event
// but prevent double processing of the same transaction.

module.exports = mongoose.model('Booking', bookingSchema);
