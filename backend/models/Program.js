/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

/**
 * Program Model
 * نموذج البرنامج
 * Used by beneficiary.portal.controller.js
 */
const programSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      index: true,
    },
    description: String,
    category: {
      type: String,
      enum: [
        'physical',
        'cognitive',
        'occupational',
        'speech',
        'behavioral',
        'educational',
        'vocational',
      ],
      required: true,
      index: true,
    },
    duration: Number,
    targetParticipants: Number,
    currentParticipants: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'completed', 'paused'],
      default: 'active',
      index: true,
    },
    startDate: Date,
    endDate: Date,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    tags: [String],
  },
  { timestamps: true }
);

programSchema.index({ branchId: 1, category: 1, status: 1 });
programSchema.index({ createdBy: 1, createdAt: -1 });

module.exports = mongoose.models.Program || mongoose.model('Program', programSchema);
