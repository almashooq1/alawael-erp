/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

/**
 * Activity Model
 * نموذج النشاط
 * Used by beneficiary.portal.controller.js
 */
const activitySchema = new mongoose.Schema(
  {
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Program',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    type: {
      type: String,
      enum: ['session', 'workshop', 'assessment', 'exercise', 'meeting', 'other'],
      default: 'session',
    },
    date: {
      type: Date,
      default: Date.now,
    },
    duration: Number,
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled',
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    notes: String,
  },
  { timestamps: true }
);

activitySchema.index({ programId: 1, date: -1 });
activitySchema.index({ status: 1, date: -1 });

module.exports = mongoose.model('Activity', activitySchema);
