const mongoose = require('mongoose');

const changeLogSchema = new mongoose.Schema({
  entity: { type: String, required: true }, // Product, Supplier, Order, Shipment
  entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
  action: { type: String, enum: ['update', 'delete'], required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  before: { type: Object },
  after: { type: Object },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('ChangeLog', changeLogSchema);
