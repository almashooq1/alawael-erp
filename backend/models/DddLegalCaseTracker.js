'use strict';
/**
 * DddLegalCaseTracker — Mongoose Models & Constants
 * Auto-extracted from services/dddLegalCaseTracker.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const CASE_TYPES = [
  'litigation',
  'arbitration',
  'mediation',
  'regulatory_action',
  'employment_dispute',
  'malpractice',
  'contract_dispute',
  'insurance_claim',
  'intellectual_property',
  'compliance_violation',
  'patient_complaint',
  'administrative',
];

const CASE_STATUSES = [
  'open',
  'under_review',
  'investigation',
  'pre_litigation',
  'active_litigation',
  'discovery',
  'trial',
  'appeal',
  'settled',
  'closed',
  'dismissed',
  'archived',
];

const CASE_PRIORITIES = [
  'critical',
  'high',
  'medium',
  'low',
  'routine',
  'urgent',
  'emergency',
  'deferred',
  'monitoring',
  'escalated',
];

const DOCUMENT_TYPES = [
  'filing',
  'motion',
  'brief',
  'evidence',
  'correspondence',
  'contract',
  'opinion',
  'order',
  'settlement',
  'deposition',
  'affidavit',
  'subpoena',
];

const PARTY_ROLES = [
  'plaintiff',
  'defendant',
  'witness',
  'expert_witness',
  'counsel',
  'judge',
  'mediator',
  'arbitrator',
  'co_defendant',
  'third_party',
  'intervenor',
  'amicus',
];

const MILESTONE_TYPES = [
  'filing_deadline',
  'hearing_date',
  'trial_date',
  'deposition',
  'discovery_deadline',
  'motion_deadline',
  'settlement_conference',
  'appeal_deadline',
  'mediation_date',
  'status_conference',
];

const BUILTIN_CASE_CATEGORIES = [
  {
    code: 'CAT-MED',
    name: 'Medical Malpractice',
    nameAr: 'سوء الممارسة الطبية',
    riskLevel: 'high',
  },
  { code: 'CAT-EMP', name: 'Employment Law', nameAr: 'قانون العمل', riskLevel: 'medium' },
  { code: 'CAT-CTR', name: 'Contract Disputes', nameAr: 'نزاعات العقود', riskLevel: 'medium' },
  {
    code: 'CAT-REG',
    name: 'Regulatory Compliance',
    nameAr: 'الامتثال التنظيمي',
    riskLevel: 'high',
  },
  { code: 'CAT-INS', name: 'Insurance Claims', nameAr: 'مطالبات التأمين', riskLevel: 'medium' },
  { code: 'CAT-PTN', name: 'Patient Rights', nameAr: 'حقوق المرضى', riskLevel: 'high' },
  { code: 'CAT-IPR', name: 'Intellectual Property', nameAr: 'الملكية الفكرية', riskLevel: 'low' },
  { code: 'CAT-ADM', name: 'Administrative Actions', nameAr: 'إجراءات إدارية', riskLevel: 'low' },
  { code: 'CAT-PRV', name: 'Privacy & Data', nameAr: 'الخصوصية والبيانات', riskLevel: 'high' },
  { code: 'CAT-ENV', name: 'Environmental', nameAr: 'البيئة', riskLevel: 'medium' },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Schemas ═══════════════════ */

const legalCaseSchema = new Schema(
  {
    caseCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    titleAr: { type: String },
    type: { type: String, enum: CASE_TYPES, required: true },
    status: { type: String, enum: CASE_STATUSES, default: 'open' },
    priority: { type: String, enum: CASE_PRIORITIES, default: 'medium' },
    description: { type: String },
    caseNumber: { type: String },
    court: { type: String },
    jurisdiction: { type: String },
    filingDate: { type: Date },
    closedDate: { type: Date },
    estimatedValue: { type: Number },
    actualValue: { type: Number },
    assignedCounselId: { type: Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

legalCaseSchema.index({ type: 1, status: 1 });
legalCaseSchema.index({ priority: 1 });

const DDDLegalCase =
  mongoose.models.DDDLegalCase || mongoose.model('DDDLegalCase', legalCaseSchema);

const legalDocumentSchema = new Schema(
  {
    documentCode: { type: String, required: true, unique: true },
    caseId: { type: Schema.Types.ObjectId, ref: 'DDDLegalCase', required: true },
    type: { type: String, enum: DOCUMENT_TYPES, required: true },
    title: { type: String, required: true },
    fileUrl: { type: String },
    filedDate: { type: Date, default: Date.now },
    filedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    isConfidential: { type: Boolean, default: false },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

legalDocumentSchema.index({ caseId: 1 });

const DDDLegalDocument =
  mongoose.models.DDDLegalDocument || mongoose.model('DDDLegalDocument', legalDocumentSchema);

const legalPartySchema = new Schema(
  {
    caseId: { type: Schema.Types.ObjectId, ref: 'DDDLegalCase', required: true },
    name: { type: String, required: true },
    role: { type: String, enum: PARTY_ROLES, required: true },
    organization: { type: String },
    email: { type: String },
    phone: { type: String },
    counselName: { type: String },
    isInternal: { type: Boolean, default: false },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

legalPartySchema.index({ caseId: 1 });

const DDDLegalParty =
  mongoose.models.DDDLegalParty || mongoose.model('DDDLegalParty', legalPartySchema);

const legalMilestoneSchema = new Schema(
  {
    milestoneCode: { type: String, required: true, unique: true },
    caseId: { type: Schema.Types.ObjectId, ref: 'DDDLegalCase', required: true },
    type: { type: String, enum: MILESTONE_TYPES, required: true },
    title: { type: String, required: true },
    dueDate: { type: Date, required: true },
    completedDate: { type: Date },
    isCompleted: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

legalMilestoneSchema.index({ caseId: 1, dueDate: 1 });

const DDDLegalMilestone =
  mongoose.models.DDDLegalMilestone || mongoose.model('DDDLegalMilestone', legalMilestoneSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  CASE_TYPES,
  CASE_STATUSES,
  CASE_PRIORITIES,
  DOCUMENT_TYPES,
  PARTY_ROLES,
  MILESTONE_TYPES,
  BUILTIN_CASE_CATEGORIES,
  DDDLegalCase,
  DDDLegalDocument,
  DDDLegalParty,
  DDDLegalMilestone,
};
