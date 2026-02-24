/**
 * نموذج الحضور والانصراف - Attendance Model
 * نظام ذكي واحترافي للحضور والانصراف مع:
 * - تتبع الحضور والانصراف بالتاريخ والوقت الدقيق
 * - الموقع الجغرافي (GPS)
 * - الصور والتحقق من الهوية
 * - ساعات العمل والإجازات
 * - التأخير والغياب
 * - الرواتب المرتبطة
 */

const mongoose = require('mongoose');

// ============================================================================
// نموذج سجل الحضور والانصراف الأساسي
// ============================================================================
const attendanceRecordSchema = new mongoose.Schema(
  {
    // معلومات الموظف
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    employeeName: String,
    employeeCode: String,
    department: String,
    position: String,

    // معلومات الحضور
    checkInTime: {
      type: Date,
      required: true
    },
    checkInLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
      accuracy: Number, // دقة GPS بالأمتار
    },
    checkInPhoto: String, // URL للصورة أثناء الحضور

    // معلومات الانصراف
    checkOutTime: Date,
    checkOutLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
      accuracy: Number,
    },
    checkOutPhoto: String,

    // ساعات العمل
    scheduledStartTime: Date,
    scheduledEndTime: Date,
    actualWorkDuration: Number, // بالدقائق
    workDuration: Number, // ساعات العمل الفعلية
    breakDuration: Number, // مدة الفترة الراحة بالدقائق

    // حالة الحضور
    status: {
      type: String,
      enum: ['حاضر', 'غياب', 'متأخر', 'إجازة', 'عطلة', 'مرض', 'وقت مرن'],
      default: 'حاضر'
    },
    checkInStatus: {
      type: String,
      enum: ['في الوقت', 'متأخر', 'في وقت مبكر'],
      default: 'في الوقت',
    },
    checkOutStatus: {
      type: String,
      enum: ['في الوقت', 'مبكر جداً', 'متأخر جداً'],
      default: 'في الوقت',
    },

    // حسابات التأخير والغياب
    latenessMinutes: {
      type: Number,
      default: 0, // دقائق التأخير
    },
    lateCount: {
      type: Number,
      default: 0, // عدد مرات التأخير
    },
    earlyCheckoutMinutes: Number,
    earlyCheckoutCount: Number,

    // المرفقات والتحقق
    verificationMethod: {
      type: String,
      enum: ['بصمة', 'بطاقة ممغنطة', 'رقم PIN', 'الوجه', 'تطبيق الجوال', 'الحضور اليدوي'],
      default: 'بطاقة ممغنطة',
    },
    biometricId: String, // معرف البصمة
    faceVerification: Boolean,
    mobileApp: Boolean,
    verified: {
      type: Boolean,
      default: false,
    },
    verifiedBy: mongoose.Schema.Types.ObjectId, // الموظف الذي تحقق من الحضور

    // ملاحظات خاصة
    notes: String,
    manualEntryReason: String, // سبب الإدخال اليدوي إن وجد
    manualEntryApprovedBy: mongoose.Schema.Types.ObjectId,

    // الإجازات والعطل
    leaveType: String,
    leaveReason: String,
    leaveApprovedBy: mongoose.Schema.Types.ObjectId,
    leaveApprovalDate: Date,

    // مكافآت وخصومات
    bonusMinutes: Number, // دقائق إضافية/مكافآت
    penaltyMinutes: Number, // خصومات من ساعات العمل
    overtimeMinutes: {
      type: Number,
      default: 0,
    },
    overtimeApproved: Boolean,

    // التاريخ والوقت
    date: {
      type: Date,
      required: true
    },
    workDay: String, // السبت، الأحد، إلخ
    weekNumber: Number,
    monthNumber: Number,
    yearNumber: Number,

    // معلومات الرواتب
    salaryPerDay: Number,
    salaryPerHour: Number,
    overtimeRate: Number, // معدل الإضافي
    overtimeAmount: Number, // مبلغ الإضافي

    // الحالة الصحية
    healthStatus: String,
    temperature: Number,
    healthCheckCompleted: Boolean,
    healthCheckNotes: String,

    // البيانات الإضافية
    deviceId: String,
    ipAddress: String,
    userAgent: String,
    isWeekend: Boolean,
    isHoliday: Boolean,
    isSpecialDay: Boolean,

    // الأرشفة والحذف
    isArchived: {
      type: Boolean,
      default: false,
    },
    deletedAt: Date,

    // الطوابع الزمنية
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ============================================================================
// نموذج جدول الدوام الأسبوعي
// ============================================================================
const scheduleSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  startDate: Date,
  endDate: Date,
  scheduleType: {
    type: String,
    enum: ['عادي', 'دوام ليلي', 'دوام صباحي', 'نوبات', 'مرن'],
    default: 'عادي',
  },

  // أيام الدوام
  workDays: [
    {
      day: String,
      startTime: String,
      endTime: String,
      breakStartTime: String,
      breakEndTime: String,
      workHours: Number,
      isWorking: Boolean,
    },
  ],

  weeklyWorkHours: Number,
  monthlyWorkHours: Number,

  createdAt: Date,
  updatedAt: Date,
});

