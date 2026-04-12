'use strict';
/**
 * DddRegulatoryTracker — Mongoose Models & Constants
 * Auto-extracted from services/dddRegulatoryTracker.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const REQUIREMENT_TYPES = [
  'statutory',
  'regulatory',
  'accreditation',
  'licensing',
  'industry_standard',
  'contractual',
  'internal_policy',
  'international',
  'local_ordinance',
  'professional_standard',
  'environmental',
  'safety',
];

const REQUIREMENT_STATUSES = [
  'identified',
  'assessed',
  'compliant',
  'non_compliant',
  'partially_compliant',
  'under_remediation',
  'waived',
  'expired',
  'pending_review',
  'archived',
];

const AUDIT_TYPES = [
  'internal',
  'external',
  'regulatory',
  'accreditation',
  'surprise',
  'routine',
  'follow_up',
  'pre_certification',
  'surveillance',
  'special_purpose',
  'mock_survey',
  'peer_review',
];

const AUDIT_STATUSES = [
  'planned',
  'scheduled',
  'in_progress',
  'fieldwork',
  'reporting',
  'completed',
  'follow_up',
  'closed',
  'cancelled',
  'deferred',
];

const CERTIFICATION_TYPES = [
  'jci',
  'cbahi',
  'iso_9001',
  'iso_27001',
  'iso_45001',
  'carf',
  'cap',
  'himss_emram',
  'medical_license',
  'facility_license',
  'professional_license',
  'specialty_accreditation',
];

const CERTIFICATION_STATUSES = [
  'applied',
  'under_review',
  'site_visit_scheduled',
  'approved',
  'active',
  'conditional',
  'expired',
  'revoked',
  'renewal_pending',
  'suspended',
];

const CHANGE_IMPACT_LEVELS = [
  'critical',
  'high',
  'medium',
  'low',
  'negligible',
  'positive',
  'neutral',
  'unknown',
  'requires_assessment',
  'under_review',
];

const REGULATORY_BODIES = [
  'moh',
  'sfda',
  'cbahi',
  'jci',
  'iso',
  'osha',
  'hipaa',
  'gdpr',
  'nca',
  'carf',
  'who',
  'local_municipality',
];

const BUILTIN_REQUIREMENTS = [
  {
    code: 'REQ-CBAHI',
    name: 'CBAHI Accreditation Standards',
    nameAr: 'معايير اعتماد سباهي',
    type: 'accreditation',
    body: 'cbahi',
  },
  {
    code: 'REQ-MOH',
    name: 'MOH Licensing Requirements',
    nameAr: 'متطلبات ترخيص وزارة الصحة',
    type: 'licensing',
    body: 'moh',
  },
  {
    code: 'REQ-SFDA',
    name: 'SFDA Medical Device Regulations',
    nameAr: 'أنظمة هيئة الغذاء والدواء',
    type: 'regulatory',
    body: 'sfda',
  },
  {
    code: 'REQ-ISO9',
    name: 'ISO 9001 Quality Management',
    nameAr: 'نظام إدارة الجودة ISO 9001',
    type: 'industry_standard',
    body: 'iso',
  },
  {
    code: 'REQ-ISO27',
    name: 'ISO 27001 Information Security',
    nameAr: 'أمن المعلومات ISO 27001',
    type: 'industry_standard',
    body: 'iso',
  },
  {
    code: 'REQ-PRIV',
    name: 'Data Privacy & Protection',
    nameAr: 'حماية البيانات والخصوصية',
    type: 'statutory',
    body: 'nca',
  },
  {
    code: 'REQ-FIRE',
    name: 'Fire Safety Compliance',
    nameAr: 'الامتثال لمتطلبات السلامة من الحريق',
    type: 'safety',
    body: 'local_municipality',
  },
  {
    code: 'REQ-WASTE',
    name: 'Medical Waste Management',
    nameAr: 'إدارة النفايات الطبية',
    type: 'environmental',
    body: 'moh',
  },
  {
    code: 'REQ-PROF',
    name: 'Professional Staff Licensing',
    nameAr: 'ترخيص الكادر المهني',
    type: 'professional_standard',
    body: 'moh',
  },
  {
    code: 'REQ-EMER',
    name: 'Emergency Preparedness Standards',
    nameAr: 'معايير الاستعداد للطوارئ',
    type: 'accreditation',
    body: 'cbahi',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Schemas ═══════════════════ */

