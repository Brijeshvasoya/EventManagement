const mongoose = require('mongoose');

const affiliatePartnershipSchema = new mongoose.Schema({
  promoterId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['PENDING', 'APPROVED', 'REJECTED'], default: 'PENDING' },
  promoCode: { type: String, unique: true, sparse: true },

  // Set by organizer during approval
  pricingModel: { type: String, enum: ['DISCOUNT', 'MARKUP', 'PERCENTAGE'] },
  promoterSellingPrice: { type: Number },
  commissionPercent: { type: Number },
  customerDiscount: { type: Number, default: 0 },

  // Auto-tracked stats
  usageCount: { type: Number, default: 0 },
  totalCommissionEarned: { type: Number, default: 0 },
  totalCommissionPaidOut: { type: Number, default: 0 },
  isWithdrawable: { type: Boolean, default: false },

  requestedAt: { type: Date, default: Date.now },
  approvedAt: { type: Date }
}, { timestamps: true });

// Prevent duplicate partnership requests
affiliatePartnershipSchema.index({ promoterId: 1, eventId: 1 }, { unique: true });
// Fast lookup for organizer dashboard
affiliatePartnershipSchema.index({ organizerId: 1 });

module.exports = mongoose.model('AffiliatePartnership', affiliatePartnershipSchema);
