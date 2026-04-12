'use strict';
/**
 * DddInventoryManager — Mongoose Models & Constants
 * Auto-extracted from services/dddInventoryManager.js
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ═══════════════════ Constants ═══════════════════ */

const ITEM_CATEGORIES = [
  'medical_supplies',
  'therapeutic_equipment',
  'assistive_devices',
  'consumables',
  'pharmaceuticals',
  'orthotics_prosthetics',
  'diagnostic_tools',
  'safety_equipment',
  'office_supplies',
  'cleaning_supplies',
  'linen_textiles',
  'it_equipment',
  'furniture',
  'maintenance_parts',
  'lab_supplies',
];

const ITEM_STATUSES = [
  'active',
  'inactive',
  'discontinued',
  'pending_approval',
  'recalled',
  'out_of_stock',
  'on_order',
  'quarantined',
  'expired',
  'damaged',
];

const STOCK_TRANSACTION_TYPES = [
  'receipt',
  'issue',
  'adjustment_increase',
  'adjustment_decrease',
  'transfer_in',
  'transfer_out',
  'return_to_supplier',
  'return_from_patient',
  'write_off',
  'disposal',
  'cycle_count',
  'initial_stock',
];

const UNIT_OF_MEASURES = [
  'each',
  'box',
  'pack',
  'case',
  'roll',
  'bottle',
  'tube',
  'pair',
  'set',
  'kg',
  'litre',
  'metre',
];

const STORAGE_CONDITIONS = [
  'room_temperature',
  'refrigerated',
  'frozen',
  'cool_dry',
  'humidity_controlled',
  'light_sensitive',
  'hazardous',
  'sterile',
  'flammable',
  'controlled_substance',
];

const VALUATION_METHODS = [
  'fifo',
  'lifo',
  'weighted_average',
  'specific_identification',
  'standard_cost',
  'replacement_cost',
];

/* ── Built-in inventory items ───────────────────────────────────────────── */
const BUILTIN_ITEMS = [
  {
    sku: 'INV-GLOVE-NIT',
    name: 'Nitrile Examination Gloves',
    nameAr: 'قفازات فحص نيتريل',
    category: 'medical_supplies',
    uom: 'box',
    reorderPoint: 50,
    reorderQty: 200,
  },
  {
    sku: 'INV-THERABAND',
    name: 'Resistance Therapy Bands Set',
    nameAr: 'أشرطة مقاومة للعلاج',
    category: 'therapeutic_equipment',
    uom: 'set',
    reorderPoint: 10,
    reorderQty: 30,
  },
  {
    sku: 'INV-ELEC-PAD',
    name: 'Electrode Pads (TENS)',
    nameAr: 'وسادات أقطاب كهربائية',
    category: 'therapeutic_equipment',
    uom: 'pack',
    reorderPoint: 20,
    reorderQty: 100,
  },
  {
    sku: 'INV-CRUTCH-ADJ',
    name: 'Adjustable Crutches (Pair)',
    nameAr: 'عكازات قابلة للتعديل',
    category: 'assistive_devices',
    uom: 'pair',
    reorderPoint: 5,
    reorderQty: 20,
  },
  {
    sku: 'INV-WHEELCHAIR',
    name: 'Standard Wheelchair',
    nameAr: 'كرسي متحرك قياسي',
    category: 'assistive_devices',
    uom: 'each',
    reorderPoint: 3,
    reorderQty: 10,
  },
  {
    sku: 'INV-SANITIZER',
    name: 'Hand Sanitizer 500ml',
    nameAr: 'معقم يدين 500مل',
    category: 'consumables',
    uom: 'bottle',
    reorderPoint: 30,
    reorderQty: 120,
  },
  {
    sku: 'INV-HOTPACK',
    name: 'Reusable Hot/Cold Pack',
    nameAr: 'كمادات ساخنة/باردة',
    category: 'therapeutic_equipment',
    uom: 'each',
    reorderPoint: 15,
    reorderQty: 50,
  },
  {
    sku: 'INV-GONIOMETER',
    name: 'Goniometer (Universal)',
    nameAr: 'جونيومتر عالمي',
    category: 'diagnostic_tools',
    uom: 'each',
    reorderPoint: 5,
    reorderQty: 15,
  },
  {
    sku: 'INV-SPLINT-WR',
    name: 'Wrist Splint (Adjustable)',
    nameAr: 'جبيرة معصم قابلة للتعديل',
    category: 'orthotics_prosthetics',
    uom: 'each',
    reorderPoint: 8,
    reorderQty: 30,
  },
  {
    sku: 'INV-TAPE-KIN',
    name: 'Kinesiology Tape Roll',
    nameAr: 'شريط حركي لاصق',
    category: 'consumables',
    uom: 'roll',
    reorderPoint: 25,
    reorderQty: 100,
  },
];

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SCHEMAS                                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

/* ── Inventory Item ────────────────────────────────────────────────────── */

