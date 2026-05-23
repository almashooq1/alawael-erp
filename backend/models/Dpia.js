/**
 * Dpia.js — Data Protection Impact Assessment (W285).
 *
 * PDPL Article 14 + EU GDPR Article 35 inspiration. Required before any
 * feature processes personal data at significant risk: new AI feature,
 * new government integration, new sharing arrangement, etc.
 *
 * State machine:
 *   draft → in_review → {approved | rejected}
 *   approved + signed → feature flag may be enabled
 *   approved + (signedAt + 365d expired) → status='expired', re-review required
 *
 * Design:
 *
 *   1. **One DPIA per feature/version** — when scope changes materially,
 *      bump `version` and re-review. Old versions stay as audit trail.
 *
 *   2. **featureFlag link** — the production gate. CI drift guard
 *      (W285b) refuses to open a flag whose DPIA is not approved+signed.
 *
 *   3. **Signature requires MFA tier 2** — enforced at route layer
 *      (`requireMfaTier(2)`). Signed DPIA is a legal artefact.
 *
 *   4. **Mitigations are append-only** — addressed risks remain in the
 *      record; you cannot "un-mitigate" without bumping version.
 *
 *   5. **dataCategories enumerated** — aligns with PDPL Article 11
 *      sensitive-data list (health, biometric, etc.). Drift guard could
 *      add: any feature processing 'health' MUST have a DPIA.
 */

'use strict';

const mongoose = require('mongoose');

const DPIA_STATUSES = Object.freeze(['draft', 'in_review', 'approved', 'rejected', 'expired']);

const DPIA_DATA_CATEGORIES = Object.freeze([
  'identity', // name, ID number
  'contact', // phone, address, email
  'health', // PHI — clinical notes, diagnoses
  'biometric', // face, voice, gait
  'financial', // payroll, insurance, payment
  'family', // guardian, dependents
  'location', // GPS, address history
  'behavioral', // session behavior, observations
  'communication', // chat, messages
  'employment', // HR, performance
]);

const DPIA_LAWFUL_BASES = Object.freeze([
  'consent', // explicit subject consent
  'contract', // service delivery contract
  'legal_obligation', // gov reporting requirement
  'vital_interests', // life-threatening situations
  'public_interest', // healthcare provision
  'legitimate_interests', // limited use case
]);

const RISK_LEVELS = Object.freeze(['low', 'medium', 'high', 'very_high']);

const riskItemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true, trim: true },
    likelihood: { type: String, enum: RISK_LEVELS, required: true },
    impact: { type: String, enum: RISK_LEVELS, required: true },
    mitigation: { type: String, required: true, trim: true },
    addressedAt: { type: Date, default: Date.now },
    addressedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: true, timestamps: false }
);

const dpiaSchema = new mongoose.Schema(
  {
    // Identity
    featureName: { type: String, required: true, trim: true, index: true },
    version: { type: Number, required: true, default: 1, min: 1 },
    featureFlag: { type: String, trim: true, index: true }, // links to GrowthBook / config flag

    // Status
    status: {
      type: String,
      enum: DPIA_STATUSES,
      default: 'draft',
      required: true,
      index: true,
    },

    // Data scope
    dataCategories: {
      type: [{ type: String, enum: DPIA_DATA_CATEGORIES }],
      required: true,
      validate: {
        validator: arr => arr.length > 0,
        message: 'At least one data category required',
      },
    },
    lawfulBasis: { type: String, enum: DPIA_LAWFUL_BASES, required: true },
    dataSubjects: { type: String, required: true, trim: true }, // "beneficiaries", "employees", "guardians", etc.
    processingPurpose: { type: String, required: true, trim: true },

    // Risk assessment (append-only)
    risks: { type: [riskItemSchema], default: [] },

    // Cross-border transfers
    crossBorderTransfer: { type: Boolean, default: false },
    crossBorderJustification: { type: String, trim: true },

    // Retention
    retentionPeriodDays: { type: Number, min: 1 },
    retentionJustification: { type: String, trim: true },

    // Authorship
    authoredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    authoredAt: { type: Date, default: Date.now, required: true },

    // Review
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNotes: { type: String, trim: true },

    // Sign-off (MFA-gated)
    signedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    signedAt: { type: Date, index: true },
    signatureMfaChallengeId: { type: String, trim: true }, // proof of tier-2 step-up

    // Rejection
    rejectionReason: { type: String, trim: true },

    // Branch scope (multi-tenancy)
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
  },
  { timestamps: true, collection: 'dpias' }
);

// Compound index for "latest version of feature X"
dpiaSchema.index({ featureName: 1, version: -1 });
// Index for "approved DPIAs by featureFlag" — used by W285b drift guard
dpiaSchema.index({ featureFlag: 1, status: 1, signedAt: -1 });

dpiaSchema.virtual('isApprovedAndSigned').get(function () {
  return this.status === 'approved' && !!this.signedAt;
});

dpiaSchema.virtual('isExpired').get(function () {
  if (!this.signedAt) return false;
  const ageMs = Date.now() - new Date(this.signedAt).getTime();
  return ageMs > 365 * 24 * 60 * 60 * 1000;
});

module.exports = mongoose.model('Dpia', dpiaSchema);
module.exports.DPIA_STATUSES = DPIA_STATUSES;
module.exports.DPIA_DATA_CATEGORIES = DPIA_DATA_CATEGORIES;
module.exports.DPIA_LAWFUL_BASES = DPIA_LAWFUL_BASES;
module.exports.RISK_LEVELS = RISK_LEVELS;
