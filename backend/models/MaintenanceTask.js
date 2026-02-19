/**
 * Maintenance Task Model - نموذج مهام الصيانة
 *
 * تمثيل المهام والعمليات الصيانية التفصيلية
 * ✅ Task Management
 * ✅ Progress Tracking
 * ✅ Cost Tracking
 * ✅ Quality Assurance
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MaintenanceTaskSchema = new Schema(
  {
    // المعلومات الأساسية
    taskId: {
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
    schedule: {
      type: Schema.Types.ObjectId,
      ref: 'MaintenanceSchedule',
      required: true,
    },

    // تفاصيل المهمة
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: String,
    category: {
      type: String,
      enum: [
        'روتينية',
        'وقائية',
        'تصحيحية',
        'طوارئ',
        'فحص',
        'تنظيف',
        'معايرة',
        'استبدال',
      ],
      required: true,
    },
    type: {
      type: String,
      enum: [
        'تبديل زيت',
        'استبدال فلتر',
        'فحص الفرامل',
        'استبدال الإطارات',
        'فحص البطارية',
        'تنظيف',
        'معايرة',
        'إصلاح',
        'التحديث',
        'أخرى',
      ],
      required: true,
    },
    priority: {
      type: String,
      enum: ['منخفضة', 'متوسطة', 'عالية', 'حرجة'],
      default: 'متوسطة',
    },

    // الجدولة والمدة
    scheduledDate: {
      type: Date,
      required: true,
    },
    estimatedDuration: {
      type: Number, // بالساعات
      required: true,
    },
    actualDuration: Number,
    startedDate: Date,
    completedDate: Date,

    // الموارد والتكاليف
    assignedTechnician: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    technicianName: String,
    estimatedCost: {
      type: Number,
      required: true,
    },
    actualCost: Number,
    materials: [
      {
        partName: String,
        partNumber: String,
        quantity: Number,
        unit: String,
        unitCost: Number,
        totalCost: Number,
      },
    ],

    // الحالة والتتبع
    status: {
      type: String,
      enum: ['مجدولة', 'جارية', 'معلقة', 'مكتملة', 'ملغاة', 'مؤجلة'],
      default: 'مجدولة',
    },
    progress: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    notes: String,
    issues: [
      {
        issueName: String,
        severity: {
          type: String,
          enum: ['منخفضة', 'متوسطة', 'عالية', 'حرجة'],
        },
        discovered: Date,
        resolved: Date,
        description: String,
      },
    ],

    // الجودة والعوامل
    qualityChecklist: [
      {
        checkItem: String,
        required: Boolean,
        checked: { type: Boolean, default: false },
        checkedAt: Date,
        checkedBy: String,
        notes: String,
      },
    ],
    qualityScore: {
      type: Number,
      min: 0,
      max: 100,
    },

    // المرفقات والوثائق
    attachments: [
      {
        filename: String,
        url: String,
        uploadedAt: Date,
        uploadedBy: String,
        type: String, // صورة، فيديو، PDF وغيره
      },
    ],
    beforePhotos: [String], // روابط الصور قبل الصيانة
    afterPhotos: [String], // روابط الصور بعد الصيانة

    // التعليقات والسجلات
    activityLog: [
      {
        action: String,
        timestamp: Date,
        performedBy: String,
        details: String,
      },
    ],

    // البيانات الوصفية
    estimatedMileageIncrease: Number,
    odometerReading: {
      before: Number,
      after: Number,
    },
    warrantyIncluded: {
      type: Boolean,
      default: false,
    },
    warrantyDetails: String,

    // الإشعارات والتنبيهات
    notificationsSent: [
      {
        recipient: String,
        type: String, // email, sms, push
        sentAt: Date,
        status: String,
      },
    ],

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
MaintenanceTaskSchema.index({ vehicle: 1, status: 1 });
MaintenanceTaskSchema.index({ scheduledDate: 1 });
MaintenanceTaskSchema.index({ assignedTechnician: 1 });
MaintenanceTaskSchema.index({ status: 1 });
MaintenanceTaskSchema.index({ priority: 1 });

// الحقول الحسابية
MaintenanceTaskSchema.virtual('isOverdue').get(function () {
  return this.scheduledDate < new Date() && this.status !== 'مكتملة';
});

MaintenanceTaskSchema.virtual('costUtilization').get(function () {
  if (this.actualCost && this.estimatedCost) {
    return ((this.actualCost / this.estimatedCost) * 100).toFixed(2);
  }
  return null;
});

MaintenanceTaskSchema.virtual('durationOverrun').get(function () {
  if (this.actualDuration && this.estimatedDuration) {
    return this.actualDuration - this.estimatedDuration;
  }
  return null;
});

module.exports = mongoose.model('MaintenanceTask', MaintenanceTaskSchema);
