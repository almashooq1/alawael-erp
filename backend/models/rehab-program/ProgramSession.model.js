'use strict';

const mongoose = require('mongoose');

const ProgramSessionSchema = new mongoose.Schema(
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

    sessionNumber: Number,

    scheduledDate: {
      type: Date,
      required: true,
    },

    actualDate: Date,

    sessionDuration: Number,

    sessionType: {
      type: String,
      enum: ['INDIVIDUAL', 'GROUP', 'FAMILY_CONSULTATION', 'PARENT_TRAINING', 'HOME_VISIT'],
    },

    facilitators: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        role: String,
      },
    ],

    participants: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        type: {
          type: String,
          enum: ['BENEFICIARY', 'FAMILY_MEMBER', 'PEER', 'STAFF'],
        },
      },
    ],

    // محتوى الجلسة
    content: {
      objectives: [String],
      activitiesPerformed: [String],
      techniques: [String],
      materialsUsed: [String],
      notes: String,
    },

    // الأداء والملاحظات
    performance: {
      beneficiaryEngagement: {
        type: String,
        enum: ['EXCELLENT', 'GOOD', 'FAIR', 'POOR'],
      },

      taskCompletion: {
        type: Number,
        min: 0,
        max: 100,
        description: 'النسبة المئوية',
      },

      behavioralNotes: String,

      strengthsObserved: [String],

      challengesEncountered: [String],

      strategies: [String],
    },

    // التعليم والتدريب المقدم
    education: {
      parentTrainingTopics: [String],
      homeActivities: [String],
      reinforcementStrategies: [String],
    },

    // الخطوات التالية
    nextSteps: {
      plannedInterventions: [String],
      recommendedHomework: String,
      nextSessionDate: Date,
      notes: String,
    },

    // التقييم والنتائج
    sessionOutcome: {
      goalsAchieved: [String],
      progressTowardObjectives: String,
      rating: {
        type: String,
        enum: ['EXCELLENT', 'GOOD', 'SATISFACTORY', 'NEEDS_IMPROVEMENT'],
      },
    },

    // الملفات والمرفقات
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        type: String,
        uploadedAt: Date,
      },
    ],

    // الحالة
    status: {
      type: String,
      enum: ['SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW'],
      default: 'SCHEDULED',
    },

    cancellationReason: String,

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'program_sessions' }
);

ProgramSessionSchema.index({ beneficiaryId: 1, scheduledDate: -1 });
ProgramSessionSchema.index({ programId: 1, scheduledDate: -1 });
ProgramSessionSchema.index({ status: 1 });

const ProgramSession =
  mongoose.models.ProgramSession || mongoose.model('ProgramSession', ProgramSessionSchema);

module.exports = ProgramSession;
