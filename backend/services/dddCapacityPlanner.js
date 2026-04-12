'use strict';
/**
 * ═══════════════════════════════════════════════════════════════
 *  DDD Capacity Planner — Phase 14 (2/4)
 *  Capacity forecasting, demand planning, bottleneck detection
 * ═══════════════════════════════════════════════════════════════
 */

const { PLANNING_HORIZONS, DEMAND_CATEGORIES, BOTTLENECK_TYPES, FORECAST_METHODS, BUILTIN_CAPACITY_RULES } = require('../models/DddCapacityPlanner');

const BaseCrudService = require('./base/BaseCrudService');

class CapacityPlannerService extends BaseCrudService {
  /* ── Plans CRUD ── */
  async listPlans(filter = {}) {
    const q = {};
    if (filter.status) q.status = filter.status;
    if (filter.horizon) q.horizon = filter.horizon;
    if (filter.department) q.department = filter.department;
    if (filter.tenant) q.tenant = filter.tenant;
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDCapacityPlan.find(q)
        .sort({ startDate: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DDDCapacityPlan.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async getPlan(id) {
    return DDDCapacityPlan.findById(oid(id)).lean();
  }

  async createPlan(data) { return this._create(DDDCapacityPlan, data); }

  async updatePlan(id, data) {
    return DDDCapacityPlan.findByIdAndUpdate(
      oid(id),
      { $set: data },
      { new: true, runValidators: true }
    ).lean();
  }

  async deletePlan(id) {
    return DDDCapacityPlan.findByIdAndUpdate(
      oid(id),
      { $set: { status: 'archived' } },
      { new: true }
    ).lean();
  }

  /* ── Forecasts ── */
  async generateForecast(planId, serviceType, periods = 4) {
    // Simple moving average forecast based on historical allocations
    const ResourceAlloc = model('DDDResourceAllocation');
    const historicalData = [];

    if (ResourceAlloc) {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const allocs = await ResourceAlloc.aggregate([
        {
          $match: { status: { $in: ['confirmed', 'completed'] }, startAt: { $gte: sixMonthsAgo } },
        },
        { $group: { _id: { $week: '$startAt' }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      historicalData.push(...allocs.map(a => a.count));
    }

    const avg =
      historicalData.length > 0
        ? historicalData.reduce((s, v) => s + v, 0) / historicalData.length
        : 20; // default assumption

    const forecasts = [];
    for (let i = 1; i <= periods; i++) {
      const predicted = Math.round(avg * (1 + i * 0.02)); // slight growth trend
      forecasts.push(
        await DDDDemandForecast.create({
          planId: planId ? oid(planId) : undefined,
          serviceType,
          period: `forecast-period-${i}`,
          method: 'moving_average',
          predictedDemand: predicted,
          confidence: Math.max(50, 95 - i * 10),
        })
      );
    }

    return forecasts;
  }

  async listForecasts(filter = {}) {
    const q = {};
    if (filter.planId) q.planId = oid(filter.planId);
    if (filter.serviceType) q.serviceType = filter.serviceType;
    if (filter.tenant) q.tenant = filter.tenant;
    return DDDDemandForecast.find(q).sort({ period: 1 }).lean();
  }

  /* ── Bottleneck Detection ── */
  async detectBottlenecks(tenant = 'default') {
    const bottlenecks = [];
    const Resource = model('DDDResource');
    const ResourceAlloc = model('DDDResourceAllocation');

    if (Resource && ResourceAlloc) {
      // Check resource over-utilization
      const resources = await Resource.find({ isActive: true, tenant }).lean();
      const now = new Date();
      const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      for (const r of resources) {
        const bookings = await ResourceAlloc.countDocuments({
          resourceId: r._id,
          status: { $in: ['confirmed', 'tentative'] },
          startAt: { $gte: now, $lte: weekAhead },
        });

        const maxWeekly = (r.capacity || 1) * 40; // rough weekly capacity
        if (bookings > maxWeekly * 0.9) {
          bottlenecks.push({
            type: 'staff_overload',
            severity: bookings > maxWeekly ? 'critical' : 'high',
            resourceType: r.type,
            description: `Resource ${r.name} is at ${Math.round((bookings / maxWeekly) * 100)}% capacity for next 7 days`,
            impact: { affectedBeneficiaries: bookings, delayDays: 2 },
            recommendation: `Consider redistributing load or adding capacity for ${r.type}`,
            tenant,
          });
        }
      }
    }

    // Save detected bottlenecks
    if (bottlenecks.length > 0) {
      await DDDBottleneck.insertMany(bottlenecks);
    }

    return bottlenecks;
  }

  async listBottlenecks(filter = {}) {
    const q = {};
    if (filter.status) q.status = filter.status;
    if (filter.severity) q.severity = filter.severity;
    if (filter.type) q.type = filter.type;
    if (filter.tenant) q.tenant = filter.tenant;
    const page = Math.max(1, parseInt(filter.page) || 1);
    const limit = Math.min(100, parseInt(filter.limit) || 25);
    const [docs, total] = await Promise.all([
      DDDBottleneck.find(q)
        .sort({ detectedAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      DDDBottleneck.countDocuments(q),
    ]);
    return { data: docs, total, page, pages: Math.ceil(total / limit) };
  }

  async resolveBottleneck(id, resolution) {
    return DDDBottleneck.findByIdAndUpdate(
      oid(id),
      {
        $set: { status: 'resolved', resolvedAt: new Date(), recommendation: resolution },
      },
      { new: true }
    ).lean();
  }

  /* ── Capacity Gap Analysis ── */
  async gapAnalysis(department, horizon = 'monthly') {
    const resources = model('DDDResource');
    const q = { isActive: true };
    if (department) q.department = department;

    const staffByType = resources
      ? await resources.aggregate([
          { $match: q },
          { $group: { _id: '$type', count: { $sum: 1 }, totalCapacity: { $sum: '$capacity' } } },
        ])
      : [];

    const demandByService = await DDDDemandForecast.aggregate([
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$serviceType', avgDemand: { $avg: '$predictedDemand' } } },
    ]);

    const gaps = [];
    for (const demand of demandByService) {
      const matchingStaff = staffByType.find(s => s._id === demand._id);
      const supply = matchingStaff ? matchingStaff.totalCapacity * 40 : 0; // weekly capacity
      const gap = demand.avgDemand - supply;
      if (gap > 0) {
        gaps.push({
          serviceType: demand._id,
          demand: Math.round(demand.avgDemand),
          supply,
          gap: Math.round(gap),
          gapPercent: supply > 0 ? Math.round((gap / supply) * 100) : 100,
          recommendation: `Need ${Math.ceil(gap / 40)} additional resources for ${demand._id}`,
        });
      }
    }

    return { department, horizon, gaps, analysedAt: new Date() };
  }

  /* ── Stats ── */
  async getStats(tenant = 'default') {
    const [planCount, forecastCount, openBottlenecks, criticalBottlenecks] = await Promise.all([
      DDDCapacityPlan.countDocuments({ tenant }),
      DDDDemandForecast.countDocuments({ tenant }),
      DDDBottleneck.countDocuments({ status: 'open', tenant }),
      DDDBottleneck.countDocuments({ severity: 'critical', status: { $ne: 'resolved' }, tenant }),
    ]);

    return {
      planCount,
      forecastCount,
      openBottlenecks,
      criticalBottlenecks,
      capacityRules: BUILTIN_CAPACITY_RULES.length,
    };
  }
}

module.exports = new CapacityPlannerService();
