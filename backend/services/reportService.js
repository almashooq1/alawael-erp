/**
 * خدمة التقارير والتحليلات
 * Reports and Analytics Service
 */

const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');
const Trip = require('../models/Trip');
const mongoose = require('mongoose');

class ReportService {
  /**
   * تقرير استهلاك الوقود
   * Fuel Consumption Report
   */
  async getFuelConsumptionReport(filters = {}) {
    try {
      const { startDate, endDate, vehicleId, driverId } = filters;

      // بناء query
      const query = {};

      if (startDate && endDate) {
        query.startTime = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }

      if (vehicleId) {
        query.vehicle = vehicleId;
      }

      if (driverId) {
        query.driver = driverId;
      }

      // الحصول على الرحلات
      const trips = await Trip.find(query)
        .populate('vehicle', 'plateNumber model make fuelType')
        .populate('driver', 'firstName lastName')
        .sort({ startTime: -1 });

      // حساب الإحصائيات
      let totalFuelConsumption = 0;
      let totalDistance = 0;
      let totalCost = 0;
      let tripCount = trips.length;

      trips.forEach(trip => {
        if (trip.fuelConsumption) {
          totalFuelConsumption += trip.fuelConsumption;
        }
        if (trip.distance) {
          totalDistance += trip.distance;
        }
        if (trip.fuelCost) {
          totalCost += trip.fuelCost;
        }
      });

      const avgFuelConsumption = tripCount > 0 ? totalFuelConsumption / tripCount : 0;
      const avgDistance = tripCount > 0 ? totalDistance / tripCount : 0;
      const fuelEfficiency = totalDistance > 0 ? totalDistance / totalFuelConsumption : 0;

      return {
        success: true,
        data: {
          summary: {
            totalTrips: tripCount,
            totalFuelConsumption: totalFuelConsumption.toFixed(2),
            totalDistance: totalDistance.toFixed(2),
            totalCost: totalCost.toFixed(2),
            avgFuelConsumption: avgFuelConsumption.toFixed(2),
            avgDistance: avgDistance.toFixed(2),
            fuelEfficiency: fuelEfficiency.toFixed(2), // km per liter
          },
          trips: trips.map(trip => ({
            id: trip._id,
            vehicle: trip.vehicle
              ? `${trip.vehicle.plateNumber} - ${trip.vehicle.make} ${trip.vehicle.model}`
              : 'N/A',
            driver: trip.driver ? `${trip.driver.firstName} ${trip.driver.lastName}` : 'N/A',
            date: trip.startTime,
            distance: trip.distance,
            fuelConsumption: trip.fuelConsumption,
            fuelCost: trip.fuelCost,
            efficiency:
              trip.distance && trip.fuelConsumption
                ? (trip.distance / trip.fuelConsumption).toFixed(2)
                : 'N/A',
          })),
        },
      };
    } catch (error) {
      console.error('خطأ في تقرير استهلاك الوقود:', error);
      throw new Error(`فشل في إنشاء تقرير الوقود: ${error.message}`);
    }
  }

