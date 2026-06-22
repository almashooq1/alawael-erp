/**
 * Warehouse stock item — صنف مخزون
 *
 * Missing dependency of the LIVE routes/warehouse.routes.js, which references
 * safeModel('WarehouseItem') for the /items endpoints (list / create / update).
 * Without this model those endpoints returned empty / errored. Fields match the
 * route's expectations (warehouse ref, nameAr, category, status).
 * Registration-guarded → no duplicate-model conflict.
 */
const mongoose = require('mongoose');

const warehouseItemSchema = new mongoose.Schema(
  {
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', required: true, index: true },
    nameAr: { type: String, required: true },
    nameEn: { type: String },
    sku: { type: String, index: true },
    category: {
      type: String,
      enum: ['medical', 'therapy', 'office', 'cleaning', 'food', 'maintenance', 'equipment', 'other'],
      default: 'other',
    },
    unit: {
      type: String,
      enum: ['piece', 'box', 'pack', 'kg', 'liter', 'meter', 'set', 'other'],
      default: 'piece',
    },
    quantity: { type: Number, default: 0, min: 0 },
    minQuantity: { type: Number, default: 0, min: 0 },
    unitCost: { type: Number, default: 0, min: 0 },
    expiryDate: { type: Date },
    status: {
      type: String,
      enum: ['available', 'low_stock', 'out_of_stock', 'expired', 'discontinued'],
      default: 'available',
    },
    notes: { type: String },
    branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.WarehouseItem || mongoose.model('WarehouseItem', warehouseItemSchema);
