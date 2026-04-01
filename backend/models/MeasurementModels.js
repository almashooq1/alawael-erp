/* eslint-disable no-unused-vars */
/**
 * نماذج النظام الشامل للمقاييس والتقييمات
 * Comprehensive Measurement System Models
 * ====================================
 * يتضمن:
 * - أنواع المقاييس (النماذج والثابتات)
 * - المقاييس الموجودة (Master)
 * - عناصر المقاييس (Items والمعايير)
 * - نتائج قياس المستفيدين
 */

const mongoose = require('mongoose');

// ============================
// 1. أنواع المقاييس (Measurement Types)
// ============================
const MeasurementTypeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      example: 'INTEL_008',
    },

    nameAr: {
      type: String,
      required: true,
      trim: true,
      example: 'مقياس الذكاء',
    },

    nameEn: {
      type: String,
      required: true,
      trim: true,
      example: 'Intelligence Scale',
    },

    category: {
      type: String,
      required: true,
      enum: [
        'GENERAL', // مقاييس عامة أساسية
        'EDUCATIONAL', // مقاييس تربوية وتعليمية
        'BEHAVIORAL', // مقاييس سلوكية ونفسية
        'AUTISM_SPECTRUM', // مقاييس خاصة بالتوحد
        'DAILY_LIVING', // مقاييس مهارات الحياة اليومية
        'VOCATIONAL', // مقاييس التأهيل المهني
        'LANGUAGE_COMMUNICATION', // مقاييس اللغة والتواصل
        'MOTOR_SKILLS', // مقاييس المهارات الحركية
        'SOCIAL_EMOTIONAL', // مقاييس اجتماعية عاطفية
      ],
    },

    description: String,

    targetDisabilities: [
      {
        type: String,
        enum: [
          'INTELLECTUAL',
          'MOTOR',
          'VISUAL',
          'HEARING',
          'AUTISM',
          'SPEECH_LANGUAGE',
          'LEARNING_DISABILITY',
          'DEVELOPMENTAL',
          'MULTIPLE',
          'OTHER',
        ],
      },
    ],

    ageRange: {
      minAge: Number,
      maxAge: Number,
      description: String,
    },

    estimatedTime: {
      type: Number,
      description: 'المدة التقريبية بالدقائق',
    },

    isStandardized: {
      type: Boolean,
      default: false,
      description: 'متقارن/معياري؟',
    },

    normSource: {
      type: String,
      description: 'مصدر المعايير (وكسلر، ستانفورد بينيه، إلخ)',
    },

    scoringMethod: {
      type: String,
      enum: ['LIKERT', 'RAW_SCORE', 'STANDARD_SCORE', 'PERCENTILE', 'QUALITATIVE', 'CHECKLIST'],
      required: true,
    },

    scoreRange: {
      min: Number,
      max: Number,
      description: String,
    },

    interpretationLevels: [
      {
        level: String, // مثل: شديد، متوسط، طبيعي
        minScore: Number,
        maxScore: Number,
        description: String,
        recommendations: [String],
      },
    ],

    domains: [
      {
        code: String,
        name: String,
        description: String,
        weight: Number, // النسبة في الدرجة الكلية
      },
    ],

    administratedBy: {
      type: String,
      enum: ['PSYCHOLOGIST', 'EDUCATOR', 'SPEECH_THERAPIST', 'PHYSIOTHERAPIST', 'GENERAL_STAFF'],
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'measurement_types' }
);

