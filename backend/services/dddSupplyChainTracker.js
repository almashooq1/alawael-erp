/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * DDD Supply Chain Tracker — Phase 18 · Supply Chain & Inventory Management
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * End-to-end supply chain visibility, shipment tracking, logistics management,
 * delivery coordination, and supply chain analytics for rehabilitation centres.
 *
 * Aggregates
 *   DDDShipment          — outbound / inbound shipment tracking
 *   DDDDeliveryRoute     — route / courier management
 *   DDDSupplyChainEvent  — chain-of-custody & milestone events
 *   DDDLogisticsPartner  — third-party logistics providers
 *
 * Canonical links
 *   purchaseOrderId → DDDPurchaseOrder (dddProcurementEngine)
 *   supplierId      → DDDSupplier (dddProcurementEngine)
 *   locationId      → DDDBranch (dddTenantManager)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;
const { Router } = require('express');

class BaseDomainModule {
  constructor(name, opts = {}) {
    this.name = name;
    this.opts = opts;
  }
  log(msg) {
    console.log(`[${this.name}] ${msg}`);
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  CONSTANTS                                                                 */
/* ═══════════════════════════════════════════════════════════════════════════ */

const SHIPMENT_STATUSES = [
  'created',
  'label_generated',
  'picked_up',
  'in_transit',
  'at_customs',
  'out_for_delivery',
  'delivered',
  'failed_delivery',
  'returned',
  'cancelled',
  'on_hold',
  'lost',
];

const SHIPMENT_TYPES = [
  'inbound_purchase',
  'inbound_return',
  'outbound_transfer',
  'outbound_patient',
  'inter_branch',
  'emergency',
  'maintenance_return',
  'sample',
  'hazardous',
  'cold_chain',
  'oversized',
  'express',
];

const TRANSPORT_MODES = [
  'road',
  'air',
  'sea',
  'rail',
  'courier',
  'express_courier',
  'own_fleet',
  'pickup',
  'drone',
  'multimodal',
];

const EVENT_TYPES = [
  'order_placed',
  'order_confirmed',
  'picked',
  'packed',
  'shipped',
  'in_transit_scan',
  'customs_clearance',
  'hub_arrival',
  'hub_departure',
  'out_for_delivery',
  'delivery_attempted',
  'delivered',
  'signature_captured',
  'exception',
  'returned',
  'damaged_reported',
];

const PRIORITY_LEVELS = [
  'standard',
  'expedited',
  'express',
  'same_day',
  'next_day',
  'critical_medical',
  'emergency',
];

const PARTNER_TYPES = [
  'freight_forwarder',
  'courier',
  'warehouse_provider',
  'customs_broker',
  'packaging_supplier',
  'cold_chain_specialist',
  'last_mile',
  'international_carrier',
  'local_transport',
  'medical_logistics',
];

/* ── Built-in logistics partners ────────────────────────────────────────── */
const BUILTIN_PARTNERS = [
  {
    code: 'LP-ARAMEX',
    name: 'Aramex',
    nameAr: 'أرامكس',
    type: 'courier',
    country: 'SA',
    isActive: true,
  },
  {
    code: 'LP-DHL',
    name: 'DHL Express',
    nameAr: 'دي إتش إل',
    type: 'international_carrier',
    country: 'DE',
    isActive: true,
  },
  {
    code: 'LP-SMSA',
    name: 'SMSA Express',
    nameAr: 'سمسا إكسبريس',
    type: 'courier',
    country: 'SA',
    isActive: true,
  },
  {
    code: 'LP-NAQEL',
    name: 'Naqel Express',
    nameAr: 'ناقل إكسبريس',
    type: 'local_transport',
    country: 'SA',
    isActive: true,
  },
  {
    code: 'LP-FEDEX',
    name: 'FedEx',
    nameAr: 'فيديكس',
    type: 'international_carrier',
    country: 'US',
    isActive: true,
  },
  {
    code: 'LP-SAL',
    name: 'Saudi Arabian Logistics',
    nameAr: 'اللوجستيات السعودية',
    type: 'freight_forwarder',
    country: 'SA',
    isActive: true,
  },
  {
    code: 'LP-MEDLOG',
    name: 'MedChain Logistics',
    nameAr: 'سلسلة اللوجستيات الطبية',
    type: 'medical_logistics',
    country: 'SA',
    isActive: true,
  },
  {
    code: 'LP-COLDCH',
    name: 'ColdStar Transport',
    nameAr: 'نقل كولدستار',
    type: 'cold_chain_specialist',
    country: 'SA',
    isActive: true,
  },
  {
    code: 'LP-ZAJIL',
    name: 'Zajil Express',
    nameAr: 'زاجل إكسبريس',
    type: 'courier',
    country: 'SA',
    isActive: true,
  },
  {
    code: 'LP-OWNFL',
    name: 'Own Fleet',
    nameAr: 'أسطول خاص',
    type: 'local_transport',
    country: 'SA',
    isActive: true,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Logistics Partner ─────────────────────────────────────────────────── */
const logisticsPartnerSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: PARTNER_TYPES, required: true },
    country: { type: String },
    contactPerson: { type: String },
    email: { type: String },
    phone: { type: String },
    website: { type: String },
    trackingUrlTemplate: { type: String },
    apiKey: { type: String },
    isActive: { type: Boolean, default: true },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

logisticsPartnerSchema.index({ type: 1, isActive: 1 });

const DDDLogisticsPartner =
  mongoose.models.DDDLogisticsPartner ||
  mongoose.model('DDDLogisticsPartner', logisticsPartnerSchema);

/* ── Shipment ──────────────────────────────────────────────────────────── */
const shipmentSchema = new Schema(
  {
    trackingNumber: { type: String, required: true, unique: true },
    type: { type: String, enum: SHIPMENT_TYPES, required: true },
    status: { type: String, enum: SHIPMENT_STATUSES, default: 'created' },
    priority: { type: String, enum: PRIORITY_LEVELS, default: 'standard' },
    transportMode: { type: String, enum: TRANSPORT_MODES, default: 'road' },
    partnerId: { type: Schema.Types.ObjectId, ref: 'DDDLogisticsPartner' },
    purchaseOrderId: { type: Schema.Types.ObjectId },
    origin: {
      locationId: Schema.Types.ObjectId,
      name: String,
      address: String,
      city: String,
      country: String,
      contactPerson: String,
      phone: String,
    },
    destination: {
      locationId: Schema.Types.ObjectId,
      name: String,
      address: String,
      city: String,
      country: String,
      contactPerson: String,
      phone: String,
    },
    items: [
      {
        itemId: Schema.Types.ObjectId,
        description: String,
        quantity: Number,
        weight: Number,
        dimensions: { length: Number, width: Number, height: Number },
      },
    ],
    totalWeight: { type: Number },
    totalPackages: { type: Number, default: 1 },
    estimatedDeliveryDate: { type: Date },
    actualDeliveryDate: { type: Date },
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    cost: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    insuranceValue: { type: Number },
    specialInstructions: { type: String },
    proofOfDelivery: { signedBy: String, signatureUrl: String, photoUrl: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

shipmentSchema.index({ status: 1, createdAt: -1 });
shipmentSchema.index({ trackingNumber: 1 });
shipmentSchema.index({ partnerId: 1 });

const DDDShipment = mongoose.models.DDDShipment || mongoose.model('DDDShipment', shipmentSchema);

/* ── Delivery Route ────────────────────────────────────────────────────── */
const deliveryRouteSchema = new Schema(
  {
    routeCode: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    partnerId: { type: Schema.Types.ObjectId, ref: 'DDDLogisticsPartner' },
    driverId: { type: Schema.Types.ObjectId },
    vehicleId: { type: String },
    stops: [
      {
        order: { type: Number },
        locationId: { type: Schema.Types.ObjectId },
        name: { type: String },
        address: { type: String },
        shipmentIds: [{ type: Schema.Types.ObjectId, ref: 'DDDShipment' }],
        estimatedArrival: { type: Date },
        actualArrival: { type: Date },
        status: { type: String, enum: ['pending', 'arrived', 'completed', 'skipped'] },
      },
    ],
    startTime: { type: Date },
    endTime: { type: Date },
    totalDistance: { type: Number },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'cancelled'],
      default: 'planned',
    },
    isRecurring: { type: Boolean, default: false },
    schedule: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

deliveryRouteSchema.index({ status: 1 });

const DDDDeliveryRoute =
  mongoose.models.DDDDeliveryRoute || mongoose.model('DDDDeliveryRoute', deliveryRouteSchema);

/* ── Supply Chain Event ────────────────────────────────────────────────── */
const supplyChainEventSchema = new Schema(
  {
    shipmentId: { type: Schema.Types.ObjectId, ref: 'DDDShipment', required: true },
    eventType: { type: String, enum: EVENT_TYPES, required: true },
    timestamp: { type: Date, default: Date.now },
    location: { type: String },
    city: { type: String },
    country: { type: String },
    description: { type: String },
    performedBy: { type: String },
    gpsCoordinates: { lat: Number, lng: Number },
    attachments: [{ name: String, url: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

supplyChainEventSchema.index({ shipmentId: 1, timestamp: -1 });

const DDDSupplyChainEvent =
  mongoose.models.DDDSupplyChainEvent ||
  mongoose.model('DDDSupplyChainEvent', supplyChainEventSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

class SupplyChainTracker extends BaseDomainModule {
  constructor() {
    super('SupplyChainTracker', {
      description: 'Shipment tracking, logistics & supply chain visibility',
      version: '1.0.0',
    });
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
  async getPartner(id) {
    return DDDLogisticsPartner.findById(id).lean();
  }
  async createPartner(data) {
    return DDDLogisticsPartner.create(data);
  }
  async updatePartner(id, data) {
    return DDDLogisticsPartner.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  /* ── Shipments ── */
  async listShipments(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.type) q.type = filters.type;
    if (filters.partnerId) q.partnerId = filters.partnerId;
    if (filters.priority) q.priority = filters.priority;
    return DDDShipment.find(q).sort({ createdAt: -1 }).lean();
  }
  async getShipment(id) {
    return DDDShipment.findById(id).lean();
  }
  async getShipmentByTracking(trackingNumber) {
    return DDDShipment.findOne({ trackingNumber }).lean();
  }

  async createShipment(data) {
    if (!data.trackingNumber)
      data.trackingNumber = `SHP-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    return DDDShipment.create(data);
  }

  async updateShipmentStatus(id, status, eventData = {}) {
    const shipment = await DDDShipment.findByIdAndUpdate(id, { status }, { new: true });
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
  async addEvent(data) {
    return DDDSupplyChainEvent.create(data);
  }

  /* ── Routes ── */
  async listRoutes(filters = {}) {
    const q = {};
    if (filters.status) q.status = filters.status;
    if (filters.partnerId) q.partnerId = filters.partnerId;
    return DDDDeliveryRoute.find(q).sort({ startTime: -1 }).lean();
  }
  async getRoute(id) {
    return DDDDeliveryRoute.findById(id).lean();
  }
  async createRoute(data) {
    if (!data.routeCode) data.routeCode = `RT-${Date.now()}`;
    return DDDDeliveryRoute.create(data);
  }
  async updateRoute(id, data) {
    return DDDDeliveryRoute.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

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

  async healthCheck() {
    const [shipments, partners, routes, events] = await Promise.all([
      DDDShipment.countDocuments(),
      DDDLogisticsPartner.countDocuments(),
      DDDDeliveryRoute.countDocuments(),
      DDDSupplyChainEvent.countDocuments(),
    ]);
    return { status: 'healthy', shipments, partners, routes, events };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ROUTER                                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

function createSupplyChainTrackerRouter() {
  const router = Router();
  const svc = new SupplyChainTracker();

  /* Partners */
  router.get('/supply-chain/partners', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listPartners(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/supply-chain/partners/:id', async (req, res) => {
    try {
      const d = await svc.getPartner(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/supply-chain/partners', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createPartner(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/supply-chain/partners/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updatePartner(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Shipments */
  router.get('/supply-chain/shipments', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listShipments(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/supply-chain/shipments/track/:trackingNumber', async (req, res) => {
    try {
      const d = await svc.getShipmentByTracking(req.params.trackingNumber);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/supply-chain/shipments/:id', async (req, res) => {
    try {
      const d = await svc.getShipment(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/supply-chain/shipments', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createShipment(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/supply-chain/shipments/:id/status', async (req, res) => {
    try {
      res.json({
        success: true,
        data: await svc.updateShipmentStatus(req.params.id, req.body.status, req.body.eventData),
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Events */
  router.get('/supply-chain/shipments/:id/events', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listEvents(req.params.id) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/supply-chain/events', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.addEvent(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Routes */
  router.get('/supply-chain/routes', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.listRoutes(req.query) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/supply-chain/routes/:id', async (req, res) => {
    try {
      const d = await svc.getRoute(req.params.id);
      d
        ? res.json({ success: true, data: d })
        : res.status(404).json({ success: false, error: 'Not found' });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.post('/supply-chain/routes', async (req, res) => {
    try {
      res.status(201).json({ success: true, data: await svc.createRoute(req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.put('/supply-chain/routes/:id', async (req, res) => {
    try {
      res.json({ success: true, data: await svc.updateRoute(req.params.id, req.body) });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  /* Analytics & Health */
  router.get('/supply-chain/analytics', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.getSupplyChainAnalytics() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  router.get('/supply-chain/health', async (_req, res) => {
    try {
      res.json({ success: true, data: await svc.healthCheck() });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  return router;
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  EXPORTS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

module.exports = {
  SupplyChainTracker,
  DDDShipment,
  DDDDeliveryRoute,
  DDDSupplyChainEvent,
  DDDLogisticsPartner,
  SHIPMENT_STATUSES,
  SHIPMENT_TYPES,
  TRANSPORT_MODES,
  EVENT_TYPES,
  PRIORITY_LEVELS,
  PARTNER_TYPES,
  BUILTIN_PARTNERS,
  createSupplyChainTrackerRouter,
};
