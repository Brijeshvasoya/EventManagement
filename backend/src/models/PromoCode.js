const mongoose = require('mongoose');

const promoCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true },
  discountType: { type: String, enum: ['PERCENTAGE', 'FIXED'], required: true },
  discountValue: { type: Number, required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }, // If null, applies to all events
  expiresAt: { type: Date, required: true },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  usageLimit: { type: Number, default: 100 },
  usageCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('PromoCode', promoCodeSchema);