// ============================
// 2. نموذج المقاييس الرئيسي (Measurement Master)
// ============================
const MeasurementMasterSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      example: 'MEAS-IQ-WECHSLER-001',
    },

    typeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MeasurementType',
      required: true,
    },

    nameAr: {
      type: String,
      required: true,
      trim: true,
      example: 'مقياس وكسلر للذكاء (الإصدار الخامس)',
    },

    nameEn: {
      type: String,
      required: true,
      trim: true,
      example: 'Wechsler Intelligence Scale (Version 5)',
    },

    description: String,

    version: {
      number: String,
      releaseDate: Date,
      author: String,
    },

    targetDisabilities: [
      {
        type: String,
        ref: 'MeasurementType.targetDisabilities',
      },
    ],

    ageRange: {
      minAge: Number,
      maxAge: Number,
    },

    administrationGuide: String,

    items: [
      {
        itemNumber: Number,
        questionAr: String,
        questionEn: String,
        domainCode: String,
        scoringInstructions: String,
        maxScore: Number,
      },
    ],

    totalItems: Number,

    estimatedDuration: {
      type: Number,
      description: 'الدقائق',
    },

    scoringMethod: {
      type: String,
      enum: ['MANUAL', 'AUTOMATED', 'BOTH'],
    },

    scoringGuide: String,

    normTables: {
      population: String,
      year: Number,
      ageGroups: [
        {
          ageRange: String,
          meanScore: Number,
          standardDeviation: Number,
          percentiles: {},
        },
      ],
    },

    reliabilityCoefficients: {
      cronbachAlpha: Number,
      testRetest: Number,
      interRater: Number,
    },

    validityInfo: {
      constructValidity: String,
      criterionValidity: String,
      notes: String,
    },

    interpretationGuide: {
      scoreRange: [
        {
          min: Number,
          max: Number,
          level: String,
          description: String,
          implication: String,
        },
      ],
      specialConsiderations: [String],
    },

    requiredCertifications: [String],

    culturalAdaptations: [
      {
        culturalContext: String,
        modifications: [String],
        validationData: String,
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'measurement_masters' }
);

// ============================
// 3. نموذج نتائج القياس (Measurement Results)
// ============================
const MeasurementResultSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiaryProfile',
      required: true,
    },

    measurementId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MeasurementMaster',
      required: true,
    },

    typeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MeasurementType',
      required: true,
    },

    administratedBy: {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      name: String,
      certifications: [String],
    },

    dateAdministrated: {
      type: Date,
      required: true,
    },

    // البيانات الأساسية
    rawScore: {
      type: Number,
      required: true,
    },

    standardScore: Number,

    percentileRank: Number,

    ageEquivalent: String,

    gradeEquivalent: String,

    // النتائج حسب المجالات
    domainScores: [
      {
        domainCode: String,
        domainName: String,
        rawScore: Number,
        standardScore: Number,
        percentile: Number,
        level: String, // مثل: ضعيف، متوسط، قوي
      },
    ],

    // المستوى الكلي
    overallLevel: {
      type: String,
      enum: [
        'PROFOUND',
        'SEVERE',
        'MODERATE',
        'MILD',
        'BORDERLINE',
        'AVERAGE',
        'ABOVE_AVERAGE',
        'SUPERIOR',
      ],
      required: true,
    },

    interpretation: {
      summary: String,
      strengths: [String],
      weaknesses: [String],
      recommendations: [String],
      specialNotes: String,
    },

    // ملاحظات السلوك والملاحظات الإكلينيكية
    behavioralObservations: {
      attention: String,
      motivation: String,
      cooperation: String,
      anxiety: String,
      otherObservations: String,
    },

    // قيود الاختبار
    testingLimitations: [String],

    // المتابعة الموصى بها
    recommendedFollowUp: {
      type: String,
      enum: ['NONE', 'AFTER_3_MONTHS', 'AFTER_6_MONTHS', 'AFTER_1_YEAR', 'AS_NEEDED'],
    },

    linkedPrograms: [
      {
        programId: mongoose.Schema.Types.ObjectId,
        matchScore: Number, // درجة التطابق (0-100)
        activationDate: Date,
        reason: String,
      },
    ],

    // حالة النتيجة
    status: {
      type: String,
      enum: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ARCHIVED'],
      default: 'DRAFT',
    },

    approvalInfo: {
      approvedBy: mongoose.Schema.Types.ObjectId,
      approvalDate: Date,
      approvalNotes: String,
    },

    reportDocument: {
      fileUrl: String,
      generatedAt: Date,
      format: {
        type: String,
        enum: ['PDF', 'DOCX', 'HTML'],
      },
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },

    // للحفاظ على التاريخ
    isLatest: Boolean,
    previousResultId: mongoose.Schema.Types.ObjectId,
  },
  { collection: 'measurement_results' }
);

