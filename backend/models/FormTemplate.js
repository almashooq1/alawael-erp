/**
 * FormTemplate Model — نموذج تصميم النماذج
 * Professional form template builder with logo, header, footer,
 * conditional logic, versioning, sections, and rich field types.
 *
 * @module models/FormTemplate
 * @created 2026-03-14
 */

const mongoose = require('mongoose');

// ═══════════════════════════════════════════════════════════════
// 📐 SUB-SCHEMAS
// ═══════════════════════════════════════════════════════════════

/**
 * Field validation rules
 */
const ValidationSchema = new mongoose.Schema(
  {
    min: Number,
    max: Number,
    minLength: Number,
    maxLength: Number,
    pattern: String,
    patternMessage: String, // Custom regex error message
    customValidator: String, // JS expression string for advanced validation
  },
  { _id: false }
);

/**
 * Conditional display logic — show/hide field based on another field's value
 */
const ConditionalLogicSchema = new mongoose.Schema(
  {
    field: { type: String, required: true }, // Target field name
    operator: {
      type: String,
      enum: [
        'equals',
        'not_equals',
        'contains',
        'greater_than',
        'less_than',
        'in',
        'not_in',
        'is_empty',
        'is_not_empty',
      ],
      default: 'equals',
    },
    value: mongoose.Schema.Types.Mixed, // Value to compare against
    action: { type: String, enum: ['show', 'hide', 'require', 'disable'], default: 'show' },
  },
  { _id: false }
);

/**
 * Form field — supports 20+ field types
 */
const FormFieldSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    label: { type: String, required: true },
    labelEn: String,
    type: {
      type: String,
      required: true,
      enum: [
        // Basic
        'text',
        'textarea',
        'number',
        'email',
        'tel',
        'url',
        'password',
        // Date / Time
        'date',
        'time',
        'datetime',
        // Choice
        'select',
        'radio',
        'checkbox',
        'toggle',
        // Advanced
        'file',
        'signature',
        'image',
        'rating',
        'slider',
        'color',
        // Layout
        'header',
        'divider',
        'paragraph',
        'spacer',
        // Complex
        'table',
        'repeater',
        'calculated',
        'location',
        'rich_text',
      ],
    },
    placeholder: String,
    helpText: String, // Tooltip / helper text under the field
    required: { type: Boolean, default: false },
    readOnly: { type: Boolean, default: false },
    hidden: { type: Boolean, default: false },
    options: [{ label: String, value: String, icon: String }],
    defaultValue: mongoose.Schema.Types.Mixed,
    validation: ValidationSchema,
    conditional: ConditionalLogicSchema,
    gridSize: { type: Number, default: 12, min: 1, max: 12 },
    order: { type: Number, default: 0 },
    section: String, // Which section this field belongs to
    // Table field columns
    columns: [
      {
        name: String,
        label: String,
        type: { type: String, enum: ['text', 'number', 'date', 'select'] },
        options: [{ label: String, value: String }],
        width: Number,
      },
    ],
    // Repeater settings
    repeaterFields: [mongoose.Schema.Types.Mixed],
    minRows: Number,
    maxRows: Number,
    // Calculated field
    formula: String, // e.g. "{quantity} * {unitPrice}"
    // Slider settings
    sliderMin: Number,
    sliderMax: Number,
    sliderStep: Number,
    // Rating
    maxRating: { type: Number, default: 5 },
    // File upload settings
    acceptedFileTypes: [String],
    maxFileSize: Number, // in bytes
    // Styling
    style: {
      fontSize: String,
      fontWeight: String,
      color: String,
      backgroundColor: String,
      textAlign: String,
      className: String,
    },
  },
  { _id: false }
);

/**
 * Section — visual grouping of fields with optional collapsibility
 */
const SectionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    title: { type: String, required: true },
    titleEn: String,
    description: String,
    icon: String,
    order: { type: Number, default: 0 },
    collapsible: { type: Boolean, default: false },
    collapsed: { type: Boolean, default: false }, // Default state
    columns: { type: Number, default: 1, min: 1, max: 4 }, // Multi-column layout
    conditional: ConditionalLogicSchema,
    style: {
      backgroundColor: String,
      borderColor: String,
      padding: String,
    },
  },
  { _id: false }
);

/**
 * Approval step in the workflow
 */
const ApprovalStepSchema = new mongoose.Schema(
  {
    role: { type: String, required: true },
    label: String,
    labelEn: String,
    order: { type: Number, default: 0 },
    required: { type: Boolean, default: true },
    autoApproveAfterDays: Number, // Auto-approve if not actioned within N days
  },
  { _id: false }
);

/**
 * Design settings — logo, header, footer, branding
 */
