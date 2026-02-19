const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  number: { type: String, unique: true, required: true },
  supplier: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier' },
  supplierId: { type: String },
  products: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      productId: { type: String },
      quantity: { type: Number, required: true },
      price: { type: Number, required: true },
    },
  ],
  status: {
    type: String,
    enum: ['pending', 'approved', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  total: { type: Number, default: 0 },
  orderDate: { type: Date, default: Date.now },
  date: { type: String },
  deliveryDate: { type: Date },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);