  /**
   * تقرير الصيانة
   * Maintenance Report
   */
  async getMaintenanceReport(filters = {}) {
    try {
      const { startDate, endDate, vehicleId, maintenanceType } = filters;

      // بناء aggregation pipeline
      const pipeline = [{ $unwind: '$maintenance.maintenanceHistory' }];

      // تطبيق الفلاتر
      const matchConditions = {};

      if (startDate && endDate) {
        matchConditions['maintenance.maintenanceHistory.date'] = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      if (vehicleId) {
        matchConditions._id = mongoose.Types.ObjectId(vehicleId);
      }

      if (maintenanceType) {
        matchConditions['maintenance.maintenanceHistory.type'] = maintenanceType;
      }

      if (Object.keys(matchConditions).length > 0) {
        pipeline.push({ $match: matchConditions });
      }

      // إضافة معلومات المركبة
      pipeline.push({
        $project: {
          plateNumber: 1,
          make: 1,
          model: 1,
          year: 1,
          maintenance: '$maintenance.maintenanceHistory',
        },
      });

      const maintenanceRecords = await Vehicle.aggregate(pipeline);

      // حساب الإحصائيات
      let totalCost = 0;
      let recordCount = maintenanceRecords.length;
      const typeStats = {};

      maintenanceRecords.forEach(record => {
        if (record.maintenance.cost) {
          totalCost += record.maintenance.cost;
        }

        const type = record.maintenance.type || 'غير محدد';
        if (!typeStats[type]) {
          typeStats[type] = { count: 0, totalCost: 0 };
        }
        typeStats[type].count++;
        typeStats[type].totalCost += record.maintenance.cost || 0;
      });

      return {
        success: true,
        data: {
          summary: {
            totalRecords: recordCount,
            totalCost: totalCost.toFixed(2),
            avgCostPerMaintenance: recordCount > 0 ? (totalCost / recordCount).toFixed(2) : 0,
            maintenanceByType: typeStats,
          },
          records: maintenanceRecords.map(record => ({
            vehicle: `${record.plateNumber} - ${record.make} ${record.model}`,
            type: record.maintenance.type,
            description: record.maintenance.description,
            date: record.maintenance.date,
            mileage: record.maintenance.mileage,
            cost: record.maintenance.cost,
            serviceProvider: record.maintenance.serviceProvider,
            nextMaintenanceDate: record.maintenance.nextMaintenanceDate,
          })),
        },
      };
    } catch (error) {
      console.error('خطأ في تقرير الصيانة:', error);
      throw new Error(`فشل في إنشاء تقرير الصيانة: ${error.message}`);
    }
  }

  /**
   * تقرير أداء السائقين
   * Driver Performance Report
   */
  async getDriverPerformanceReport(filters = {}) {
    try {
      const { startDate, endDate, driverId } = filters;

      // بناء aggregation pipeline
      const matchConditions = { status: { $in: ['قيد التنفيذ', 'مكتملة'] } };

      if (startDate && endDate) {
        matchConditions.startTime = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }

      if (driverId) {
        matchConditions.driver = mongoose.Types.ObjectId(driverId);
      }

      const pipeline = [
        { $match: matchConditions },
        {
          $group: {
            _id: '$driver',
            totalTrips: { $sum: 1 },
            totalDistance: { $sum: '$distance' },
            totalFuelConsumption: { $sum: '$fuelConsumption' },
            totalFuelCost: { $sum: '$fuelCost' },
            avgDistance: { $avg: '$distance' },
            avgFuelConsumption: { $avg: '$fuelConsumption' },
          },
        },
        {
          $lookup: {
            from: 'drivers',
            localField: '_id',
            foreignField: '_id',
            as: 'driverInfo',
          },
        },
        { $unwind: '$driverInfo' },
        {
          $project: {
            driverId: '$_id',
            driverName: { $concat: ['$driverInfo.firstName', ' ', '$driverInfo.lastName'] },
            licenseNumber: '$driverInfo.licenseNumber',
            totalTrips: 1,
            totalDistance: { $round: ['$totalDistance', 2] },
            totalFuelConsumption: { $round: ['$totalFuelConsumption', 2] },
            totalFuelCost: { $round: ['$totalFuelCost', 2] },
            avgDistance: { $round: ['$avgDistance', 2] },
            avgFuelConsumption: { $round: ['$avgFuelConsumption', 2] },
            fuelEfficiency: {
              $cond: [
                { $gt: ['$totalFuelConsumption', 0] },
                { $round: [{ $divide: ['$totalDistance', '$totalFuelConsumption'] }, 2] },
                0,
              ],
            },
          },
        },
        { $sort: { totalTrips: -1 } },
      ];

      const driverStats = await Trip.aggregate(pipeline);

      return {
        success: true,
        data: {
          totalDrivers: driverStats.length,
          drivers: driverStats,
        },
      };
    } catch (error) {
      console.error('خطأ في تقرير أداء السائقين:', error);
      throw new Error(`فشل في إنشاء تقرير أداء السائقين: ${error.message}`);
    }
  }

  /**
   * تقرير استخدام المركبات
   * Vehicle Utilization Report
   */
  async getVehicleUtilizationReport(filters = {}) {
    try {
      const { startDate, endDate, vehicleId } = filters;

      // بناء aggregation pipeline
      const matchConditions = { status: { $in: ['قيد التنفيذ', 'مكتملة'] } };

      if (startDate && endDate) {
        matchConditions.startTime = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }

      if (vehicleId) {
        matchConditions.vehicle = mongoose.Types.ObjectId(vehicleId);
      }

      const pipeline = [
        { $match: matchConditions },
        {
          $group: {
            _id: '$vehicle',
            totalTrips: { $sum: 1 },
            totalDistance: { $sum: '$distance' },
            totalFuelConsumption: { $sum: '$fuelConsumption' },
            totalFuelCost: { $sum: '$fuelCost' },
            avgDistance: { $avg: '$distance' },
          },
        },
        {
          $lookup: {
            from: 'vehicles',
            localField: '_id',
            foreignField: '_id',
            as: 'vehicleInfo',
          },
        },
        { $unwind: '$vehicleInfo' },
        {
          $project: {
            vehicleId: '$_id',
            plateNumber: '$vehicleInfo.plateNumber',
            vehicleName: { $concat: ['$vehicleInfo.make', ' ', '$vehicleInfo.model'] },
            year: '$vehicleInfo.year',
            status: '$vehicleInfo.status',
            totalTrips: 1,
            totalDistance: { $round: ['$totalDistance', 2] },
            totalFuelConsumption: { $round: ['$totalFuelConsumption', 2] },
            totalFuelCost: { $round: ['$totalFuelCost', 2] },
            avgDistance: { $round: ['$avgDistance', 2] },
            fuelEfficiency: {
              $cond: [
                { $gt: ['$totalFuelConsumption', 0] },
                { $round: [{ $divide: ['$totalDistance', '$totalFuelConsumption'] }, 2] },
                0,
              ],
            },
          },
        },
        { $sort: { totalTrips: -1 } },
      ];

      const vehicleStats = await Trip.aggregate(pipeline);

      // إضافة المركبات غير المستخدمة
      const usedVehicleIds = vehicleStats.map(v => v.vehicleId.toString());
      const allVehicles = await Vehicle.find({}, 'plateNumber make model year status');

      const unusedVehicles = allVehicles
        .filter(v => !usedVehicleIds.includes(v._id.toString()))
        .map(v => ({
          vehicleId: v._id,
          plateNumber: v.plateNumber,
          vehicleName: `${v.make} ${v.model}`,
          year: v.year,
          status: v.status,
          totalTrips: 0,
          totalDistance: 0,
          totalFuelConsumption: 0,
          totalFuelCost: 0,
          avgDistance: 0,
          fuelEfficiency: 0,
        }));

      return {
        success: true,
        data: {
          totalVehicles: allVehicles.length,
          activeVehicles: vehicleStats.length,
          unusedVehicles: unusedVehicles.length,
          vehicles: [...vehicleStats, ...unusedVehicles],
        },
      };
    } catch (error) {
      console.error('خطأ في تقرير استخدام المركبات:', error);
      throw new Error(`فشل في إنشاء تقرير استخدام المركبات: ${error.message}`);
    }
  }

  /**
   * تقرير التكاليف الشامل
   * Comprehensive Cost Report
   */
  async getComprehensiveCostReport(filters = {}) {
    try {
      const { startDate, endDate } = filters;

      // تقرير تكاليف الوقود من الرحلات
      const fuelReport = await this.getFuelConsumptionReport(filters);

      // تقرير تكاليف الصيانة
      const maintenanceReport = await this.getMaintenanceReport(filters);

      const totalFuelCost = parseFloat(fuelReport.data.summary.totalCost);
      const totalMaintenanceCost = parseFloat(maintenanceReport.data.summary.totalCost);
      const totalCost = totalFuelCost + totalMaintenanceCost;

      return {
        success: true,
        data: {
          period: {
            startDate: startDate || 'N/A',
            endDate: endDate || 'N/A',
          },
          summary: {
            totalCost: totalCost.toFixed(2),
            fuelCost: totalFuelCost.toFixed(2),
            maintenanceCost: totalMaintenanceCost.toFixed(2),
            fuelPercentage: totalCost > 0 ? ((totalFuelCost / totalCost) * 100).toFixed(2) : 0,
            maintenancePercentage:
              totalCost > 0 ? ((totalMaintenanceCost / totalCost) * 100).toFixed(2) : 0,
          },
          breakdown: {
            fuel: fuelReport.data.summary,
            maintenance: maintenanceReport.data.summary,
          },
        },
      };
    } catch (error) {
      console.error('خطأ في التقرير الشامل للتكاليف:', error);
      throw new Error(`فشل في إنشاء التقرير الشامل: ${error.message}`);
    }
  }

  /**
   * تقرير لوحة المعلومات
   * Dashboard Summary Report
   */
  async getDashboardSummary() {
    try {
      // إحصائيات المركبات
      const totalVehicles = await Vehicle.countDocuments();
      const activeVehicles = await Vehicle.countDocuments({ status: 'نشط' });
      const inMaintenanceVehicles = await Vehicle.countDocuments({ status: 'تحت الصيانة' });

      // إحصائيات السائقين
      const totalDrivers = await Driver.countDocuments();
      const activeDrivers = await Driver.countDocuments({ status: 'نشط' });

      // إحصائيات الرحلات (آخر 30 يوم)
      const last30Days = new Date();
      last30Days.setDate(last30Days.getDate() - 30);

      const recentTrips = await Trip.countDocuments({
        startTime: { $gte: last30Days },
      });

      const ongoingTrips = await Trip.countDocuments({ status: 'قيد التنفيذ' });

      // إحصائيات التكاليف (آخر 30 يوم)
      const tripStats = await Trip.aggregate([
        {
          $match: {
            startTime: { $gte: last30Days },
            status: { $in: ['قيد التنفيذ', 'مكتملة'] },
          },
        },
        {
          $group: {
            _id: null,
            totalDistance: { $sum: '$distance' },
            totalFuelCost: { $sum: '$fuelCost' },
            avgDistance: { $avg: '$distance' },
          },
        },
      ]);

      const stats = tripStats[0] || { totalDistance: 0, totalFuelCost: 0, avgDistance: 0 };

      // الصيانة القادمة (خلال 7 أيام)
      const next7Days = new Date();
      next7Days.setDate(next7Days.getDate() + 7);

      const upcomingMaintenance = await Vehicle.aggregate([
        { $unwind: { path: '$maintenance.maintenanceHistory', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            'maintenance.maintenanceHistory.nextMaintenanceDate': {
              $gte: new Date(),
              $lte: next7Days,
            },
          },
        },
        {
          $project: {
            plateNumber: 1,
            make: 1,
            model: 1,
            nextMaintenanceDate: '$maintenance.maintenanceHistory.nextMaintenanceDate',
          },
        },
        { $limit: 5 },
      ]);

      return {
        success: true,
        data: {
          vehicles: {
            total: totalVehicles,
            active: activeVehicles,
            inMaintenance: inMaintenanceVehicles,
            inactive: totalVehicles - activeVehicles - inMaintenanceVehicles,
          },
          drivers: {
            total: totalDrivers,
            active: activeDrivers,
            inactive: totalDrivers - activeDrivers,
          },
          trips: {
            last30Days: recentTrips,
            ongoing: ongoingTrips,
            totalDistance: stats.totalDistance.toFixed(2),
            avgDistance: stats.avgDistance.toFixed(2),
          },
          costs: {
            last30DaysFuel: stats.totalFuelCost.toFixed(2),
          },
          upcomingMaintenance: upcomingMaintenance.map(m => ({
            vehicle: `${m.plateNumber} - ${m.make} ${m.model}`,
            date: m.nextMaintenanceDate,
          })),
        },
      };
    } catch (error) {
      console.error('خطأ في ملخص لوحة المعلومات:', error);
      throw new Error(`فشل في إنشاء ملخص لوحة المعلومات: ${error.message}`);
    }
  }
}

module.exports = new ReportService();
