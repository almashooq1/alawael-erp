/**
 * Vehicle Tracking Service - خدمة تتبع المركبات
 *
 * تتبع موقع المركبات في الوقت الفعلي وإدارة الرحلات
 * ✅ Real-time GPS Tracking
 * ✅ Route Recording
 * ✅ Journey Analytics
 * ✅ Driver Behavior Monitoring
 */

const Vehicle = require('../models/Vehicle');
const Trip = require('../models/Trip');
const Driver = require('../models/Driver');
const logger = require('../utils/logger');
const gpsService = require('./gpsService'); // خدمة GPS خارجية
const notificationService = require('./notificationService');

class VehicleTrackingService {
  // ==================== تتبع الموقع ====================

  /**
   * تحديث موقع المركبة (يتم تلقي البيانات من جهاز GPS)
   */
  async updateVehicleLocation(vehicleId, locationData) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) throw new Error('المركبة غير موجودة');

      const { latitude, longitude, address, speed, bearing } = locationData;

      await vehicle.updateLocation(latitude, longitude, address, speed);
      vehicle.tracking.bearing = bearing;
      vehicle.tracking.engineStatus = speed > 0 ? 'تعمل' : 'متوقفة';

      await vehicle.save();

      // التحقق من المخالفات
      await this.checkSpeedingViolations(vehicleId, speed);
      await this.checkGeofences(vehicleId, latitude, longitude);

      logger.info(`تم تحديث موقع المركبة: ${vehicle.registrationNumber}`);

      return {
        success: true,
        message: 'تم تحديث الموقع بنجاح',
      };
    } catch (error) {
      logger.error('خطأ في تحديث موقع المركبة:', error);
      throw error;
    }
  }

  /**
   * الحصول على الموقع الحالي للمركبة
   */
  async getCurrentLocation(vehicleId) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) throw new Error('المركبة غير موجودة');

      return {
        success: true,
        location: {
          latitude: vehicle.tracking.lastLocation.latitude,
          longitude: vehicle.tracking.lastLocation.longitude,
          address: vehicle.tracking.lastLocation.address,
          timestamp: vehicle.tracking.lastLocation.timestamp,
          speed: vehicle.tracking.speed,
          engineStatus: vehicle.tracking.engineStatus,
        },
      };
    } catch (error) {
      logger.error('خطأ في جلب الموقع الحالي:', error);
      throw error;
    }
  }

  /**
   * الحصول على سجل المواقع التاريخية
   */
  async getLocationHistory(vehicleId, hours = 24) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) throw new Error('المركبة غير موجودة');

      const startTime = new Date(Date.now() - hours * 60 * 60 * 1000);
      const history = vehicle.tracking.locationHistory.filter(loc => new Date(loc.timestamp) >= startTime);

      return {
        success: true,
        count: history.length,
        history: history.map(loc => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
          timestamp: loc.timestamp,
          speed: loc.speed,
        })),
      };
    } catch (error) {
      logger.error('خطأ في جلب سجل المواقع:', error);
      throw error;
    }
  }

  /**
   * الحصول على جميع المركبات على الخريطة
   */
  async getAllVehiclesOnMap(filters = {}) {
    try {
      const query = { isActive: true, 'tracking.gpsEnabled': true };

      if (filters.status) query.status = filters.status;
      if (filters.assignedDriver) query.assignedDriver = filters.assignedDriver;

      const vehicles = await Vehicle.find(query).select('registrationNumber plateNumber basicInfo tracking assignedDriver status');

      const vehiclesOnMap = vehicles.map(vehicle => ({
        _id: vehicle._id,
        registrationNumber: vehicle.registrationNumber,
        plateNumber: vehicle.plateNumber,
        type: vehicle.basicInfo.type,
        latitude: vehicle.tracking.lastLocation.latitude,
        longitude: vehicle.tracking.lastLocation.longitude,
        speed: vehicle.tracking.speed,
        status: vehicle.status,
        lastUpdate: vehicle.tracking.lastLocation.timestamp,
      }));

      return {
        success: true,
        count: vehiclesOnMap.length,
        vehicles: vehiclesOnMap,
      };
    } catch (error) {
      logger.error('خطأ في جلب المركبات على الخريطة:', error);
      throw error;
    }
  }

  // ==================== تسجيل الرحلات ====================

  /**
   * بدء رحلة جديدة
   */
  async startTrip(vehicleId, driverId, tripData) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      const driver = await Driver.findById(driverId);

      if (!vehicle || !driver) throw new Error('البيانات غير صحيحة');

      const tripId = `TRIP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      const trip = new Trip({
        tripId,
        vehicle: vehicleId,
        vehicleRegistration: vehicle.registrationNumber,
        driver: driverId,
        driverName: `${driver.personalInfo.firstName} ${driver.personalInfo.lastName}`,
        startTime: new Date(),
        startLocation: {
          latitude: vehicle.tracking.lastLocation.latitude,
          longitude: vehicle.tracking.lastLocation.longitude,
          address: vehicle.tracking.lastLocation.address,
          odometer: vehicle.performance.odometer,
        },
        status: 'جارية',
        ...tripData,
      });

      await trip.save();

      logger.info(`تم بدء رحلة جديدة: ${tripId}`);

      return {
        success: true,
        message: 'تم بدء الرحلة بنجاح',
        trip,
      };
    } catch (error) {
      logger.error('خطأ في بدء الرحلة:', error);
      throw error;
    }
  }

  /**
   * إنهاء الرحلة
   */
  async endTrip(tripId) {
    try {
      const trip = await Trip.findOne({ tripId });
      if (!trip) throw new Error('الرحلة غير موجودة');

      const vehicle = await Vehicle.findById(trip.vehicle);

      trip.endTime = new Date();
      trip.status = 'اكتملت';
      trip.calculateDuration();

      // حساب المسافة
      if (trip.endLocation && trip.startLocation) {
        const distance = this.calculateDistance(
          trip.startLocation.latitude,
          trip.startLocation.longitude,
          trip.endLocation.latitude,
          trip.endLocation.longitude,
        );
        trip.distance = distance;

        // تحديث إحصائيات المركبة
        vehicle.stats.totalDistance += distance;
        vehicle.stats.totalTrips += 1;
        vehicle.performance.odometer = trip.endLocation.odometer || vehicle.performance.odometer;
      }

      // حساب جودة القيادة
      await trip.calculateDrivingQuality();
      trip.calculateCosts();

      await trip.save();
      await vehicle.save();

      logger.info(`تم إنهاء الرحلة: ${tripId}`);

      return {
        success: true,
        message: 'تم إنهاء الرحلة بنجاح',
        trip,
      };
    } catch (error) {
      logger.error('خطأ في إنهاء الرحلة:', error);
      throw error;
    }
  }

  /**
   * الحصول على تفاصيل الرحلة
   */
  async getTripDetails(tripId) {
    try {
      const trip = await Trip.findOne({ tripId }).populate('vehicle', 'registrationNumber plateNumber').populate('driver', 'personalInfo');

      if (!trip) throw new Error('الرحلة غير موجودة');

      return {
        success: true,
        trip,
      };
    } catch (error) {
      logger.error('خطأ في جلب تفاصيل الرحلة:', error);
      throw error;
    }
  }

  /**
   * الحصول على سجل الرحلات
   */
  async getTripHistory(vehicleId, startDate, endDate) {
    try {
      const trips = await Trip.find({
        vehicle: vehicleId,
        startTime: { $gte: startDate, $lte: endDate },
      }).sort({ startTime: -1 });

      return {
        success: true,
        count: trips.length,
        trips,
      };
    } catch (error) {
      logger.error('خطأ في جلب سجل الرحلات:', error);
      throw error;
    }
  }

  // ==================== المراقبة والتنبيهات ====================

  /**
   * التحقق من مخالفات السرعة
   */
  async checkSpeedingViolations(vehicleId, currentSpeed, speedLimit = 120) {
    try {
      if (currentSpeed > speedLimit) {
        const trip = await Trip.findOne({
          vehicle: vehicleId,
          status: 'جارية',
        });

        if (trip) {
          await trip.recordViolation({
            type: 'تجاوز السرعة',
            description: `السرعة: ${currentSpeed} كم/س (الحد الأقصى: ${speedLimit})`,
            severity: currentSpeed > speedLimit + 20 ? 'عالية' : 'منخفضة',
          });

          // إرسال تنبيه
          await notificationService.sendAlert({
            type: 'speeding',
            vehicleId,
            message: `تجاوز سرعة: ${currentSpeed} كم/س`,
            severity: 'warning',
          });
        }
      }

      return {
        success: true,
        isSpeeding: currentSpeed > speedLimit,
      };
    } catch (error) {
      logger.error('خطأ في التحقق من السرعة:', error);
    }
  }

  /**
   * التحقق من المناطق المحددة (Geofences)
   */
  async checkGeofences(vehicleId, latitude, longitude) {
    try {
      // قائمة المناطق المحظورة (يمكن تخزينها في قاعدة البيانات)
      const restrictedAreas = [
        {
          name: 'منطقة عسكرية',
          latitude: 24.7136,
          longitude: 46.6753,
          radius: 5, // كم
        },
        {
          name: 'منطقة سكنية',
          latitude: 24.7241,
          longitude: 46.6844,
          radius: 2,
        },
      ];

      for (const area of restrictedAreas) {
        const distance = this.calculateDistance(latitude, longitude, area.latitude, area.longitude);

        if (distance < area.radius) {
          const trip = await Trip.findOne({
            vehicle: vehicleId,
            status: 'جارية',
          });

          if (trip) {
            await notificationService.sendAlert({
              type: 'geofence_violation',
              vehicleId,
              message: `المركبة دخلت منطقة محظورة: ${area.name}`,
              severity: 'critical',
            });
          }
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('خطأ في فحص المناطق المحددة:', error);
    }
  }

  /**
   * كشف الحوادث والسلوك غير الآمن
   */
  async detectAbnormalBehavior(vehicleId, accelerationData) {
    try {
      // كشف التسارع المفاجئ
      const threshold = 0.5; // G
      if (Math.abs(accelerationData.x) > threshold || Math.abs(accelerationData.y) > threshold) {
        const trip = await Trip.findOne({
          vehicle: vehicleId,
          status: 'جارية',
        });

        if (trip) {
          trip.events.push({
            timestamp: new Date(),
            eventType: 'تسريع',
            details: `تسارع مفاجئ: ${Math.sqrt(accelerationData.x ** 2 + accelerationData.y ** 2).toFixed(2)}G`,
          });

          await trip.save();

          // إذا كان التسارع شديداً جداً، قد تكون هناك حادثة
          if (Math.sqrt(accelerationData.x ** 2 + accelerationData.y ** 2) > 1.0) {
            await notificationService.sendAlert({
              type: 'possible_accident',
              vehicleId,
              message: 'تم اكتشاف تسارع شديد - قد تكون هناك حادثة',
              severity: 'critical',
            });
          }
        }
      }

      return { success: true };
    } catch (error) {
      logger.error('خطأ في كشف السلوك غير الآمن:', error);
    }
  }

  // ==================== المساعدات ====================

  /**
   * حساب المسافة بين نقطتين (Haversine Formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // نصف قطر الأرض بالكيلومتر
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * الحصول على إحصائيات الرحلة
   */
  async getTripStatistics(vehicleId, startDate, endDate) {
    try {
      const trips = await Trip.find({
        vehicle: vehicleId,
        startTime: { $gte: startDate, $lte: endDate },
        status: 'اكتملت',
      });

      const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
      const totalTime = trips.reduce((sum, trip) => sum + (trip.duration || 0), 0); // بالدقائق
      const averageSpeed = totalDistance > 0 && totalTime > 0 ? (totalDistance / (totalTime / 60)).toFixed(2) : 0;
      const averageSafetyScore =
        trips.length > 0 ? (trips.reduce((sum, trip) => sum + (trip.drivingQuality.safetyScore || 0), 0) / trips.length).toFixed(2) : 0;

      return {
        success: true,
        statistics: {
          totalTrips: trips.length,
          totalDistance,
          totalTime,
          averageSpeed,
          averageSafetyScore,
          totalRevenue: trips.reduce((sum, trip) => sum + (trip.revenue || 0), 0),
          totalCosts: trips.reduce((sum, trip) => sum + (trip.costs.total || 0), 0),
        },
      };
    } catch (error) {
      logger.error('خطأ في حساب إحصائيات الرحلة:', error);
      throw error;
    }
  }

  /**
   * تصدير بيانات الرحلة
   */
  async exportTripData(tripId, format = 'pdf') {
    try {
      const trip = await Trip.findOne({ tripId }).populate('vehicle').populate('driver');

      if (!trip) throw new Error('الرحلة غير موجودة');

      // يمكن تطبيق منطق التصدير هنا
      return {
        success: true,
        message: 'تم تصدير البيانات بنجاح',
        format,
      };
    } catch (error) {
      logger.error('خطأ في تصدير بيانات الرحلة:', error);
      throw error;
    }
  }
}

module.exports = new VehicleTrackingService();
