const mongoose = require('mongoose');

const waitlistSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['WAITING', 'NOTIFIED', 'BOOKED', 'EXPIRED'], default: 'WAITING' },
}, { timestamps: true });

// A user can only be on the waitlist once for a specific event
waitlistSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Waitlist', waitlistSchema);
