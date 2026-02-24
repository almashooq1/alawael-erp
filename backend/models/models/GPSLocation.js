/**
 * Driver GPS Location Tracking Model
 * نموذج تتبع موقع السائق في الوقت الفعلي
 * Phase 30 - GPS Tracking System
 */

const mongoose = require('mongoose');

const GPSLocationSchema = new mongoose.Schema(
  {
    // ===== معلومات السائق والمركبة =====
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      sparse: true, // قد لا تكون هناك رحلة نشطة
    },

    // ===== إحداثيات الموقع =====
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
        // الفهرس الجغرافي لعمليات البحث بالقرب من الموقع
        validate: {
          validator: function (arr) {
            return arr.length === 2 && arr[0] >= -180 && arr[0] <= 180 && arr[1] >= -90 && arr[1] <= 90;
          },
          message: 'إحداثيات غير صحيحة',
        },
      },
    },

    // ===== معلومات السرعة والاتجاه =====
    speed: {
      type: Number, // بالكيلومتر في الساعة
      default: 0,
      min: 0,
      max: 300,
    },
    speedLimitViolation: {
      type: Boolean,
      default: false,
    },
    maxSpeedAllowed: {
      type: Number,
      default: 120,
    },
    heading: {
      type: Number, // الاتجاه بالدرجات (0-360)
      min: 0,
      max: 360,
    },
    altitude: Number, // الارتفاع بالأمتار

    // ===== جودة الإشارة =====
    accuracy: {
      type: Number, // دقة الـ GPS بالأمتار
      default: 0,
    },
    satellites: {
      type: Number, // عدد الأقمار الصناعية المرئية
      min: 0,
      max: 50,
    },

    // ===== حالة المحرك =====
    engineRunning: {
      type: Boolean,
      default: false,
    },
    seatbeltStatus: {
      type: String,
      enum: ['fastened', 'unfastened', 'unknown'],
      default: 'unknown',
    },
    doorsLocked: Boolean,

    // ===== البيانات الحسية المتقدمة =====
    acceleration: {
      x: Number, // التسارع الجانبي
      y: Number, // التسارع الأمامي/الخلفي
      z: Number, // التسارع العمودي
    },
    harshAcceleration: Boolean,
    harshBraking: Boolean,
    sharpTurn: Boolean,
    idleTime: Number, // وقت التوقف بالثواني

    // ===== حالة الرحلة =====
    drivingStatus: {
      type: String,
      enum: ['stopped', 'idling', 'driving', 'parked'],
      default: 'stopped',
    },
    distanceDriven: {
      type: Number,
      default: 0, // بالكيلومتر
    },
    fuelConsumption: Number, // لترات في الساعة

    // ===== التنبيهات والتحذيرات =====
    alerts: [
      {
        type: {
          type: String,
          enum: [
            'speeding',
            'harsh_acceleration',
            'harsh_braking',
            'sharp_turn',
            'seatbelt_unbuckled',
            'drowsy_driving',
            'distracted_driving',
            'off_route',
            'geofence_breach',
            'battery_low',
          ],
        },
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
          default: 'medium',
        },
        message: String,
        createdAt: {
          type: Date,
          default: Date.now,
        },
        acknowledged: {
          type: Boolean,
          default: false,
        },
        acknowledgedAt: Date,
        acknowledgedBy: String,
      },
    ],

    // ===== الجيوفنس (الحدود الجغرافية) =====
    geofences: [
      {
        fenceId: mongoose.Schema.Types.ObjectId,
        status: {
          type: String,
          enum: ['inside', 'outside', 'boundary'],
        },
        entryTime: Date,
        exitTime: Date,
      },
    ],

    // ===== البيانات التاريخية =====
    previousLocations: [
      {
        coordinates: [Number],
        timestamp: Date,
        speed: Number,
      },
    ], // آخر 10 مواقع

    // ===== معالجة البيانات =====
    processed: {
      type: Boolean,
      default: false,
    },
    processingNotes: String,

    // ===== البيانات الوصفية =====
    source: {
      type: String,
      enum: ['gps', 'cellular', 'wifi', 'hybrid'],
      default: 'gps',
    },
    deviceModel: String,
    osVersion: String,
    appVersion: String,

    // الوقت
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    },
  }
);

// ===== INDEXES =====

// فهرس جغرافي لعمليات البحث المكانية
GPSLocationSchema.index({ 'location.coordinates': '2dsphere' });

// فهرس مركب للسائق والوقت
GPSLocationSchema.index({ driver: 1, timestamp: -1 });

// فهرس للرحلة
GPSLocationSchema.index({ trip: 1, timestamp: -1 });

// فهرس لجودة الإشارة
GPSLocationSchema.index({ accuracy: 1 });

// ===== VIRTUAL FIELDS =====

/**
 * حساب الموقع بصيغة عددية لسهولة الاستخدام
 */
GPSLocationSchema.virtual('lat').get(function () {
  return this.location?.coordinates?.[1];
});

GPSLocationSchema.virtual('lon').get(function () {
  return this.location?.coordinates?.[0];
});

