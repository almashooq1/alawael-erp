/**
 * Equipment Management System
 * نظام إدارة المعدات - تصنيف متقدم وتتبع شامل
 */

const mongoose = require('mongoose');

// ============ EQUIPMENT SCHEMA ============
const equipmentSchema = new mongoose.Schema(
  {
    // معلومات أساسية
    equipmentId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'اسم المعدة مطلوب'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 1000,
    },

    // التصنيف المتقدم
    category: {
      type: String,
      required: [true, 'التصنيف مطلوب'],
      enum: [
        'assessment_diagnostic', // معدات تقييم وتشخيص
        'treatment_rehabilitation', // معدات علاج وتأهيل
        'assistive_technology', // أجهزة مساعدة وتقنية
        'consumables', // مواد استهلاكية طبية
      ],
    },

    // تصنيف فرعي
    subCategory: {
      type: String,
      trim: true,
    },

    // معلومات الشراء والضمان
    manufacturer: {
      type: String,
      trim: true,
    },
    model: {
      type: String,
      trim: true,
    },
    serialNumber: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    purchaseDate: {
      type: Date,
      required: [true, 'تاريخ الشراء مطلوب'],
    },
    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },
    supplier: {
      type: String,
      trim: true,
    },

    // معلومات الضمان
    warranty: {
      startDate: {
        type: Date,
        default: function () {
          return new Date();
        },
      },
      endDate: Date,
      provider: String,
      daysRemaining: Number,
      isExpired: {
        type: Boolean,
        default: false,
      },
    },

    // حالة المعدة
    status: {
      type: String,
      enum: [
        'available', // متاحة
        'in_use', // قيد الاستخدام
        'in_maintenance', // تحت الصيانة
        'damaged', // متضررة
        'out_of_service', // خارج الخدمة
        'retired', // متقاعدة
      ],
      default: 'available'
    },

    // معلومات الموقع
    location: {
      building: String,
      floor: String,
      room: String,
      department: String,
    },

    // معايير التشغيل
    operatingSpecs: {
      powerConsumption: String,
      dimensions: String,
      weight: String,
      capacity: String,
      features: [String],
    },

    // معايير الصيانة
    maintenanceSpecs: {
      maintenanceInterval: Number, // بالأيام
      lastMaintenanceDate: Date,
      nextMaintenanceDate: Date,
      estimatedOperatingHours: Number,
      currentOperatingHours: Number,
      maintenanceHistory: [
        {
          date: Date,
          type: String, // preventive, corrective
          description: String,
          technician: String,
          cost: Number,
          notes: String,
        },
      ],
    },

    // تتبع الاستخدام
    usage: {
      totalUsageHours: {
        type: Number,
        default: 0,
      },
      dailyUsageHours: {
        type: Number,
        default: 0,
      },
      lastUsedDate: Date,
      usageCount: {
        type: Number,
        default: 0,
      },
      utilizationRate: {
        // نسبة الاستخدام
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
    },

    // تتبع الأعطال
    faults: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        faultCode: String,
        description: String,
        severity: {
          type: String,
          enum: ['critical', 'high', 'medium', 'low'],
        },
        resolution: String,
        resolutionDate: Date,
        technician: String,
        cost: Number,
        resolved: {
          type: Boolean,
          default: false,
        },
      },
    ],

    // المستندات والصور
    media: {
      images: [String],
      manuals: [String],
      certificates: [String],
      calibrationReports: [String],
    },

    // الإدارة المالية
    financial: {
      acquisitionValue: Number,
      currentValue: Number,
      depreciationMethod: String,
      annualDepreciation: Number,
      lastValuation: Date,
    },

    // معلومات إضافية
    tags: [String],
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    collection: 'equipment',
  }
);

