/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

/**
 * Customer Model
 * نموذج العميل
 * Used by ml.routes.js for ML predictions
 */
const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: String,
    company: String,
    address: {
      street: String,
      city: String,
      region: String,
      postalCode: String,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'blocked'],
      default: 'active',
      index: true,
    },
    totalOrders: {
      type: Number,
      default: 0,
    },
    totalSpent: {
      type: Number,
      default: 0,
    },
    lastOrderDate: Date,
    tags: [String],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

customerSchema.index({ email: 1 });
customerSchema.index({ status: 1, lastOrderDate: -1 });

module.exports = mongoose.models.Customer || mongoose.model('Customer', customerSchema);
