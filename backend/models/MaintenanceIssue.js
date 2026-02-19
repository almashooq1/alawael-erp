/**
 * Maintenance Issue Model - نموذج مشاكل وعيوب الصيانة
 *
 * تتبع المشاكل والعيوب والأعطال المكتشفة
 * ✅ Issue Tracking
 * ✅ Root Cause Analysis
 * ✅ Resolution Tracking
 * ✅ Prevention Planning
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const MaintenanceIssueSchema = new Schema(
  {
    // معلومات المشكلة
    issueId: {
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
    plateNumber: String,

    // وصف المشكلة
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    symptoms: [String], // الأعراض التي لاحظها المستخدم

    // التصنيف
    category: {
      type: String,
      enum: [
        'محرك',
        'إطارات',
        'فرامل',
        'بطارية',
        'مولد كهربائي',
        'كمبيوسيتر',
        'تبريد',
        'وقود',
        'كهرباء',
        'هيكل',
        'داخل',
        'خارج',
        'أخرى',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['منخفضة', 'متوسطة', 'عالية', 'حرجة'],
      default: 'متوسطة',
    },
    type: {
      type: String,
      enum: ['عطل', 'صرير', 'تسرب', 'رائحة', 'أداء ضعيف', 'إضاءة تحذيرية', 'أخرى'],
      required: true,
    },

    // المراحل الزمنية
    reportedDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    reporterName: String,
    reporterPhone: String,

    detectedDate: Date, // تاريخ اكتشاف المشكلة فعلياً
    assignedDate: Date,
    startedDate: Date,
    resolvedDate: Date,
    closedDate: Date,

    // الفحص والتشخيص
    diagnosis: {
      diagnostician: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      diagnosticianName: String,
      diagnosisDate: Date,
      rootCause: String,
      requiredRepairs: [String],
      estimatedCost: Number,
      estimatedDuration: Number,
      confidence: {
        type: Number,
        min: 0,
        max: 100,
      },
    },

    // العلاج والحل
    resolution: {
      status: {
        type: String,
        enum: ['مفتوح', 'قيد المعالجة', 'معلق', 'مقفول', 'معاد الفتح'],
        default: 'مفتوح',
      },
      assignedTechnician: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      technicianName: String,
      repairActions: [
        {
          action: String,
          date: Date,
          performedBy: String,
          result: String,
        },
      ],
      actualCost: Number,
      actualDuration: Number,
      partsReplaced: [
        {
          partName: String,
          partNumber: String,
          quantity: Number,
          cost: Number,
          replacedDate: Date,
        },
      ],
      resolutionNotes: String,
      successfullyClosed: { type: Boolean, default: false },
    },

    // المتابعة والوقاية
    followUp: {
      nextCheckDate: Date,
      preventiveMeasures: [String],
      warningSignsToWatch: [String],
      recommendedScheduleChanges: String,
    },

    // الجودة والتقييم
    quality: {
      customerSatisfaction: {
        type: Number,
        min: 0,
        max: 5,
      },
      review: String,
      similarIssuesEncountered: Number, // كم مرة حدثت نفس المشكلة
      isRecurring: Boolean,
      recurringCount: { type: Number, default: 0 },
    },

    // المرفقات والوثائق
    attachments: [
      {
        filename: String,
        url: String,
        type: String, // صورة، فيديو، فحص، تقرير
        uploadedAt: Date,
        uploadedBy: String,
      },
    ],
    diagnosticReport: String, // رابط التقرير
    repairPhotos: [String], // قبل وبعد الإصلاح

    // الإحالات والعلاقات
    relatedIssues: [
      {
        type: Schema.Types.ObjectId,
        ref: 'MaintenanceIssue',
      },
    ],
    relatedTasks: [
      {
        type: Schema.Types.ObjectId,
        ref: 'MaintenanceTask',
      },
    ],

    // السجلات والنشاط
    activityLog: [
      {
        action: String,
        timestamp: Date,
        performedBy: String,
        details: String,
      },
    ],

    // الملاحظات والتعليقات
    comments: [
      {
        author: String,
        text: String,
        timestamp: Date,
      },
    ],

    // المؤشرات والأداء
    metrics: {
      timeToDetection: Number, // بالساعات
      timeToDiagnosis: Number,
      timeToResolution: Number,
      costPerDayOfDowntime: Number,
    },

    // الامتثال والسلامة
    safetyImpact: {
      isSafety: { type: Boolean, default: false },
      safetyRisk: {
        type: String,
        enum: ['منخفضة', 'متوسطة', 'عالية'],
      },
      riskMitigation: String,
    },

    // الحالة والإجراءات
    status: {
      type: String,
      enum: ['جديد', 'قيد المعالجة', 'معلق', 'مكتمل', 'معاد فتح'],
      default: 'جديد',
    },
    priority: {
      type: String,
      enum: ['منخفضة', 'عادية', 'عالية', 'حرجة'],
      default: 'عادية',
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
MaintenanceIssueSchema.index({ vehicle: 1, status: 1 });
MaintenanceIssueSchema.index({ 'resolution.status': 1 });
MaintenanceIssueSchema.index({ reportedDate: -1 });
MaintenanceIssueSchema.index({ category: 1, severity: 1 });
MaintenanceIssueSchema.index({ 'quality.isRecurring': 1 });

// الحقول الحسابية
MaintenanceIssueSchema.virtual('isOpen').get(function () {
  return this.status !== 'مكتمل' && this.status !== 'معاد فتح';
});

MaintenanceIssueSchema.virtual('daysToResolve').get(function () {
  if (this.resolvedDate && this.reportedDate) {
    const diff = this.resolvedDate.getTime() - this.reportedDate.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
  return null;
});

MaintenanceIssueSchema.virtual('isOverdue').get(function () {
  if (this.resolvedDate === undefined && this.reportedDate) {
    const diff = new Date().getTime() - this.reportedDate.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 30; // مفتوح لأكثر من 30 يوم
  }
  return false;
});

module.exports = mongoose.model('MaintenanceIssue', MaintenanceIssueSchema);
