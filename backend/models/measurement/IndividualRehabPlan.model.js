'use strict';

const mongoose = require('mongoose');

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
// Virtuals
// ============================

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
// Indexes
// ============================
IndividualRehabPlanSchema.index({ beneficiaryId: 1, status: 1 });
IndividualRehabPlanSchema.index({ planPeriod: 1 });
IndividualRehabPlanSchema.index({ 'activePrograms.programId': 1 });
// planCode: removed — unique:true creates implicit index

const IndividualRehabPlan =
  mongoose.models.IndividualRehabPlan ||
  mongoose.model('IndividualRehabPlan', IndividualRehabPlanSchema);

module.exports = IndividualRehabPlan;
