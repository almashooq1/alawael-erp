const mongoose = require('mongoose');

const useMock = process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test';

if (!useMock) {
  const PaymentSchema = new mongoose.Schema({
    transactionId: {
      type: String,
      unique: true,
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'SAR',
      enum: ['SAR', 'AED', 'EGP', 'USD', 'EUR'],
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'paypal', 'razorpay', 'bank_transfer', 'installment'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    stripePaymentIntentId: String,
    paypalTransactionId: String,
    razorpayPaymentId: String,
    cardDetails: {
      brand: String,
      last4: String,
      expMonth: Number,
      expYear: Number,
    },
    description: String,
    invoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice',
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subscription',
    },
    metadata: {
      type: Map,
      of: String,
    },
    errorMessage: String,
    createdAt: { type: Date, default: Date.now },
    completedAt: Date,
  });
  module.exports = mongoose.model('Payment', PaymentSchema);
} else {
  // Mock Model
  class MockPayment {
    constructor(data) {
      Object.assign(this, data);
    }
    static find() {
      return { sort: () => ({ limit: () => [] }) };
    }
    save() {
      return Promise.resolve(this);
    }
    static findById(id) {
      return Promise.resolve(null);
    }
  }
  module.exports = MockPayment;
}
