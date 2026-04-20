/**
 * GoalProgressEntry — time-series progress recording for a CarePlan goal.
 *
 * The CarePlan model stores goals as embedded subdocs with a single
 * `progress` percentage. That captures the latest snapshot but loses
 * the history — there's no way to chart a goal's trajectory or detect
 * stalled goals. This model records each progress update as its own
 * row so we can compute trend math identically to outcomeService.
 *
 * One entry per (goalId, recordedAt). Therapist records progress at
 * session-end; aggregations are pure-math via goalProgressService.
 *
 * carePlanId is denormalized for fast filtering even though the goal
 * lives inside the plan — without it every overview query would need
 * a $lookup or the application-side group-by.
 */

'use strict';

const mongoose = require('mongoose');

const GoalProgressEntrySchema = new mongoose.Schema(
  {
    carePlanId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarePlan',
      required: true,
      index: true,
    },
    // The embedded goal subdoc's _id within CarePlan.sections.<area>.goals[]
    goalId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'TherapySession' },

    progressPercent: { type: Number, required: true, min: 0, max: 100 },
    // Optional delta — what changed since the prior entry (for "this
    // session moved the needle by +5%" UX). Computed by service if absent.
    delta: { type: Number },

    note: { type: String, trim: true, maxlength: 1000 },
    evidence: { type: String, trim: true, maxlength: 500 }, // pointer to a doc / video

    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    recordedAt: { type: Date, default: Date.now, required: true, index: true },
  },
  { timestamps: true }
);

// Primary query: trajectory for one goal, ordered by time.
GoalProgressEntrySchema.index({ goalId: 1, recordedAt: 1 });
// Beneficiary-wide rollup ordered by recency.
GoalProgressEntrySchema.index({ beneficiaryId: 1, recordedAt: -1 });

module.exports =
  mongoose.models.GoalProgressEntry || mongoose.model('GoalProgressEntry', GoalProgressEntrySchema);
