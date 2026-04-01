/**
 * QualityIndicator Model — نموذج مؤشرات الجودة
 * Rehab-ERP v2.0
 */

const mongoose = require('mongoose');

const qualityIndicatorSchema = new mongoose.Schema(
  {
    indicator_code: { type: String, unique: true }, // QI-XXX
    name_ar: { type: String, required: true, trim: true },
    name_en: { type: String, trim: true },
    description_ar: { type: String },
    description_en: { type: String },

    category: {
      type: String,
      enum: [
        'clinical_outcomes', // المخرجات السريرية
        'patient_safety', // سلامة المريض
        'service_efficiency', // كفاءة الخدمة
        'patient_satisfaction', // رضا المستفيد
        'staff_performance', // أداء الموظفين
        'financial', // مالي
        'operational', // تشغيلي
        'accreditation', // اعتماد (CARF/CBAHI)
      ],
      required: true,
    },

    measurement_type: {
      type: String,
      enum: ['percentage', 'rate', 'count', 'average', 'ratio', 'score', 'time'],
      default: 'percentage',
    },

    unit: { type: String }, // %, days, count, score...
    formula: { type: String }, // وصف المعادلة
    data_source: { type: String }, // مصدر البيانات

    // الأهداف
    target_value: { type: Number },
    minimum_acceptable: { type: Number },
    benchmark_value: { type: Number }, // المعيار الدولي

    direction: {
      type: String,
      enum: ['higher_better', 'lower_better', 'target_range'],
      default: 'higher_better',
    },

    // الجدول الزمني
    measurement_frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'],
      default: 'monthly',
    },

    is_active: { type: Boolean, default: true },
    is_mandatory: { type: Boolean, default: false }, // إلزامي بموجب اعتماد

    accreditation_standard: { type: String }, // رقم المعيار (CARF 2.A.1 مثلاً)

    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    deleted_at: { type: Date, default: null },
  },
  { timestamps: true }
);

qualityIndicatorSchema.index({ category: 1, is_active: 1 });
qualityIndicatorSchema.index({ measurement_frequency: 1 });
qualityIndicatorSchema.index({ deleted_at: 1 });

module.exports =
  mongoose.models.QualityIndicator || mongoose.model('QualityIndicator', qualityIndicatorSchema);
