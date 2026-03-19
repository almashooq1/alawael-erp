/**
 * نموذج البرامج التأهيلية المتقدم
 * Advanced Rehabilitation Programs Model
 * =======================================
 * برنامج متطور يدعم الربط الذكي مع المقاييس والتقييمات
 */

const mongoose = require('mongoose');

// ============================
// 1. فئات البرامج (Program Categories)
// ============================
const ProgramCategorySchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    example: 'DAILY_LIVING'
  },

  nameAr: {
    type: String,
    required: true,
    trim: true
  },

  nameEn: {
    type: String,
    required: true,
    trim: true
  },

  description: String,

  color: String,

  icon: String,

  isActive: {
    type: Boolean,
    default: true
  },

  createdAt: { type: Date, default: Date.now }
}, { collection: 'program_categories' });

// ============================
// 2. برنامج تأهيلي متقدم
// ============================
const RehabilitationProgramSchema = new mongoose.Schema({
  // البيانات الأساسية
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    example: 'PROG-DAILY-SELF-CARE-001'
  },

  nameAr: {
    type: String,
    required: true,
    trim: true,
    example: 'برنامج تنمية مهارات العناية بالذات'
  },

  nameEn: {
    type: String,
    required: true,
    trim: true,
    example: 'Self Care Skills Development Program'
  },

  description: String,

  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProgramCategory',
    required: true
  },

  // الفئات المستهدفة
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
      'MULTIPLE'
    ]
  }],

  targetAgeGroup: {
    minAge: Number,
    maxAge: Number,
    description: String
  },

  // مستويات الشدة المناسبة
  suitableSeverityLevels: [{
    type: String,
    enum: ['PROFOUND', 'SEVERE', 'MODERATE', 'MILD', 'ALL']
  }],

  // ربط المقاييس
  linkedMeasurements: [{
    measurementTypeId: mongoose.Schema.Types.ObjectId,
    activationRules: {
      // تفعيل البرنامج بناءً على نتيجة المقياس
      minScore: Number,
      maxScore: Number,
      levels: [String], // مثل: ['SEVERE', 'MODERATE']
      mandatory: Boolean // إلزامي؟
    },
    assessmentFrequency: String // مثل: كل 3 أشهر
  }],

  // أهداف البرنامج
  objectives: [{
    code: String,
    description: String,
    measurableIndicators: [String],
    expectedOutcome: String,
    priority: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW']
    }
  }],

  // محتوى البرنامج والتدخل
  interventions: [{
    title: String,
    description: String,
    type: {
      type: String,
      enum: ['DIRECT_THERAPY', 'TRAINING', 'CONSULTATION', 'COACHING', 'HOME_PROGRAM']
    },
    techniques: [String],
    materials: [String],
    stepwiseProgression: {
      step: Number,
      description: String,
      duration: Number, // أسابيع
      criteria: [String] // معايير الانتقال للخطوة التالية
    }
  }],

  // إعدادات الجلسات
  sessionConfig: {
    standardDuration: {
      type: Number,
      default: 60,
      description: 'الدقائق'
    },

    minDuration: Number,
    maxDuration: Number,

    recommendedFrequency: {
      sessionsPerWeek: Number,
      totalSessions: Number,
      totalDurationWeeks: Number
    },

    groupSessionInfo: {
      isGroupEligible: Boolean,
      maxGroupSize: Number,
      minParticipants: Number
    },

    homeBasedComponent: {
      hasHomeProgram: Boolean,
      frequencyPerWeek: Number,
      estimatedTime: Number
    }
  },

  // مراحل البرنامج
  phases: [{
    phaseNumber: Number,
    phaseNameAr: String,
    phaseNameEn: String,
    description: String,
    duration: Number,
    goals: [String],
    activities: [{
      activityName: String,
      frequency: String,
      duration: Number,
      objectives: [String]
    }],
    progressCriteria: [String],
    exitCriteria: [String]
  }],

  // المعايير والمؤشرات
  successIndicators: [{
    indicator: String,
    measurableGoal: String,
    dataSource: String,
    frequency: String
  }],

  // الموارد المطلوبة
  requiredResources: {
    staff: [{
      role: String,
      qualification: String,
      certifications: [String],
      hoursPerWeek: Number
    }],

    materials: [{
      name: String,
      quantity: Number,
      estimatedCost: Number,
      supplier: String
    }],

    facilities: [String],

    equipment: [{
      name: String,
      quantity: Number,
      specifications: String
    }]
  },

  // الدعم الأسري
  familySupportComponent: {
    parentTraining: {
      required: Boolean,
      topics: [String],
      frequency: String
    },

    homeProgram: {
      description: String,
      activities: [String],
      frequency: String,
      parentGuidance: String
    },

    consultationSchedule: String
  },

  // التعاون والتنسيق
  collaboration: {
    internalTeams: [String], // أقسام داخل المركز
    externalPartners: [String], // مؤسسات خارجية
    coordinationFrequency: String
  },

  // مدة البرنامج والتكلفة
  programDuration: {
    estimatedWeeks: Number,
    flexible: Boolean,
    extensionCriteria: [String]
  },

  programCost: {
    costPerSession: Number,
    estimatedTotalCost: Number,
    currency: String,
    covered: {
      type: Boolean,
      description: 'هل يغطى من قبل الضمان أم الجهات الأخرى'
    }
  },

  // معايير القبول والاستبعاد
  admissionCriteria: {
    inclusion: [String],
    exclusion: [String],
    contraindications: [String]
  },

  // الالتحاق والتحويل
  enrollmentGuidelines: {
    waitingListPolicy: String,
    priorityGuidelines: [String],
    transferOutCriteria: [String]
  },

  // التوثيق والسجلات
  documentationRequirements: {
    initialAssessment: Boolean,
    sessionNotes: Boolean,
    progressReports: Boolean,
    reportFrequency: String
  },

  // الملفات والموارد التعليمية
  educationalMaterials: [{
    title: String,
    type: {
      type: String,
      enum: ['VIDEO', 'GUIDE', 'MANUAL', 'WORKSHEET', 'OTHER']
    },
    url: String,
    language: String
  }],

  // موفرو البرنامج
  providers: [{
    providerId: mongoose.Schema.Types.ObjectId,
    centerName: String,
    certifications: [String],
    startDate: Date,
    successRate: Number
  }],

  // سياسات ومعايير الجودة
  qualityStandards: {
    assessmentFrequency: String,
    outcomesMeasurement: [String],
    clientSatisfactionTracking: Boolean,
    performanceMetrics: [String]
  },

  // البيانات الإدارية
  status: {
    type: String,
    enum: ['DRAFT', 'APPROVED', 'ACTIVE', 'ARCHIVED'],
    default: 'DRAFT'
  },

  isActive: {
    type: Boolean,
    default: true
  },

  evidenceBase: {
    researchBased: Boolean,
    studiesSupporting: [String],
    effectivenessData: String
  },

  version: {
    number: String,
    lastUpdated: Date
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: mongoose.Schema.Types.ObjectId
}, { collection: 'rehabilitation_programs' });