const DesignSchema = new mongoose.Schema(
  {
    // Logo
    logo: {
      url: String,
      base64: String, // For embedded logos
      width: { type: Number, default: 120 },
      height: { type: Number, default: 60 },
      position: { type: String, enum: ['left', 'center', 'right'], default: 'center' },
    },
    // Secondary logo (e.g. partner organization)
    secondaryLogo: {
      url: String,
      base64: String,
      width: { type: Number, default: 80 },
      height: { type: Number, default: 40 },
      position: { type: String, enum: ['left', 'center', 'right'], default: 'left' },
    },
    // Header
    header: {
      enabled: { type: Boolean, default: true },
      title: String,
      titleEn: String,
      subtitle: String,
      subtitleEn: String,
      backgroundColor: { type: String, default: '#1976d2' },
      textColor: { type: String, default: '#ffffff' },
      fontSize: { type: Number, default: 18 },
      showDate: { type: Boolean, default: true },
      showReferenceNumber: { type: Boolean, default: true },
      customHtml: String, // For fully custom header
    },
    // Footer
    footer: {
      enabled: { type: Boolean, default: true },
      text: String,
      textEn: String,
      showPageNumbers: { type: Boolean, default: true },
      showSignatureFields: { type: Boolean, default: false },
      signatureFields: [
        {
          label: String,
          role: String,
          position: { type: String, enum: ['left', 'center', 'right'], default: 'right' },
        },
      ],
      contactInfo: String,
      backgroundColor: { type: String, default: '#f5f5f5' },
      textColor: { type: String, default: '#666666' },
      customHtml: String,
    },
    // Watermark
    watermark: {
      enabled: { type: Boolean, default: false },
      text: String,
      opacity: { type: Number, default: 0.08, min: 0.01, max: 0.5 },
      rotation: { type: Number, default: -30 },
      fontSize: { type: Number, default: 60 },
    },
    // Page settings
    page: {
      size: { type: String, enum: ['A4', 'A3', 'letter', 'legal'], default: 'A4' },
      orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
      margins: {
        top: { type: Number, default: 20 },
        right: { type: Number, default: 20 },
        bottom: { type: Number, default: 20 },
        left: { type: Number, default: 20 },
      },
      direction: { type: String, enum: ['rtl', 'ltr'], default: 'rtl' },
    },
    // Color scheme
    theme: {
      primaryColor: { type: String, default: '#1976d2' },
      secondaryColor: { type: String, default: '#dc004e' },
      accentColor: { type: String, default: '#ff9800' },
      backgroundColor: { type: String, default: '#ffffff' },
      borderColor: { type: String, default: '#e0e0e0' },
      fontFamily: { type: String, default: 'Cairo, Segoe UI, Tahoma, sans-serif' },
      fontSize: { type: Number, default: 14 },
      borderRadius: { type: Number, default: 8 },
      fieldSpacing: { type: Number, default: 16 },
    },
    // Stamps / Badges
    stamps: [
      {
        label: String,
        type: {
          type: String,
          enum: ['approved', 'rejected', 'draft', 'confidential', 'urgent', 'custom'],
        },
        color: String,
        position: {
          type: String,
          enum: ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'center'],
        },
      },
    ],
    // Custom CSS
    customCss: String,
  },
  { _id: false }
);

/**
 * Version snapshot — tracks historical versions
 */
const VersionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    fields: [FormFieldSchema],
    sections: [SectionSchema],
    design: DesignSchema,
    notes: String,
    changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    changedByName: String,
  },
  { timestamps: true, _id: true }
);

// ═══════════════════════════════════════════════════════════════
// 📋 MAIN FORM TEMPLATE SCHEMA
// ═══════════════════════════════════════════════════════════════

