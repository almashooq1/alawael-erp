const mongoose = require('mongoose');

const transportRouteSchema = new mongoose.Schema(
  {
    // معلومات أساسية
    routeName: {
      type: String,
      required: true,
      unique: true,
    },
    routeCode: {
      type: String,
      required: true,
      unique: true,
    },

    // نوع المسار
    type: {
      type: String,
      enum: ['morning', 'afternoon', 'special', 'emergency'],
      required: true,
    },

    // حالة المسار
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'maintenance'],
      default: 'active',
    },

    // نقاط التوقف (محطات)
    stops: [
      {
        stopNumber: {
          type: Number,
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        location: {
          type: {
            type: String,
            enum: ['Point'],
            default: 'Point',
          },
          coordinates: {
            type: [Number], // [longitude, latitude]
            required: true,
          },
          address: String,
        },
        scheduledTime: String, // HH:mm
        estimatedDuration: Number, // دقائق من المحطة السابقة
        waitTime: {
          type: Number,
          default: 2,
        }, // دقائق
        passengers: [
          {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
          },
        ],
        notes: String,
      },
    ],

    // المسار الكامل (خط السير)
    path: {
      type: {
        type: String,
        enum: ['LineString'],
        default: 'LineString',
      },
      coordinates: [[Number]], // مصفوفة من [longitude, latitude]
    },

    // معلومات المسافة والوقت
    totalDistance: Number, // كم
    estimatedDuration: Number, // دقائق
    averageSpeed: {
      type: Number,
      default: 40,
    }, // km/h

    // المركبة المخصصة
    assignedVehicle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Vehicle',
    },

    // السائق المخصص
    assignedDriver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // جدول التشغيل
    schedule: {
      startDate: Date,
      endDate: Date,
      operatingDays: [
        {
          type: String,
          enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        },
      ],
      startTime: String, // HH:mm
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'special'],
        default: 'daily',
      },
    },

    // تحسين المسار
    optimization: {
      lastOptimized: Date,
      optimizationScore: Number, // 0-100
      suggestedChanges: [
        {
          type: String,
          description: String,
          estimatedImprovement: Number, // نسبة مئوية
          status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'implemented'],
            default: 'pending',
          },
        },
      ],
      factors: {
        trafficConditions: Boolean,
        passengerDemand: Boolean,
        fuelEfficiency: Boolean,
        timeEfficiency: Boolean,
      },
    },

    // الركاب المسجلين
    passengers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        pickupStop: Number, // رقم المحطة
        dropoffStop: Number,
        preferences: {
          specialNeeds: String,
          seatPreference: String,
        },
      },
    ],

    // السعة
    capacity: {
      total: Number,
      current: Number,
      available: Number,
    },

    // إحصائيات الرحلات
    tripStatistics: {
      totalTrips: {
        type: Number,
        default: 0,
      },
      completedTrips: {
        type: Number,
        default: 0,
      },
      cancelledTrips: {
        type: Number,
        default: 0,
      },
      averageDelayMinutes: {
        type: Number,
        default: 0,
      },
      onTimePercentage: {
        type: Number,
        default: 100,
      },
      totalPassengersServed: {
        type: Number,
        default: 0,
      },
    },

    // تقييمات الركاب
    ratings: {
      averageRating: {
        type: Number,
        default: 5,
        min: 0,
        max: 5,
      },
      totalRatings: {
        type: Number,
        default: 0,
      },
      reviews: [
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

    // تنبيهات ومشاكل
    alerts: [
      {
        type: {
          type: String,
          enum: ['delay', 'deviation', 'accident', 'weather', 'maintenance', 'other'],
        },
        severity: {
          type: String,
          enum: ['low', 'medium', 'high', 'critical'],
        },
        message: String,
        timestamp: Date,
        resolved: {
          type: Boolean,
          default: false,
        },
        resolvedAt: Date,
      },
    ],

    // معلومات إضافية
    notes: String,
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
transportRouteSchema.index({ status: 1, isActive: 1 });
transportRouteSchema.index({ assignedVehicle: 1 });
transportRouteSchema.index({ assignedDriver: 1 });
transportRouteSchema.index({ 'stops.location.coordinates': '2dsphere' });

// Virtual للحصول على عدد المحطات
transportRouteSchema.virtual('stopCount').get(function () {
  return this.stops ? this.stops.length : 0;
});

// Virtual للحصول على عدد الركاب
transportRouteSchema.virtual('passengerCount').get(function () {
  return this.passengers ? this.passengers.length : 0;
});

// Method لحساب السعة المتاحة
transportRouteSchema.methods.calculateAvailableCapacity = function () {
  if (this.capacity.total) {
    this.capacity.current = this.passengers.length;
    this.capacity.available = this.capacity.total - this.capacity.current;
  }
  return this.capacity;
};

// Method لإضافة راكب
transportRouteSchema.methods.addPassenger = function (
  userId,
  pickupStop,
  dropoffStop,
  preferences
) {
  if (this.capacity.available <= 0) {
    throw new Error('No available capacity');
  }

  this.passengers.push({
    user: userId,
    pickupStop,
    dropoffStop,
    preferences,
  });

  // إضافة الراكب للمحطة
  const pickup = this.stops.find(s => s.stopNumber === pickupStop);
  if (pickup && !pickup.passengers.includes(userId)) {
    pickup.passengers.push(userId);
  }

  this.calculateAvailableCapacity();
  return this.save();
};

// Method لإزالة راكب
transportRouteSchema.methods.removePassenger = function (userId) {
  this.passengers = this.passengers.filter(p => !p.user.equals(userId));

  // إزالة الراكب من جميع المحطات
  this.stops.forEach(stop => {
    stop.passengers = stop.passengers.filter(p => !p.equals(userId));
  });

  this.calculateAvailableCapacity();
  return this.save();
};

// Method لتحديث حالة الرحلة
transportRouteSchema.methods.updateTripStatus = function (status, delayMinutes = 0) {
  this.tripStatistics.totalTrips += 1;

  if (status === 'completed') {
    this.tripStatistics.completedTrips += 1;

    // حساب نسبة الالتزام بالمواعيد
    if (delayMinutes <= 5) {
      const onTimeTrips =
        this.tripStatistics.completedTrips -
        Math.floor(
          this.tripStatistics.completedTrips * (1 - this.tripStatistics.onTimePercentage / 100)
        );
      this.tripStatistics.onTimePercentage =
        (onTimeTrips / this.tripStatistics.completedTrips) * 100;
    }

    // تحديث متوسط التأخير
    const totalDelay =
      this.tripStatistics.averageDelayMinutes * (this.tripStatistics.completedTrips - 1) +
      delayMinutes;
    this.tripStatistics.averageDelayMinutes = totalDelay / this.tripStatistics.completedTrips;
  } else if (status === 'cancelled') {
    this.tripStatistics.cancelledTrips += 1;
  }

  return this.save();
};

// Virtual للحصول على name من routeName
transportRouteSchema.virtual('name').get(function () {
  return this.routeName;
});

// جعل Virtuals تُدرج في toJSON
transportRouteSchema.set('toJSON', { virtuals: true });

// Method لإضافة تقييم
transportRouteSchema.methods.addRating = function (userId, rating, comment) {
  this.ratings.reviews.push({
    user: userId,
    rating,
    comment,
    date: new Date(),
  });

  this.ratings.totalRatings += 1;

  // حساب متوسط التقييم
  const totalRating = this.ratings.reviews.reduce((sum, r) => sum + r.rating, 0);
  this.ratings.averageRating = totalRating / this.ratings.totalRatings;

  return this.save();
};

// Static method للبحث عن مسارات قريبة من موقع
transportRouteSchema.statics.findNearbyRoutes = function (longitude, latitude, maxDistance = 1000) {
  return this.find({
    'stops.location.coordinates': {
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

// Static method للحصول على المسارات المتاحة
transportRouteSchema.statics.findAvailable = function (date, type) {
  const dayOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][
    date.getDay()
  ];

  return this.find({
    status: 'active',
    isActive: true,
    type: type || { $exists: true },
    'schedule.operatingDays': dayOfWeek,
    'capacity.available': { $gt: 0 },
  });
};

module.exports = mongoose.model('TransportRoute', transportRouteSchema);
