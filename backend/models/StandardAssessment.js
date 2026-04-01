/**
 * StandardAssessment.js
 * نماذج أدوات التقييم المعيارية المعتمدة دولياً
 * VABS-3, CARS-2, PEP-3, ICF, Bayley-4, ABAS-3
 * مع التصحيح التلقائي والتفسير المعياري
 */

const mongoose = require('mongoose');

// ══════════════════════════════════════════════════════════════
// 1. VABS-3 — Vineland Adaptive Behavior Scales (مقياس فينلاند)
// ══════════════════════════════════════════════════════════════
const vabsItemSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      enum: ['communication', 'daily_living', 'socialization', 'motor', 'maladaptive'],
      required: true,
    },
    subdomain: { type: String, required: true },
    item_number: { type: Number, required: true },
    item_text_ar: { type: String, required: true },
    item_text_en: { type: String },
    response: {
      type: Number,
      enum: [0, 1, 2], // 0=لا يفعل أبداً, 1=أحياناً, 2=يفعل دائماً
      required: true,
    },
    dkn: { type: Boolean, default: false }, // لا يعرف/غير قابل للتطبيق
  },
  { _id: false }
);

const vabsAssessmentSchema = new mongoose.Schema(
  {
    beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    chronological_age_months: { type: Number, required: true },
    informant_relationship: {
      type: String,
      enum: ['parent', 'teacher', 'caregiver', 'therapist', 'self'],
      default: 'parent',
    },
    form_type: {
      type: String,
      enum: ['interview', 'parent_caregiver', 'teacher'],
      default: 'interview',
    },
    items: [vabsItemSchema],

    // ── الدرجات الخام Raw Scores
    raw_scores: {
      communication: { type: Number },
      daily_living: { type: Number },
      socialization: { type: Number },
      motor: { type: Number },
    },

    // ── الدرجات المعيارية Standard Scores (M=100, SD=15)
    standard_scores: {
      communication: { type: Number },
      daily_living: { type: Number },
      socialization: { type: Number },
      motor: { type: Number },
      adaptive_behavior_composite: { type: Number },
    },

    // ── الرتب المئينية Percentile Ranks
    percentile_ranks: {
      communication: { type: Number },
      daily_living: { type: Number },
      socialization: { type: Number },
      motor: { type: Number },
      composite: { type: Number },
    },

    // ── الأعمار التكيفية Adaptive Age Equivalents
    age_equivalents: {
      communication: { type: String }, // e.g. "4 سنوات 2 أشهر"
      daily_living: { type: String },
      socialization: { type: String },
      motor: { type: String },
    },

    // ── مستوى الأداء التكيفي Adaptive Level
    adaptive_levels: {
      communication: {
        type: String,
        enum: ['high', 'moderately_high', 'adequate', 'moderately_low', 'low'],
      },
      daily_living: {
        type: String,
        enum: ['high', 'moderately_high', 'adequate', 'moderately_low', 'low'],
      },
      socialization: {
        type: String,
        enum: ['high', 'moderately_high', 'adequate', 'moderately_low', 'low'],
      },
      motor: {
        type: String,
        enum: ['high', 'moderately_high', 'adequate', 'moderately_low', 'low'],
      },
    },

    // ── تفسير الدرجة المركبة
    composite_interpretation: {
      level: {
        type: String,
        enum: ['high', 'moderately_high', 'adequate', 'moderately_low', 'low'],
      },
      description_ar: { type: String },
      strengths: [{ type: String }],
      needs: [{ type: String }],
    },

    // ── توصيات تلقائية
    auto_recommendations: [
      {
        domain: String,
        priority: { type: String, enum: ['high', 'medium', 'low'] },
        recommendation_ar: String,
        suggested_goals: [String],
      },
    ],

    status: {
      type: String,
      enum: ['draft', 'completed', 'reviewed', 'approved'],
      default: 'draft',
    },
    reviewed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    review_date: { type: Date },
    notes: { type: String },
  },
  {
    timestamps: true,
    collection: 'vabs_assessments',
  }
);

vabsAssessmentSchema.index({ beneficiary_id: 1, assessment_date: -1 });
vabsAssessmentSchema.index({ branch_id: 1, status: 1 });

