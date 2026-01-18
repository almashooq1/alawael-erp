const mongoose = require('mongoose');

const useMock = process.env.USE_MOCK_DB === 'true' || process.env.NODE_ENV === 'test';

if (!useMock) {
  const SubscriptionSchema = new mongoose.Schema({
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: String,
      enum: ['free', 'basic', 'professional', 'enterprise'],
      default: 'free',
    },
    price: {
      monthly: Number,
      annual: Number,
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'annual'],
      default: 'monthly',
    },
    status: {
      type: String,
      enum: ['active', 'paused', 'cancelled', 'expired'],
      default: 'active',
    },
    stripeSubscriptionId: String,
    currentPeriod: {
      start: Date,
      end: Date,
    },
    nextBillingDate: Date,
    autoRenew: {
      type: Boolean,
      default: true,
    },
    features: [
      {
        feature: String,
        limit: Number,
        used: Number,
      },
    ],
    paymentMethod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PaymentMethod',
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: Date,
    cancelledAt: Date,
  });

  module.exports = mongoose.model('Subscription', SubscriptionSchema);
} else {
  class MockSubscription {
    constructor(data) {
      Object.assign(this, data);
    }
    save() {
      return Promise.resolve(this);
    }
    static findOne() {
      return Promise.resolve(null);
    }
  }
  module.exports = MockSubscription;
}
