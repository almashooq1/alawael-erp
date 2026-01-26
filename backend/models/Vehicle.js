/**
 * Vehicle Model - نموذج المركبة
 *
 * تمثيل المركبات مع جميع البيانات والعلاقات
 * ✅ Vehicle Registration
 * ✅ Fleet Management
 * ✅ Insurance & Inspection
 * ✅ Maintenance Tracking
 * ✅ Driver Assignment
 * ✅ GPS Tracking Ready
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VehicleSchema = new Schema(
  {
    // بيانات المركبة الأساسية
    registrationNumber: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
      trim: true,
    },
    plateNumber: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
    },
    vin: {
      type: String,
      unique: true,
      required: true,
      uppercase: true,
    },
    engineNumber: {
      type: String,
      unique: true,
      required: true,
    },

    // بيانات المالك
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    ownerName: String,
    ownerPhone: String,
    ownerEmail: String,

    // معلومات المركبة التقنية
    basicInfo: {
      make: { type: String, required: true }, // الماركة
      model: { type: String, required: true }, // الموديل
      year: { type: Number, required: true }, // سنة التصنيع
      color: String, // اللون
      type: {
        type: String,
        enum: [
          'سيارة ركوب',
          'سيارة نقل',
          'حافلة',
          'شاحنة',
          'دراجة نارية',
          'جرار',
          'معدات ثقيلة',
          'أخرى',
        ],
        required: true,
      },
      fuelType: {
        type: String,
        enum: ['بنزين', 'ديزل', 'كهربائي', 'هجين', 'غاز'],
        required: true,
      },
      transmissionType: {
        type: String,
        enum: ['أوتوماتيك', 'يدوي'],
        default: 'أوتوماتيك',
      },
      engineCapacity: Number, // حجم المحرك بـ cc
      numberOfDoors: Number, // عدد الأبواب
      numberOfSeats: Number, // عدد المقاعد
    },

    // بيانات التسجيل والملكية
    registration: {
      registrationDate: { type: Date, required: true },
      expiryDate: { type: Date, required: true },
      status: {
        type: String,
        enum: ['نشط', 'منتهي الصلاحية', 'معلق', 'ملغى'],
        default: 'نشط',
      },
      registrationOffice: String,
      category: {
        type: String,
        enum: ['خاص', 'عام', 'تجاري', 'حكومي'],
        required: true,
      },
    },

    // بيانات التأمين
    insurance: {
      provider: String,
      policyNumber: {
        type: String,
        unique: true,
        sparse: true,
      },
      policyStartDate: Date,
      policyExpiryDate: Date,
      coverageType: {
        type: String,
        enum: ['أساسي', 'شامل'],
      },
      monthlyPremium: Number,
      insured: { type: Boolean, default: false },
      documents: [
        {
          type: Schema.Types.ObjectId,
          ref: 'Document',
        },
      ],
    },

    // بيانات الفحص الدوري
    inspection: {
      lastInspectionDate: Date,
      nextInspectionDate: Date,
      inspectionOffice: String,
      status: {
        type: String,
        enum: ['معايير', 'بحاجة فحص', 'رسب'],
        default: 'بحاجة فحص',
      },
      certificate: String,
      emissionStatus: String,
      safetyStatus: String,
      inspectionHistory: [
        {
          date: Date,
          result: String,
          notes: String,
          inspector: String,
        },
      ],
    },

    // بيانات المحرك والأداء
    performance: {
      odometer: { type: Number, default: 0 }, // قراءة العداد
      fuelConsumption: Number, // استهلاك الوقود
      averageSpeed: Number,
      totalRunningHours: { type: Number, default: 0 },
      condition: {
        type: String,
        enum: ['ممتاز', 'جيد', 'مقبول', 'سيء'],
        default: 'جيد',
      },
    },

    // الصيانة والإصلاحات
    maintenance: {
      lastMaintenanceDate: Date,
      nextMaintenanceDate: Date,
      maintenanceSchedule: {
        oil: { interval: { type: Number, default: 5000 }, lastDone: Date }, // تبديل الزيت كل 5000 كم
        filter: { interval: { type: Number, default: 10000 }, lastDone: Date }, // الفلتر كل 10000 كم
        tires: { interval: { type: Number, default: 20000 }, lastDone: Date }, // الإطارات كل 20000 كم
        brakes: { interval: { type: Number, default: 40000 }, lastDone: Date }, // الفرامل كل 40000 كم
        battery: { interval: { type: Number, default: 50000 }, lastDone: Date }, // البطارية كل 50000 كم
      },
      maintenanceHistory: [
        {
          date: Date,
          type: String,
          description: String,
          cost: Number,
          provider: String,
          mileage: Number,
        },
      ],
      totalMaintenanceCost: { type: Number, default: 0 },
    },

    // تعيين السائق
    assignedDriver: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      sparse: true,
    },
    driverName: String,
    driverPhone: String,
    assignmentDate: Date,
    assignmentStatus: {
      type: String,
      enum: ['مخصصة', 'متاحة', 'في الصيانة'],
      default: 'متاحة',
    },

    // GPS والتتبع
    tracking: {
      gpsEnabled: { type: Boolean, default: false },
      gpsDeviceId: String,
      lastLocation: {
        latitude: Number,
        longitude: Number,
        timestamp: Date,
        address: String,
      },
      locationHistory: [
        {
          latitude: Number,
          longitude: Number,
          timestamp: Date,
          speed: Number,
          bearing: Number,
        },
      ],
      speed: Number,
      engineStatus: {
        type: String,
        enum: ['متوقفة', 'تعمل', 'خطأ'],
        default: 'متوقفة',
      },
    },

    // المخالفات والمخاطر
    violations: [
      {
        date: Date,
        type: String,
        description: String,
        fine: Number,
        paid: { type: Boolean, default: false },
        paymentDate: Date,
      },
    ],
    totalViolations: { type: Number, default: 0 },
    totalFines: { type: Number, default: 0 },

    // الرخص والتصاريح المرتبطة - معطل مؤقتاً لحين إنشاء License model
    // relatedLicenses: [
    //   {
    //     type: Schema.Types.ObjectId,
    //     ref: 'License',
    //   },
    // ],

    // الملفات والمستندات
    documents: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],

    // ملاحظات وتعليقات
    notes: String,
    serviceHistory: [
      {
        date: Date,
        service: String,
        cost: Number,
        notes: String,
      },
    ],

    // حالة المركبة
    status: {
      type: String,
      enum: ['نشطة', 'معطلة', 'مبيعة', 'مسحوبة', 'في الإصلاح'],
      default: 'نشطة',
    },

    // الإحصائيات
    stats: {
      totalDistance: { type: Number, default: 0 },
      totalTrips: { type: Number, default: 0 },
      averageConsumption: Number,
      costPerKm: Number,
      totalCost: { type: Number, default: 0 },
    },

    // عطل السيارة
    issues: [
      {
        date: Date,
        issue: String,
        severity: {
          type: String,
          enum: ['منخفضة', 'متوسطة', 'عالية', 'حرجة'],
        },
        status: {
          type: String,
          enum: ['جديدة', 'قيد المعالجة', 'مغلقة'],
        },
        notes: String,
      },
    ],

    // الصور والملفات الوسائط
    images: [
      {
        url: String,
        caption: String,
        uploadedAt: Date,
      },
    ],

    // معلومات إضافية
    metadata: {
      previousOwners: [
        {
          name: String,
          period: String,
        },
      ],
      purchasePrice: Number,
      currentValue: Number,
      warrantyExpiry: Date,
    },

    // النشاط والأرشيف
    isActive: { type: Boolean, default: true },
    isArchived: { type: Boolean, default: false },
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Note: Indexes consolidated below to avoid duplication

// الحقول المحسوبة الافتراضية
VehicleSchema.virtual('age').get(function () {
  return new Date().getFullYear() - this.basicInfo.year;
});

VehicleSchema.virtual('registrationStatus').get(function () {
  const now = new Date();
  if (now > this.registration.expiryDate) {
    return 'منتهي الصلاحية';
  }
  const daysLeft = Math.floor((this.registration.expiryDate - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 30) {
    return 'قريب الانتهاء';
  }
  return 'نشط';
});

VehicleSchema.virtual('insuranceStatus').get(function () {
  if (!this.insurance.insured) return 'بلا تأمين';
  const now = new Date();
  if (now > this.insurance.policyExpiryDate) {
    return 'منتهي الصلاحية';
  }
  const daysLeft = Math.floor((this.insurance.policyExpiryDate - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 30) {
    return 'قريب الانتهاء';
  }
  return 'ساري';
});

VehicleSchema.virtual('inspectionStatus').get(function () {
  if (!this.inspection.nextInspectionDate) return 'لم يتم الفحص';
  const now = new Date();
  if (now > this.inspection.nextInspectionDate) {
    return 'متأخر الفحص';
  }
  const daysLeft = Math.floor((this.inspection.nextInspectionDate - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 30) {
    return 'قريب الفحص';
  }
  return 'معايير';
});

// الدوال المساعدة
VehicleSchema.methods.isCompliant = function () {
  const registrationValid = new Date() <= this.registration.expiryDate;
  const insuranceValid = this.insurance.insured && new Date() <= this.insurance.policyExpiryDate;
  const inspectionValid = new Date() <= this.inspection.nextInspectionDate;
  return registrationValid && insuranceValid && inspectionValid;
};

VehicleSchema.methods.getDaysUntilExpiry = function () {
  const now = new Date();
  const days = Math.floor((this.registration.expiryDate - now) / (1000 * 60 * 60 * 24));
  return Math.max(days, 0);
};

VehicleSchema.methods.addMaintenanceRecord = function (type, description, cost, provider, mileage) {
  this.maintenance.maintenanceHistory.push({
    date: new Date(),
    type,
    description,
    cost,
    provider,
    mileage,
  });
  this.maintenance.totalMaintenanceCost += cost;
  return this.save();
};

VehicleSchema.methods.recordViolation = function (type, description, fine) {
  this.violations.push({
    date: new Date(),
    type,
    description,
    fine,
    paid: false,
  });
  this.totalViolations += 1;
  this.totalFines += fine;
  return this.save();
};

VehicleSchema.methods.updateLocation = function (latitude, longitude, address, speed = 0) {
  this.tracking.lastLocation = {
    latitude,
    longitude,
    timestamp: new Date(),
    address,
  };
  this.tracking.speed = speed;

  // إضافة سجل التاريخ (إبقاء آخر 1000 سجل فقط)
  this.tracking.locationHistory.push({
    latitude,
    longitude,
    timestamp: new Date(),
    speed,
  });
  if (this.tracking.locationHistory.length > 1000) {
    this.tracking.locationHistory = this.tracking.locationHistory.slice(-1000);
  }

  return this.save();
};

// ================================
// DATABASE INDEXES FOR OPTIMIZATION
// ================================
// Primary Lookup Indexes
// Note: registrationNumber and plateNumber have unique: true (creates automatic index)
VehicleSchema.index({ owner: 1 });
// Note: assignedDriver single index removed - covered by compound index below
VehicleSchema.index({ status: 1 });
VehicleSchema.index({ createdAt: -1 });

// Compound Indexes (for complex queries)
VehicleSchema.index({ owner: 1, registrationNumber: 1 });
VehicleSchema.index({ status: 1, createdAt: -1 });
VehicleSchema.index({ assignedDriver: 1, status: 1 });

// Date Range Indexes
VehicleSchema.index({ 'registration.expiryDate': 1 });
VehicleSchema.index({ 'inspection.nextInspectionDate': 1 });

// Location Tracking Index
VehicleSchema.index({ 'tracking.lastLocation.timestamp': -1 });

module.exports = mongoose.models.Vehicle || mongoose.model('Vehicle', VehicleSchema);
