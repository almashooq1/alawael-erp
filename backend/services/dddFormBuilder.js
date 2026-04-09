'use strict';
/**
 * ═══════════════════════════════════════════════════════════════
 *  DDD Form Builder — Phase 15 (2/4)
 *  Dynamic forms, templates, conditional logic, validation
 * ═══════════════════════════════════════════════════════════════
 */
const mongoose = require('mongoose');
const { Router } = require('express');

/* ── helpers ── */
const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};
const oid = v => {
  try {
    return new mongoose.Types.ObjectId(String(v));
  } catch {
    return v;
  }
};
const safe = fn => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (e) {
    next(e);
  }
};

/* ══════════════════════════════════════════════════════════════
   1) CONSTANTS
   ══════════════════════════════════════════════════════════════ */

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
  model('DDDFormTemplate') || mongoose.model('DDDFormTemplate', formTemplateSchema);

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
  model('DDDFormSubmission') || mongoose.model('DDDFormSubmission', formSubmissionSchema);

/* ══════════════════════════════════════════════════════════════
   3) DOMAIN SERVICE
   ══════════════════════════════════════════════════════════════ */

class FormBuilderService {
  /* ── Templates CRUD ── */
  async listTemplates(filter = {}) {
    const q = { isActive: true };
    if (filter.category) q.category = filter.category;
    if (filter.status) q.status = filter.status;
    if (filter.tenant) q.tenant = filter.tenant;
    if (filter.search) {
      q.$or = [
        { name: new RegExp(filter.search, 'i') },
        { nameAr: new RegExp(filter.search, 'i') },
        { code: new RegExp(filter.search, 'i') },
      ];
    }
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDFormTemplate.find(q)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DDDFormTemplate.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getTemplate(id) {
    return DDDFormTemplate.findById(oid(id)).lean();
  }

  async createTemplate(data) {
    return DDDFormTemplate.create(data);
  }

  async updateTemplate(id, data) {
    return DDDFormTemplate.findByIdAndUpdate(
      oid(id),
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
  }

  async publishTemplate(id) {
    return DDDFormTemplate.findByIdAndUpdate(
      oid(id),
      { $set: { status: 'published' }, $inc: { version: 1 } },
      { new: true }
    ).lean();
  }

  async cloneTemplate(id, newCode) {
    const original = await DDDFormTemplate.findById(oid(id)).lean();
    if (!original) throw new Error('Template not found');
    delete original._id;
    original.code = newCode || `${original.code}-COPY-${Date.now().toString(36)}`;
    original.name = `${original.name} (Copy)`;
    original.status = 'draft';
    original.version = 1;
    return DDDFormTemplate.create(original);
  }

  /* ── Submissions ── */
  async submitForm(templateId, data, context = {}) {
    const template = await DDDFormTemplate.findById(oid(templateId)).lean();
    if (!template) throw new Error('Template not found');

    // Validate required fields
    const errors = [];
    for (const field of template.fields || []) {
      if (field.required && !data[field.fieldId] && data[field.fieldId] !== 0) {
        errors.push({ fieldId: field.fieldId, message: `${field.label} is required` });
      }
      // Apply validation rules
      for (const rule of field.validation || []) {
        const val = data[field.fieldId];
        if (val === undefined || val === null) continue;
        switch (rule.rule) {
          case 'min_length':
            if (String(val).length < rule.value)
              errors.push({
                fieldId: field.fieldId,
                message: rule.message || `Min length: ${rule.value}`,
              });
            break;
          case 'max_length':
            if (String(val).length > rule.value)
              errors.push({
                fieldId: field.fieldId,
                message: rule.message || `Max length: ${rule.value}`,
              });
            break;
          case 'min_value':
            if (Number(val) < rule.value)
              errors.push({
                fieldId: field.fieldId,
                message: rule.message || `Min value: ${rule.value}`,
              });
            break;
          case 'max_value':
            if (Number(val) > rule.value)
              errors.push({
                fieldId: field.fieldId,
                message: rule.message || `Max value: ${rule.value}`,
              });
            break;
          case 'pattern':
            if (!new RegExp(rule.value).test(String(val)))
              errors.push({ fieldId: field.fieldId, message: rule.message || 'Invalid format' });
            break;
        }
      }
    }

    if (errors.length > 0) return { valid: false, errors };

    // Calculate score if enabled
    let score, scoreLabel;
    if (template.scoring?.enabled) {
      score = 0;
      for (const field of template.fields || []) {
        const val = Number(data[field.fieldId]) || 0;
        score += val;
      }
      if (template.scoring.method === 'average') {
        score =
          score /
          Math.max(
            1,
            template.fields.filter(f => !['section_header', 'calculated'].includes(f.type)).length
          );
      }
      const range = (template.scoring.ranges || []).find(r => score >= r.min && score <= r.max);
      scoreLabel = range?.label;
    }

    const submission = await DDDFormSubmission.create({
      templateId: oid(templateId),
      templateCode: template.code,
      beneficiaryId: context.beneficiaryId ? oid(context.beneficiaryId) : undefined,
      episodeId: context.episodeId ? oid(context.episodeId) : undefined,
      sessionId: context.sessionId ? oid(context.sessionId) : undefined,
      workflowInstanceId: context.workflowInstanceId ? oid(context.workflowInstanceId) : undefined,
      data,
      score,
      scoreLabel,
      submittedBy: context.submittedBy ? oid(context.submittedBy) : undefined,
      tenant: context.tenant || 'default',
    });

    return { valid: true, submission };
  }

  async listSubmissions(filter = {}) {
    const q = {};
    if (filter.templateId) q.templateId = oid(filter.templateId);
    if (filter.beneficiaryId) q.beneficiaryId = oid(filter.beneficiaryId);
    if (filter.status) q.status = filter.status;
    if (filter.submittedBy) q.submittedBy = oid(filter.submittedBy);
    if (filter.tenant) q.tenant = filter.tenant;
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDFormSubmission.find(q)
        .sort({ submittedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('templateId', 'name code category')
        .lean(),
      DDDFormSubmission.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getSubmission(id) {
    return DDDFormSubmission.findById(oid(id))
      .populate('templateId', 'name code category fields scoring')
      .populate('submittedBy', 'name email')
      .lean();
  }

  async reviewSubmission(id, status, reviewedBy, notes) {
    return DDDFormSubmission.findByIdAndUpdate(
      oid(id),
      {
        $set: { status, reviewedBy: oid(reviewedBy), reviewedAt: new Date(), reviewNotes: notes },
      },
      { new: true }
    ).lean();
  }

  /* ── Stats ── */
  async getStats(tenant = 'default') {
    const [templateCount, submissionCount, byCategory] = await Promise.all([
      DDDFormTemplate.countDocuments({ isActive: true, tenant }),
      DDDFormSubmission.countDocuments({ tenant }),
      DDDFormTemplate.aggregate([
        { $match: { isActive: true, tenant } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);
    return {
      templateCount,
      submissionCount,
      byCategory: Object.fromEntries(byCategory.map(r => [r._id, r.count])),
      builtinTemplates: BUILTIN_FORM_TEMPLATES.length,
    };
  }
}

const formBuilderService = new FormBuilderService();

/* ══════════════════════════════════════════════════════════════
   4) ROUTER
   ══════════════════════════════════════════════════════════════ */

function createFormBuilderRouter() {
  const r = Router();

  /* Templates */
  r.get(
    '/form-builder/templates',
    safe(async (req, res) => {
      res.json({ success: true, ...(await formBuilderService.listTemplates(req.query)) });
    })
  );
  r.get(
    '/form-builder/templates/:id',
    safe(async (req, res) => {
      const doc = await formBuilderService.getTemplate(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );
  r.post(
    '/form-builder/templates',
    safe(async (req, res) => {
      const doc = await formBuilderService.createTemplate(req.body);
      res.status(201).json({ success: true, data: doc });
    })
  );
  r.put(
    '/form-builder/templates/:id',
    safe(async (req, res) => {
      const doc = await formBuilderService.updateTemplate(req.params.id, req.body);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );
  r.post(
    '/form-builder/templates/:id/publish',
    safe(async (req, res) => {
      const doc = await formBuilderService.publishTemplate(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );
  r.post(
    '/form-builder/templates/:id/clone',
    safe(async (req, res) => {
      const doc = await formBuilderService.cloneTemplate(req.params.id, req.body.newCode);
      res.status(201).json({ success: true, data: doc });
    })
  );

  /* Submissions */
  r.get(
    '/form-builder/submissions',
    safe(async (req, res) => {
      res.json({ success: true, ...(await formBuilderService.listSubmissions(req.query)) });
    })
  );
  r.get(
    '/form-builder/submissions/:id',
    safe(async (req, res) => {
      const doc = await formBuilderService.getSubmission(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );
  r.post(
    '/form-builder/submissions',
    safe(async (req, res) => {
      const { templateId, data, ...context } = req.body;
      if (!templateId || !data)
        return res.status(400).json({ success: false, error: 'templateId and data required' });
      const result = await formBuilderService.submitForm(templateId, data, context);
      if (!result.valid) return res.status(422).json({ success: false, errors: result.errors });
      res.status(201).json({ success: true, data: result.submission });
    })
  );
  r.put(
    '/form-builder/submissions/:id/review',
    safe(async (req, res) => {
      const { status, reviewedBy, notes } = req.body;
      const doc = await formBuilderService.reviewSubmission(
        req.params.id,
        status,
        reviewedBy,
        notes
      );
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  /* Stats */
  r.get(
    '/form-builder/stats',
    safe(async (req, res) => {
      const data = await formBuilderService.getStats(req.query.tenant);
      res.json({ success: true, data });
    })
  );

  /* Meta */
  r.get('/form-builder/meta', (_req, res) => {
    res.json({
      success: true,
      fieldTypes: FIELD_TYPES,
      formCategories: FORM_CATEGORIES,
      validationRules: VALIDATION_RULES,
      builtinTemplates: BUILTIN_FORM_TEMPLATES,
    });
  });

  return r;
}

/* ══════════════════════════════════════════════════════════════
   5) EXPORTS
   ══════════════════════════════════════════════════════════════ */

module.exports = {
  DDDFormTemplate,
  DDDFormSubmission,
  FormBuilderService,
  formBuilderService,
  createFormBuilderRouter,
  FIELD_TYPES,
  FORM_CATEGORIES,
  VALIDATION_RULES,
  BUILTIN_FORM_TEMPLATES,
};