// ============================
// 3. جلسة برنامج تأهيلي (Program Session)
// ============================
const ProgramSessionSchema = new mongoose.Schema({
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BeneficiaryProfile',
    required: true
  },

  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RehabilitationProgram',
    required: true
  },

  sessionNumber: Number,

  scheduledDate: {
    type: Date,
    required: true
  },

  actualDate: Date,

  sessionDuration: Number,

  sessionType: {
    type: String,
    enum: ['INDIVIDUAL', 'GROUP', 'FAMILY_CONSULTATION', 'PARENT_TRAINING', 'HOME_VISIT']
  },

  facilitators: [{
    userId: mongoose.Schema.Types.ObjectId,
    name: String,
    role: String
  }],

  participants: [{
    userId: mongoose.Schema.Types.ObjectId,
    type: {
      type: String,
      enum: ['BENEFICIARY', 'FAMILY_MEMBER', 'PEER', 'STAFF']
    }
  }],

  // محتوى الجلسة
  content: {
    objectives: [String],
    activitiesPerformed: [String],
    techniques: [String],
    materialsUsed: [String],
    notes: String
  },

  // الأداء والملاحظات
  performance: {
    beneficiaryEngagement: {
      type: String,
      enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR']
    },

    taskCompletion: {
      type: Number,
      min: 0,
      max: 100,
      description: 'النسبة المئوية'
    },

    behavioralNotes: String,

    strengthsObserved: [String],

    challengesEncountered: [String],

    strategies: [String]
  },

  // التعليم والتدريب المقدم
  education: {
    parentTrainingTopics: [String],
    homeActivities: [String],
    reinforcementStrategies: [String]
  },

  // الخطوات التالية
  nextSteps: {
    plannedInterventions: [String],
    recommendedHomework: String,
    nextSessionDate: Date,
    notes: String
  },

  // التقييم والنتائج
  sessionOutcome: {
    goalsAchieved: [String],
    progressTowardObjectives: String,
    rating: {
      type: String,
      enum: ['EXCELLENT', 'GOOD', 'SATISFACTORY', 'NEEDS_IMPROVEMENT']
    }
  },

  // الملفات والمرفقات
  attachments: [{
    fileName: String,
    fileUrl: String,
    type: String,
    uploadedAt: Date
  }],

  // الحالة
  status: {
    type: String,
    enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW'],
    default: 'SCHEDULED'
  },

  cancellationReason: String,

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'program_sessions' });

