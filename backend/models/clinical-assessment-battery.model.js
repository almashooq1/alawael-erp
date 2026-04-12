/**
 * clinical-assessment-battery.model.js
 * ═══════════════════════════════════════════════════════════════
 * بطارية التقييم السريري الشاملة لمراكز تأهيل ذوي الإعاقة
 * Comprehensive Clinical Assessment Battery for Disability Rehab
 *
 * المقاييس المضافة (غير موجودة في النظام):
 *   1. M-CHAT-R/F  — فحص التوحد المبكر (16-30 شهر)
 *   2. Sensory Profile 2 — الملف الحسي (3-14 سنة)
 *   3. BRIEF-2 — الوظائف التنفيذية (5-18 سنة)
 *   4. SRS-2 — الاستجابة الاجتماعية (2.5-18 سنة)
 *   5. Portage Guide — النمو المبكر (0-6 سنوات)
 *   6. ABC Data Collection — جمع بيانات السلوك (ABA)
 *   7. Family Needs Survey — استبيان احتياجات الأسرة
 *   8. Quality of Life — جودة الحياة (WHOQOL-BREF)
 *   9. Transition Readiness — الجاهزية للانتقال
 *  10. Saudi Developmental Screening — الفحص النمائي السعودي
 *  11. Behavioral Function Assessment — تقييم وظيفة السلوك
 *  12. Caregiver Burden Scale — عبء مقدم الرعاية
 * ═══════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ╔══════════════════════════════════════════════════════════════╗
// ║  1. M-CHAT-R/F — Modified Checklist for Autism in Toddlers  ║
// ║     قائمة التحقق المعدلة للتوحد عند الأطفال الصغار          ║
// ╚══════════════════════════════════════════════════════════════╝

const mchatItemSchema = new Schema(
  {
    item_number: { type: Number, required: true, min: 1, max: 20 },
    question_ar: { type: String, required: true },
    question_en: { type: String },
    response: { type: Boolean, required: true }, // true=نعم, false=لا
    is_critical: { type: Boolean, default: false }, // البنود الحرجة (2,5,9,12,15,17,18,21)
    is_at_risk: { type: Boolean }, // هل الإجابة تشير لخطر؟
    followup_completed: { type: Boolean, default: false },
    followup_passed: { type: Boolean }, // اجتاز المتابعة؟
  },
  { _id: false }
);

const MChatAssessmentSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    age_months: { type: Number, required: true, min: 16, max: 30 },
    informant: { type: String, enum: ['mother', 'father', 'caregiver'], default: 'mother' },

    // ── البنود الـ 20
    items: {
      type: [mchatItemSchema],
      validate: { validator: v => v.length === 20, message: 'يجب الإجابة على جميع البنود الـ 20' },
    },

    // ── التسجيل
    total_risk_score: { type: Number, min: 0, max: 20 },
    critical_items_failed: { type: Number, min: 0, max: 8 },

    // ── مستوى الخطر
    risk_level: {
      type: String,
      enum: ['low', 'medium', 'high'],
      // low: 0-2, medium: 3-7, high: 8-20
    },
    risk_level_ar: { type: String },

    // ── المتابعة Follow-Up Interview (R/F)
    followup_completed: { type: Boolean, default: false },
    followup_score: { type: Number, min: 0, max: 20 },
    followup_risk_level: { type: String, enum: ['low', 'medium', 'high'] },

    // ── التوصيات التلقائية
    auto_recommendations: {
      referral_needed: { type: Boolean },
      referral_type: {
        type: String,
        enum: ['none', 'developmental_eval', 'autism_eval', 'early_intervention', 'comprehensive'],
      },
      urgency: { type: String, enum: ['routine', 'priority', 'urgent'] },
      suggested_assessments: [String],
      family_guidance_ar: { type: String },
    },

    status: {
      type: String,
      enum: ['draft', 'completed', 'reviewed', 'referred'],
      default: 'draft',
    },
    notes: { type: String },
  },
  { timestamps: true, collection: 'mchat_assessments' }
);

MChatAssessmentSchema.index({ beneficiary: 1, assessment_date: -1 });
MChatAssessmentSchema.index({ risk_level: 1, status: 1 });

// ╔══════════════════════════════════════════════════════════════╗
// ║  2. Sensory Profile 2 — الملف الحسي (Dunn's Model)          ║
// ║     أنماط المعالجة الحسية: بحث، تجنب، حساسية، تسجيل منخفض    ║
// ╚══════════════════════════════════════════════════════════════╝

const sensoryItemSchema = new Schema(
  {
    item_number: { type: Number, required: true },
    section: {
      type: String,
      enum: [
        'auditory',
        'visual',
        'touch',
        'movement',
        'body_position',
        'oral',
        'behavioral',
        'social_emotional',
      ],
      required: true,
    },
    question_ar: { type: String, required: true },
    question_en: { type: String },
    frequency: {
      type: Number,
      required: true,
      enum: [1, 2, 3, 4, 5], // 1=دائماً تقريباً, 2=كثيراً, 3=أحياناً, 4=نادراً, 5=أبداً تقريباً
    },
    quadrant: {
      type: String,
      enum: ['seeking', 'avoiding', 'sensitivity', 'registration'],
    },
  },
  { _id: false }
);

const SensoryProfileSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    age_months: { type: Number, required: true, min: 36, max: 168 }, // 3-14y
    respondent: { type: String, enum: ['parent', 'teacher', 'caregiver'], default: 'parent' },
    form_type: { type: String, enum: ['child', 'short', 'school_companion'], default: 'child' },

    items: [sensoryItemSchema],

    // ── درجات الأقسام الحسية Section Scores
    section_scores: {
      auditory: { raw: Number, classification: String },
      visual: { raw: Number, classification: String },
      touch: { raw: Number, classification: String },
      movement: { raw: Number, classification: String },
      body_position: { raw: Number, classification: String },
      oral: { raw: Number, classification: String },
      behavioral: { raw: Number, classification: String },
      social_emotional: { raw: Number, classification: String },
    },

    // ── درجات الأرباع الحسية Quadrant Scores (Dunn's Model)
    quadrant_scores: {
      seeking: {
        raw_score: Number,
        classification: {
          type: String,
          enum: ['much_less', 'less', 'just_like', 'more', 'much_more'],
        },
        classification_ar: String,
        percentile: Number,
      },
      avoiding: {
        raw_score: Number,
        classification: {
          type: String,
          enum: ['much_less', 'less', 'just_like', 'more', 'much_more'],
        },
        classification_ar: String,
        percentile: Number,
      },
      sensitivity: {
        raw_score: Number,
        classification: {
          type: String,
          enum: ['much_less', 'less', 'just_like', 'more', 'much_more'],
        },
        classification_ar: String,
        percentile: Number,
      },
      registration: {
        raw_score: Number,
        classification: {
          type: String,
          enum: ['much_less', 'less', 'just_like', 'more', 'much_more'],
        },
        classification_ar: String,
        percentile: Number,
      },
    },

    // ── الملف الحسي الكلي
    sensory_profile_summary: {
      dominant_quadrant: String,
      dominant_quadrant_ar: String,
      sensory_pattern_description_ar: String,
      environmental_modifications: [String],
      therapy_recommendations: [String],
      classroom_strategies: [String],
      home_strategies: [String],
    },

    status: { type: String, enum: ['draft', 'completed', 'reviewed'], default: 'draft' },
    notes: { type: String },
  },
  { timestamps: true, collection: 'sensory_profile_assessments' }
);

SensoryProfileSchema.index({ beneficiary: 1, assessment_date: -1 });

// ╔══════════════════════════════════════════════════════════════╗
// ║  3. BRIEF-2 — Behavior Rating of Executive Function         ║
// ║     تقييم الوظائف التنفيذية (انتباه، تخطيط، مرونة، تثبيط)    ║
// ╚══════════════════════════════════════════════════════════════╝

const briefItemSchema = new Schema(
  {
    item_number: { type: Number, required: true },
    scale: {
      type: String,
      enum: [
        'inhibit', // تثبيط
        'self_monitor', // مراقبة ذاتية
        'shift', // مرونة
        'emotional_control', // تحكم انفعالي
        'initiate', // مبادرة
        'working_memory', // ذاكرة عاملة
        'plan_organize', // تخطيط/تنظيم
        'task_monitor', // مراقبة المهام
        'organization_materials', // تنظيم المواد
      ],
    },
    question_ar: { type: String, required: true },
    question_en: { type: String },
    response: {
      type: Number,
      required: true,
      enum: [1, 2, 3], // 1=أبداً, 2=أحياناً, 3=دائماً
    },
  },
  { _id: false }
);

const BRIEFAssessmentSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    age_months: { type: Number, required: true, min: 60, max: 216 }, // 5-18y
    respondent: { type: String, enum: ['parent', 'teacher', 'self'], default: 'parent' },
    form_type: { type: String, enum: ['parent', 'teacher', 'self_report'], default: 'parent' },

    items: [briefItemSchema],

    // ── درجات السلالم الفرعية Scale Scores
    scale_scores: {
      inhibit: { raw: Number, t_score: Number, percentile: Number },
      self_monitor: { raw: Number, t_score: Number, percentile: Number },
      shift: { raw: Number, t_score: Number, percentile: Number },
      emotional_control: { raw: Number, t_score: Number, percentile: Number },
      initiate: { raw: Number, t_score: Number, percentile: Number },
      working_memory: { raw: Number, t_score: Number, percentile: Number },
      plan_organize: { raw: Number, t_score: Number, percentile: Number },
      task_monitor: { raw: Number, t_score: Number, percentile: Number },
      organization_materials: { raw: Number, t_score: Number, percentile: Number },
    },

    // ── المؤشرات المركبة Composite Indexes
    composite_scores: {
      // مؤشر التنظيم السلوكي BRI
      behavioral_regulation_index: { t_score: Number, percentile: Number, classification: String },
      // مؤشر التنظيم الانفعالي ERI
      emotion_regulation_index: { t_score: Number, percentile: Number, classification: String },
      // مؤشر التنظيم المعرفي CRI
      cognitive_regulation_index: { t_score: Number, percentile: Number, classification: String },
      // المؤشر التنفيذي الكلي GEC
      global_executive_composite: { t_score: Number, percentile: Number, classification: String },
    },

    // ── تصنيف الأداء
    // T-Score: < 60 = طبيعي، 60-64 = مرتفع قليلاً، 65-69 = مرتفع سريرياً، ≥ 70 = مرتفع جداً
    clinical_interpretation: {
      primary_concerns: [String],
      strengths: [String],
      intervention_recommendations: [String],
    },

    validity_indicators: {
      negativity: { score: Number, classification: String },
      inconsistency: { score: Number, classification: String },
      infrequency: { score: Number, classification: String },
      is_valid: { type: Boolean, default: true },
    },

    status: { type: String, enum: ['draft', 'completed', 'reviewed'], default: 'draft' },
    notes: { type: String },
  },
  { timestamps: true, collection: 'brief2_assessments' }
);

BRIEFAssessmentSchema.index({ beneficiary: 1, assessment_date: -1 });

// ╔══════════════════════════════════════════════════════════════╗
// ║  4. SRS-2 — Social Responsiveness Scale                     ║
// ║     مقياس الاستجابة الاجتماعية (كشف صعوبات التفاعل)          ║
// ╚══════════════════════════════════════════════════════════════╝

const SRS2AssessmentSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    age_months: { type: Number, required: true, min: 30, max: 216 },
    respondent: { type: String, enum: ['parent', 'teacher'], default: 'parent' },
    form_type: { type: String, enum: ['preschool', 'school_age', 'adult'], default: 'school_age' },

    items: [
      {
        item_number: { type: Number, required: true },
        subscale: {
          type: String,
          enum: [
            'social_awareness',
            'social_cognition',
            'social_communication',
            'social_motivation',
            'restricted_interests',
          ],
        },
        question_ar: String,
        response: { type: Number, enum: [1, 2, 3, 4] }, // 1=غير صحيح, 2=صحيح أحياناً, 3=صحيح غالباً, 4=صحيح دائماً تقريباً
        is_reversed: { type: Boolean, default: false },
      },
    ],

    // ── درجات السلالم الفرعية
    subscale_scores: {
      social_awareness: { raw: Number, t_score: Number },
      social_cognition: { raw: Number, t_score: Number },
      social_communication: { raw: Number, t_score: Number },
      social_motivation: { raw: Number, t_score: Number },
      restricted_interests: { raw: Number, t_score: Number },
    },

    // ── الدرجة الكلية SRS Total Score
    total_raw_score: { type: Number },
    total_t_score: { type: Number },

    // ── التصنيف
    // T≤59: طبيعي, 60-65: خفيف, 66-75: متوسط, ≥76: شديد
    severity_classification: {
      type: String,
      enum: ['within_normal', 'mild', 'moderate', 'severe'],
    },
    severity_classification_ar: String,

    // ── مؤشر DSM-5
    dsm5_compatible: {
      social_communication_deficits: { type: Boolean },
      restricted_repetitive_behaviors: { type: Boolean },
    },

    auto_recommendations: {
      social_skills_training: { type: Boolean },
      priority_areas: [String],
      suggested_interventions: [String],
    },

    status: { type: String, enum: ['draft', 'completed', 'reviewed'], default: 'draft' },
    notes: { type: String },
  },
  { timestamps: true, collection: 'srs2_assessments' }
);

SRS2AssessmentSchema.index({ beneficiary: 1, assessment_date: -1 });

// ╔══════════════════════════════════════════════════════════════╗
// ║  5. Portage Guide — دليل بورتاج للنمو المبكر (0-6 سنوات)    ║
// ║     586 مهارة عبر 6 مجالات نمائية                            ║
// ╚══════════════════════════════════════════════════════════════╝

const portageItemSchema = new Schema(
  {
    domain: {
      type: String,
      enum: ['infant_stimulation', 'socialization', 'language', 'self_help', 'cognitive', 'motor'],
      required: true,
    },
    age_range: { type: String, required: true }, // "0-1", "1-2", "2-3", "3-4", "4-5", "5-6"
    item_number: { type: Number, required: true },
    skill_ar: { type: String, required: true },
    skill_en: { type: String },
    achieved: { type: Boolean, default: false },
    emerging: { type: Boolean, default: false }, // ناشئة (يحاول لكن لم يتقن)
    attempted_date: { type: Date },
    mastery_date: { type: Date },
    teaching_strategy_ar: { type: String }, // إرشادات التدريب
    notes: { type: String },
  },
  { _id: false }
);

const PortageAssessmentSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    age_months: { type: Number, required: true, min: 0, max: 72 }, // 0-6 years

    items: [portageItemSchema],

    // ── ملخص المجالات
    domain_summaries: {
      infant_stimulation: {
        total_items: Number,
        achieved: Number,
        emerging: Number,
        percentage: Number,
        age_equivalent_months: Number,
        delay_months: Number,
      },
      socialization: {
        total_items: Number,
        achieved: Number,
        emerging: Number,
        percentage: Number,
        age_equivalent_months: Number,
        delay_months: Number,
      },
      language: {
        total_items: Number,
        achieved: Number,
        emerging: Number,
        percentage: Number,
        age_equivalent_months: Number,
        delay_months: Number,
      },
      self_help: {
        total_items: Number,
        achieved: Number,
        emerging: Number,
        percentage: Number,
        age_equivalent_months: Number,
        delay_months: Number,
      },
      cognitive: {
        total_items: Number,
        achieved: Number,
        emerging: Number,
        percentage: Number,
        age_equivalent_months: Number,
        delay_months: Number,
      },
      motor: {
        total_items: Number,
        achieved: Number,
        emerging: Number,
        percentage: Number,
        age_equivalent_months: Number,
        delay_months: Number,
      },
    },

    // ── تحليل النمو
    developmental_analysis: {
      overall_developmental_age_months: Number,
      overall_delay_months: Number,
      delay_percentage: Number,
      delay_severity: {
        type: String,
        enum: ['no_delay', 'mild', 'moderate', 'severe', 'profound'],
      },
      strongest_domain: String,
      weakest_domain: String,
      priority_goals: [String],
      recommended_programs: [String],
    },

    status: {
      type: String,
      enum: ['draft', 'in_progress', 'completed', 'reviewed'],
      default: 'draft',
    },
    notes: { type: String },
  },
  { timestamps: true, collection: 'portage_assessments' }
);

PortageAssessmentSchema.index({ beneficiary: 1, assessment_date: -1 });

// ╔══════════════════════════════════════════════════════════════╗
// ║  6. ABC Data Collection — جمع بيانات السلوك (ABA)           ║
// ║     تسجيل السوابق-السلوك-النتائج في الوقت الحقيقي           ║
// ╚══════════════════════════════════════════════════════════════╝

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

ABCDataCollectionSchema.index({ beneficiary: 1, 'collection_period.start_date': -1 });

// ╔══════════════════════════════════════════════════════════════╗
// ║  7. Family Needs Survey — استبيان احتياجات الأسرة             ║
// ║     قياس الاحتياجات والدعم المطلوب لأسر ذوي الإعاقة          ║
// ╚══════════════════════════════════════════════════════════════╝

const FamilyNeedsSurveySchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    respondent_name: { type: String, required: true },
    respondent_relationship: {
      type: String,
      enum: ['mother', 'father', 'sibling', 'grandparent', 'guardian', 'other'],
      required: true,
    },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },

    // ── 6 مجالات احتياج (35 بند)
    domains: {
      // 1. المعلومات Information Needs
      information_needs: {
        items: [
          {
            item_ar: String,
            need_level: { type: Number, enum: [1, 2, 3] }, // 1=لا أحتاج, 2=غير متأكد, 3=أحتاج بشدة
          },
        ],
        total_score: Number,
        priority_level: String,
      },
      // 2. الدعم الأسري Family & Social Support
      family_support: {
        items: [{ item_ar: String, need_level: { type: Number, enum: [1, 2, 3] } }],
        total_score: Number,
        priority_level: String,
      },
      // 3. الموارد المالية Financial Needs
      financial_needs: {
        items: [{ item_ar: String, need_level: { type: Number, enum: [1, 2, 3] } }],
        total_score: Number,
        priority_level: String,
      },
      // 4. شرح للآخرين Explaining to Others
      explaining_to_others: {
        items: [{ item_ar: String, need_level: { type: Number, enum: [1, 2, 3] } }],
        total_score: Number,
        priority_level: String,
      },
      // 5. رعاية الطفل Childcare
      childcare: {
        items: [{ item_ar: String, need_level: { type: Number, enum: [1, 2, 3] } }],
        total_score: Number,
        priority_level: String,
      },
      // 6. الدعم المهني Professional Support
      professional_support: {
        items: [{ item_ar: String, need_level: { type: Number, enum: [1, 2, 3] } }],
        total_score: Number,
        priority_level: String,
      },
    },

    total_needs_score: { type: Number },
    priority_domains: [String],

    // ── أسئلة مفتوحة
    open_questions: {
      greatest_concern_ar: String,
      most_helpful_service_ar: String,
      additional_needs_ar: String,
    },

    // ── خطة الاستجابة
    response_plan: {
      identified_needs: [
        {
          need_ar: String,
          domain: String,
          action_plan_ar: String,
          responsible: String,
          target_date: Date,
        },
      ],
      follow_up_date: Date,
    },

    status: { type: String, enum: ['draft', 'completed', 'action_planned'], default: 'draft' },
  },
  { timestamps: true, collection: 'family_needs_surveys' }
);

FamilyNeedsSurveySchema.index({ beneficiary: 1, assessment_date: -1 });

// ╔══════════════════════════════════════════════════════════════╗
// ║  8. Quality of Life Assessment — تقييم جودة الحياة           ║
// ║     مقتبس من WHOQOL-BREF + PedsQL مع تكييف عربي             ║
// ╚══════════════════════════════════════════════════════════════╝

const QualityOfLifeSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    respondent: {
      type: String,
      enum: ['self', 'parent_proxy', 'caregiver_proxy'],
      default: 'parent_proxy',
    },

    // ── 4 مجالات WHOQOL + مجال الإعاقة
    domains: {
      physical_health: {
        items: [
          {
            item_ar: String,
            item_en: String,
            score: { type: Number, min: 1, max: 5 }, // 1=سيء جداً -> 5=ممتاز
          },
        ],
        raw_score: Number,
        transformed_score: Number, // 0-100
      },
      psychological: {
        items: [{ item_ar: String, item_en: String, score: { type: Number, min: 1, max: 5 } }],
        raw_score: Number,
        transformed_score: Number,
      },
      social_relationships: {
        items: [{ item_ar: String, item_en: String, score: { type: Number, min: 1, max: 5 } }],
        raw_score: Number,
        transformed_score: Number,
      },
      environment: {
        items: [{ item_ar: String, item_en: String, score: { type: Number, min: 1, max: 5 } }],
        raw_score: Number,
        transformed_score: Number,
      },
      disability_specific: {
        items: [{ item_ar: String, item_en: String, score: { type: Number, min: 1, max: 5 } }],
        raw_score: Number,
        transformed_score: Number,
      },
    },

    overall_qol: { type: Number, min: 1, max: 5 },
    overall_health_satisfaction: { type: Number, min: 1, max: 5 },
    total_transformed_score: { type: Number }, // 0-100

    interpretation: {
      level: { type: String, enum: ['very_poor', 'poor', 'moderate', 'good', 'very_good'] },
      level_ar: String,
      strongest_domain: String,
      weakest_domain: String,
      improvement_areas: [String],
    },

    comparison_with_previous: {
      previous_id: { type: Schema.Types.ObjectId },
      previous_score: Number,
      change: Number,
      trend: { type: String, enum: ['improved', 'stable', 'declined'] },
      clinically_significant: Boolean,
    },

    status: { type: String, enum: ['draft', 'completed', 'reviewed'], default: 'draft' },
    notes: { type: String },
  },
  { timestamps: true, collection: 'quality_of_life_assessments' }
);

QualityOfLifeSchema.index({ beneficiary: 1, assessment_date: -1 });

// ╔══════════════════════════════════════════════════════════════╗
// ║  9. Transition Readiness Assessment — تقييم جاهزية الانتقال  ║
// ║     من المركز إلى التعليم/المجتمع/العمل                      ║
// ╚══════════════════════════════════════════════════════════════╝

const TransitionReadinessSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    transition_type: {
      type: String,
      enum: ['school', 'community', 'vocational', 'independent_living', 'mainstream_education'],
      required: true,
    },

    // ── 8 مجالات للجاهزية
    domains: {
      self_care: {
        skills: [{ skill_ar: String, level: { type: Number, min: 1, max: 5 }, notes: String }],
        score: Number,
        max_score: Number,
        percentage: Number,
        readiness: {
          type: String,
          enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'],
        },
      },
      communication: {
        skills: [{ skill_ar: String, level: { type: Number, min: 1, max: 5 }, notes: String }],
        score: Number,
        max_score: Number,
        percentage: Number,
        readiness: {
          type: String,
          enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'],
        },
      },
      social_skills: {
        skills: [{ skill_ar: String, level: { type: Number, min: 1, max: 5 }, notes: String }],
        score: Number,
        max_score: Number,
        percentage: Number,
        readiness: {
          type: String,
          enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'],
        },
      },
      academic_cognitive: {
        skills: [{ skill_ar: String, level: { type: Number, min: 1, max: 5 }, notes: String }],
        score: Number,
        max_score: Number,
        percentage: Number,
        readiness: {
          type: String,
          enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'],
        },
      },
      behavioral: {
        skills: [{ skill_ar: String, level: { type: Number, min: 1, max: 5 }, notes: String }],
        score: Number,
        max_score: Number,
        percentage: Number,
        readiness: {
          type: String,
          enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'],
        },
      },
      mobility_safety: {
        skills: [{ skill_ar: String, level: { type: Number, min: 1, max: 5 }, notes: String }],
        score: Number,
        max_score: Number,
        percentage: Number,
        readiness: {
          type: String,
          enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'],
        },
      },
      family_support: {
        skills: [{ skill_ar: String, level: { type: Number, min: 1, max: 5 }, notes: String }],
        score: Number,
        max_score: Number,
        percentage: Number,
        readiness: {
          type: String,
          enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'],
        },
      },
      environmental_readiness: {
        skills: [{ skill_ar: String, level: { type: Number, min: 1, max: 5 }, notes: String }],
        score: Number,
        max_score: Number,
        percentage: Number,
        readiness: {
          type: String,
          enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'],
        },
      },
    },

    overall_readiness: {
      total_score: Number,
      max_score: Number,
      percentage: Number,
      level: { type: String, enum: ['not_ready', 'developing', 'approaching', 'ready', 'exceeds'] },
      level_ar: String,
      estimated_readiness_date: Date,
    },

    transition_plan: {
      target_setting: String,
      target_date: Date,
      prerequisite_goals: [{ goal_ar: String, current_status: String, target_date: Date }],
      support_services_needed: [String],
      accommodations_needed: [String],
      responsible_team: [{ name: String, role: String }],
    },

    status: {
      type: String,
      enum: ['draft', 'completed', 'plan_created', 'in_transition', 'transitioned'],
      default: 'draft',
    },
    notes: { type: String },
  },
  { timestamps: true, collection: 'transition_readiness_assessments' }
);

TransitionReadinessSchema.index({ beneficiary: 1, transition_type: 1 });

// ╔══════════════════════════════════════════════════════════════╗
// ║ 10. Saudi Developmental Screening — الفحص النمائي السعودي    ║
// ║     مكيف ثقافياً للبيئة السعودية (0-6 سنوات)                ║
// ╚══════════════════════════════════════════════════════════════╝

const SaudiScreeningSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    age_months: { type: Number, required: true, min: 0, max: 72 },

    // ── 5 مجالات نمائية
    domains: {
      gross_motor: {
        items: [
          {
            age_band: String, // "0-3m", "3-6m", etc.
            milestone_ar: String,
            achieved: Boolean,
            concern: Boolean,
          },
        ],
        score: Number,
        age_equivalent_months: Number,
        delay_months: Number,
        status: { type: String, enum: ['on_track', 'monitor', 'concern', 'delay'] },
      },
      fine_motor: {
        items: [{ age_band: String, milestone_ar: String, achieved: Boolean, concern: Boolean }],
        score: Number,
        age_equivalent_months: Number,
        delay_months: Number,
        status: { type: String, enum: ['on_track', 'monitor', 'concern', 'delay'] },
      },
      language_communication: {
        items: [{ age_band: String, milestone_ar: String, achieved: Boolean, concern: Boolean }],
        score: Number,
        age_equivalent_months: Number,
        delay_months: Number,
        status: { type: String, enum: ['on_track', 'monitor', 'concern', 'delay'] },
      },
      cognitive: {
        items: [{ age_band: String, milestone_ar: String, achieved: Boolean, concern: Boolean }],
        score: Number,
        age_equivalent_months: Number,
        delay_months: Number,
        status: { type: String, enum: ['on_track', 'monitor', 'concern', 'delay'] },
      },
      social_emotional: {
        items: [{ age_band: String, milestone_ar: String, achieved: Boolean, concern: Boolean }],
        score: Number,
        age_equivalent_months: Number,
        delay_months: Number,
        status: { type: String, enum: ['on_track', 'monitor', 'concern', 'delay'] },
      },
    },

    // ── الأسئلة الإضافية (مخاوف الوالدين)
    parent_concerns: {
      has_concerns: Boolean,
      concern_areas: [String],
      concern_details_ar: String,
    },

    // ── علامات إنذار Red Flags
    red_flags: [
      {
        flag_ar: String,
        domain: String,
        severity: { type: String, enum: ['yellow', 'red'] }, // أصفر=مراقبة, أحمر=تحويل فوري
      },
    ],

    // ── النتيجة الكلية
    overall_result: {
      status: { type: String, enum: ['normal', 'at_risk', 'delayed', 'significantly_delayed'] },
      status_ar: String,
      domains_at_risk: [String],
      referral_needed: Boolean,
      referral_specialties: [String],
      rescreening_date: Date,
      recommendations_ar: [String],
    },

    status: { type: String, enum: ['draft', 'completed', 'referred'], default: 'draft' },
  },
  { timestamps: true, collection: 'saudi_developmental_screenings' }
);

SaudiScreeningSchema.index({ beneficiary: 1, assessment_date: -1 });

// ╔══════════════════════════════════════════════════════════════╗
// ║ 11. Behavioral Function Assessment — تقييم وظيفة السلوك     ║
// ║     FBA رسمي مع MAS + تحليل وظيفي + خطة BIP                ║
// ╚══════════════════════════════════════════════════════════════╝

const BehavioralFunctionSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bcba_supervisor: { type: Schema.Types.ObjectId, ref: 'User' },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },

    // ── السلوك المستهدف Target Behavior
    target_behavior: {
      name_ar: { type: String, required: true },
      operational_definition_ar: { type: String, required: true },
      topography: String,
      measurement_method: {
        type: String,
        enum: ['frequency', 'duration', 'interval', 'latency', 'intensity'],
      },
      baseline_data: {
        average_frequency: Number,
        average_duration_minutes: Number,
        average_intensity: Number,
        data_collection_days: Number,
      },
    },

    // ── MAS — Motivation Assessment Scale (مقياس تقييم الدافعية)
    motivation_assessment: {
      items: [
        {
          item_number: Number,
          question_ar: String,
          function_category: { type: String, enum: ['sensory', 'escape', 'attention', 'tangible'] },
          score: { type: Number, min: 0, max: 6 }, // 0=أبداً -> 6=دائماً
        },
      ],
      function_scores: {
        sensory: { mean: Number, rank: Number },
        escape: { mean: Number, rank: Number },
        attention: { mean: Number, rank: Number },
        tangible: { mean: Number, rank: Number },
      },
      primary_function: {
        type: String,
        enum: ['sensory', 'escape', 'attention', 'tangible', 'multiple'],
      },
      primary_function_ar: String,
    },

    // ── المقابلات والملاحظات Indirect & Direct Assessment
    indirect_assessment: {
      informants: [{ name: String, role: String, date: Date }],
      setting_events: [String],
      antecedent_summary: [String],
      consequence_summary: [String],
    },

    direct_observation: {
      observation_sessions: [
        {
          date: Date,
          duration_minutes: Number,
          setting: String,
          frequency: Number,
          antecedents_observed: [String],
          consequences_observed: [String],
        },
      ],
      abc_data_ref: { type: Schema.Types.ObjectId, ref: 'ABCDataCollection' },
    },

    // ── الفرضية Hypothesis Statement
    hypothesis: {
      statement_ar: { type: String },
      // "عندما [السوابق]، يقوم [المستفيد] بـ [السلوك]، لأنه يحصل على [الوظيفة]"
      antecedent_ar: String,
      behavior_ar: String,
      function_ar: String,
      confidence_level: { type: Number, min: 0, max: 100 },
      alternative_hypotheses: [{ statement_ar: String, confidence: Number }],
    },

    // ── خطة التدخل السلوكي BIP — Behavior Intervention Plan
    behavior_intervention_plan: {
      // استراتيجيات وقائية (تعديل البيئة)
      antecedent_strategies: [
        {
          strategy_ar: String,
          rationale_ar: String,
          implementation_steps: [String],
        },
      ],
      // تدريس مهارات بديلة (FCT, DRA)
      replacement_behaviors: [
        {
          behavior_ar: String,
          teaching_method: {
            type: String,
            enum: ['FCT', 'DRA', 'DRI', 'DRO', 'modeling', 'shaping', 'chaining'],
          },
          teaching_steps: [String],
          mastery_criteria: String,
        },
      ],
      // استراتيجيات تعزيز
      reinforcement_strategies: [
        {
          type: {
            type: String,
            enum: ['positive', 'negative', 'token', 'social', 'activity', 'natural'],
          },
          description_ar: String,
          schedule: { type: String, enum: ['continuous', 'FR', 'VR', 'FI', 'VI'] },
          schedule_value: Number,
        },
      ],
      // استراتيجيات الأزمات
      crisis_management: {
        de_escalation_steps: [String],
        safety_procedures: [String],
        emergency_contacts: [{ name: String, phone: String, role: String }],
      },
      // أهداف قابلة للقياس
      goals: [
        {
          goal_ar: String,
          target_level: String,
          measurement_method: String,
          review_date: Date,
        },
      ],
    },

    status: {
      type: String,
      enum: ['draft', 'assessment_complete', 'bip_active', 'reviewed', 'closed'],
      default: 'draft',
    },
  },
  { timestamps: true, collection: 'behavioral_function_assessments' }
);

BehavioralFunctionSchema.index({ beneficiary: 1, assessment_date: -1 });

// ╔══════════════════════════════════════════════════════════════╗
// ║ 12. Caregiver Burden Scale — مقياس عبء مقدم الرعاية         ║
// ║     معدّل عن Zarit Burden Interview (22 بند)                ║
// ╚══════════════════════════════════════════════════════════════╝

const CaregiverBurdenSchema = new Schema(
  {
    beneficiary: { type: Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    caregiver_name: { type: String, required: true },
    caregiver_relationship: {
      type: String,
      enum: [
        'mother',
        'father',
        'spouse',
        'sibling',
        'grandparent',
        'other_relative',
        'professional_caregiver',
      ],
      required: true,
    },
    assessor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    branch: { type: Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },

    // ── بنود المقياس (22 بند - مقياس زاريت المعدل)
    items: [
      {
        item_number: { type: Number, required: true },
        question_ar: { type: String, required: true },
        dimension: {
          type: String,
          enum: ['personal_strain', 'role_strain', 'guilt', 'impact_on_health', 'financial_impact'],
        },
        score: {
          type: Number,
          required: true,
          enum: [0, 1, 2, 3, 4], // 0=أبداً, 1=نادراً, 2=أحياناً, 3=غالباً, 4=دائماً تقريباً
        },
      },
    ],

    // ── الدرجات
    dimension_scores: {
      personal_strain: { score: Number, max: Number, percentage: Number },
      role_strain: { score: Number, max: Number, percentage: Number },
      guilt: { score: Number, max: Number, percentage: Number },
      impact_on_health: { score: Number, max: Number, percentage: Number },
      financial_impact: { score: Number, max: Number, percentage: Number },
    },

    total_score: { type: Number, min: 0, max: 88 },

    // ── التفسير
    // 0-20: عبء قليل أو معدوم, 21-40: خفيف-متوسط, 41-60: متوسط-شديد, 61-88: شديد
    burden_level: {
      type: String,
      enum: ['little_or_no', 'mild_moderate', 'moderate_severe', 'severe'],
    },
    burden_level_ar: String,

    // ── توصيات الدعم
    support_recommendations: {
      respite_care: { needed: Boolean, recommended_hours_weekly: Number },
      counseling: { needed: Boolean, type: String },
      support_group: { needed: Boolean },
      training: { needed: Boolean, topics: [String] },
      financial_assistance: { needed: Boolean },
      home_modification: { needed: Boolean },
      medical_referral: { needed: Boolean, specialty: String },
    },

    comparison_with_previous: {
      previous_id: Schema.Types.ObjectId,
      previous_score: Number,
      change: Number,
      trend: { type: String, enum: ['improved', 'stable', 'worsened'] },
    },

    status: { type: String, enum: ['draft', 'completed', 'reviewed'], default: 'draft' },
    notes: { type: String },
  },
  { timestamps: true, collection: 'caregiver_burden_assessments' }
);

CaregiverBurdenSchema.index({ beneficiary: 1, assessment_date: -1 });

// ═══════════════════════════════════════════════════════════════
// PRE-SAVE HOOKS — حفظ تلقائي للحقول المحسوبة والتصنيفات
// ═══════════════════════════════════════════════════════════════

// ── M-CHAT: تصنيف مستوى الخطر تلقائياً ──
MChatAssessmentSchema.pre('save', function (next) {
  if (typeof this.total_risk_score === 'number' && !this.risk_level) {
    if (this.total_risk_score <= 2) this.risk_level = 'low';
    else if (this.total_risk_score <= 7) this.risk_level = 'medium';
    else this.risk_level = 'high';
  }
  if (this.risk_level === 'low') this.risk_level_ar = 'منخفض';
  else if (this.risk_level === 'medium') this.risk_level_ar = 'متوسط';
  else if (this.risk_level === 'high') this.risk_level_ar = 'مرتفع';
  next();
});

// ── SRS-2: تصنيف شدة تلقائي ──
SRS2AssessmentSchema.pre('save', function (next) {
  if (typeof this.total_t_score === 'number' && !this.severity_classification) {
    const t = this.total_t_score;
    if (t <= 59) {
      this.severity_classification = 'within_normal';
      this.severity_classification_ar = 'ضمن الحدود الطبيعية';
    } else if (t <= 65) {
      this.severity_classification = 'mild';
      this.severity_classification_ar = 'خفيف';
    } else if (t <= 75) {
      this.severity_classification = 'moderate';
      this.severity_classification_ar = 'متوسط';
    } else {
      this.severity_classification = 'severe';
      this.severity_classification_ar = 'شديد';
    }
  }
  next();
});

// ── Caregiver Burden: تصنيف العبء تلقائياً ──
CaregiverBurdenSchema.pre('save', function (next) {
  if (typeof this.total_score === 'number' && !this.burden_level) {
    const s = this.total_score;
    if (s <= 20) {
      this.burden_level = 'little_or_no';
      this.burden_level_ar = 'عبء قليل أو معدوم';
    } else if (s <= 40) {
      this.burden_level = 'mild_to_moderate';
      this.burden_level_ar = 'عبء خفيف إلى متوسط';
    } else if (s <= 60) {
      this.burden_level = 'moderate_to_severe';
      this.burden_level_ar = 'عبء متوسط إلى شديد';
    } else {
      this.burden_level = 'severe';
      this.burden_level_ar = 'عبء شديد';
    }
  }
  next();
});

// ── Quality of Life: تفسير تلقائي ──
QualityOfLifeSchema.pre('save', function (next) {
  if (typeof this.total_transformed_score === 'number' && !this.interpretation) {
    const s = this.total_transformed_score;
    if (s >= 80) this.interpretation = 'جودة حياة ممتازة';
    else if (s >= 60) this.interpretation = 'جودة حياة جيدة';
    else if (s >= 40) this.interpretation = 'جودة حياة متوسطة';
    else if (s >= 20) this.interpretation = 'جودة حياة منخفضة';
    else this.interpretation = 'جودة حياة متدنية جداً';
  }
  next();
});

// ═══════════════════════════════════════════════════════════════
// VIRTUAL FIELDS — حقول محسوبة ديناميكياً
// ═══════════════════════════════════════════════════════════════

MChatAssessmentSchema.virtual('risk_summary').get(function () {
  return `${this.risk_level_ar || this.risk_level} (${this.total_risk_score}/20, ${this.critical_items_failed} بنود حرجة)`;
});

SRS2AssessmentSchema.virtual('severity_summary').get(function () {
  return `${this.severity_classification_ar || this.severity_classification} — T=${this.total_t_score}`;
});

CaregiverBurdenSchema.virtual('burden_summary').get(function () {
  return `${this.burden_level_ar || this.burden_level} (${this.total_score}/88)`;
});

// ── toJSON virtuals ──
[MChatAssessmentSchema, SRS2AssessmentSchema, CaregiverBurdenSchema, QualityOfLifeSchema].forEach(
  s => {
    s.set('toJSON', { virtuals: true });
    s.set('toObject', { virtuals: true });
  }
);

// ═══════════════════════════════════════════════════════════════
// ADDITIONAL COMPOUND INDEXES — فهارس مركّبة للأداء
// ═══════════════════════════════════════════════════════════════

MChatAssessmentSchema.index({ branch: 1, status: 1, createdAt: -1 });
SensoryProfileSchema.index({ branch: 1, status: 1, createdAt: -1 });
BRIEFAssessmentSchema.index({ branch: 1, status: 1, createdAt: -1 });
SRS2AssessmentSchema.index({ branch: 1, status: 1, createdAt: -1 });
PortageAssessmentSchema.index({ branch: 1, status: 1, createdAt: -1 });
ABCDataCollectionSchema.index({ branch: 1, status: 1, createdAt: -1 });
FamilyNeedsSurveySchema.index({ branch: 1, status: 1, createdAt: -1 });
QualityOfLifeSchema.index({ branch: 1, status: 1, createdAt: -1 });
TransitionReadinessSchema.index({ branch: 1, status: 1, createdAt: -1 });
SaudiScreeningSchema.index({ branch: 1, status: 1, createdAt: -1 });
BehavioralFunctionSchema.index({ branch: 1, status: 1, createdAt: -1 });
CaregiverBurdenSchema.index({ branch: 1, status: 1, createdAt: -1 });

// ── Text search ──
MChatAssessmentSchema.index({ notes: 'text' });
SRS2AssessmentSchema.index({ notes: 'text' });
BehavioralFunctionSchema.index({ notes: 'text', 'target_behavior.description': 'text' });

// ═══════════════════════════════════════════════════════════════
// STATIC METHODS — توابع ثابتة للاستعلام المتقدم
// ═══════════════════════════════════════════════════════════════

// كل النماذج: جلب بصفحات
const addPaginationStatic = schema => {
  schema.statics.paginate = async function (filter = {}, options = {}) {
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
};

// كل النماذج: جلب آخر تقييم لمستفيد
const addLatestForBeneficiaryStatic = schema => {
  schema.statics.latestFor = function (beneficiaryId) {
    return this.findOne({ beneficiary: beneficiaryId, status: { $ne: 'deleted' } })
      .sort({ createdAt: -1 })
      .populate('assessor', 'name role')
      .lean();
  };
};

[
  MChatAssessmentSchema,
  SensoryProfileSchema,
  BRIEFAssessmentSchema,
  SRS2AssessmentSchema,
  PortageAssessmentSchema,
  ABCDataCollectionSchema,
  FamilyNeedsSurveySchema,
  QualityOfLifeSchema,
  TransitionReadinessSchema,
  SaudiScreeningSchema,
  BehavioralFunctionSchema,
  CaregiverBurdenSchema,
].forEach(s => {
  addPaginationStatic(s);
  addLatestForBeneficiaryStatic(s);
});

// ═══════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════

module.exports = {
  MChatAssessment:
    mongoose.models.MChatAssessment || mongoose.model('MChatAssessment', MChatAssessmentSchema),
  SensoryProfileAssessment:
    mongoose.models.SensoryProfileAssessment ||
    mongoose.model('SensoryProfileAssessment', SensoryProfileSchema),
  BRIEF2Assessment:
    mongoose.models.BRIEF2Assessment || mongoose.model('BRIEF2Assessment', BRIEFAssessmentSchema),
  SRS2Assessment:
    mongoose.models.SRS2Assessment || mongoose.model('SRS2Assessment', SRS2AssessmentSchema),
  PortageAssessment:
    mongoose.models.PortageAssessment ||
    mongoose.model('PortageAssessment', PortageAssessmentSchema),
  ABCDataCollection:
    mongoose.models.ABCDataCollection ||
    mongoose.model('ABCDataCollection', ABCDataCollectionSchema),
  FamilyNeedsSurvey:
    mongoose.models.FamilyNeedsSurvey ||
    mongoose.model('FamilyNeedsSurvey', FamilyNeedsSurveySchema),
  QualityOfLifeAssessment:
    mongoose.models.QualityOfLifeAssessment ||
    mongoose.model('QualityOfLifeAssessment', QualityOfLifeSchema),
  TransitionReadinessAssessment:
    mongoose.models.TransitionReadinessAssessment ||
    mongoose.model('TransitionReadinessAssessment', TransitionReadinessSchema),
  SaudiDevelopmentalScreening:
    mongoose.models.SaudiDevelopmentalScreening ||
    mongoose.model('SaudiDevelopmentalScreening', SaudiScreeningSchema),
  BehavioralFunctionAssessment:
    mongoose.models.BehavioralFunctionAssessment ||
    mongoose.model('BehavioralFunctionAssessment', BehavioralFunctionSchema),
  CaregiverBurdenAssessment:
    mongoose.models.CaregiverBurdenAssessment ||
    mongoose.model('CaregiverBurdenAssessment', CaregiverBurdenSchema),
};
