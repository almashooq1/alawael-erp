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
const MeasurementTypeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    example: 'INTEL_008'
  },

  nameAr: {
    type: String,
    required: true,
    trim: true,
    example: 'مقياس الذكاء'
  },

  nameEn: {
    type: String,
    required: true,
    trim: true,
    example: 'Intelligence Scale'
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
      'SOCIAL_EMOTIONAL' // مقاييس اجتماعية عاطفية
    ]
  },

  description: String,

  targetDisabilities: [{
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
      'OTHER'
    ]
  }],

  ageRange: {
    minAge: Number,
    maxAge: Number,
    description: String
  },

  estimatedTime: {
    type: Number,
    description: 'المدة التقريبية بالدقائق'
  },

  isStandardized: {
    type: Boolean,
    default: false,
    description: 'متقارن/معياري؟'
  },

  normSource: {
    type: String,
    description: 'مصدر المعايير (وكسلر، ستانفورد بينيه، إلخ)'
  },

  scoringMethod: {
    type: String,
    enum: ['LIKERT', 'RAW_SCORE', 'STANDARD_SCORE', 'PERCENTILE', 'QUALITATIVE', 'CHECKLIST'],
    required: true
  },

  scoreRange: {
    min: Number,
    max: Number,
    description: String
  },

  interpretationLevels: [{
    level: String, // مثل: شديد، متوسط، طبيعي
    minScore: Number,
    maxScore: Number,
    description: String,
    recommendations: [String]
  }],

  domains: [{
    code: String,
    name: String,
    description: String,
    weight: Number // النسبة في الدرجة الكلية
  }],

  administratedBy: {
    type: String,
    enum: ['PSYCHOLOGIST', 'EDUCATOR', 'SPEECH_THERAPIST', 'PHYSIOTHERAPIST', 'GENERAL_STAFF']
  },

  isActive: {
    type: Boolean,
    default: true
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'measurement_types' });

// ============================
// 2. نموذج المقاييس الرئيسي (Measurement Master)
// ============================
const MeasurementMasterSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    example: 'MEAS-IQ-WECHSLER-001'
  },

  typeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MeasurementType',
    required: true
  },

  nameAr: {
    type: String,
    required: true,
    trim: true,
    example: 'مقياس وكسلر للذكاء (الإصدار الخامس)'
  },

  nameEn: {
    type: String,
    required: true,
    trim: true,
    example: 'Wechsler Intelligence Scale (Version 5)'
  },

  description: String,

  version: {
    number: String,
    releaseDate: Date,
    author: String
  },

  targetDisabilities: [{
    type: String,
    ref: 'MeasurementType.targetDisabilities'
  }],

  ageRange: {
    minAge: Number,
    maxAge: Number
  },

  administrationGuide: String,

  items: [{
    itemNumber: Number,
    questionAr: String,
    questionEn: String,
    domainCode: String,
    scoringInstructions: String,
    maxScore: Number
  }],

  totalItems: Number,

  estimatedDuration: {
    type: Number,
    description: 'الدقائق'
  },

  scoringMethod: {
    type: String,
    enum: ['MANUAL', 'AUTOMATED', 'BOTH']
  },

  scoringGuide: String,

  normTables: {
    population: String,
    year: Number,
    ageGroups: [{
      ageRange: String,
      meanScore: Number,
      standardDeviation: Number,
      percentiles: {}
    }]
  },

  reliabilityCoefficients: {
    cronbachAlpha: Number,
    testRetest: Number,
    interRater: Number
  },

  validityInfo: {
    constructValidity: String,
    criterionValidity: String,
    notes: String
  },

  interpretationGuide: {
    scoreRange: [{
      min: Number,
      max: Number,
      level: String,
      description: String,
      implication: String
    }],
    specialConsiderations: [String]
  },

  requiredCertifications: [String],

  culturalAdaptations: [{
    culturalContext: String,
    modifications: [String],
    validationData: String
  }],

  isActive: {
    type: Boolean,
    default: true
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'measurement_masters' });

