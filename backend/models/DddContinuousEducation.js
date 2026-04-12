'use strict';
/**
 * DddContinuousEducation — Mongoose Models & Constants
 * Auto-extracted from services/dddContinuousEducation.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const CEU_CATEGORIES = [
  'clinical_practice',
  'professional_ethics',
  'patient_safety',
  'evidence_based_practice',
  'cultural_competence',
  'supervision',
  'leadership',
  'research',
  'technology',
  'specialty_area',
  'interprofessional',
  'quality_improvement',
  'regulatory_compliance',
  'mental_health',
  'disability_studies',
];

const CEU_ACTIVITY_TYPES = [
  'course_completion',
  'conference',
  'workshop',
  'seminar',
  'webinar',
  'self_study',
  'journal_article',
  'publication',
  'presentation',
  'mentoring',
  'clinical_supervision',
  'research_project',
  'committee_service',
  'volunteer_work',
];

const CEU_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'expired',
  'under_review',
  'needs_documentation',
  'archived',
];

const DEV_PLAN_STATUSES = [
  'draft',
  'active',
  'in_review',
  'completed',
  'on_hold',
  'cancelled',
  'expired',
];

const DEV_GOAL_STATUSES = ['not_started', 'in_progress', 'completed', 'deferred', 'cancelled'];

const ACCREDITATION_TYPES = [
  'national',
  'international',
  'regional',
  'specialty',
  'institutional',
  'programmatic',
  'professional_body',
  'governmental',
];

const RENEWAL_CYCLES = ['annual', 'biennial', 'triennial', 'quadrennial', 'custom'];

/* ── Built-in CEU requirements ──────────────────────────────────────────── */
const BUILTIN_CEU_REQUIREMENTS = [
  {
    code: 'REQ-PT',
    role: 'Physical Therapist',
    totalCredits: 40,
    cycle: 'biennial',
    categories: ['clinical_practice', 'professional_ethics', 'patient_safety'],
    minEthics: 4,
  },
  {
    code: 'REQ-OT',
    role: 'Occupational Therapist',
    totalCredits: 36,
    cycle: 'biennial',
    categories: ['clinical_practice', 'professional_ethics', 'cultural_competence'],
    minEthics: 4,
  },
  {
    code: 'REQ-SLP',
    role: 'Speech-Language Pathologist',
    totalCredits: 30,
    cycle: 'biennial',
    categories: ['clinical_practice', 'professional_ethics', 'evidence_based_practice'],
    minEthics: 3,
  },
  {
    code: 'REQ-PSY',
    role: 'Clinical Psychologist',
    totalCredits: 40,
    cycle: 'biennial',
    categories: ['clinical_practice', 'professional_ethics', 'supervision'],
    minEthics: 6,
  },
  {
    code: 'REQ-NURSE',
    role: 'Rehabilitation Nurse',
    totalCredits: 30,
    cycle: 'annual',
    categories: ['clinical_practice', 'patient_safety', 'quality_improvement'],
    minEthics: 2,
  },
  {
    code: 'REQ-AT',
    role: 'Assistive Technology Specialist',
    totalCredits: 24,
    cycle: 'biennial',
    categories: ['technology', 'clinical_practice', 'disability_studies'],
    minEthics: 2,
  },
  {
    code: 'REQ-SW',
    role: 'Social Worker',
    totalCredits: 36,
    cycle: 'biennial',
    categories: [
      'clinical_practice',
      'professional_ethics',
      'cultural_competence',
      'mental_health',
    ],
    minEthics: 6,
  },
  {
    code: 'REQ-LEAD',
    role: 'Clinical Leader',
    totalCredits: 20,
    cycle: 'annual',
    categories: ['leadership', 'quality_improvement', 'regulatory_compliance'],
    minEthics: 2,
  },
  {
    code: 'REQ-SUPER',
    role: 'Clinical Supervisor',
    totalCredits: 30,
    cycle: 'biennial',
    categories: ['supervision', 'professional_ethics', 'evidence_based_practice'],
    minEthics: 4,
  },
  {
    code: 'REQ-RES',
    role: 'Clinical Researcher',
    totalCredits: 20,
    cycle: 'annual',
    categories: ['research', 'professional_ethics', 'evidence_based_practice'],
    minEthics: 3,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── CEU Record ────────────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const ceuRecordSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    category: { type: String, enum: CEU_CATEGORIES, required: true },
    activityType: { type: String, enum: CEU_ACTIVITY_TYPES, required: true },
    credits: { type: Number, required: true, min: 0 },
    status: { type: String, enum: CEU_STATUSES, default: 'pending' },
    provider: { type: String },
    providerId: { type: Schema.Types.ObjectId, ref: 'DDDAccreditedProvider' },
    courseId: { type: Schema.Types.ObjectId, ref: 'DDDCourse' },
    activityDate: { type: Date, required: true },
    completionDate: { type: Date },
    expiryDate: { type: Date },
    certificateUrl: { type: String },
    certificateNumber: { type: String },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    rejectionReason: { type: String },
    attachments: [{ name: String, url: String, type: String }],
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

ceuRecordSchema.index({ category: 1, status: 1, activityDate: -1 });
ceuRecordSchema.index({ userId: 1, status: 1 });

const DDDCEURecord =
  mongoose.models.DDDCEURecord || mongoose.model('DDDCEURecord', ceuRecordSchema);

/* ── Professional Development Plan ─────────────────────────────────────── */
const devGoalSchema = new Schema(
  {
    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    category: { type: String, enum: CEU_CATEGORIES },
    targetDate: { type: Date },
    status: { type: String, enum: DEV_GOAL_STATUSES, default: 'not_started' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    progress: { type: Number, default: 0, min: 0, max: 100 },
    activities: [{ type: String }],
    resources: [{ type: String }],
    completedAt: { type: Date },
    notes: { type: String },
  },
  { _id: true }
);

const profDevPlanSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    status: { type: String, enum: DEV_PLAN_STATUSES, default: 'draft' },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    goals: [devGoalSchema],
    overallProgress: { type: Number, default: 0, min: 0, max: 100 },
    supervisorId: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewNotes: { type: String },
    approvedAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

profDevPlanSchema.index({ status: 1, periodEnd: 1 });

const DDDProfDevPlan =
  mongoose.models.DDDProfDevPlan || mongoose.model('DDDProfDevPlan', profDevPlanSchema);

/* ── Accredited Provider ───────────────────────────────────────────────── */
const accreditedProviderSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: ACCREDITATION_TYPES, required: true },
    accreditingBody: { type: String },
    accreditationNumber: { type: String },
    isActive: { type: Boolean, default: true },
    country: { type: String, default: 'SA' },
    contact: { phone: String, email: String, website: String },
    categories: [{ type: String, enum: CEU_CATEGORIES }],
    accreditedFrom: { type: Date },
    accreditedTo: { type: Date },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDAccreditedProvider =
  mongoose.models.DDDAccreditedProvider ||
  mongoose.model('DDDAccreditedProvider', accreditedProviderSchema);

/* ── CEU Requirement ───────────────────────────────────────────────────── */
const ceuRequirementSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    role: { type: String, required: true },
    roleAr: { type: String },
    totalCredits: { type: Number, required: true },
    cycle: { type: String, enum: RENEWAL_CYCLES, default: 'biennial' },
    cycleDays: { type: Number },
    categories: [{ type: String, enum: CEU_CATEGORIES }],
    minEthics: { type: Number, default: 0 },
    minClinical: { type: Number, default: 0 },
    minSpecialty: { type: Number, default: 0 },
    maxSelfStudy: { type: Number },
    maxOnline: { type: Number },
    isActive: { type: Boolean, default: true },
    regulatoryBody: { type: String },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDCEURequirement =
  mongoose.models.DDDCEURequirement || mongoose.model('DDDCEURequirement', ceuRequirementSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  CEU_CATEGORIES,
  CEU_ACTIVITY_TYPES,
  CEU_STATUSES,
  DEV_PLAN_STATUSES,
  DEV_GOAL_STATUSES,
  ACCREDITATION_TYPES,
  RENEWAL_CYCLES,
  BUILTIN_CEU_REQUIREMENTS,
  DDDCEURecord,
  DDDProfDevPlan,
  DDDAccreditedProvider,
  DDDCEURequirement,
};
