/**
 * ICF Functional Assessment Model — نموذج التقييم الوظيفي وفق ICF
 *
 * يعتمد على التصنيف الدولي للأداء الوظيفي والإعاقة والصحة (ICF)
 * الصادر عن منظمة الصحة العالمية (WHO)
 *
 * المكونات الأربعة الرئيسية:
 * 1. وظائف الجسم (Body Functions - b)
 * 2. هياكل الجسم (Body Structures - s)
 * 3. الأنشطة والمشاركة (Activities & Participation - d)
 * 4. العوامل البيئية (Environmental Factors - e)
 *
 * مقياس التصنيف الموحد (Universal Qualifier):
 *   0 = لا مشكلة (0-4%)
 *   1 = مشكلة خفيفة (5-24%)
 *   2 = مشكلة متوسطة (25-49%)
 *   3 = مشكلة شديدة (50-95%)
 *   4 = مشكلة كاملة (96-100%)
 *   8 = غير محدد
 *   9 = غير قابل للتطبيق
 */

const mongoose = require('mongoose');

/* ─── Sub-schemas ──────────────────────────────────────────────────────────── */

/**
 * ICF Code Item — عنصر رمز ICF
 * كل عنصر يمثل رمز ICF مع مؤهلاته (qualifiers)
 */
const icfCodeItemSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      match: /^[bsde]\d{1,4}$/,
      index: true,
    },
    title: { type: String, required: true },
    titleAr: { type: String },
    chapter: { type: String },
    chapterAr: { type: String },
    block: { type: String },

    // المؤهل الرئيسي (0–4, 8, 9)
    qualifier: {
      type: Number,
      required: true,
      enum: [0, 1, 2, 3, 4, 8, 9],
    },

    // مؤهلات إضافية لهياكل الجسم
    // المؤهل الثاني: طبيعة التغيير (nature of change)
    qualifierNature: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    },
    // المؤهل الثالث: موقع التغيير (location)
    qualifierLocation: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
    },

    // مؤهلات الأنشطة والمشاركة
    // الأداء (Performance) — ما يفعله في بيئته الحالية
    performanceQualifier: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 8, 9],
    },
    // القدرة (Capacity) — ما يستطيع فعله في بيئة معيارية
    capacityQualifier: {
      type: Number,
      enum: [0, 1, 2, 3, 4, 8, 9],
    },

    // مؤهلات العوامل البيئية
    // يُستخدم + (ميسّر) أو بدون (عائق)
    isBarrier: { type: Boolean, default: false },
    isFacilitator: { type: Boolean, default: false },

    notes: { type: String, maxlength: 1000 },
    evidence: { type: String },
  },
  { _id: false }
);

/**
 * ICF Domain Score — ملخص درجة المجال
 */
const domainScoreSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: true,
      enum: ['bodyFunctions', 'bodyStructures', 'activitiesParticipation', 'environmentalFactors'],
    },
    domainAr: { type: String },
    totalItems: { type: Number, default: 0 },
    assessedItems: { type: Number, default: 0 },
    averageQualifier: { type: Number, default: 0 },
    severityDistribution: {
      noProblem: { type: Number, default: 0 }, // 0
      mild: { type: Number, default: 0 }, // 1
      moderate: { type: Number, default: 0 }, // 2
      severe: { type: Number, default: 0 }, // 3
      complete: { type: Number, default: 0 }, // 4
      notSpecified: { type: Number, default: 0 }, // 8
      notApplicable: { type: Number, default: 0 }, // 9
    },
    // للعوامل البيئية فقط
    facilitatorCount: { type: Number, default: 0 },
    barrierCount: { type: Number, default: 0 },
    // فجوة الأداء-القدرة (للأنشطة والمشاركة)
    performanceCapacityGap: { type: Number },
  },
  { _id: false }
);

/**
 * Comparison Record — سجل المقارنة
 */
const comparisonSchema = new mongoose.Schema(
  {
    comparedWithId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ICFAssessment',
    },
    comparedDate: { type: Date },
    overallChange: {
      type: String,
      enum: ['improved', 'stable', 'declined'],
    },
    domainChanges: [
      {
        domain: String,
        previousScore: Number,
        currentScore: Number,
        change: Number,
        changePercent: Number,
        direction: {
          type: String,
          enum: ['improved', 'stable', 'declined'],
        },
      },
    ],
    significantChanges: [String],
    summary: { type: String },
    summaryAr: { type: String },
  },
  { _id: false }
);

