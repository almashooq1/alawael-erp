/**
 * ReportTemplate — قالب التقرير
 * يحدد هيكل وإعدادات التقارير القابلة لإعادة الاستخدام
 */
const mongoose = require('mongoose');

const columnSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label_ar: { type: String, required: true },
    label_en: { type: String },
    data_type: {
      type: String,
      enum: ['string', 'number', 'date', 'boolean', 'currency', 'percentage'],
      default: 'string',
    },
    aggregation: {
      type: String,
      enum: ['none', 'sum', 'avg', 'min', 'max', 'count', 'count_distinct'],
      default: 'none',
    },
    format: { type: String }, // '#,##0.00' | 'YYYY-MM-DD' | إلخ
    width: { type: Number, default: 100 },
    visible: { type: Boolean, default: true },
    sortable: { type: Boolean, default: true },
  },
  { _id: false }
);

const filterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    label_ar: { type: String, required: true },
    type: {
      type: String,
      enum: ['text', 'number', 'date', 'date_range', 'select', 'multi_select', 'boolean'],
      default: 'text',
    },
    options: [{ value: mongoose.Schema.Types.Mixed, label_ar: String }], // للـ select
    required: { type: Boolean, default: false },
    default_value: mongoose.Schema.Types.Mixed,
  },
  { _id: false }
);

const reportTemplateSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name_ar: { type: String, required: true },
    name_en: { type: String },
    description_ar: { type: String },

    // تصنيف
    category: {
      type: String,
      required: true,
      enum: [
        'beneficiary', // تقارير المستفيدين
        'clinical', // تقارير سريرية
        'assessment', // تقارير التقييمات
        'financial', // تقارير مالية
        'hr', // تقارير الموارد البشرية
        'operational', // تقارير تشغيلية
        'transport', // تقارير النقل
        'quality', // تقارير الجودة
        'inventory', // تقارير المخزون
        'executive', // تقارير تنفيذية
        'custom', // تقارير مخصصة
      ],
    },

    // مصدر البيانات
    data_source: {
      collection: { type: String, required: true }, // اسم المجموعة في MongoDB
      pipeline: [mongoose.Schema.Types.Mixed], // Aggregation pipeline قابل للتخصيص
      lookup_collections: [String], // مجموعات إضافية للـ lookup
    },

    // الأعمدة والفلاتر
    columns: [columnSchema],
    filters: [filterSchema],
    default_sort: {
      field: String,
      direction: { type: String, enum: ['asc', 'desc'], default: 'desc' },
    },

    // التجميعات
    group_by: [String],
    chart_config: {
      type: {
        type: String,
        enum: ['bar', 'line', 'pie', 'doughnut', 'area', 'scatter', 'none'],
        default: 'none',
      },
      x_axis: String,
      y_axis: String,
      series: [String],
    },

    // الصلاحيات
    allowed_roles: [String], // ['admin', 'director', 'hr_manager', ...]
    allowed_branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
    is_public: { type: Boolean, default: false },

    // الإعدادات
    is_schedulable: { type: Boolean, default: true },
    supports_export: { type: Boolean, default: true },
    export_formats: {
      type: [String],
      enum: ['pdf', 'xlsx', 'csv', 'json'],
      default: ['pdf', 'xlsx', 'csv'],
    },
    max_rows: { type: Number, default: 10000 },

    is_active: { type: Boolean, default: true },
    is_system: { type: Boolean, default: false }, // قوالب النظام لا تُحذف
    version: { type: Number, default: 1 },

    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updated_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    deleted_at: { type: Date, default: null },
  },
  {
    timestamps: true,
    collection: 'report_templates',
  }
);

reportTemplateSchema.index({ category: 1, is_active: 1 });
reportTemplateSchema.index({ deleted_at: 1 });

// Soft delete
reportTemplateSchema.methods.softDelete = function (userId) {
  this.deleted_at = new Date();
  this.updated_by = userId;
  return this.save();
};

// استعلام افتراضي يستثني المحذوفة
reportTemplateSchema.pre(/^find/, function () {
  if (!this.getOptions().withDeleted) {
    this.where({ deleted_at: null });
  }
});

module.exports = mongoose.model('ReportTemplate', reportTemplateSchema);
