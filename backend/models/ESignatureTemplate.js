/* eslint-disable no-unused-vars */
/**
 * E-Signature Template Model
 * نموذج قوالب التوقيع الإلكتروني
 */
const mongoose = require('mongoose');

/* ─── Template Field Schema ──────────────────────────────────────────────── */
const templateFieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  label_ar: { type: String, required: true },
  label_en: String,
  type: {
    type: String,
    enum: ['text', 'date', 'number', 'select', 'textarea', 'signature', 'initials'],
    default: 'text',
  },
  required: { type: Boolean, default: false },
  placeholder: String,
  options: [String], // for select type
  position: { x: Number, y: Number, page: Number },
  width: Number,
  height: Number,
  order: { type: Number, default: 0 },
});

/* ─── Default Signer Schema ─────────────────────────────────────────────── */
const defaultSignerSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['signer', 'approver', 'witness', 'reviewer', 'cc'],
    default: 'signer',
  },
  title_ar: { type: String, required: true },
  title_en: String,
  order: { type: Number, default: 1 },
  required: { type: Boolean, default: true },
  defaultDepartment: String,
});

/* ─── E-Signature Template Schema ────────────────────────────────────────── */
const eSignatureTemplateSchema = new mongoose.Schema(
  {
    templateCode: {
      type: String,
      required: true,
      unique: true,
    },
    name_ar: { type: String, required: true, minlength: 3, maxlength: 200 },
    name_en: String,
    description_ar: String,
    description_en: String,

    category: {
      type: String,
      enum: [
        'contracts', // العقود
        'agreements', // الاتفاقيات
        'approvals', // الموافقات
        'memos', // المذكرات
        'policies', // السياسات
        'authorizations', // التفويضات
        'financial', // المالية
        'hr', // الموارد البشرية
        'medical', // الطبية
        'legal', // القانونية
        'other',
      ],
      required: true,
    },

    // Document template
    documentBody_ar: { type: String, maxlength: 50000 },
    documentBody_en: String,
    headerHtml: String,
    footerHtml: String,

    // Fields & signers
    fields: [templateFieldSchema],
    defaultSigners: [defaultSignerSchema],

    // Workflow settings
    workflow: {
      sequential: { type: Boolean, default: true },
      requireAllSigners: { type: Boolean, default: true },
      allowDelegation: { type: Boolean, default: false },
      autoReminder: { type: Boolean, default: true },
      reminderIntervalHours: { type: Number, default: 48 },
      expiryDays: { type: Number, default: 30 },
      allowRejection: { type: Boolean, default: true },
      requireRejectionReason: { type: Boolean, default: true },
    },

    // Security
    security: {
      requireOTP: { type: Boolean, default: false },
      requireNationalId: { type: Boolean, default: false },
      requireBiometric: { type: Boolean, default: false },
      ipWhitelist: [String],
    },

    // Status
    isActive: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    usageCount: { type: Number, default: 0 },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

eSignatureTemplateSchema.index({ category: 1, isActive: 1 });

module.exports =
  mongoose.models.ESignatureTemplate ||
  mongoose.model('ESignatureTemplate', eSignatureTemplateSchema);
