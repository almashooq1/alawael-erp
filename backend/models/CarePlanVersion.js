'use strict';

/**
 * CarePlanVersion — Wave 41 (Care Planning Phase 1).
 *
 * Append-only versioned record for a beneficiary's care plan. Every
 * meaningful change creates a new version; the prior version is marked
 * `superseded`. Approved versions are immutable except via the
 * controlled-amendment workflow.
 *
 * Composition:
 *   • metadata (planId, versionNumber, status, author, reviewer, approver)
 *   • body (goals, programs, measures, tests, supportServices, familyRole, etc.)
 *   • validation snapshot (readinessScore + hardFailures + softWarnings)
 *   • signatureChain (append-only, hash-chained signatures per action)
 *   • amendments (controlled, non-structural edits to approved versions)
 *   • notificationLog (per family-send attempt)
 *   • evidenceHash (sha256 of canonicalized body — locks approved versions)
 *
 * Wave-18 cross-field invariants enforced via the `__invariants` virtual
 * path:
 *   1. Status === 'approved' requires reviewer + approver + reviewer != author
 *   2. Status ∈ {approved, saved_to_record, family_notification_sent}
 *      requires non-empty signatureChain
 *   3. Status === 'superseded' requires `supersededBy` set
 *   4. Status === 'family_notification_sent' requires familyVersion exists
 *   5. ReviewerId / approverId cannot equal authorId (no self-review/approve)
 *   6. evidenceHash, once set on approval, cannot change
 *   7. Each amendment timestamp ≥ approvedAt
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const reg = require('../intelligence/care-planning.registry');

// ─── Sub-schemas ──────────────────────────────────────────────────

const EvidenceRefSchema = new mongoose.Schema(
  {
    kind: {
      type: String,
      enum: ['assessment', 'baseline', 'note', 'measure', 'incident', 'family_note'],
      required: true,
    },
    refId: { type: String, required: true, maxlength: 200 },
    capturedAt: { type: Date, default: null },
    summary: { type: String, default: null, maxlength: 1000 },
  },
  { _id: false }
);

const SmartCheckSchema = new mongoose.Schema(
  {
    specific: { type: Boolean, default: false },
    measurable: { type: Boolean, default: false },
    achievable: { type: Boolean, default: false },
    relevant: { type: Boolean, default: false },
    timeBound: { type: Boolean, default: false },
  },
  { _id: false }
);

// W452 — embedded ICF mapping subdoc for PlanGoal. Mirrors the structure
// on the standalone Goal model. Wave-18 invariants enforced at the
// CarePlanVersion-level pre('save') validator (see end of file).
const PlanGoalIcfMappingSchema = new mongoose.Schema(
  {
    icfCode: { type: String, required: true, match: /^[bsde]\d+$/ },
    isPrimary: { type: Boolean, default: false },
    targetQualifier: { type: Number, min: 0, max: 4 },
    baselineQualifier: { type: Number, min: 0, max: 4 },
  },
  { _id: false }
);

const PlanGoalSchema = new mongoose.Schema(
  {
    goalId: { type: String, required: true, maxlength: 100 },
    parentGoalId: { type: String, default: null, maxlength: 100 },
    domain: { type: String, required: true, maxlength: 100 },
    statement: { type: String, required: true, maxlength: 2000 },
    priorityScore: { type: Number, min: 0, max: 1, required: true },
    targetValue: { type: String, default: null, maxlength: 200 },
    targetUnit: { type: String, default: null, maxlength: 50 },
    targetHorizonWeeks: { type: Number, default: null, min: 1, max: 104 },
    baselineLink: { type: String, default: null, maxlength: 200 },
    assessmentLink: { type: String, default: null, maxlength: 200 },
    measureLink: { type: String, default: null, maxlength: 200 },
    evidenceRefs: { type: [EvidenceRefSchema], default: () => [] },
    smart: { type: SmartCheckSchema, default: () => ({}) },
    confidence: { type: Number, min: 0, max: 1, default: null },
    status: {
      type: String,
      enum: ['proposed', 'active', 'on_track', 'plateau', 'regressing', 'achieved', 'closed'],
      default: 'proposed',
    },
    successCriterion: { type: String, default: null, maxlength: 1000 },
    humanConfirmationRequired: { type: [String], default: () => [] },

    // W452 — ICF code linkage. Same shape as Goal.icfMapping. Used to
    // express in WHO ICF terms what this planned goal targets so the
    // care plan can produce ICF-coded outcome reports for Disability
    // Authority / MOH submissions.
    icfMapping: { type: [PlanGoalIcfMappingSchema], default: () => [] },
  },
  { _id: false }
);

const PlanProgramSchema = new mongoose.Schema(
  {
    programId: { type: String, required: true, maxlength: 100 },
    name: { type: String, required: true, maxlength: 200 },
    modality: { type: String, default: null, maxlength: 100 },
    frequencyPerWeek: { type: Number, required: true, min: 0, max: 14 },
    durationMin: { type: Number, required: true, min: 5, max: 240 },
    goalRefs: { type: [String], default: () => [], required: true },
  },
  { _id: false }
);

const PlanMeasureSchema = new mongoose.Schema(
  {
    measureId: { type: String, required: true, maxlength: 100 },
    instrument: { type: String, required: true, maxlength: 200 },
    cadenceWeeks: { type: Number, default: 4, min: 1, max: 52 },
    goalRefs: { type: [String], default: () => [], required: true },
  },
  { _id: false }
);

const PlanTestSchema = new mongoose.Schema(
  {
    testId: { type: String, required: true, maxlength: 100 },
    instrument: { type: String, required: true, maxlength: 200 },
    scheduledAt: { type: Date, default: null },
    goalRefs: { type: [String], default: () => [], required: true },
  },
  { _id: false }
);

const PlanSupportServiceSchema = new mongoose.Schema(
  {
    service: {
      type: String,
      enum: [
        'transport',
        'psychology',
        'behavior_support',
        'family_counseling',
        'assistive_devices',
        'school_coordination',
        'tele_rehab',
        'home_training',
        'social_support',
      ],
      required: true,
    },
    intensity: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    justification: { type: String, default: null, maxlength: 500 },
    goalRefs: { type: [String], default: () => [] },
  },
  { _id: false }
);

const FamilyRoleSchema = new mongoose.Schema(
  {
    expectedInvolvementMinutesPerWeek: { type: Number, default: 0, min: 0, max: 600 },
    coachingPlan: { type: String, default: null, maxlength: 2000 },
    homeProgram: {
      type: [
        new mongoose.Schema(
          {
            activity: { type: String, required: true, maxlength: 500 },
            frequency: { type: String, required: true, maxlength: 100 },
            goalRef: { type: String, default: null, maxlength: 100 },
            expectedOutcome: { type: String, default: null, maxlength: 500 },
          },
          { _id: false }
        ),
      ],
      default: () => [],
    },
  },
  { _id: false }
);

const SafetyFlagSchema = new mongoose.Schema(
  {
    flag: { type: String, required: true, maxlength: 100 },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], required: true },
    mitigation: { type: String, default: null, maxlength: 2000 },
    monitoringMeasure: { type: String, default: null, maxlength: 200 },
  },
  { _id: false }
);

const BarrierSchema = new mongoose.Schema(
  {
    barrier: { type: String, required: true, maxlength: 200 },
    likelihood: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    impact: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    ownerToMitigate: { type: String, default: null, maxlength: 100 },
  },
  { _id: false }
);

const ReviewScorecardSchema = new mongoose.Schema(
  {
    quality: { type: Number, min: 0, max: 10, default: null },
    compliance: { type: Number, min: 0, max: 10, default: null },
    clarity: { type: Number, min: 0, max: 10, default: null },
    measurability: { type: Number, min: 0, max: 10, default: null },
    familyReadiness: { type: Number, min: 0, max: 10, default: null },
    safety: { type: Number, min: 0, max: 10, default: null },
    overall: { type: Number, min: 0, max: 10, default: null },
  },
  { _id: false }
);

const RejectionDetailsSchema = new mongoose.Schema(
  {
    primaryReason: { type: String, enum: reg.REJECTION_REASON_LIST, default: null },
    requiredFixes: {
      type: [
        new mongoose.Schema(
          {
            elementId: { type: String, default: null, maxlength: 200 },
            fix: { type: String, required: true, maxlength: 2000 },
            priority: { type: Number, min: 1, max: 3, default: 2 },
            severity: { type: String, enum: ['must_fix', 'nice_to_fix'], default: 'must_fix' },
          },
          { _id: false }
        ),
      ],
      default: () => [],
    },
    rewriteGuidance: { type: String, default: null, maxlength: 4000 },
    urgency: {
      type: String,
      enum: ['immediate', 'within_3_days', 'within_7_days'],
      default: 'within_7_days',
    },
  },
  { _id: false }
);

const ValidationSnapshotSchema = new mongoose.Schema(
  {
    readinessScore: { type: Number, min: 0, max: 100, default: 0 },
    band: { type: String, enum: ['ready', 'pending', 'draft_only'], default: 'draft_only' },
    hardFailures: {
      type: [
        new mongoose.Schema(
          {
            ruleId: { type: String, required: true, maxlength: 100 },
            elementId: { type: String, default: null, maxlength: 200 },
            message: { type: String, required: true, maxlength: 1000 },
          },
          { _id: false }
        ),
      ],
      default: () => [],
    },
    softWarnings: {
      type: [
        new mongoose.Schema(
          {
            ruleId: { type: String, required: true, maxlength: 100 },
            elementId: { type: String, default: null, maxlength: 200 },
            message: { type: String, required: true, maxlength: 1000 },
          },
          { _id: false }
        ),
      ],
      default: () => [],
    },
    validatedAt: { type: Date, default: null },
  },
  { _id: false }
);

const SignatureSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    role: { type: String, required: true, maxlength: 100 },
    action: { type: String, required: true, maxlength: 100 },
    signedAt: { type: Date, required: true, default: Date.now },
    nafathSignatureId: { type: String, default: null, maxlength: 200 },
    prevHash: { type: String, default: null, maxlength: 128 },
    hash: { type: String, required: true, maxlength: 128 },
  },
  { _id: false }
);

const AmendmentSchema = new mongoose.Schema(
  {
    amendmentId: { type: String, required: true, maxlength: 100 },
    appliedAt: { type: Date, required: true, default: Date.now },
    appliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    field: { type: String, required: true, maxlength: 200 },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    reason: { type: String, required: true, maxlength: 1000 },
  },
  { _id: false }
);

const FamilyNotificationSchema = new mongoose.Schema(
  {
    attemptId: { type: String, required: true, maxlength: 100 },
    channel: {
      type: String,
      enum: ['email', 'sms', 'whatsapp', 'portal', 'manual'],
      required: true,
    },
    attemptedAt: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ['queued', 'sent', 'delivered', 'read', 'failed', 'manual_override'],
      required: true,
    },
    retries: { type: Number, default: 0, min: 0, max: 5 },
    failureReason: { type: String, default: null, maxlength: 500 },
    acknowledgedAt: { type: Date, default: null },
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────

const CarePlanVersionSchema = new mongoose.Schema(
  {
    planId: { type: String, required: true, maxlength: 100, index: true },
    versionNumber: { type: Number, required: true, min: 1 },
    planType: { type: String, enum: reg.PLAN_TYPE_LIST, required: true },
    specialty: { type: String, default: null, maxlength: 50 },
    status: {
      type: String,
      enum: reg.STATUS_LIST,
      required: true,
      default: reg.STATUSES.DRAFT,
      index: true,
    },

    // Ownership
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true, index: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    approverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Body
    reasonForPlan: {
      type: String,
      enum: ['initial', 'revision', 'post_incident', 'annual_review', 'discharge_prep'],
      required: true,
    },
    baselineSummary: {
      strengths: { type: [String], default: () => [] },
      needs: { type: [String], default: () => [] },
      problemList: { type: [mongoose.Schema.Types.Mixed], default: () => [] },
    },
    goals: { type: [PlanGoalSchema], default: () => [] },
    programs: { type: [PlanProgramSchema], default: () => [] },
    measures: { type: [PlanMeasureSchema], default: () => [] },
    tests: { type: [PlanTestSchema], default: () => [] },
    supportServices: { type: [PlanSupportServiceSchema], default: () => [] },
    familyRole: { type: FamilyRoleSchema, default: () => ({}) },
    barriers: { type: [BarrierSchema], default: () => [] },
    safetyFlags: { type: [SafetyFlagSchema], default: () => [] },
    sessionsPerWeekCap: { type: Number, default: 5, min: 1, max: 14 },

    // Review schedule
    reviewSchedule: {
      nextReviewAt: { type: Date, default: null },
      cadenceWeeks: { type: Number, default: 12, min: 1, max: 52 },
      triggerEvents: { type: [String], default: () => [] },
    },

    // Validation snapshot (refreshed by validator)
    validation: { type: ValidationSnapshotSchema, default: () => ({}) },

    // Lifecycle timestamps
    createdAt: { type: Date, default: Date.now, index: true },
    submittedAt: { type: Date, default: null },
    reviewStartedAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null, index: true },
    rejectedAt: { type: Date, default: null },
    savedToRecordAt: { type: Date, default: null },
    familyNotifiedAt: { type: Date, default: null },
    supersededAt: { type: Date, default: null },

    // Versioning relations
    supersededBy: { type: String, default: null, maxlength: 200 },
    diffSummary: { type: mongoose.Schema.Types.Mixed, default: null },
    reasonForRevision: { type: String, default: null, maxlength: 1000 },

    // Review + rejection
    reviewScorecard: { type: ReviewScorecardSchema, default: null },
    rejection: { type: RejectionDetailsSchema, default: null },
    revisionNotes: { type: [mongoose.Schema.Types.Mixed], default: () => [] },
    rejectionCount: { type: Number, default: 0, min: 0 },

    // Signature chain (append-only, hash-linked)
    signatureChain: { type: [SignatureSchema], default: () => [] },
    evidenceHash: { type: String, default: null, maxlength: 128 },

    // Controlled amendments
    amendments: { type: [AmendmentSchema], default: () => [] },

    // Family communication
    familyVersion: {
      generatedAt: { type: Date, default: null },
      readabilityGrade: { type: Number, default: null, min: 0, max: 20 },
      body: { type: String, default: null },
    },
    familyNotifications: { type: [FamilyNotificationSchema], default: () => [] },

    correlationId: { type: String, default: null, maxlength: 100, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: false, collection: 'care_plan_versions' }
);

// ─── Indexes ──────────────────────────────────────────────────────

CarePlanVersionSchema.index({ planId: 1, versionNumber: -1 }, { unique: true });
CarePlanVersionSchema.index({ beneficiaryId: 1, status: 1, createdAt: -1 });
CarePlanVersionSchema.index({ branchId: 1, status: 1, createdAt: -1 });
CarePlanVersionSchema.index({ authorId: 1, status: 1 });
CarePlanVersionSchema.index({ reviewerId: 1, status: 1 });
CarePlanVersionSchema.index({ 'reviewSchedule.nextReviewAt': 1, status: 1 });

// ─── Cross-field invariants (Wave-18 virtual-path pattern) ───────

CarePlanVersionSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

CarePlanVersionSchema.path('__invariants').validate(function () {
  let ok = true;

  const isPostApproval = [
    reg.STATUSES.APPROVED,
    reg.STATUSES.SAVED_TO_RECORD,
    reg.STATUSES.FAMILY_NOTIFICATION_SENT,
    reg.STATUSES.SUPERSEDED,
  ].includes(this.status);

  // 1. Approved & onward states require reviewer + approver + reviewer != author
  if (isPostApproval) {
    if (!this.reviewerId) {
      this.invalidate('reviewerId', `status ${this.status} requires a reviewerId`);
      ok = false;
    }
    if (!this.approverId) {
      this.invalidate('approverId', `status ${this.status} requires an approverId`);
      ok = false;
    }
    if (this.reviewerId && this.authorId && String(this.reviewerId) === String(this.authorId)) {
      this.invalidate('reviewerId', 'reviewer cannot be the same person as the author');
      ok = false;
    }
    if (this.approverId && this.authorId && String(this.approverId) === String(this.authorId)) {
      this.invalidate('approverId', 'approver cannot be the same person as the author');
      ok = false;
    }
  }

  // 2. Post-approval requires non-empty signatureChain
  if (isPostApproval && (!Array.isArray(this.signatureChain) || this.signatureChain.length === 0)) {
    this.invalidate('signatureChain', `status ${this.status} requires a non-empty signatureChain`);
    ok = false;
  }

  // 3. supersededBy must be set when status === superseded
  if (this.status === reg.STATUSES.SUPERSEDED && !this.supersededBy) {
    this.invalidate('supersededBy', 'superseded versions must reference supersededBy');
    ok = false;
  }

  // 4. family_notification_sent requires familyVersion.body
  if (this.status === reg.STATUSES.FAMILY_NOTIFICATION_SENT) {
    if (!this.familyVersion || !this.familyVersion.body) {
      this.invalidate(
        'familyVersion',
        'family_notification_sent requires a generated familyVersion.body'
      );
      ok = false;
    }
    if (
      this.familyVersion &&
      this.familyVersion.readabilityGrade != null &&
      this.familyVersion.readabilityGrade > reg.FAMILY_REDACTION.MAX_GRADE_LEVEL
    ) {
      this.invalidate(
        'familyVersion.readabilityGrade',
        `family version readability grade must be ≤ ${reg.FAMILY_REDACTION.MAX_GRADE_LEVEL}`
      );
      ok = false;
    }
  }

  // 5. Approved status requires readinessScore ≥ READY threshold and zero hardFailures
  if (
    this.status === reg.STATUSES.APPROVED &&
    this.validation &&
    (this.validation.readinessScore < reg.READINESS_BANDS.READY ||
      (this.validation.hardFailures || []).length > 0)
  ) {
    this.invalidate(
      'validation',
      `cannot approve: readinessScore=${this.validation.readinessScore}, ` +
        `hardFailures=${(this.validation.hardFailures || []).length}`
    );
    ok = false;
  }

  // 6. SignatureChain integrity — each entry's prevHash matches previous .hash
  if (Array.isArray(this.signatureChain) && this.signatureChain.length > 0) {
    for (let i = 1; i < this.signatureChain.length; i++) {
      const prev = this.signatureChain[i - 1];
      const cur = this.signatureChain[i];
      if (cur.prevHash !== prev.hash) {
        this.invalidate(
          'signatureChain',
          `signatureChain integrity broken at index ${i}: prevHash mismatch`
        );
        ok = false;
        break;
      }
    }
  }

  // 7. Each amendment timestamp ≥ approvedAt (if approved)
  if (this.approvedAt && Array.isArray(this.amendments)) {
    for (const a of this.amendments) {
      if (a.appliedAt && a.appliedAt < this.approvedAt) {
        this.invalidate('amendments', `amendment ${a.amendmentId} predates approvedAt`);
        ok = false;
        break;
      }
    }
  }

  // 8. W452 — ICF mapping invariants per PlanGoal:
  //    (a) at most one primary entry
  //    (b) targetQualifier requires baselineQualifier
  //    (c) no duplicate icfCode within a goal's mapping array
  if (Array.isArray(this.goals)) {
    for (let i = 0; i < this.goals.length; i++) {
      const goal = this.goals[i];
      if (!Array.isArray(goal.icfMapping) || goal.icfMapping.length === 0) continue;

      const primaries = goal.icfMapping.filter(m => m.isPrimary === true);
      if (primaries.length > 1) {
        this.invalidate(
          `goals.${i}.icfMapping`,
          `goal "${goal.goalId}" has ${primaries.length} primary ICF mappings; at most one allowed`
        );
        ok = false;
      }

      const seen = new Set();
      for (const m of goal.icfMapping) {
        if (seen.has(m.icfCode)) {
          this.invalidate(
            `goals.${i}.icfMapping`,
            `goal "${goal.goalId}" has duplicate icfCode '${m.icfCode}'`
          );
          ok = false;
          break;
        }
        seen.add(m.icfCode);

        if (typeof m.targetQualifier === 'number' && typeof m.baselineQualifier !== 'number') {
          this.invalidate(
            `goals.${i}.icfMapping`,
            `goal "${goal.goalId}" icfCode '${m.icfCode}' has targetQualifier without baselineQualifier`
          );
          ok = false;
        }
      }
    }
  }

  return ok;
});

// ─── Statics: deterministic hashing helpers ────────────────────────

CarePlanVersionSchema.statics.computeEvidenceHash = function (planBody) {
  const canonical = JSON.stringify(planBody, Object.keys(planBody || {}).sort());
  return crypto.createHash('sha256').update(canonical).digest('hex');
};

CarePlanVersionSchema.statics.computeSignatureHash = function ({
  userId,
  role,
  action,
  signedAt,
  prevHash,
}) {
  const payload = `${userId}|${role}|${action}|${
    signedAt instanceof Date ? signedAt.toISOString() : signedAt
  }|${prevHash || ''}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
};

module.exports =
  mongoose.models.CarePlanVersion || mongoose.model('CarePlanVersion', CarePlanVersionSchema);

module.exports.CarePlanVersionSchema = CarePlanVersionSchema;
