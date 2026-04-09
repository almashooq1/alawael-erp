/**
 * Document Dynamic Forms Service — خدمة النماذج والحقول الديناميكية
 * ──────────────────────────────────────────────────────────────
 * منشئ نماذج • حقول مخصصة • قوالب نماذج • تحقق ذكي
 * استخراج بيانات • إحصائيات نماذج
 */

const mongoose = require('mongoose');

/* ══════════════════════════════════════════════════════════════
   MODELS
   ══════════════════════════════════════════════════════════════ */

const fieldSchema = new mongoose.Schema(
  {
    fieldId: { type: String, required: true },
    label: { type: String, required: true },
    labelAr: String,
    type: {
      type: String,
      enum: [
        'text',
        'textarea',
        'number',
        'email',
        'phone',
        'url',
        'date',
        'datetime',
        'time',
        'select',
        'multiselect',
        'radio',
        'checkbox',
        'file',
        'image',
        'signature',
        'currency',
        'percentage',
        'address',
        'location',
        'rating',
        'color',
        'calculated',
        'lookup',
        'reference',
        'section',
        'divider',
        'heading',
      ],
      required: true,
    },
    placeholder: String,
    defaultValue: mongoose.Schema.Types.Mixed,
    options: [
      {
        label: String,
        value: mongoose.Schema.Types.Mixed,
        color: String,
        icon: String,
      },
    ],
    validation: {
      required: { type: Boolean, default: false },
      minLength: Number,
      maxLength: Number,
      min: Number,
      max: Number,
      pattern: String,
      patternMsg: String,
      custom: String, // JS expression
    },
    display: {
      width: { type: String, enum: ['full', 'half', 'third', 'quarter'], default: 'full' },
      order: { type: Number, default: 0 },
      hidden: { type: Boolean, default: false },
      readOnly: { type: Boolean, default: false },
      conditional: {
        // Show/hide based on other field
        dependsOn: String,
        operator: {
          type: String,
          enum: ['equals', 'not_equals', 'contains', 'gt', 'lt', 'exists'],
        },
        value: mongoose.Schema.Types.Mixed,
      },
    },
    calculation: {
      formula: String, // e.g., "{field1} * {field2}"
      dependencies: [String],
    },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { _id: false }
);

const formTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: String,
    description: String,
    category: { type: String, default: 'general' },
    icon: { type: String, default: 'description' },
    color: { type: String, default: '#1976d2' },
    version: { type: Number, default: 1 },
    status: { type: String, enum: ['draft', 'published', 'archived'], default: 'draft' },

    fields: [fieldSchema],

    layout: {
      type: { type: String, enum: ['single', 'multi-step', 'tabs', 'sections'], default: 'single' },
      steps: [{ title: String, titleAr: String, fieldIds: [String] }],
      columns: { type: Number, default: 1, min: 1, max: 4 },
    },

    settings: {
      allowDraft: { type: Boolean, default: true },
      allowEdit: { type: Boolean, default: true },
      requireApproval: { type: Boolean, default: false },
      notifyOnSubmit: [String],
      autoNumber: { type: Boolean, default: false },
      autoNumberPrefix: String,
      autoNumberCounter: { type: Number, default: 0 },
      submitMessage: String,
      submitMessageAr: String,
      maxSubmissions: Number,
      expireDate: Date,
    },

    permissions: {
      viewRoles: [String],
      submitRoles: [String],
      editRoles: [String],
    },

    styling: {
      theme: { type: String, default: 'default' },
      headerImage: String,
      backgroundColor: String,
      fontFamily: String,
      rtl: { type: Boolean, default: true },
    },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isActive: { type: Boolean, default: true },
    usageCount: { type: Number, default: 0 },
  },
  { timestamps: true, collection: 'form_templates' }
);

formTemplateSchema.index({ category: 1, status: 1 });
formTemplateSchema.index({ createdBy: 1, createdAt: -1 });
formTemplateSchema.index({ name: 'text', nameAr: 'text', description: 'text' });

const FormTemplate =
  mongoose.models.FormTemplate || mongoose.model('FormTemplate', formTemplateSchema);

