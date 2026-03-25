const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productId: { type: String },
  productName: { type: String },
  quantity: { type: Number, required: true, default: 0 },
  minimumLevel: { type: Number, default: 10 },
  maximumLevel: { type: Number, default: 1000 },
  reorderPoint: { type: Number, default: 50 },
  location: { type: String },
  warehouse: { type: String },
  status: { type: String, enum: ['in-stock', 'low-stock', 'out-of-stock'], default: 'in-stock' },
  lastUpdated: { type: Date, default: Date.now },
  lastRestocked: { type: Date },
  supplier: { type: String },
  cost: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Inventory', inventorySchema);