/* ═══════════════════ Schemas ═══════════════════ */

const inventoryItemSchema = new Schema(
  {
    sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
    name: { type: String, required: true },
    nameAr: { type: String },
    description: { type: String },
    category: { type: String, enum: ITEM_CATEGORIES, required: true },
    status: { type: String, enum: ITEM_STATUSES, default: 'active' },
    uom: { type: String, enum: UNIT_OF_MEASURES, default: 'each' },
    barcode: { type: String },
    manufacturer: { type: String },
    model: { type: String },
    storageCondition: { type: String, enum: STORAGE_CONDITIONS, default: 'room_temperature' },
    unitCost: { type: Number, default: 0 },
    sellingPrice: { type: Number, default: 0 },
    valuationMethod: { type: String, enum: VALUATION_METHODS, default: 'weighted_average' },
    isSerialTracked: { type: Boolean, default: false },
    isLotTracked: { type: Boolean, default: false },
    isPerishable: { type: Boolean, default: false },
    shelfLifeDays: { type: Number },
    supplierId: { type: Schema.Types.ObjectId },
    tags: [{ type: String }],
    images: [{ url: String, caption: String }],
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

inventoryItemSchema.index({ category: 1, status: 1 });
inventoryItemSchema.index({ sku: 1 });

const DDDInventoryItem =
  mongoose.models.DDDInventoryItem || mongoose.model('DDDInventoryItem', inventoryItemSchema);

/* ── Stock Level ───────────────────────────────────────────────────────── */
const stockLevelSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'DDDInventoryItem', required: true },
    locationId: { type: Schema.Types.ObjectId, required: true },
    quantityOnHand: { type: Number, default: 0 },
    quantityReserved: { type: Number, default: 0 },
    quantityOnOrder: { type: Number, default: 0 },
    quantityAvailable: { type: Number, default: 0 },
    lotNumber: { type: String },
    serialNumber: { type: String },
    expiryDate: { type: Date },
    lastCountDate: { type: Date },
    lastCountQty: { type: Number },
    binLocation: { type: String },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

stockLevelSchema.index({ itemId: 1, locationId: 1 });
stockLevelSchema.index({ expiryDate: 1 });

const DDDStockLevel =
  mongoose.models.DDDStockLevel || mongoose.model('DDDStockLevel', stockLevelSchema);

/* ── Stock Transaction ─────────────────────────────────────────────────── */
const stockTransactionSchema = new Schema(
  {
    transactionNumber: { type: String, required: true, unique: true },
    itemId: { type: Schema.Types.ObjectId, ref: 'DDDInventoryItem', required: true },
    locationId: { type: Schema.Types.ObjectId, required: true },
    type: { type: String, enum: STOCK_TRANSACTION_TYPES, required: true },
    quantity: { type: Number, required: true },
    unitCost: { type: Number },
    totalCost: { type: Number },
    referenceType: { type: String },
    referenceId: { type: Schema.Types.ObjectId },
    lotNumber: { type: String },
    serialNumber: { type: String },
    expiryDate: { type: Date },
    reason: { type: String },
    notes: { type: String },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

stockTransactionSchema.index({ itemId: 1, createdAt: -1 });
stockTransactionSchema.index({ type: 1, createdAt: -1 });

const DDDStockTransaction =
  mongoose.models.DDDStockTransaction ||
  mongoose.model('DDDStockTransaction', stockTransactionSchema);

/* ── Reorder Rule ──────────────────────────────────────────────────────── */
const reorderRuleSchema = new Schema(
  {
    itemId: { type: Schema.Types.ObjectId, ref: 'DDDInventoryItem', required: true },
    locationId: { type: Schema.Types.ObjectId },
    reorderPoint: { type: Number, required: true },
    reorderQuantity: { type: Number, required: true },
    maxStockLevel: { type: Number },
    minStockLevel: { type: Number },
    leadTimeDays: { type: Number, default: 7 },
    isAutoReorder: { type: Boolean, default: false },
    preferredSupplierId: { type: Schema.Types.ObjectId },
    isActive: { type: Boolean, default: true },
    lastTriggered: { type: Date },
    metadata: { type: Map, of: Schema.Types.Mixed },
  },
  { timestamps: true }
);

reorderRuleSchema.index({ itemId: 1, locationId: 1 });

const DDDReorderRule =
  mongoose.models.DDDReorderRule || mongoose.model('DDDReorderRule', reorderRuleSchema);

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  DOMAIN MODULE                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */


/* ═══════════════════ Exports ═══════════════════ */
module.exports = {
  ITEM_CATEGORIES,
  ITEM_STATUSES,
  STOCK_TRANSACTION_TYPES,
  UNIT_OF_MEASURES,
  STORAGE_CONDITIONS,
  VALUATION_METHODS,
  BUILTIN_ITEMS,
  DDDInventoryItem,
  DDDStockLevel,
  DDDStockTransaction,
  DDDReorderRule,
};
