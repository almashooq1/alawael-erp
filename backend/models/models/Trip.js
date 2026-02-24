const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema(
  {
    // معلومات أساسية
    tripNumber: {
      type: String,
      required: true,
      unique: true,
    },

    // المسار والمركبة
    route: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TransportRoute',
      required: true,
    },
    vehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // توقيت الرحلة
    scheduledStartTime: {
      type: Date,
      required: true,
    },
    actualStartTime: Date,
    scheduledEndTime: Date,
    actualEndTime: Date,

    // حالة الرحلة
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled', 'delayed'],
      default: 'scheduled',
    },
    cancellationReason: String,

    // الركاب
    passengers: {
      capacity: {
        type: Number,
        default: 30,
      },
      current: {
        type: Number,
        default: 0,
      },
      list: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          pickupStop: Number,
          dropoffStop: Number,
          boardedAt: Date,
          alightedAt: Date,
          status: {
            type: String,
            enum: ['boarded', 'missed', 'cancelled'],
            default: 'boarded',
          },
        },
      ],
    },

    // تتبع المحطات
    stopProgress: [
      {
        stopNumber: Number,
        scheduledArrival: Date,
        actualArrival: Date,
        scheduledDeparture: Date,
        actualDeparture: Date,
        passengersBoarded: Number,
        passengersAlighted: Number,
        delay: Number, // دقائق
      },
    ],

    // تتبع GPS
    gpsTracking: [
      {
        timestamp: Date,
        location: {
          type: {
            type: String,
            default: 'Point',
          },
          coordinates: [Number],
        },
        speed: Number,
        heading: Number,
      },
    ],

    // سلوك السائق
    driverBehavior: {
      speedingIncidents: {
        type: Number,
        default: 0,
      },
      harshBrakingCount: {
        type: Number,
        default: 0,
      },
      harshAccelerationCount: {
        type: Number,
        default: 0,
      },
      idlingTime: {
        type: Number,
        default: 0,
      }, // دقائق
      maxSpeed: Number,
      averageSpeed: Number,
      score: {
        type: Number,
        min: 0,
        max: 100,
        default: 100,
      },
    },

    // استهلاك الوقود
    fuelData: {
      startLevel: Number,
      endLevel: Number,
      consumed: Number,
      cost: Number,
      efficiency: Number, // km/liter
    },

    // حوادث وتنبيهات
    incidents: [
      {
        timestamp: Date,
        type: {
          type: String,
          enum: ['accident', 'breakdown', 'delay', 'route_deviation', 'emergency', 'other'],
        },
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
        },
        location: {
          type: {
            type: String,
            default: 'Point',
          },
          coordinates: [Number],
        },
        description: String,
        resolved: {
          type: Boolean,
          default: false,
        },
        resolution: String,
      },
    ],

    // إحصائيات
    statistics: {
      totalDistance: Number,
      totalDuration: Number, // دقائق
      averageSpeed: Number,
      delayTime: Number, // دقائق
      passengersCount: Number,
      completionRate: Number, // نسبة مئوية
    },

    // ملاحظات
    notes: String,

    // تقييم الرحلة
    rating: {
      averageRating: Number,
      totalRatings: Number,
      feedback: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
          rating: {
            type: Number,
            min: 1,
            max: 5,
          },
          comment: String,
          date: Date,
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
tripSchema.index({ route: 1, scheduledStartTime: 1 });
tripSchema.index({ vehicle: 1, status: 1 });
tripSchema.index({ driver: 1, scheduledStartTime: 1 });
tripSchema.index({ status: 1, scheduledStartTime: 1 });

// Method لبدء الرحلة
tripSchema.methods.startTrip = function (location) {
  this.status = 'in_progress';
  this.actualStartTime = new Date();

  if (location) {
    this.gpsTracking.push({
      timestamp: new Date(),
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      },
      speed: 0,
      heading: 0,
    });
  }

  return this.save();
};

