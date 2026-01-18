const mongoose = require('mongoose');

const useMock = process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test';

if (!useMock) {
  const InvoiceSchema = new mongoose.Schema({
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [
      {
        description: String,
        quantity: Number,
        unitPrice: Number,
        total: Number,
      },
    ],
    subtotal: Number,
    tax: Number,
    discount: Number,
    total: Number,
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'cancelled'],
      default: 'draft',
    },
    dueDate: Date,
    payment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    notes: String,
    createdAt: { type: Date, default: Date.now },
    paidAt: Date,
    sentAt: Date,
  });

  module.exports = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
} else {
  class MockInvoice {
    constructor(data) {
      Object.assign(this, data);
    }
    save() {
      return Promise.resolve(this);
    }
  }
  module.exports = MockInvoice;
}
