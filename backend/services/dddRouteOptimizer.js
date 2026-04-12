'use strict';
/**
 * RouteOptimizer Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddRouteOptimizer.js
 */

const {
  DDDRoute,
  DDDRouteExecution,
  DDDServiceZone,
  DDDETACalculation,
  ROUTE_TYPES,
  ROUTE_STATUSES,
  ZONE_TYPES,
  OPTIMIZATION_CRITERIA,
  TRAFFIC_CONDITIONS,
  ETA_STATUSES,
  BUILTIN_ROUTES,
} = require('../models/DddRouteOptimizer');

const BaseCrudService = require('./base/BaseCrudService');

class RouteOptimizer extends BaseCrudService {
  constructor() {
    super('RouteOptimizer', {
      description: 'Route planning, optimization & zone management',
      version: '1.0.0',
    }, {
      routes: DDDRoute,
      routeExecutions: DDDRouteExecution,
      serviceZones: DDDServiceZone,
      eTACalculations: DDDETACalculation,
    })
  }

  async initialize() {
    await this._seedRoutes();
    this.log('Route Optimizer initialised ✓');
    return true;
  }

  async _seedRoutes() {
    for (const r of BUILTIN_ROUTES) {
      const exists = await DDDRoute.findOne({ code: r.code }).lean();
      if (!exists) await DDDRoute.create(r);
    }
  }

  /* ── Routes ── */
  async listRoutes(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.status) q.status = filters.status;
    return DDDRoute.find(q).sort({ name: 1 }).lean();
  }
  async getRoute(id) { return this._getById(DDDRoute, id); }
  async createRoute(data) { return this._create(DDDRoute, data); }
  async updateRoute(id, data) { return this._update(DDDRoute, id, data); }
  async optimizeRoute(id) {
    const route = await DDDRoute.findById(id);
    if (!route) return null;
    route.status = 'optimized';
    await route.save();
    return route.toObject();
  }

  /* ── Executions ── */
  async listExecutions(filters = {}) {
    const q = {};
    if (filters.routeId) q.routeId = filters.routeId;
    if (filters.status) q.status = filters.status;
    return DDDRouteExecution.find(q).sort({ plannedDepartureTime: -1 }).limit(100).lean();
  }
  async startExecution(data) {
    if (!data.executionCode) data.executionCode = `REXEC-${Date.now()}`;
    data.status = 'in_progress';
    data.actualDepartureTime = new Date();
    return DDDRouteExecution.create(data);
  }
  async completeExecution(id, details) {
    return DDDRouteExecution.findByIdAndUpdate(
      id,
      { ...details, status: 'completed', actualArrivalTime: new Date() },
      { new: true }
    ).lean();
  }

  /* ── Zones ── */
  async listZones(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDServiceZone.find(q).sort({ name: 1 }).lean();
  }
  async createZone(data) {
    if (!data.zoneCode) data.zoneCode = `ZONE-${Date.now()}`;
    return DDDServiceZone.create(data);
  }
  async updateZone(id, data) { return this._update(DDDServiceZone, id, data); }

  /* ── ETA ── */
  async calculateETA(data) {
    if (!data.calcCode) data.calcCode = `ETA-${Date.now()}`;
    // Simple mock: 1 min per km fallback
    if (!data.estimatedMinutes && data.distanceKm)
      data.estimatedMinutes = Math.ceil(data.distanceKm * 1.5);
    if (!data.estimatedArrival && data.estimatedMinutes)
      data.estimatedArrival = new Date(Date.now() + data.estimatedMinutes * 60000);
    return DDDETACalculation.create(data);
  }
  async getETA(id) { return this._getById(DDDETACalculation, id); }
  async listETAs(filters = {}) {
    const q = {};
    if (filters.routeId) q.routeId = filters.routeId;
    return DDDETACalculation.find(q).sort({ calculatedAt: -1 }).limit(50).lean();
  }

  /* ── Analytics ── */
  async getRouteAnalytics() {
    const [routes, executions, zones, etas] = await Promise.all([
      DDDRoute.countDocuments(),
      DDDRouteExecution.countDocuments(),
      DDDServiceZone.countDocuments(),
      DDDETACalculation.countDocuments(),
    ]);
    const activeRoutes = await DDDRoute.countDocuments({
      isActive: true,
      status: { $in: ['active', 'optimized'] },
    });
    return { routes, executions, zones, etas, activeRoutes };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new RouteOptimizer();
