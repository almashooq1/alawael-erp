/**
 * Benefits Model - نموذج المزايا
 */

const mongoose = require('mongoose');

const benefitsSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true,
  },
  type: {
    type: String,
    enum: ['car_allowance', 'gym', 'education', 'meal_voucher', 'housing', 'mobile'],
    required: true,
  },
  description: String,
  value: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    default: 'SAR',
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  endDate: Date,
  frequency: {
    type: String,
    enum: ['monthly', 'quarterly', 'annual', 'one-time'],
    default: 'monthly',
  },
  status: {
    type: String,
    enum: ['active', 'suspended', 'expired'],
    default: 'active',
  },
  grantedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  grantDate: {
    type: Date,
    default: Date.now,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvalDate: Date,
  approvalNotes: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

benefitsSchema.index({ employeeId: 1, status: 1 });
benefitsSchema.index({ type: 1 });

module.exports = mongoose.model('Benefits', benefitsSchema);
