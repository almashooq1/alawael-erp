const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema(
  {
    // معلومات أساسية
    vehicleNumber: {
      type: String,
      required: true,
      unique: true
    },
    plateNumber: {
      type: String,
      required: true,
      unique: true,
    },
    type: {
      type: String,
      enum: ['bus', 'van', 'car', 'truck'],
      required: true,
    },
    brand: String,
    model: String,
    year: Number,
    color: String,
    capacity: {
      type: Number,
      required: true,
      min: 1,
    },

    // مستوى الوقود (للتوافق مع الاختبارات)
    fuelLevel: {
      type: Number,
      default: 100,
    },

    // حالة المركبة
    status: {
      type: String,
      enum: ['active', 'maintenance', 'inactive', 'emergency'],
      default: 'active',
    },

    // معلومات GPS والموقع
    gpsDevice: {
      deviceId: String,
      lastUpdate: Date,
      currentLocation: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: {
          type: [Number], // [longitude, latitude]
        },
        address: String,
        speed: Number, // km/h
        heading: Number, // اتجاه الحركة (0-360)
      },
    },

    // السائق الحالي
    currentDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // حقل مستعار للسائق (للتوافق مع الاختبارات)
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // المسار الحالي
    currentRoute: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportRoute',
    },

    // مسافة المركبة
    mileage: {
      type: Number,
      default: 0,
    },

    // استهلاك الوقود
    fuelConsumption: {
      fuelType: {
        type: String,
        enum: ['petrol', 'diesel', 'electric', 'hybrid'],
      },
      tankCapacity: Number, // لتر
      currentFuelLevel: Number, // لتر
      averageConsumption: Number, // لتر/100كم
      lastRefill: {
        date: Date,
        amount: Number,
        cost: Number,
        station: String,
      },
    },

    // صيانة المركبة
    maintenance: {
      lastMaintenanceDate: Date,
      nextMaintenanceDate: Date,
      nextMaintenanceKm: Number,
      currentOdometer: Number, // كم
    },

    // سجل الصيانة (للتوافق مع الاختبارات)
    maintenanceHistory: {
      type: [{
        date: { type: Date, default: Date.now },
        type: { type: String },
        description: String,
        cost: Number,
        workshop: String,
      }],
      default: [],
    },

    // تأمين المركبة
    insurance: {
      company: String,
      policyNumber: String,
      startDate: Date,
      expiryDate: Date,
      coverageAmount: Number,
      annualCost: Number,
    },

    // مراقبة السلامة
    safety: {
      lastInspectionDate: Date,
      nextInspectionDate: Date,
      emergencyAlerts: [
        {
          timestamp: Date,
          type: {
            type: String,
            enum: ['accident', 'breakdown', 'speeding', 'harsh_braking', 'deviation'],
          },
          location: {
            type: {
              type: String,
              default: 'Point',
            },
            coordinates: [Number],
          },
          severity: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
          },
          resolved: {
            type: Boolean,
            default: false,
          },
          resolvedAt: Date,
        },
      ],
      speedingIncidents: {
        type: Number,
        default: 0,
      },
      harshBrakingIncidents: {
        type: Number,
        default: 0,
      },
    },

    // الركاب المعينين
    assignedPassengers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // إحصائيات
    statistics: {
      totalDistanceCovered: {
        type: Number,
        default: 0,
      }, // كم
      totalFuelConsumed: {
        type: Number,
        default: 0,
      }, // لتر
      totalMaintenanceCost: {
        type: Number,
        default: 0,
      }, // ريال
      averageSpeed: Number, // km/h
      tripCount: {
        type: Number,
        default: 0,
      },
    },

    // معلومات إضافية
    notes: String,
    documents: [
      {
        name: String,
        type: String,
        url: String,
        uploadDate: Date,
      },
    ],

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes للبحث والأداء
vehicleSchema.index({ status: 1, isActive: 1 });
vehicleSchema.index({ currentDriver: 1 });
vehicleSchema.index({ 'gpsDevice.currentLocation.coordinates': '2dsphere' });

// Virtual للحصول على حالة الوقود
vehicleSchema.virtual('fuelStatus').get(function () {
  if (!this.fuelConsumption.currentFuelLevel || !this.fuelConsumption.tankCapacity) {
    return 'unknown';
  }
  const percentage =
    (this.fuelConsumption.currentFuelLevel / this.fuelConsumption.tankCapacity) * 100;
  if (percentage < 20) return 'critical';
  if (percentage < 40) return 'low';
  if (percentage < 70) return 'medium';
  return 'good';
});

// Virtual للحصول على حالة الصيانة
vehicleSchema.virtual('maintenanceStatus').get(function () {
  if (!this.maintenance.nextMaintenanceDate) return 'unknown';
  const daysUntilMaintenance = Math.ceil(
    (this.maintenance.nextMaintenanceDate - new Date()) / (1000 * 60 * 60 * 24)
  );
  if (daysUntilMaintenance < 0) return 'overdue';
  if (daysUntilMaintenance <= 7) return 'urgent';
  if (daysUntilMaintenance <= 30) return 'soon';
  return 'good';
});

// Method لتحديث موقع GPS
vehicleSchema.methods.updateGPSLocation = function (location, speed, heading) {
  this.gpsDevice.currentLocation = {
    type: 'Point',
    coordinates: location.coordinates || [location.longitude, location.latitude],
  };
  if (speed !== undefined) this.currentSpeed = speed;
  if (heading !== undefined) this.gpsDevice.heading = heading;
  this.gpsDevice.lastUpdate = new Date();
  return this.save();
};

// Method لإضافة تنبيه طوارئ
vehicleSchema.methods.addEmergencyAlert = function (alert) {
  this.safety.emergencyAlerts.push({
    timestamp: new Date(),
    type: alert.type,
    location: alert.location,
    severity: alert.severity,
  });

  // تحديث حالة المركبة للطوارئ الحرجة
  if (alert.severity === 'critical') {
    this.status = 'emergency';
  }

  return this.save();
};

// Method لتحديث استهلاك الوقود
vehicleSchema.methods.updateFuelConsumption = function (distance) {
  if (this.fuelConsumption.averageConsumption) {
    const consumed = (distance / 100) * this.fuelConsumption.averageConsumption;
    this.fuelConsumption.currentFuelLevel -= consumed;
    this.statistics.totalFuelConsumed += consumed;
    this.statistics.totalDistanceCovered += distance;
  }
  return this.save();
};

// Static method للبحث عن مركبات قريبة
vehicleSchema.statics.findNearby = function (longitude, latitude, maxDistance = 5000) {
  return this.find({
    'gpsDevice.currentLocation.coordinates': {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: maxDistance,
      },
    },
    status: 'active',
    isActive: true,
  });
};

// Static method للحصول على المركبات المتاحة
vehicleSchema.statics.findAvailable = function (capacity) {
  return this.find({
    status: 'active',
    isActive: true,
    capacity: { $gte: capacity },
    currentDriver: { $exists: true },
  });
};

module.exports = mongoose.model('Vehicle', vehicleSchema);