/* ─── Form Submission ─── */
const formSubmissionSchema = new mongoose.Schema(
  {
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'FormTemplate', required: true },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Document' },
    submissionNumber: String,
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'rejected', 'archived'],
      default: 'draft',
    },

    data: { type: mongoose.Schema.Types.Mixed, required: true },

    validationErrors: [
      {
        fieldId: String,
        message: String,
      },
    ],

    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewNote: String,
    reviewedAt: Date,

    history: [
      {
        action: String,
        data: mongoose.Schema.Types.Mixed,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        changedAt: { type: Date, default: Date.now },
        note: String,
      },
    ],

    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true, collection: 'form_submissions' }
);

formSubmissionSchema.index({ formId: 1, status: 1 });
formSubmissionSchema.index({ submittedBy: 1, createdAt: -1 });
formSubmissionSchema.index({ documentId: 1 });

const FormSubmission =
  mongoose.models.FormSubmission || mongoose.model('FormSubmission', formSubmissionSchema);

/* ── Custom Fields for Documents ── */
const customFieldDefSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    label: { type: String, required: true },
    labelAr: String,
    type: { type: String, required: true },
    category: { type: String, default: 'general' },
    options: [{ label: String, value: mongoose.Schema.Types.Mixed }],
    validation: { type: mongoose.Schema.Types.Mixed, default: {} },
    defaultValue: mongoose.Schema.Types.Mixed,
    isRequired: { type: Boolean, default: false },
    isSearchable: { type: Boolean, default: true },
    isFilterable: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    appliesTo: [String], // document types
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'custom_field_definitions' }
);

const CustomFieldDef =
  mongoose.models.CustomFieldDef || mongoose.model('CustomFieldDef', customFieldDefSchema);

/* ══════════════════════════════════════════════════════════════
   VALIDATION ENGINE
   ══════════════════════════════════════════════════════════════ */

function validateFieldValue(field, value) {
  const errors = [];
  const v = field.validation || {};

  if (v.required && (value === undefined || value === null || value === '')) {
    errors.push({ fieldId: field.fieldId, message: `${field.labelAr || field.label} مطلوب` });
    return errors;
  }

  if (value === undefined || value === null || value === '') return errors;

  if (v.minLength && typeof value === 'string' && value.length < v.minLength) {
    errors.push({ fieldId: field.fieldId, message: `الحد الأدنى ${v.minLength} حرف` });
  }
  if (v.maxLength && typeof value === 'string' && value.length > v.maxLength) {
    errors.push({ fieldId: field.fieldId, message: `الحد الأقصى ${v.maxLength} حرف` });
  }
  if (v.min !== undefined && typeof value === 'number' && value < v.min) {
    errors.push({ fieldId: field.fieldId, message: `القيمة الدنيا ${v.min}` });
  }
  if (v.max !== undefined && typeof value === 'number' && value > v.max) {
    errors.push({ fieldId: field.fieldId, message: `القيمة القصوى ${v.max}` });
  }
  if (v.pattern) {
    try {
      if (!new RegExp(v.pattern).test(String(value))) {
        errors.push({ fieldId: field.fieldId, message: v.patternMsg || 'صيغة غير صالحة' });
      }
    } catch {
      /* ignore invalid regex */
    }
  }

  // Type-specific validations
  if (field.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    errors.push({ fieldId: field.fieldId, message: 'بريد إلكتروني غير صالح' });
  }
  if (field.type === 'phone' && !/^\+?[\d\s-()]{7,20}$/.test(value)) {
    errors.push({ fieldId: field.fieldId, message: 'رقم هاتف غير صالح' });
  }
  if (field.type === 'url' && !/^https?:\/\/.+/.test(value)) {
    errors.push({ fieldId: field.fieldId, message: 'رابط غير صالح' });
  }

  return errors;
}

function evaluateCalculation(formula, data) {
  try {
    let expr = formula;
    const matches = formula.match(/\{(\w+)\}/g) || [];
    for (const m of matches) {
      const key = m.replace(/[{}]/g, '');
      const val = parseFloat(data[key]) || 0;
      expr = expr.replace(m, val);
    }
    return Function('"use strict"; return (' + expr + ')')();
  } catch {
    return 0;
  }
}

/* ══════════════════════════════════════════════════════════════
   SERVICE METHODS
   ══════════════════════════════════════════════════════════════ */

class DocumentFormsService {
  /* ══════ Form Templates ══════ */

