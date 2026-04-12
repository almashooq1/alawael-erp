'use strict';
/**
 * DddInspectionTracker — Mongoose Models & Constants
 * Auto-extracted from services/dddInspectionTracker.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const INSPECTION_TYPES = [
  'regulatory',
  'government',
  'internal_audit',
  'external_audit',
  'fire_safety',
  'infection_control',
  'pharmacy',
  'environment_of_care',
  'food_safety',
  'radiation_safety',
  'laboratory',
  'mock_inspection',
];

const INSPECTION_STATUSES = [
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'postponed',
  'follow_up_required',
  'closed',
  'partially_complete',
  'overdue',
  'rescheduled',
];

const INSPECTOR_TYPES = [
  'government_official',
  'accreditation_surveyor',
  'internal_auditor',
  'external_consultant',
  'regulatory_body',
  'fire_department',
  'health_authority',
  'environmental_agency',
  'insurance_inspector',
  'peer_reviewer',
];

const COMPLIANCE_LEVELS = [
  'full_compliance',
  'substantial_compliance',
  'partial_compliance',
  'non_compliance',
  'critical_non_compliance',
  'not_applicable',
  'exceeds_requirements',
  'pending_review',
  'conditionally_compliant',
  'improvement_needed',
];

const AREA_CATEGORIES = [
  'clinical_areas',
  'patient_rooms',
  'operating_rooms',
  'emergency_department',
  'pharmacy',
  'laboratory',
  'kitchen_cafeteria',
  'storage',
  'administrative',
  'common_areas',
  'mechanical_rooms',
  'outdoor',
];

const FOLLOW_UP_PRIORITIES = [
  'immediate',
  'urgent',
  'high',
  'medium',
  'low',
  'routine',
  'scheduled',
  'monitoring',
  'informational',
  'deferred',
];

const BUILTIN_INSPECTION_TEMPLATES = [
  { code: 'FIRE_SAFETY', name: 'Fire Safety Inspection', frequency: 'monthly' },
  { code: 'INFECTION_CTL', name: 'Infection Control Rounds', frequency: 'weekly' },
  { code: 'ENV_CARE', name: 'Environment of Care Rounds', frequency: 'monthly' },
  { code: 'PHARMACY_INS', name: 'Pharmacy Inspection', frequency: 'quarterly' },
  { code: 'FOOD_SAFETY', name: 'Food Safety Audit', frequency: 'monthly' },
  { code: 'RAD_SAFETY', name: 'Radiation Safety Inspection', frequency: 'annual' },
  { code: 'WASTE_MGMT', name: 'Waste Management Audit', frequency: 'quarterly' },
  { code: 'EQUIP_SAFETY', name: 'Equipment Safety Check', frequency: 'monthly' },
  { code: 'PATIENT_SAFE', name: 'Patient Safety Walkthrough', frequency: 'weekly' },
  { code: 'GOV_INSPECT', name: 'Government Regulatory Inspection', frequency: 'annual' },
];

/* ═══════════════════ Schemas ═══════════════════ */

/* ═══════════════════ Schemas ═══════════════════ */

const inspectionSchema = new Schema(
  {
    type: { type: String, enum: INSPECTION_TYPES, required: true },
    status: { type: String, enum: INSPECTION_STATUSES, default: 'scheduled' },
    title: { type: String, required: true },
    scheduledDate: { type: Date, required: true },
    actualDate: { type: Date },
    completedDate: { type: Date },
    inspectorType: { type: String, enum: INSPECTOR_TYPES },
    inspectorName: { type: String },
    inspectorOrg: { type: String },
    department: { type: String },
    areaCategory: { type: String, enum: AREA_CATEGORIES },
    overallResult: { type: String, enum: COMPLIANCE_LEVELS },
    score: { type: Number, min: 0, max: 100 },
    leaderId: { type: Schema.Types.ObjectId, ref: 'User' },
    reportUrl: { type: String },
    notes: { type: String },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
inspectionSchema.index({ type: 1, status: 1 });
inspectionSchema.index({ scheduledDate: 1 });

const inspectionItemSchema = new Schema(
  {
    inspectionId: { type: Schema.Types.ObjectId, ref: 'DDDInspection', required: true },
    standardRef: { type: String },
    checklistItem: { type: String, required: true },
    complianceLevel: { type: String, enum: COMPLIANCE_LEVELS },
    observation: { type: String },
    evidenceUrls: [{ type: String }],
    requiresAction: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);
inspectionItemSchema.index({ inspectionId: 1 });

const followUpActionSchema = new Schema(
  {
    inspectionId: { type: Schema.Types.ObjectId, ref: 'DDDInspection', required: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'DDDInspectionItem' },
    priority: { type: String, enum: FOLLOW_UP_PRIORITIES, default: 'medium' },
    description: { type: String, required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    dueDate: { type: Date },
    status: {
      type: String,
      enum: ['open', 'in_progress', 'completed', 'overdue', 'cancelled'],
      default: 'open',
    },
    completedDate: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    evidence: [{ type: String }],
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
followUpActionSchema.index({ inspectionId: 1, status: 1 });
followUpActionSchema.index({ dueDate: 1, status: 1 });

const inspectionScheduleSchema = new Schema(
  {
    templateCode: { type: String, required: true },
    title: { type: String, required: true },
    type: { type: String, enum: INSPECTION_TYPES },
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'semi_annual', 'annual'],
    },
    nextDueDate: { type: Date },
    department: { type: String },
    areaCategory: { type: String, enum: AREA_CATEGORIES },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    lastCompleted: { type: Date },
    metadata: { type: Schema.Types.Mixed, default: {} },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);
inspectionScheduleSchema.index({ isActive: 1, nextDueDate: 1 });

/* ═══════════════════ Models ═══════════════════ */
const DDDInspection =
  mongoose.models.DDDInspection || mongoose.model('DDDInspection', inspectionSchema);
const DDDInspectionItem =
  mongoose.models.DDDInspectionItem || mongoose.model('DDDInspectionItem', inspectionItemSchema);
const DDDFollowUpAction =
  mongoose.models.DDDFollowUpAction || mongoose.model('DDDFollowUpAction', followUpActionSchema);
const DDDInspectionSchedule =
  mongoose.models.DDDInspectionSchedule ||
  mongoose.model('DDDInspectionSchedule', inspectionScheduleSchema);

/* ═══════════════════ Domain Class ═══════════════════ */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  INSPECTION_TYPES,
  INSPECTION_STATUSES,
  INSPECTOR_TYPES,
  COMPLIANCE_LEVELS,
  AREA_CATEGORIES,
  FOLLOW_UP_PRIORITIES,
  BUILTIN_INSPECTION_TEMPLATES,
  DDDInspection,
  DDDInspectionItem,
  DDDFollowUpAction,
  DDDInspectionSchedule,
};
