'use strict';
/**
 * DddCareerPathway — Mongoose Models & Constants
 * Auto-extracted from services/dddCareerPathway.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const PATHWAY_TYPES = [
  'clinical_ladder',
  'management_track',
  'research_track',
  'education_track',
  'specialist_track',
  'dual_track',
  'technical_track',
  'consulting_track',
  'entrepreneurial',
  'lateral_move',
  'cross_functional',
  'executive_track',
];

const PATHWAY_STATUSES = [
  'draft',
  'active',
  'on_hold',
  'completed',
  'abandoned',
  'under_review',
  'approved',
  'modified',
  'archived',
  'graduated',
];

const DEVELOPMENT_AREAS = [
  'clinical_expertise',
  'leadership',
  'research_skills',
  'teaching',
  'management',
  'communication',
  'technology',
  'quality_improvement',
  'policy',
  'innovation',
  'mentoring',
  'strategic_planning',
];

const MILESTONE_TYPES = [
  'certification',
  'promotion',
  'skill_acquisition',
  'project_completion',
  'publication',
  'presentation',
  'leadership_role',
  'training_completion',
  'award',
  'assessment',
];

const SKILL_GAP_LEVELS = [
  'no_gap',
  'minor_gap',
  'moderate_gap',
  'significant_gap',
  'critical_gap',
  'not_assessed',
  'developing',
  'proficient',
  'expert',
  'master',
];

const SUCCESSION_PRIORITIES = [
  'immediate',
  'short_term',
  'medium_term',
  'long_term',
  'emergency_only',
  'development_pool',
  'high_potential',
  'ready_now',
  'ready_1yr',
  'ready_2yr',
];

const BUILTIN_PATHWAY_TEMPLATES = [
  { code: 'PT_CLINICAL', name: 'Physical Therapy Clinical Ladder', levels: 5 },
  { code: 'OT_CLINICAL', name: 'Occupational Therapy Clinical Ladder', levels: 5 },
  { code: 'SLP_CLINICAL', name: 'Speech Therapy Clinical Ladder', levels: 5 },
  { code: 'PSY_CLINICAL', name: 'Psychology Clinical Track', levels: 4 },
  { code: 'NURSE_LEADER', name: 'Nursing Leadership Track', levels: 4 },
  { code: 'MGMT_TRACK', name: 'Management Career Track', levels: 6 },
  { code: 'RESEARCH_TRK', name: 'Research Career Track', levels: 4 },
  { code: 'EDUCATION_TRK', name: 'Education & Training Track', levels: 4 },
  { code: 'QUALITY_TRK', name: 'Quality & Compliance Track', levels: 4 },
  { code: 'TECH_LEADER', name: 'Technology Leadership Track', levels: 5 },
];

/* ═══════════════════ Schemas ═══════════════════ */

/* ═══════════════════ Schemas ═══════════════════ */

const careerPathSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile', required: true },
    type: { type: String, enum: PATHWAY_TYPES, required: true },
    status: { type: String, enum: PATHWAY_STATUSES, default: 'draft' },
    currentLevel: { type: Number, default: 1 },
    targetLevel: { type: Number },
    startDate: { type: Date },
    targetDate: { type: Date },
    developmentAreas: [{ type: String, enum: DEVELOPMENT_AREAS }],
    milestones: [
      {
        title: String,
        type: { type: String, enum: MILESTONE_TYPES },
        targetDate: Date,
        completedDate: Date,
        isCompleted: { type: Boolean, default: false },
        evidence: String,
      },
    ],
    supervisorId: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
careerPathSchema.index({ staffId: 1, status: 1 });
careerPathSchema.index({ type: 1, status: 1 });

const skillAssessmentSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile', required: true },
    careerPathId: { type: Schema.Types.ObjectId, ref: 'DDDCareerPath' },
    assessmentDate: { type: Date, required: true },
    assessorId: { type: Schema.Types.ObjectId, ref: 'User' },
    skills: [
      {
        skillName: String,
        currentLevel: { type: String, enum: SKILL_GAP_LEVELS },
        requiredLevel: { type: String, enum: SKILL_GAP_LEVELS },
        gapLevel: { type: String, enum: SKILL_GAP_LEVELS },
        developmentPlan: String,
      },
    ],
    overallReadiness: { type: Number, min: 0, max: 100 },
    recommendations: [{ type: String }],
    nextAssessmentDate: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
skillAssessmentSchema.index({ staffId: 1, assessmentDate: -1 });

const successionPlanSchema = new Schema(
  {
    positionTitle: { type: String, required: true },
    department: { type: String },
    currentHolderId: { type: Schema.Types.ObjectId, ref: 'User' },
    priority: { type: String, enum: SUCCESSION_PRIORITIES, default: 'medium_term' },
    candidates: [
      {
        staffId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile' },
        readiness: { type: String, enum: SUCCESSION_PRIORITIES },
        gapAreas: [String],
        developmentActions: [String],
        rating: { type: Number, min: 1, max: 5 },
      },
    ],
    riskLevel: { type: String, enum: ['low', 'medium', 'high', 'critical'] },
    retirementDate: { type: Date },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
successionPlanSchema.index({ department: 1, priority: 1 });

const developmentActivitySchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: 'DDDStaffProfile', required: true },
    careerPathId: { type: Schema.Types.ObjectId, ref: 'DDDCareerPath' },
    activityType: { type: String, enum: MILESTONE_TYPES, required: true },
    title: { type: String, required: true },
    description: { type: String },
    startDate: { type: Date },
    completionDate: { type: Date },
    isCompleted: { type: Boolean, default: false },
    hoursInvested: { type: Number, default: 0 },
    cost: { type: Number, default: 0 },
    outcome: { type: String },
    certificationEarned: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
developmentActivitySchema.index({ staffId: 1, isCompleted: 1 });
developmentActivitySchema.index({ careerPathId: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDCareerPath =
  mongoose.models.DDDCareerPath || mongoose.model('DDDCareerPath', careerPathSchema);
const DDDSkillAssessment =
  mongoose.models.DDDSkillAssessment || mongoose.model('DDDSkillAssessment', skillAssessmentSchema);
const DDDSuccessionPlan =
  mongoose.models.DDDSuccessionPlan || mongoose.model('DDDSuccessionPlan', successionPlanSchema);
const DDDDevelopmentActivity =
  mongoose.models.DDDDevelopmentActivity ||
  mongoose.model('DDDDevelopmentActivity', developmentActivitySchema);

/* ═══════════════════ Domain Class ═══════════════════ */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  PATHWAY_TYPES,
  PATHWAY_STATUSES,
  DEVELOPMENT_AREAS,
  MILESTONE_TYPES,
  SKILL_GAP_LEVELS,
  SUCCESSION_PRIORITIES,
  BUILTIN_PATHWAY_TEMPLATES,
  DDDCareerPath,
  DDDSkillAssessment,
  DDDSuccessionPlan,
  DDDDevelopmentActivity,
};