const FormTemplateSchema = new mongoose.Schema(
  {
    // Identity
    templateId: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    nameEn: { type: String, trim: true },
    description: { type: String, trim: true },
    descriptionEn: String,
    category: {
      type: String,
      required: true,
      enum: [
        'beneficiary',
        'hr',
        'administration',
        'finance',
        'general',
        'medical',
        'therapy',
        'legal',
        'reports',
        'custom',
      ],
      index: true,
    },
    subcategory: String,
    tags: [{ type: String, trim: true }],

    // Visual
    icon: { type: String, default: '📄' },
    color: { type: String, default: '#1976d2' },
    thumbnail: String, // Preview image URL

    // Structure
    fields: [FormFieldSchema],
    sections: [SectionSchema],
    design: { type: DesignSchema, default: () => ({}) },

    // Workflow
    requiresApproval: { type: Boolean, default: true },
    approvalSteps: [ApprovalStepSchema],
    outputFormat: {
      type: String,
      enum: ['pdf', 'docx', 'html', 'print'],
      default: 'pdf',
    },
    allowDraft: { type: Boolean, default: true },
    allowAttachments: { type: Boolean, default: true },
    maxAttachments: { type: Number, default: 5 },
    allowedAttachmentTypes: [String],
    notifyOnSubmission: { type: Boolean, default: true },
    notifyEmails: [String], // Additional emails to notify

    // Access Control
    permissions: {
      canView: [{ type: String }], // Roles that can see this template
      canSubmit: [{ type: String }], // Roles that can submit
      canEdit: [{ type: String }], // Roles that can edit template design
      canDelete: [{ type: String }], // Roles that can delete
    },

    // Versioning
    version: { type: Number, default: 1 },
    versions: [VersionSchema],

    // Metadata
    isActive: { type: Boolean, default: true, index: true },
    isBuiltIn: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },
    usageCount: { type: Number, default: 0 },
    lastUsedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdByName: String,
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tenantId: String,
    organizationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── Indexes ───────────────────────────────────────────────────────
FormTemplateSchema.index({ name: 'text', nameEn: 'text', description: 'text', tags: 'text' });
FormTemplateSchema.index({ category: 1, isActive: 1 });
FormTemplateSchema.index({ isBuiltIn: 1, isActive: 1 });
FormTemplateSchema.index({ createdBy: 1 });
FormTemplateSchema.index({ tenantId: 1, isActive: 1 });

// ─── Virtuals ──────────────────────────────────────────────────────
FormTemplateSchema.virtual('fieldCount').get(function () {
  return (this.fields || []).filter(
    f => !['header', 'divider', 'paragraph', 'spacer'].includes(f.type)
  ).length;
});

FormTemplateSchema.virtual('sectionCount').get(function () {
  return (this.sections || []).length;
});

// ─── Methods ───────────────────────────────────────────────────────

/**
 * Save a version snapshot before major changes
 */
FormTemplateSchema.methods.saveVersion = function (userId, userName, notes) {
  this.versions.push({
    version: this.version,
    fields: JSON.parse(JSON.stringify(this.fields)),
    sections: JSON.parse(JSON.stringify(this.sections)),
    design: JSON.parse(JSON.stringify(this.design || {})),
    notes,
    changedBy: userId,
    changedByName: userName,
  });
  this.version += 1;
  return this;
};

/**
 * Restore a previous version
 */
FormTemplateSchema.methods.restoreVersion = function (versionNumber) {
  const snapshot = this.versions.find(v => v.version === versionNumber);
  if (!snapshot) throw new Error(`الإصدار ${versionNumber} غير موجود`);
  this.fields = snapshot.fields;
  this.sections = snapshot.sections;
  if (snapshot.design) this.design = snapshot.design;
  return this;
};

/**
 * Clone this template as a new template
 */
FormTemplateSchema.methods.cloneTemplate = function (newName, userId) {
  const data = this.toObject();
  delete data._id;
  delete data.__v;
  data.templateId = `custom-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  data.name = newName || `نسخة من ${data.name}`;
  data.isBuiltIn = false;
  data.isPublished = false;
  data.usageCount = 0;
  data.version = 1;
  data.versions = [];
  data.createdBy = userId;
  data.createdByName = undefined;
  return data;
};

/**
 * Validate submission data against field definitions
 */
FormTemplateSchema.methods.validateSubmission = function (data) {
  const errors = [];
  for (const field of this.fields || []) {
    if (['header', 'divider', 'paragraph', 'spacer'].includes(field.type)) continue;
    const value = data[field.name];
    if (field.required && (value === undefined || value === null || value === '')) {
      errors.push({ field: field.name, message: `${field.label} مطلوب` });
    }
    if (value && field.validation) {
      if (field.validation.minLength && String(value).length < field.validation.minLength) {
        errors.push({
          field: field.name,
          message: `${field.label} يجب ألا يقل عن ${field.validation.minLength} حرف`,
        });
      }
      if (field.validation.maxLength && String(value).length > field.validation.maxLength) {
        errors.push({
          field: field.name,
          message: `${field.label} يجب ألا يزيد عن ${field.validation.maxLength} حرف`,
        });
      }
      if (field.validation.min !== undefined && Number(value) < field.validation.min) {
        errors.push({
          field: field.name,
          message: `${field.label} يجب ألا يقل عن ${field.validation.min}`,
        });
      }
      if (field.validation.max !== undefined && Number(value) > field.validation.max) {
        errors.push({
          field: field.name,
          message: `${field.label} يجب ألا يزيد عن ${field.validation.max}`,
        });
      }
      if (field.validation.pattern) {
        const re = new RegExp(field.validation.pattern);
        if (!re.test(String(value))) {
          errors.push({
            field: field.name,
            message: field.validation.patternMessage || `${field.label} بتنسيق غير صحيح`,
          });
        }
      }
    }
  }
  return errors;
};

// ─── Statics ───────────────────────────────────────────────────────

FormTemplateSchema.statics.findByCategory = function (category, options = {}) {
  const filter = { category, isActive: true };
  if (options.tenantId) filter.tenantId = options.tenantId;
  return this.find(filter).sort({ usageCount: -1, name: 1 });
};

FormTemplateSchema.statics.search = function (query, options = {}) {
  const filter = { isActive: true };
  if (options.tenantId) filter.tenantId = options.tenantId;
  if (options.category) filter.category = options.category;
  return this.find(
    { ...filter, $text: { $search: query } },
    { score: { $meta: 'textScore' } }
  ).sort({ score: { $meta: 'textScore' } });
};

FormTemplateSchema.statics.findByTemplateId = function (templateId) {
  return this.findOne({ templateId, isActive: true });
};

// ─── Export ────────────────────────────────────────────────────────

let FormTemplateModel;
try {
  FormTemplateModel = mongoose.model('FormTemplate');
} catch {
  FormTemplateModel = mongoose.model('FormTemplate', FormTemplateSchema);
}

module.exports = FormTemplateModel;