const regulatoryRequirementSchema = new Schema(
  {
    requirementCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: REQUIREMENT_TYPES, required: true },
    status: { type: String, enum: REQUIREMENT_STATUSES, default: 'identified' },
    regulatoryBody: { type: String, enum: REGULATORY_BODIES },
    description: { type: String },
    reference: { type: String },
    effectiveDate: { type: Date },
    complianceDeadline: { type: Date },
    lastAssessedDate: { type: Date },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    tags: [{ type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

regulatoryRequirementSchema.index({ type: 1, status: 1 });
regulatoryRequirementSchema.index({ regulatoryBody: 1 });

const DDDRegulatoryRequirement =
  mongoose.models.DDDRegulatoryRequirement ||
  mongoose.model('DDDRegulatoryRequirement', regulatoryRequirementSchema);

const complianceAuditSchema = new Schema(
  {
    auditCode: { type: String, required: true, unique: true },
    type: { type: String, enum: AUDIT_TYPES, required: true },
    status: { type: String, enum: AUDIT_STATUSES, default: 'planned' },
    title: { type: String, required: true },
    scope: { type: String },
    leadAuditorId: { type: Schema.Types.ObjectId, ref: 'User' },
    scheduledDate: { type: Date },
    startDate: { type: Date },
    endDate: { type: Date },
    findings: [{ description: String, severity: String, status: String }],
    score: { type: Number },
    reportUrl: { type: String },
    requirementIds: [{ type: Schema.Types.ObjectId, ref: 'DDDRegulatoryRequirement' }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

complianceAuditSchema.index({ type: 1, status: 1 });

const DDDComplianceAudit =
  mongoose.models.DDDComplianceAudit || mongoose.model('DDDComplianceAudit', complianceAuditSchema);

const certificationSchema = new Schema(
  {
    certificationCode: { type: String, required: true, unique: true },
    type: { type: String, enum: CERTIFICATION_TYPES, required: true },
    status: { type: String, enum: CERTIFICATION_STATUSES, default: 'applied' },
    name: { type: String, required: true },
    issuedBy: { type: String },
    issuedDate: { type: Date },
    expiryDate: { type: Date },
    renewalDate: { type: Date },
    certificateUrl: { type: String },
    scope: { type: String },
    conditions: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

certificationSchema.index({ type: 1, status: 1 });
certificationSchema.index({ expiryDate: 1 });

const DDDCertification =
  mongoose.models.DDDCertification || mongoose.model('DDDCertification', certificationSchema);

const regulatoryChangeSchema = new Schema(
  {
    changeCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    regulatoryBody: { type: String, enum: REGULATORY_BODIES },
    impactLevel: { type: String, enum: CHANGE_IMPACT_LEVELS, default: 'medium' },
    description: { type: String },
    effectiveDate: { type: Date },
    identifiedDate: { type: Date, default: Date.now },
    assessmentComplete: { type: Boolean, default: false },
    actionRequired: { type: Boolean, default: true },
    assigneeId: { type: Schema.Types.ObjectId, ref: 'User' },
    relatedRequirementIds: [{ type: Schema.Types.ObjectId, ref: 'DDDRegulatoryRequirement' }],
    notes: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

regulatoryChangeSchema.index({ impactLevel: 1 });
regulatoryChangeSchema.index({ regulatoryBody: 1 });

const DDDRegulatoryChange =
  mongoose.models.DDDRegulatoryChange ||
  mongoose.model('DDDRegulatoryChange', regulatoryChangeSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  REQUIREMENT_TYPES,
  REQUIREMENT_STATUSES,
  AUDIT_TYPES,
  AUDIT_STATUSES,
  CERTIFICATION_TYPES,
  CERTIFICATION_STATUSES,
  CHANGE_IMPACT_LEVELS,
  REGULATORY_BODIES,
  BUILTIN_REQUIREMENTS,
  DDDRegulatoryRequirement,
  DDDComplianceAudit,
  DDDCertification,
  DDDRegulatoryChange,
};