/* ─── Main Schema ──────────────────────────────────────────────────────────── */

const icfAssessmentSchema = new mongoose.Schema(
  {
    // ─── Core Identification ────────────────────────────────────────────
    assessmentNumber: {
      type: String,
      unique: true,
      index: true,
    },
    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    descriptionAr: { type: String },

    // ─── Assessment Type ────────────────────────────────────────────────
    assessmentType: {
      type: String,
      required: true,
      enum: [
        'initial', // تقييم أولي
        'periodic', // تقييم دوري
        'progress', // تقييم تقدم
        'discharge', // تقييم خروج
        'followUp', // تقييم متابعة
        'comprehensive', // تقييم شامل
        'specialized', // تقييم متخصص
      ],
      index: true,
    },

    // ─── Relationships ──────────────────────────────────────────────────
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Beneficiary',
      required: true,
      index: true,
    },
    assessorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DisabilityProgram',
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TherapySession',
    },
    previousAssessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ICFAssessment',
    },

    // ─── ICF Version ────────────────────────────────────────────────────
    icfVersion: {
      type: String,
      default: 'ICF-2001',
      enum: ['ICF-2001', 'ICF-CY', 'ICF-2024'],
    },

    // ─── 1. Body Functions (وظائف الجسم) — b codes ─────────────────────
    bodyFunctions: {
      chapter1_mental: [icfCodeItemSchema], // b1: الوظائف العقلية
      chapter2_sensory: [icfCodeItemSchema], // b2: الوظائف الحسية والألم
      chapter3_voice: [icfCodeItemSchema], // b3: وظائف الصوت والكلام
      chapter4_cardiovascular: [icfCodeItemSchema], // b4: الجهاز الدوري والمناعة والتنفسي
      chapter5_digestive: [icfCodeItemSchema], // b5: الجهاز الهضمي والاستقلاب والغدد
      chapter6_genitourinary: [icfCodeItemSchema], // b6: الجهاز البولي التناسلي والتكاثر
      chapter7_neuromusculoskeletal: [icfCodeItemSchema], // b7: الجهاز العضلي الهيكلي والحركة
      chapter8_skin: [icfCodeItemSchema], // b8: الجلد والهياكل المتصلة
    },

    // ─── 2. Body Structures (هياكل الجسم) — s codes ────────────────────
    bodyStructures: {
      chapter1_nervous: [icfCodeItemSchema], // s1: الجهاز العصبي
      chapter2_eye_ear: [icfCodeItemSchema], // s2: العين والأذن
      chapter3_voice_speech: [icfCodeItemSchema], // s3: هياكل الصوت والكلام
      chapter4_cardiovascular: [icfCodeItemSchema], // s4: الجهاز الدوري والمناعة والتنفسي
      chapter5_digestive: [icfCodeItemSchema], // s5: الجهاز الهضمي
      chapter6_genitourinary: [icfCodeItemSchema], // s6: الجهاز البولي التناسلي
      chapter7_movement: [icfCodeItemSchema], // s7: هياكل الحركة
      chapter8_skin: [icfCodeItemSchema], // s8: الجلد
    },

    // ─── 3. Activities & Participation (الأنشطة والمشاركة) — d codes ───
    activitiesParticipation: {
      chapter1_learning: [icfCodeItemSchema], // d1: التعلم وتطبيق المعرفة
      chapter2_tasks: [icfCodeItemSchema], // d2: المهام والمطالب العامة
      chapter3_communication: [icfCodeItemSchema], // d3: التواصل
      chapter4_mobility: [icfCodeItemSchema], // d4: التنقل
      chapter5_selfCare: [icfCodeItemSchema], // d5: العناية بالذات
      chapter6_domesticLife: [icfCodeItemSchema], // d6: الحياة المنزلية
      chapter7_interpersonal: [icfCodeItemSchema], // d7: التفاعلات والعلاقات الشخصية
      chapter8_majorLife: [icfCodeItemSchema], // d8: مجالات الحياة الرئيسية
      chapter9_community: [icfCodeItemSchema], // d9: حياة المجتمع والحياة المدنية
    },

    // ─── 4. Environmental Factors (العوامل البيئية) — e codes ──────────
    environmentalFactors: {
      chapter1_products: [icfCodeItemSchema], // e1: المنتجات والتكنولوجيا
      chapter2_natural: [icfCodeItemSchema], // e2: البيئة الطبيعية والتغييرات التي يصنعها الإنسان
      chapter3_support: [icfCodeItemSchema], // e3: الدعم والعلاقات
      chapter4_attitudes: [icfCodeItemSchema], // e4: المواقف
      chapter5_services: [icfCodeItemSchema], // e5: الخدمات والأنظمة والسياسات
    },

    // ─── Personal Factors (العوامل الشخصية) ─────────────────────────────
    personalFactors: {
      age: { type: Number },
      gender: { type: String, enum: ['male', 'female'] },
      education: { type: String },
      occupation: { type: String },
      lifestyle: { type: String },
      copingStrategies: [String],
      socialBackground: { type: String },
      otherHealthConditions: [String],
      notes: { type: String },
    },

    // ─── Health Condition (الحالة الصحية) — ICD codes ───────────────────
    healthCondition: {
      icdCode: { type: String },
      icdVersion: { type: String, default: 'ICD-11' },
      diagnosis: { type: String },
      diagnosisAr: { type: String },
      onsetDate: { type: Date },
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'profound'],
      },
    },

    // ─── Computed Scores ────────────────────────────────────────────────
    domainScores: [domainScoreSchema],
    overallFunctioningScore: { type: Number, min: 0, max: 100 },
    overallSeverity: {
      type: String,
      enum: ['noProblem', 'mild', 'moderate', 'severe', 'complete'],
    },

    // ─── Performance-Capacity Gap Analysis ─────────────────────────────
    gapAnalysis: {
      averagePerformance: { type: Number },
      averageCapacity: { type: Number },
      averageGap: { type: Number },
      significantGaps: [
        {
          code: String,
          title: String,
          performance: Number,
          capacity: Number,
          gap: Number,
          recommendation: String,
          recommendationAr: String,
        },
      ],
    },

    // ─── Comparison with Previous ───────────────────────────────────────
    comparison: comparisonSchema,

    // ─── International Benchmarking ────────────────────────────────────
    benchmarking: {
      referencePopulation: { type: String },
      dataSource: { type: String },
      comparisonDate: { type: Date },
      domainBenchmarks: [
        {
          domain: String,
          assessedScore: Number,
          benchmarkMean: Number,
          benchmarkMedian: Number,
          benchmarkSD: Number,
          percentileRank: Number,
          zScore: Number,
          interpretation: String,
          interpretationAr: String,
        },
      ],
    },

    // ─── Goals & Recommendations ────────────────────────────────────────
    goals: [
      {
        icfCode: String,
        description: String,
        descriptionAr: String,
        targetQualifier: Number,
        currentQualifier: Number,
        timeframeWeeks: Number,
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
        },
        status: {
          type: String,
          enum: ['pending', 'inProgress', 'achieved', 'modified', 'discontinued'],
          default: 'pending',
        },
      },
    ],
    recommendations: [
      {
        category: {
          type: String,
          enum: [
            'therapy',
            'assistiveDevice',
            'environmentalModification',
            'education',
            'vocational',
            'social',
            'medical',
            'other',
          ],
        },
        description: String,
        descriptionAr: String,
        priority: {
          type: String,
          enum: ['urgent', 'high', 'medium', 'low'],
        },
        referredTo: String,
      },
    ],

    // ─── Clinical Summary ───────────────────────────────────────────────
    clinicalSummary: {
      strengths: [String],
      strengthsAr: [String],
      limitations: [String],
      limitationsAr: [String],
      participationRestrictions: [String],
      environmentalBarriers: [String],
      environmentalFacilitators: [String],
      overallNarrative: { type: String },
      overallNarrativeAr: { type: String },
    },

    // ─── Status & Workflow ──────────────────────────────────────────────
    status: {
      type: String,
      enum: ['draft', 'inProgress', 'completed', 'reviewed', 'approved', 'archived'],
      default: 'draft',
      index: true,
    },
    assessmentDate: {
      type: Date,
      required: true,
      index: -1,
    },
    completedDate: { type: Date },
    reviewedDate: { type: Date },
    approvedDate: { type: Date },
    nextAssessmentDate: { type: Date },
    duration: { type: Number }, // دقائق

    // ─── Attachments ────────────────────────────────────────────────────
    attachments: [
      {
        name: String,
        type: String,
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // ─── Audit ──────────────────────────────────────────────────────────
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

/* ─── Indexes ──────────────────────────────────────────────────────────────── */

icfAssessmentSchema.index({ beneficiaryId: 1, assessmentDate: -1 });
icfAssessmentSchema.index({ assessorId: 1, assessmentDate: -1 });
icfAssessmentSchema.index({ assessmentType: 1, status: 1 });
icfAssessmentSchema.index({ beneficiaryId: 1, assessmentType: 1 });
icfAssessmentSchema.index({ organization: 1, assessmentDate: -1 });
icfAssessmentSchema.index({ 'healthCondition.icdCode': 1 });
icfAssessmentSchema.index({ overallFunctioningScore: 1 });
icfAssessmentSchema.index({ createdAt: -1 });

/* ─── Auto-generate Assessment Number ──────────────────────────────────────── */

icfAssessmentSchema.pre('save', async function (next) {
  if (!this.assessmentNumber) {
    const count = await this.constructor.countDocuments();
    const date = new Date();
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    this.assessmentNumber = `ICF-${y}${m}-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

/* ─── Virtuals ─────────────────────────────────────────────────────────────── */

icfAssessmentSchema.virtual('totalCodesAssessed').get(function () {
  let count = 0;
  const domains = [
    'bodyFunctions',
    'bodyStructures',
    'activitiesParticipation',
    'environmentalFactors',
  ];
  for (const domain of domains) {
    if (this[domain]) {
      for (const chapter of Object.values(
        this[domain].toObject ? this[domain].toObject() : this[domain]
      )) {
        if (Array.isArray(chapter)) {
          count += chapter.length;
        }
      }
    }
  }
  return count;
});

icfAssessmentSchema.virtual('isComplete').get(function () {
  return this.status === 'completed' || this.status === 'reviewed' || this.status === 'approved';
});

/* ─── Methods ──────────────────────────────────────────────────────────────── */

/**
 * إرجاع جميع رموز ICF المقيّمة مع مؤهلاتها
 */
icfAssessmentSchema.methods.getAllCodes = function () {
  const codes = [];
  const domainMap = {
    bodyFunctions: 'وظائف الجسم',
    bodyStructures: 'هياكل الجسم',
    activitiesParticipation: 'الأنشطة والمشاركة',
    environmentalFactors: 'العوامل البيئية',
  };

  for (const [domain, domainAr] of Object.entries(domainMap)) {
    if (this[domain]) {
      const obj = this[domain].toObject ? this[domain].toObject() : this[domain];
      for (const [chapter, items] of Object.entries(obj)) {
        if (Array.isArray(items)) {
          items.forEach(item => {
            codes.push({ ...item, domain, domainAr, chapter });
          });
        }
      }
    }
  }
  return codes;
};

/**
 * حساب وتحديث درجات المجالات
 */
icfAssessmentSchema.methods.calculateScores = function () {
  const domainConfig = [
    { key: 'bodyFunctions', ar: 'وظائف الجسم' },
    { key: 'bodyStructures', ar: 'هياكل الجسم' },
    { key: 'activitiesParticipation', ar: 'الأنشطة والمشاركة' },
    { key: 'environmentalFactors', ar: 'العوامل البيئية' },
  ];

  this.domainScores = [];
  let totalQualifierSum = 0;
  let totalAssessedCount = 0;

  for (const { key, ar } of domainConfig) {
    const domainData = this[key];
    if (!domainData) continue;

    const obj = domainData.toObject ? domainData.toObject() : domainData;
    const items = [];
    for (const chapter of Object.values(obj)) {
      if (Array.isArray(chapter)) items.push(...chapter);
    }

    const assessed = items.filter(i => i.qualifier !== 8 && i.qualifier !== 9);
    const dist = {
      noProblem: 0,
      mild: 0,
      moderate: 0,
      severe: 0,
      complete: 0,
      notSpecified: 0,
      notApplicable: 0,
    };

    items.forEach(i => {
      switch (i.qualifier) {
        case 0:
          dist.noProblem++;
          break;
        case 1:
          dist.mild++;
          break;
        case 2:
          dist.moderate++;
          break;
        case 3:
          dist.severe++;
          break;
        case 4:
          dist.complete++;
          break;
        case 8:
          dist.notSpecified++;
          break;
        case 9:
          dist.notApplicable++;
          break;
      }
    });

    const avgQ =
      assessed.length > 0 ? assessed.reduce((sum, i) => sum + i.qualifier, 0) / assessed.length : 0;

    const score = {
      domain: key,
      domainAr: ar,
      totalItems: items.length,
      assessedItems: assessed.length,
      averageQualifier: Math.round(avgQ * 100) / 100,
      severityDistribution: dist,
    };

    // فجوة الأداء-القدرة للأنشطة والمشاركة
    if (key === 'activitiesParticipation') {
      const withBoth = items.filter(
        i => i.performanceQualifier != null && i.capacityQualifier != null
      );
      if (withBoth.length > 0) {
        const avgPerf = withBoth.reduce((s, i) => s + i.performanceQualifier, 0) / withBoth.length;
        const avgCap = withBoth.reduce((s, i) => s + i.capacityQualifier, 0) / withBoth.length;
        score.performanceCapacityGap = Math.round((avgPerf - avgCap) * 100) / 100;
      }
    }

    // عدّ المُيسّرات والعوائق للعوامل البيئية
    if (key === 'environmentalFactors') {
      score.facilitatorCount = items.filter(i => i.isFacilitator).length;
      score.barrierCount = items.filter(i => i.isBarrier).length;
    }

    this.domainScores.push(score);
    totalQualifierSum += avgQ * assessed.length;
    totalAssessedCount += assessed.length;
  }

  // الدرجة الكلية (مقلوبة: 0=أفضل أداء, 100=أسوأ أداء → نقلبها)
  if (totalAssessedCount > 0) {
    const avgOverall = totalQualifierSum / totalAssessedCount;
    // تحويل من مقياس 0-4 إلى 0-100 (مقلوب: 100 = أفضل)
    this.overallFunctioningScore = Math.round((1 - avgOverall / 4) * 100);
    if (avgOverall <= 0.5) this.overallSeverity = 'noProblem';
    else if (avgOverall <= 1.5) this.overallSeverity = 'mild';
    else if (avgOverall <= 2.5) this.overallSeverity = 'moderate';
    else if (avgOverall <= 3.5) this.overallSeverity = 'severe';
    else this.overallSeverity = 'complete';
  }

  return this.domainScores;
};

/* ─── ICF Reference Data Schema ────────────────────────────────────────────── */

const icfCodeReferenceSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    component: {
      type: String,
      required: true,
      enum: ['bodyFunctions', 'bodyStructures', 'activitiesParticipation', 'environmentalFactors'],
    },
    chapter: { type: Number, required: true },
    level: { type: Number, required: true, min: 1, max: 4 },
    title: { type: String, required: true },
    titleAr: { type: String },
    description: { type: String },
    descriptionAr: { type: String },
    includes: [String],
    excludes: [String],
    parentCode: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

icfCodeReferenceSchema.index({ component: 1, chapter: 1 });
icfCodeReferenceSchema.index({ parentCode: 1 });

/* ─── ICF Benchmark Data Schema ───────────────────────────────────────────── */

const icfBenchmarkSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, index: true },
    population: {
      type: String,
      required: true,
      enum: [
        'general',
        'pediatric',
        'geriatric',
        'stroke',
        'spinalCordInjury',
        'cerebralPalsy',
        'autismSpectrum',
        'intellectualDisability',
        'musculoskeletal',
        'mentalHealth',
        'saudiArabia',
        'gccRegion',
        'middleEast',
      ],
    },
    ageGroup: { type: String },
    sampleSize: { type: Number },
    mean: { type: Number, required: true },
    median: { type: Number },
    standardDeviation: { type: Number },
    percentile25: { type: Number },
    percentile75: { type: Number },
    dataSource: { type: String, required: true },
    publicationYear: { type: Number },
    region: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

icfBenchmarkSchema.index({ code: 1, population: 1 });
icfBenchmarkSchema.index({ population: 1, code: 1 });

/* ─── Export Models ────────────────────────────────────────────────────────── */

const ICFAssessment = mongoose.models.ICFAssessment || mongoose.model('ICFAssessment', icfAssessmentSchema);
const ICFCodeReference = mongoose.models.ICFCodeReference || mongoose.model('ICFCodeReference', icfCodeReferenceSchema);
const ICFBenchmark = mongoose.models.ICFBenchmark || mongoose.model('ICFBenchmark', icfBenchmarkSchema);

module.exports = { ICFAssessment, ICFCodeReference, ICFBenchmark };