// ============ MAINTENANCE SCHEDULE SCHEMA ============
const maintenanceScheduleSchema = new mongoose.Schema(
  {
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipment',
      required: true
    },

    // معلومات الصيانة المجدولة
    scheduleType: {
      type: String,
      enum: [
        'preventive', // صيانة وقائية
        'corrective', // صيانة إصلاحية
        'predictive', // صيانة تنبؤية
        'condition_based', // صيانة بناءً على الحالة
      ],
      required: true,
    },

    // جدولة الصيانة الاستباقية
    preventiveSchedule: {
      frequency: Number, // بالأيام
      frequencyType: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'by_hours'],
      },
      operatingHoursInterval: Number, // ساعات التشغيل
      lastScheduledDate: Date,
      nextScheduledDate: {
        type: Date,
      },
      estimatedDuration: Number, // بالساعات
    },

    // تتبع ساعات التشغيل
    operatingHours: {
      totalHours: {
        type: Number,
        default: 0,
      },
      lastRecordedHours: Number,
      recordedDate: Date,
      threshold: Number, // عتبة الصيانة
    },

    // تنبيهات قبل انتهاء الضمان
    warrantyAlerts: {
      enabled: {
        type: Boolean,
        default: true,
      },
      daysBeforeExpiry: {
        type: Number,
        default: 30,
      },
      alertSent: Boolean,
      alertDate: Date,
    },

    // معلومات المسؤولين
    responsibleTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    backupTechnician: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // تفاصيل الصيانة
    maintenanceDetails: {
      checklist: [
        {
          item: String,
          completed: Boolean,
          notes: String,
        },
      ],
      requiredParts: [String],
      estimatedCost: Number,
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium',
      },
    },

    // حالة الجدولة
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'overdue'],
      default: 'scheduled'
    },

    // تسجيل الإكمال
    completion: {
      completedDate: Date,
      completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      duration: Number, // بالساعات
      findings: String,
      recommendations: String,
      signOff: Boolean,
      images: [String],
    },

    // معلومات التكاليف
    cost: {
      laborCost: Number,
      partsCost: Number,
      totalCost: Number,
      invoiceNumber: String,
    },
  },
  {
    timestamps: true,
    collection: 'maintenance_schedules',
  }
);

// ============ EQUIPMENT LENDING SCHEMA ============
const equipmentLendingSchema = new mongoose.Schema(
  {
    // معرف الإعارة
    lendingId: {
      type: String,
      required: true,
      unique: true
    },

    // المعدة والمستخدم
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipment',
      required: true
    },
    borrower: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // معلومات الإعارة
    borrowDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    expectedReturnDate: {
      type: Date,
      required: true,
    },
    actualReturnDate: Date,

    // نوع الإعارة
    lendingType: {
      type: String,
      enum: [
        'in_house', // إعارة داخلية
        'home_loan', // إعارة للمنزل
        'temporary', // إعارة مؤقتة
        'demo', // عرض توضيحي
      ],
      required: true,
    },

    // الموقع والجهة
    borrowLocation: {
      type: String,
      required: true,
    },
    department: String,

    // حالة الإعارة
    status: {
      type: String,
      enum: [
        'active', // نشطة
        'returned', // مرتجعة
        'overdue', // متأخرة
        'damaged', // متضررة
        'lost', // مفقودة
      ],
      default: 'active'
    },

    // متابعة حالة الاستخدام
    usageStatus: {
      currentCondition: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor', 'damaged'],
        default: 'excellent',
      },
      usageNotes: String,
      lastInspectionDate: Date,
      lastInspectionNotes: String,
      issues: [
        {
          date: Date,
          description: String,
          severity: String,
          resolved: Boolean,
          resolutionNotes: String,
        },
      ],
    },

    // تتبع الاستخدام
    usageTracking: {
      hoursUsed: Number,
      usageFrequency: String,
      mainPurpose: String,
      additionalUsers: [
        {
          name: String,
          role: String,
          trainingProvided: Boolean,
        },
      ],
    },

    // عملية الإرجاع
    returnProcess: {
      returnedCondition: String,
      returnedCleanliness: String,
      damageReport: String,
      requiresMaintenance: Boolean,
      inspectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      inspectionDate: Date,
      signedByBorrower: Boolean,
      signedByAdmin: Boolean,
      photos: [String],
    },

    // المسؤوليات والتكاليف
    responsibilities: {
      responsible: Boolean,
      damage: Boolean,
      damageDescription: String,
      damageAppraisalCost: Number,
      damageRepairCost: Number,
      damageDeductible: Number,
    },

    // التنبيهات
    alerts: {
      overdueAlert: {
        sent: Boolean,
        sentDate: Date,
      },
      reminderAlert: {
        sent: Boolean,
        sentDate: Date,
      },
      followUpAlert: {
        sent: Boolean,
        sentDate: Date,
      },
    },

    // ملاحظات إضافية
    notes: String,
    attachments: [String],
  },
  {
    timestamps: true,
    collection: 'equipment_lending',
  }
);

