/* eslint-disable no-unused-vars */
/**
 * Vehicle Fleet Service - خدمة إدارة الأسطول
 *
 * خدمات متقدمة لإدارة الأسطول والمركبات
 * ✅ Fleet Operations
 * ✅ Maintenance Management
 * ✅ Cost Analysis
 * ✅ Performance Tracking
 */

const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const logger = require('../utils/logger');

class FleetService {
  // ==================== إدارة المركبات ====================

  /**
   * إضافة مركبة جديدة إلى الأسطول
   */
  async addVehicle(vehicleData) {
    try {
      const vehicle = new Vehicle(vehicleData);
      await vehicle.save();

      logger.info(`تمت إضافة مركبة جديدة: ${vehicle.registrationNumber}`);
      return {
        success: true,
        message: 'تمت إضافة المركبة بنجاح',
        vehicle,
      };
    } catch (error) {
      logger.error('خطأ في إضافة المركبة:', error);
      throw error;
    }
  }

  /**
   * الحصول على جميع المركبات
   */
  async getAllVehicles(filters = {}) {
    try {
      const query = {};

      if (filters.status) query.status = filters.status;
      if (filters.category) query['registration.category'] = filters.category;
      if (filters.owner) query.owner = filters.owner;
      if (filters.assignedDriver) query.assignedDriver = filters.assignedDriver;
      if (filters.isActive !== undefined) query.isActive = filters.isActive;

      const vehicles = await Vehicle.find(query)
        .populate('owner', 'name email phone')
        .populate('assignedDriver', 'personalInfo.firstName personalInfo.lastName')
        .sort({ createdAt: -1 });

      return {
        success: true,
        count: vehicles.length,
        vehicles,
      };
    } catch (error) {
      logger.error('خطأ في جلب المركبات:', error);
      throw error;
    }
  }

  /**
   * الحصول على بيانات مركبة معينة
   */
  async getVehicleDetails(vehicleId) {
    try {
      const vehicle = await Vehicle.findById(vehicleId)
        .populate('owner')
        .populate('assignedDriver')
        // .populate('relatedLicenses') // معطل - License model غير موجود
        .populate('documents');

      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      return {
        success: true,
        vehicle,
      };
    } catch (error) {
      logger.error('خطأ في جلب بيانات المركبة:', error);
      throw error;
    }
  }

  /**
   * تحديث بيانات المركبة
   */
  async updateVehicle(vehicleId, updateData) {
    try {
      const vehicle = await Vehicle.findByIdAndUpdate(vehicleId, updateData, { new: true });

      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      logger.info(`تم تحديث بيانات المركبة: ${vehicle.registrationNumber}`);
      return {
        success: true,
        message: 'تم تحديث المركبة بنجاح',
        vehicle,
      };
    } catch (error) {
      logger.error('خطأ في تحديث المركبة:', error);
      throw error;
    }
  }

  /**
   * حذف مركبة
   */
  async deleteVehicle(vehicleId) {
    try {
      const vehicle = await Vehicle.findByIdAndDelete(vehicleId);

      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      logger.info(`تم حذف المركبة: ${vehicle.registrationNumber}`);
      return {
        success: true,
        message: 'تم حذف المركبة بنجاح',
      };
    } catch (error) {
      logger.error('خطأ في حذف المركبة:', error);
      throw error;
    }
  }

  // ==================== إدارة الصيانة ====================

