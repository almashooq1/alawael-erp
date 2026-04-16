'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ─── Sub-schema ───────────────────────────────────────────────────────────────

const abcRecordSchema = new Schema(
  {
    timestamp: { type: Date, required: true, default: Date.now },
    setting: { type: String }, // البيئة (فصل، ساحة، عيادة)

    // Antecedent — السوابق
    antecedent: {
      category: {
        type: String,
        enum: [
          'demand_placed', // مطلب
          'transition', // انتقال
          'denied_access', // رفض الوصول
          'peer_interaction', // تفاعل أقران
          'alone', // وحده
          'attention_removed', // سحب انتباه
          'routine_change', // تغيير روتين
          'sensory_input', // مدخل حسي
          'waiting', // انتظار
          'task_difficulty', // صعوبة المهمة
          'other',
        ],
      },
      description_ar: { type: String, required: true },
    },

    // Behavior — السلوك
    behavior: {
      topography: { type: String, required: true }, // شكل السلوك
      category: {
        type: String,
        enum: [
          'aggression', // عدوان
          'self_injury', // إيذاء ذاتي
          'stereotypy', // نمطية
          'elopement', // هروب
          'property_destruction', // تدمير ممتلكات
          'tantrum', // نوبة غضب
          'non_compliance', // عدم امتثال
          'vocal_disruption', // إزعاج صوتي
          'pica', // أكل غير غذائي
          'other',
        ],
      },
      intensity: { type: Number, min: 1, max: 5 }, // 1-5 شدة
      duration_seconds: { type: Number }, // مدة السلوك
    },

    // Consequence — النتيجة
    consequence: {
      category: {
        type: String,
        enum: [
          'attention_given', // انتباه
          'demand_removed', // إزالة المطلب (هروب)
          'tangible_given', // حصول على ملموس
          'sensory_maintained', // تعزيز حسي ذاتي
          'redirected', // إعادة توجيه
          'ignored', // تجاهل
          'timeout', // وقت مستقطع
          'prompted', // تلقين
          'reinforced_alternative', // تعزيز بديل
          'other',
        ],
      },
      description_ar: { type: String },
      was_effective: { type: Boolean },
    },

    recorded_by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { _id: false }
);

// ─── Main Schema ──────────────────────────────────────────────────────────────

const ABCDataCollectionSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    collection_period: {
      start_date: { type: Date, required: true },
      end_date: { type: Date, required: true },
    },

    target_behaviors: [
      {
        name_ar: String,
        operational_definition_ar: String,
        measurement_type: {
          type: String,
          enum: ['frequency', 'duration', 'interval', 'latency', 'intensity'],
        },
      },
    ],

    records: [abcRecordSchema],

    // ── التحليل الوظيفي Functional Analysis Summary
    functional_analysis: {
      hypothesized_functions: [
        {
          function: {
            type: String,
            enum: ['attention', 'escape', 'tangible', 'sensory', 'multiple'],
          },
          function_ar: String,
          confidence: { type: Number, min: 0, max: 100 },
          evidence: String,
        },
      ],
      primary_function: {
        type: String,
        enum: ['attention', 'escape', 'tangible', 'sensory', 'multiple'],
      },
      primary_function_ar: String,

      // ── الأنماط المكتشفة
      patterns: {
        peak_times: [String],
        peak_settings: [String],
        common_antecedents: [String],
        common_consequences: [String],
        average_frequency_per_hour: Number,
        average_duration_seconds: Number,
        trend: { type: String, enum: ['increasing', 'decreasing', 'stable', 'variable'] },
      },

      // ── توصيات التدخل المبنية على الوظيفة
      function_based_interventions: [
        {
          strategy_ar: String,
          strategy_en: String,
          category: { type: String, enum: ['antecedent', 'teaching', 'consequence'] },
          priority: { type: String, enum: ['high', 'medium', 'low'] },
        },
      ],
    },

    status: { type: String, enum: ['active', 'completed', 'analyzed'], default: 'active' },
    analyst: { type: Schema.Types.ObjectId, ref: 'User' },
    supervisor: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, collection: 'abc_data_collections' }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

ABCDataCollectionSchema.index({ beneficiary: 1, 'collection_period.start_date': -1 });
ABCDataCollectionSchema.index({ branch: 1, status: 1, createdAt: -1 });

// ─── Static Methods ───────────────────────────────────────────────────────────

ABCDataCollectionSchema.statics.paginate = async function (filter = {}, options = {}) {
  const page = Math.max(1, options.page || 1);
  const limit = Math.min(100, Math.max(1, options.limit || 20));
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };
  const [docs, total] = await Promise.all([
    this.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    this.countDocuments(filter),
  ]);
  return {
    docs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
};

ABCDataCollectionSchema.statics.latestFor = function (beneficiaryId) {
  return this.findOne({ beneficiary: beneficiaryId, status: { $ne: 'deleted' } })
    .sort({ createdAt: -1 })
    .populate('analyst', 'name role')
    .lean();
};

// ─── Export ───────────────────────────────────────────────────────────────────

const ABCDataCollection =
  mongoose.models.ABCDataCollection || mongoose.model('ABCDataCollection', ABCDataCollectionSchema);

module.exports = ABCDataCollection;
