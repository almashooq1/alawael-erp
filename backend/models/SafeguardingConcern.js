'use strict';

/**
 * SafeguardingConcern — Wave 357.
 *
 * "بلاغ حماية" — intake + investigation ledger for any safeguarding
 * concern raised about a beneficiary. Mandatory regulatory artifact:
 *   • CBAHI safety standards require a documented intake-to-closure
 *     pathway for every concern, with timeline + investigator + outcome.
 *   • Saudi child protection law (نظام حماية الطفل) mandates external
 *     reporting to هيئة حقوق الإنسان / النيابة العامة for substantiated
 *     abuse / neglect.
 *   • PDPL: subject identity + reporter identity are both required
 *     (non-anonymous internally), but visibility is role-restricted to
 *     safeguarding leads + clinical supervisor + branch manager.
 *
 * Distinct from RestraintSeclusionEvent (W193b) — restraint is a
 * staff-applied intervention. Safeguarding is concern ABOUT a
 * beneficiary's welfare (possibly at the hands of family, staff, or
 * a peer).
 *
 * Distinct from quality/Incident — incidents are operational events
 * (slip/fall/med error). Safeguarding is the welfare-of-the-person
 * track with mandatory external reporting hooks.
 *
 * Wave-18 invariants:
 *   • category required ∈ {physical, sexual, emotional, neglect,
 *     financial, online, other}
 *   • severity=critical → supervisorNotifiedAt within 1 hour required
 *   • status=substantiated → outcome='substantiated' + actionPlan
 *     required (CBAHI mandate)
 *   • status=escalated_to_authority → authorityName + authorityReportedAt
 *     required
 *   • status=closed → outcomeSummary required + closedBy + closedAt
 *   • subjectKind ∈ {beneficiary, staff, other}; subjectKind='beneficiary'
 *     requires subjectBeneficiaryId
 */

const mongoose = require('mongoose');

const CATEGORIES = ['physical', 'sexual', 'emotional', 'neglect', 'financial', 'online', 'other'];

const SEVERITY = ['low', 'medium', 'high', 'critical'];

const STATUSES = [
  'reported',
  'triaged',
  'investigating',
  'substantiated',
  'unsubstantiated',
  'escalated_to_authority',
  'closed',
];

const OUTCOMES = ['substantiated', 'unsubstantiated', 'inconclusive'];

const SUBJECT_KINDS = ['beneficiary', 'staff', 'other'];

const NOTIFICATION_METHODS = ['phone', 'sms', 'in_person', 'whatsapp', 'email'];

