'use strict';
/**
 * DddRecordManager — Mongoose Models & Constants
 * Auto-extracted from services/dddRecordManager.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const RECORD_TYPES = [
  'clinical_note',
  'assessment_record',
  'treatment_plan',
  'session_record',
  'referral_record',
  'discharge_record',
  'lab_record',
  'imaging_record',
  'medication_record',
  'incident_report',
  'consent_record',
  'administrative_record',
];

const RECORD_STATUSES = [
  'active',
  'finalized',
  'amended',
  'appended',
  'archived',
  'locked',
  'pending_review',
  'reviewed',
  'expired',
  'voided',
];

const RETENTION_PERIODS = [
  '30_days',
  '90_days',
  '6_months',
  '1_year',
  '3_years',
  '5_years',
  '7_years',
  '10_years',
  '25_years',
  'permanent',
];

const RECORD_SOURCES = [
  'manual_entry',
  'imported',
  'scanned',
  'ehr_sync',
  'lab_interface',
  'radiology_interface',
  'pharmacy_interface',
  'device_upload',
  'patient_portal',
  'mobile_app',
  'api_integration',
  'batch_import',
];

const AUDIT_ACTION_TYPES = [
  'created',
  'viewed',
  'updated',
  'deleted',
  'exported',
  'printed',
  'shared',
  'locked',
  'amended',
  'restored',
];

const SENSITIVITY_LEVELS = [
  'normal',
  'sensitive',
  'highly_sensitive',
  'restricted',
  'confidential',
  'legal_protected',
];

/* ── Built-in record categories ─────────────────────────────────────────── */
const BUILTIN_RECORD_CATEGORIES = [
  {
    code: 'RCAT-CLINICAL',
    name: 'Clinical Records',
    nameAr: 'السجلات السريرية',
    retentionDefault: '10_years',
  },
  {
    code: 'RCAT-THERAPY',
    name: 'Therapy Records',
    nameAr: 'سجلات العلاج',
    retentionDefault: '7_years',
  },
  { code: 'RCAT-ASSESS', name: 'Assessments', nameAr: 'التقييمات', retentionDefault: '7_years' },
  { code: 'RCAT-ADMIN', name: 'Administrative', nameAr: 'إداري', retentionDefault: '5_years' },
  {
    code: 'RCAT-CONSENT',
    name: 'Consent Forms',
    nameAr: 'نماذج الموافقة',
    retentionDefault: '25_years',
  },
  { code: 'RCAT-LAB', name: 'Lab Results', nameAr: 'نتائج المختبر', retentionDefault: '10_years' },
  { code: 'RCAT-IMAGING', name: 'Imaging', nameAr: 'التصوير', retentionDefault: '10_years' },
  {
    code: 'RCAT-INCIDENT',
    name: 'Incident Reports',
    nameAr: 'تقارير الحوادث',
    retentionDefault: 'permanent',
  },
  { code: 'RCAT-REFERRAL', name: 'Referrals', nameAr: 'الإحالات', retentionDefault: '5_years' },
  {
    code: 'RCAT-LEGAL',
    name: 'Legal Documents',
    nameAr: 'الوثائق القانونية',
    retentionDefault: 'permanent',
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Clinical Record ───────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const clinicalRecordSchema = new Schema(
  {
    recordCode: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    type: { type: String, enum: RECORD_TYPES, required: true },
    status: { type: String, enum: RECORD_STATUSES, default: 'active' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'DDDRecordCategory' },
    beneficiaryId: { type: Schema.Types.ObjectId, ref: 'Beneficiary' },
    episodeId: { type: Schema.Types.ObjectId },
    content: { type: String },
    structuredData: { type: Map, of: Schema.Types.Mixed },
    source: { type: String, enum: RECORD_SOURCES, default: 'manual_entry' },
    sensitivity: { type: String, enum: SENSITIVITY_LEVELS, default: 'normal' },
    attachmentIds: [{ type: Schema.Types.ObjectId }],
    version: { type: Number, default: 1 },
    amendments: [
      {
        version: Number,
        content: String,
        amendedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        amendedAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    lockedAt: { type: Date },
    lockedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    retentionDate: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

clinicalRecordSchema.index({ beneficiaryId: 1, type: 1 });
clinicalRecordSchema.index({ status: 1, createdAt: -1 });
clinicalRecordSchema.index({ categoryId: 1 });

const DDDClinicalRecord =
  mongoose.models.DDDClinicalRecord || mongoose.model('DDDClinicalRecord', clinicalRecordSchema);

/* ── Record Category ───────────────────────────────────────────────────── */
const recordCategorySchema = new Schema(
  {
    code: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    parentId: { type: Schema.Types.ObjectId, ref: 'DDDRecordCategory', default: null },
    retentionDefault: { type: String, enum: RETENTION_PERIODS },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDRecordCategory =
  mongoose.models.DDDRecordCategory || mongoose.model('DDDRecordCategory', recordCategorySchema);

/* ── Record Retention ──────────────────────────────────────────────────── */
const recordRetentionSchema = new Schema(
  {
    retentionCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'DDDRecordCategory' },
    period: { type: String, enum: RETENTION_PERIODS, required: true },
    action: {
      type: String,
      enum: ['archive', 'delete', 'review', 'anonymize'],
      default: 'archive',
    },
    isAutomatic: { type: Boolean, default: false },
    notifyBefore: { type: Number, default: 30 },
    isActive: { type: Boolean, default: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const DDDRecordRetention =
  mongoose.models.DDDRecordRetention || mongoose.model('DDDRecordRetention', recordRetentionSchema);

/* ── Record Audit Log ──────────────────────────────────────────────────── */
const recordAuditLogSchema = new Schema(
  {
    recordId: { type: Schema.Types.ObjectId, ref: 'DDDClinicalRecord', required: true },
    action: { type: String, enum: AUDIT_ACTION_TYPES, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    previousData: { type: Map, of: Schema.Types.Mixed },
    newData: { type: Map, of: Schema.Types.Mixed },
    reason: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

recordAuditLogSchema.index({ recordId: 1, createdAt: -1 });
recordAuditLogSchema.index({ userId: 1, action: 1 });

const DDDRecordAuditLog =
  mongoose.models.DDDRecordAuditLog || mongoose.model('DDDRecordAuditLog', recordAuditLogSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  RECORD_TYPES,
  RECORD_STATUSES,
  RETENTION_PERIODS,
  RECORD_SOURCES,
  AUDIT_ACTION_TYPES,
  SENSITIVITY_LEVELS,
  BUILTIN_RECORD_CATEGORIES,
  DDDClinicalRecord,
  DDDRecordCategory,
  DDDRecordRetention,
  DDDRecordAuditLog,
};
