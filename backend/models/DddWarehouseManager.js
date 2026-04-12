'use strict';
/**
 * DddWarehouseManager — Mongoose Models & Constants
 * Auto-extracted from services/dddWarehouseManager.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const WAREHOUSE_TYPES = [
  'central',
  'satellite',
  'cold_storage',
  'hazardous_materials',
  'sterile',
  'general',
  'distribution_centre',
  'quarantine',
  'returns_processing',
  'archive',
  'mobile_unit',
];

const WAREHOUSE_STATUSES = [
  'active',
  'inactive',
  'under_maintenance',
  'full_capacity',
  'restricted',
  'decommissioned',
  'planned',
  'temporary',
];

const BIN_TYPES = [
  'shelf',
  'rack',
  'drawer',
  'cabinet',
  'floor_area',
  'cold_room',
  'freezer',
  'safe',
  'pallet_position',
  'staging_area',
  'receiving_dock',
  'shipping_dock',
];

const PICK_LIST_STATUSES = [
  'created',
  'assigned',
  'in_progress',
  'partially_picked',
  'picked',
  'packed',
  'shipped',
  'cancelled',
  'on_hold',
];

const CYCLE_COUNT_STATUSES = [
  'scheduled',
  'in_progress',
  'counting',
  'review',
  'approved',
  'adjusted',
  'completed',
  'cancelled',
];

const ZONE_TYPES = [
  'receiving',
  'storage',
  'picking',
  'packing',
  'shipping',
  'quarantine',
  'returns',
  'staging',
  'cold_chain',
  'hazardous',
  'high_value',
  'bulk',
];

/* ── Built-in warehouses ────────────────────────────────────────────────── */
const BUILTIN_WAREHOUSES = [
  {
    code: 'WH-MAIN',
    name: 'Main Distribution Warehouse',
    nameAr: 'المستودع الرئيسي للتوزيع',
    type: 'central',
    capacity: 10000,
  },
  {
    code: 'WH-REHAB',
    name: 'Rehabilitation Equipment Store',
    nameAr: 'مخزن معدات التأهيل',
    type: 'general',
    capacity: 3000,
  },
  {
    code: 'WH-COLD',
    name: 'Cold Storage Facility',
    nameAr: 'مرفق التخزين البارد',
    type: 'cold_storage',
    capacity: 500,
  },
  {
    code: 'WH-STERILE',
    name: 'Sterile Supplies Room',
    nameAr: 'غرفة المستلزمات المعقمة',
    type: 'sterile',
    capacity: 800,
  },
  {
    code: 'WH-AT',
    name: 'Assistive Technology Warehouse',
    nameAr: 'مستودع التقنيات المساعدة',
    type: 'general',
    capacity: 2000,
  },
  {
    code: 'WH-PHARM',
    name: 'Pharmacy Storage',
    nameAr: 'مخزن الصيدلية',
    type: 'general',
    capacity: 1500,
  },
  {
    code: 'WH-QUAR',
    name: 'Quarantine Area',
    nameAr: 'منطقة الحجر',
    type: 'quarantine',
    capacity: 200,
  },
  {
    code: 'WH-SAT-N',
    name: 'North Branch Satellite Store',
    nameAr: 'مخزن الفرع الشمالي',
    type: 'satellite',
    capacity: 1000,
  },
  {
    code: 'WH-SAT-S',
    name: 'South Branch Satellite Store',
    nameAr: 'مخزن الفرع الجنوبي',
    type: 'satellite',
    capacity: 1000,
  },
  {
    code: 'WH-MOB',
    name: 'Mobile Supply Unit',
    nameAr: 'وحدة إمداد متنقلة',
    type: 'mobile_unit',
    capacity: 300,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Warehouse ─────────────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const warehouseSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    type: { type: String, enum: WAREHOUSE_TYPES, required: true },
    status: { type: String, enum: WAREHOUSE_STATUSES, default: 'active' },
    locationId: { type: Schema.Types.ObjectId },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
      coordinates: { lat: Number, lng: Number },
    },
    capacity: { type: Number, default: 0 },
    usedCapacity: { type: Number, default: 0 },
    zones: [
      {
        code: { type: String },
        name: { type: String },
        type: { type: String, enum: ZONE_TYPES },
        capacity: { type: Number },
      },
    ],
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    operatingHours: {
      weekdays: { open: String, close: String },
      weekends: { open: String, close: String },
    },
    contactPhone: { type: String },
    contactEmail: { type: String },
    isTemperatureControlled: { type: Boolean, default: false },
    temperatureRange: { min: Number, max: Number },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

warehouseSchema.index({ type: 1, status: 1 });
warehouseSchema.index({ code: 1 });

const DDDWarehouse =
  mongoose.models.DDDWarehouse || mongoose.model('DDDWarehouse', warehouseSchema);

/* ── Storage Bin ───────────────────────────────────────────────────────── */
const storageBinSchema = new Schema(
  {
    warehouseId: { type: Schema.Types.ObjectId, ref: 'DDDWarehouse', required: true },
    binCode: { type: String, required: true },
    type: { type: String, enum: BIN_TYPES, default: 'shelf' },
    zone: { type: String },
    aisle: { type: String },
    rack: { type: String },
    level: { type: String },
    position: { type: String },
    capacity: { type: Number, default: 0 },
    usedCapacity: { type: Number, default: 0 },
    isOccupied: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false },
    assignedItems: [
      {
        itemId: { type: Schema.Types.ObjectId },
        quantity: { type: Number },
        lotNumber: { type: String },
      },
    ],
    restrictions: [{ type: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

storageBinSchema.index({ warehouseId: 1, binCode: 1 });
storageBinSchema.index({ zone: 1, type: 1 });

const DDDStorageBin =
  mongoose.models.DDDStorageBin || mongoose.model('DDDStorageBin', storageBinSchema);

/* ── Pick List ─────────────────────────────────────────────────────────── */
const pickListSchema = new Schema(
  {
    pickNumber: { type: String, required: true, unique: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'DDDWarehouse', required: true },
    status: { type: String, enum: PICK_LIST_STATUSES, default: 'created' },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    items: [
      {
        itemId: { type: Schema.Types.ObjectId, required: true },
        binId: { type: Schema.Types.ObjectId, ref: 'DDDStorageBin' },
        requestedQty: { type: Number, required: true },
        pickedQty: { type: Number, default: 0 },
        lotNumber: { type: String },
        status: {
          type: String,
          enum: ['pending', 'picked', 'short', 'substituted'],
          default: 'pending',
        },
      },
    ],
    referenceType: { type: String },
    referenceId: { type: Schema.Types.ObjectId },
    startedAt: { type: Date },
    completedAt: { type: Date },
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

pickListSchema.index({ warehouseId: 1, status: 1 });

const cycleCountSchema = new Schema(
  {
    countNumber: { type: String, required: true, unique: true },
    warehouseId: { type: Schema.Types.ObjectId, ref: 'DDDWarehouse', required: true },
    status: { type: String, enum: CYCLE_COUNT_STATUSES, default: 'scheduled' },
    countType: {
      type: String,
      enum: ['full', 'partial', 'abc_class', 'random_sample', 'zone'],
      default: 'full',
    },
    zone: { type: String },
    scheduledDate: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    items: [
      {
        itemId: { type: Schema.Types.ObjectId, required: true },
        binId: { type: Schema.Types.ObjectId, ref: 'DDDStorageBin' },
        systemQty: { type: Number },
        countedQty: { type: Number },
        variance: { type: Number },
        varianceValue: { type: Number },
        isReconciled: { type: Boolean, default: false },
        notes: { type: String },
      },
    ],
    totalItems: { type: Number, default: 0 },
    totalVariances: { type: Number, default: 0 },
    varianceRate: { type: Number, default: 0 },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

cycleCountSchema.index({ warehouseId: 1, status: 1 });

const DDDCycleCount =
  mongoose.models.DDDCycleCount || mongoose.model('DDDCycleCount', cycleCountSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Models ═══════════════════ */

const DDDPickList = mongoose.models.DDDPickList || mongoose.model('DDDPickList', pickListSchema);

/* ── Cycle Count ───────────────────────────────────────────────────────── */

/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  WAREHOUSE_TYPES,
  WAREHOUSE_STATUSES,
  BIN_TYPES,
  PICK_LIST_STATUSES,
  CYCLE_COUNT_STATUSES,
  ZONE_TYPES,
  BUILTIN_WAREHOUSES,
  DDDWarehouse,
  DDDStorageBin,
  DDDPickList,
  DDDCycleCount,
};
