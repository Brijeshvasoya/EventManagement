const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['USER', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN'], default: 'USER' },
  loyaltyPoints: { type: Number, default: 0 },
  redeemedRewards: [{ type: String }],
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  averageRating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  isPlanPurchased: { type: Boolean, default: false },
  planId: { type: String },
  planInterval: { type: String, enum: ['MONTH', 'YEAR'], default: 'MONTH' },
  planExpiresAt: { type: Date },
  scheduledPlanId: { type: String, default: null },   // plan to switch at cycle end (for downgrade)
  scheduledDowngradeAt: { type: Date, default: null }, // when to apply the scheduled plan switch
  stripeAccountId: { type: String },
  stripeOnboardingComplete: { type: Boolean, default: false },
  bankDetails: {
    accountHolderName: String,
    accountNumber: String,
    bankName: String,
    ifscCode: String,
  },
  razorpayContactId: { type: String },
  razorpayFundAccountId: { type: String },
  // Promoter fields
  isPromoter: { type: Boolean, default: false },
  stripeConnectOnboarded: { type: Boolean, default: false },
  pendingCommission: { type: Number, default: 0 },
  withdrawableCommission: { type: Number, default: 0 },
  totalCommissionEarned: { type: Number, default: 0 },
  totalTicketsSold: { type: Number, default: 0 },
  commissionDebt: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
