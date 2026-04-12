'use strict';
/**
 * DddSafetyManager — Mongoose Models & Constants
 * Auto-extracted from services/dddSafetyManager.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const HAZARD_TYPES = [
  'physical',
  'chemical',
  'biological',
  'ergonomic',
  'electrical',
  'fire_hazard',
  'slip_trip_fall',
  'radiation',
  'noise',
  'temperature',
  'structural',
  'equipment',
];

const HAZARD_STATUSES = [
  'reported',
  'under_review',
  'confirmed',
  'mitigated',
  'resolved',
  'monitoring',
  'escalated',
  'closed',
  'reopened',
  'accepted_risk',
];

const INSPECTION_TYPES = [
  'routine',
  'annual',
  'surprise',
  'follow_up',
  'pre_occupancy',
  'post_incident',
  'regulatory',
  'equipment',
  'fire_safety',
  'accessibility',
];

const RISK_LEVELS = [
  'negligible',
  'low',
  'moderate',
  'high',
  'very_high',
  'critical',
  'extreme',
  'imminent_danger',
  'under_assessment',
  'mitigated',
];

const SAFETY_CATEGORIES = [
  'fire_safety',
  'electrical_safety',
  'chemical_safety',
  'infection_control',
  'patient_safety',
  'workplace_safety',
  'equipment_safety',
  'environmental_safety',
  'emergency_preparedness',
  'accessibility_compliance',
];

const TRAINING_TYPES = [
  'orientation',
  'annual_refresher',
  'specialised',
  'drill_based',
  'online_course',
  'hands_on',
  'certification',
  'competency_assessment',
];

/* ── Built-in safety policies ───────────────────────────────────────────── */
const BUILTIN_SAFETY_POLICIES = [
  {
    code: 'SPOL-FIRE',
    name: 'Fire Safety Policy',
    nameAr: 'سياسة السلامة من الحريق',
    category: 'fire_safety',
  },
  {
    code: 'SPOL-ELEC',
    name: 'Electrical Safety Policy',
    nameAr: 'سياسة السلامة الكهربائية',
    category: 'electrical_safety',
  },
  {
    code: 'SPOL-CHEM',
    name: 'Chemical Safety Policy',
    nameAr: 'سياسة السلامة الكيميائية',
    category: 'chemical_safety',
  },
  {
    code: 'SPOL-INF',
    name: 'Infection Control Policy',
    nameAr: 'سياسة مكافحة العدوى',
    category: 'infection_control',
  },
  {
    code: 'SPOL-PAT',
    name: 'Patient Safety Policy',
    nameAr: 'سياسة سلامة المرضى',
    category: 'patient_safety',
  },
  {
    code: 'SPOL-WORK',
    name: 'Workplace Safety Policy',
    nameAr: 'سياسة السلامة المهنية',
    category: 'workplace_safety',
  },
  {
    code: 'SPOL-EQUIP',
    name: 'Equipment Safety Policy',
    nameAr: 'سياسة سلامة المعدات',
    category: 'equipment_safety',
  },
  {
    code: 'SPOL-ENV',
    name: 'Environmental Safety Policy',
    nameAr: 'سياسة السلامة البيئية',
    category: 'environmental_safety',
  },
  {
    code: 'SPOL-EMRG',
    name: 'Emergency Preparedness Policy',
    nameAr: 'سياسة الاستعداد للطوارئ',
    category: 'emergency_preparedness',
  },
  {
    code: 'SPOL-ACC',
    name: 'Accessibility Compliance Policy',
    nameAr: 'سياسة الامتثال لإمكانية الوصول',
    category: 'accessibility_compliance',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Safety Inspection ─────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const safetyInspectionSchema = new Schema(
  {
    inspectionCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: INSPECTION_TYPES, required: true },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'follow_up_required'],
      default: 'scheduled',
    },
    category: { type: String, enum: SAFETY_CATEGORIES },
    locationId: { type: Schema.Types.ObjectId },
    locationDescription: { type: String },
    inspectorId: { type: Schema.Types.ObjectId, ref: 'User' },
    scheduledDate: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    checklist: [
      {
        item: { type: String },
        status: { type: String, enum: ['pass', 'fail', 'na', 'needs_attention'] },
        notes: { type: String },
      },
    ],
    findings: [{ area: String, observation: String, riskLevel: String, recommendation: String }],
    overallScore: { type: Number, min: 0, max: 100 },
    nextInspectionDate: { type: Date },
    attachments: [{ name: String, url: String, type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

safetyInspectionSchema.index({ type: 1, status: 1 });
safetyInspectionSchema.index({ scheduledDate: 1 });

const DDDSafetyInspection =
  mongoose.models.DDDSafetyInspection ||
  mongoose.model('DDDSafetyInspection', safetyInspectionSchema);

/* ── Hazard Report ─────────────────────────────────────────────────────── */
const hazardReportSchema = new Schema(
  {
    hazardCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: HAZARD_TYPES, required: true },
    status: { type: String, enum: HAZARD_STATUSES, default: 'reported' },
    riskLevel: { type: String, enum: RISK_LEVELS },
    locationId: { type: Schema.Types.ObjectId },
    locationDescription: { type: String },
    description: { type: String },
    reportedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reportedAt: { type: Date, default: Date.now },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    mitigationPlan: { type: String },
    mitigatedAt: { type: Date },
    resolvedAt: { type: Date },
    rootCause: { type: String },
    correctiveActions: [
      { action: String, responsible: String, dueDate: Date, completedDate: Date, status: String },
    ],
    attachments: [{ name: String, url: String, type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

hazardReportSchema.index({ type: 1, status: 1 });
hazardReportSchema.index({ riskLevel: 1 });

const DDDHazardReport =
  mongoose.models.DDDHazardReport || mongoose.model('DDDHazardReport', hazardReportSchema);

/* ── Safety Policy ─────────────────────────────────────────────────────── */
const safetyPolicySchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    category: { type: String, enum: SAFETY_CATEGORIES, required: true },
    content: { type: String },
    procedures: [{ step: Number, title: String, description: String }],
    version: { type: Number, default: 1 },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    effectiveDate: { type: Date },
    nextReviewDate: { type: Date },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDSafetyPolicy =
  mongoose.models.DDDSafetyPolicy || mongoose.model('DDDSafetyPolicy', safetyPolicySchema);

/* ── Safety Training ───────────────────────────────────────────────────── */
const safetyTrainingSchema = new Schema(
  {
    trainingCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: TRAINING_TYPES, required: true },
    category: { type: String, enum: SAFETY_CATEGORIES },
    description: { type: String },
    scheduledDate: { type: Date },
    completedDate: { type: Date },
    status: {
      type: String,
      enum: ['planned', 'scheduled', 'in_progress', 'completed', 'cancelled'],
    },
    instructor: { type: String },
    participants: [{ userId: Schema.Types.ObjectId, name: String, passed: Boolean, score: Number }],
    maxParticipants: { type: Number },
    duration: { type: Number },
    passingScore: { type: Number, default: 70 },
    materials: [{ name: String, url: String }],
    certificationRequired: { type: Boolean, default: false },
    validityMonths: { type: Number, default: 12 },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

safetyTrainingSchema.index({ type: 1, status: 1 });
safetyTrainingSchema.index({ scheduledDate: 1 });

const DDDSafetyTraining =
  mongoose.models.DDDSafetyTraining || mongoose.model('DDDSafetyTraining', safetyTrainingSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  HAZARD_TYPES,
  HAZARD_STATUSES,
  INSPECTION_TYPES,
  RISK_LEVELS,
  SAFETY_CATEGORIES,
  TRAINING_TYPES,
  BUILTIN_SAFETY_POLICIES,
  DDDSafetyInspection,
  DDDHazardReport,
  DDDSafetyPolicy,
  DDDSafetyTraining,
};
