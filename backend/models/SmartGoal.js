'use strict';

/**
 * SmartGoal — Specific/Measurable/Achievable/Relevant/Time-bound goals
 * with explicit milestones. Used by `routes/therapistPro.routes.js`
 * `/smart-goals`. Lighter than the IEP `Goal` model — for therapists
 * who want a fast goal-setting workflow without the full IEP machinery.
 */

const mongoose = require('mongoose');

if (mongoose.models.SmartGoal) {
  module.exports = mongoose.models.SmartGoal;
} else {
  const milestoneSchema = new mongoose.Schema(
    {
      title: { type: String, required: true },
      targetDate: { type: Date, default: null },
      completedAt: { type: Date, default: null },
      progress: { type: Number, default: 0, min: 0, max: 100 },
      notes: { type: String, default: null },
    },
    { _id: true }
  );

  const smartGoalSchema = new mongoose.Schema(
    {
      therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
      beneficiary: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
      title: { type: String, required: true, trim: true },
      specific: { type: String, default: null },
      measurable: { type: String, default: null },
      achievable: { type: String, default: null },
      relevant: { type: String, default: null },
      timeBoundDate: { type: Date, default: null },
      status: {
        type: String,
        enum: ['active', 'achieved', 'paused', 'cancelled'],
        default: 'active',
      },
      overallProgress: { type: Number, default: 0, min: 0, max: 100 },
      milestones: { type: [milestoneSchema], default: [] },
      branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
      deletedAt: { type: Date, default: null },
    },
    { timestamps: true, collection: 'smartgoals' }
  );

  smartGoalSchema.index({ therapist: 1, beneficiary: 1, status: 1 });

  module.exports = mongoose.model('SmartGoal', smartGoalSchema);
}
