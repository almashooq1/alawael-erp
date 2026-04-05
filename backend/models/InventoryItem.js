'use strict';

const mongoose = require('mongoose');

const itemCategorySchema = new mongoose.Schema(
  {
    nameAr: { type: String, required: true },
    nameEn: { type: String, required: true },
    code: { type: String, unique: true, required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemCategory', default: null },
    type: {
      type: String,
      enum: ['consumable', 'non_consumable', 'assistive_device', 'asset'],
      default: 'consumable',
    },
    description: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const itemSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ItemCategory', required: true },
    sku: { type: String, unique: true, required: true }, // ITM-0001
    barcode: { type: String, unique: true, sparse: true },
    nameAr: { type: String, required: true },
    nameEn: { type: String, default: null },
    description: { type: String, default: null },
    type: {
      type: String,
      enum: ['consumable', 'non_consumable', 'assistive_device', 'fixed_asset'],
      required: true,
    },
    unit: {
      type: String,
      enum: ['piece', 'box', 'pack', 'roll', 'bottle', 'pair', 'set', 'kg', 'liter'],
      default: 'piece',
    },
    unitCost: { type: Number, default: 0 },
    unitPrice: { type: Number, default: 0 },
    minStockLevel: { type: Number, default: 0 },
    maxStockLevel: { type: Number, default: null },
    reorderPoint: { type: Number, default: 0 },
    reorderQuantity: { type: Number, default: 0 },
    storageConditions: {
      type: String,
      enum: ['room_temp', 'refrigerated', 'dry', 'frozen'],
      default: 'room_temp',
    },
    expiryTracking: { type: Boolean, default: false },
    requiresSerial: { type: Boolean, default: false },
    manufacturer: { type: String, default: null },
    modelNumber: { type: String, default: null },
    specifications: { type: mongoose.Schema.Types.Mixed, default: null },
    imagePath: { type: String, default: null },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: 'inventoryitems' }
);

itemSchema.index({ sku: 1 });
itemSchema.index({ barcode: 1 }, { sparse: true });
itemSchema.index({ categoryId: 1, isActive: 1 });
itemSchema.index({ reorderPoint: 1 });

const ItemCategory =
  mongoose.models.ItemCategory || mongoose.model('ItemCategory', itemCategorySchema);
const InventoryItem = mongoose.models.InventoryItem || mongoose.model('InventoryItem', itemSchema);

module.exports = { ItemCategory, InventoryItem };