// ══════════════════════════════════════════════════════════════
// 2. CARS-2 — Childhood Autism Rating Scale (مقياس تقييم التوحد)
// ══════════════════════════════════════════════════════════════
const cars2ItemSchema = new mongoose.Schema(
  {
    item_number: { type: Number, required: true },
    item_name_ar: { type: String, required: true },
    item_name_en: { type: String },
    score: {
      type: Number,
      enum: [1, 1.5, 2, 2.5, 3, 3.5, 4], // CARS-2 scoring
      required: true,
    },
    behavioral_description: { type: String }, // وصف السلوك الملاحظ
    observation_notes: { type: String },
  },
  { _id: false }
);

const cars2AssessmentSchema = new mongoose.Schema(
  {
    beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    form_used: {
      type: String,
      enum: ['ST', 'HF'], // Standard (ST) أو High Functioning (HF)
      default: 'ST',
    },
    chronological_age_months: { type: Number, required: true },

    // ── البنود الـ 15 لمقياس CARS-2
    items: {
      type: [cars2ItemSchema],
      validate: {
        validator: function (items) {
          return items.length === 15;
        },
        message: 'يجب تقييم جميع البنود الـ 15',
      },
    },

    // ── الدرجة الكلية Total Score
    total_score: { type: Number, min: 15, max: 60 },

    // ── التصنيف Classification
    classification: {
      type: String,
      enum: ['no_autism', 'mild_moderate', 'severe'],
      // ST: <30=لا توحد, 30-36=خفيف-متوسط, >36=شديد
      // HF: <27.5=لا توحد, 27.5-34=خفيف-متوسط, >34=شديد
    },

    classification_ar: { type: String },

    // ── درجة T المعيارية
    t_score: { type: Number },
    percentile: { type: Number },

    // ── تحليل الأنماط
    pattern_analysis: {
      sensory_items_avg: { type: Number },
      social_items_avg: { type: Number },
      behavioral_items_avg: { type: Number },
      communication_items_avg: { type: Number },
      highest_concern_items: [{ item_number: Number, item_name_ar: String, score: Number }],
      profile_description_ar: { type: String },
    },

    // ── توصيات بناءً على النتيجة
    recommendations: {
      diagnosis_recommendation: { type: String },
      intervention_priority_areas: [{ type: String }],
      suggested_assessments: [{ type: String }],
      family_guidance: { type: String },
    },

    status: {
      type: String,
      enum: ['draft', 'completed', 'reviewed', 'approved'],
      default: 'draft',
    },
    notes: { type: String },
  },
  {
    timestamps: true,
    collection: 'cars2_assessments',
  }
);

cars2AssessmentSchema.index({ beneficiary_id: 1, assessment_date: -1 });

// ══════════════════════════════════════════════════════════════
// 3. PEP-3 — Psychoeducational Profile (الملف التعليمي النفسي)
// ══════════════════════════════════════════════════════════════
const pep3ItemSchema = new mongoose.Schema(
  {
    subtest: {
      type: String,
      enum: [
        'cognitive_verbal',
        'expressive_language',
        'receptive_language',
        'fine_motor',
        'gross_motor',
        'visual_motor_imitation',
        'affective_expression',
        'social_reciprocity',
        'motor_characteristics',
        'verbal_nonverbal',
      ],
      required: true,
    },
    item_number: { type: Number, required: true },
    item_description_ar: { type: String, required: true },
    response: {
      type: String,
      enum: ['pass', 'emerging', 'fail'],
      // اجتاز (2) / ناشئ/بروز (1) / فشل (0)
      required: true,
    },
    score: { type: Number, enum: [0, 1, 2] },
  },
  { _id: false }
);

