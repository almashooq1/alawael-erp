const mongoose = require('mongoose');

// Snapshot of goal progress at a point in time
const goalProgressHistorySchema = new mongoose.Schema(
  {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapeuticPlan', required: true },
    goalId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Logic link to goal inside plan

    percentage: { type: Number, required: true },

    recordedDate: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    sessionRef: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapySession' }, // Optional link to session
    note: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model('GoalProgressHistory', goalProgressHistorySchema);
