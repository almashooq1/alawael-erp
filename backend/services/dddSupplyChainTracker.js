'use strict';
/**
 * SupplyChainTracker Service — Pure Business Logic
 * Singleton export — use directly, do NOT call `new`.
 * Models: ../models/DddSupplyChainTracker.js
 */

const {
  DDDLogisticsPartner,
  DDDShipment,
  DDDDeliveryRoute,
  DDDSupplyChainEvent,
  SHIPMENT_STATUSES,
  SHIPMENT_TYPES,
  TRANSPORT_MODES,
  EVENT_TYPES,
  PRIORITY_LEVELS,
  PARTNER_TYPES,
  BUILTIN_PARTNERS,
} = require('../models/DddSupplyChainTracker');

const BaseCrudService = require('./base/BaseCrudService');

class SupplyChainTracker extends BaseCrudService {
  constructor() {
    super('SupplyChainTracker', {
      description: 'Shipment tracking, logistics & supply chain visibility',
      version: '1.0.0',
    }, {
      logisticsPartners: DDDLogisticsPartner,
      shipments: DDDShipment,
      deliveryRoutes: DDDDeliveryRoute,
      supplyChainEvents: DDDSupplyChainEvent,
    })
  }

  async initialize() {
    await this._seedPartners();
    this.log('Supply Chain Tracker initialised ✓');
    return true;
  }

  async _seedPartners() {
    for (const p of BUILTIN_PARTNERS) {
      const exists = await DDDLogisticsPartner.findOne({ code: p.code }).lean();
      if (!exists) await DDDLogisticsPartner.create(p);
    }
  }

  /* ── Partners ── */
  async listPartners(filters = {}) {
    const q = {};
    if (filters.type) q.type = filters.type;
    if (filters.isActive !== undefined) q.isActive = filters.isActive;
    return DDDLogisticsPartner.find(q).sort({ name: 1 }).lean();
  }
  async getPartner(id) { return this._getById(DDDLogisticsPartner, id); }
  async createPartner(data) { return this._create(DDDLogisticsPartner, data); }
  async updatePartner(id, data) { return this._update(DDDLogisticsPartner, id, data, { runValidators: true }); }

  /* ── Shipments ── */
  async listShipments(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.type) q.type = filters.type;
    if (filters.partnerId) q.partnerId = filters.partnerId;
    if (filters.priority) q.priority = filters.priority;
    return DDDShipment.find(q).sort({ createdAt: -1 }).lean();
  }
  async getShipment(id) { return this._getById(DDDShipment, id); }
  async getShipmentByTracking(trackingNumber) {
    return DDDShipment.findOne({ trackingNumber }).lean();
  }

  async createShipment(data) {
    if (!data.trackingNumber)
      data.trackingNumber = `SHP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    return DDDShipment.create(data);
  }

  async updateShipmentStatus(id, status, eventData = {}) {
    const shipment = await DDDShipment.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!shipment) throw new Error('Shipment not found');

    await DDDSupplyChainEvent.create({
      shipmentId: id,
      eventType: this._statusToEventType(status),
      timestamp: new Date(),
      ...eventData,
    });

    if (status === 'delivered') {
      shipment.deliveredAt = new Date();
      shipment.actualDeliveryDate = new Date();
      await shipment.save();
    }
    return shipment;
  }

  _statusToEventType(status) {
    const map = {
      picked_up: 'picked',
      in_transit: 'shipped',
      out_for_delivery: 'out_for_delivery',
      delivered: 'delivered',
      failed_delivery: 'delivery_attempted',
      returned: 'returned',
    };
    return map[status] || 'in_transit_scan';
  }

  /* ── Events ── */
  async listEvents(shipmentId) {
    return DDDSupplyChainEvent.find({ shipmentId }).sort({ timestamp: -1 }).lean();
  }
  async addEvent(data) { return this._create(DDDSupplyChainEvent, data); }

  /* ── Routes ── */
  async listRoutes(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.partnerId) q.partnerId = filters.partnerId;
    return DDDDeliveryRoute.find(q).sort({ startTime: -1 }).lean();
  }
  async getRoute(id) { return this._getById(DDDDeliveryRoute, id); }
  async createRoute(data) {
    if (!data.routeCode) data.routeCode = `RT-${Date.now()}`;
    return DDDDeliveryRoute.create(data);
  }
  async updateRoute(id, data) { return this._update(DDDDeliveryRoute, id, data, { runValidators: true }); }

  async updateRouteStop(routeId, stopIndex, updateData) {
    const route = await DDDDeliveryRoute.findById(routeId);
    if (!route || !route.stops[stopIndex]) throw new Error('Route or stop not found');
    Object.assign(route.stops[stopIndex], updateData);
    const allCompleted = route.stops.every(s => s.status === 'completed' || s.status === 'skipped');
    if (allCompleted) route.status = 'completed';
    await route.save();
    return route;
  }

  /* ── Analytics ── */
  async getSupplyChainAnalytics() {
    const [shipments, partners, routes, events] = await Promise.all([
      DDDShipment.countDocuments(),
      DDDLogisticsPartner.countDocuments(),
      DDDDeliveryRoute.countDocuments(),
      DDDSupplyChainEvent.countDocuments(),
    ]);
    const inTransit = await DDDShipment.countDocuments({ status: 'in_transit' });
    const delivered = await DDDShipment.countDocuments({ status: 'delivered' });
    const avgCost = await DDDShipment.aggregate([
      { $match: { status: 'delivered' } },
      { $group: { _id: null, avg: { $avg: '$cost' } } },
    ]);
    return {
      shipments,
      inTransit,
      delivered,
      partners,
      routes,
      events,
      avgDeliveryCost: avgCost[0]?.avg || 0,
    };
  }
}

/* ═══════════════════ Singleton Export ═══════════════════ */
module.exports = new SupplyChainTracker();
