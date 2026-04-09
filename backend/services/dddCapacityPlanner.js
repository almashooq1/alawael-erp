'use strict';
/**
 * ═══════════════════════════════════════════════════════════════
 *  DDD Capacity Planner — Phase 14 (2/4)
 *  Capacity forecasting, demand planning, bottleneck detection
 * ═══════════════════════════════════════════════════════════════
 */
const mongoose = require('mongoose');
const { Router } = require('express');

/* ── helpers ── */
const model = name => {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
};
const oid = v => {
  try {
    return new mongoose.Types.ObjectId(String(v));
  } catch {
    return v;
  }
};
const safe = fn => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (e) {
    next(e);
  }
};

/* ══════════════════════════════════════════════════════════════
   1) CONSTANTS
   ══════════════════════════════════════════════════════════════ */

const PLANNING_HORIZONS = ['daily', 'weekly', 'monthly', 'quarterly', 'annual'];

const DEMAND_CATEGORIES = [
  'speech_therapy',
  'occupational_therapy',
  'physical_therapy',
  'behavioral_therapy',
  'psychology',
  'group_therapy',
  'telerehab',
  'assessment',
  'family_session',
  'consultation',
];

const BOTTLENECK_TYPES = [
  'resource_shortage',
  'room_unavailable',
  'skill_gap',
  'equipment_limit',
  'scheduling_conflict',
  'high_demand',
  'staff_overload',
  'waitlist_overflow',
];

const FORECAST_METHODS = [
  'moving_average',
  'weighted_average',
  'linear_regression',
  'seasonal_decomposition',
  'exponential_smoothing',
];

const BUILTIN_CAPACITY_RULES = [
  {
    code: 'CAP-MAX-DAILY-SESSIONS',
    name: 'Max Daily Sessions per Therapist',
    nameAr: 'الحد الأقصى للجلسات اليومية',
    threshold: 8,
    unit: 'sessions',
  },
  {
    code: 'CAP-MIN-BREAK',
    name: 'Minimum Break Between Sessions',
    nameAr: 'الحد الأدنى للاستراحة بين الجلسات',
    threshold: 15,
    unit: 'minutes',
  },
  {
    code: 'CAP-ROOM-TURNOVER',
    name: 'Room Turnover Time',
    nameAr: 'وقت تجهيز الغرفة',
    threshold: 10,
    unit: 'minutes',
  },
  {
    code: 'CAP-UTILIZATION-TARGET',
    name: 'Target Utilization Rate',
    nameAr: 'معدل الاستخدام المستهدف',
    threshold: 80,
    unit: 'percent',
  },
  {
    code: 'CAP-WAITLIST-MAX',
    name: 'Max Waitlist Size per Service',
    nameAr: 'الحد الأقصى لقائمة الانتظار',
    threshold: 50,
    unit: 'beneficiaries',
  },
  {
    code: 'CAP-OVERBOOKING-LIMIT',
    name: 'Overbooking Limit',
    nameAr: 'حد الحجز الزائد',
    threshold: 10,
    unit: 'percent',
  },
  {
    code: 'CAP-ADVANCE-BOOKING',
    name: 'Max Advance Booking Window',
    nameAr: 'نافذة الحجز المسبق',
    threshold: 90,
    unit: 'days',
  },
  {
    code: 'CAP-CANCELLATION-BUFFER',
    name: 'Cancellation Buffer',
    nameAr: 'فترة الإلغاء',
    threshold: 24,
    unit: 'hours',
  },
];

/* ══════════════════════════════════════════════════════════════
   2) SCHEMAS
   ══════════════════════════════════════════════════════════════ */

