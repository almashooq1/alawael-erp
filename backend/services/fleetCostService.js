/**
 * Fleet Cost Analytics Service - خدمة تحليلات تكاليف الأسطول
 *
 * إدارة الميزانيات وتحليل التكاليف وتقارير العائد على الاستثمار
 */

const FleetBudget = require('../models/FleetBudget');
const Vehicle = require('../models/Vehicle');
const logger = require('../utils/logger');

class FleetCostService {
  /**
   * إنشاء ميزانية جديدة
   */
  static async createBudget(data) {
    const budget = new FleetBudget(data);
    await budget.save();
    logger.info(`Fleet budget created: ${budget.name}`);
    return budget;
  }

  /**
   * جلب جميع الميزانيات
   */
  static async getAllBudgets(filters = {}, page = 1, limit = 20) {
    const query = {};
    if (filters.status) query.status = filters.status;
    if (filters.year) query['period.year'] = filters.year;
    if (filters.organization) query.organization = filters.organization;

    const [budgets, total] = await Promise.all([
      FleetBudget.find(query)
        .populate('createdBy', 'name email')
        .populate('approvedBy', 'name email')
        .limit(limit)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 }),
      FleetBudget.countDocuments(query),
    ]);

    return { budgets, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * جلب ميزانية بالـ ID
   */
  static async getBudgetById(id) {
    return FleetBudget.findById(id)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('costPerVehicle.vehicleId', 'plateNumber type');
  }

  /**
   * تحديث ميزانية
   */
  static async updateBudget(id, data) {
    return FleetBudget.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /**
   * إضافة سجل تكلفة
   */
  static async addCostEntry(budgetId, entry) {
    const budget = await FleetBudget.findById(budgetId);
    if (!budget) return null;

    budget.costEntries.push(entry);

    // تحديث الفئة المناسبة
    const categoryMap = {
      fuel: 'fuel',
      maintenance: 'maintenance',
      insurance: 'insurance',
      registration: 'registration',
      tires: 'tires',
      toll: 'tolls',
      fine: 'fines',
      salary_driver: 'drivers',
      technology: 'technology',
    };
    const allocKey = categoryMap[entry.category] || 'other';
    if (budget.allocations[allocKey]) {
      budget.allocations[allocKey].actual += entry.amount;
    }

    await budget.save();
    logger.info(
      `Cost entry added to budget ${budget.name}: ${entry.category} - ${entry.amount} SAR`
    );
    return budget;
  }

  /**
   * حذف سجل تكلفة
   */
  static async removeCostEntry(budgetId, entryId) {
    const budget = await FleetBudget.findById(budgetId);
    if (!budget) return null;

    const entry = budget.costEntries.id(entryId);
    if (!entry) return null;

    const categoryMap = {
      fuel: 'fuel',
      maintenance: 'maintenance',
      insurance: 'insurance',
      registration: 'registration',
      tires: 'tires',
      toll: 'tolls',
      fine: 'fines',
      salary_driver: 'drivers',
      technology: 'technology',
    };
    const allocKey = categoryMap[entry.category] || 'other';
    if (budget.allocations[allocKey]) {
      budget.allocations[allocKey].actual -= entry.amount;
    }

    budget.costEntries.pull(entryId);
    await budget.save();
    return budget;
  }

  /**
   * الموافقة على ميزانية
   */
  static async approveBudget(budgetId, userId) {
    const budget = await FleetBudget.findById(budgetId);
    if (!budget) return null;

    budget.status = 'approved';
    budget.approvedBy = userId;
    await budget.save();
    return budget;
  }

  /**
   * تحليل التكلفة الإجمالية للملكية (TCO)
   */
  static async calculateTCO(vehicleId, periodMonths = 12) {
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return null;

    const budgets = await FleetBudget.find({
      'costEntries.vehicleId': vehicleId,
      createdAt: { $gte: new Date(Date.now() - periodMonths * 30 * 24 * 60 * 60 * 1000) },
    });

    const costBreakdown = {
      fuel: 0,
      maintenance: 0,
      insurance: 0,
      registration: 0,
      tires: 0,
      fines: 0,
      depreciation: 0,
      other: 0,
    };

    budgets.forEach(b => {
      b.costEntries
        .filter(e => e.vehicleId?.toString() === vehicleId)
        .forEach(e => {
          const key = costBreakdown.hasOwnProperty(e.category) ? e.category : 'other';
          costBreakdown[key] += e.amount;
        });
    });

    const totalCost = Object.values(costBreakdown).reduce((a, b) => a + b, 0);
    const estimatedDepreciation = (vehicle.purchasePrice || 0) * 0.15 * (periodMonths / 12);
    costBreakdown.depreciation = estimatedDepreciation;

    return {
      vehicleId,
      plateNumber: vehicle.plateNumber,
      periodMonths,
      totalCostOfOwnership: totalCost + estimatedDepreciation,
      costBreakdown,
      costPerMonth: (totalCost + estimatedDepreciation) / periodMonths,
      costPerKm: vehicle.totalKm > 0 ? (totalCost / vehicle.totalKm).toFixed(3) : 'N/A',
    };
  }

  /**
   * تقرير مقارنة التكاليف بين المركبات
   */
  static async getVehicleCostComparison(vehicleIds, period) {
    const comparisons = await Promise.all(vehicleIds.map(id => this.calculateTCO(id, period)));
    return comparisons
      .filter(Boolean)
      .sort((a, b) => a.totalCostOfOwnership - b.totalCostOfOwnership);
  }

  /**
   * تنبيهات تجاوز الميزانية
   */
  static async getBudgetAlerts(organizationId) {
    const budgets = await FleetBudget.find({
      status: { $in: ['active', 'exceeded'] },
      organization: organizationId,
    });

    const alerts = [];
    budgets.forEach(b => {
      const usagePercent = b.totalBudget > 0 ? (b.totalActual / b.totalBudget) * 100 : 0;
      if (usagePercent >= b.alerts.criticalThreshold) {
        alerts.push({
          budgetId: b._id,
          name: b.name,
          level: 'critical',
          usagePercent: usagePercent.toFixed(1),
          remaining: b.variance,
        });
      } else if (usagePercent >= b.alerts.warningThreshold) {
        alerts.push({
          budgetId: b._id,
          name: b.name,
          level: 'warning',
          usagePercent: usagePercent.toFixed(1),
          remaining: b.variance,
        });
      }
    });

    return alerts;
  }

  /**
   * إحصائيات عامة
   */
  static async getOverallStatistics(organizationId, year) {
    const match = {};
    if (organizationId) match.organization = organizationId;
    if (year) match['period.year'] = year;

    const stats = await FleetBudget.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          totalBudget: { $sum: '$totalBudget' },
          totalActual: { $sum: '$totalActual' },
          totalVariance: { $sum: '$variance' },
          budgetCount: { $sum: 1 },
          avgVariancePercent: { $avg: '$variancePercent' },
        },
      },
    ]);

    // تفصيل بالفئات
    const categoryTotals = await FleetBudget.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          fuelBudget: { $sum: '$allocations.fuel.budget' },
          fuelActual: { $sum: '$allocations.fuel.actual' },
          maintenanceBudget: { $sum: '$allocations.maintenance.budget' },
          maintenanceActual: { $sum: '$allocations.maintenance.actual' },
          insuranceBudget: { $sum: '$allocations.insurance.budget' },
          insuranceActual: { $sum: '$allocations.insurance.actual' },
          tiresBudget: { $sum: '$allocations.tires.budget' },
          tiresActual: { $sum: '$allocations.tires.actual' },
          driversBudget: { $sum: '$allocations.drivers.budget' },
          driversActual: { $sum: '$allocations.drivers.actual' },
        },
      },
    ]);

    return {
      summary: stats[0] || { totalBudget: 0, totalActual: 0, totalVariance: 0 },
      categories: categoryTotals[0] || {},
    };
  }

  /**
   * تقرير التكاليف الشهري
   */
  static async getMonthlyCostReport(organizationId, year) {
    const match = { 'period.year': year || new Date().getFullYear() };
    if (organizationId) match.organization = organizationId;

    return FleetBudget.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$period.month',
          budget: { $sum: '$totalBudget' },
          actual: { $sum: '$totalActual' },
          variance: { $sum: '$variance' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }
}

module.exports = FleetCostService;
