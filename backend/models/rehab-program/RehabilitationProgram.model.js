'use strict';

const mongoose = require('mongoose');

const RehabilitationProgramSchema = new mongoose.Schema(
  {
    // البيانات الأساسية
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      example: 'PROG-DAILY-SELF-CARE-001',
    },

    nameAr: {
      type: String,
      required: true,
      trim: true,
      example: 'برنامج تنمية مهارات العناية بالذات',
    },

    nameEn: {
      type: String,
      required: true,
      trim: true,
      example: 'Self Care Skills Development Program',
    },

    description: String,

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ProgramCategory',
      required: true,
    },

    // الفئات المستهدفة
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
        ],
      },
    ],

    targetAgeGroup: {
      minAge: Number,
      maxAge: Number,
      description: String,
    },

    // مستويات الشدة المناسبة
    suitableSeverityLevels: [
      {
        type: String,
        enum: ['PROFOUND', 'SEVERE', 'MODERATE', 'MILD', 'ALL'],
      },
    ],

    // ربط المقاييس
    linkedMeasurements: [
      {
        measurementTypeId: mongoose.Schema.Types.ObjectId,
        activationRules: {
          // تفعيل البرنامج بناءً على نتيجة المقياس
          minScore: Number,
          maxScore: Number,
          levels: [String], // مثل: ['SEVERE', 'MODERATE']
          mandatory: Boolean, // إلزامي؟
        },
        assessmentFrequency: String, // مثل: كل 3 أشهر
      },
    ],

    // أهداف البرنامج
    objectives: [
      {
        code: String,
        description: String,
        measurableIndicators: [String],
        expectedOutcome: String,
        priority: {
          type: String,
          enum: ['HIGH', 'MEDIUM', 'LOW'],
        },
      },
    ],

    // محتوى البرنامج والتدخل
    interventions: [
      {
        title: String,
        description: String,
        type: {
          type: String,
          enum: ['DIRECT_THERAPY', 'TRAINING', 'CONSULTATION', 'COACHING', 'HOME_PROGRAM'],
        },
        techniques: [String],
        materials: [String],
        stepwiseProgression: {
          step: Number,
          description: String,
          duration: Number, // أسابيع
          criteria: [String], // معايير الانتقال للخطوة التالية
        },
      },
    ],

    // إعدادات الجلسات
    sessionConfig: {
      standardDuration: {
        type: Number,
        default: 60,
        description: 'الدقائق',
      },

      minDuration: Number,
      maxDuration: Number,

      recommendedFrequency: {
        sessionsPerWeek: Number,
        totalSessions: Number,
        totalDurationWeeks: Number,
      },

      groupSessionInfo: {
        isGroupEligible: Boolean,
        maxGroupSize: Number,
        minParticipants: Number,
      },

      homeBasedComponent: {
        hasHomeProgram: Boolean,
        frequencyPerWeek: Number,
        estimatedTime: Number,
      },
    },

    // مراحل البرنامج
    phases: [
      {
        phaseNumber: Number,
        phaseNameAr: String,
        phaseNameEn: String,
        description: String,
        duration: Number,
        goals: [String],
        activities: [
          {
            activityName: String,
            frequency: String,
            duration: Number,
            objectives: [String],
          },
        ],
        progressCriteria: [String],
        exitCriteria: [String],
      },
    ],

    // المعايير والمؤشرات
    successIndicators: [
      {
        indicator: String,
        measurableGoal: String,
        dataSource: String,
        frequency: String,
      },
    ],

    // الموارد المطلوبة
    requiredResources: {
      staff: [
        {
          role: String,
          qualification: String,
          certifications: [String],
          hoursPerWeek: Number,
        },
      ],

      materials: [
        {
          name: String,
          quantity: Number,
          estimatedCost: Number,
          supplier: String,
        },
      ],

      facilities: [String],

      equipment: [
        {
          name: String,
          quantity: Number,
          specifications: String,
        },
      ],
    },

    // الدعم الأسري
    familySupportComponent: {
      parentTraining: {
        required: Boolean,
        topics: [String],
        frequency: String,
      },

      homeProgram: {
        description: String,
        activities: [String],
        frequency: String,
        parentGuidance: String,
      },

      consultationSchedule: String,
    },

    // التعاون والتنسيق
    collaboration: {
      internalTeams: [String], // أقسام داخل المركز
      externalPartners: [String], // مؤسسات خارجية
      coordinationFrequency: String,
    },

    // مدة البرنامج والتكلفة
    programDuration: {
      estimatedWeeks: Number,
      flexible: Boolean,
      extensionCriteria: [String],
    },

    programCost: {
      costPerSession: Number,
      estimatedTotalCost: Number,
      currency: String,
      covered: {
        type: Boolean,
        description: 'هل يغطى من قبل الضمان أم الجهات الأخرى',
      },
    },

    // معايير القبول والاستبعاد
    admissionCriteria: {
      inclusion: [String],
      exclusion: [String],
      contraindications: [String],
    },

    // الالتحاق والتحويل
    enrollmentGuidelines: {
      waitingListPolicy: String,
      priorityGuidelines: [String],
      transferOutCriteria: [String],
    },

    // التوثيق والسجلات
    documentationRequirements: {
      initialAssessment: Boolean,
      sessionNotes: Boolean,
      progressReports: Boolean,
      reportFrequency: String,
    },

    // الملفات والموارد التعليمية
    educationalMaterials: [
      {
        title: String,
        type: {
          type: String,
          enum: ['VIDEO', 'GUIDE', 'MANUAL', 'WORKSHEET', 'OTHER'],
        },
        url: String,
        language: String,
      },
    ],

    // موفرو البرنامج
    providers: [
      {
        providerId: mongoose.Schema.Types.ObjectId,
        centerName: String,
        certifications: [String],
        startDate: Date,
        successRate: Number,
      },
    ],

    // سياسات ومعايير الجودة
    qualityStandards: {
      assessmentFrequency: String,
      outcomesMeasurement: [String],
      clientSatisfactionTracking: Boolean,
      performanceMetrics: [String],
    },

    // البيانات الإدارية
    status: {
      type: String,
      enum: ['DRAFT', 'APPROVED', 'ACTIVE', 'ARCHIVED'],
      default: 'DRAFT',
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    evidenceBase: {
      researchBased: Boolean,
      studiesSupporting: [String],
      effectivenessData: String,
    },

    version: {
      number: String,
      lastUpdated: Date,
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    createdBy: mongoose.Schema.Types.ObjectId,
  },
  { collection: 'rehabilitation_programs' }
);

RehabilitationProgramSchema.index({ categoryId: 1, isActive: 1 });
RehabilitationProgramSchema.index({ targetDisabilities: 1 });
RehabilitationProgramSchema.index({ 'linkedMeasurements.measurementTypeId': 1 });

const RehabilitationProgram =
  mongoose.models.RehabilitationProgram ||
  mongoose.model('RehabilitationProgram', RehabilitationProgramSchema);

module.exports = RehabilitationProgram;
