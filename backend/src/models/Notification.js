const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String },
  message: { type: String, required: true },
  type: { 
    type: String, 
    enum: [
      'BOOKING_CONFIRMED', 
      'EVENT_CANCELLED', 
      'EVENT_REMINDER', 
      'TICKET_BOOKED', 
      'TICKET_CHECKED_IN', 
      'AFFILIATE_REQUEST',
      'AFFILIATE_APPROVED',
      'AFFILIATE_REJECTED',
      'COMMISSION_PAYOUT_REQUEST',
      'COMMISSION_PAYOUT_COMPLETED',
      'COMMISSION_PAYOUT_REJECTED',
      'REWARD_REDEEMED',
      'OTHER'
    ], 
    default: 'OTHER' 
  },
  read: { type: Boolean, default: false },
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking' },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);
