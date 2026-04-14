'use strict';

const mongoose = require('mongoose');

// --- رصيد المخزون لكل صنف في كل مستودع ---
const inventoryStockSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    quantityOnHand: { type: Number, default: 0 },
    quantityReserved: { type: Number, default: 0 },
    batchNumber: { type: String, default: null },
    serialNumber: { type: String, default: null },
    expiryDate: { type: Date, default: null },
    condition: {
      type: String,
      enum: ['new', 'good', 'fair', 'damaged', 'expired'],
      default: 'new',
    },
    locationInWarehouse: { type: String, default: null }, // رف/صف
  },
  { timestamps: true, collection: 'inventorystock' }
);

inventoryStockSchema.virtual('quantityAvailable').get(function () {
  return Math.max(0, this.quantityOnHand - this.quantityReserved);
});

inventoryStockSchema.index({ itemId: 1, warehouseId: 1 });
inventoryStockSchema.index({ expiryDate: 1 }, { sparse: true });

// --- حركات المخزون ---
const inventoryTransactionSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    fromWarehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
    transactionType: {
      type: String,
      enum: ['receive', 'issue', 'transfer', 'adjust', 'return', 'dispose', 'write_off'],
      required: true,
    },
    referenceType: { type: String, default: null }, // 'PurchaseOrder' | 'Beneficiary' | 'Employee'
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    quantity: { type: Number, required: true }, // موجب للاستلام، سالب للصرف
    quantityBefore: { type: Number, required: true },
    quantityAfter: { type: Number, required: true },
    unitCost: { type: Number, default: null },
    totalCost: { type: Number, default: null },
    batchNumber: { type: String, default: null },
    serialNumber: { type: String, default: null },
    reason: { type: String, default: null },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'inventorytransactions' }
);

inventoryTransactionSchema.index({ itemId: 1, createdAt: -1 });
inventoryTransactionSchema.index({ warehouseId: 1, transactionType: 1 });

