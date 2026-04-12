'use strict';
/**
 * DddArchiveManager — Mongoose Models & Constants
 * Auto-extracted from services/dddArchiveManager.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const ARCHIVE_TYPES = [
  'clinical_archive',
  'administrative_archive',
  'financial_archive',
  'legal_archive',
  'research_archive',
  'hr_archive',
  'correspondence_archive',
  'media_archive',
  'audit_archive',
  'compliance_archive',
  'incident_archive',
  'general_archive',
];

const ARCHIVE_STATUSES = [
  'pending_archive',
  'archived',
  'on_hold',
  'pending_disposal',
  'disposed',
  'restored',
  'migration_pending',
  'migrated',
  'corrupted',
  'verified',
];

const RETENTION_CATEGORIES = [
  'clinical_records',
  'financial_records',
  'hr_records',
  'legal_compliance',
  'research_data',
  'incident_reports',
  'administrative',
  'correspondence',
  'audit_logs',
  'patient_consent',
];

const HOLD_TYPES = [
  'litigation_hold',
  'regulatory_hold',
  'investigation_hold',
  'audit_hold',
  'compliance_hold',
  'insurance_hold',
  'research_hold',
  'preservation_order',
  'tax_hold',
  'indefinite_hold',
];

const DISPOSAL_METHODS = [
  'secure_delete',
  'physical_shred',
  'degaussing',
  'incineration',
  'overwrite',
  'crypto_erase',
  'anonymization',
  'certified_destruction',
];

const ARCHIVE_PRIORITIES = ['critical', 'high', 'medium', 'low', 'routine', 'deferred'];

/* ── Built-in retention policies ────────────────────────────────────────── */
const BUILTIN_RETENTION_POLICIES = [
  {
    code: 'RPOL-CLINICAL',
    name: 'Clinical Records Retention',
    category: 'clinical_records',
    retentionYears: 10,
    disposalMethod: 'secure_delete',
  },
  {
    code: 'RPOL-FINANCIAL',
    name: 'Financial Records Retention',
    category: 'financial_records',
    retentionYears: 7,
    disposalMethod: 'secure_delete',
  },
  {
    code: 'RPOL-HR',
    name: 'HR Records Retention',
    category: 'hr_records',
    retentionYears: 7,
    disposalMethod: 'secure_delete',
  },
  {
    code: 'RPOL-LEGAL',
    name: 'Legal Compliance Retention',
    category: 'legal_compliance',
    retentionYears: 25,
    disposalMethod: 'certified_destruction',
  },
  {
    code: 'RPOL-RESEARCH',
    name: 'Research Data Retention',
    category: 'research_data',
    retentionYears: 15,
    disposalMethod: 'anonymization',
  },
  {
    code: 'RPOL-INCIDENT',
    name: 'Incident Reports Retention',
    category: 'incident_reports',
    retentionYears: 25,
    disposalMethod: 'certified_destruction',
  },
  {
    code: 'RPOL-ADMIN',
    name: 'Administrative Retention',
    category: 'administrative',
    retentionYears: 5,
    disposalMethod: 'secure_delete',
  },
  {
    code: 'RPOL-CORRESPOND',
    name: 'Correspondence Retention',
    category: 'correspondence',
    retentionYears: 3,
    disposalMethod: 'secure_delete',
  },
  {
    code: 'RPOL-AUDIT',
    name: 'Audit Logs Retention',
    category: 'audit_logs',
    retentionYears: 10,
    disposalMethod: 'secure_delete',
  },
  {
    code: 'RPOL-CONSENT',
    name: 'Patient Consent Retention',
    category: 'patient_consent',
    retentionYears: 25,
    disposalMethod: 'certified_destruction',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Archive Record ────────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const archiveRecordSchema = new Schema(
  {
    archiveCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: ARCHIVE_TYPES, required: true },
    status: { type: String, enum: ARCHIVE_STATUSES, default: 'pending_archive' },
    priority: { type: String, enum: ARCHIVE_PRIORITIES, default: 'routine' },
    sourceDocumentId: { type: Schema.Types.ObjectId },
    sourceDocumentType: { type: String },
    originalPath: { type: String },
    archivePath: { type: String },
    fileSize: { type: Number, default: 0 },
    checksum: { type: String },
    retentionPolicyId: { type: Schema.Types.ObjectId, ref: 'DDDRetentionPolicy' },
    retainUntil: { type: Date },
    archivedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    archivedAt: { type: Date },
    legalHoldId: { type: Schema.Types.ObjectId, ref: 'DDDLegalHold' },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

archiveRecordSchema.index({ type: 1, status: 1 });
archiveRecordSchema.index({ retainUntil: 1 });
archiveRecordSchema.index({ legalHoldId: 1 });

const DDDArchiveRecord =
  mongoose.models.DDDArchiveRecord || mongoose.model('DDDArchiveRecord', archiveRecordSchema);

/* ── Retention Policy ──────────────────────────────────────────────────── */
const retentionPolicySchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    category: { type: String, enum: RETENTION_CATEGORIES, required: true },
    retentionYears: { type: Number, required: true },
    disposalMethod: { type: String, enum: DISPOSAL_METHODS, default: 'secure_delete' },
    requiresApproval: { type: Boolean, default: true },
    autoArchive: { type: Boolean, default: false },
    notifyBefore: { type: Number, default: 90 },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDRetentionPolicy =
  mongoose.models.DDDRetentionPolicy || mongoose.model('DDDRetentionPolicy', retentionPolicySchema);

/* ── Legal Hold ────────────────────────────────────────────────────────── */
const legalHoldSchema = new Schema(
  {
    holdCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    type: { type: String, enum: HOLD_TYPES, required: true },
    reason: { type: String, required: true },
    caseReference: { type: String },
    issuedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    affectedRecords: [{ type: Schema.Types.ObjectId, ref: 'DDDArchiveRecord' }],
    releasedAt: { type: Date },
    releasedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    releaseReason: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

legalHoldSchema.index({ type: 1, isActive: 1 });

const DDDLegalHold =
  mongoose.models.DDDLegalHold || mongoose.model('DDDLegalHold', legalHoldSchema);

/* ── Disposal Request ──────────────────────────────────────────────────── */
const disposalRequestSchema = new Schema(
  {
    disposalCode: { type: String, required: true, unique: true },
    archiveIds: [{ type: Schema.Types.ObjectId, ref: 'DDDArchiveRecord' }],
    method: { type: String, enum: DISPOSAL_METHODS, required: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'in_progress', 'completed', 'failed'],
      default: 'pending',
    },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    completedAt: { type: Date },
    certificate: { type: String },
    totalRecords: { type: Number, default: 0 },
    totalSize: { type: Number, default: 0 },
    reason: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

disposalRequestSchema.index({ status: 1, createdAt: -1 });

const DDDDisposalRequest =
  mongoose.models.DDDDisposalRequest || mongoose.model('DDDDisposalRequest', disposalRequestSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  ARCHIVE_TYPES,
  ARCHIVE_STATUSES,
  RETENTION_CATEGORIES,
  HOLD_TYPES,
  DISPOSAL_METHODS,
  ARCHIVE_PRIORITIES,
  BUILTIN_RETENTION_POLICIES,
  DDDArchiveRecord,
  DDDRetentionPolicy,
  DDDLegalHold,
  DDDDisposalRequest,
};
