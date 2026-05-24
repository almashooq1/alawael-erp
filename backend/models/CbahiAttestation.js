'use strict';

/**
 * CbahiAttestation — Wave 360.
 *
 * "إقرار اعتماد CBAHI" — per-branch, per-standard attestation that the
 * center either MEETS, PARTIALLY meets, DOES NOT MEET, or considers the
 * standard NOT APPLICABLE. Each attestation carries the evidence + the
 * assessor + the next-due date for re-attestation.
 *
 * Pairs with `intelligence/cbahi-standards.registry.js` (W360) — the
 * registry is the catalog; this model is the per-branch attestation state.
 *
 * Distinct from quality/CapaItem — CAPA captures gaps to close; CBAHI
 * attestation captures the CURRENT meeting-status against a published
 * standard. When attestation=not_met, the right move is to create a
 * CapaItem and link via linkedCapaItemId.
 *
 * Wave-18 invariants:
 *   • standardKey ∈ cbahi-standards.registry.allKeys()
 *   • status='met' requires ≥1 evidence entry
 *   • status='partially_met' requires ≥1 evidence + gapNotes
 *   • status='not_met' requires gapNotes (+ usually a linkedCapaItemId)
 *   • status='not_applicable' requires naJustification
 *   • Each evidence entry: type + summary required
 *   • assessedBy + assessedAt required on any non-draft attestation
 *   • (branchId, standardKey) unique
 */

const mongoose = require('mongoose');
const registry = require('../intelligence/cbahi-standards.registry');

const STATUSES = ['draft', 'met', 'partially_met', 'not_met', 'not_applicable'];

// Evidence subdoc — references existing artifacts
const EvidenceEntrySchema = new mongoose.Schema(
  {
    type: { type: String, enum: registry.EVIDENCE_TYPES, required: true },
    summary: { type: String, required: true, maxlength: 500 },
    artifactId: { type: String, default: '', maxlength: 100 }, // FK to Document / CapaItem / etc.
    artifactKind: { type: String, default: '', maxlength: 50 }, // model name
    capturedAt: { type: Date, default: Date.now },
    capturedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    capturedByName: { type: String, default: '', maxlength: 100 },
    url: { type: String, default: '', maxlength: 500 },
  },
  { _id: true }
);

const AttestationHistorySchema = new mongoose.Schema(
  {
    snapshotAt: { type: Date, default: Date.now },
    snapshotByUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    snapshotByName: { type: String, default: '', maxlength: 100 },
    status: { type: String, enum: STATUSES },
    evidenceCount: { type: Number, default: 0 },
    summary: { type: String, default: '', maxlength: 500 },
  },
  { _id: true }
);

const CbahiAttestationSchema = new mongoose.Schema(
  {
    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      required: true,
      index: true,
    },
    standardKey: { type: String, required: true, maxlength: 100, index: true },
    // Denormalized for fast UI render — chapter + code
    standardChapter: { type: String, maxlength: 10 },
    standardCode: { type: String, maxlength: 30 },

    status: { type: String, enum: STATUSES, default: 'draft', required: true, index: true },
    score: { type: Number, default: null, min: 0, max: 100 }, // self-scored 0-100

    evidence: { type: [EvidenceEntrySchema], default: () => [] },
    history: { type: [AttestationHistorySchema], default: () => [] },

    gapNotes: { type: String, default: '', maxlength: 2000 },
    naJustification: { type: String, default: '', maxlength: 1000 },

    linkedCapaItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CapaItem',
      default: null,
    },

    assessedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    assessedByName: { type: String, default: '', maxlength: 100 },
    assessedByRole: { type: String, default: '', maxlength: 50 },
    assessedAt: { type: Date, default: null, index: true },
    nextReassessmentDue: { type: Date, default: null, index: true },

    notes: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true, collection: 'cbahi_attestations' }
);

// One attestation per (branch, standardKey)
CbahiAttestationSchema.index({ branchId: 1, standardKey: 1 }, { unique: true });
CbahiAttestationSchema.index({ branchId: 1, status: 1 });
CbahiAttestationSchema.index({ standardChapter: 1, status: 1 });

CbahiAttestationSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

CbahiAttestationSchema.path('__invariants').validate(function () {
  let ok = true;

  if (!STATUSES.includes(this.status)) {
    this.invalidate('status', `must be one of ${STATUSES.join(',')}`);
    ok = false;
  }

  // standardKey must exist in the registry
  if (!registry.findStandard(this.standardKey)) {
    this.invalidate('standardKey', `unknown CBAHI standard: ${this.standardKey}`);
    ok = false;
  }

  // status=met requires ≥1 evidence
  if (this.status === 'met') {
    if (!Array.isArray(this.evidence) || this.evidence.length === 0) {
      this.invalidate('evidence', 'at least one evidence entry required when status=met');
      ok = false;
    }
  }

  // status=partially_met requires evidence + gapNotes
  if (this.status === 'partially_met') {
    if (!Array.isArray(this.evidence) || this.evidence.length === 0) {
      this.invalidate('evidence', 'evidence required when partially met');
      ok = false;
    }
    if (!String(this.gapNotes || '').trim()) {
      this.invalidate('gapNotes', 'gapNotes required when partially met');
      ok = false;
    }
  }

  // status=not_met requires gapNotes
  if (this.status === 'not_met' && !String(this.gapNotes || '').trim()) {
    this.invalidate('gapNotes', 'gapNotes required when not met');
    ok = false;
  }

  // status=not_applicable requires naJustification
  if (this.status === 'not_applicable' && !String(this.naJustification || '').trim()) {
    this.invalidate('naJustification', 'naJustification required when not applicable');
    ok = false;
  }

  // assessor required for any non-draft state
  if (this.status !== 'draft') {
    if (!this.assessedBy && !String(this.assessedByName || '').trim()) {
      this.invalidate('assessedBy', 'assessor required when not draft');
      ok = false;
    }
    if (!this.assessedAt) {
      this.invalidate('assessedAt', 'assessedAt required when not draft');
      ok = false;
    }
  }

  // evidence-entry integrity
  if (Array.isArray(this.evidence)) {
    for (let i = 0; i < this.evidence.length; i++) {
      const e = this.evidence[i];
      if (!registry.EVIDENCE_TYPES.includes(e.type)) {
        this.invalidate(`evidence.${i}.type`, 'evidence type invalid');
        ok = false;
      }
      if (!String(e.summary || '').trim()) {
        this.invalidate(`evidence.${i}.summary`, 'evidence summary required');
        ok = false;
      }
    }
  }

  return ok;
});

CbahiAttestationSchema.virtual('reassessmentOverdue').get(function () {
  return !!(this.nextReassessmentDue && new Date(this.nextReassessmentDue) < new Date());
});

CbahiAttestationSchema.set('toJSON', { virtuals: true });
CbahiAttestationSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.CbahiAttestation || mongoose.model('CbahiAttestation', CbahiAttestationSchema);

module.exports.STATUSES = STATUSES;
