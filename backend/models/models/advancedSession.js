/**
 * نموذج الجلسات المتقدمة - Advanced Session Model
 * يدير تفاصيل الجلسات العلاجية والتعليمية المتقدمة
 */

const mongoose = require('mongoose');

const SESSION_STATUSES = {
  SCHEDULED: 'مجدولة',
  IN_PROGRESS: 'جاريـة',
  COMPLETED: 'مكتملة',
  CANCELLED: 'ملغاة',
  RESCHEDULED: 'معاد جدولتها',
  NO_SHOW: 'لم تحضر',
};

const ATTENDANCE_STATUS = {
  PRESENT: 'حاضر',
  ABSENT: 'غائب',
  LATE: 'متأخر',
  EXCUSED: 'غياب معذور',
  PARTIAL: 'حضور جزئي',
};

const advancedSessionSchema = new mongoose.Schema(
  {
    // معرفات العلاقة
    beneficiaryId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },

    programId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'SpecializedProgram',
    },

    specialistId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: 'User',
    },

    plannedSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PlannedSession',
    },

    // معلومات الجلسة الأساسية
    sessionNumber: Number, // رقم الجلسة في السلسلة

    title: {
      type: String,
      required: true,
    },

    description: String,

    // الجدولة الزمنية
    scheduledDateTime: {
      type: Date,
      required: true,
    },

    actualStartTime: Date,
    actualEndTime: Date,

    scheduledDuration: {
      type: Number,
      required: true, // بالدقائق
      default: 60,
    },

    actualDuration: Number, // بالدقائق

    location: {
      roomId: mongoose.Schema.Types.ObjectId,
      roomName: String,
      building: String,
      floor: Number,
      capacity: Number,
    },

    // حالة الجلسة
    status: {
      type: String,
      enum: Object.values(SESSION_STATUSES),
      default: SESSION_STATUSES.SCHEDULED,
    },

    // حضور المستفيد
    beneficiaryAttendance: {
      status: {
        type: String,
        enum: Object.values(ATTENDANCE_STATUS),
      },
      arrivalTime: Date,
      departureTime: Date,
      remarks: String,
    },

    // أهداف الجلسة
    sessionGoals: [
      {
        goalId: mongoose.Schema.Types.ObjectId,
        title: String,
        description: String,
        targetOutcome: String,
        priority: {
          type: String,
          enum: ['high', 'medium', 'low'],
        },
        expectedProgress: String,
      },
    ],

    // الأنشطة والتمارين المخطط لها
    plannedActivities: [
      {
        activityId: mongoose.Schema.Types.ObjectId,
        name: String,
        description: String,
        sequenceNumber: Number,
        estimatedDuration: Number,
        equipment: [String],
        instructions: String,
        adaptations: String, // التعديلات على التمرين
        difficultyLevel: String,
        targetAreas: [String],
      },
    ],

    // الأنشطة المنفذة فعلياً
    implementedActivities: [
      {
        activityId: mongoose.Schema.Types.ObjectId,
        name: String,
        actualDuration: Number,
        completed: Boolean,
        competencyLevel: {
          type: String,
          enum: ['independent', 'supervised', 'assisted', 'minimal-contact', 'not-attempted'],
        },
        beneficiaryResponse: String,
        modifications: String,
        challenges: String,
        successIndicators: [String],
        notes: String,
      },
    ],

    // تقييم الأداء والاستجابة
    performanceAssessment: {
      overallEngagement: {
        type: String,
        enum: ['excellent', 'good', 'moderate', 'poor'],
      },
      engagementNotes: String,

      motivation: {
        type: String,
        enum: ['high', 'moderate', 'low'],
      },

      concentration: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
      },

      cooperation: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
      },

      emotionalState: String,

      behaviouralObservations: [String],

      progressTowardGoals: {
        type: String,
        enum: ['excellent', 'good', 'moderate', 'minimal', 'none'],
      },

      estimatedGoalAttainment: Number, // نسبة % من تحقيق الأهداف
    },

    // المواد والأدوات المستخدمة
    usedEquipment: [
      {
        equipmentId: mongoose.Schema.Types.ObjectId,
        name: String,
        quantity: Number,
        condition: {
          type: String,
          enum: ['excellent', 'good', 'fair', 'needs-repair'],
        },
        notes: String,
      },
    ],

    usedMaterials: [
      {
        materialId: mongoose.Schema.Types.ObjectId,
        name: String,
        type: String,
        quantity: Number,
      },
    ],

    // الملاحظات والتوصيات
    specialistNotes: {
      generalObservations: String,

      strengthsObserved: [String],

      challengesIdentified: [String],

      recommendations: [String],

      homeExercises: [
        {
          exerciseName: String,
          description: String,
          frequency: String,
          duration: Number,
          instructions: String,
          parentalSupport: String,
        },
      ],

      nextSessionFocus: String,

      priorityForNextSession: [String],
    },

    // التوصيات لتحسين الخدمة
    serviceRecommendations: {
      sessionFrequencyAdjustment: String,
      programModifications: [String],
      additionalServices: [String],
      referrals: [String],
    },

    // المشاركون الإضافيون
    additionalParticipants: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        role: {
          type: String,
          enum: ['observer', 'co-specialist', 'parent', 'caregiver', 'support-staff'],
        },
        notes: String,
      },
    ],

    // المرفقات والتوثيق
    attachments: [
      {
        fileId: mongoose.Schema.Types.ObjectId,
        fileName: String,
        fileType: String,
        uploadedAt: Date,
        uploadedBy: mongoose.Schema.Types.ObjectId,
        description: String,
        category: {
          type: String,
          enum: ['photo', 'video', 'assessment', 'report', 'worksheet'],
        },
      },
    ],

    // المتابعة والتقييم
    followUp: {
      scheduledFollowUp: Date,
      followUpReason: String,
      additionalAssessmentNeeded: Boolean,
      assessmentType: String,
    },

    // الموافقة والتوقيع
    approvals: {
      specialistSignature: Boolean,
      specialistSignedAt: Date,
      supervisorReview: Boolean,
      supervisorReviewedAt: Date,
      supervisorNotes: String,
      parentConfirmation: Boolean,
      parentConfirmedAt: Date,
      parentSignature: Boolean,
    },

    // البيانات الإدارية
    createdBy: mongoose.Schema.Types.ObjectId,
    createdAt: {
      type: Date,
      default: Date.now,
    },

    updatedBy: mongoose.Schema.Types.ObjectId,
    updatedAt: {
      type: Date,
      default: Date.now,
    },

    sessionNotes: String,
  },
  {
    timestamps: true,
    collection: 'advancedSessions',
  }
);

// الفهارس
advancedSessionSchema.index({ beneficiaryId: 1, scheduledDateTime: 1 });
advancedSessionSchema.index({ specialistId: 1, scheduledDateTime: 1 });
advancedSessionSchema.index({ programId: 1 });
advancedSessionSchema.index({ status: 1 });
advancedSessionSchema.index({ 'beneficiaryAttendance.status': 1 });
advancedSessionSchema.index({ scheduledDateTime: 1 });

module.exports = {
  model: mongoose.model('AdvancedSession', advancedSessionSchema),
  schema: advancedSessionSchema,
  SESSION_STATUSES,
  ATTENDANCE_STATUS,
};
