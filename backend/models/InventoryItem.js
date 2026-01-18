const mongoose = require('mongoose');

const inventoryItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, unique: true },
  quantity: { type: Number, default: 0 },
  category: { type: String },
  location: { type: String },
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.models.InventoryItem || mongoose.model('InventoryItem', inventoryItemSchema);