// ============================
// 3. نموذج نتائج القياس (Measurement Results)
// ============================
const MeasurementResultSchema = new mongoose.Schema({
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BeneficiaryProfile',
    required: true
  },

  measurementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MeasurementMaster',
    required: true
  },

  typeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MeasurementType',
    required: true
  },

  administratedBy: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    name: String,
    certifications: [String]
  },

  dateAdministrated: {
    type: Date,
    required: true
  },

  // البيانات الأساسية
  rawScore: {
    type: Number,
    required: true
  },

  standardScore: Number,

  percentileRank: Number,

  ageEquivalent: String,

  gradeEquivalent: String,

  // النتائج حسب المجالات
  domainScores: [{
    domainCode: String,
    domainName: String,
    rawScore: Number,
    standardScore: Number,
    percentile: Number,
    level: String // مثل: ضعيف، متوسط، قوي
  }],

  // المستوى الكلي
  overallLevel: {
    type: String,
    enum: ['PROFOUND', 'SEVERE', 'MODERATE', 'MILD', 'BORDERLINE', 'AVERAGE', 'ABOVE_AVERAGE', 'SUPERIOR'],
    required: true
  },

  interpretation: {
    summary: String,
    strengths: [String],
    weaknesses: [String],
    recommendations: [String],
    specialNotes: String
  },

  // ملاحظات السلوك والملاحظات الإكلينيكية
  behavioralObservations: {
    attention: String,
    motivation: String,
    cooperation: String,
    anxiety: String,
    otherObservations: String
  },

  // قيود الاختبار
  testingLimitations: [String],

  // المتابعة الموصى بها
  recommendedFollowUp: {
    type: String,
    enum: ['NONE', 'AFTER_3_MONTHS', 'AFTER_6_MONTHS', 'AFTER_1_YEAR', 'AS_NEEDED']
  },

  linkedPrograms: [{
    programId: mongoose.Schema.Types.ObjectId,
    matchScore: Number, // درجة التطابق (0-100)
    activationDate: Date,
    reason: String
  }],

  // حالة النتيجة
  status: {
    type: String,
    enum: ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'ARCHIVED'],
    default: 'DRAFT'
  },

  approvalInfo: {
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvalDate: Date,
    approvalNotes: String
  },

  reportDocument: {
    fileUrl: String,
    generatedAt: Date,
    format: {
      type: String,
      enum: ['PDF', 'DOCX', 'HTML']
    }
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // للحفاظ على التاريخ
  isLatest: Boolean,
  previousResultId: mongoose.Schema.Types.ObjectId
}, { collection: 'measurement_results' });

// ============================
// 4. نموذج الخطة التأهيلية الفردية (IRP - Individual Rehabilitation Plan)
// ============================
const IndividualRehabPlanSchema = new mongoose.Schema({
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BeneficiaryProfile',
    required: true
  },

  planCode: {
    type: String,
    unique: true,
    trim: true,
    example: 'IRP-2026-00001'
  },

  // البيانات الشخصية المرجعية
  beneficiaryInfo: {
    name: String,
    disabilityType: String,
    severityLevel: String,
    age: Number,
    educationalLevel: String
  },

  // فريق التخطيط
  planningTeam: [{
    role: String, // قائد الفريق، معالج، معلم
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    specialty: String
  }],

  // المقاييس الأساسية المستخدمة
  baseMeasurements: [{
    measurementId: mongoose.Schema.Types.ObjectId,
    resultId: mongoose.Schema.Types.ObjectId,
    dateAdministrated: Date,
    overallLevel: String,
    keyFindings: [String]
  }],

  // الرؤية والرسالة
  vision: {
    longTermGoals: [String],
    description: String
  },

  mission: {
    shortTermObjectives: [String],
    description: String
  },

  // المجالات التأهيلية
  rehabilitationAreas: [{
    areaCode: String,
    areaName: String, // مثل: حياة يومية، أكاديمية، اجتماعية
    currentLevel: String,
    targetLevel: String,
    priority: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW']
    },
    programs: [{
      programId: mongoose.Schema.Types.ObjectId,
      programName: String,
      startDate: Date,
      targetDuration: Number // أسابيع
    }]
  }],

  // البرامج النشطة المرتبطة
  activePrograms: [{
    programId: mongoose.Schema.Types.ObjectId,
    programName: String,
    startDate: { type: Date, required: true },
    expectedEndDate: Date,
    frequency: String, // مثل: مرتين أسبوعياً
    duration: Number, // دقائق
    provider: mongoose.Schema.Types.ObjectId,
    status: {
      type: String,
      enum: ['NOT_STARTED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'TRANSFERRED']
    },
    progress: {
      sessionsCompleted: Number,
      sessionsPlanned: Number,
      successRate: Number,
      notes: String
    }
  }],

  // الأهداف المرحلية والمؤشرات
  milestones: [{
    description: String,
    targetDate: Date,
    relatedPrograms: [mongoose.Schema.Types.ObjectId],
    measurableIndicators: [String],
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'POSTPONED']
    },
    completionDate: Date
  }],

  // التوصيات والملاحظات
  recommendations: {
    atHome: [String],
    atCenter: [String],
    atSchool: [String],
    familyGuidance: [String]
  },

  // معلومات الدعم الأسري
  familyInvolvement: {
    description: String,
    participationLevel: {
      type: String,
      enum: ['MINIMAL', 'REGULAR', 'INTENSIVE']
    },
    trainingNeeds: [String],
    supportServices: [String]
  },

  // التواصل مع المؤسسات الأخرى
  externalCoordination: [{
    institution: String,
    contactPerson: String,
    coordinationPoints: [String],
    lastContactDate: Date
  }],

  // معلومات الخطة
  planPeriod: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    reviewSchedule: String // مثل: كل 3 أشهر
  },

  // التقييم والمراجعة
  reviews: [{
    reviewDate: Date,
    reviewer: mongoose.Schema.Types.ObjectId,
    progressSummary: String,
    programsPerformance: [{
      programId: mongoose.Schema.Types.ObjectId,
      status: String,
      achievements: [String],
      challenges: [String],
      adjustments: [String]
    }],
    overallProgress: String,
    nextSteps: [String],
    rating: {
      type: String,
      enum: ['EXCELLENT', 'GOOD', 'SATISFACTORY', 'NEEDS_IMPROVEMENT']
    }
  }],

  // الحالة
  status: {
    type: String,
    enum: ['DRAFT', 'ACTIVE', 'UNDER_REVIEW', 'COMPLETED', 'ARCHIVED'],
    default: 'DRAFT'
  },

  approvalInfo: {
    approvedBy: mongoose.Schema.Types.ObjectId,
    approvalDate: Date,
    approvalNotes: String
  },

  documentUrl: String,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: mongoose.Schema.Types.ObjectId,

}, { collection: 'individual_rehab_plans' });

