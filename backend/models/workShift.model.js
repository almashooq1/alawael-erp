/**
 * WorkShift Model - نموذج الورديات / نوبات العمل
 * تعريف ورديات العمل المختلفة وربطها بالأقسام والموظفين
 *
 * @module models/workShift.model
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// ─── فترة استراحة ─────────────────────────────────────────────────
const breakPeriodSchema = new Schema(
  {
    name: { type: String, required: true }, // مثل: استراحة الغداء
    startTime: { type: String, required: true }, // HH:mm
    endTime: { type: String, required: true }, // HH:mm
    durationMinutes: { type: Number, required: true },
    isPaid: { type: Boolean, default: true },
  },
  { _id: false }
);

// ─── تعيين الوردية لقسم/موظف ────────────────────────────────────
const shiftAssignmentSchema = new Schema(
  {
    targetType: {
      type: String,
      enum: ['department', 'employee'],
      required: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      refPath: 'assignments.targetType',
      required: true,
    },
    targetName: String,
    effectiveFrom: { type: Date, default: Date.now },
    effectiveUntil: Date,
    assignedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

// ─── النموذج الرئيسي ─────────────────────────────────────────────
const workShiftSchema = new Schema(
  {
    // معلومات الوردية الأساسية
    shiftName: {
      type: String,
      required: [true, 'اسم الوردية مطلوب'],
      trim: true,
    },

    shiftNameEn: {
      type: String,
      trim: true,
    },

    shiftCode: {
      type: String,
      required: [true, 'رمز الوردية مطلوب'],
      unique: true,
      uppercase: true,
      trim: true,
    },

    shiftType: {
      type: String,
      enum: ['morning', 'evening', 'night', 'flexible', 'split', 'rotating'],
      required: true,
      default: 'morning',
    },

    description: String,

    // أوقات العمل
    startTime: {
      type: String, // HH:mm (24h)
      required: [true, 'وقت بداية الوردية مطلوب'],
    },

    endTime: {
      type: String, // HH:mm (24h)
      required: [true, 'وقت نهاية الوردية مطلوب'],
    },

    // هل الوردية تمتد لليوم التالي (مثل وردية ليلية 22:00 - 06:00)
    crossesMidnight: {
      type: Boolean,
      default: false,
    },

    // إجمالي ساعات العمل المتوقعة
    totalWorkHours: {
      type: Number,
      required: true,
      default: 8,
    },

    // فترة السماح
    gracePeriod: {
      checkInMinutes: { type: Number, default: 10 }, // دقائق التأخير المسموحة
      checkOutMinutes: { type: Number, default: 5 }, // دقائق الخروج المبكر المسموحة
    },

    // فترات الاستراحة
    breaks: [breakPeriodSchema],

    // أيام العمل
    workDays: {
      type: [String],
      enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
      default: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday'],
    },

    // سياسة التأخير
    latePolicy: {
      // فترات التأخير والخصومات
      intervals: [
        {
          fromMinutes: Number,
          toMinutes: Number,
          deductionType: { type: String, enum: ['minutes', 'hours', 'percentage'] },
          deductionValue: Number,
          label: String, // مثال: "تأخير بسيط"
        },
      ],
      // الحد الأقصى للتأخير قبل اعتبار اليوم غياب
      maxLateMinutes: { type: Number, default: 120 },
    },

    // سياسة الساعات الإضافية
    overtimePolicy: {
      enabled: { type: Boolean, default: true },
      multiplier: { type: Number, default: 1.5 }, // معامل الأجر الإضافي
      minOvertimeMinutes: { type: Number, default: 30 }, // أقل مدة تحتسب كإضافي
      maxDailyHours: { type: Number, default: 4 }, // أقصى إضافي يومي
      requiresApproval: { type: Boolean, default: true },
    },

    // تعيينات الوردية (أقسام وموظفين)
    assignments: [shiftAssignmentSchema],

    // اللون في واجهة المستخدم
    color: {
      type: String,
      default: '#1976d2',
    },

    // الأولوية (عند وجود ورديات متعددة)
    priority: {
      type: Number,
      default: 0,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'work_shifts',
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─── الفهارس ─────────────────────────────────────────────────────
// shiftCode already has unique:true in field definition
workShiftSchema.index({ isActive: 1, shiftType: 1 });
workShiftSchema.index({ 'assignments.targetType': 1, 'assignments.targetId': 1 });
workShiftSchema.index({ isDefault: 1 });

// ─── Virtuals ────────────────────────────────────────────────────
workShiftSchema.virtual('totalBreakMinutes').get(function () {
  return (this.breaks || []).reduce((sum, b) => sum + (b.durationMinutes || 0), 0);
});

workShiftSchema.virtual('netWorkMinutes').get(function () {
  return this.totalWorkHours * 60 - this.totalBreakMinutes;
});

// ─── الأساليب الثابتة ────────────────────────────────────────────

/**
 * جلب الوردية الافتراضية
 */
workShiftSchema.statics.getDefault = function () {
  return this.findOne({ isDefault: true, isActive: true });
};

/**
 * جلب جميع الورديات النشطة
 */
workShiftSchema.statics.getActive = function () {
  return this.find({ isActive: true }).sort({ priority: -1, shiftName: 1 });
};

/**
 * جلب وردية موظف معين
 * تبحث أولاً عن تعيين مباشر للموظف، ثم تعيين القسم، ثم الوردية الافتراضية
 */
