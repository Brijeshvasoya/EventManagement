const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, index: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['USER', 'ORGANIZER', 'ADMIN'], default: 'USER' },
  loyaltyPoints: { type: Number, default: 0 },
  redeemedRewards: [{ type: String }],
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
  averageRating: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