const pep3AssessmentSchema = new mongoose.Schema(
  {
    beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    chronological_age_months: { type: Number, required: true }, // 2-7.5 years

    items: [pep3ItemSchema],

    // ── الدرجات الخام لكل اختبار فرعي
    raw_scores: {
      cognitive_verbal: { type: Number },
      expressive_language: { type: Number },
      receptive_language: { type: Number },
      fine_motor: { type: Number },
      gross_motor: { type: Number },
      visual_motor_imitation: { type: Number },
      affective_expression: { type: Number },
      social_reciprocity: { type: Number },
      motor_characteristics: { type: Number },
      verbal_nonverbal: { type: Number },
    },

    // ── الدرجات المعيارية
    scaled_scores: {
      cognitive_verbal: { type: Number },
      language: { type: Number }, // مجمّع
      motor: { type: Number }, // مجمّع
      maladaptive_behavior: { type: Number },
    },

    // ── الأعمار التطورية Developmental Ages
    developmental_ages: {
      cognitive_verbal: { type: String },
      expressive_language: { type: String },
      receptive_language: { type: String },
      fine_motor: { type: String },
      gross_motor: { type: String },
      visual_motor_imitation: { type: String },
    },

    // ── ملف الأداء الفردي (القوة والبروز والضعف)
    performance_profile: {
      strengths: [{ subtest: String, description_ar: String }],
      emerging_skills: [
        { subtest: String, description_ar: String, suggested_activities: [String] },
      ],
      areas_of_need: [{ subtest: String, description_ar: String, priority: String }],
    },

    // ── توصيات تعليمية تأهيلية مباشرة
    educational_recommendations: [
      {
        area: String,
        teaching_strategy_ar: String,
        suggested_materials: [String],
        home_activities: [String],
      },
    ],

    status: {
      type: String,
      enum: ['draft', 'completed', 'reviewed', 'approved'],
      default: 'draft',
    },
    notes: { type: String },
  },
  {
    timestamps: true,
    collection: 'pep3_assessments',
  }
);

pep3AssessmentSchema.index({ beneficiary_id: 1, assessment_date: -1 });

// ══════════════════════════════════════════════════════════════
// 4. ICF — International Classification of Functioning
//    التصنيف الدولي للوظائف والإعاقة والصحة
// ══════════════════════════════════════════════════════════════
const icfCodeSchema = new mongoose.Schema(
  {
    code: { type: String, required: true }, // e.g. "d310"
    title_ar: { type: String, required: true },
    title_en: { type: String },
    component: {
      type: String,
      enum: [
        'body_functions',
        'body_structures',
        'activities_participation',
        'environmental_factors',
      ],
      required: true,
    },
    chapter: { type: String },
    qualifier_performance: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 8, 9],
      // 0=لا إعاقة, 1=خفيفة, 2=متوسطة, 3=شديدة, 4=كاملة, 8=غير محدد, 9=غير قابل للتطبيق
    },
    qualifier_capacity: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 8, 9],
    },
    barrier_facilitator: {
      // للعوامل البيئية فقط
      type: String,
      enum: ['barrier', 'facilitator', 'not_applicable'],
    },
    notes: { type: String },
    rehabilitation_goal_linked: { type: String },
  },
  { _id: false }
);

const icfAssessmentSchema = new mongoose.Schema(
  {
    beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    assessment_date: { type: Date, default: Date.now },
    assessment_purpose: { type: String }, // غرض التقييم

    // ── وظائف الجسم (b codes)
    body_functions: [icfCodeSchema],

    // ── بنى الجسم (s codes)
    body_structures: [icfCodeSchema],

    // ── الأنشطة والمشاركة (d codes)
    activities_participation: [icfCodeSchema],

    // ── العوامل البيئية (e codes)
    environmental_factors: [icfCodeSchema],

    // ── ملخص الصورة الوظيفية
    functioning_profile: {
      main_disabilities: [{ type: String }],
      main_barriers: [{ type: String }],
      main_facilitators: [{ type: String }],
      participation_restrictions: [{ type: String }],
      functional_summary_ar: { type: String },
    },

    // ── الأهداف التأهيلية المرتبطة بالـ ICF
    rehabilitation_goals_icf: [
      {
        icf_code: String,
        icf_title_ar: String,
        goal_ar: String,
        target_qualifier: Number,
        timeline_weeks: Number,
        responsible_therapist_type: {
          type: String,
          enum: ['special_ed', 'speech', 'ot', 'pt', 'psychology', 'social_work'],
        },
      },
    ],

    status: {
      type: String,
      enum: ['draft', 'completed', 'reviewed', 'approved'],
      default: 'draft',
    },
  },
  {
    timestamps: true,
    collection: 'icf_assessments',
  }
);

icfAssessmentSchema.index({ beneficiary_id: 1, assessment_date: -1 });

