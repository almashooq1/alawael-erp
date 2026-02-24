/**
 * Attendance Rules Model - نموذج قواعس الحضور الذكية
 * تحديد قواعس الحضور حسب القسم والرتبة والمشروع
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const attendanceRulesSchema = new Schema(
  {
    // معلومات القاعدة الأساسية
    ruleName: {
      type: String,
      required: [true, 'اسم القاعدة مطلوب'],
      unique: true,
    },

    ruleDescription: String,

    // النطاق التطبيقي للقاعدة
    applicability: {
      // على مستوى القسم
      departments: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Department',
        },
      ],

      // على مستوى الموظف
      employeeRoles: [
        {
          type: String,
          enum: ['manager', 'team_lead', 'developer', 'designer', 'analyst', 'general'],
        },
      ],

      // على مستوى المشروع
      projects: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Project',
        },
      ],

      // على مستوى الموظف المحدد
      specificEmployees: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Employee',
        },
      ],

      // الأيام المطبقة
      daysOfWeek: [
        {
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        },
      ],

      // الأوقات المطبقة
      timeRanges: [
        {
          startTime: String, // HH:MM
          endTime: String, // HH:MM
        },
      ],
    },

    // ساعات العمل الأساسية
    workingHours: {
      // وقت الدخول المطلوب
      mandatoryCheckInTime: {
        type: String, // HH:MM
        required: true,
        default: '08:00',
      },

      // وقت الخروج المطلوب
      mandatoryCheckOutTime: {
        type: String, // HH:MM
        required: true,
        default: '17:00',
      },

      // إجمالي ساعات العمل اليومية
      totalWorkHoursPerDay: {
        type: Number,
        required: true,
        default: 8,
      },

      // فترات الاستراحة المسموحة
      breakTimes: [
        {
          breakName: String,
          startTime: String,
          endTime: String,
          durationMinutes: Number,
          isMandatory: Boolean,
        },
      ],

      // أيام العطل الأسبوعية
      weeklyOffDays: [String],

      // العطل الرسمية السنوية
      publicHolidays: [
        {
          date: Date,
          holidayName: String,
        },
      ],
    },

    // سياسة التأخير والخروج المبكر
    latePolicies: {
      // دقائق التأخير المسموح بها بدون عقوبة
      gracePeriodMinutes: {
        type: Number,
        default: 5,
      },

      // نوع الحساب
      calculationMethod: {
        type: String,
        enum: ['lenient', 'strict', 'perInterval'],
        default: 'strict',
      },

      // فترات حساب التأخير
      lateIntervals: [
        {
          minutes: Number,
          deduction: Number, // ساعات أو أيام مقابل التأخير
          salary_deduction_percent: Number,
        },
      ],

      // حد التأخير الأقصى قبل المعالجة
      maxLateMinutes: {
        type: Number,
        default: 120, // ساعتين
      },

      // معاملة التأخير المتكرر
      repeatedLatePenalty: {
        afterNTimes: {
          type: Number,
          default: 3,
        },
        penalty: String, // نص العقوبة
      },

      // الأعذار المقبولة
      acceptableExcuses: [
        {
          excuse: String,
          requiresDocumentation: Boolean,
          durationInDays: Number,
        },
      ],
    },

    // سياسة الغياب
    absentPolicies: {
      // الإجراء عند الغياب بدون إشعار
      noShowAction: {
        type: String,
        enum: ['warning', 'deduction', 'suspension', 'termination'],
        default: 'warning',
      },

      // عدد الغيابات المسموح بها
      allowedAbsencesPerYear: {
        type: Number,
        default: 3,
      },

      // الخصم من الرتب
      salaryDeductionPerAbsence: {
        type: Number, // النسبة المئوية
        default: 5,
      },

      // متطلبات التوثيق
      documentationRequired: Boolean,

      // حد التأخير الذي يعتبر غياب
      latenessThresholdForAbsence: {
        type: Number, // بالدقائق
        default: 180, // 3 ساعات
      },
    },

    // سياسة الساعات الإضافية
    overtimePolicies: {
      isOvertimeAllowed: {
        type: Boolean,
        default: true,
      },

      // معامل الساعات الإضافية
      overtimeMultiplier: {
        type: Number,
        default: 1.5, // 1.5x أو 2x للأيام المميزة
      },

      // الحد الأقصى للساعات الإضافية الأسبوعية
      maxOvertimePerWeek: {
        type: Number, // عدد الساعات
        default: 10,
      },

      // الحد الأقصى للساعات الإضافية الشهرية
      maxOvertimePerMonth: {
        type: Number,
        default: 40,
      },

      // معامل الساعات الإضافية للأيام المميزة
      specialDayMultiplier: {
        type: Number,
        default: 2,
      },

      // الموافقة المطلوبة
      requiresApproval: Boolean,
      approvalLevel: String,
    },

    // السياسات الخاصة بالإجازات
    leavePolicies: {
      // الإجازة السنوية
      annualLeave: {
        daysPerYear: {
          type: Number,
          default: 30,
        },
        carryOverDays: {
          type: Number,
          default: 5, // الأيام التي يمكن نقلها للسنة القادمة
        },
      },

      // الإجازة المرضية
      sickLeave: {
        daysPerYear: {
          type: Number,
          default: 15,
        },
        requiresDocumentation: Boolean,
        documentationDaysThreshold: {
          type: Number, // تحتاج شهادة طبية بعد N أيام
          default: 3,
        },
      },

      // الإجازة الشخصية
      personalLeave: {
        daysPerYear: {
          type: Number,
          default: 3,
        },
        requiresDocumentation: Boolean,
      },

      // الإجازات الراتب الكامل
      fullPaidLeaves: [String], // ['Eid', 'National Day', ...]

      // الإجازات الراتب النصف
      halfPaidLeaves: [String],

      // الإجازات بدون راتب
      unpaidLeaves: [String],

      // فترة الانتظار قبل طلب الإجازة
      minAdvanceNoticeInDays: {
        type: Number,
        default: 5,
      },
    },

    // سياسات خاصة بالعمل من البيت
    workFromHomePolicies: {
      isAllowed: {
        type: Boolean,
        default: false,
      },

      daysPerWeekAllowed: {
        type: Number,
        default: 2,
      },

      requiresApproval: Boolean,

      applicableToRoles: [String],

      checkInRequirements: {
        type: String,
        example: 'must_checkin_from_home_location',
      },
    },

    // الإعفاءات الخاصة
    exemptions: [
      {
        exemptionName: String,
        applicableTo: [Schema.Types.ObjectId], // قائمة الموظفين المعفيين
        exceptionRules: String,
        effectiveFrom: Date,
        effectiveUntil: Date,
      },
    ],

    // التحليلات والفحوصات
    analyticsConfiguration: {
      // ما هي الأنماط التي يجب تتبعها
      anomalyDetectionRules: [
        {
          ruleName: String,
          description: String,
          severity: {
            type: String,
            enum: ['low', 'medium', 'high'],
          },
          action: String,
        },
      ],

      // حد المخاطر
      riskThresholds: {
        lateAttendanceThreshold: {
          type: Number,
          default: 3, // عدد الأيام
        },
        absenteeThreshold: {
          type: Number,
          default: 5,
        },
      },
    },

    // سياسة التصعيد والمعالجة
    escalationPolicy: {
      firstViolation: String,
      secondViolation: String,
      thirdViolation: String,
      ultimateAction: String, // قد يكون الفصل
    },

    // التكاملات
    integrations: {
      syncWithPayroll: Boolean,
      syncWithHR: Boolean,
      syncWithProjectManagement: Boolean,
    },

    // الحالة والفعالية
    isActive: {
      type: Boolean,
      default: true,
    },

    effectiveFrom: {
      type: Date,
      default: Date.now,
    },

    effectiveUntil: Date,

    // سجل التغييرات
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

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },

    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'Employee',
    },

    // الملاحظات
    notes: String,

    isDeleted: {
      type: Boolean,
      default: false
    },
  },
  {
    timestamps: true,
    collection: 'attendance_rules',
  }
);

// الفهارس
attendanceRulesSchema.index({ ruleName: 1 });
attendanceRulesSchema.index({ isActive: 1 });
attendanceRulesSchema.index({ 'applicability.departments': 1 });

// Instance method للتحقق من تطبيق القاعدة على موظف معين
attendanceRulesSchema.methods.appliesTo = function (employee) {
  const applicability = this.applicability;

  // التحقق من القسم
  if (
    applicability.departments &&
    applicability.departments.length > 0 &&
    !applicability.departments.includes(employee.departmentId)
  ) {
    return false;
  }

  // التحقق من الرتبة
  if (
    applicability.employeeRoles &&
    applicability.employeeRoles.length > 0 &&
    !applicability.employeeRoles.includes(employee.role)
  ) {
    return false;
  }

  // التحقق من الموظفين المحددين
  if (
    applicability.specificEmployees &&
    applicability.specificEmployees.length > 0 &&
    !applicability.specificEmployees.includes(employee._id)
  ) {
    return false;
  }

  return true;
};

// Instance method للحصول على معلومات ساعات العمل للموظف
attendanceRulesSchema.methods.getWorkingHoursInfo = function () {
  return {
    checkInTime: this.workingHours.mandatoryCheckInTime,
    checkOutTime: this.workingHours.mandatoryCheckOutTime,
    totalHours: this.workingHours.totalWorkHoursPerDay,
    offDays: this.workingHours.weeklyOffDays,
  };
};

module.exports = mongoose.model('AttendanceRules', attendanceRulesSchema);
