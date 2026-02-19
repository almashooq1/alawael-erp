const mongoose = require('mongoose');

const shipmentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  orderId: { type: String },
  trackingNumber: { type: String, unique: true },
  carrier: { type: String },
  status: {
    type: String,
    enum: ['pending', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending',
  },
  shippedDate: { type: Date },
  deliveredDate: { type: Date },
  notes: { type: String },
  attachments: [{ type: String }],
  estimatedDelivery: { type: Date },
  actualDelivery: { type: Date },
  weight: { type: Number },
  dimension: { type: String },
  cost: { type: Number },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Shipment', shipmentSchema);
