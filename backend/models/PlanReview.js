/**
 * PlanReview.js — records each CarePlan review event.
 *
 * Phase 9 Commit 9. Complements the existing CarePlan.reviewDate
 * (the *scheduled* next-review) by capturing the *actual* review
 * activity: who attended, what was covered, what adjustments were
 * made, and when the next review is due.
 *
 * Drives the `rehab.care_plan.review.ontime.pct` KPI (Phase-9 C2)
 * and the `operational.care_plan.review.overdue` red-flag (Phase-9 C3)
 * via carePlanReviewService.
 */

'use strict';

const mongoose = require('mongoose');

const planReviewSchema = new mongoose.Schema(
  {
    carePlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarePlan',
      required: true,
      index: true,
    },
    beneficiary: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    reviewDate: {
      type: Date,
      required: true,
      index: true,
    },
    reviewType: {
      type: String,
      enum: ['SCHEDULED', 'INTERIM', 'CRITICAL', 'DISCHARGE'],
      default: 'SCHEDULED',
    },
    // The scheduled date that this review addresses — may differ
    // from reviewDate when the review is late or early.
    addressesScheduledDate: {
      type: Date,
      index: true,
    },
    attendees: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        role: String,
        attended: { type: Boolean, default: true },
      },
    ],
    familyAttended: { type: Boolean, default: false },
    // Outcome aggregates — sourced from GoalProgress snapshots at
    // review time; stored here so the timeline stays stable even if
    // progress records are later edited.
    goalsAchieved: { type: Number, default: 0, min: 0 },
    goalsPartial: { type: Number, default: 0, min: 0 },
    goalsUnmet: { type: Number, default: 0, min: 0 },
    progressRating: {
      type: String,
      enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR', 'REGRESSING'],
    },
    summary: String,
    newGoalIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Goal' }],
    retiredGoalIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Goal' }],
    planAdjustments: [
      {
        changeType: {
          type: String,
          enum: ['ADD_PROGRAM', 'REMOVE_PROGRAM', 'CHANGE_FREQUENCY', 'CHANGE_GOAL', 'OTHER'],
        },
        description: String,
        reason: String,
      },
    ],
    nextReviewDate: {
      type: Date,
      required: true,
      index: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    // ── W292: SLA acknowledgement for CRITICAL reviews ────────────
    // When a CRITICAL review is auto-opened by the W290 risk
    // trigger, a clinician must acknowledge it within the SLA
    // window. The plan-review-sla service uses these fields to
    // detect overdue items and fire AiAlerts.
    acknowledgedAt: { type: Date, index: { sparse: true } },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // Tracks how many overdue alerts have been raised (0=none,
    // 1=24h breach raised, 2=48h breach raised). Used by the SLA
    // sweeper to stay idempotent across runs.
    slaEscalationLevel: { type: Number, default: 0, min: 0, max: 2 },
  },
  { timestamps: true }
);

// ─── Compound indexes for the service-layer queries ───────────────
// (nextReviewDate has its own single-field index via the path-level
// `index: true`; don't re-declare here — Mongoose warns on duplicates.)
planReviewSchema.index({ carePlan: 1, reviewDate: -1 });
planReviewSchema.index({ beneficiary: 1, reviewDate: -1 });

module.exports = mongoose.models.PlanReview || mongoose.model('PlanReview', planReviewSchema);