// ============================
// 4. نموذج الخطة التأهيلية الفردية (IRP - Individual Rehabilitation Plan)
// ============================
const IndividualRehabPlanSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiaryProfile',
      required: true,
    },

    planCode: {
      type: String,
      unique: true,
      trim: true,
      example: 'IRP-2026-00001',
    },

    // البيانات الشخصية المرجعية
    beneficiaryInfo: {
      name: String,
      disabilityType: String,
      severityLevel: String,
      age: Number,
      educationalLevel: String,
    },

    // فريق التخطيط
    planningTeam: [
      {
        role: String, // قائد الفريق، معالج، معلم
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        specialty: String,
      },
    ],

    // المقاييس الأساسية المستخدمة
    baseMeasurements: [
      {
        measurementId: mongoose.Schema.Types.ObjectId,
        resultId: mongoose.Schema.Types.ObjectId,
        dateAdministrated: Date,
        overallLevel: String,
        keyFindings: [String],
      },
    ],

    // الرؤية والرسالة
    vision: {
      longTermGoals: [String],
      description: String,
    },

    mission: {
      shortTermObjectives: [String],
      description: String,
    },

    // المجالات التأهيلية
    rehabilitationAreas: [
      {
        areaCode: String,
        areaName: String, // مثل: حياة يومية، أكاديمية، اجتماعية
        currentLevel: String,
        targetLevel: String,
        priority: {
          type: String,
          enum: ['HIGH', 'MEDIUM', 'LOW'],
        },
        programs: [
          {
            programId: mongoose.Schema.Types.ObjectId,
            programName: String,
            startDate: Date,
            targetDuration: Number, // أسابيع
          },
        ],
      },
    ],

    // البرامج النشطة المرتبطة
    activePrograms: [
      {
        programId: mongoose.Schema.Types.ObjectId,
        programName: String,
        startDate: { type: Date, required: true },
        expectedEndDate: Date,
        frequency: String, // مثل: مرتين أسبوعياً
        duration: Number, // دقائق
        provider: mongoose.Schema.Types.ObjectId,
        status: {
          type: String,
          enum: ['NOT_STARTED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'TRANSFERRED'],
        },
        progress: {
          sessionsCompleted: Number,
          sessionsPlanned: Number,
          successRate: Number,
          notes: String,
        },
      },
    ],

    // الأهداف المرحلية والمؤشرات
    milestones: [
      {
        description: String,
        targetDate: Date,
        relatedPrograms: [mongoose.Schema.Types.ObjectId],
        measurableIndicators: [String],
        status: {
          type: String,
          enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED'],
        },
        completionDate: Date,
      },
    ],

    // التوصيات والملاحظات
    recommendations: {
      atHome: [String],
      atCenter: [String],
      atSchool: [String],
      familyGuidance: [String],
    },

    // معلومات الدعم الأسري
    familyInvolvement: {
      description: String,
      participationLevel: {
        type: String,
        enum: ['MINIMAL', 'REGULAR', 'INTENSIVE'],
      },
      trainingNeeds: [String],
      supportServices: [String],
    },

    // التواصل مع المؤسسات الأخرى
    externalCoordination: [
      {
        institution: String,
        contactPerson: String,
        coordinationPoints: [String],
        lastContactDate: Date,
      },
    ],

    // معلومات الخطة
    planPeriod: {
      startDate: { type: Date, required: true },
      endDate: { type: Date, required: true },
      reviewSchedule: String, // مثل: كل 3 أشهر
    },

    // التقييم والمراجعة
    reviews: [
      {
        reviewDate: Date,
        reviewer: mongoose.Schema.Types.ObjectId,
        progressSummary: String,
        programsPerformance: [
          {
            programId: mongoose.Schema.Types.ObjectId,
            status: String,
            achievements: [String],
            challenges: [String],
            adjustments: [String],
          },
        ],
        overallProgress: String,
        nextSteps: [String],
        rating: {
          type: String,
          enum: ['EXCELLENT', 'GOOD', 'SATISFACTORY', 'NEEDS_IMPROVEMENT'],
        },
      },
    ],

    // الحالة
    status: {
      type: String,
      enum: ['DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'COMPLETED', 'ARCHIVED'],
      default: 'DRAFT',
    },

    approvalInfo: {
      approvedBy: mongoose.Schema.Types.ObjectId,
      approvalDate: Date,
      approvalNotes: String,
    },

    documentUrl: String,

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: mongoose.Schema.Types.ObjectId,
  },
  { collection: 'individual_rehab_plans' }
);

