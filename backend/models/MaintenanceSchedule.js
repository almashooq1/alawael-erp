/**
 * Maintenance Schedule Model - نموذج جدول الصيانة
 *
 * إدارة جداول الصيانة الدورية والمخصصة
 * ✅ Schedule Planning
 * ✅ Predictive Maintenance
 * ✅ Resources Allocation
 * ✅ Optimization
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MaintenanceScheduleSchema = new Schema(
  {
    // المعلومات الأساسية
    scheduleId: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
    },
    vehicle: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },

    // نوع الجدول
    scheduleType: {
      type: String,
      enum: ['دوري', 'بناءً على الكيلومترات', 'بناءً على الساعات', 'بناءً على الحالة'],
      required: true,
    },

    // الجدول الدوري
    recurringSchedule: {
      frequency: {
        type: Number, // الفترة
      },
      unit: {
        type: String,
        enum: ['يومي', 'أسبوعي', 'شهري', 'ربع سنوي', 'سنوي'],
      },
      lastExecuted: Date,
      nextDue: Date,
      isActive: { type: Boolean, default: true },
    },

    // الجدول بناءً على الكيلومترات
    mileageBasedSchedule: {
      interval: Number, // كل كم كيلومتر
      lastMileage: Number,
      nextDueMileage: Number,
      isActive: { type: Boolean, default: false },
    },

    // الجدول بناءً على ساعات التشغيل
    hoursBasedSchedule: {
      interval: Number, // كل كم ساعة
      lastHours: Number,
      nextDueHours: Number,
      isActive: { type: Boolean, default: false },
    },

    // الصيانة الحسب الحالة
    conditionBasedSchedule: {
      triggers: [
        {
          condition: String, // الحالة التي تتطلب الصيانة
          threshold: Number,
          currentValue: Number,
          isTriggered: Boolean,
        },
      ],
      isActive: { type: Boolean, default: false },
    },

    // التفاصيل
    description: String,
    maintenanceItems: [
      {
        itemName: String,
        description: String,
        estimatedCost: Number,
        estimatedDuration: Number,
        required: { type: Boolean, default: true },
      },
    ],

    // الموارد المطلوبة
    requiredResources: {
      technicians: {
        count: Number,
        specialization: [String],
      },
      equipment: [String],
      materials: [
        {
          name: String,
          quantity: Number,
          unit: String,
        },
      ],
    },

    // التكاليف المتوقعة
    estimatedCost: {
      parts: Number,
      labor: Number,
      overhead: Number,
      total: Number,
    },

    // الأداء والإحصائيات
    statistics: {
      totalExecutions: { type: Number, default: 0 },
      successfulExecutions: { type: Number, default: 0 },
      failedExecutions: { type: Number, default: 0 },
      averageCost: Number,
      averageDuration: Number,
      completionRate: Number,
    },

    // الأولويات والتصنيف
    priority: {
      type: String,
      enum: ['منخفضة', 'متوسطة', 'عالية', 'حرجة'],
      default: 'متوسطة',
    },
    category: {
      type: String,
      enum: ['روتينية', 'وقائية', 'تصحيحية', 'طوارئ'],
      required: true,
    },

    // الامتثال والمعايير
    complianceRequirements: [
      {
        requirement: String,
        standard: String, // المعيار الذي يتطلبه
        mandatory: Boolean,
      },
    ],

    // الملاحظات والتحذيرات
    warnings: [String],
    notes: String,
    safetyPrecautions: [String],

    // التابعين والاشتراكات
    followers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // التاريخ والحالة
    status: {
      type: String,
      enum: ['نشط', 'معطل', 'منتهي الصلاحية'],
      default: 'نشط',
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    lastModifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },

    createdAt: {
      type: Date,
      default: Date.now,
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

// الفهارس
MaintenanceScheduleSchema.index({ vehicle: 1, status: 1 });
MaintenanceScheduleSchema.index({ 'recurringSchedule.nextDue': 1 });
MaintenanceScheduleSchema.index({ 'mileageBasedSchedule.nextDueMileage': 1 });
MaintenanceScheduleSchema.index({ category: 1 });
MaintenanceScheduleSchema.index({ priority: 1 });

// الحقول الحسابية
MaintenanceScheduleSchema.virtual('nextDueDate').get(function () {
  if (this.recurringSchedule.isActive) {
    return this.recurringSchedule.nextDue;
  }
  return null;
});

MaintenanceScheduleSchema.virtual('isDue').get(function () {
  if (this.recurringSchedule.isActive && this.recurringSchedule.nextDue) {
    return this.recurringSchedule.nextDue <= new Date();
  }
  return false;
});

MaintenanceScheduleSchema.virtual('daysUntilDue').get(function () {
  if (this.recurringSchedule.isActive && this.recurringSchedule.nextDue) {
    const diff = this.recurringSchedule.nextDue.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return null;
});

MaintenanceScheduleSchema.virtual('successRate').get(function () {
  if (this.statistics.totalExecutions > 0) {
    return (
      ((this.statistics.successfulExecutions / this.statistics.totalExecutions) * 100).toFixed(2) +
      '%'
    );
  }
  return 'N/A';
});

module.exports = mongoose.model('MaintenanceSchedule', MaintenanceScheduleSchema);
