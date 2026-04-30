const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: Date, required: true, index: true },
  location: { type: String, required: true },
  imageUrl: { type: String, default: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop' },
  eventType: { type: String, enum: ['WEDDING', 'CORPORATE', 'BIRTHDAY', 'SEMINAR', 'OTHER'], default: 'OTHER' },
  status: { type: String, enum: ['UPCOMING', 'COMPLETED', 'CANCELLED'], default: 'UPCOMING' },
  ticketTypes: [{ name: String, price: Number, capacity: Number }],
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  capacity: { type: Number, required: true, default: 100 },
  features: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Event', eventSchema);