// ============================
// 5. نموذج مقاييس إضافية سريعة (Quick Assessment)
// ============================
const QuickAssessmentSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiaryProfile',
      required: true,
    },

    assessmentType: {
      type: String,
      enum: ['DAILY_LIVING', 'BEHAVIORAL_CHECKLIST', 'PROGRESS_TRACKING', 'INTAKE_SCREENING'],
      required: true,
    },

    items: [
      {
        itemCode: String,
        question: String,
        response: String,
        score: Number,
        notes: String,
        date: Date,
      },
    ],

    totalScore: Number,

    maxScore: Number,

    percentageScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    level: String,

    performedBy: mongoose.Schema.Types.ObjectId,

    date: { type: Date, default: Date.now },

    linkedResult: mongoose.Schema.Types.ObjectId,

    // ── Enhanced Quick Assessment Fields ──
    duration: {
      type: Number,
      description: 'مدة التقييم بالدقائق',
    },

    environment: {
      type: String,
      enum: ['CLASSROOM', 'THERAPY_ROOM', 'HOME', 'OUTDOOR', 'CLINIC', 'OTHER'],
    },

    observations: {
      cooperation: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
      attention: { type: String, enum: ['excellent', 'good', 'fair', 'poor'] },
      notes: String,
    },

    previousScoreRef: {
      assessmentId: mongoose.Schema.Types.ObjectId,
      score: Number,
      date: Date,
    },

    changeFromPrevious: {
      absoluteChange: Number,
      percentageChange: Number,
      direction: { type: String, enum: ['improved', 'stable', 'declined'] },
    },

    createdAt: { type: Date, default: Date.now },
  },
  { collection: 'quick_assessments' }
);

// ============================
// Virtuals
// ============================

// MeasurementResult: compute percentage from raw vs max
MeasurementResultSchema.virtual('scorePercentage').get(function () {
  if (!this.rawScore) return null;
  const master = this.measurementId;
  if (!master) return null;
  // Approximate from domain scores
  const totalMax = (this.domainScores || []).reduce((s, d) => s + (d.rawScore || 0), 0);
  return totalMax > 0 ? Math.round((this.rawScore / totalMax) * 100) : null;
});

// QuickAssessment: auto-calculate percentage
QuickAssessmentSchema.virtual('autoPercentage').get(function () {
  if (this.percentageScore != null) return this.percentageScore;
  if (this.totalScore != null && this.maxScore) {
    return Math.round((this.totalScore / this.maxScore) * 100);
  }
  return null;
});

// IndividualRehabPlan: program completion rate
IndividualRehabPlanSchema.virtual('programCompletionRate').get(function () {
  const programs = this.activePrograms || [];
  if (programs.length === 0) return 0;
  const completed = programs.filter(p => p.status === 'COMPLETED').length;
  return Math.round((completed / programs.length) * 100);
});

// IndividualRehabPlan: milestone completion rate
IndividualRehabPlanSchema.virtual('milestoneCompletionRate').get(function () {
  const milestones = this.milestones || [];
  if (milestones.length === 0) return 0;
  const completed = milestones.filter(m => m.status === 'COMPLETED').length;
  return Math.round((completed / milestones.length) * 100);
});

// ============================
// Instance Methods
// ============================

/**
 * MeasurementResult: Determine interpretation level from type's interpretationLevels
 */
MeasurementResultSchema.methods.interpretScore = async function () {
  const type = this.typeId;
  if (!type || !type.interpretationLevels) return this.overallLevel;

  const levels = type.interpretationLevels;
  for (const lvl of levels) {
    if (this.rawScore >= lvl.minScore && this.rawScore <= lvl.maxScore) {
      this.interpretation = this.interpretation || {};
      this.interpretation.summary = lvl.description;
      return lvl.level;
    }
  }
  return this.overallLevel;
};

/**
 * MeasurementResult: Calculate standard score from norm tables
 */
MeasurementResultSchema.methods.calculateStandardScore = function (normGroup) {
  if (!normGroup || !normGroup.meanScore || !normGroup.standardDeviation) return null;

  const z = (this.rawScore - normGroup.meanScore) / normGroup.standardDeviation;
  // Standard score: mean=100, sd=15 (IQ-style)
  this.standardScore = Math.round(100 + 15 * z);
  // Percentile approximation
  this.percentileRank = Math.round((1 / (1 + Math.exp(-1.7 * z))) * 100);
  return { standardScore: this.standardScore, percentileRank: this.percentileRank, zScore: z };
};

/**
 * QuickAssessment: Auto-calculate total score from items
 */
