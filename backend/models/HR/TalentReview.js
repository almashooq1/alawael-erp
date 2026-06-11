'use strict';

/**
 * TalentReview.js — a 9-box talent-matrix placement for one employee in one
 * review cycle (W1198).
 *
 * Performance band is data-derivable from the latest PerformanceEvaluation;
 * potential band is a manager judgement. `box` (1-9) + `segment` are COMPUTED
 * from the two bands in a pre('validate') hook so they can never drift from the
 * source bands. Employee-keyed, so branchId is denormalised from the employee by
 * the shared hrBranchScope plugin (W1133) — cross-branch isolation for free.
 */

const mongoose = require('mongoose');
const grid = require('../../intelligence/talent-grid.lib');

const TalentReviewSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true,
      index: true,
    },
    reviewCycle: { type: String, required: true, maxlength: 20 }, // e.g. '2026-H1'

    performanceBand: { type: Number, required: true, min: 1, max: 3 },
    potentialBand: { type: Number, required: true, min: 1, max: 3 },
    performanceSource: { type: String, enum: ['derived', 'manual'], default: 'manual' },

    // computed (pre-validate) — frozen mirrors of (performanceBand × potentialBand)
    box: { type: Number, min: 1, max: 9 },
    segment: { type: String, default: null },
    actionGroup: { type: String, default: null },

    notes: { type: String, maxlength: 2000 },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['draft', 'finalized'], default: 'draft', index: true },

    __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
  },
  { timestamps: true, collection: 'hr_talent_reviews' }
);

// one review per employee per cycle
TalentReviewSchema.index({ employeeId: 1, reviewCycle: 1 }, { unique: true });
TalentReviewSchema.index({ branchId: 1, reviewCycle: 1, box: 1 });

// W1133 — denormalise branchId from the employee (cross-branch isolation).
TalentReviewSchema.plugin(require('./hrBranchScope.plugin'));

// async to MATCH the plugin's async pre('validate') (hook-style gate forbids mixing).
TalentReviewSchema.pre('validate', async function computeBox() {
  if (
    this.performanceBand >= 1 &&
    this.performanceBand <= 3 &&
    this.potentialBand >= 1 &&
    this.potentialBand <= 3
  ) {
    this.box = grid.boxOf(this.performanceBand, this.potentialBand);
    const seg = grid.segmentOf(this.box);
    this.segment = seg ? seg.key : null;
    this.actionGroup = grid.actionGroupOf(this.box);
  }
  this.markModified('__invariants'); // select:false validator skip guard (W1123)
});

TalentReviewSchema.path('__invariants').validate(function validateInvariants() {
  // box must equal the canonical mapping of the two bands (no manual override)
  if (this.performanceBand >= 1 && this.potentialBand >= 1) {
    const expected = grid.boxOf(this.performanceBand, this.potentialBand);
    if (this.box !== expected) {
      this.invalidate('box', `box must equal boxOf(performance,potential)=${expected}`);
    }
  }
  // a finalized review needs a reviewer + both bands
  if (this.status === 'finalized') {
    if (!this.reviewedBy) this.invalidate('reviewedBy', 'finalized review requires reviewedBy');
    if (!this.performanceBand || !this.potentialBand) {
      this.invalidate('potentialBand', 'finalized review requires both bands');
    }
  }
  return true;
});

module.exports = mongoose.models.TalentReview || mongoose.model('TalentReview', TalentReviewSchema);
