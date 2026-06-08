'use strict';

/**
 * TransitionPlan — Wave 361.
 *
 * "خطة الانتقال" — graduates the in-memory scaffold at
 * `rehabilitation-services/transition-planning-service.js` into a
 * production-grade Mongoose model with persistence + invariants +
 * canonical refs.
 *
 * Targets 5 life-stage transitions per the original scaffold:
 *   • early_to_school          — EI (≤36mo) → preschool / kindergarten
 *   • school_to_secondary      — primary → secondary education
 *   • school_to_work           — exit education → vocational / employment
 *   • rehab_to_community       — residential rehab → community living
 *   • dependent_to_independent — supported → independent living
 *
 * Readiness is scored across 6 domains (self-care, communication, social,
 * cognitive, vocational, life-skills) on a 1-5 scale; composite score is
 * a weighted mean.
 *
 * Distinct from CarePlanVersion (W41) — care plans are therapeutic
 * cycles; transition plans are life-stage milestones that span MULTIPLE
 * care-plan cycles + cross-team coordination (family, school, employer,
 * housing).
 *
 * Distinct from IndividualEducationPlan (W200b) — IEP is the educational
 * annual plan; transition plan is the bridge to whatever comes AFTER
 * education (or between education tiers).
 *
 * Wave-18 invariants:
 *   • transitionType ∈ TRANSITION_TYPES
 *   • status='completed' requires actualTransitionDate
 *   • status='in_progress' requires plannedTransitionDate
 *   • domain scores in [1, 5]
 *   • milestones[]: title + dueDate required
 *   • assessor (transitionLeadId/Name) required on any non-draft plan
 */

const mongoose = require('mongoose');

const TRANSITION_TYPES = [
  'early_to_school',
  'school_to_secondary',
  'school_to_work',
  'rehab_to_community',
  'dependent_to_independent',
];

const STATUSES = ['draft', 'readiness_assessed', 'in_progress', 'completed', 'paused', 'cancelled'];

const DOMAINS = ['self_care', 'communication', 'social', 'cognitive', 'vocational', 'life_skills'];

const MILESTONE_STATUSES = ['pending', 'in_progress', 'achieved', 'missed', 'cancelled'];

// Per-domain readiness score 1 (very poor) → 5 (independent)
const DomainScoreSchema = new mongoose.Schema(
  {
    domain: { type: String, enum: DOMAINS, required: true },
    score: { type: Number, min: 1, max: 5, required: true },
    notes: { type: String, default: '', maxlength: 500 },
  },
  { _id: false }
);

const MilestoneSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, maxlength: 300 },
    description: { type: String, default: '', maxlength: 1000 },
    domain: { type: String, enum: DOMAINS.concat([null]), default: null },
    dueDate: { type: Date, required: true },
    achievedAt: { type: Date, default: null },
    status: { type: String, enum: MILESTONE_STATUSES, default: 'pending' },
    responsibleParty: { type: String, default: '', maxlength: 100 },
    evidenceNotes: { type: String, default: '', maxlength: 1000 },
  },
  { _id: true }
);

const ReviewSchema = new mongoose.Schema(
  {
    reviewDate: { type: Date, required: true },
    reviewType: { type: String, default: '', maxlength: 50 }, // quarterly / annual / parent_request
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewerName: { type: String, default: '', maxlength: 100 },
    findings: { type: String, default: '', maxlength: 2000 },
    nextReviewDate: { type: Date, default: null },
  },
  { _id: true }
);

const TransitionPlanSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },

    transitionType: { type: String, enum: TRANSITION_TYPES, required: true, index: true },
    status: { type: String, enum: STATUSES, default: 'draft', index: true },

    // ── Context ──────────────────────────────────────────────────
    currentAgeMonths: { type: Number, default: null, min: 0, max: 1200 },
    currentPlacement: { type: String, default: '', maxlength: 200 },
    targetPlacement: { type: String, default: '', maxlength: 200 },
    plannedTransitionDate: { type: Date, default: null },
    actualTransitionDate: { type: Date, default: null },

    // ── Readiness assessment (6 domain scores + composite) ───────
    domainScores: { type: [DomainScoreSchema], default: () => [] },
    compositeReadinessScore: { type: Number, default: null, min: 1, max: 5 },
    readinessAssessedAt: { type: Date, default: null },
    readinessAssessorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    readinessAssessorName: { type: String, default: '', maxlength: 100 },

    // ── Plan content ─────────────────────────────────────────────
    milestones: { type: [MilestoneSchema], default: () => [] },
    barriers: { type: [String], default: () => [] },
    supports: { type: [String], default: () => [] },
    familyInvolvement: { type: String, default: '', maxlength: 1500 },

    // ── External coordination ────────────────────────────────────
    receivingProgramName: { type: String, default: '', maxlength: 200 },
    receivingContactName: { type: String, default: '', maxlength: 100 },
    receivingContactPhone: { type: String, default: '', maxlength: 30 },

    // ── Cross-link to active care plan ────────────────────────────
    linkedCarePlanVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CarePlanVersion',
      default: null,
    },
    linkedIepId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IndividualEducationPlan',
      default: null,
    },

    // ── Ownership ─────────────────────────────────────────────────
    transitionLeadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    transitionLeadName: { type: String, default: '', maxlength: 100 },
    transitionLeadRole: { type: String, default: '', maxlength: 50 },

    reviews: { type: [ReviewSchema], default: () => [] },

    notes: { type: String, default: '', maxlength: 2000 },
  },
  { timestamps: true, collection: 'transition_plans' }
);