QuickAssessmentSchema.methods.calculateTotalScore = function () {
  if (!this.items || this.items.length === 0) return;

  this.totalScore = this.items.reduce((sum, item) => sum + (item.score || 0), 0);
  if (this.maxScore && this.maxScore > 0) {
    this.percentageScore = Math.round((this.totalScore / this.maxScore) * 100);
  }
  return this.totalScore;
};

/**
 * IndividualRehabPlan: Get progress summary across all programs
 */
IndividualRehabPlanSchema.methods.getProgressSummary = function () {
  const programs = this.activePrograms || [];
  const totalSessions = programs.reduce((sum, p) => sum + (p.progress?.sessionsPlanned || 0), 0);
  const completedSessions = programs.reduce(
    (sum, p) => sum + (p.progress?.sessionsCompleted || 0),
    0
  );
  const avgSuccess = programs.length
    ? programs.reduce((sum, p) => sum + (p.progress?.successRate || 0), 0) / programs.length
    : 0;

  return {
    totalPrograms: programs.length,
    activePrograms: programs.filter(p => p.status === 'ACTIVE').length,
    completedPrograms: programs.filter(p => p.status === 'COMPLETED').length,
    totalSessions,
    completedSessions,
    sessionCompletionRate: totalSessions
      ? Math.round((completedSessions / totalSessions) * 100)
      : 0,
    averageSuccessRate: Math.round(avgSuccess),
  };
};

// ============================
// Static Methods
// ============================

/**
 * MeasurementResult: Get trend for beneficiary across measurement type
 */
MeasurementResultSchema.statics.getTrend = async function (beneficiaryId, typeId, limit = 10) {
  const results = await this.find({
    beneficiaryId,
    typeId,
    status: { $in: ['APPROVED', 'PENDING_REVIEW'] },
  })
    .sort({ dateAdministrated: 1 })
    .limit(limit)
    .select('rawScore standardScore percentileRank overallLevel dateAdministrated domainScores');

  if (results.length < 2) return { trend: 'insufficient_data', data: results };

  const scores = results.map(r => r.rawScore);
  const n = scores.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = scores.reduce((a, b) => a + b, 0);
  const sumXY = scores.reduce((sum, y, i) => sum + i * y, 0);
  const sumXX = scores.reduce((sum, _, i) => sum + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const meanY = sumY / n;
  const intercept = meanY - slope * (sumX / n);

  const ssReg = scores.reduce((sum, _, i) => sum + Math.pow(slope * i + intercept - meanY, 2), 0);
  const ssTot = scores.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
  const rSquared = ssTot > 0 ? ssReg / ssTot : 0;

  let direction = 'stable';
  if (slope > 0.5) direction = 'improving';
  else if (slope < -0.5) direction = 'declining';

  return {
    trend: direction,
    slope: Math.round(slope * 100) / 100,
    rSquared: Math.round(rSquared * 1000) / 1000,
    predictedNext: Math.round((slope * n + intercept) * 100) / 100,
    totalImprovement: scores[n - 1] - scores[0],
    averageScore: Math.round(meanY * 100) / 100,
    dataPoints: results.map(r => ({
      date: r.dateAdministrated,
      rawScore: r.rawScore,
      standardScore: r.standardScore,
      level: r.overallLevel,
    })),
  };
};

/**
 * MeasurementResult: Dashboard aggregate stats
 */
MeasurementResultSchema.statics.getDashboardStats = async function (filters = {}) {
  const match = {};
  if (filters.beneficiaryId) match.beneficiaryId = filters.beneficiaryId;
  if (filters.status) match.status = filters.status;
  if (filters.fromDate) match.dateAdministrated = { $gte: new Date(filters.fromDate) };

  const [stats] = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalAssessments: { $sum: 1 },
        avgRawScore: { $avg: '$rawScore' },
        avgStandardScore: { $avg: '$standardScore' },
        avgPercentile: { $avg: '$percentileRank' },
        minScore: { $min: '$rawScore' },
        maxScore: { $max: '$rawScore' },
      },
    },
  ]);

  const byLevel = await this.aggregate([
    { $match: match },
    { $group: { _id: '$overallLevel', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const byType = await this.aggregate([
    { $match: match },
    { $group: { _id: '$typeId', count: { $sum: 1 }, avgScore: { $avg: '$rawScore' } } },
    { $sort: { count: -1 } },
  ]);

  const monthlyTrend = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          year: { $year: '$dateAdministrated' },
          month: { $month: '$dateAdministrated' },
        },
        count: { $sum: 1 },
        avgScore: { $avg: '$rawScore' },
      },
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 },
  ]);

  return {
    summary: stats || {
      totalAssessments: 0,
      avgRawScore: 0,
      avgStandardScore: 0,
      avgPercentile: 0,
      minScore: 0,
      maxScore: 0,
    },
    byLevel: byLevel.reduce((obj, l) => ({ ...obj, [l._id]: l.count }), {}),
    byType,
    monthlyTrend,
  };
};

