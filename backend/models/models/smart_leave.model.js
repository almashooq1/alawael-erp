/**
 * Smart Leave Request Model - نموذج طلبات الإجازات الذكية
 * مع نظام الموافقة الذكي والتنبيهات
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const smartLeaveSchema = new Schema(
  {
    // معلومات الموظف
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'معرف الموظف مطلوب']
    },

    // نوع الإجازة
    leaveType: {
      type: String,
      enum: [
        'annual', // إجازة سنوية
        'sick', // إجازة مرضية
        'personal', // إجازة شخصية
        'study', // إجازة دراسية
        'paternity', // إجازة الأبوة
        'maternity', // إجازة الأمومة
        'emergency', // إجازة طارئة
        'unpaid', // إجازة بدون راتب
        'compensatory', // إجازة بدل ساعات إضافية
      ],
      required: true
    },

    // فترة الإجازة
    period: {
      startDate: {
        type: Date,
        required: true
      },

      endDate: {
        type: Date,
        required: true,
      },

      durationInDays: {
        type: Number,
        required: true,
      },

      durationInHours: Number,

      includesWeekends: Boolean,
      includesPublicHolidays: Boolean,
    },

    // الأسباب والتفاصيل
    reason: {
      type: String,
      required: [true, 'السبب مطلوب'],
      trim: true,
    },

    detailedDescription: String,

    // المرفقات والوثائق
    attachments: [
      {
        filename: String,
        url: String,
        fileType: {
          type: String,
          enum: ['medical_certificate', 'personal_letter', 'travel_document', 'other'],
        },
        uploadedAt: Date,
        fileSize: Number,
      },
    ],

    // معلومات بديل الموظف (Coverage)
    coverage: {
      alternateEmployeeId: {
        type: Schema.Types.ObjectId,
        ref: 'Employee',
      },

      alternateEmployeeName: String,

      coverageApproved: Boolean,

      coverageDetails: String,

      coverageStartDate: Date,
      coverageEndDate: Date,
    },

    // معلومات الموافقة المتعددة المستويات
    approvals: [
      {
        level: {
          type: String,
          enum: ['direct_manager', 'department_head', 'hr_manager', 'finance'],
          required: true,
        },

        approverId: {
          type: Schema.Types.ObjectId,
          ref: 'Employee',
        },

        approverName: String,

        status: {
          type: String,
          enum: ['pending', 'approved', 'rejected'],
          default: 'pending',
        },

        approvalDate: Date,

        comments: String,

        reason: String, // في حالة الرفض
      },
    ],

    // الحالة العامة
    overallStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled', 'on_leave'],
      default: 'pending'
    },

    statusReason: String,

    // الحساب الذكي للأيام المتاحة
    leaveBalance: {
      // الأيام المتاحة قبل الطلب
      availableDaysBeforeRequest: Number,

      // الأيام المتبقية بعد الطلب
      remainingDaysAfterLeave: Number,

      // التنبيهات بشأن الرصيد
      lowBalanceWarning: Boolean,

      // الأيام المأخوذة سابقاً هذه السنة
      takenDaysThisYear: Number,

      // الأيام المتاحة هذه السنة
      availableDaysThisYear: Number,

      // السنة المالية
      fiscalYear: Number,
    },

    // نظام التنبيهات الذكي
    alerts: [
      {
        type: String,
        example: 'insufficient_balance',
        timestamp: Date,
        severity: {
          type: String,
          enum: ['info', 'warning', 'critical'],
        },
        message: String,
        acknowledged: Boolean,
      },
    ],

    // التحليلات والنماذج
    smartAnalysis: {
      // تحليل الأنماط
      isAnomalousRequest: Boolean, // طلب غير عادي
      anomalyReason: String,

      // مؤشر المخاطر
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'low',
      },

      // الأسباب المحتملة للمخاطر
      riskFactors: [String],

      // التنبؤ بالموافقة
      likelyApprovalProbability: Number, // 0-100

      // التوصيات الآلية
      automatedRecommendation: {
        type: String,
        enum: ['approve', 'review_needed', 'reject'],
      },

      // الأسباب الموصى بها
      recommendationReason: String,

      // تاريخ آخر تحديث التحليل
      analysisUpdatedAt: Date,
    },

    // التنبيهات للموارد البشرية
    hrNotifications: [
      {
        notificationType: String, // 'low_coverage', 'deadline_approaching', 'conflict'
        notificationMessage: String,
        notificationDate: Date,
        acknowledged: Boolean,
      },
    ],

    // التعارضات المحتملة
    conflicts: [
      {
        conflictType: String, // 'insufficient_coverage', 'project_milestone', 'training'
        affectedUsers: [Schema.Types.ObjectId],
        resolutionStatus: {
          type: String,
          enum: ['unresolved', 'resolved'],
        },
        resolutionDetails: String,
      },
    ],

    // الرسائل والملاحظات
    employeeNotes: String,

    managerNotes: String,

    hrNotes: String,

    // سجل التعديلات
    modificationHistory: [
      {
        modifiedBy: Schema.Types.ObjectId,
        modificationDate: Date,
        fieldChanged: String,
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
        reason: String,
      },
    ],

    // الإلغاء (في حالة إلغاء الإجازة)
    cancellation: {
      isCancelled: Boolean,

      cancelledBy: Schema.Types.ObjectId,

      cancellationDate: Date,

      cancellationReason: String,

      refundStatus: {
        type: String,
        enum: ['pending', 'refunded', 'not_applicable'],
      },
    },

    // التكاملات الخارجية
    externalSources: [
      {
        system: String, // 'payroll', 'attendance', 'project_management'
        externalId: String,
        syncStatus: {
          type: String,
          enum: ['pending', 'synced', 'failed'],
        },
        lastSyncTime: Date,
      },
    ],

    // معلومات إضافية
    isDeleted: {
      type: Boolean,
      default: false
    },

    deletedBy: Schema.Types.ObjectId,
    deletionReason: String,

    // الأولويات والعلامات
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
    },

    tags: [String],

    // التصنيف (للإحصائيات)
    classification: {
      type: String,
      enum: ['routine', 'emergency', 'planned'],
      default: 'routine',
    },
  },
  {
    timestamps: true,
    collection: 'smart_leave_requests',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// الفهارس
smartLeaveSchema.index({ employeeId: 1, overallStatus: 1 });
smartLeaveSchema.index({
  'period.startDate': 1,
  'period.endDate': 1,
});
smartLeaveSchema.index({ leaveType: 1, overallStatus: 1 });
smartLeaveSchema.index({ createdAt: -1 });

// Virtual للتحقق من الموافقة النهائية
smartLeaveSchema.virtual('isFullyApproved').get(function () {
  if (!this.approvals || this.approvals.length === 0) return false;

  return this.approvals.every((approval) => approval.status === 'approved');
});

// Static method لإنشاء طلب إجازة جديد
smartLeaveSchema.statics.createLeaveRequest = async function (employeeId, leaveData) {
  const newLeave = new this({
    employeeId,
    leaveType: leaveData.leaveType,
    period: {
      startDate: leaveData.startDate,
      endDate: leaveData.endDate,
      durationInDays: leaveData.durationInDays,
    },
    reason: leaveData.reason,
    detailedDescription: leaveData.detailedDescription,
    attachments: leaveData.attachments || [],
    coverage: leaveData.coverage,
  });

  // إضافة مستويات الموافقة الافتراضية
  newLeave.approvals = [
    {
      level: 'direct_manager',
      status: 'pending',
    },
    {
      level: 'department_head',
      status: 'pending',
    },
    {
      level: 'hr_manager',
      status: 'pending',
    },
  ];

  return await newLeave.save();
};

// Instance method للموافقة على الإجازة
smartLeaveSchema.methods.approve = async function (approverId, level, comments) {
  const approval = this.approvals.find((a) => a.level === level);

  if (!approval) {
    throw new Error(`مستوى الموافقة ${level} غير موجود`);
  }

  approval.status = 'approved';
  approval.approverId = approverId;
  approval.approvalDate = new Date();
  approval.comments = comments;

  // تحديث الحالة الكلية إذا تمت موافقة جميع المستويات
  if (this.isFullyApproved) {
    this.overallStatus = 'approved';
  }

  return await this.save();
};

// Instance method لرفض الإجازة
smartLeaveSchema.methods.reject = async function (approverId, level, reason) {
  const approval = this.approvals.find((a) => a.level === level);

  if (!approval) {
    throw new Error(`مستوى الموافقة ${level} غير موجود`);
  }

  approval.status = 'rejected';
  approval.approverId = approverId;
  approval.approvalDate = new Date();
  approval.reason = reason;

  this.overallStatus = 'rejected';
  this.statusReason = reason;

  return await this.save();
};

// Instance method لإلغاء الإجازة
smartLeaveSchema.methods.cancel = async function (cancelledBy, reason) {
  this.overallStatus = 'cancelled';

  this.cancellation = {
    isCancelled: true,
    cancelledBy,
    cancellationDate: new Date(),
    cancellationReason: reason,
  };

  return await this.save();
};

module.exports = mongoose.model('SmartLeave', smartLeaveSchema);
