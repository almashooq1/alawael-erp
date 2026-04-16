/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

// Snapshot of goal progress at a point in time
const goalProgressHistorySchema = new mongoose.Schema(
  {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapeuticPlan', required: true },
    goalId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Logic link to goal inside plan

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },

    percentage: { type: Number, required: true },

    recordedDate: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    sessionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapySession' }, // Optional link to session
    note: String,
  },
  { timestamps: true }
);

// ── Indexes ───────────────────────────────────────────────────────────────
goalProgressHistorySchema.index({ planId: 1 });
goalProgressHistorySchema.index({ goalId: 1 });
goalProgressHistorySchema.index({ planId: 1, goalId: 1 });
goalProgressHistorySchema.index({ recordedDate: -1 });
goalProgressHistorySchema.index({ recordedBy: 1 });
goalProgressHistorySchema.index({ branchId: 1, planId: 1 });
module.exports =
  mongoose.models.GoalProgressHistory ||
  mongoose.model('GoalProgressHistory', goalProgressHistorySchema);
