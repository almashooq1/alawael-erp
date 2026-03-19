/**
 * Compensation Plan Model - نموذج خطط التعويضات
 */

const mongoose = require('mongoose');

const compensationPlanSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: String,
  baseSalary: {
    type: Number,
    required: true,
  },
  components: {
    basicSalary: Number,
    houseAllowance: {
      type: Number,
      default: 0,
    },
    transportAllowance: {
      type: Number,
      default: 0,
    },
    mobileAllowance: {
      type: Number,
      default: 0,
    },
    otherAllowances: {
      type: Number,
      default: 0,
    },
  },
  benefits: [
    {
      type: String,
      enum: ['health_insurance', 'retirement', 'gym', 'meal_voucher'],
    },
  ],
  deductions: [
    {
      name: String,
      percentage: Number,
      fixed: Number,
    },
  ],
  totalCompensation: Number,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  effectiveDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('CompensationPlan', compensationPlanSchema);
