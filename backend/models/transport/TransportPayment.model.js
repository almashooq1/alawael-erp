'use strict';
const mongoose = require('mongoose');

const transportPaymentSchema = new mongoose.Schema({
  paymentId: {
    type: String,
    unique: true,
    required: true,
  },
  studentTransportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StudentTransport',
    required: true,
  },
  month: Number,
  year: Number,
  amount: {
    type: Number,
    required: true,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'check', 'bank_transfer', 'online', 'card'],
    required: true,
  },
  referenceNumber: String,
  notes: String,
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AdminUser',
  },
  approvalDate: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.TransportPayment || mongoose.model('TransportPayment', transportPaymentSchema);
