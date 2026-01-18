const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  itemName: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  category: { type: String },
  condition: { type: String, enum: ['NEW', 'GOOD', 'FAIR', 'POOR'], default: 'GOOD' },
});

module.exports = mongoose.models.Inventory || mongoose.model('Inventory', inventorySchema);
