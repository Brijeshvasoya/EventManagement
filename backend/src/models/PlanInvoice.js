const mongoose = require('mongoose');

const planInvoiceSchema = new mongoose.Schema({
  organizer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  planId: { type: String, required: true },       // 'BASIC' | 'PRO'
  amount: { type: Number, required: true },        // in dollars (e.g. 7.99)
  currency: { type: String, default: 'INR' },
  status: { type: String, default: 'PAID' },       // 'PAID' | 'FAILED'
  stripeSessionId: { type: String },
  planStartDate: { type: Date, required: true },
  planEndDate: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('PlanInvoice', planInvoiceSchema);
