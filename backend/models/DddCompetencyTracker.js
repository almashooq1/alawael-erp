'use strict';
/**
 * DddCompetencyTracker — Mongoose Models & Constants
 * Auto-extracted from services/dddCompetencyTracker.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const COMPETENCY_DOMAINS = [
  'clinical_skills',
  'technical_skills',
  'communication',
  'leadership',
  'research',
  'ethics',
  'safety',
  'cultural_competence',
  'technology',
  'teamwork',
  'documentation',
  'patient_education',
  'critical_thinking',
  'evidence_based_practice',
  'quality_improvement',
];

const PROFICIENCY_LEVELS = ['novice', 'advanced_beginner', 'competent', 'proficient', 'expert'];

const ASSESSMENT_METHODS = [
  'self_assessment',
  'supervisor_assessment',
  'peer_review',
  'practical_exam',
  'written_exam',
  'portfolio',
  'observation',
  'simulation',
  'case_study',
  'patient_feedback',
  '360_review',
];

const CREDENTIAL_TYPES = [
  'license',
  'certification',
  'registration',
  'accreditation',
  'specialty',
  'fellowship',
  'diploma',
  'degree',
  'permit',
  'endorsement',
];

const CREDENTIAL_STATUSES = [
  'active',
  'pending',
  'expired',
  'suspended',
  'revoked',
  'renewal_due',
  'under_review',
  'inactive',
];

const COMPETENCY_STATUSES = [
  'not_assessed',
  'developing',
  'meets_expectations',
  'exceeds_expectations',
  'needs_improvement',
  'critical_gap',
];

/* ── Built-in competency frameworks ─────────────────────────────────────── */
const BUILTIN_FRAMEWORKS = [
  {
    code: 'CF-REHAB-CORE',
    name: 'Rehabilitation Core Competencies',
    nameAr: 'الكفاءات الأساسية للتأهيل',
    domains: ['clinical_skills', 'communication', 'ethics', 'safety', 'teamwork'],
  },
  {
    code: 'CF-PT',
    name: 'Physical Therapy Competency Framework',
    nameAr: 'إطار كفاءات العلاج الطبيعي',
    domains: ['clinical_skills', 'evidence_based_practice', 'patient_education'],
  },
  {
    code: 'CF-OT',
    name: 'Occupational Therapy Competency Framework',
    nameAr: 'إطار كفاءات العلاج الوظيفي',
    domains: ['clinical_skills', 'critical_thinking', 'cultural_competence'],
  },
  {
    code: 'CF-SLP',
    name: 'Speech-Language Competency Framework',
    nameAr: 'إطار كفاءات النطق واللغة',
    domains: ['clinical_skills', 'communication', 'research'],
  },
  {
    code: 'CF-PSY',
    name: 'Psychology Competency Framework',
    nameAr: 'إطار كفاءات علم النفس',
    domains: ['clinical_skills', 'ethics', 'research', 'cultural_competence'],
  },
  {
    code: 'CF-NURSE',
    name: 'Nursing Competency Framework',
    nameAr: 'إطار كفاءات التمريض',
    domains: ['clinical_skills', 'safety', 'documentation', 'patient_education'],
  },
  {
    code: 'CF-LEAD',
    name: 'Leadership Competency Framework',
    nameAr: 'إطار كفاءات القيادة',
    domains: ['leadership', 'communication', 'quality_improvement', 'teamwork'],
  },
  {
    code: 'CF-TECH',
    name: 'Health Technology Competency',
    nameAr: 'كفاءات التقنية الصحية',
    domains: ['technology', 'documentation', 'safety'],
  },
  {
    code: 'CF-RESEARCH',
    name: 'Clinical Research Competency',
    nameAr: 'كفاءات البحث السريري',
    domains: ['research', 'evidence_based_practice', 'ethics', 'critical_thinking'],
  },
  {
    code: 'CF-QI',
    name: 'Quality Improvement Competency',
    nameAr: 'كفاءات تحسين الجودة',
    domains: ['quality_improvement', 'documentation', 'leadership'],
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Competency Framework ──────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const competencyFrameworkSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    domains: [{ type: String, enum: COMPETENCY_DOMAINS }],
    targetRoles: [{ type: String }],
    version: { type: String, default: '1.0' },
    status: { type: String, enum: ['draft', 'active', 'archived', 'retired'], default: 'draft' },
    publishedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDCompetencyFramework =
  mongoose.models.DDDCompetencyFramework ||
  mongoose.model('DDDCompetencyFramework', competencyFrameworkSchema);

/* ── Competency ────────────────────────────────────────────────────────── */
const competencySchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    domain: { type: String, enum: COMPETENCY_DOMAINS, required: true },
    frameworkId: { type: Schema.Types.ObjectId, ref: 'DDDCompetencyFramework', index: true },
    requiredLevel: { type: String, enum: PROFICIENCY_LEVELS, default: 'competent' },
    assessmentMethods: [{ type: String, enum: ASSESSMENT_METHODS }],
    indicators: [
      {
        level: { type: String, enum: PROFICIENCY_LEVELS },
        description: { type: String },
        descriptionAr: { type: String },
      },
    ],
    relatedCourses: [{ type: Schema.Types.ObjectId, ref: 'DDDCourse' }],
    isCore: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

competencySchema.index({ domain: 1, frameworkId: 1 });

const DDDCompetency =
  mongoose.models.DDDCompetency || mongoose.model('DDDCompetency', competencySchema);

/* ── Staff Competency ──────────────────────────────────────────────────── */
const assessmentRecordSchema = new Schema(
  {
    method: { type: String, enum: ASSESSMENT_METHODS, required: true },
    assessorId: { type: Schema.Types.ObjectId, ref: 'User' },
    assessorName: { type: String },
    level: { type: String, enum: PROFICIENCY_LEVELS },
    score: { type: Number, min: 0, max: 100 },
    date: { type: Date, default: Date.now },
    evidence: { type: String },
    notes: { type: String },
    attachments: [{ name: String, url: String }],
  },
  { _id: true }
);

const staffCompetencySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    competencyId: {
      type: Schema.Types.ObjectId,
      ref: 'DDDCompetency',
      required: true,
      index: true,
    },
    frameworkId: { type: Schema.Types.ObjectId, ref: 'DDDCompetencyFramework' },
    currentLevel: { type: String, enum: PROFICIENCY_LEVELS, default: 'novice' },
    targetLevel: { type: String, enum: PROFICIENCY_LEVELS, default: 'competent' },
    status: { type: String, enum: COMPETENCY_STATUSES, default: 'not_assessed' },
    assessments: [assessmentRecordSchema],
    lastAssessedAt: { type: Date },
    nextAssessmentDue: { type: Date },
    developmentPlan: { type: String },
    courseCompletions: [
      {
        courseId: { type: Schema.Types.ObjectId },
        completedAt: { type: Date },
        score: { type: Number },
      },
    ],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

staffCompetencySchema.index({ userId: 1, competencyId: 1 }, { unique: true });
staffCompetencySchema.index({ status: 1, currentLevel: 1 });

const DDDStaffCompetency =
  mongoose.models.DDDStaffCompetency || mongoose.model('DDDStaffCompetency', staffCompetencySchema);

/* ── Credential ────────────────────────────────────────────────────────── */
const credentialSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: CREDENTIAL_TYPES, required: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    issuingBody: { type: String, required: true },
    issuingBodyAr: { type: String },
    credentialNumber: { type: String },
    status: { type: String, enum: CREDENTIAL_STATUSES, default: 'active' },
    issuedDate: { type: Date, required: true },
    expiryDate: { type: Date },
    renewalDate: { type: Date },
    country: { type: String, default: 'SA' },
    specialization: { type: String },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    attachments: [{ name: String, url: String, type: String }],
    renewalHistory: [
      {
        renewedAt: { type: Date },
        expiryDate: { type: Date },
        notes: { type: String },
      },
    ],
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

credentialSchema.index({ type: 1, status: 1 });
credentialSchema.index({ expiryDate: 1 });

const DDDCompetencyCredential =
  mongoose.models.DDDCompetencyCredential || mongoose.model('DDDCompetencyCredential', credentialSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  COMPETENCY_DOMAINS,
  PROFICIENCY_LEVELS,
  ASSESSMENT_METHODS,
  CREDENTIAL_TYPES,
  CREDENTIAL_STATUSES,
  COMPETENCY_STATUSES,
  BUILTIN_FRAMEWORKS,
  DDDCompetencyFramework,
  DDDCompetency,
  DDDStaffCompetency,
  DDDCompetencyCredential,
};