/**
 * QuickAssessment: Aggregate stats by type
 */
QuickAssessmentSchema.statics.getStatsByType = async function (beneficiaryId) {
  return this.aggregate([
    { $match: { beneficiaryId } },
    {
      $group: {
        _id: '$assessmentType',
        count: { $sum: 1 },
        avgScore: { $avg: '$totalScore' },
        latestDate: { $max: '$date' },
        avgPercentage: { $avg: '$percentageScore' },
      },
    },
    { $sort: { latestDate: -1 } },
  ]);
};

// ============================
// Pre-save hooks
// ============================

// Auto-calculate QuickAssessment totals
QuickAssessmentSchema.pre('save', function (next) {
  if (this.items && this.items.length > 0 && this.totalScore == null) {
    this.totalScore = this.items.reduce((sum, item) => sum + (item.score || 0), 0);
  }
  if (this.totalScore != null && this.maxScore && this.maxScore > 0) {
    this.percentageScore = Math.round((this.totalScore / this.maxScore) * 100);
  }
  next();
});

// Auto-compute change from previous for QuickAssessment
QuickAssessmentSchema.pre('save', async function (next) {
  if (this.isNew && this.previousScoreRef?.score != null) {
    const prevScore = this.previousScoreRef.score;
    const currentScore = this.totalScore || 0;
    this.changeFromPrevious = {
      absoluteChange: currentScore - prevScore,
      percentageChange: prevScore ? Math.round(((currentScore - prevScore) / prevScore) * 100) : 0,
      direction:
        currentScore > prevScore ? 'improved' : currentScore < prevScore ? 'declined' : 'stable',
    };
  }
  next();
});

// ============================
// Indexes
// ============================
MeasurementTypeSchema.index({ category: 1, isActive: 1 });
MeasurementTypeSchema.index({ targetDisabilities: 1 });
MeasurementTypeSchema.index({ scoringMethod: 1 });

MeasurementMasterSchema.index({ typeId: 1, isActive: 1 });
MeasurementMasterSchema.index({ targetDisabilities: 1 });
// code: removed — unique:true creates implicit index

MeasurementResultSchema.index({ beneficiaryId: 1, dateAdministrated: -1 });
MeasurementResultSchema.index({ beneficiaryId: 1, typeId: 1 });
MeasurementResultSchema.index({ status: 1 });
MeasurementResultSchema.index({ overallLevel: 1 });
MeasurementResultSchema.index({ 'linkedPrograms.programId': 1 });

IndividualRehabPlanSchema.index({ beneficiaryId: 1, status: 1 });
IndividualRehabPlanSchema.index({ planPeriod: 1 });
IndividualRehabPlanSchema.index({ 'activePrograms.programId': 1 });
// planCode: removed — unique:true creates implicit index

QuickAssessmentSchema.index({ beneficiaryId: 1, date: -1 });
QuickAssessmentSchema.index({ assessmentType: 1 });
QuickAssessmentSchema.index({ performedBy: 1 });

// ============================
// Exports
// ============================
module.exports = {
  MeasurementType:
    mongoose.models.MeasurementType || mongoose.model('MeasurementType', MeasurementTypeSchema),
  MeasurementMaster:
    mongoose.models.MeasurementMaster ||
    mongoose.models.MeasurementMaster ||
    mongoose.model('MeasurementMaster', MeasurementMasterSchema),
  MeasurementResult:
    mongoose.models.MeasurementResult ||
    mongoose.models.MeasurementResult ||
    mongoose.model('MeasurementResult', MeasurementResultSchema),
  IndividualRehabPlan:
    mongoose.models.IndividualRehabPlan ||
    mongoose.models.IndividualRehabPlan ||
    mongoose.model('IndividualRehabPlan', IndividualRehabPlanSchema),
  QuickAssessment:
    mongoose.models.QuickAssessment || mongoose.model('QuickAssessment', QuickAssessmentSchema),
};
