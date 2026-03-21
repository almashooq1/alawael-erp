/* eslint-disable no-unused-vars */
/**
 * Campaign Model — نموذج حملات التبرع
 */
const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    targetAmount: { type: Number, default: 0 },
    collectedAmount: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['active', 'completed', 'paused', 'cancelled'],
      default: 'active',
    },
    startDate: Date,
    endDate: Date,
    category: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    donorsCount: { type: Number, default: 0 },
    image: String,
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

campaignSchema.index({ status: 1 });
campaignSchema.index({ createdAt: -1 });

module.exports = mongoose.models.Campaign || mongoose.model('Campaign', campaignSchema);