// ============================
// 5. نموذج مقاييس إضافية سريعة (Quick Assessment)
// ============================
const QuickAssessmentSchema = new mongoose.Schema({
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BeneficiaryProfile',
    required: true
  },

  assessmentType: {
    type: String,
    enum: ['DAILY_LIVING', 'BEHAVIORAL_CHECKLIST', 'PROGRESS_TRACKING', 'INTAKE_SCREENING'],
    required: true
  },

  items: [{
    itemCode: String,
    question: String,
    response: String,
    score: Number,
    notes: String,
    date: Date
  }],

  totalScore: Number,

  level: String,

  performedBy: mongoose.Schema.Types.ObjectId,

  date: { type: Date, default: Date.now },

  linkedResult: mongoose.Schema.Types.ObjectId,

  createdAt: { type: Date, default: Date.now }
}, { collection: 'quick_assessments' });

// ============================
// Indexes
// ============================
MeasurementTypeSchema.index({ category: 1, isActive: 1 });
MeasurementTypeSchema.index({ targetDisabilities: 1 });

MeasurementMasterSchema.index({ typeId: 1, isActive: 1 });
MeasurementMasterSchema.index({ targetDisabilities: 1 });

MeasurementResultSchema.index({ beneficiaryId: 1, dateAdministrated: -1 });
MeasurementResultSchema.index({ beneficiaryId: 1, typeId: 1 });
MeasurementResultSchema.index({ status: 1 });

IndividualRehabPlanSchema.index({ beneficiaryId: 1, status: 1 });
IndividualRehabPlanSchema.index({ planPeriod: 1 });
IndividualRehabPlanSchema.index({ 'activePrograms.programId': 1 });

// ============================
// Exports
// ============================
module.exports = {
  MeasurementType: mongoose.model('MeasurementType', MeasurementTypeSchema),
  MeasurementMaster: mongoose.model('MeasurementMaster', MeasurementMasterSchema),
  MeasurementResult: mongoose.model('MeasurementResult', MeasurementResultSchema),
  IndividualRehabPlan: mongoose.model('IndividualRehabPlan', IndividualRehabPlanSchema),
  QuickAssessment: mongoose.model('QuickAssessment', QuickAssessmentSchema)
};
