'use strict';

/**
 * IndividualEducationPlan (IEP/IFSP) — Wave 200b.
 *
 * "الخطة التربوية الفردية / خطة خدمة الأسرة الفردية" — annual plan
 * for school-age beneficiaries (IEP) or 0-3 early intervention (IFSP).
 * Required by وزارة التعليم السعودية for special education programs.
 *
 * One plan per (beneficiaryId, planYear). Goals/services are nested
 * subdocuments — keeps the whole plan loadable in a single query and
 * matches how educational planners think about it (one document, many
 * goals, periodic reviews).
 *
 * Workflow:
 *   draft → team_review → signed → active → completed / archived
 *
 * Wave-18 invariants:
 *   • (beneficiaryId, planYear) unique
 *   • planType ∈ {IEP, IFSP}; IFSP only for age < 3
 *   • status=signed requires ≥ 1 signature
 *   • status=active requires status was previously signed
 *   • Each goal: text + domain + criteria required
 *   • Each service: name + frequencyPerWeek required
 */

const mongoose = require('mongoose');

const PLAN_TYPES = ['IEP', 'IFSP'];
const STATUSES = ['draft', 'team_review', 'signed', 'active', 'completed', 'archived'];
const DOMAINS = [
  'academic',
  'communication',
  'social_emotional',
  'motor',
  'self_care',
  'behavior',
  'cognitive',
  'pre_vocational',
];
const GOAL_STATUSES = ['not_started', 'in_progress', 'mastered', 'modified', 'discontinued'];

const ObjectiveSchema = new mongoose.Schema(
  {
    text: { type: String, required: true, maxlength: 500 },
    criteria: { type: String, default: '', maxlength: 300 },
    mastered: { type: Boolean, default: false },
    masteredDate: { type: Date, default: null },
  },
  { _id: true }
);

const GoalSchema = new mongoose.Schema(
  {
    domain: { type: String, enum: DOMAINS, required: true },
    text: { type: String, required: true, maxlength: 500 },
    baseline: { type: String, default: '', maxlength: 500 },
    criteria: { type: String, required: true, maxlength: 300 },
    targetDate: { type: Date, default: null },
    status: { type: String, enum: GOAL_STATUSES, default: 'not_started' },
    objectives: { type: [ObjectiveSchema], default: () => [] },
    notes: { type: String, default: '', maxlength: 500 },
  },
  { _id: true }
);

const ServiceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, maxlength: 100 },
    provider: { type: String, default: '', maxlength: 100 },
    frequencyPerWeek: { type: Number, required: true, min: 0, max: 20 },
    durationMinutes: { type: Number, default: null, min: 0, max: 240 },
    location: { type: String, default: '', maxlength: 100 },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    notes: { type: String, default: '', maxlength: 300 },
  },
  { _id: true }
);

const SignatureSchema = new mongoose.Schema(
  {
    role: { type: String, required: true, maxlength: 50 }, // parent / teacher / therapist / supervisor
    name: { type: String, required: true, maxlength: 100 },
    signedAt: { type: Date, default: Date.now },
    nafathRequestId: { type: String, default: null, maxlength: 100 },
  },
  { _id: true }
);

const IEPSchema = new mongoose.Schema(
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
    sectionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiarySection',
      default: null,
    },

    planType: { type: String, enum: PLAN_TYPES, required: true, default: 'IEP' },
    planYear: { type: Number, required: true, min: 2020, max: 2050 },

    // Demographics snapshot at plan creation
    studentAgeMonths: { type: Number, default: null, min: 0 },
    primaryDisability: { type: String, default: '', maxlength: 150 },
    secondaryConditions: { type: [String], default: () => [] },

    // Present Levels of Performance (PLP)
    strengths: { type: String, default: '', maxlength: 1500 },
    challenges: { type: String, default: '', maxlength: 1500 },
    parentInput: { type: String, default: '', maxlength: 1500 },

    goals: { type: [GoalSchema], default: () => [] },
    services: { type: [ServiceSchema], default: () => [] },

    // Accommodations & modifications
    accommodations: { type: [String], default: () => [] },
    assistiveTech: { type: [String], default: () => [] },

    // Review schedule
    nextReviewDate: { type: Date, default: null },
    reviewHistory: {
      type: [
        {
          reviewDate: { type: Date, required: true },
          summary: { type: String, default: '', maxlength: 1000 },
          attendees: { type: [String], default: () => [] },
        },
      ],
      default: () => [],
    },

    signatures: { type: [SignatureSchema], default: () => [] },

    status: { type: String, enum: STATUSES, default: 'draft', index: true },
    effectiveStartDate: { type: Date, default: null },
    effectiveEndDate: { type: Date, default: null },

    createdByName: { type: String, default: '', maxlength: 100 },
  },
  { timestamps: true, collection: 'individual_education_plans' }
);

IEPSchema.index({ beneficiaryId: 1, planYear: -1 }, { unique: true });
IEPSchema.index({ status: 1, nextReviewDate: 1 });

IEPSchema.virtual('goalsCount').get(function () {
  return Array.isArray(this.goals) ? this.goals.length : 0;
});
IEPSchema.virtual('masteredGoalsCount').get(function () {
  return Array.isArray(this.goals) ? this.goals.filter(g => g.status === 'mastered').length : 0;
});
IEPSchema.virtual('isSigned').get(function () {
  return Array.isArray(this.signatures) && this.signatures.length > 0;
});

IEPSchema.add({
  __invariants: { type: mongoose.Schema.Types.Mixed, select: false, default: null },
});

IEPSchema.path('__invariants').validate(function () {
  let ok = true;
  if (this.planType === 'IFSP' && this.studentAgeMonths != null && this.studentAgeMonths > 36) {
    this.invalidate('planType', 'IFSP is for children under 3 years (36 months)');
    ok = false;
  }
  if (this.status === 'signed' && (!this.signatures || this.signatures.length === 0)) {
    this.invalidate('signatures', 'at least one signature required to mark as signed');
    ok = false;
  }
  if (this.status === 'active' && (!this.signatures || this.signatures.length === 0)) {
    this.invalidate('signatures', 'plan must be signed before activation');
    ok = false;
  }
  // Effective range sanity
  if (
    this.effectiveStartDate &&
    this.effectiveEndDate &&
    this.effectiveStartDate >= this.effectiveEndDate
  ) {
    this.invalidate('effectiveEndDate', 'end date must be after start date');
    ok = false;
  }
  return ok;
});

IEPSchema.set('toJSON', { virtuals: true });
IEPSchema.set('toObject', { virtuals: true });

module.exports =
  mongoose.models.IndividualEducationPlan || mongoose.model('IndividualEducationPlan', IEPSchema);

module.exports.PLAN_TYPES = PLAN_TYPES;
module.exports.STATUSES = STATUSES;
module.exports.DOMAINS = DOMAINS;
module.exports.GOAL_STATUSES = GOAL_STATUSES;
