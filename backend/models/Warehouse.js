/**
 * Warehouse & Warehouse Transaction Models
 * نماذج المستودعات وحركات المستودعات
 */

const mongoose = require('mongoose');

// ── Warehouse Schema ─────────────────────────────────────────────
const warehouseSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, trim: true },
    type: {
      type: String,
      enum: ['main', 'sub', 'transit', 'quarantine', 'returns'],
      default: 'main',
    },
    location: {
      building: String,
      floor: String,
      zone: String,
      address: String,
      coordinates: { lat: Number, lng: Number },
    },
    capacity: {
      totalArea: { type: Number, default: 0 },
      usedArea: { type: Number, default: 0 },
      totalSlots: { type: Number, default: 0 },
      usedSlots: { type: Number, default: 0 },
    },
    manager: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    status: {
      type: String,
      enum: ['active', 'inactive', 'maintenance', 'closed'],
      default: 'active',
    },
    settings: {
      allowNegativeStock: { type: Boolean, default: false },
      requireApproval: { type: Boolean, default: true },
      autoReorder: { type: Boolean, default: false },
      reorderThreshold: { type: Number, default: 10 },
    },
    contactInfo: { phone: String, email: String },
    notes: String,
  },
  { timestamps: true }
);

warehouseSchema.index({ status: 1 });
warehouseSchema.index({ branch: 1 });
warehouseSchema.index({ type: 1, status: 1 });

// ── Warehouse Item (Stock) Schema ────────────────────────────────
const warehouseItemSchema = new mongoose.Schema(
  {
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    itemCode: { type: String, required: true, trim: true },
    nameAr: { type: String, required: true, trim: true },
    nameEn: { type: String, trim: true },
    category: {
      type: String,
      enum: [
        'equipment',
        'supplies',
        'medical',
        'food',
        'cleaning',
        'office',
        'educational',
        'other',
      ],
      default: 'supplies',
    },
    unit: { type: String, default: 'piece' },
    quantity: { type: Number, default: 0, min: 0 },
    minQuantity: { type: Number, default: 0 },
    maxQuantity: { type: Number, default: 0 },
    unitCost: { type: Number, default: 0 },
    totalValue: { type: Number, default: 0 },
    location: { shelf: String, row: String, bin: String },
    barcode: String,
    expiryDate: Date,
    lastStockCheck: Date,
    status: {
      type: String,
      enum: ['available', 'low', 'out_of_stock', 'expired', 'reserved'],
      default: 'available',
    },
  },
  { timestamps: true }
);

warehouseItemSchema.index({ warehouse: 1, itemCode: 1 }, { unique: true });
warehouseItemSchema.index({ category: 1 });
warehouseItemSchema.index({ status: 1 });
warehouseItemSchema.index({ quantity: 1 });

// ── Warehouse Transaction Schema ─────────────────────────────────
const warehouseTransactionSchema = new mongoose.Schema(
  {
    transactionNumber: { type: String, unique: true, required: true },
    type: {
      type: String,
      enum: ['receive', 'issue', 'transfer', 'return', 'adjustment', 'disposal', 'count'],
      required: true,
    },
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    destinationWarehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse' },
    items: [
      {
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'WarehouseItem' },
        itemCode: String,
        nameAr: String,
        quantity: { type: Number, required: true },
        unitCost: Number,
        totalCost: Number,
        batchNumber: String,
        expiryDate: Date,
      },
    ],
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'completed', 'rejected', 'cancelled'],
      default: 'draft',
    },
    reference: { type: String, trim: true },
    notes: String,
    totalValue: { type: Number, default: 0 },
    completedAt: Date,
  },
  { timestamps: true }
);

warehouseTransactionSchema.index({ warehouse: 1, createdAt: -1 });
warehouseTransactionSchema.index({ type: 1, status: 1 });
warehouseTransactionSchema.index({ status: 1, createdAt: -1 });

const Warehouse = mongoose.models.Warehouse || mongoose.model('Warehouse', warehouseSchema);
const WarehouseItem =
  mongoose.models.WarehouseItem || mongoose.model('WarehouseItem', warehouseItemSchema);
const WarehouseTransaction =
  mongoose.models.WarehouseTransaction ||
  mongoose.models.WarehouseTransaction || mongoose.model('WarehouseTransaction', warehouseTransactionSchema);

module.exports = { Warehouse, WarehouseItem, WarehouseTransaction };
