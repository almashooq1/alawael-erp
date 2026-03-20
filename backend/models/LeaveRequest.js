/**
 * LeaveRequest Model - نموذج طلبات الإجازات
 *
 * Covers:
 * - طلبات الإجازات السنوية والمرضية والاستثنائية
 * - سير العمل (تقديم → مراجعة → موافقة/رفض)
 * - حساب الأرصدة وتتبع الاستهلاك
 * - التكامل مع نظام الحضور والانصراف
 *
 * @version 1.0.0
 */

const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    // مقدم الطلب
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'معرف الموظف مطلوب'],
      index: true,
    },
    employeeId: {
      type: String,
      required: [true, 'رقم الموظف مطلوب'],
      index: true,
    },
    employeeName: {
      type: String,
      required: true,
    },
    department: {
      type: String,
      required: true,
      index: true,
    },

    // نوع الإجازة
    leaveType: {
      type: String,
      required: [true, 'نوع الإجازة مطلوب'],
      enum: {
        values: [
          'annual', // سنوية
          'sick', // مرضية
          'emergency', // طارئة
          'unpaid', // بدون راتب
          'maternity', // أمومة
          'paternity', // أبوة
          'bereavement', // وفاة
          'marriage', // زواج
          'hajj', // حج
          'study', // دراسية
          'compensatory', // تعويضية
        ],
        message: 'نوع الإجازة غير صالح',
      },
      index: true,
    },

    // التواريخ
    startDate: {
      type: Date,
      required: [true, 'تاريخ البداية مطلوب'],
    },
    endDate: {
      type: Date,
      required: [true, 'تاريخ النهاية مطلوب'],
    },
    totalDays: {
      type: Number,
      required: true,
      min: [0.5, 'الحد الأدنى نصف يوم'],
    },
    isHalfDay: {
      type: Boolean,
      default: false,
    },
    halfDayPeriod: {
      type: String,
      enum: ['morning', 'afternoon'],
    },

    // السبب والمرفقات
    reason: {
      type: String,
      required: [true, 'سبب الإجازة مطلوب'],
      trim: true,
      maxlength: [500, 'السبب طويل جداً'],
    },
    attachments: [
      {
        name: String,
        url: String,
        type: String,
        uploadDate: { type: Date, default: Date.now },
      },
    ],

    // حالة الطلب
    status: {
      type: String,
      enum: ['pending', 'manager_approved', 'hr_approved', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },

    // سير العمل
    workflow: {
      // المدير المباشر
      managerApproval: {
        approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approverName: String,
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        date: Date,
        comments: String,
      },
      // الموارد البشرية
      hrApproval: {
        approver: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        approverName: String,
        status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
        date: Date,
        comments: String,
      },
    },

    // البديل أثناء الإجازة
    substitute: {
      employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
      name: String,
      accepted: { type: Boolean, default: false },
    },

    // الأرصدة عند وقت الطلب
    balanceSnapshot: {
      annualTotal: Number,
      annualUsed: Number,
      annualRemaining: Number,
      sickTotal: Number,
      sickUsed: Number,
      sickRemaining: Number,
    },

    // ملاحظات
    notes: String,

    // النظام
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    cancelReason: String,
    tenantId: String,
  },
  {
    timestamps: true,
    collection: 'leave_requests',
  }
);

// Indexes
leaveRequestSchema.index({ startDate: 1, endDate: 1 });
leaveRequestSchema.index({ status: 1, leaveType: 1 });
leaveRequestSchema.index({ createdAt: -1 });

// Virtuals
leaveRequestSchema.virtual('isActive').get(function () {
  const now = new Date();
  return this.status === 'approved' && this.startDate <= now && this.endDate >= now;
});

// Methods

/**
 * الموافقة على الطلب من المدير
 */
leaveRequestSchema.methods.approveByManager = function (approverId, approverName, comments) {
  this.workflow.managerApproval = {
    approver: approverId,
    approverName,
    status: 'approved',
    date: new Date(),
    comments,
  };
  this.status = 'manager_approved';
  return this.save();
};

/**
 * الموافقة على الطلب من HR
 */
leaveRequestSchema.methods.approveByHR = function (approverId, approverName, comments) {
  this.workflow.hrApproval = {
    approver: approverId,
    approverName,
    status: 'approved',
    date: new Date(),
    comments,
  };
  this.status = 'approved';
  return this.save();
};

/**
 * رفض الطلب
 */
leaveRequestSchema.methods.reject = function (rejecterId, rejectorName, comments, stage) {
  if (stage === 'manager') {
    this.workflow.managerApproval = {
      approver: rejecterId,
      approverName: rejectorName,
      status: 'rejected',
      date: new Date(),
      comments,
    };
  } else {
    this.workflow.hrApproval = {
      approver: rejecterId,
      approverName: rejectorName,
      status: 'rejected',
      date: new Date(),
      comments,
    };
  }
  this.status = 'rejected';
  return this.save();
};

/**
 * إلغاء الطلب
 */
leaveRequestSchema.methods.cancel = function (userId, reason) {
  this.status = 'cancelled';
  this.cancelledBy = userId;
  this.cancelReason = reason;
  return this.save();
};

// Statics

/**
 * إجازات الموظف في فترة
 */
leaveRequestSchema.statics.getEmployeeLeaves = function (employeeId, startDate, endDate) {
  const query = { employee: employeeId, status: { $nin: ['cancelled', 'rejected'] } };
  if (startDate && endDate) {
    query.startDate = { $gte: startDate };
    query.endDate = { $lte: endDate };
  }
  return this.find(query).sort({ startDate: -1 });
};

/**
 * إجازات القسم
 */
leaveRequestSchema.statics.getDepartmentLeaves = function (department, status) {
  const query = { department };
  if (status) query.status = status;
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * إحصائيات الإجازات
 */
leaveRequestSchema.statics.getLeaveStatistics = async function (filters = {}) {
  const match = {};
  if (filters.department) match.department = filters.department;
  if (filters.year) {
    const year = parseInt(filters.year);
    match.startDate = {
      $gte: new Date(year, 0, 1),
      $lt: new Date(year + 1, 0, 1),
    };
  }

  const stats = await this.aggregate([
    { $match: match },
    {
      $group: {
        _id: { type: '$leaveType', status: '$status' },
        count: { $sum: 1 },
        totalDays: { $sum: '$totalDays' },
      },
    },
    {
      $group: {
        _id: '$_id.type',
        statuses: {
          $push: {
            status: '$_id.status',
            count: '$count',
            totalDays: '$totalDays',
          },
        },
        totalRequests: { $sum: '$count' },
        totalDays: { $sum: '$totalDays' },
      },
    },
    { $sort: { totalRequests: -1 } },
  ]);

  return stats;
};

/**
 * المعلّقة للمدير
 */
leaveRequestSchema.statics.getPendingForManager = function (managerId) {
  return this.find({
    status: 'pending',
  }).sort({ createdAt: -1 });
};

/**
 * المعلّقة لـ HR
 */
leaveRequestSchema.statics.getPendingForHR = function () {
  return this.find({
    status: 'manager_approved',
  }).sort({ createdAt: -1 });
};

module.exports = mongoose.models.LeaveRequest || mongoose.model('LeaveRequest', leaveRequestSchema);
