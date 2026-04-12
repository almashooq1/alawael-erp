'use strict';
/**
 * DddSupplyChainTracker — Mongoose Models & Constants
 * Auto-extracted from services/dddSupplyChainTracker.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

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

/* ═══════════════════ Schemas ═══════════════════ */

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


/* ═══════════════════ Models ═══════════════════ */

const DDDShipment = mongoose.models.DDDShipment || mongoose.model('DDDShipment', shipmentSchema);

/* ── Delivery Route ────────────────────────────────────────────────────── */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  SHIPMENT_STATUSES,
  SHIPMENT_TYPES,
  TRANSPORT_MODES,
  EVENT_TYPES,
  PRIORITY_LEVELS,
  PARTNER_TYPES,
  BUILTIN_PARTNERS,
  DDDLogisticsPartner,
  DDDShipment,
  DDDDeliveryRoute,
  DDDSupplyChainEvent,
};