// ══════════════════════════════════════════════════════════════
// 5. Developmental Milestones Tracker (متتبع معالم التطور)
// ══════════════════════════════════════════════════════════════
const milestoneSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      enum: [
        'gross_motor',
        'fine_motor',
        'language_receptive',
        'language_expressive',
        'cognitive',
        'social_emotional',
        'self_care',
        'play',
      ],
      required: true,
    },
    expected_age_months: { type: Number, required: true },
    milestone_ar: { type: String, required: true },
    milestone_en: { type: String },
    status: {
      type: String,
      enum: ['achieved', 'emerging', 'not_achieved', 'not_assessed'],
      default: 'not_assessed',
    },
    achieved_at_age_months: { type: Number }, // العمر عند الإنجاز الفعلي
    achievement_date: { type: Date },
    notes: { type: String },
  },
  { _id: false }
);

const developmentalMilestonesSchema = new mongoose.Schema(
  {
    beneficiary_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      unique: true,
    },
    assessor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    branch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    last_updated: { type: Date, default: Date.now },

    milestones: [milestoneSchema],

    // ── ملخص التطور
    developmental_summary: {
      overall_developmental_age_months: { type: Number },
      developmental_quotient: { type: Number }, // DQ = (DevAge/ChronoAge) × 100
      profile_description_ar: { type: String },
      domains_on_track: [{ type: String }],
      domains_delayed: [
        {
          domain: String,
          delay_months: Number, // الفارق عن المعدل الطبيعي
          severity: { type: String, enum: ['mild', 'moderate', 'severe'] },
        },
      ],
    },

    // ── منحنى التطور عبر الزمن
    progress_snapshots: [
      {
        snapshot_date: Date,
        domains_scores: {
          gross_motor: Number,
          fine_motor: Number,
          language_receptive: Number,
          language_expressive: Number,
          cognitive: Number,
          social_emotional: Number,
          self_care: Number,
          play: Number,
        },
        overall_score: Number,
        notes: String,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'developmental_milestones',
  }
);

// ══════════════════════════════════════════════════════════════
// 6. Assessment History (سجل تاريخ التقييمات)
// ══════════════════════════════════════════════════════════════
const assessmentHistorySchema = new mongoose.Schema(
  {
    beneficiary_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', required: true },
    assessment_type: {
      type: String,
      enum: [
        'VABS3',
        'CARS2',
        'PEP3',
        'ICF',
        'DEVELOPMENTAL_MILESTONES',
        'ABAS3',
        'BAYLEY4',
        'CUSTOM',
        'INITIAL',
        'PERIODIC',
        'TRANSITION',
      ],
      required: true,
    },
    assessment_id: { type: mongoose.Schema.Types.ObjectId, required: true },
    assessment_ref_model: { type: String }, // اسم الـ Model
    assessment_date: { type: Date, required: true },
    assessor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    key_findings_ar: { type: String },
    composite_score: { type: Number },
    classification_ar: { type: String },
    next_assessment_due: { type: Date },
    linked_iep_id: { type: mongoose.Schema.Types.ObjectId, ref: 'IEP' },
  },
  {
    timestamps: true,
    collection: 'assessment_history',
  }
);

assessmentHistorySchema.index({ beneficiary_id: 1, assessment_type: 1, assessment_date: -1 });

// ══════════════════════════════════════════════════════════════
// Exports
// ══════════════════════════════════════════════════════════════
const VABSAssessment =
  mongoose.models.VABSAssessment || mongoose.model('VABSAssessment', vabsAssessmentSchema);
const CARS2Assessment =
  mongoose.models.CARS2Assessment || mongoose.model('CARS2Assessment', cars2AssessmentSchema);
const PEP3Assessment =
  mongoose.models.PEP3Assessment || mongoose.model('PEP3Assessment', pep3AssessmentSchema);
const ICFAssessment =
  mongoose.models.ICFAssessment || mongoose.model('ICFAssessment', icfAssessmentSchema);
const DevelopmentalMilestones = mongoose.model(
  'DevelopmentalMilestones',
  developmentalMilestonesSchema
);
const AssessmentHistory =
  mongoose.models.AssessmentHistory || mongoose.model('AssessmentHistory', assessmentHistorySchema);

module.exports = {
  VABSAssessment,
  CARS2Assessment,
  PEP3Assessment,
  ICFAssessment,
  DevelopmentalMilestones,
  AssessmentHistory,
};
