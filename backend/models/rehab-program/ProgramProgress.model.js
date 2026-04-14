'use strict';

const mongoose = require('mongoose');

const ProgramProgressSchema = new mongoose.Schema(
  {
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BeneficiaryProfile',
      required: true,
    },

    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RehabilitationProgram',
      required: true,
    },

    enrollmentDate: Date,

    completionDate: Date,

    expectedCompletionDate: Date,

    totalPlannedSessions: Number,

    completedSessions: Number,

    missedSessions: Number,

    // التقدم حسب الأهداف
    objectiveProgress: [
      {
        objectiveCode: String,
        description: String,
        baselineLevel: String,
        currentLevel: String,
        targetLevel: String,
        progress: Number, // نسبة مئوية
        lastAssessmentDate: Date,
        status: {
          type: String,
          enum: ['NOT_STARTED', 'IN_PROGRESS', 'PARTIALLY_MET', 'MET', 'EXCEEDED'],
        },
      },
    ],

    // الإحصائيات والمؤشرات
    statistics: {
      medianSessionRating: Number,
      attendanceRate: Number,
      engagementScore: Number,
      skillAcquisitionRate: Number,
      generalizationRate: Number,
    },

    // التحديات والحلول
    challenges: [
      {
        description: String,
        impactOnProgress: String,
        solutionsAttempted: [String],
        effectiveness: String,
        dateIdentified: Date,
      },
    ],

    // التكييفات والتعديلات
    adaptations: [
      {
        description: String,
        reason: String,
        implementationDate: Date,
        impact: String,
      },
    ],

    // التقييم الدوري
    periodicReviews: [
      {
        reviewDate: Date,
        reviewer: mongoose.Schema.Types.ObjectId,
        progressSummary: String,
        recommendedAdjustments: [String],
        nextPhaseRecommendation: String,
        rating: {
          type: String,
          enum: ['ON_TRACK', 'PROGRESSING_SLOWLY', 'NOT_PROGRESSING', 'EXCEEDING_EXPECTATIONS'],
        },
      },
    ],

    // خطة التخريج/الانتقال
    exitPlan: {
      targetExitDate: Date,
      exitCriteriaMet: [String],
      followUpPlan: String,
      nextPlacement: String,
      transitionSupport: [String],
    },

    // الحالة الإجمالية
    overallStatus: {
      type: String,
      enum: ['ENROLLING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'TRANSFERRED', 'WITHDRAWN'],
      default: 'ENROLLING',
    },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'program_progress' }
);

ProgramProgressSchema.index({ beneficiaryId: 1, programId: 1 });
ProgramProgressSchema.index({ overallStatus: 1 });

const ProgramProgress =
  mongoose.models.ProgramProgress || mongoose.model('ProgramProgress', ProgramProgressSchema);

module.exports = ProgramProgress;
