const mongoose = require('mongoose');

const commissionPayoutSchema = new mongoose.Schema({
  promoterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  partnershipId: { type: mongoose.Schema.Types.ObjectId, ref: 'AffiliatePartnership', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['PENDING', 'COMPLETED', 'FAILED', 'REJECTED'], default: 'PENDING' },
  stripeTransferId: { type: String },
  processedAt: { type: Date }
}, { timestamps: true });

// Organizer sees only their promoter payout requests
commissionPayoutSchema.index({ organizerId: 1 });
// Promoter sees their own payout history
commissionPayoutSchema.index({ promoterId: 1 });

module.exports = mongoose.model('CommissionPayout', commissionPayoutSchema);