  async createTemplate(data, userId) {
    // Auto-generate fieldIds if missing
    if (data.fields) {
      data.fields.forEach((f, i) => {
        if (!f.fieldId) f.fieldId = `field_${Date.now()}_${i}`;
        if (!f.display) f.display = {};
        f.display.order = f.display.order ?? i;
      });
    }

    const template = await FormTemplate.create({ ...data, createdBy: userId });
    return { success: true, template };
  }

  async updateTemplate(templateId, data, userId) {
    const template = await FormTemplate.findById(templateId);
    if (!template) throw new Error('القالب غير موجود');

    if (data.fields) {
      data.fields.forEach((f, i) => {
        if (!f.fieldId) f.fieldId = `field_${Date.now()}_${i}`;
      });
    }

    Object.assign(template, data);
    template.version += 1;
    await template.save();
    return { success: true, template };
  }

  async getTemplate(templateId) {
    const template = await FormTemplate.findById(templateId).populate('createdBy', 'name email');
    if (!template) throw new Error('القالب غير موجود');
    return { success: true, template };
  }

  async getTemplates(filters = {}) {
    const query = { isActive: true };
    if (filters.category) query.category = filters.category;
    if (filters.status) query.status = filters.status;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { nameAr: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;

    const [templates, total] = await Promise.all([
      FormTemplate.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('createdBy', 'name')
        .lean(),
      FormTemplate.countDocuments(query),
    ]);

    return { success: true, templates, total, page, pages: Math.ceil(total / limit) };
  }

  async deleteTemplate(templateId) {
    await FormTemplate.findByIdAndUpdate(templateId, { isActive: false });
    return { success: true };
  }

  async publishTemplate(templateId) {
    const t = await FormTemplate.findByIdAndUpdate(
      templateId,
      { status: 'published' },
      { new: true }
    );
    return { success: true, template: t };
  }

  async cloneTemplate(templateId, userId) {
    const original = await FormTemplate.findById(templateId).lean();
    if (!original) throw new Error('القالب غير موجود');

    delete original._id;
    delete original.__v;
    original.name = `${original.name} (نسخة)`;
    original.nameAr = original.nameAr ? `${original.nameAr} (نسخة)` : undefined;
    original.status = 'draft';
    original.version = 1;
    original.usageCount = 0;
    original.createdBy = userId;

    const clone = await FormTemplate.create(original);
    return { success: true, template: clone };
  }

  /* ══════ Form Submissions ══════ */

  async submitForm(formId, data, userId, options = {}) {
    const template = await FormTemplate.findById(formId);
    if (!template) throw new Error('القالب غير موجود');
    if (template.status !== 'published' && !options.allowDraft) throw new Error('القالب غير منشور');

    // Check expiry
    if (template.settings?.expireDate && new Date() > template.settings.expireDate) {
      throw new Error('انتهت صلاحية النموذج');
    }

    // Check max submissions
    if (template.settings?.maxSubmissions) {
      const count = await FormSubmission.countDocuments({ formId });
      if (count >= template.settings.maxSubmissions) throw new Error('تم الوصول للحد الأقصى');
    }

    // Evaluate calculated fields
    const processedData = { ...data };
    for (const field of template.fields) {
      if (field.type === 'calculated' && field.calculation?.formula) {
        processedData[field.fieldId] = evaluateCalculation(
          field.calculation.formula,
          processedData
        );
      }
    }

    // Validate
    const validationErrors = [];
    for (const field of template.fields) {
      if (['section', 'divider', 'heading'].includes(field.type)) continue;
      const errs = validateFieldValue(field, processedData[field.fieldId]);
      validationErrors.push(...errs);
    }

    const status = options.asDraft ? 'draft' : validationErrors.length ? 'draft' : 'submitted';

    // Auto number
    let submissionNumber;
    if (template.settings?.autoNumber) {
      template.settings.autoNumberCounter = (template.settings.autoNumberCounter || 0) + 1;
      submissionNumber = `${template.settings.autoNumberPrefix || 'F'}${String(template.settings.autoNumberCounter).padStart(5, '0')}`;
      await template.save();
    }

    template.usageCount++;
    await template.save();

    const submission = await FormSubmission.create({
      formId,
      documentId: options.documentId,
      submissionNumber,
      status,
      data: processedData,
      validationErrors,
      submittedBy: userId,
      history: [
        {
          action: status === 'draft' ? 'draft_saved' : 'submitted',
          changedBy: userId,
          data: processedData,
        },
      ],
    });

    return { success: true, submission, validationErrors };
  }

  async updateSubmission(submissionId, data, userId) {
    const submission = await FormSubmission.findById(submissionId);
    if (!submission) throw new Error('العرض غير موجود');
    if (!['draft', 'rejected'].includes(submission.status))
      throw new Error('لا يمكن تعديل هذا العرض');

    submission.data = { ...submission.data, ...data };
    submission.history.push({ action: 'updated', data, changedBy: userId });

    // Re-validate
    const template = await FormTemplate.findById(submission.formId);
    if (template) {
      const errors = [];
      for (const field of template.fields) {
        if (['section', 'divider', 'heading'].includes(field.type)) continue;
        errors.push(...validateFieldValue(field, submission.data[field.fieldId]));
      }
      submission.validationErrors = errors;
    }

    await submission.save();
    return { success: true, submission };
  }

  async getSubmission(submissionId) {
    const sub = await FormSubmission.findById(submissionId)
      .populate('formId')
      .populate('submittedBy', 'name email')
      .populate('reviewedBy', 'name email');
    if (!sub) throw new Error('العرض غير موجود');
    return { success: true, submission: sub };
  }

  async getSubmissions(filters = {}) {
    const query = {};
    if (filters.formId) query.formId = filters.formId;
    if (filters.status) query.status = filters.status;
    if (filters.documentId) query.documentId = filters.documentId;
    if (filters.submittedBy) query.submittedBy = filters.submittedBy;

    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;

    const [submissions, total] = await Promise.all([
      FormSubmission.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('formId', 'name nameAr')
        .populate('submittedBy', 'name')
        .lean(),
      FormSubmission.countDocuments(query),
    ]);

    return { success: true, submissions, total, page, pages: Math.ceil(total / limit) };
  }

  async reviewSubmission(submissionId, approved, reviewData, userId) {
    const sub = await FormSubmission.findById(submissionId);
    if (!sub) throw new Error('العرض غير موجود');

    sub.status = approved ? 'approved' : 'rejected';
    sub.reviewedBy = userId;
    sub.reviewNote = reviewData.note || '';
    sub.reviewedAt = new Date();
    sub.history.push({
      action: approved ? 'approved' : 'rejected',
      changedBy: userId,
      note: reviewData.note,
    });
    await sub.save();
    return { success: true, submission: sub };
  }

  async deleteSubmission(submissionId) {
    await FormSubmission.findByIdAndDelete(submissionId);
    return { success: true };
  }

  /* ══════ Custom Fields ══════ */

  async createCustomField(data, userId) {
    const field = await CustomFieldDef.create({ ...data, createdBy: userId });
    return { success: true, field };
  }

  async updateCustomField(fieldId, data) {
    const field = await CustomFieldDef.findByIdAndUpdate(fieldId, { $set: data }, { new: true });
    if (!field) throw new Error('الحقل غير موجود');
    return { success: true, field };
  }

  async getCustomFields(filters = {}) {
    const query = { isActive: true };
    if (filters.category) query.category = filters.category;
    if (filters.appliesTo) query.appliesTo = filters.appliesTo;

    const fields = await CustomFieldDef.find(query).sort({ order: 1, createdAt: -1 }).lean();
    return { success: true, fields };
  }

  async deleteCustomField(fieldId) {
    await CustomFieldDef.findByIdAndUpdate(fieldId, { isActive: false });
    return { success: true };
  }

  /* ══════ Stats ══════ */

  async getStats() {
    const [templates, published, submissions, customFields, categoryStats] = await Promise.all([
      FormTemplate.countDocuments({ isActive: true }),
      FormTemplate.countDocuments({ isActive: true, status: 'published' }),
      FormSubmission.countDocuments(),
      CustomFieldDef.countDocuments({ isActive: true }),
      FormTemplate.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 },
            totalSubmissions: { $sum: '$usageCount' },
          },
        },
        { $sort: { count: -1 } },
      ]),
    ]);

    const statusStats = await FormSubmission.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    return {
      success: true,
      templates,
      published,
      totalSubmissions: submissions,
      customFields,
      categoryStats,
      submissionsByStatus: Object.fromEntries(statusStats.map(s => [s._id, s.count])),
    };
  }
}

module.exports = new DocumentFormsService();
