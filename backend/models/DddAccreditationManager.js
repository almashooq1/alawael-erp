'use strict';
/**
 * DddAccreditationManager — Mongoose Models & Constants
 * Auto-extracted from services/dddAccreditationManager.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const ACCREDITATION_TYPES = [
  'jci',
  'cbahi',
  'carf',
  'iso_9001',
  'iso_45001',
  'cap',
  'magnet',
  'planetree',
  'national_body',
  'specialty_specific',
  'program_level',
  'international',
];

const ACCREDITATION_STATUSES = [
  'preparing',
  'self_assessment',
  'submitted',
  'under_review',
  'survey_scheduled',
  'survey_complete',
  'awarded',
  'conditional',
  'denied',
  'expired',
];

const SURVEY_TYPES = [
  'initial',
  'triennial',
  'focused',
  'unannounced',
  'follow_up',
  'validation',
  'extension',
  'complaint_driven',
  'mock_survey',
  'desk_review',
];

const FINDING_SEVERITIES = [
  'critical',
  'major',
  'minor',
  'observation',
  'opportunity',
  'commendation',
  'not_applicable',
  'partially_met',
  'not_met',
  'fully_met',
];

const CORRECTIVE_ACTION_STATUSES = [
  'identified',
  'planned',
  'in_progress',
  'implemented',
  'verified',
  'closed',
  'overdue',
  'escalated',
  'deferred',
  'cancelled',
];

const STANDARD_CHAPTERS = [
  'patient_safety',
  'infection_control',
  'medication_management',
  'patient_rights',
  'governance',
  'staff_qualifications',
  'facility_management',
  'information_management',
  'performance_improvement',
  'education',
];

const BUILTIN_ACCREDITATION_BODIES = [
  { code: 'JCI', name: 'Joint Commission International', cycle: 36 },
  { code: 'CBAHI', name: 'Saudi Central Board for Accreditation', cycle: 36 },
  { code: 'CARF', name: 'Commission on Accreditation of Rehabilitation Facilities', cycle: 36 },
  { code: 'ISO9001', name: 'ISO 9001 Quality Management', cycle: 36 },
  { code: 'ISO45001', name: 'ISO 45001 Occupational Health & Safety', cycle: 36 },
  { code: 'CAP', name: 'College of American Pathologists', cycle: 24 },
  { code: 'MAGNET', name: 'Magnet Recognition Program', cycle: 48 },
  { code: 'PLANETREE', name: 'Planetree Person-Centered Care', cycle: 36 },
  { code: 'ACHC', name: 'Accreditation Commission for Health Care', cycle: 36 },
  { code: 'DNV', name: 'DNV Healthcare Accreditation', cycle: 36 },
];

/* ═══════════════════ Schemas ═══════════════════ */

/* ═══════════════════ Schemas ═══════════════════ */

const accreditationCycleSchema = new Schema(
  {
    bodyCode: { type: String, required: true },
    bodyName: { type: String, required: true },
    type: { type: String, enum: ACCREDITATION_TYPES, required: true },
    status: { type: String, enum: ACCREDITATION_STATUSES, default: 'preparing' },
    cycleStartDate: { type: Date, required: true },
    cycleEndDate: { type: Date },
    surveyDate: { type: Date },
    awardedDate: { type: Date },
    expiryDate: { type: Date },
    leadCoordinatorId: { type: Schema.Types.ObjectId, ref: 'User' },
    teamMembers: [{ userId: { type: Schema.Types.ObjectId, ref: 'User' }, role: String }],
    overallScore: { type: Number },
    certificateUrl: { type: String },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
accreditationCycleSchema.index({ bodyCode: 1, status: 1 });
accreditationCycleSchema.index({ expiryDate: 1 });

const selfAssessmentSchema = new Schema(
  {
    cycleId: { type: Schema.Types.ObjectId, ref: 'DDDAccreditationCycle', required: true },
    chapter: { type: String, enum: STANDARD_CHAPTERS, required: true },
    standardRef: { type: String },
    assessorId: { type: Schema.Types.ObjectId, ref: 'User' },
    assessmentDate: { type: Date, default: Date.now },
    complianceScore: { type: Number, min: 0, max: 100 },
    finding: { type: String, enum: FINDING_SEVERITIES },
    evidence: { type: String },
    gaps: [{ description: String, severity: String }],
    documentUrls: [{ type: String }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
selfAssessmentSchema.index({ cycleId: 1, chapter: 1 });

const surveyFindingSchema = new Schema(
  {
    cycleId: { type: Schema.Types.ObjectId, ref: 'DDDAccreditationCycle', required: true },
    surveyType: { type: String, enum: SURVEY_TYPES, required: true },
    chapter: { type: String, enum: STANDARD_CHAPTERS },
    standardRef: { type: String },
    severity: { type: String, enum: FINDING_SEVERITIES, required: true },
    description: { type: String, required: true },
    surveyorNotes: { type: String },
    department: { type: String },
    responsibleId: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
surveyFindingSchema.index({ cycleId: 1, severity: 1 });

const correctiveActionSchema = new Schema(
  {
    findingId: { type: Schema.Types.ObjectId, ref: 'DDDSurveyFinding', required: true },
    cycleId: { type: Schema.Types.ObjectId, ref: 'DDDAccreditationCycle' },
    status: { type: String, enum: CORRECTIVE_ACTION_STATUSES, default: 'identified' },
    description: { type: String, required: true },
    rootCause: { type: String },
    actionPlan: { type: String },
    responsibleId: { type: Schema.Types.ObjectId, ref: 'User' },
    targetDate: { type: Date },
    completedDate: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    evidence: [{ type: String }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
correctiveActionSchema.index({ findingId: 1 });
correctiveActionSchema.index({ status: 1, targetDate: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDAccreditationCycle =
  mongoose.models.DDDAccreditationCycle ||
  mongoose.model('DDDAccreditationCycle', accreditationCycleSchema);
const DDDSelfAssessment =
  mongoose.models.DDDSelfAssessment || mongoose.model('DDDSelfAssessment', selfAssessmentSchema);
const DDDSurveyFinding =
  mongoose.models.DDDSurveyFinding || mongoose.model('DDDSurveyFinding', surveyFindingSchema);
const DDDCorrectiveAction =
  mongoose.models.DDDCorrectiveAction ||
  mongoose.model('DDDCorrectiveAction', correctiveActionSchema);

/* ═══════════════════ Domain Class ═══════════════════ */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  ACCREDITATION_TYPES,
  ACCREDITATION_STATUSES,
  SURVEY_TYPES,
  FINDING_SEVERITIES,
  CORRECTIVE_ACTION_STATUSES,
  STANDARD_CHAPTERS,
  BUILTIN_ACCREDITATION_BODIES,
  DDDAccreditationCycle,
  DDDSelfAssessment,
  DDDSurveyFinding,
  DDDCorrectiveAction,
};
