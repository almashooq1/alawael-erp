/**
 * Advanced Attendance Model - نموذج الحضور والانصراف المتقدم
 * مع ميزات ذكية متقدمة وتحليلات شاملة
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const smartAttendanceSchema = new Schema(
  {
    // معلومات الموظف والتاريخ
    employeeId: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'معرف الموظف مطلوب'],
    },

    date: {
      type: Date,
      required: [true, 'التاريخ مطلوب'],
      set: (value) => {
        const date = new Date(value);
        date.setHours(0, 0, 0, 0);
        return date;
      },
    },

    // معلومات الدخول (Check-In)
    checkInTime: {
      type: Date,
      required: true
    },

    checkInLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
      branch: {
        type: Schema.Types.ObjectId,
        ref: 'Branch',
      },
    },

    checkInMethod: {
      type: String,
      enum: ['biometric', 'manual', 'camera', 'mobile_app', 'web_portal', 'api'],
      default: 'mobile_app',
      required: true,
    },

    checkInDevice: {
      deviceId: String,
      deviceType: {
        type: String,
        enum: ['smartphone', 'tablet', 'desktop', 'biometric_terminal', 'ip_camera'],
      },
      ipAddress: String,
      deviceName: String,
    },

    checkInNotes: String,

    checkInPhoto: {
      url: String,
      timestamp: Date,
      verified: Boolean,
    },

    // معلومات الخروج (Check-Out)
    checkOutTime: {
      type: Date
    },

    checkOutLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
    },

    checkOutMethod: {
      type: String,
      enum: ['biometric', 'manual', 'camera', 'mobile_app', 'web_portal', 'api'],
    },

    checkOutDevice: {
      deviceId: String,
      deviceType: String,
      ipAddress: String,
    },

    checkOutNotes: String,

    checkOutPhoto: {
      url: String,
      timestamp: Date,
      verified: Boolean,
    },

    // حسابات الوقت
    workDuration: {
      totalMinutes: Number,
      totalHours: {
        regular: Number, // ساعات العمل العادية
        overtime: Number, // الساعات الإضافية
      },
    },

    breakTime: {
      duration: Number, // بالدقائق
      startTime: Date,
      endTime: Date,
      approved: Boolean,
    },

    // حساب التأخير والخروج المبكر
    lateness: {
      minutes: {
        type: Number,
        default: 0,
      },
      isLate: Boolean,
      reason: String,
      excused: Boolean,
      excuseAttachment: String,
    },

    earlyLeave: {
      minutes: {
        type: Number,
        default: 0,
      },
      isEarlyLeave: Boolean,
      reason: String,
      approved: Boolean,
    },

    // حالة الحضور
    attendanceStatus: {
      type: String,
      enum: [
        'present', // حاضر
        'absent', // غائب
        'late_arrival', // حضور متأخر
        'early_departure', // مغادرة مبكرة
        'on_leave', // في إجازة
        'half_day', // نصف يوم
        'work_from_home', // عمل من البيت
        'business_trip', // مأمورية
        'weekend', // عطلة نهاية أسبوع
        'public_holiday', // عطلة رسمية
      ],
      default: 'present',
    },

    // الموافقة والمراجعة
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'approved',
    },

    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },

    approvalDate: Date,
    approvalNotes: String,

    // التحليلات الذكية
    intelligenceFlags: {
      isAnomalous: Boolean, // سلوك غير طبيعي
      anomalyReason: String,
      riskLevel: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'low',
      },
      behaviorScore: {
        type: Number,
        min: 0,
        max: 100,
        default: 100,
      },
      patterns: [
        {
          patternName: String,
          confidence: Number, // 0-100
          description: String,
        },
      ],
    },

    // التنبيهات
    alerts: [
      {
        type: String,
        example: 'late_arrival',
        timestamp: Date,
        severity: {
          type: String,
          enum: ['info', 'warning', 'critical'],
        },
        message: String,
        acknowledged: Boolean,
      },
    ],

    // التفاصيل الإضافية
    departmentAtTimeOfAttendance: {
      type: Schema.Types.ObjectId,
      ref: 'Department',
    },

    projectAssignment: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
    },

    // الإرفاقات والوثائق
    attachments: [
      {
        filename: String,
        url: String,
        type: {
          type: String,
          enum: ['medical_certificate', 'excuse_letter', 'photo', 'other'],
        },
        uploadedAt: Date,
      },
    ],

    // ملاحظات إدارية
    adminNotes: {
      note: String,
      addedBy: Schema.Types.ObjectId,
      addedAt: Date,
    },

    // XML/API التكاملات الخارجية
    externalSources: [
      {
        source: {
          type: String,
          enum: ['biometric_system', 'camera_ai', 'payroll_system', 'manual_entry'],
        },
        externalId: String,
        syncStatus: {
          type: String,
          enum: ['pending', 'synced', 'failed'],
        },
        lastSyncTime: Date,
      },
    ],

    // بيانات التعديل والحذف
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

    isDeleted: {
      type: Boolean,
      default: false
    },

    deletedBy: Schema.Types.ObjectId,
    deletionReason: String,
    deletionDate: Date,
  },
  {
    timestamps: true,
    collection: 'smart_attendance',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// الفهارس المركبة
smartAttendanceSchema.index({ employeeId: 1, date: 1 }, { unique: true });
smartAttendanceSchema.index({ date: 1, attendanceStatus: 1 });
smartAttendanceSchema.index({ employeeId: 1, attendanceStatus: 1 });
smartAttendanceSchema.index({ 'intelligenceFlags.riskLevel': 1 });
smartAttendanceSchema.index({ approvalStatus: 1, date: -1 });

// Virtual للحصول على المدة بصيغة قابلة للقراءة
smartAttendanceSchema.virtual('workDurationReadable').get(function () {
  if (!this.workDuration || !this.workDuration.totalHours) return 'N/A';

  const hours = this.workDuration.totalHours.regular + this.workDuration.totalHours.overtime;
  const mins = this.workDuration.totalMinutes % 60;

  return `${Math.floor(hours)}h ${mins}m`;
});

// Pre-save validation
smartAttendanceSchema.pre('save', async function () {
  // حساب مدة العمل إذا كانت هناك أوقات دخول وخروج
  if (this.checkInTime && this.checkOutTime) {
    const diffMs = this.checkOutTime - this.checkInTime;
    const diffMins = Math.floor(diffMs / 60000);

    this.workDuration = this.workDuration || {};
    this.workDuration.totalMinutes = diffMins;

    // حساب الساعات العادية والإضافية (بافتراض 8 ساعات عمل يومية)
    const regularHours = 8;
    const totalHours = diffMins / 60;

    this.workDuration.totalHours = {
      regular: Math.min(totalHours, regularHours),
      overtime: Math.max(0, totalHours - regularHours),
    };
  }

  next();
});

// Static method لإنشاء سجل حضور جديد
smartAttendanceSchema.statics.recordCheckIn = async function (employeeId, checkInData) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // التحقق من عدم وجود سجل دخول سابق
  const existing = await this.findOne({
    employeeId,
    date: today,
    isDeleted: false,
  });

  if (existing) {
    throw new Error('تم تسجيل الدخول بالفعل اليوم');
  }

  const attendance = new this({
    employeeId,
    date: today,
    checkInTime: new Date(),
    checkInLocation: checkInData.location,
    checkInMethod: checkInData.method || 'mobile_app',
    checkInDevice: checkInData.device,
    checkInPhoto: checkInData.photo,
    checkInNotes: checkInData.notes,
  });

  return await attendance.save();
};

// Static method لتسجيل الخروج
smartAttendanceSchema.statics.recordCheckOut = async function (employeeId, checkOutData) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendance = await this.findOne({
    employeeId,
    date: today,
    isDeleted: false,
  });

  if (!attendance) {
    throw new Error('لم يتم تسجيل دخول الموظف اليوم');
  }

  attendance.checkOutTime = new Date();
  attendance.checkOutLocation = checkOutData.location;
  attendance.checkOutMethod = checkOutData.method || 'mobile_app';
  attendance.checkOutDevice = checkOutData.device;
  attendance.checkOutPhoto = checkOutData.photo;
  attendance.checkOutNotes = checkOutData.notes;

  return await attendance.save();
};

// Static method للحصول على سجل اليوم
smartAttendanceSchema.statics.getTodayRecord = async function (employeeId) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return await this.findOne({
    employeeId,
    date: today,
    isDeleted: false,
  }).populate('employeeId', 'fullName email department position');
};

module.exports = mongoose.model('SmartAttendance', smartAttendanceSchema);