// ============ EQUIPMENT FAULT LOG SCHEMA ============
const equipmentFaultLogSchema = new mongoose.Schema(
  {
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipment',
      required: true
    },

    faultCode: {
      type: String,
      required: true
    },

    description: {
      type: String,
      required: true,
    },

    detectedDate: {
      type: Date,
      required: true,
      default: Date.now
    },

    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    severity: {
      type: String,
      enum: ['critical', 'high', 'medium', 'low'],
      required: true
    },

    category: {
      type: String,
      enum: ['mechanical', 'electrical', 'software', 'calibration', 'other'],
      required: true,
    },

    symptoms: [String],

    resolution: {
      status: {
        type: String,
        enum: ['open', 'in_progress', 'resolved', 'closed'],
        default: 'open',
      },
      assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      solutionDescription: String,
      actionsTaken: [String],
      resolvedDate: Date,
      resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    cost: Number,

    prevention: {
      preventiveMeasures: String,
      frequencyOfOccurrence: Number,
      rootCause: String,
    },
  },
  {
    timestamps: true,
    collection: 'equipment_fault_logs',
  }
);

// ============ EQUIPMENT CALIBRATION SCHEMA ============
const equipmentCalibrationSchema = new mongoose.Schema(
  {
    equipment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Equipment',
      required: true,
    },

    calibrationDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    nextCalibrationDate: {
      type: Date,
      required: true,
    },

    calibrationStandard: String,

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    calibrationProvider: String,

    results: {
      status: {
        type: String,
        enum: ['passed', 'failed', 'conditional'],
        required: true,
      },
      measurements: mongoose.Schema.Types.Mixed,
      tolerances: mongoose.Schema.Types.Mixed,
      deviations: mongoose.Schema.Types.Mixed,
      certificateNumber: String,
    },

    cost: Number,

    certificate: String, // صورة الشهادة

    notes: String,
  },
  {
    timestamps: true,
    collection: 'equipment_calibrations',
  }
);

// ============ INDEXES ============
equipmentSchema.index({ category: 1, status: 1 });
equipmentSchema.index({ purchaseDate: -1 });
equipmentSchema.index({ 'warranty.endDate': 1 });
maintenanceScheduleSchema.index({ equipment: 1, status: 1 });
maintenanceScheduleSchema.index({ 'preventiveSchedule.nextScheduledDate': 1 });
equipmentLendingSchema.index({ borrower: 1, status: 1 });
equipmentLendingSchema.index({ borrowDate: -1 });

// ============ MODELS ============
module.exports = {
  Equipment: mongoose.model('Equipment', equipmentSchema),
  MaintenanceSchedule: mongoose.model('MaintenanceSchedule', maintenanceScheduleSchema),
  EquipmentLending: mongoose.model('EquipmentLending', equipmentLendingSchema),
  EquipmentFaultLog: mongoose.model('EquipmentFaultLog', equipmentFaultLogSchema),
  EquipmentCalibration: mongoose.model('EquipmentCalibration', equipmentCalibrationSchema),
};
