const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['CATERING', 'DECORATION', 'DJ', 'PHOTOGRAPHER', 'OTHER'], required: true },
  rating: { type: Number, default: 0 },
  cost: { type: Number, required: true },
  availableDates: [{ type: Date }],
  contactInfo: { type: String },
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  events: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Event' }]
}, { timestamps: true });

module.exports = mongoose.model('Vendor', vendorSchema);