/* ── Capacity Plan Schema ── */
const capacityPlanSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    nameAr: String,
    horizon: { type: String, enum: PLANNING_HORIZONS, required: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true },
    department: String,
    serviceType: { type: String, enum: DEMAND_CATEGORIES },
    targets: {
      totalSlots: Number,
      targetUtilization: { type: Number, default: 80 },
      maxWaitDays: { type: Number, default: 14 },
      minStaffCount: Number,
    },
    currentMetrics: {
      actualUtilization: Number,
      averageWaitDays: Number,
      activeStaff: Number,
      totalBookings: Number,
      cancellationRate: Number,
    },
    status: {
      type: String,
      enum: ['draft', 'active', 'completed', 'archived'],
      default: 'draft',
      index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDCapacityPlan =
  model('DDDCapacityPlan') || mongoose.model('DDDCapacityPlan', capacityPlanSchema);

/* ── Demand Forecast Schema ── */
const demandForecastSchema = new mongoose.Schema(
  {
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'DDDCapacityPlan', index: true },
    serviceType: { type: String, enum: DEMAND_CATEGORIES, required: true, index: true },
    period: { type: String, required: true }, // e.g., "2025-W03", "2025-01"
    method: { type: String, enum: FORECAST_METHODS, default: 'moving_average' },
    predictedDemand: { type: Number, required: true },
    actualDemand: Number,
    confidence: { type: Number, min: 0, max: 100 },
    variance: Number, // actual - predicted
    factors: [
      {
        name: String,
        impact: Number, // -100 to 100
        description: String,
      },
    ],
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

demandForecastSchema.index({ serviceType: 1, period: 1 });

const DDDDemandForecast =
  model('DDDDemandForecast') || mongoose.model('DDDDemandForecast', demandForecastSchema);

/* ── Bottleneck Schema ── */
const bottleneckSchema = new mongoose.Schema(
  {
    type: { type: String, enum: BOTTLENECK_TYPES, required: true, index: true },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true,
      index: true,
    },
    department: String,
    serviceType: { type: String, enum: DEMAND_CATEGORIES },
    resourceType: String,
    description: { type: String, required: true },
    descriptionAr: String,
    impact: {
      affectedBeneficiaries: Number,
      delayDays: Number,
      revenueImpact: Number,
    },
    recommendation: String,
    recommendationAr: String,
    detectedAt: { type: Date, default: Date.now, index: true },
    resolvedAt: Date,
    status: {
      type: String,
      enum: ['open', 'acknowledged', 'in_progress', 'resolved'],
      default: 'open',
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tenant: { type: String, default: 'default', index: true },
  },
  { timestamps: true }
);

const DDDBottleneck = model('DDDBottleneck') || mongoose.model('DDDBottleneck', bottleneckSchema);

/* ══════════════════════════════════════════════════════════════
   3) DOMAIN SERVICE — CapacityPlanner
   ══════════════════════════════════════════════════════════════ */

class CapacityPlannerService {
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

  async createPlan(data) {
    return DDDCapacityPlan.create(data);
  }

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

const capacityPlannerService = new CapacityPlannerService();

/* ══════════════════════════════════════════════════════════════
   4) ROUTER
   ══════════════════════════════════════════════════════════════ */

function createCapacityPlannerRouter() {
  const r = Router();

  /* ── Plans ── */
  r.get(
    '/capacity-planner/plans',
    safe(async (req, res) => {
      res.json({ success: true, ...(await capacityPlannerService.listPlans(req.query)) });
    })
  );

  r.get(
    '/capacity-planner/plans/:id',
    safe(async (req, res) => {
      const doc = await capacityPlannerService.getPlan(req.params.id);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  r.post(
    '/capacity-planner/plans',
    safe(async (req, res) => {
      const doc = await capacityPlannerService.createPlan(req.body);
      res.status(201).json({ success: true, data: doc });
    })
  );

  r.put(
    '/capacity-planner/plans/:id',
    safe(async (req, res) => {
      const doc = await capacityPlannerService.updatePlan(req.params.id, req.body);
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  r.delete(
    '/capacity-planner/plans/:id',
    safe(async (req, res) => {
      await capacityPlannerService.deletePlan(req.params.id);
      res.json({ success: true, message: 'Archived' });
    })
  );

  /* ── Forecasts ── */
  r.get(
    '/capacity-planner/forecasts',
    safe(async (req, res) => {
      const data = await capacityPlannerService.listForecasts(req.query);
      res.json({ success: true, data });
    })
  );

  r.post(
    '/capacity-planner/forecasts/generate',
    safe(async (req, res) => {
      const { planId, serviceType, periods } = req.body;
      if (!serviceType)
        return res.status(400).json({ success: false, error: 'serviceType required' });
      const data = await capacityPlannerService.generateForecast(planId, serviceType, periods);
      res.status(201).json({ success: true, data });
    })
  );

  /* ── Bottlenecks ── */
  r.get(
    '/capacity-planner/bottlenecks',
    safe(async (req, res) => {
      res.json({ success: true, ...(await capacityPlannerService.listBottlenecks(req.query)) });
    })
  );

  r.post(
    '/capacity-planner/bottlenecks/detect',
    safe(async (req, res) => {
      const data = await capacityPlannerService.detectBottlenecks(req.query.tenant);
      res.json({ success: true, data, detected: data.length });
    })
  );

  r.put(
    '/capacity-planner/bottlenecks/:id/resolve',
    safe(async (req, res) => {
      const doc = await capacityPlannerService.resolveBottleneck(
        req.params.id,
        req.body.resolution
      );
      doc
        ? res.json({ success: true, data: doc })
        : res.status(404).json({ success: false, error: 'Not found' });
    })
  );

  /* ── Gap Analysis ── */
  r.get(
    '/capacity-planner/gap-analysis',
    safe(async (req, res) => {
      const data = await capacityPlannerService.gapAnalysis(
        req.query.department,
        req.query.horizon
      );
      res.json({ success: true, data });
    })
  );

  /* ── Stats ── */
  r.get(
    '/capacity-planner/stats',
    safe(async (req, res) => {
      const data = await capacityPlannerService.getStats(req.query.tenant);
      res.json({ success: true, data });
    })
  );

  /* ── Meta ── */
  r.get('/capacity-planner/meta', (_req, res) => {
    res.json({
      success: true,
      planningHorizons: PLANNING_HORIZONS,
      demandCategories: DEMAND_CATEGORIES,
      bottleneckTypes: BOTTLENECK_TYPES,
      forecastMethods: FORECAST_METHODS,
      builtinCapacityRules: BUILTIN_CAPACITY_RULES,
    });
  });

  return r;
}

/* ══════════════════════════════════════════════════════════════
   5) EXPORTS
   ══════════════════════════════════════════════════════════════ */

module.exports = {
  DDDCapacityPlan,
  DDDDemandForecast,
  DDDBottleneck,
  CapacityPlannerService,
  capacityPlannerService,
  createCapacityPlannerRouter,
  PLANNING_HORIZONS,
  DEMAND_CATEGORIES,
  BOTTLENECK_TYPES,
  FORECAST_METHODS,
  BUILTIN_CAPACITY_RULES,
};
