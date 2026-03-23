/**
 * ImportExportTemplate Model
 * ===========================
 * قوالب الاستيراد والتصدير القابلة لإعادة الاستخدام
 * Reusable templates for import/export operations
 *
 * @module models/ImportExportTemplate
 */

const mongoose = require('mongoose');

const fieldDefinitionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    nameAr: { type: String },
    key: { type: String, required: true },
    dataType: {
      type: String,
      enum: [
        'string',
        'number',
        'date',
        'boolean',
        'email',
        'phone',
        'currency',
        'array',
        'select',
      ],
      default: 'string',
    },
    required: { type: Boolean, default: false },
    defaultValue: { type: mongoose.Schema.Types.Mixed },
    validationRule: { type: String },
    validationMessage: { type: String },
    validationMessageAr: { type: String },
    options: [{ type: String }], // For select/dropdown fields
    order: { type: Number, default: 0 },
    width: { type: Number }, // Column width in pixels
    format: { type: String }, // e.g., 'YYYY-MM-DD', '#,##0.00'
    example: { type: String },
    description: { type: String },
    descriptionAr: { type: String },
    transformOnImport: { type: String }, // Transform rule
    transformOnExport: { type: String },
  },
  { _id: false }
);

const importExportTemplateSchema = new mongoose.Schema(
  {
    // Template Identity
    name: { type: String, required: true, trim: true },
    nameAr: { type: String, trim: true },
    description: { type: String },
    descriptionAr: { type: String },
    slug: { type: String, unique: true },

    // Template Type
    type: {
      type: String,
      required: true,
      enum: ['export', 'import', 'both'],
      default: 'both',
    },

    // Module Configuration
    module: { type: String, required: true, index: true },
    model: { type: String }, // Mongoose model name

    // Field Definitions
    fields: [fieldDefinitionSchema],

    // Default Options
    defaultFormat: { type: String, enum: ['xlsx', 'csv', 'json', 'pdf', 'xml'], default: 'xlsx' },
    defaultExportOptions: {
      includeHeaders: { type: Boolean, default: true },
      dateFormat: { type: String, default: 'YYYY-MM-DD' },
      language: { type: String, enum: ['ar', 'en', 'both'], default: 'both' },
      sheetName: { type: String },
      orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
    },
    defaultImportOptions: {
      mode: { type: String, enum: ['insert', 'update', 'upsert'], default: 'insert' },
      skipDuplicates: { type: Boolean, default: true },
      duplicateCheckField: { type: String },
      headerRow: { type: Number, default: 1 },
      startRow: { type: Number, default: 2 },
    },

    // Template Styling
    styling: {
      headerBgColor: { type: String, default: '#1976D2' },
      headerTextColor: { type: String, default: '#FFFFFF' },
      altRowColor: { type: String, default: '#F5F5F5' },
      fontSize: { type: Number, default: 11 },
      fontFamily: { type: String, default: 'Arial' },
      includeBorders: { type: Boolean, default: true },
      freezeHeader: { type: Boolean, default: true },
      autoFilter: { type: Boolean, default: true },
    },

    // Usage Statistics
    usageCount: { type: Number, default: 0 },
    lastUsedAt: { type: Date },
    lastUsedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Access Control
    isPublic: { type: Boolean, default: false },
    isSystem: { type: Boolean, default: false }, // Built-in templates
    allowedRoles: [{ type: String }],

    // Metadata
    version: { type: Number, default: 1 },
    category: { type: String, index: true },
    tags: [{ type: String }],
    icon: { type: String },

    // Audit
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // Soft Delete
    isDeleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
importExportTemplateSchema.index({ module: 1, type: 1, isActive: 1 });
importExportTemplateSchema.index({ isPublic: 1, isActive: 1 });
importExportTemplateSchema.index({ createdBy: 1 });

// Pre-save: Generate slug
importExportTemplateSchema.pre('save', function (next) {
  if (!this.slug) {
    this.slug =
      this.name
        .toLowerCase()
        .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now().toString(36);
  }
  next();
});

// Static: Get templates for a module
importExportTemplateSchema.statics.getModuleTemplates = async function (module, userId) {
  return this.find({
    module,
    isActive: true,
    isDeleted: false,
    $or: [{ isPublic: true }, { isSystem: true }, { createdBy: userId }],
  }).sort({ isSystem: -1, usageCount: -1 });
};

// Static: Get system templates
importExportTemplateSchema.statics.getSystemTemplates = async function () {
  return this.find({ isSystem: true, isActive: true, isDeleted: false }).sort({
    module: 1,
    name: 1,
  });
};

module.exports = mongoose.models.ImportExportTemplate || mongoose.model('ImportExportTemplate', importExportTemplateSchema);