// --- الموردون ---
const supplierSchema = new mongoose.Schema(
  {
    code: { type: String, unique: true, required: true }, // SUP-001
    nameAr: { type: String, required: true },
    nameEn: { type: String, default: null },
    type: { type: String, enum: ['local', 'international'], default: 'local' },
    commercialRegistration: { type: String, default: null },
    vatNumber: { type: String, default: null },
    contactPerson: { type: String, required: true },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, default: null },
    city: { type: String, default: null },
    country: { type: String, default: 'SA' },
    paymentTerms: {
      type: String,
      enum: ['cash', 'net_15', 'net_30', 'net_60'],
      default: 'net_30',
    },
    creditLimit: { type: Number, default: null },
    bankName: { type: String, default: null },
    iban: { type: String, default: null },
    rating: { type: Number, min: 1, max: 5, default: 3 },
    categories: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// REMOVED DUPLICATE: code already has unique:true in supplier schema
supplierSchema.index({ isActive: 1 });

// --- أوامر الشراء ---
const purchaseOrderItemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    quantityOrdered: { type: Number, required: true, min: 1 },
    quantityReceived: { type: Number, default: 0 },
    unitCost: { type: Number, required: true },
    totalCost: { type: Number, required: true },
    vatRate: { type: Number, default: 15 },
    vatAmount: { type: Number, default: 0 },
    specifications: { type: String, default: null },
  },
  { _id: false }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, unique: true, required: true }, // PO-2024-0001
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    orderDate: { type: Date, required: true },
    expectedDeliveryDate: { type: Date, default: null },
    actualDeliveryDate: { type: Date, default: null },
    items: { type: [purchaseOrderItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    vatAmount: { type: Number, default: 0 },
    shippingCost: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
    paymentTerms: { type: String, default: null },
    status: {
      type: String,
      enum: [
        'draft',
        'pending_approval',
        'approved',
        'ordered',
        'partially_received',
        'received',
        'cancelled',
      ],
      default: 'draft',
    },
    notes: { type: String, default: null },
    attachments: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

purchaseOrderSchema.index({ poNumber: 1 });
purchaseOrderSchema.index({ supplierId: 1, status: 1 });
purchaseOrderSchema.index({ branchId: 1, status: 1 });

// --- الأصول الثابتة ---
const assetSchema = new mongoose.Schema(
  {
    assetNumber: { type: String, unique: true, required: true }, // AST-2024-0001
    barcode: { type: String, unique: true, sparse: true },
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', default: null },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', default: null },
    nameAr: { type: String, required: true },
    nameEn: { type: String, default: null },
    category: {
      type: String,
      enum: [
        'medical_equipment',
        'furniture',
        'it_equipment',
        'vehicle',
        'assistive_device',
        'other',
      ],
      required: true,
    },
    manufacturer: { type: String, default: null },
    modelNumber: { type: String, default: null },
    serialNumber: { type: String, default: null },
    purchaseDate: { type: Date, required: true },
    purchaseCost: { type: Number, required: true },
    currentValue: { type: Number, required: true },
    depreciationMethod: {
      type: String,
      enum: ['straight_line', 'declining_balance'],
      default: 'straight_line',
    },
    usefulLifeYears: { type: Number, default: 5 },
    salvageValue: { type: Number, default: 0 },
    accumulatedDepreciation: { type: Number, default: 0 },
    warrantyExpiry: { type: Date, default: null },
    condition: {
      type: String,
      enum: ['excellent', 'good', 'fair', 'poor', 'disposed'],
      default: 'excellent',
    },
    location: { type: String, default: null },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', default: null },
    lastMaintenanceDate: { type: Date, default: null },
    nextMaintenanceDate: { type: Date, default: null },
    status: {
      type: String,
      enum: ['active', 'in_maintenance', 'disposed', 'lost', 'transferred'],
      default: 'active',
    },
    disposedAt: { type: Date, default: null },
    disposalMethod: {
      type: String,
      enum: ['sold', 'donated', 'scrapped', null],
      default: null,
    },
    disposalValue: { type: Number, default: null },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

assetSchema.index({ branchId: 1, status: 1 });
assetSchema.index({ assetNumber: 1 });

// --- الجرد الدوري ---
const stockCountItemSchema = new mongoose.Schema(
  {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'InventoryItem', required: true },
    systemQuantity: { type: Number, required: true },
    countedQuantity: { type: Number, default: null },
    notes: { type: String, default: null },
    status: {
      type: String,
      enum: ['pending', 'counted', 'verified'],
      default: 'pending',
    },
  },
  { _id: false }
);

const stockCountSchema = new mongoose.Schema(
  {
    warehouseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    countNumber: { type: String, unique: true, required: true }, // SC-2024-001
    type: {
      type: String,
      enum: ['full', 'partial', 'cycle'],
      default: 'full',
    },
    countDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['planned', 'in_progress', 'completed', 'approved'],
      default: 'in_progress',
    },
    items: { type: [stockCountItemSchema], default: [] },
    totalItems: { type: Number, default: 0 },
    matchedItems: { type: Number, default: 0 },
    discrepancyItems: { type: Number, default: 0 },
    discrepancyValue: { type: Number, default: 0 },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    notes: { type: String, default: null },
  },
  { timestamps: true }
);

stockCountSchema.index({ warehouseId: 1, status: 1 });

const InventoryStock =
  mongoose.models.InventoryStock || mongoose.model('InventoryStock', inventoryStockSchema);
const InventoryTransaction =
  mongoose.models.InventoryTransaction ||
  mongoose.model('InventoryTransaction', inventoryTransactionSchema);
const Supplier = mongoose.models.Supplier || mongoose.model('Supplier', supplierSchema);
const PurchaseOrder =
  mongoose.models.PurchaseOrder || mongoose.model('PurchaseOrder', purchaseOrderSchema);
const Asset = mongoose.models.Asset || mongoose.model('Asset', assetSchema);
const StockCount = mongoose.models.StockCount || mongoose.model('StockCount', stockCountSchema);

module.exports = {
  InventoryStock,
  InventoryTransaction,
  Supplier,
  PurchaseOrder,
  Asset,
  StockCount,
};