// ============================================================================
// نموذج الإجازات
// ============================================================================
const leaveSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  leaveType: {
    type: String,
    enum: [
      'إجازة سنوية',
      'إجازة مرضية',
      'إجازة بدون راتب',
      'إجازة أمومة',
      'إجازة أبوة',
      'إجازة استثنائية',
    ],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  duration: {
    type: Number, // عدد الأيام
    required: true,
  },
  reason: String,

  // الموافقات
  status: {
    type: String,
    enum: ['مرسل', 'قيد المراجعة', 'موافق عليه', 'مرفوض'],
    default: 'مرسل'
  },
  approvedBy: mongoose.Schema.Types.ObjectId,
  approvalDate: Date,
  rejectionReason: String,

  // المستندات
  documents: [String], // روابط المستندات الطبية إن وجدت
  attachments: [String],

  // الراتب
  isPaidLeave: {
    type: Boolean,
    default: true,
  },
  leaveBalance: {
    used: Number,
    remaining: Number,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
});

// ============================================================================
// نموذج رصيد الإجازات السنوية
// ============================================================================
const leaveBalanceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },
  year: {
    type: Number,
    required: true,
  },

  // الإجازات السنوية
  annualLeaveAllocation: {
    type: Number,
    default: 30, // 30 يوم إجازة سنوية
  },
  annualLeaveUsed: {
    type: Number,
    default: 0,
  },
  annualLeaveRemaining: {
    type: Number,
    default: 30,
  },
  annualLeavePending: Number,

  // الإجازات المرضية
  sickLeaveAllocation: {
    type: Number,
    default: 15,
  },
  sickLeaveUsed: {
    type: Number,
    default: 0,
  },
  sickLeaveRemaining: {
    type: Number,
    default: 15,
  },

  // الإجازات الاستثنائية
  exceptionalLeaveAllocation: {
    type: Number,
    default: 5,
  },
  exceptionalLeaveUsed: {
    type: Number,
    default: 0,
  },
  exceptionalLeaveRemaining: {
    type: Number,
    default: 5,
  },

  // أيام العطل الرسمية
  publicHolidaysCount: Number,

  // الأيام الموافقة عليها
  approvedLeaveCount: Number,

  // الرصيد المتراكم
  carryForwardDays: Number, // أيام يتم نقلها للعام القادم
  carryForwardDate: Date,

  lastModifiedBy: mongoose.Schema.Types.ObjectId,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
});

// ============================================================================
// نموذج بيانات الموظفين الحضورية
// ============================================================================
const employeeAttendanceProfileSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
  },

  // معلومات مسجل الحضور
  biometricDeviceId: String,
  cardNumber: String,
  pinCode: String,
  faceId: String,
  fingerprintId: String,

  // إعدادات الحضور
  allowedCheckInRange: {
    before: Number, // دقائق قبل الموعد
    after: Number, // دقائق بعد الموعد
  },
  allowedLocationRadius: Number, // نطاق الموقع بالأمتار
  allowGPSCheckIn: Boolean,
  allowPhotoVerification: Boolean,
  allowBiometricCheckIn: Boolean,

  // سياسة التأخير
  latenessPenalty: {
    minutes: Number,
    penaltyMinutes: Number, // دقائق خصم من الراتب
    maxLatePerMonth: Number, // حد أقصى لمرات التأخير شهرياً
    action: String, // إجراء عند تجاوز الحد
  },

  // الحضور الدقيق
  totalAttendanceDays: Number,
  totalAbsentDays: Number,
  totalLateDays: Number,
  attendancePercentage: Number,

  // الملاحظات
  notes: String,
  activeStatus: {
    type: Boolean,
    default: true,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
});

