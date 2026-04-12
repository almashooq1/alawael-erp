'use strict';
/**
 * DddFormBuilder Model
 * Auto-extracted from services/dddFormBuilder.js
 * Schemas, constants, and Mongoose model registrations.
 */
const mongoose = require('mongoose');

const FIELD_TYPES = [
  'text',
  'textarea',
  'number',
  'date',
  'datetime',
  'select',
  'multiselect',
  'radio',
  'checkbox',
  'toggle',
  'slider',
  'rating',
  'file_upload',
  'signature',
  'rich_text',
  'likert_scale',
  'matrix',
  'repeater',
  'section_header',
  'calculated',
];

const FORM_CATEGORIES = [
  'clinical_assessment',
  'intake_form',
  'consent_form',
  'progress_note',
  'discharge_summary',
  'family_feedback',
  'quality_checklist',
  'incident_report',
  'referral_form',
  'satisfaction_survey',
  'custom',
];

const VALIDATION_RULES = [
  'required',
  'min_length',
  'max_length',
  'min_value',
  'max_value',
  'pattern',
  'email',
  'phone',
  'url',
  'date_range',
  'custom_function',
];

const BUILTIN_FORM_TEMPLATES = [
  {
    code: 'FORM-INTAKE',
    name: 'Beneficiary Intake Form',
    nameAr: 'نموذج استقبال المستفيد',
    category: 'intake_form',
    fieldsCount: 25,
  },
  {
    code: 'FORM-CONSENT',
    name: 'Treatment Consent',
    nameAr: 'موافقة على العلاج',
    category: 'consent_form',
    fieldsCount: 12,
  },
  {
    code: 'FORM-PROGRESS',
    name: 'Session Progress Note',
    nameAr: 'ملاحظة تقدم الجلسة',
    category: 'progress_note',
    fieldsCount: 18,
  },
  {
    code: 'FORM-DISCHARGE',
    name: 'Discharge Summary',
    nameAr: 'ملخص الخروج',
    category: 'discharge_summary',
    fieldsCount: 20,
  },
  {
    code: 'FORM-FEEDBACK',
    name: 'Family Feedback Survey',
    nameAr: 'استبيان رأي الأسرة',
    category: 'family_feedback',
    fieldsCount: 15,
  },
  {
    code: 'FORM-QUALITY',
    name: 'Quality Audit Checklist',
    nameAr: 'قائمة تدقيق الجودة',
    category: 'quality_checklist',
    fieldsCount: 30,
  },
  {
    code: 'FORM-INCIDENT',
    name: 'Incident Report',
    nameAr: 'تقرير الحادث',
    category: 'incident_report',
    fieldsCount: 16,
  },
  {
    code: 'FORM-REFERRAL',
    name: 'Referral Form',
    nameAr: 'نموذج الإحالة',
    category: 'referral_form',
    fieldsCount: 14,
  },
  {
    code: 'FORM-SATISFACTION',
    name: 'Patient Satisfaction',
    nameAr: 'رضا المستفيد',
    category: 'satisfaction_survey',
    fieldsCount: 20,
  },
  {
    code: 'FORM-ASSESS-INIT',
    name: 'Initial Assessment',
    nameAr: 'التقييم الأولي',
    category: 'clinical_assessment',
    fieldsCount: 35,
  },
];

/* ══════════════════════════════════════════════════════════════
   2) SCHEMAS
   ══════════════════════════════════════════════════════════════ */

/* ── Form Template Schema ── */

const formTemplateSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    category: { type: String, enum: FORM_CATEGORIES, required: true, index: true },
    version: { type: Number, default: 1 },
    status: {
      type: String,
      enum: ['draft', 'published', 'deprecated'],
      default: 'draft',
      index: true,
    },

    /* Fields */
    fields: [
      {
        fieldId: { type: String, required: true },
        label: { type: String, required: true },
        labelAr: String,
        type: { type: String, enum: FIELD_TYPES, required: true },
        order: { type: Number, required: true },
        required: { type: Boolean, default: false },
        placeholder: String,
        placeholderAr: String,
        defaultValue: mongoose.Schema.Types.Mixed,
        helpText: String,
        helpTextAr: String,

        /* Options for select/radio/checkbox */
        options: [
          {
            value: String,
            label: String,
            labelAr: String,
          },
        ],

        /* Validation */
        validation: [
          {
            rule: { type: String, enum: VALIDATION_RULES },
            value: mongoose.Schema.Types.Mixed,
            message: String,
            messageAr: String,
          },
        ],

        /* Conditional Logic */
        conditions: [
          {
            dependsOn: String, // fieldId
            operator: {
              type: String,
              enum: [
                'equals',
                'not_equals',
                'contains',
                'greater_than',
                'less_than',
                'is_empty',
                'is_not_empty',
              ],
            },
            value: mongoose.Schema.Types.Mixed,
            action: { type: String, enum: ['show', 'hide', 'require', 'disable'] },
          },
        ],

        /* Layout */
        section: String,
        width: { type: String, enum: ['full', 'half', 'third', 'quarter'], default: 'full' },
        metadata: mongoose.Schema.Types.Mixed,
      },
    ],

    /* Sections */
    sections: [
      {
        sectionId: String,
        title: String,
        titleAr: String,
        order: Number,
        collapsible: { type: Boolean, default: false },
      },
    ],

    /* Scoring */
    scoring: {
      enabled: { type: Boolean, default: false },
      method: { type: String, enum: ['sum', 'average', 'weighted', 'custom'] },
      maxScore: Number,
      ranges: [
        {
          min: Number,
          max: Number,
          label: String,
          labelAr: String,
          color: String,
        },
      ],
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags: [String],
    isActive: { type: Boolean, default: true, index: true },
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDFormTemplate =
  mongoose.models.DDDFormTemplate || mongoose.model('DDDFormTemplate', formTemplateSchema);

/* ── Form Submission Schema ── */
const formSubmissionSchema = new mongoose.Schema(
  {
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DDDFormTemplate',
      required: true,
      index: true,
    },
    templateCode: { type: String, index: true },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
    episodeId: { type: mongoose.Schema.Types.ObjectId },
    sessionId: { type: mongoose.Schema.Types.ObjectId },
    workflowInstanceId: { type: mongoose.Schema.Types.ObjectId },

    /* Data */
    data: { type: Map, of: mongoose.Schema.Types.Mixed, required: true },
    score: Number,
    scoreLabel: String,

    /* Status */
    status: {
      type: String,
      enum: ['draft', 'submitted', 'reviewed', 'approved', 'rejected'],
      default: 'submitted',
      index: true,
    },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    submittedAt: { type: Date, default: Date.now },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    reviewNotes: String,

    /* Versioning */
    version: { type: Number, default: 1 },
    previousVersionId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDFormSubmission' },

    metadata: mongoose.Schema.Types.Mixed,
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

formSubmissionSchema.index({ templateId: 1, beneficiaryId: 1, submittedAt: -1 });

const DDDFormSubmission =
  mongoose.models.DDDFormSubmission || mongoose.model('DDDFormSubmission', formSubmissionSchema);

/* ══════════════════════════════════════════════════════════════
   3) DOMAIN SERVICE
   ══════════════════════════════════════════════════════════════ */

module.exports = {
  FIELD_TYPES,
  FORM_CATEGORIES,
  VALIDATION_RULES,
  BUILTIN_FORM_TEMPLATES,
};
