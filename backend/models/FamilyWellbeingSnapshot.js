'use strict';

/**
 * FamilyWellbeingSnapshot — W467.
 *
 * Periodic snapshot of family wellbeing composite (WBCI). Created
 * quarterly by default + on-demand when any underlying component
 * changes significantly.
 *
 * The composite formula lives in backend/intelligence/family-wbci.lib.js
 * (5 weighted components per docs/blueprint/beneficiary-lifecycle-v3.md
 * §6 Innovation 4). This model just stores the snapshot.
 *
 * Snapshots feed:
 *   • Family-facing wellbeing dashboard
 *   • W471 trigger engine (low-score → respite + counselling)
 *   • Phase G Equity Engine (disparity detection by family characteristics)
 */

const mongoose = require('mongoose');

const FamilyWellbeingSnapshotSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },

    snapshotDate: { type: Date, required: true, default: Date.now, index: true },
    snapshotType: {
      type: String,
      enum: ['quarterly', 'event_triggered', 'manual', 'intake'],
      default: 'quarterly',
      required: true,
    },

    // The 5 components (each 0-100). Missing = null → composite recomputes
    // only over present components.
    components: {
      caregiverBurdenInverse: { type: Number, min: 0, max: 100, default: null },
      siblingAdjustment: { type: Number, min: 0, max: 100, default: null },
      financialStressInverse: { type: Number, min: 0, max: 100, default: null },
      extendedFamilyEngagement: { type: Number, min: 0, max: 100, default: null },
      familyCommunicationHealth: { type: Number, min: 0, max: 100, default: null },
    },

    // Computed in pre-save via family-wbci.lib
    wbci: { type: Number, min: 0, max: 100 },
    band: {
      type: String,
      enum: ['thriving', 'stable', 'monitor', 'at_risk', 'crisis', 'insufficient_data'],
      index: true,
    },
    coverage: { type: Number, min: 0, max: 100 }, // % of components present
    presentComponents: { type: Number, min: 0, max: 5 },
    missingComponents: { type: Number, min: 0, max: 5 },

    // Computed triggers (W471 may auto-act on these)
    triggeredActions: [
      {
        action: { type: String, maxlength: 100 },
        priority: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
        reason: { type: String, maxlength: 200 },
      },
    ],

    // Provenance
    capturedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    capturedByRole: {
      type: String,
      enum: ['family_counsellor', 'social_worker', 'case_manager', 'system', 'family_self_report'],
    },

    // Source linkages (where the component values came from)
    sourceLinks: {
      caregiverProgramId: { type: mongoose.Schema.Types.ObjectId, ref: 'CaregiverSupportProgram' },
      siblingRecordId: { type: mongoose.Schema.Types.ObjectId, ref: 'SiblingAdjustmentRecord' },
      financialPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancialNavigationPlan' },
    },

    notes: { type: String, maxlength: 2000 },
  },
  {
    timestamps: true,
    collection: 'family_wellbeing_snapshots',
  }
);

FamilyWellbeingSnapshotSchema.index({ beneficiaryId: 1, snapshotDate: -1 });
FamilyWellbeingSnapshotSchema.index({ branchId: 1, band: 1, snapshotDate: -1 });

// W467 Wave-18 — recompute composite + band + triggers from components
FamilyWellbeingSnapshotSchema.pre('save', function (next) {
  const lib = require('../intelligence/family-wbci.lib');
  const componentsObj = this.components ? this.components.toObject?.() || this.components : {};
  const result = lib.computeWBCI({
    caregiverBurdenInverse: componentsObj.caregiverBurdenInverse,
    siblingAdjustment: componentsObj.siblingAdjustment,
    financialStressInverse: componentsObj.financialStressInverse,
    extendedFamilyEngagement: componentsObj.extendedFamilyEngagement,
    familyCommunicationHealth: componentsObj.familyCommunicationHealth,
  });

  this.wbci = result.wbci;
  this.band = result.band || 'insufficient_data';
  this.coverage = result.coverage ?? 0;
  this.presentComponents = result.presentComponents ?? 0;
  this.missingComponents = result.missingComponents ?? 5;
  this.triggeredActions = result.triggers || [];

  next();
});

module.exports =
  mongoose.models.FamilyWellbeingSnapshot ||
  mongoose.model('FamilyWellbeingSnapshot', FamilyWellbeingSnapshotSchema);
