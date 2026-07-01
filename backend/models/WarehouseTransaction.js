'use strict';

/**
 * WarehouseTransaction — stock movements (in / out / transfer / adjustment).
 *
 * routes/warehouse.routes.js references WarehouseTransaction for the dashboard,
 * a transactions list, a create, and an approve flow — but the model was never
 * built (the siblings `Warehouse` + `WarehouseItem` ARE registered; this one was
 * forgotten when the domain was scaffolded). So `safeModel('WarehouseTransaction')`
 * resolved to null: list/dashboard degraded to empty (guarded), but the create
 * (`WHTx.create(...)`, NOT null-guarded) threw → 500 on every transaction. This
 * dedicated model completes the domain.
 */

const mongoose = require('mongoose');

const warehouseTransactionSchema = new mongoose.Schema(
  {
    warehouse: { type: mongoose.Schema.Types.ObjectId, ref: 'Warehouse', index: true },
    item: { type: mongoose.Schema.Types.ObjectId, ref: 'WarehouseItem', index: true },
    type: {
      type: String,
      enum: ['in', 'out', 'transfer', 'adjustment'],
      default: 'in',
      index: true,
    },
    quantity: { type: Number, default: 0 },
    unitCost: { type: Number },
    reference: { type: String },
    notes: { type: String },
    transactionNumber: { type: String, unique: true, sparse: true, index: true },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

warehouseTransactionSchema.index({ warehouse: 1, createdAt: -1 });

module.exports =
  mongoose.models.WarehouseTransaction ||
  mongoose.model('WarehouseTransaction', warehouseTransactionSchema);