  /**
   * إضافة سجل صيانة
   */
  async addMaintenanceRecord(vehicleId, maintenanceData) {
    try {
      // إنشاء سجل الصيانة الجديد
      const newRecord = {
        date: maintenanceData.date || new Date(),
        type: maintenanceData.type,
        description: maintenanceData.description,
        cost: maintenanceData.cost || 0,
        provider: maintenanceData.provider,
        mileage: maintenanceData.mileage,
      };

      // تحديث المركبة باستخدام $push
      const vehicle = await Vehicle.findByIdAndUpdate(
        vehicleId,
        {
          $push: { 'maintenance.maintenanceHistory': { $each: [newRecord], $slice: -200 } },
          $inc: { 'maintenance.totalMaintenanceCost': newRecord.cost },
          $set: {
            'maintenance.lastMaintenanceDate': new Date(),
            'maintenance.nextMaintenanceDate': new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
        { new: true, runValidators: true }
      );

      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      logger.info(`تمت إضافة سجل صيانة للمركبة: ${vehicle.registrationNumber}`);
      return {
        success: true,
        message: 'تمت إضافة سجل الصيانة بنجاح',
        vehicle,
      };
    } catch (error) {
      logger.error('خطأ في إضافة سجل الصيانة:', error);
      throw error;
    }
  }

  /**
   * الحصول على جدول الصيانة
   */
  async getMaintenanceSchedule(vehicleId) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);

      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      const schedule = {
        lastMaintenanceDate: vehicle.maintenance.lastMaintenanceDate,
        nextMaintenanceDate: vehicle.maintenance.nextMaintenanceDate,
        estimatedCost: vehicle.maintenance.totalMaintenanceCost,
        maintenanceItems: vehicle.maintenance.maintenanceSchedule,
        history: vehicle.maintenance.maintenanceHistory.slice(-10), // آخر 10 سجلات
      };

      return {
        success: true,
        schedule,
      };
    } catch (error) {
      logger.error('خطأ في جلب جدول الصيانة:', error);
      throw error;
    }
  }

  /**
   * الحصول على المركبات التي تحتاج صيانة
   */
  async getVehiclesNeedingMaintenance() {
    try {
      const now = new Date();
      const vehicles = await Vehicle.find({
        'maintenance.nextMaintenanceDate': { $lte: now },
        isActive: true,
      }).select('registrationNumber plateNumber basicInfo maintenance');

      return {
        success: true,
        count: vehicles.length,
        vehicles,
      };
    } catch (error) {
      logger.error('خطأ في جلب المركبات التي تحتاج صيانة:', error);
      throw error;
    }
  }

  // ==================== إدارة الفحص ====================

  /**
   * تسجيل فحص دوري
   */
  async recordInspection(vehicleId, inspectionData) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);

      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      vehicle.inspection.inspectionHistory.push({
        date: new Date(),
        ...inspectionData,
      });

      vehicle.inspection.lastInspectionDate = new Date();
      vehicle.inspection.nextInspectionDate = new Date();
      vehicle.inspection.nextInspectionDate.setFullYear(
        vehicle.inspection.nextInspectionDate.getFullYear() + 1
      );

      vehicle.inspection.status = inspectionData.result || 'معايير';

      await vehicle.save();

      logger.info(`تم تسجيل فحص للمركبة: ${vehicle.registrationNumber}`);
      return {
        success: true,
        message: 'تم تسجيل الفحص بنجاح',
        vehicle,
      };
    } catch (error) {
      logger.error('خطأ في تسجيل الفحص:', error);
      throw error;
    }
  }

  /**
   * الحصول على المركبات التي تحتاج فحص
   */
  async getVehiclesNeedingInspection() {
    try {
      const now = new Date();
      const vehicles = await Vehicle.find({
        'inspection.nextInspectionDate': { $lte: now },
        isActive: true,
      }).select('registrationNumber plateNumber basicInfo inspection');

      return {
        success: true,
        count: vehicles.length,
        vehicles,
      };
    } catch (error) {
      logger.error('خطأ في جلب المركبات التي تحتاج فحص:', error);
      throw error;
    }
  }

  // ==================== إدارة المخالفات ====================

  /**
   * تسجيل مخالفة
   */
  async recordViolation(vehicleId, violationData) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);

      if (!vehicle) {
        throw new Error('المركبة غير موجودة');
      }

      vehicle.violations.push({
        date: new Date(),
        ...violationData,
      });

      vehicle.totalViolations += 1;
      vehicle.totalFines += violationData.fine || 0;

      await vehicle.save();

      logger.info(`تم تسجيل مخالفة للمركبة: ${vehicle.registrationNumber}`);
      return {
        success: true,
        message: 'تم تسجيل المخالفة بنجاح',
        vehicle,
      };
    } catch (error) {
      logger.error('خطأ في تسجيل المخالفة:', error);
      throw error;
    }
  }

  // ==================== الإحصائيات والتقارير ====================

  /**
   * الحصول على إحصائيات الأسطول
   */
  async getFleetStatistics() {
    try {
      // استعلامات متوازية بدلاً من تسلسلية + aggregation لتجنب جلب المستندات الكاملة
      const [vehicleStats, drivers, tripStats] = await Promise.all([
        Vehicle.aggregate([
          { $match: { isActive: true } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              totalCost: { $sum: '$stats.totalCost' },
              totalFines: { $sum: '$totalFines' },
              active: {
                $sum: { $cond: [{ $eq: ['$status', 'نشطة'] }, 1, 0] },
              },
              maintenance: {
                $sum: { $cond: [{ $eq: ['$status', 'في الإصلاح'] }, 1, 0] },
              },
              idle: {
                $sum: { $cond: [{ $eq: ['$status', 'معطلة'] }, 1, 0] },
              },
            },
          },
        ]),
        Driver.aggregate([
          { $match: { isActive: true, 'employment.status': 'نشط' } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              active: {
                $sum: { $cond: [{ $eq: ['$employment.status', 'نشط'] }, 1, 0] },
              },
              onLeave: {
                $sum: { $cond: [{ $eq: ['$employment.status', 'إجازة'] }, 1, 0] },
              },
              suspended: {
                $sum: { $cond: [{ $eq: ['$violationPoints.status', 'ممنوع'] }, 1, 0] },
              },
            },
          },
        ]),
        Trip.aggregate([
          { $match: { status: 'اكتملت' } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              totalDistance: { $sum: { $ifNull: ['$distance', 0] } },
              totalRevenue: { $sum: { $ifNull: ['$revenue', 0] } },
            },
          },
        ]),
      ]);

      const v = vehicleStats[0] || {
        total: 0,
        totalCost: 0,
        totalFines: 0,
        active: 0,
        maintenance: 0,
        idle: 0,
      };
      const d = drivers[0] || { total: 0, active: 0, onLeave: 0, suspended: 0 };
      const t = tripStats[0] || { total: 0, totalDistance: 0, totalRevenue: 0 };

      const totalCosts = v.totalCost;
      const totalRevenue = t.totalRevenue;
      const totalDistance = t.totalDistance;

      return {
        success: true,
        statistics: {
          totalVehicles: v.total,
          totalDrivers: d.total,
          totalTrips: t.total,
          totalDistance,
          totalCosts,
          totalRevenue,
          totalFines: v.totalFines,
          costPerKm: totalDistance > 0 ? (totalCosts / totalDistance).toFixed(2) : 0,
          profit: totalRevenue - totalCosts,
          profitMargin:
            totalRevenue > 0 ? (((totalRevenue - totalCosts) / totalRevenue) * 100).toFixed(2) : 0,
          vehiclesByStatus: {
            active: v.active,
            maintenance: v.maintenance,
            idle: v.idle,
          },
          driversByStatus: {
            active: d.active,
            onLeave: d.onLeave,
            suspended: d.suspended,
          },
        },
      };
    } catch (error) {
      logger.error('خطأ في حساب إحصائيات الأسطول:', error);
      throw error;
    }
  }

  /**
   * الحصول على تقرير الامتثال
   */
  async getComplianceReport() {
    try {
      const vehicles = await Vehicle.find({ isActive: true });

      const compliant = vehicles.filter(v => v.isCompliant()).length;
      const noncompliant = vehicles.length - compliant;

      const issues = [];

      for (const vehicle of vehicles) {
        if (!vehicle.isCompliant()) {
          const vehicleIssues = [];

          if (new Date() > vehicle.registration.expiryDate) {
            vehicleIssues.push({
              type: 'تسجيل',
              description: 'الترخيص منتهي الصلاحية',
              daysOverdue: Math.floor(
                (new Date() - vehicle.registration.expiryDate) / (1000 * 60 * 60 * 24)
              ),
            });
          }

          if (!vehicle.insurance.insured || new Date() > vehicle.insurance.policyExpiryDate) {
            vehicleIssues.push({
              type: 'تأمين',
              description: 'التأمين غير صالح',
            });
          }

          if (new Date() > vehicle.inspection.nextInspectionDate) {
            vehicleIssues.push({
              type: 'فحص',
              description: 'الفحص الدوري مستحق',
            });
          }

          issues.push({
            vehicleId: vehicle._id,
            registrationNumber: vehicle.registrationNumber,
            issues: vehicleIssues,
          });
        }
      }

      return {
        success: true,
        report: {
          totalVehicles: vehicles.length,
          compliant,
          noncompliant,
          complianceRate: ((compliant / vehicles.length) * 100).toFixed(2),
          issues,
        },
      };
    } catch (error) {
      logger.error('خطأ في حساب تقرير الامتثال:', error);
      throw error;
    }
  }

  /**
   * الحصول على تقرير الأداء
   */
  async getPerformanceReport(vehicleId) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) throw new Error('المركبة غير موجودة');

      const trips = await Trip.find({ vehicle: vehicleId, status: 'اكتملت' });

      const totalTrips = trips.length;
      const totalDistance = trips.reduce((sum, trip) => sum + (trip.distance || 0), 0);
      const totalRevenue = trips.reduce((sum, trip) => sum + (trip.revenue || 0), 0);
      const totalCosts = vehicle.stats.totalCost || 0;
      const averageSafetyScore =
        trips.length > 0
          ? (
              trips.reduce((sum, trip) => sum + (trip.drivingQuality.safetyScore || 0), 0) /
              trips.length
            ).toFixed(2)
          : 0;

      return {
        success: true,
        report: {
          vehicle: {
            registrationNumber: vehicle.registrationNumber,
            plateNumber: vehicle.plateNumber,
          },
          performance: {
            totalTrips,
            totalDistance,
            totalRevenue,
            totalCosts,
            profit: totalRevenue - totalCosts,
            costPerKm: totalDistance > 0 ? (totalCosts / totalDistance).toFixed(2) : 0,
            revenuePerKm: totalDistance > 0 ? (totalRevenue / totalDistance).toFixed(2) : 0,
            averageSafetyScore,
          },
        },
      };
    } catch (error) {
      logger.error('خطأ في حساب تقرير الأداء:', error);
      throw error;
    }
  }

  // ==================== إدارة التكاليف ====================

  /**
   * حساب تكلفة التشغيل
   */
  async calculateOperatingCost(vehicleId, startDate, endDate) {
    try {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) throw new Error('المركبة غير موجودة');

      const trips = await Trip.find({
        vehicle: vehicleId,
        startTime: { $gte: startDate, $lte: endDate },
      });

      let totalFuelCost = 0;
      let totalTollCost = 0;
      let totalParkingCost = 0;

      for (const trip of trips) {
        totalFuelCost += trip.costs.fuelCost || 0;
        totalTollCost += trip.costs.tolls || 0;
        totalParkingCost += trip.costs.parkingFees || 0;
      }

      return {
        success: true,
        costs: {
          fuelCost: totalFuelCost,
          tollCost: totalTollCost,
          parkingCost: totalParkingCost,
          maintenanceCost: vehicle.maintenance.totalMaintenanceCost || 0,
          insuranceCost:
            vehicle.insurance.monthlyPremium *
              ((endDate - startDate) / (1000 * 60 * 60 * 24 * 30)) || 0,
          totalCost:
            totalFuelCost +
            totalTollCost +
            totalParkingCost +
            vehicle.maintenance.totalMaintenanceCost,
        },
      };
    } catch (error) {
      logger.error('خطأ في حساب تكلفة التشغيل:', error);
      throw error;
    }
  }
}

module.exports = new FleetService();