// ============================================================================
// نموذج الغياب والملاحظات
// ============================================================================
const absenceSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  absenceType: {
    type: String,
    enum: ['غياب', 'تأخير', 'انصراف مبكر', 'عدم ديناميكي'],
    required: true,
  },
  reason: String,
  approvedBy: mongoose.Schema.Types.ObjectId,
  isExcused: Boolean,
  minutes: Number, // دقائق الغياب/التأخير
  penalty: Number, // الخصم من الراتب
  status: {
    type: String,
    enum: ['مرسل', 'قيد المراجعة', 'موافق عليه', 'مرفوض'],
    default: 'مرسل',
  },
  notes: String,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ============================================================================
// نموذج التقارير الشهرية
// ============================================================================
const monthlyReportSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  year: Number,
  month: Number,

  // الإحصائيات
  totalWorkingDays: Number,
  totalDaysPresent: Number,
  totalDaysAbsent: Number,
  totalDaysLate: Number,
  totalDaysEarlyCheckout: Number,

  // الساعات
  totalWorkHours: Number,
  totalOvertimeHours: Number,
  totalBreakHours: Number,

  // الرواتب
  baseSalary: Number,
  overtimeAmount: Number,
  deductions: Number,
  totalSalary: Number,

  // الملاحظات
  notes: String,
  approvedBy: mongoose.Schema.Types.ObjectId,
  approvalDate: Date,

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ============================================================================
// الفهارس والاستعلامات المركبة
// ============================================================================

// فهرس مركب للاستعلام عن الحضور حسب التاريخ والموظف
attendanceRecordSchema.index({ employeeId: 1, date: -1 });
attendanceRecordSchema.index({ date: -1, status: 1 });
attendanceRecordSchema.index({ employeeId: 1, checkInTime: -1 });

leaveSchema.index({ employeeId: 1, startDate: -1 });
leaveSchema.index({ status: 1, startDate: -1 });

employeeAttendanceProfileSchema.index({ employeeId: 1 });

absenceSchema.index({ employeeId: 1, date: -1 });

monthlyReportSchema.index({ employeeId: 1, year: 1, month: 1 });

// ============================================================================
// الدوال المساعدة والحسابات
// ============================================================================

// حساب مدة العمل الفعلية
attendanceRecordSchema.methods.calculateWorkDuration = function () {
  if (this.checkOutTime && this.checkInTime) {
    const duration = (this.checkOutTime - this.checkInTime) / (1000 * 60); // بالدقائق
    this.workDuration = Math.round((duration / 60) * 100) / 100; // تحويل إلى ساعات
    return this.workDuration;
  }
  return 0;
};

// حساب دقائق التأخير
attendanceRecordSchema.methods.calculateLateness = function () {
  if (this.checkInTime && this.scheduledStartTime) {
    const diff = (this.checkInTime - this.scheduledStartTime) / (1000 * 60); // بالدقائق
    if (diff > 0) {
      this.latenessMinutes = Math.round(diff);
      this.checkInStatus = 'متأخر';
      return this.latenessMinutes;
    }
  }
  this.checkInStatus = 'في الوقت';
  return 0;
};

// حساب مبلغ الإضافي
attendanceRecordSchema.methods.calculateOvertimeAmount = function () {
  if (this.overtimeMinutes && this.salaryPerHour && this.overtimeRate) {
    const overtimeHours = this.overtimeMinutes / 60;
    this.overtimeAmount = overtimeHours * this.salaryPerHour * (this.overtimeRate / 100);
    return this.overtimeAmount;
  }
  return 0;
};

// ============================================================================
// الإنشاء والتصدير
// ============================================================================

const AttendanceRecord = mongoose.model('AttendanceRecord', attendanceRecordSchema);
const Schedule = mongoose.model('Schedule', scheduleSchema);
const Leave = mongoose.model('Leave', leaveSchema);
const LeaveBalance = mongoose.model('LeaveBalance', leaveBalanceSchema);
const EmployeeAttendanceProfile = mongoose.model(
  'EmployeeAttendanceProfile',
  employeeAttendanceProfileSchema
);
const Absence = mongoose.model('Absence', absenceSchema);
const MonthlyReport = mongoose.model('MonthlyReport', monthlyReportSchema);

module.exports = {
  AttendanceRecord,
  Schedule,
  Leave,
  LeaveBalance,
  EmployeeAttendanceProfile,
  Absence,
  MonthlyReport,
};