TransitionPlanSchema.index({ beneficiaryId: 1, transitionType: 1 });
TransitionPlanSchema.index({ branchId: 1, status: 1 });
TransitionPlanSchema.index({ plannedTransitionDate: 1, status: 1 });

TransitionPlanSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

TransitionPlanSchema.path('__invariants').validate(function () {
  let ok = true;

  if (!TRANSITION_TYPES.includes(this.transitionType)) {
    this.invalidate('transitionType', `must be one of ${TRANSITION_TYPES.join(',')}`);
    ok = false;
  }

  if (this.status === 'completed') {
    if (!this.actualTransitionDate) {
      this.invalidate(
        'actualTransitionDate',
        'actualTransitionDate required when status=completed'
      );
      ok = false;
    }
  }

  if (this.status === 'in_progress' && !this.plannedTransitionDate) {
    this.invalidate(
      'plannedTransitionDate',
      'plannedTransitionDate required when status=in_progress'
    );
    ok = false;
  }

  // Non-draft requires a lead
  if (this.status !== 'draft') {
    if (!this.transitionLeadId && !String(this.transitionLeadName || '').trim()) {
      this.invalidate('transitionLeadId', 'transitionLead required when not draft');
      ok = false;
    }
  }

  // readiness_assessed requires domainScores + composite
  if (this.status === 'readiness_assessed' || this.compositeReadinessScore != null) {
    if (this.compositeReadinessScore == null) {
      this.invalidate('compositeReadinessScore', 'composite readiness score required');
      ok = false;
    }
    if (!Array.isArray(this.domainScores) || this.domainScores.length === 0) {
      this.invalidate('domainScores', 'at least one domain score required');
      ok = false;
    }
  }

  // Each milestone needs title + dueDate
  if (Array.isArray(this.milestones)) {
    for (let i = 0; i < this.milestones.length; i++) {
      const m = this.milestones[i];
      if (!String(m.title || '').trim()) {
        this.invalidate(`milestones.${i}.title`, 'milestone title required');
        ok = false;
      }
      if (!m.dueDate) {
        this.invalidate(`milestones.${i}.dueDate`, 'milestone dueDate required');
        ok = false;
      }
    }
  }

  return ok;
});

TransitionPlanSchema.virtual('milestonesAchievedCount').get(function () {
  return Array.isArray(this.milestones)
    ? this.milestones.filter(m => m.status === 'achieved').length
    : 0;
});

TransitionPlanSchema.virtual('milestonesProgressPct').get(function () {
  if (!Array.isArray(this.milestones) || this.milestones.length === 0) return 0;
  return Math.round(
    (this.milestones.filter(m => m.status === 'achieved').length / this.milestones.length) * 100
  );
});

TransitionPlanSchema.virtual('isOverdue').get(function () {
  return !!(
    this.status === 'in_progress' &&
    this.plannedTransitionDate &&
    new Date(this.plannedTransitionDate) < new Date()
  );
});

TransitionPlanSchema.set('toJSON', { virtuals: true });
TransitionPlanSchema.set('toObject', { virtuals: true });

// ── W1030: producer hooks — emit on transition completion → unified core ──
// A transition plan reaching 'completed' is a life-stage milestone on the
// beneficiary's longitudinal record. Non-callback hook style (W483-safe).
TransitionPlanSchema.pre('save', function () {
  this.$__transitionCompletedNow =
    this.status === 'completed' && (this.isNew || this.isModified('status'));
});

TransitionPlanSchema.post('save', function emitTransitionCompleted(doc) {
  if (!this.$__transitionCompletedNow) return;
  if (!doc.beneficiaryId) return;
  try {
    const { integrationBus } = require('../integration/systemIntegrationBus');
    Promise.resolve(
      integrationBus.publish('transition', 'transition.completed', {
        transitionPlanId: String(doc._id),
        beneficiaryId: String(doc.beneficiaryId),
        ...(doc.branchId ? { branchId: String(doc.branchId) } : {}),
        transitionType: doc.transitionType,
        compositeReadinessScore: doc.compositeReadinessScore ?? null,
        actualTransitionDate: doc.actualTransitionDate || new Date(),
      })
    ).catch(() => {});
  } catch (_err) {
    // bus optional — never block persistence
  }
});

module.exports =
  mongoose.models.TransitionPlan || mongoose.model('TransitionPlan', TransitionPlanSchema);

module.exports.TRANSITION_TYPES = TRANSITION_TYPES;
module.exports.STATUSES = STATUSES;
module.exports.DOMAINS = DOMAINS;
module.exports.MILESTONE_STATUSES = MILESTONE_STATUSES;