/**
 * هل الموقع حديث (أقل من دقيقة)
 */
GPSLocationSchema.virtual('isRecent').get(function () {
  const now = Date.now();
  const locTime = this.timestamp?.getTime() || 0;
  return now - locTime < 60000;
});

/**
 * هل هناك انتهاك السرعة
 */
GPSLocationSchema.virtual('isSpeedingViolation').get(function () {
  return this.speed > this.maxSpeedAllowed;
});

// ===== METHODS =====

/**
 * التحقق من وجود تنبيهات نشطة
 */
GPSLocationSchema.methods.hasActiveAlerts = function () {
  return this.alerts.some((alert) => !alert.acknowledged);
};

/**
 * الحصول على التنبيهات النشطة
 */
GPSLocationSchema.methods.getActiveAlerts = function () {
  return this.alerts.filter((alert) => !alert.acknowledged);
};

/**
 * تأكيد تنبيه
 */
GPSLocationSchema.methods.acknowledgeAlert = async function (alertIndex, acknowledgedBy) {
  if (this.alerts[alertIndex]) {
    this.alerts[alertIndex].acknowledged = true;
    this.alerts[alertIndex].acknowledgedAt = new Date();
    this.alerts[alertIndex].acknowledgedBy = acknowledgedBy;
    await this.save();
  }
};

/**
 * حساب المسافة من موقع آخر (بالكيلومتر)
 */
GPSLocationSchema.methods.getDistanceTo = function (otherLocation) {
  const [lon1, lat1] = this.location.coordinates;
  const [lon2, lat2] = otherLocation.location.coordinates;

  // صيغة Haversine
  const R = 6371; // نصف قطر الأرض بالكيلومتر
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * إضافة موقع سابق (للتتبع التاريخي)
 */
GPSLocationSchema.methods.addPreviousLocation = function () {
  this.previousLocations.unshift({
    coordinates: this.location.coordinates,
    timestamp: this.timestamp,
    speed: this.speed,
  });

  // الاحتفاظ بآخر 10 مواقع فقط
  if (this.previousLocations.length > 10) {
    this.previousLocations.pop();
  }
};

/**
 * حساب الزمن المقضي في الرحلة
 */
GPSLocationSchema.methods.calculateTripDuration = async function () {
  if (!this.trip) return null;

  const Trip = mongoose.model('Trip');
  const tripData = await Trip.findById(this.trip).select('startTime endTime');

  if (tripData && tripData.startTime && tripData.endTime) {
    return (tripData.endTime - tripData.startTime) / (1000 * 60); // بالدقائق
  }

  return null;
};

// ===== STATICS =====

/**
 * الحصول على الموقع الأخير للسائق
 */
GPSLocationSchema.statics.getLatestLocation = async function (driverId) {
  return this.findOne({ driver: driverId }).sort({ timestamp: -1 });
};

/**
 * الحصول على جميع المواقع في نطاق زمني
 */
GPSLocationSchema.statics.getLocationsInTimeRange = async function (driverId, startTime, endTime) {
  return this.find({
    driver: driverId,
    timestamp: {
      $gte: new Date(startTime),
      $lte: new Date(endTime),
    },
  }).sort({ timestamp: -1 });
};

/**
 * البحث عن سائقين بالقرب من موقع معين
 */
GPSLocationSchema.statics.findNearby = async function (longitude, latitude, maxDistance = 1000) {
  return this.find({
    'location.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance, // بالأمتار
      },
    },
  });
};

/**
 * حساب عدد انتهاكات السرعة في فترة
 */
GPSLocationSchema.statics.getSpeedingViolations = async function (driverId, startTime, endTime) {
  return this.countDocuments({
    driver: driverId,
    speedLimitViolation: true,
    timestamp: {
      $gte: new Date(startTime),
      $lte: new Date(endTime),
    },
  });
};

/**
 * الحصول على متوسط السرعة
 */
GPSLocationSchema.statics.getAverageSpeed = async function (driverId, startTime, endTime) {
  const result = await this.aggregate([
    {
      $match: {
        driver: mongoose.Types.ObjectId.createFromHexString(driverId),
        timestamp: {
          $gte: new Date(startTime),
          $lte: new Date(endTime),
        },
      },
    },
    {
      $group: {
        _id: '$driver',
        averageSpeed: { $avg: '$speed' },
        maxSpeed: { $max: '$speed' },
        minSpeed: { $min: '$speed' },
      },
    },
  ]);

  return result[0] || null;
};

// ===== HOOKS =====

// تحديث حالة الرحلة تلقائياً بناءً على السرعة
GPSLocationSchema.pre('save', function (next) {
  if (this.speed === 0) {
    this.drivingStatus = 'stopped';
  } else if (this.speed < 5) {
    this.drivingStatus = 'idling';
  } else {
    this.drivingStatus = 'driving';
  }

  // التحقق من انتهاك السرعة
  if (this.speed > this.maxSpeedAllowed) {
    this.speedLimitViolation = true;
  }

  next();
});

module.exports = mongoose.model('GPSLocation', GPSLocationSchema);