// ============================
// 4. تقدم البرنامج (Program Progress)
// ============================
const ProgramProgressSchema = new mongoose.Schema({
  beneficiaryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'BeneficiaryProfile',
    required: true
  },

  programId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'RehabilitationProgram',
    required: true
  },

  enrollmentDate: Date,

  completionDate: Date,

  expectedCompletionDate: Date,

  totalPlannedSessions: Number,

  completedSessions: Number,

  missedSessions: Number,

  // التقدم حسب الأهداف
  objectiveProgress: [{
    objectiveCode: String,
    description: String,
    baselineLevel: String,
    currentLevel: String,
    targetLevel: String,
    progress: Number, // نسبة مئوية
    lastAssessmentDate: Date,
    status: {
      type: String,
      enum: ['NOT_STARTED', 'IN_PROGRESS', 'PARTIALLY_MET', 'MET', 'EXCEEDED']
    }
  }],

  // الإحصائيات والمؤشرات
  statistics: {
    medianSessionRating: Number,
    attendanceRate: Number,
    engagementScore: Number,
    skillAcquisitionRate: Number,
    generalizationRate: Number
  },

  // التحديات والحلول
  challenges: [{
    description: String,
    impactOnProgress: String,
    solutionsAttempted: [String],
    effectiveness: String,
    dateIdentified: Date
  }],

  // التكييفات والتعديلات
  adaptations: [{
    description: String,
    reason: String,
    implementationDate: Date,
    impact: String
  }],

  // التقييم الدوري
  periodicReviews: [{
    reviewDate: Date,
    reviewer: mongoose.Schema.Types.ObjectId,
    progressSummary: String,
    recommendedAdjustments: [String],
    nextPhaseRecommendation: String,
    rating: {
      type: String,
      enum: ['ON_TRACK', 'PROGRESSING_SLOWLY', 'NOT_PROGRESSING', 'EXCEEDING_EXPECTATIONS']
    }
  }],

  // خطة التخريج/الانتقال
  exitPlan: {
    targetExitDate: Date,
    exitCriteriaMet: [String],
    followUpPlan: String,
    nextPlacement: String,
    transitionSupport: [String]
  },

  // الحالة الإجمالية
  overallStatus: {
    type: String,
    enum: ['ENROLLING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'TRANSFERRED', 'WITHDRAWN'],
    default: 'ENROLLING'
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'program_progress' });

// ============================
// Indexes
// ============================
RehabilitationProgramSchema.index({ categoryId: 1, isActive: 1 });
RehabilitationProgramSchema.index({ targetDisabilities: 1 });
RehabilitationProgramSchema.index({ 'linkedMeasurements.measurementTypeId': 1 });

ProgramSessionSchema.index({ beneficiaryId: 1, scheduledDate: -1 });
ProgramSessionSchema.index({ programId: 1, scheduledDate: -1 });
ProgramSessionSchema.index({ status: 1 });

ProgramProgressSchema.index({ beneficiaryId: 1, programId: 1 });
ProgramProgressSchema.index({ overallStatus: 1 });

// ============================
// Exports
// ============================
module.exports = {
  ProgramCategory: mongoose.model('ProgramCategory', ProgramCategorySchema),
  RehabilitationProgram: mongoose.model('RehabilitationProgram', RehabilitationProgramSchema),
  ProgramSession: mongoose.model('ProgramSession', ProgramSessionSchema),
  ProgramProgress: mongoose.model('ProgramProgress', ProgramProgressSchema)
};
