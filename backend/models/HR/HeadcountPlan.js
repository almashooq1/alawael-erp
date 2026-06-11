'use strict';

/**
 * HeadcountPlan.js — a workforce supply-plan for a branch (+ optional department) (W1203).
 *
 * Captures the inputs (target, attrition, horizon) + a snapshot of the current
 * headcount at plan time + the computed forecast (survivors / hiring need). branchId
 * is the plan SCOPE (set directly by the service from the caller's effective branch),
 * so no hrBranchScope plugin. Multiple plans per scope allowed (scenarios).
 */

const mongoose = require('mongoose');

const HeadcountPlanSchema = new mongoose.Schema(
  {
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    department: { type: String, default: null, trim: true, maxlength: 120 },
    planLabel: { type: String, required: true, trim: true, maxlength: 60 }, // e.g. '2026' or '2026-Q3 growth'

    currentHeadcount: { type: Number, required: true, min: 0 }, // snapshot at plan time
    targetHeadcount: { type: Number, required: true, min: 0 },
    attritionRatePct: { type: Number, required: true, min: 0, max: 100 },
    periods: { type: Number, required: true, min: 1, max: 10 },

    // computed forecast (from headcount-forecast.lib)
    forecast: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },

    status: { type: String, enum: ['draft', 'approved'], default: 'draft', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
  },
  { timestamps: true, collection: 'hr_headcount_plans' }
);

HeadcountPlanSchema.index({ branchId: 1, planLabel: 1, department: 1 });

// W1123 — markModified so the select:false validator runs on update-saves too.
HeadcountPlanSchema.pre('validate', function markInvariants() {
  this.markModified('__invariants');
});

HeadcountPlanSchema.path('__invariants').validate(function validateInvariants() {
  if (this.attritionRatePct != null && (this.attritionRatePct < 0 || this.attritionRatePct > 100)) {
    this.invalidate('attritionRatePct', 'attritionRatePct must be within [0,100]');
  }
  if (this.periods != null && (this.periods < 1 || this.periods > 10)) {
    this.invalidate('periods', 'periods must be within [1,10]');
  }
  if (this.targetHeadcount != null && this.targetHeadcount < 0) {
    this.invalidate('targetHeadcount', 'targetHeadcount cannot be negative');
  }
  if (this.currentHeadcount != null && this.currentHeadcount < 0) {
    this.invalidate('currentHeadcount', 'currentHeadcount cannot be negative');
  }
  return true;
});

module.exports = mongoose.models.HeadcountPlan || mongoose.model('HeadcountPlan', HeadcountPlanSchema);