workShiftSchema.statics.getEmployeeShift = async function (employeeId, departmentId) {
  const now = new Date();

  // 1. تعيين مباشر للموظف
  const directAssignment = await this.findOne({
    isActive: true,
    assignments: {
      $elemMatch: {
        targetType: 'employee',
        targetId: employeeId,
        effectiveFrom: { $lte: now },
        $or: [{ effectiveUntil: null }, { effectiveUntil: { $gte: now } }],
      },
    },
  });
  if (directAssignment) return directAssignment;

  // 2. تعيين القسم
  if (departmentId) {
    const deptAssignment = await this.findOne({
      isActive: true,
      assignments: {
        $elemMatch: {
          targetType: 'department',
          targetId: departmentId,
          effectiveFrom: { $lte: now },
          $or: [{ effectiveUntil: null }, { effectiveUntil: { $gte: now } }],
        },
      },
    });
    if (deptAssignment) return deptAssignment;
  }

  // 3. الوردية الافتراضية
  return this.getDefault();
};

/**
 * تعيين وردية لقسم أو موظف
 */
workShiftSchema.statics.assignShift = async function (shiftId, targetType, targetId, targetName, userId) {
  const shift = await this.findById(shiftId);
  if (!shift) throw new Error('الوردية غير موجودة');

  // إزالة التعيين القديم من نفس النوع/الهدف في جميع الورديات
  await this.updateMany(
    {},
    {
      $pull: {
        assignments: { targetType, targetId },
      },
    }
  );

  // إضافة التعيين الجديد
  shift.assignments.push({
    targetType,
    targetId,
    targetName,
    assignedBy: userId,
    effectiveFrom: new Date(),
  });

  await shift.save();
  return shift;
};

// ─── أساليب النسخة ────────────────────────────────────────────────

/**
 * التحقق من وقت الحضور وحساب التأخير
 * @param {Date} checkInTime - وقت الحضور الفعلي
 * @returns {{ isLate: boolean, lateMinutes: number, deduction: object|null }}
 */
workShiftSchema.methods.calculateLateness = function (checkInTime) {
  const [shiftH, shiftM] = this.startTime.split(':').map(Number);
  const checkInDate = new Date(checkInTime);
  const checkH = checkInDate.getHours();
  const checkM = checkInDate.getMinutes();

  let lateMinutes = (checkH - shiftH) * 60 + (checkM - shiftM);

  // السماح بفترة الحضور المسموحة
  if (lateMinutes <= this.gracePeriod.checkInMinutes) {
    return { isLate: false, lateMinutes: 0, deduction: null };
  }

  // غياب إذا تجاوز الحد الأقصى
  if (lateMinutes >= (this.latePolicy?.maxLateMinutes || 120)) {
    return { isLate: true, lateMinutes, deduction: null, isAbsent: true };
  }

  // البحث عن فترة الخصم المناسبة
  let deduction = null;
  const intervals = this.latePolicy?.intervals || [];
  for (const interval of intervals) {
    if (lateMinutes >= interval.fromMinutes && lateMinutes < interval.toMinutes) {
      deduction = {
        type: interval.deductionType,
        value: interval.deductionValue,
        label: interval.label,
      };
      break;
    }
  }

  return { isLate: true, lateMinutes, deduction };
};

/**
 * التحقق من الخروج المبكر
 */
workShiftSchema.methods.calculateEarlyLeave = function (checkOutTime) {
  const [shiftH, shiftM] = this.endTime.split(':').map(Number);
  const checkOutDate = new Date(checkOutTime);
  const outH = checkOutDate.getHours();
  const outM = checkOutDate.getMinutes();

  let earlyMinutes = (shiftH - outH) * 60 + (shiftM - outM);

  if (earlyMinutes <= this.gracePeriod.checkOutMinutes) {
    return { isEarlyLeave: false, earlyMinutes: 0 };
  }

  return { isEarlyLeave: earlyMinutes > 0, earlyMinutes: Math.max(0, earlyMinutes) };
};

/**
 * حساب الساعات الإضافية
 */
workShiftSchema.methods.calculateOvertime = function (checkInTime, checkOutTime) {
  if (!this.overtimePolicy?.enabled) return { hasOvertime: false, minutes: 0, pay: 0 };

  const diffMs = new Date(checkOutTime) - new Date(checkInTime);
  const totalMinutes = Math.floor(diffMs / 60000);
  const expectedMinutes = this.totalWorkHours * 60;
  const overtimeMinutes = totalMinutes - expectedMinutes;

  if (overtimeMinutes < (this.overtimePolicy.minOvertimeMinutes || 30)) {
    return { hasOvertime: false, minutes: 0, pay: 0 };
  }

  const cappedMinutes = Math.min(
    overtimeMinutes,
    (this.overtimePolicy.maxDailyHours || 4) * 60
  );

  return {
    hasOvertime: true,
    minutes: cappedMinutes,
    hours: Math.round((cappedMinutes / 60) * 100) / 100,
    multiplier: this.overtimePolicy.multiplier,
    requiresApproval: this.overtimePolicy.requiresApproval,
  };
};

/**
 * هل اليوم يوم عمل؟
 */
workShiftSchema.methods.isWorkDay = function (date) {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[new Date(date).getDay()];
  return this.workDays.includes(dayName);
};

module.exports = mongoose.models.WorkShift || mongoose.model('WorkShift', workShiftSchema);