// Method لإنهاء الرحلة
tripSchema.methods.completeTrip = function (location) {
  this.status = 'completed';
  this.actualEndTime = new Date();

  // حساب الإحصائيات
  if (this.actualStartTime) {
    this.statistics.totalDuration = Math.round(
      (this.actualEndTime - this.actualStartTime) / (1000 * 60)
    );

    if (this.scheduledEndTime) {
      this.statistics.delayTime = Math.max(
        0,
        Math.round((this.actualEndTime - this.scheduledEndTime) / (1000 * 60))
      );
    }
  }

  this.statistics.passengersCount = this.passengers.length;

  // حساب نسبة الإكمال
  const completedStops = this.stopProgress.filter(s => s.actualDeparture).length;
  this.statistics.completionRate = (completedStops / this.stopProgress.length) * 100;

  if (location) {
    this.gpsTracking.push({
      timestamp: new Date(),
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
      },
      speed: 0,
      heading: 0,
    });
  }

  return this.save();
};

// Method لتحديث موقع GPS
tripSchema.methods.updateGPS = function (location) {
  this.gpsTracking.push({
    timestamp: new Date(),
    location: {
      type: 'Point',
      coordinates: [location.longitude, location.latitude],
    },
    speed: location.speed || 0,
    heading: location.heading || 0,
  });

  // تحديث سلوك السائق
  if (location.speed > 100) {
    // تجاوز السرعة
    this.driverBehavior.speedingIncidents += 1;
  }

  if (location.speed > (this.driverBehavior.maxSpeed || 0)) {
    this.driverBehavior.maxSpeed = location.speed;
  }

  // حساب متوسط السرعة
  const speeds = this.gpsTracking.map(t => t.speed || 0);
  this.driverBehavior.averageSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;

  return this.save();
};

// Method لتسجيل الوصول لمحطة
tripSchema.methods.arriveAtStop = function (stopNumber) {
  const stop = this.stopProgress.find(s => s.stopNumber === stopNumber);
  if (stop) {
    stop.actualArrival = new Date();

    if (stop.scheduledArrival) {
      stop.delay = Math.max(
        0,
        Math.round((stop.actualArrival - stop.scheduledArrival) / (1000 * 60))
      );
    }
  }

  return this.save();
};

// Method لتسجيل المغادرة من محطة
tripSchema.methods.departFromStop = function (stopNumber, boarded, alighted) {
  const stop = this.stopProgress.find(s => s.stopNumber === stopNumber);
  if (stop) {
    stop.actualDeparture = new Date();
    stop.passengersBoarded = boarded || 0;
    stop.passengersAlighted = alighted || 0;
  }

  return this.save();
};

// Method لإضافة حادث
tripSchema.methods.addIncident = function (incident) {
  this.incidents.push({
    timestamp: new Date(),
    type: incident.type,
    severity: incident.severity,
    location: incident.location,
    description: incident.description,
  });

  // تحديث حالة الرحلة للحوادث الحرجة
  if (incident.severity === 'critical') {
    this.status = 'delayed';
  }

  return this.save();
};

// Method لحساب درجة سلوك السائق
tripSchema.methods.calculateDriverScore = function () {
  let score = 100;

  // خصم نقاط لكل حادثة
  score -= this.driverBehavior.speedingIncidents * 10;
  score -= this.driverBehavior.harshBrakingCount * 5;
  score -= this.driverBehavior.harshAccelerationCount * 5;

  // خصم نقاط للتأخير
  if (this.statistics.delayTime > 15) {
    score -= Math.min(20, Math.floor(this.statistics.delayTime / 5));
  }

  // خصم نقاط للحوادث
  score -= this.incidents.length * 15;

  this.driverBehavior.score = Math.max(0, score);
  return this.save();
};

// Static method للحصول على الرحلات الجارية
tripSchema.statics.getActiveTrips = function () {
  return this.find({
    status: 'in_progress',
  })
    .populate('route vehicle driver')
    .sort({ scheduledStartTime: 1 });
};

// Static method للحصول على رحلات اليوم
tripSchema.statics.getTodayTrips = function () {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    scheduledStartTime: {
      $gte: startOfDay,
      $lte: endOfDay,
    },
  })
    .populate('route vehicle driver')
    .sort({ scheduledStartTime: 1 });
};

module.exports = mongoose.model('Trip', tripSchema);
