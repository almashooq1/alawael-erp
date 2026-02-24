/**
 * Trip Controller - إدارة الرحلات
 */

const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const GPSTrackingService = require('../services/gpsTracking.service');

class TripController {
  /**
   * إنشاء رحلة جديدة
   * POST /api/trips
   */
  static async createTrip(req, res) {
    try {
      // Check if vehicle is already assigned to an in-progress trip
      const activeTrip = await Trip.findOne({
        vehicle: req.body.vehicle,
        status: 'in_progress',
      });

      if (activeTrip) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle already assigned to an active trip',
        });
      }

      // Check if passengers exceed vehicle capacity
      if (req.body.passengers) {
        const vehicle = await Vehicle.findById(req.body.vehicle);
        
        if (vehicle && req.body.passengers > vehicle.capacity) {
          return res.status(400).json({
            success: false,
            message: `Passengers count (${req.body.passengers}) exceeds vehicle capacity (${vehicle.capacity})`,
          });
        }
      }

      const trip = new Trip(req.body);
      await trip.save();

      res.status(201).json({
        success: true,
        message: 'تم إنشاء الرحلة بنجاح',
        data: trip,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل إنشاء الرحلة',
        error: error.message,
      });
    }
  }

  /**
   * جلب جميع الرحلات
   * GET /api/trips
   */
  static async getAllTrips(req, res) {
    try {
      const { status, date, page = 1, limit = 20 } = req.query;
      const query = {};

      if (status) query.status = status;
      if (date) {
        const startDate = new Date(date);
        const endDate = new Date(date);
        endDate.setDate(endDate.getDate() + 1);
        query.scheduledStartTime = { $gte: startDate, $lt: endDate };
      }

      const trips = await Trip.find(query)
        .populate('route', 'routeName routeCode')
        .populate('vehicle', 'vehicleNumber plateNumber')
        .populate('driver', 'name email phone')
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ scheduledStartTime: -1 });

      const count = await Trip.countDocuments(query);
      const totalPages = Math.ceil(count / limit);

      res.json({
        success: true,
        data: {
          trips,
          total: count,
          currentPage: parseInt(page),
          totalPages: totalPages,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب الرحلات',
        error: error.message,
      });
    }
  }

  /**
   * جلب رحلة بواسطة ID
   * GET /api/trips/:id
   */
  static async getTripById(req, res) {
    try {
      const trip = await Trip.findById(req.params.id)
        .populate('route', 'routeName routeCode')
        .populate('vehicle', 'vehicleNumber plateNumber')
        .populate('driver', 'name email phone')
        .populate('passengers.list.user', 'name email phone');

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'الرحلة غير موجودة',
        });
      }

      res.json({
        success: true,
        data: trip,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب الرحلة',
        error: error.message,
      });
    }
  }

  /**
   * بدء رحلة
   * POST /api/trips/:id/start
   */
  static async startTrip(req, res) {
    try {
      const trip = await Trip.findById(req.params.id).populate('vehicle').populate('route');

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'الرحلة غير موجودة',
        });
      }

      if (trip.status !== 'scheduled') {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن بدء الرحلة - الحالة غير صحيحة',
        });
      }

      trip.status = 'in_progress';
      trip.actualStartTime = new Date();
      await trip.save();

      res.json({
        success: true,
        message: 'تم بدء الرحلة بنجاح',
        data: trip,
      });
    } catch (error) {
      console.error('Error starting trip:', error);
      res.status(400).json({
        success: false,
        message: 'فشل بدء الرحلة',
        error: error.message,
      });
    }
  }

  /**
   * إنهاء رحلة
   * POST /api/trips/:id/complete
   */
  static async completeTrip(req, res) {
    try {
      const trip = await Trip.findById(req.params.id);

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'الرحلة غير موجودة',
        });
      }

      if (trip.status !== 'in_progress') {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن إنهاء الرحلة - الرحلة غير جارية',
        });
      }

      trip.status = 'completed';
      trip.actualEndTime = new Date();
      await trip.save();

      res.json({
        success: true,
        message: 'تم إنهاء الرحلة بنجاح',
        data: trip,
      });
    } catch (error) {
      console.error('Error completing trip:', error);
      res.status(400).json({
        success: false,
        message: 'فشل إنهاء الرحلة',
        error: error.message,
      });
    }
  }

  /**
   * تحديث موقع GPS للرحلة
   * POST /api/trips/:id/gps
   */
  static async updateGPS(req, res) {
    try {
      const { longitude, latitude, speed, heading } = req.body;

      const trip = await Trip.findById(req.params.id);

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'الرحلة غير موجودة',
        });
      }

      const location = {
        type: 'Point',
        coordinates: [longitude, latitude],
        speed,
        heading,
      };

      await trip.updateGPS(location);

      res.json({
        success: true,
        message: 'تم تحديث الموقع بنجاح',
        data: {
          currentLocation: location,
          driverBehavior: trip.driverBehavior,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل تحديث الموقع',
        error: error.message,
      });
    }
  }

  /**
   * الوصول إلى محطة
   * POST /api/trips/:id/arrive-stop
   */
  static async arriveAtStop(req, res) {
    try {
      const { stopNumber } = req.body;

      const trip = await Trip.findById(req.params.id);

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'الرحلة غير موجودة',
        });
      }

      await trip.arriveAtStop(stopNumber);

      res.json({
        success: true,
        message: 'تم تسجيل الوصول للمحطة بنجاح',
        data: {
          stopProgress: trip.stopProgress[stopNumber - 1],
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل تسجيل الوصول للمحطة',
        error: error.message,
      });
    }
  }

  /**
   * المغادرة من محطة
   * POST /api/trips/:id/depart-stop
   */
  static async departFromStop(req, res) {
    try {
      const { stopNumber, passengersBoarded, passengersAlighted } = req.body;

      const trip = await Trip.findById(req.params.id);

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'الرحلة غير موجودة',
        });
      }

      await trip.departFromStop(stopNumber, passengersBoarded, passengersAlighted);

      res.json({
        success: true,
        message: 'تم تسجيل المغادرة من المحطة بنجاح',
        data: {
          stopProgress: trip.stopProgress[stopNumber - 1],
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل تسجيل المغادرة من المحطة',
        error: error.message,
      });
    }
  }

  /**
   * إضافة حادث
   * POST /api/trips/:id/incident
   */
  static async addIncident(req, res) {
    try {
      const { type, severity, description, location } = req.body;

      const trip = await Trip.findById(req.params.id);

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'الرحلة غير موجودة',
        });
      }

      await trip.addIncident({
        type,
        severity,
        description,
        location: {
          type: 'Point',
          coordinates: location.coordinates,
        },
      });

      res.status(201).json({
        success: true,
        message: 'تم إضافة الحادث بنجاح',
        data: {
          incident: trip.incidents[trip.incidents.length - 1],
          status: trip.status,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل إضافة الحادث',
        error: error.message,
      });
    }
  }

  /**
   * جلب الرحلات النشطة
   * GET /api/trips/active
   */
  static async getActiveTrips(req, res) {
    try {
      const trips = await Trip.getActiveTrips();

      res.json({
        success: true,
        data: trips,
        count: trips.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب الرحلات النشطة',
        error: error.message,
      });
    }
  }

  /**
   * جلب رحلات اليوم
   * GET /api/trips/today
   */
  static async getTodayTrips(req, res) {
    try {
      const trips = await Trip.getTodayTrips();

      res.json({
        success: true,
        data: trips,
        count: trips.length,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب رحلات اليوم',
        error: error.message,
      });
    }
  }

  /**
   * حساب تقييم سلوك السائق
   * GET /api/trips/:id/driver-score
   */
  static async calculateDriverScore(req, res) {
    try {
      const trip = await Trip.findById(req.params.id);

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'الرحلة غير موجودة',
        });
      }

      await trip.calculateDriverScore();

      res.json({
        success: true,
        data: {
          score: trip.driverBehavior.score,
          behavior: trip.driverBehavior,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل حساب تقييم السائق',
        error: error.message,
      });
    }
  }

  /**
   * تحليل سلوك السائق
   * GET /api/trips/:id/behavior-analysis
   */
  static async analyzeBehavior(req, res) {
    try {
      const trip = await Trip.findById(req.params.id);

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'الرحلة غير موجودة',
        });
      }

      const analysis = GPSTrackingService.analyzeDrivingBehavior(trip, trip.gpsTracking);

      res.json({
        success: true,
        data: analysis,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل تحليل سلوك السائق',
        error: error.message,
      });
    }
  }

  /**
   * إضافة تقييم للرحلة
   * POST /api/trips/:id/feedback
   */
  static async addFeedback(req, res) {
    try {
      const { userId, rating, comment } = req.body;

      const trip = await Trip.findById(req.params.id);

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'الرحلة غير موجودة',
        });
      }

      trip.feedback.push({
        user: userId,
        rating,
        comment,
        date: new Date(),
      });

      // تحديث متوسط التقييم
      const totalRatings = trip.feedback.length;
      const sumRatings = trip.feedback.reduce((sum, f) => sum + f.rating, 0);
      trip.averageRating = sumRatings / totalRatings;
      trip.totalRatings = totalRatings;

      await trip.save();

      res.status(201).json({
        success: true,
        message: 'تم إضافة التقييم بنجاح',
        data: {
          averageRating: trip.averageRating,
          totalRatings: trip.totalRatings,
        },
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل إضافة التقييم',
        error: error.message,
      });
    }
  }

  /**
   * إحصائيات الرحلة
   * GET /api/trips/:id/statistics
   */
  static async getTripStatistics(req, res) {
    try {
      const trip = await Trip.findById(req.params.id)
        .populate('route', 'routeName')
        .populate('vehicle', 'vehicleNumber')
        .populate('driver', 'name');

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'الرحلة غير موجودة',
        });
      }

      const stats = {
        basic: {
          tripNumber: trip.tripNumber,
          status: trip.status,
          route: trip.route?.routeName,
          vehicle: trip.vehicle?.vehicleNumber,
          driver: trip.driver?.name,
        },
        timing: {
          scheduledStart: trip.scheduledStartTime,
          actualStart: trip.actualStartTime,
          scheduledEnd: trip.scheduledEndTime,
          actualEnd: trip.actualEndTime,
          totalDuration: trip.statistics.totalDuration,
          delayTime: trip.statistics.delayTime,
        },
        distance: {
          total: trip.statistics.totalDistance,
          averageSpeed: trip.statistics.averageSpeed,
        },
        passengers: {
          scheduled: trip.passengers.length,
          boarded: trip.passengers.filter(p => p.status === 'boarded').length,
          missed: trip.passengers.filter(p => p.status === 'missed').length,
          completionRate: trip.statistics.completionRate,
        },
        driverBehavior: {
          score: trip.driverBehavior.score,
          speeding: trip.driverBehavior.speedingIncidents,
          harshBraking: trip.driverBehavior.harshBrakingCount,
          harshAcceleration: trip.driverBehavior.harshAccelerationCount,
          maxSpeed: trip.driverBehavior.maxSpeed,
          idlingTime: trip.driverBehavior.idlingTime,
        },
        fuel: {
          consumed: trip.fuelData.consumed,
          cost: trip.fuelData.cost,
          efficiency: trip.fuelData.efficiency,
        },
        incidents: trip.incidents.length,
        rating: {
          average: trip.averageRating,
          total: trip.totalRatings,
        },
      };

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب إحصائيات الرحلة',
        error: error.message,
      });
    }
  }

  /**
   * إنشاء تقرير سلوك السائق
   * POST /api/trips/driver-report
   */
  static async generateDriverReport(req, res) {
    try {
      const { driverId, startDate, endDate } = req.body;

      const User = require('../models/User');
      const driver = await User.findById(driverId);

      if (!driver) {
        return res.status(404).json({
          success: false,
          message: 'السائق غير موجود',
        });
      }

      const report = await GPSTrackingService.generateDriverReport(
        driver,
        new Date(startDate),
        new Date(endDate)
      );

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل إنشاء تقرير السائق',
        error: error.message,
      });
    }
  }

  /**
   * تحديث رحلة
   * PUT /api/trips/:id
   */
  static async updateTrip(req, res) {
    try {
      const { id } = req.params;
      const trip = await Trip.findById(id);

      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'الرحلة غير موجودة',
        });
      }

      // Check if trip is completed
      if (trip.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Cannot update completed trip',
        });
      }

      // Update the trip
      Object.assign(trip, req.body);
      await trip.save();

      res.json({
        success: true,
        message: 'تم تحديث الرحلة بنجاح',
        data: trip,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل تحديث الرحلة',
        error: error.message,
      });
    }
  }

  /**
   * حذف رحلة
   * DELETE /api/trips/:id
   */
  static async deleteTrip(req, res) {
    try {
      const { id } = req.params;
      
      // يمكن حذف الرحلات المجدولة فقط
      const trip = await Trip.findById(id);
      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'الرحلة غير موجودة',
        });
      }

      if (trip.status !== 'scheduled') {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete trip - only scheduled trips can be deleted',
        });
      }

      await Trip.findByIdAndDelete(id);

      res.json({
        success: true,
        message: 'تم حذف الرحلة بنجاح',
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل حذف الرحلة',
        error: error.message,
      });
    }
  }

  /**
   * إلغاء رحلة
   * POST /api/trips/:id/cancel
   */
  static async cancelTrip(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const trip = await Trip.findById(id);
      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'الرحلة غير موجودة',
        });
      }

      if (trip.status === 'completed') {
        return res.status(400).json({
          success: false,
          message: 'لا يمكن إلغاء رحلة مكتملة',
        });
      }

      trip.status = 'cancelled';
      trip.cancellationReason = reason;
      await trip.save();

      res.json({
        success: true,
        message: 'تم إلغاء الرحلة بنجاح',
        data: trip,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل إلغاء الرحلة',
        error: error.message,
      });
    }
  }

  /**
   * تحديث عدد الركاب
   * PATCH /api/trips/:id/passengers
   */
  static async updatePassengers(req, res) {
    try {
      const { id } = req.params;
      const { current } = req.body;

      const trip = await Trip.findById(id);
      if (!trip) {
        return res.status(404).json({
          success: false,
          message: 'الرحلة غير موجودة',
        });
      }

      // التحقق من السعة
      const capacity = trip.passengers?.capacity || 30;
      if (current > capacity) {
        return res.status(400).json({
          success: false,
          message: 'عدد الركاب يتجاوز سعة المركبة',
        });
      }

      // تحديث عدد الركاب الفعليين
      if (!trip.passengers) {
        trip.passengers = {};
      }
      trip.passengers.current = current;
      trip.passengers.capacity = capacity;
      
      await trip.save();

      res.json({
        success: true,
        message: 'تم تحديث عدد الركاب بنجاح',
        data: trip,
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: 'فشل تحديث عدد الركاب',
        error: error.message,
      });
    }
  }

  /**
   * جلب إحصائيات الرحلات
   * GET /api/trips/statistics
   */
  static async listTripStatistics(req, res) {
    try {
      const trips = await Trip.find();

      const statistics = {
        total: trips.length,
        inProgress: trips.filter(t => t.status === 'in_progress').length,
        scheduled: trips.filter(t => t.status === 'scheduled').length,
        completed: trips.filter(t => t.status === 'completed').length,
        cancelled: trips.filter(t => t.status === 'cancelled').length,
      };

      res.json({
        success: true,
        message: 'تم جلب إحصائيات الرحلات بنجاح',
        data: statistics,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'فشل جلب إحصائيات الرحلات',
        error: error.message,
      });
    }
  }
}

module.exports = TripController;