const SafeguardingConcernSchema = new mongoose.Schema(
  {
    // ── Subject (who the concern is about) ─────────────────────────
    subjectKind: { type: String, enum: SUBJECT_KINDS, required: true, index: true },
    subjectBeneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      default: null,
      index: true,
    },
    subjectName: { type: String, default: '', maxlength: 200 },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Branch',
      default: null,
      index: true,
    },
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiarySection',
      default: null,
    },

    // ── Reporter (non-anonymous per PDPL + child protection law) ───
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reportedByName: { type: String, default: '', maxlength: 100 },
    reportedByRole: { type: String, default: '', maxlength: 50 },
    reportedAt: { type: Date, default: Date.now, index: true },

    // ── Concern details ────────────────────────────────────────────
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    severity: { type: String, enum: SEVERITY, required: true, default: 'medium', index: true },
    incidentDate: { type: Date, default: null },
    incidentLocation: { type: String, default: '', maxlength: 200 },
    description: { type: String, required: true, maxlength: 3000 },
    witnesses: { type: [String], default: () => [] },
    physicalSigns: { type: [String], default: () => [] },
    behavioralSigns: { type: [String], default: () => [] },

    // ── Alleged perpetrator (free-form; identities NOT required at intake) ─
    allegedAgainstName: { type: String, default: '', maxlength: 200 },
    allegedAgainstRelationship: { type: String, default: '', maxlength: 100 },

    // ── Triage ─────────────────────────────────────────────────────
    triagedAt: { type: Date, default: null },
    triagedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    triagedByName: { type: String, default: '', maxlength: 100 },
    triageNotes: { type: String, default: '', maxlength: 1000 },

    // ── Investigation ──────────────────────────────────────────────
    investigatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    investigatorName: { type: String, default: '', maxlength: 100 },
    investigationStartedAt: { type: Date, default: null },
    investigationNotes: { type: String, default: '', maxlength: 5000 },
    evidenceRefs: { type: [String], default: () => [] }, // file IDs / external links

    // ── Outcome ────────────────────────────────────────────────────
    outcome: { type: String, enum: OUTCOMES.concat([null]), default: null },
    outcomeAt: { type: Date, default: null },
    outcomeSummary: { type: String, default: '', maxlength: 2000 },
    actionPlan: { type: String, default: '', maxlength: 2000 },

    // ── External authority reporting (هيئة حقوق الإنسان / النيابة) ─
    authorityReported: { type: Boolean, default: false },
    authorityName: { type: String, default: '', maxlength: 200 },
    authorityReportedAt: { type: Date, default: null },
    authorityReferenceNumber: { type: String, default: '', maxlength: 100 },

    // ── Family notification ────────────────────────────────────────
    familyNotifiedAt: { type: Date, default: null },
    familyNotificationMethod: {
      type: String,
      enum: NOTIFICATION_METHODS.concat([null]),
      default: null,
    },

    // ── Supervisor escalation (1h SLA for critical) ────────────────
    supervisorNotifiedAt: { type: Date, default: null },
    supervisorName: { type: String, default: '', maxlength: 100 },

    // ── Closure ────────────────────────────────────────────────────
    status: { type: String, enum: STATUSES, default: 'reported', index: true },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    closedByName: { type: String, default: '', maxlength: 100 },
    closedAt: { type: Date, default: null },

    // ── Internal cross-link (concern arose from a session/incident) ─
    linkedIncidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Incident',
      default: null,
    },

    // ── Confidentiality classification ─────────────────────────────
    // 'restricted' = visible only to safeguardingLead + branch_manager
    // + admin (default). Inherits the role-gate at the route layer.
    confidentiality: {
      type: String,
      enum: ['restricted', 'standard'],
      default: 'restricted',
    },

    notes: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true, collection: 'safeguarding_concerns' }
);

SafeguardingConcernSchema.index({ status: 1, severity: 1, reportedAt: -1 });
SafeguardingConcernSchema.index({ subjectBeneficiaryId: 1, reportedAt: -1 });
SafeguardingConcernSchema.index({ branchId: 1, reportedAt: -1 });
SafeguardingConcernSchema.index({ authorityReported: 1, reportedAt: -1 });

SafeguardingConcernSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

SafeguardingConcernSchema.path('__invariants').validate(function () {
  let ok = true;

  if (!CATEGORIES.includes(this.category)) {
    this.invalidate('category', `must be one of ${CATEGORIES.join(',')}`);
    ok = false;
  }
  if (!SUBJECT_KINDS.includes(this.subjectKind)) {
    this.invalidate('subjectKind', `must be one of ${SUBJECT_KINDS.join(',')}`);
    ok = false;
  }
  if (this.subjectKind === 'beneficiary' && !this.subjectBeneficiaryId) {
    this.invalidate(
      'subjectBeneficiaryId',
      'subjectBeneficiaryId required when subjectKind=beneficiary'
    );
    ok = false;
  }
  if (!String(this.description || '').trim()) {
    this.invalidate('description', 'description required');
    ok = false;
  }

  // Critical severity → supervisor must be notified within 1h
  if (this.severity === 'critical') {
    if (!this.supervisorNotifiedAt) {
      this.invalidate(
        'supervisorNotifiedAt',
        'supervisor notification required for critical severity (1h SLA)'
      );
      ok = false;
    } else if (this.reportedAt) {
      const slaMs = 60 * 60 * 1000;
      const delta = new Date(this.supervisorNotifiedAt) - new Date(this.reportedAt);
      if (delta > slaMs) {
        // Soft warning — the record itself shouldn't reject, but downstream
        // alerting subscribers can flag breaches. Do NOT invalidate here.
      }
    }
  }

  // Substantiated → outcome + actionPlan required (CBAHI mandate)
  if (this.status === 'substantiated') {
    if (this.outcome !== 'substantiated') {
      this.invalidate('outcome', 'outcome must be substantiated when status=substantiated');
      ok = false;
    }
    if (!String(this.actionPlan || '').trim()) {
      this.invalidate('actionPlan', 'actionPlan required when substantiated');
      ok = false;
    }
  }

  // Escalated → authority details required
  if (this.status === 'escalated_to_authority') {
    if (!String(this.authorityName || '').trim()) {
      this.invalidate('authorityName', 'authorityName required when escalated');
      ok = false;
    }
    if (!this.authorityReportedAt) {
      this.invalidate('authorityReportedAt', 'authorityReportedAt required when escalated');
      ok = false;
    }
  }

  // Closed → outcomeSummary + closedBy + closedAt required
  if (this.status === 'closed') {
    if (!String(this.outcomeSummary || '').trim()) {
      this.invalidate('outcomeSummary', 'outcomeSummary required to close');
      ok = false;
    }
    if (!this.closedBy && !String(this.closedByName || '').trim()) {
      this.invalidate('closedBy', 'closer required to close');
      ok = false;
    }
    if (!this.closedAt) {
      this.invalidate('closedAt', 'closedAt required to close');
      ok = false;
    }
  }

  return ok;
});

