/**
 * Fleet KPI & Analytics Service - خدمة مؤشرات أداء الأسطول
 */

const FleetKPI = require('../models/FleetKPI');
const logger = require('../utils/logger');

class FleetKPIService {
  static async createReport(data) {
    return FleetKPI.create(data);
  }

  static async getAll(filter = {}, page = 1, limit = 20) {
    const query = { isActive: true };
    if (filter.organization) query.organization = filter.organization;
    if (filter.periodType) query['period.type'] = filter.periodType;

    const [reports, total] = await Promise.all([
      FleetKPI.find(query)
        .sort({ 'period.startDate': -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit)),
      FleetKPI.countDocuments(query),
    ]);
    return { reports, total, page: parseInt(page), pages: Math.ceil(total / limit) };
  }

  static async getById(id) {
    return FleetKPI.findById(id)
      .populate('fuel.bestEfficiencyVehicle', 'plateNumber make model')
      .populate('fuel.worstEfficiencyVehicle', 'plateNumber make model')
      .populate('drivers.topDrivers.driver', 'name')
      .populate('vehicleMetrics.vehicle', 'plateNumber make model');
  }

  static async getLatest(organization, periodType = 'monthly') {
    return FleetKPI.findOne({
      organization,
      'period.type': periodType,
      isActive: true,
    }).sort({ 'period.startDate': -1 });
  }

  static async generateKPI(organization, periodType, startDate, endDate) {
    // Aggregate data from all fleet collections
    const mongoose = require('mongoose');
    const orgId = organization ? new mongoose.Types.ObjectId(organization) : null;
    const dateRange = { $gte: new Date(startDate), $lte: new Date(endDate) };

    const report = {
      organization,
      period: { type: periodType, startDate, endDate },
      utilization: {},
      costs: {},
      fuel: {},
      safety: {},
      drivers: {},
      maintenance: {},
      compliance: {},
      dispatch: {},
      generatedAt: new Date(),
    };

    // Vehicle Utilization
    try {
      const Vehicle = mongoose.model('Vehicle');
      const vehicles = await Vehicle.aggregate([
        { $match: orgId ? { organization: orgId } : {} },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
            idle: { $sum: { $cond: [{ $eq: ['$status', 'idle'] }, 1, 0] } },
            inMaintenance: { $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } },
          },
        },
      ]);
      if (vehicles[0]) {
        report.utilization = {
          totalVehicles: vehicles[0].total,
          activeVehicles: vehicles[0].active,
          idleVehicles: vehicles[0].idle,
          inMaintenanceVehicles: vehicles[0].inMaintenance,
          utilizationRate:
            vehicles[0].total > 0 ? Math.round((vehicles[0].active / vehicles[0].total) * 100) : 0,
        };
      }
    } catch (e) {
      logger.warn('KPI Vehicle aggregation:', e.message);
    }

    // Trip / Distance
    try {
      const Trip = mongoose.model('Trip');
      const trips = await Trip.aggregate([
        { $match: { createdAt: dateRange } },
        {
          $group: {
            _id: null,
            totalTrips: { $sum: 1 },
            totalKm: { $sum: '$distance' },
            totalFuel: { $sum: '$fuelConsumed' },
            totalFuelCost: { $sum: '$fuelCost' },
          },
        },
      ]);
      if (trips[0]) {
        report.fuel.totalLiters = trips[0].totalFuel || 0;
        report.fuel.totalCost = trips[0].totalFuelCost || 0;
        report.fuel.averageConsumption =
          trips[0].totalKm > 0
            ? Math.round((trips[0].totalFuel / trips[0].totalKm) * 100 * 100) / 100
            : 0;
        report.dispatch.totalOrders = trips[0].totalTrips;
      }
    } catch (e) {
      logger.warn('KPI Trip aggregation:', e.message);
    }

    // Safety
    try {
      const FleetSafetyIncident = mongoose.model('FleetSafetyIncident');
      const incidents = await FleetSafetyIncident.aggregate([
        { $match: { createdAt: dateRange, isActive: true } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          },
        },
      ]);
      if (incidents[0]) {
        report.safety.totalIncidents = incidents[0].total;
        report.safety.criticalIncidents = incidents[0].critical;
        report.safety.safetyScore = Math.max(
          0,
          100 - incidents[0].total * 5 - incidents[0].critical * 15
        );
      }
    } catch (e) {
      logger.warn('KPI Safety aggregation:', e.message);
    }

    // Calculate Fleet Health Index (weighted average)
    const u = report.utilization.utilizationRate || 0;
    const s = report.safety.safetyScore || 100;
    const c = report.compliance.overallComplianceScore || 80;
    report.fleetHealthIndex = Math.round(u * 0.25 + s * 0.3 + c * 0.2 + 50 * 0.25);
    report.healthBreakdown = {
      operational: u,
      safety: s,
      compliance: c,
      mechanical: 75,
      financial: 70,
    };

    return FleetKPI.create(report);
  }

  static async comparePeriods(organization, periodType, period1Start, period2Start) {
    const p1 = await FleetKPI.findOne({
      organization,
      'period.type': periodType,
      'period.startDate': new Date(period1Start),
    });
    const p2 = await FleetKPI.findOne({
      organization,
      'period.type': periodType,
      'period.startDate': new Date(period2Start),
    });
    if (!p1 || !p2) return null;

    const calcChange = (a, b) => (b !== 0 ? Math.round(((a - b) / b) * 100) : 0);

    return {
      period1: p1,
      period2: p2,
      changes: {
        utilizationRate: calcChange(p2.utilization.utilizationRate, p1.utilization.utilizationRate),
        totalCost: calcChange(p2.costs.totalCost, p1.costs.totalCost),
        fuelConsumption: calcChange(p2.fuel.averageConsumption, p1.fuel.averageConsumption),
        safetyScore: calcChange(p2.safety.safetyScore, p1.safety.safetyScore),
        fleetHealthIndex: calcChange(p2.fleetHealthIndex, p1.fleetHealthIndex),
      },
    };
  }

  static async getTrend(organization, periodType, months = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    return FleetKPI.find({
      organization,
      'period.type': periodType,
      'period.startDate': { $gte: startDate },
      isActive: true,
    })
      .sort({ 'period.startDate': 1 })
      .select(
        'period fleetHealthIndex utilization.utilizationRate costs.totalCost costs.costPerKm safety.safetyScore fuel.averageConsumption'
      );
  }

  static async getDashboardSummary(organization) {
    const latest = await this.getLatest(organization, 'monthly');
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1);
    const previous = await FleetKPI.findOne({
      organization,
      'period.type': 'monthly',
      'period.startDate': { $lte: previousMonth },
      isActive: true,
    }).sort({ 'period.startDate': -1 });

    return {
      current: latest,
      previous,
      trend:
        latest && previous
          ? {
              healthChange: (latest.fleetHealthIndex || 0) - (previous.fleetHealthIndex || 0),
              costChange: (latest.costs?.totalCost || 0) - (previous.costs?.totalCost || 0),
              safetyChange: (latest.safety?.safetyScore || 0) - (previous.safety?.safetyScore || 0),
            }
          : null,
    };
  }
}

module.exports = FleetKPIService;
