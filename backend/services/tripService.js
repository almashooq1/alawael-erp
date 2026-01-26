/**
 * Trip Management Service - خدمة إدارة الرحلات
 *
 * إدارة الرحلات والمسافات والتكاليف
 * ✅ Trip Management
 * ✅ Distance Tracking
 * ✅ Fuel Consumption
 * ✅ Route Analysis
 */

const Trip = require('../models/Trip');
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const logger = require('../utils/logger');

class TripService {
  // ==================== إدارة الرحلات ====================

  /**
   * إنشاء رحلة جديدة
   */
  async createTrip(tripData) {
    try {
      // التحقق من المركبة والسائق
      const vehicle = await Vehicle.findById(tripData.vehicle);
      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      const driver = await Driver.findById(tripData.driver);
      if (!driver) {
        throw new Error('السائق غير موجود');
      }

      const trip = new Trip({
        ...tripData,
        status: 'قيد التنفيذ',
      });

      await trip.save();

      logger.info(`تم إنشاء رحلة جديدة: ${trip._id}`);
      return {
        success: true,
        message: 'تم إنشاء الرحلة بنجاح',
        trip,
      };
    } catch (error) {
      logger.error('خطأ في إنشاء الرحلة:', error);
      throw error;
    }
  }

  /**
   * الحصول على جميع الرحلات
   */
  async getAllTrips(filters = {}) {
    try {
      const query = {};

      if (filters.status) query.status = filters.status;
      if (filters.vehicle) query.vehicle = filters.vehicle;
      if (filters.driver) query.driver = filters.driver;
      if (filters.startDate) {
        query.startTime = { $gte: new Date(filters.startDate) };
      }

      const trips = await Trip.find(query)
        .populate('vehicle', 'registrationNumber plateNumber basicInfo')
        .populate('driver', 'personalInfo license')
        .sort({ startTime: -1 })
        .limit(100);

      return {
        success: true,
        count: trips.length,
        trips,
      };
    } catch (error) {
      logger.error('خطأ في جلب الرحلات:', error);
      throw error;
    }
  }

  /**
   * الحصول على تفاصيل رحلة محددة
   */
  async getTripDetails(tripId) {
    try {
      const trip = await Trip.findById(tripId)
        .populate('vehicle', 'registrationNumber plateNumber basicInfo')
        .populate('driver', 'personalInfo license');

      if (!trip) {
        throw new Error('الرحلة غير موجودة');
      }

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
   * إنهاء رحلة
   */
  async endTrip(tripId, endData) {
    try {
      const trip = await Trip.findById(tripId);

      if (!trip) {
        throw new Error('الرحلة غير موجودة');
      }

      if (trip.status === 'مكتملة') {
        throw new Error('الرحلة منتهية بالفعل');
      }

      trip.endTime = endData.endTime || new Date();
      trip.endLocation = endData.endLocation;
      trip.endOdometer = endData.endOdometer;
      // حساب المسافة واستهلاك الوقود
      if (trip.startOdometer !== undefined && trip.endOdometer !== undefined) {
        trip.actualDistance = trip.endOdometer - trip.startOdometer;
        trip.distance = trip.actualDistance;
      }

      if (endData.fuelConsumed !== undefined) {
        trip.fuelConsumed = endData.fuelConsumed;
        trip.fuelConsumption = endData.fuelConsumed;
      }
      trip.status = 'مكتملة';

      // حساب تكلفة الوقود
      if (endData.fuelPrice && trip.fuelConsumed) {
        trip.cost = trip.cost || {};
        trip.cost.fuel = trip.fuelConsumed * endData.fuelPrice;
        trip.fuelCost = trip.cost.fuel;
      }

      await trip.save();

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
   * تحديث معلومات الرحلة
   */
  async updateTrip(tripId, updateData) {
    try {
      const trip = await Trip.findByIdAndUpdate(
        tripId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!trip) {
        throw new Error('الرحلة غير موجودة');
      }

      logger.info(`تم تحديث الرحلة: ${tripId}`);
      return {
        success: true,
        message: 'تم تحديث الرحلة بنجاح',
        trip,
      };
    } catch (error) {
      logger.error('خطأ في تحديث الرحلة:', error);
      throw error;
    }
  }

  /**
   * حذف رحلة
   */
  async deleteTrip(tripId) {
    try {
      const trip = await Trip.findByIdAndDelete(tripId);

      if (!trip) {
        throw new Error('الرحلة غير موجودة');
      }

      logger.info(`تم حذف الرحلة: ${tripId}`);
      return {
        success: true,
        message: 'تم حذف الرحلة بنجاح',
      };
    } catch (error) {
      logger.error('خطأ في حذف الرحلة:', error);
      throw error;
    }
  }

  /**
   * إحصائيات الرحلات
   */
  async getTripStatistics(filters = {}) {
    try {
      const query = {};

      if (filters.vehicle) query.vehicle = filters.vehicle;
      if (filters.driver) query.driver = filters.driver;
      if (filters.startDate) {
        query.startTime = { $gte: new Date(filters.startDate) };
      }
      if (filters.endDate) {
        query.startTime = {
          ...query.startTime,
          $lte: new Date(filters.endDate),
        };
      }

      const trips = await Trip.find(query);

      const stats = {
        totalTrips: trips.length,
        completedTrips: trips.filter(t => t.status === 'مكتملة').length,
        activeTrips: trips.filter(t => t.status === 'قيد التنفيذ').length,
        totalDistance: trips.reduce((sum, t) => sum + (t.actualDistance || 0), 0),
        totalFuel: trips.reduce((sum, t) => sum + (t.fuelConsumed || 0), 0),
        totalCost: trips.reduce(
          (sum, t) => sum + (t.cost?.fuel || 0) + (t.cost?.tolls || 0) + (t.cost?.other || 0),
          0
        ),
        averageDistance: 0,
        averageFuelConsumption: 0,
      };

      if (stats.completedTrips > 0) {
        stats.averageDistance = stats.totalDistance / stats.completedTrips;
        stats.averageFuelConsumption = stats.totalFuel / stats.completedTrips;
      }

      return {
        success: true,
        statistics: stats,
      };
    } catch (error) {
      logger.error('خطأ في حساب إحصائيات الرحلات:', error);
      throw error;
    }
  }
}

module.exports = new TripService();
