/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  category: { type: String },
  condition: { type: String, enum: ['NEW', 'GOOD', 'FAIR', 'POOR'], default: 'GOOD' },
});


// ── Indexes ───────────────────────────────────────────────────────────────
inventorySchema.index({ category: 1 });
inventorySchema.index({ itemName: 1 });
module.exports = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);
