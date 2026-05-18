'use strict';

/**
 * HikvisionBranchConfig — Wave 110.
 *
 * Per-branch override layer for Hikvision operational thresholds.
 * One document per branch. When a branch has no row, the global
 * registry defaults apply. When a row exists, its (partial) overrides
 * are layered over the defaults at evaluation time by
 * branchConfigService.resolveEffective().
 *
 * Scope is INTENTIONALLY narrow:
 *   • confidenceThresholds.* — face/camera auto-accept + review floors,
 *     duplicate suppression window, corroboration window.
 *   • fraudDefaults.*        — repeat-mismatch / burst / shared-identity
 *     thresholds and windows.
 *
 * Anything else (anti-spoof, time-drift, retention) is non-negotiable
 * at the branch level — those reflect compliance posture and live in
 * the central registry only.
 *
 * Wave-18 invariants:
 *   • branchId required + unique
 *   • confidenceThresholds & fraudDefaults are subset of allow-listed
 *     keys (BRANCH_CONFIG_OVERRIDABLE_*)
 *   • lastEditedBy populated whenever the doc is modified after first
 *     create (cannot save without tracking who tuned it)
 *
 * Audit:
 *   • Every save bumps `revision`. Routes write an AuditLog entry
 *     with the diff at write time (caller responsibility).
 */

const mongoose = require('mongoose');
const reg = require('../intelligence/hikvision.registry');

const HikvisionBranchConfigSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      unique: true,
      index: true,
    },

    // Partial overrides — only keys in the registry allow-list are
    // accepted. The service validates with validateBranchConfigPatch
    // before save; this is just a Mixed bucket because Mongoose's
    // strict-mode validation would force us to declare every key.
    confidenceThresholds: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },

    fraudDefaults: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },

    // Operator-facing memo. Optional but encouraged. Surfaces in the
    // audit trail + the per-branch UI.
    notes: { type: String, default: null, maxlength: 500 },

    // Bumped on every save by the service. Lets the UI detect stale
    // edits and the audit trail link successive revisions.
    revision: { type: Number, default: 1, min: 1 },

    // Who last edited. Optional on first create (system seed), but
    // any subsequent save must set this — enforced by the invariant.
    lastEditedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    lastEditedAt: { type: Date, default: null },
  },
  { timestamps: true, collection: 'hikvision_branch_configs' }
);

HikvisionBranchConfigSchema.index({ branchId: 1 }, { unique: true });

// ─── Wave-18 invariants ────────────────────────────────────────
HikvisionBranchConfigSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

HikvisionBranchConfigSchema.path('__invariants').validate(function () {
  let ok = true;

  if (!this.branchId) {
    this.invalidate('branchId', 'required');
    ok = false;
  }

  // After first save (revision > 1), every change must be attributed.
  if (this.revision > 1 && !this.lastEditedBy) {
    this.invalidate('lastEditedBy', 'required for revisions > 1');
    ok = false;
  }

  // Validate overridable keys at the schema level too — defence in
  // depth in case a write bypasses the service.
  if (this.confidenceThresholds && typeof this.confidenceThresholds === 'object') {
    for (const k of Object.keys(this.confidenceThresholds)) {
      if (!reg.BRANCH_CONFIG_OVERRIDABLE_CONFIDENCE_KEYS.includes(k)) {
        this.invalidate(`confidenceThresholds.${k}`, reg.REASON.BRANCH_CONFIG_INVALID_KEY);
        ok = false;
      }
    }
  }
  if (this.fraudDefaults && typeof this.fraudDefaults === 'object') {
    for (const k of Object.keys(this.fraudDefaults)) {
      if (!reg.BRANCH_CONFIG_OVERRIDABLE_FRAUD_KEYS.includes(k)) {
        this.invalidate(`fraudDefaults.${k}`, reg.REASON.BRANCH_CONFIG_INVALID_KEY);
        ok = false;
      }
    }
  }

  return ok;
});

module.exports =
  mongoose.models.HikvisionBranchConfig ||
  mongoose.model('HikvisionBranchConfig', HikvisionBranchConfigSchema);

module.exports.HikvisionBranchConfigSchema = HikvisionBranchConfigSchema;
