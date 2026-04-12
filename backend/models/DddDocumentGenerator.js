'use strict';
/**
 * DddDocumentGenerator Model
 * Auto-extracted from services/dddDocumentGenerator.js
 * Schemas, constants, and Mongoose model registrations.
 */
const mongoose = require('mongoose');

const DOCUMENT_TYPES = [
  'clinical_report',
  'progress_report',
  'discharge_summary',
  'assessment_report',
  'treatment_plan',
  'referral_letter',
  'certificate',
  'invoice',
  'receipt',
  'consent_document',
  'family_report',
  'quality_report',
  'custom',
];

const OUTPUT_FORMATS = ['pdf', 'html', 'docx', 'xlsx', 'csv', 'json'];

const TEMPLATE_ENGINES = ['handlebars', 'mustache', 'ejs', 'html_native'];

const PLACEHOLDER_CATEGORIES = [
  'beneficiary',
  'episode',
  'therapist',
  'facility',
  'session',
  'assessment',
  'dates',
  'scores',
  'custom',
];

const BUILTIN_DOC_TEMPLATES = [
  {
    code: 'DOC-PROGRESS-MONTHLY',
    name: 'Monthly Progress Report',
    nameAr: 'تقرير التقدم الشهري',
    type: 'progress_report',
    format: 'pdf',
  },
  {
    code: 'DOC-DISCHARGE',
    name: 'Discharge Summary',
    nameAr: 'ملخص الخروج',
    type: 'discharge_summary',
    format: 'pdf',
  },
  {
    code: 'DOC-ASSESS-INIT',
    name: 'Initial Assessment Report',
    nameAr: 'تقرير التقييم الأولي',
    type: 'assessment_report',
    format: 'pdf',
  },
  {
    code: 'DOC-TREAT-PLAN',
    name: 'Treatment Plan Document',
    nameAr: 'وثيقة خطة العلاج',
    type: 'treatment_plan',
    format: 'pdf',
  },
  {
    code: 'DOC-REFERRAL',
    name: 'Referral Letter',
    nameAr: 'خطاب الإحالة',
    type: 'referral_letter',
    format: 'pdf',
  },
  {
    code: 'DOC-CERT-ATTEND',
    name: 'Attendance Certificate',
    nameAr: 'شهادة حضور',
    type: 'certificate',
    format: 'pdf',
  },
  {
    code: 'DOC-INVOICE',
    name: 'Service Invoice',
    nameAr: 'فاتورة الخدمة',
    type: 'invoice',
    format: 'pdf',
  },
  {
    code: 'DOC-CONSENT',
    name: 'Treatment Consent',
    nameAr: 'وثيقة الموافقة',
    type: 'consent_document',
    format: 'pdf',
  },
  {
    code: 'DOC-FAMILY',
    name: 'Family Progress Report',
    nameAr: 'تقرير التقدم للأسرة',
    type: 'family_report',
    format: 'pdf',
  },
  {
    code: 'DOC-QUALITY-Q',
    name: 'Quarterly Quality Report',
    nameAr: 'تقرير الجودة الربعي',
    type: 'quality_report',
    format: 'pdf',
  },
  {
    code: 'DOC-SESSIONS-CSV',
    name: 'Sessions Export',
    nameAr: 'تصدير الجلسات',
    type: 'custom',
    format: 'csv',
  },
  {
    code: 'DOC-DATA-XLSX',
    name: 'Data Export Sheet',
    nameAr: 'ورقة تصدير البيانات',
    type: 'custom',
    format: 'xlsx',
  },
];

/* ══════════════════════════════════════════════════════════════
   2) SCHEMAS
   ══════════════════════════════════════════════════════════════ */

/* ── Document Template Schema ── */

const documentTemplateSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    type: { type: String, enum: DOCUMENT_TYPES, required: true, index: true },
    format: { type: String, enum: OUTPUT_FORMATS, default: 'pdf' },
    engine: { type: String, enum: TEMPLATE_ENGINES, default: 'handlebars' },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'published', 'deprecated'],
      default: 'draft',
      index: true,
    },

    /* Template Content */
    headerHtml: String,
    bodyHtml: { type: String, required: true },
    footerHtml: String,
    stylesCss: String,

    /* Layout */
    pageSize: { type: String, enum: ['A4', 'A3', 'letter', 'legal'], default: 'A4' },
    orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
    margins: {
      top: { type: Number, default: 20 },
      right: { type: Number, default: 15 },
      bottom: { type: Number, default: 20 },
      left: { type: Number, default: 15 },
    },

    /* Placeholders */
    placeholders: [
      {
        key: { type: String, required: true },
        label: String,
        labelAr: String,
        category: { type: String, enum: PLACEHOLDER_CATEGORIES },
        dataPath: String, // e.g., 'beneficiary.name'
        format: String, // e.g., 'date:YYYY-MM-DD'
        defaultValue: String,
      },
    ],

    /* Branding */
    logoUrl: String,
    brandColor: String,
    facilityName: String,
    facilityNameAr: String,

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags: [String],
    isActive: { type: Boolean, default: true, index: true },
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDDocumentTemplate =
  mongoose.models.DDDDocumentTemplate || mongoose.model('DDDDocumentTemplate', documentTemplateSchema);

/* ── Generated Document Schema ── */
const generatedDocumentSchema = new mongoose.Schema(
  {
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DDDDocumentTemplate',
      required: true,
      index: true,
    },
    templateCode: { type: String, index: true },
    code: { type: String, unique: true, sparse: true, index: true },
    title: { type: String, required: true },
    titleAr: String,
    type: { type: String, enum: DOCUMENT_TYPES, index: true },
    format: { type: String, enum: OUTPUT_FORMATS },

    /* Context */
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
    episodeId: { type: mongoose.Schema.Types.ObjectId },
    sessionId: { type: mongoose.Schema.Types.ObjectId },

    /* Content */
    renderedHtml: String,
    fileUrl: String,
    fileSize: Number,
    pageCount: Number,

    /* Data snapshot */
    dataSnapshot: { type: Map, of: mongoose.Schema.Types.Mixed },

    /* Status */
    status: {
      type: String,
      enum: ['generating', 'ready', 'error', 'archived'],
      default: 'generating',
      index: true,
    },
    errorMessage: String,
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    generatedAt: { type: Date, default: Date.now, index: true },

    /* Distribution */
    sentTo: [
      {
        recipientType: { type: String, enum: ['email', 'sms', 'portal', 'print'] },
        recipient: String,
        sentAt: Date,
        status: { type: String, enum: ['pending', 'sent', 'failed'] },
      },
    ],

    metadata: mongoose.Schema.Types.Mixed,
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDGeneratedDocument =
  mongoose.models.DDDGeneratedDocument || mongoose.model('DDDGeneratedDocument', generatedDocumentSchema);

/* ══════════════════════════════════════════════════════════════
   3) DOMAIN SERVICE
   ══════════════════════════════════════════════════════════════ */

module.exports = {
  DOCUMENT_TYPES,
  OUTPUT_FORMATS,
  TEMPLATE_ENGINES,
  PLACEHOLDER_CATEGORIES,
  BUILTIN_DOC_TEMPLATES,
};