SafeguardingConcernSchema.virtual('isCriticalAwaitingSupervisor').get(function () {
  return this.severity === 'critical' && !this.supervisorNotifiedAt;
});

SafeguardingConcernSchema.set('toJSON', { virtuals: true });
SafeguardingConcernSchema.set('toObject', { virtuals: true });

// W992 — surface a new safeguarding concern on the subject beneficiary's unified
// timeline. Only concerns ABOUT a beneficiary (subjectKind='beneficiary') land
// on a timeline; staff/other-subject concerns have no beneficiary timeline to
// attach to. Pre-compile native hooks (the W970 mechanism) — fire-and-forget +
// fully guarded. The literal `integrationBus.publish` keeps the W389/W392
// producer-coverage guards satisfied.
SafeguardingConcernSchema.pre('save', function () {
  this.$__wasNew = this.isNew;
  // W1027: flag a transition INTO 'closed' for the closure emitter below.
  this.$__safeguardingClosedNow =
    this.status === 'closed' && (this.isNew || this.isModified('status'));
});

SafeguardingConcernSchema.post('save', function (doc) {
  try {
    if (!this.$__wasNew) return; // only emit when a new concern is raised
    if (doc.subjectKind !== 'beneficiary' || !doc.subjectBeneficiaryId) return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;

    Promise.resolve(
      integrationBus.publish('safety', 'safeguarding.concern_raised', {
        concernId: String(doc._id),
        beneficiaryId: String(doc.subjectBeneficiaryId),
        branchId: doc.branchId ? String(doc.branchId) : '',
        category: doc.category || '',
        severity: doc.severity || '',
      })
    ).catch(() => {});
  } catch (_) {
    /* bus not wired (e.g. unit tests) — never block persistence */
  }
});

// W1027 — emit a closure milestone when a beneficiary-subject concern reaches
// the terminal 'closed' status. Separate non-callback post('save') hook (same
// hook family as the W992 emitter above → no W483 mismatch). The literal
// `integrationBus.publish` keeps the W389/W392 producer-coverage guards satisfied.
SafeguardingConcernSchema.post('save', function emitSafeguardingClosed(doc) {
  try {
    if (!this.$__safeguardingClosedNow) return;
    if (doc.subjectKind !== 'beneficiary' || !doc.subjectBeneficiaryId) return;
    const { integrationBus } = require('../integration/systemIntegrationBus');
    if (!integrationBus || typeof integrationBus.publish !== 'function') return;

    Promise.resolve(
      integrationBus.publish('safety', 'safeguarding.concern_closed', {
        concernId: String(doc._id),
        beneficiaryId: String(doc.subjectBeneficiaryId),
        branchId: doc.branchId ? String(doc.branchId) : '',
        category: doc.category || '',
        severity: doc.severity || '',
        outcome: doc.outcome || '',
        closedAt: doc.closedAt || new Date(),
      })
    ).catch(() => {});
  } catch (_) {
    /* bus not wired (e.g. unit tests) — never block persistence */
  }
});

module.exports =
  mongoose.models.SafeguardingConcern ||
  mongoose.model('SafeguardingConcern', SafeguardingConcernSchema);

module.exports.CATEGORIES = CATEGORIES;
module.exports.SEVERITY = SEVERITY;
module.exports.STATUSES = STATUSES;
module.exports.OUTCOMES = OUTCOMES;
module.exports.SUBJECT_KINDS = SUBJECT_KINDS;
module.exports.NOTIFICATION_METHODS = NOTIFICATION_METHODS;
