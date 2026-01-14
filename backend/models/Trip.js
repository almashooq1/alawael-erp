/**
 * Trip Model - نموذج الرحلة
 *
 * تتبع الرحلات والمسافات والتكاليف
 * ✅ Trip Tracking
 * ✅ Distance & Fuel Tracking
 * ✅ Cost Analysis
 * ✅ Route Recording
 */

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TripSchema = new Schema(
  {
    // معرف الرحلة
    tripId: { type: String, unique: true, required: true },

    // بيانات المركبة والسائق
    vehicle: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    vehicleRegistration: String,
    driver: {
      type: Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
    },
    driverName: String,

    // بيانات الرحلة الزمنية
    startTime: { type: Date, required: true },
    endTime: Date,
    duration: Number, // بالدقائق
    status: {
      type: String,
      enum: ['جاهزة', 'جارية', 'اكتملت', 'ملغاة'],
      default: 'جاهزة',
    },

    // بيانات الموقع
    startLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
      odometer: Number,
    },
    endLocation: {
      latitude: Number,
      longitude: Number,
      address: String,
      odometer: Number,
    },
    route: [
      {
        latitude: Number,
        longitude: Number,
        timestamp: Date,
        speed: Number,
      },
    ],

    // المسافة والسرعة
    distance: { type: Number, default: 0 }, // بالكيلومتر
    averageSpeed: { type: Number, default: 0 },
    maxSpeed: { type: Number, default: 0 },
    idleTime: { type: Number, default: 0 }, // دقائق التوقف

    // استهلاك الوقود
    fuelConsumption: {
      startFuelLevel: Number,
      endFuelLevel: Number,
      fuelUsed: Number,
      efficiency: Number, // كم/لتر
    },

    // التكاليف
    costs: {
      fuelCost: { type: Number, default: 0 },
      tolls: { type: Number, default: 0 },
      parkingFees: { type: Number, default: 0 },
      maintenanceCost: { type: Number, default: 0 },
      insuranceCost: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    // الشحنة/البضاعة
    cargo: {
      weight: Number,
      type: String,
      description: String,
      referenceNumber: String,
    },

    // الركاب/الخدمات
    passengers: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    purpose: {
      type: String,
      enum: ['نقل', 'خدمة', 'فحص', 'صيانة', 'ترفيه', 'تدريب', 'أخرى'],
    },

    // الإجراءات والمخالفات
    violations: [
      {
        timestamp: Date,
        type: String,
        description: String,
        severity: String,
      },
    ],
    speedingIncidents: [
      {
        timestamp: Date,
        location: String,
        speed: Number,
        limit: Number,
      },
    ],

    // الأحداث الهامة
    events: [
      {
        timestamp: Date,
        eventType: {
          type: String,
          enum: ['بدء', 'توقف', 'تسريع', 'كبح', 'انعطاف', 'تحذير', 'خطأ'],
        },
        details: String,
      },
    ],

    // جودة القيادة
    drivingQuality: {
      smoothnessScore: { type: Number, min: 0, max: 100 },
      safetyScore: { type: Number, min: 0, max: 100 },
      efficiencyScore: { type: Number, min: 0, max: 100 },
      overallScore: { type: Number, min: 0, max: 100 },
    },

    // التقارير والملاحظات
    notes: String,
    reportedIssues: [String],
    weatherConditions: String,

    // البيانات الوسائط
    photos: [
      {
        url: String,
        caption: String,
        timestamp: Date,
      },
    ],

    // التحقق والتوقيع
    verified: { type: Boolean, default: false },
    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    verificationDate: Date,
  },
  {
    timestamps: true,
  },
);

// الفهارس
TripSchema.index({ vehicle: 1, startTime: -1 });
TripSchema.index({ driver: 1, startTime: -1 });
TripSchema.index({ status: 1 });
TripSchema.index({ startTime: -1 });

// الحقول المحسوبة الافتراضية
TripSchema.virtual('costPerKm').get(function () {
  return this.distance > 0 ? (this.costs.total / this.distance).toFixed(2) : 0;
});

TripSchema.virtual('revenuePerKm').get(function () {
  return this.distance > 0 ? (this.revenue / this.distance).toFixed(2) : 0;
});

TripSchema.virtual('profit').get(function () {
  return this.revenue - this.costs.total;
});

// الدوال المساعدة
TripSchema.methods.calculateDuration = function () {
  if (this.startTime && this.endTime) {
    this.duration = Math.floor((this.endTime - this.startTime) / (1000 * 60)); // بالدقائق
  }
  return this;
};

TripSchema.methods.calculateCosts = function () {
  this.costs.total = this.costs.fuelCost + this.costs.tolls + this.costs.parkingFees;
  return this;
};

TripSchema.methods.recordViolation = function (violation) {
  this.violations.push({
    timestamp: new Date(),
    ...violation,
  });
  return this.save();
};

TripSchema.methods.calculateDrivingQuality = function () {
  // حساب نقاط جودة القيادة
  let smoothness = Math.max(0, 100 - this.events.filter(e => e.eventType === 'تسريع').length * 5);
  let safety = Math.max(0, 100 - this.violations.length * 10);
  let efficiency = Math.max(0, 100 - this.speedingIncidents.length * 3);

  this.drivingQuality = {
    smoothnessScore: smoothness,
    safetyScore: safety,
    efficiencyScore: efficiency,
    overallScore: Math.round((smoothness + safety + efficiency) / 3),
  };

  return this.save();
};

module.exports = mongoose.model('Trip', TripSchema);
