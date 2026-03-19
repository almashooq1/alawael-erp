const mongoose = require('mongoose');

const userSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    planId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'cancelled', 'expired'],
      default: 'inactive',
    },
    subscriptionType: {
      type: String,
      enum: ['monthly', 'annual', 'lifetime'],
      required: true,
    },
    startDate: {
      type: Date,
      default: Date.now,
    },
    endDate: {
      type: Date,
      required: true,
    },
    renewalDate: Date,
    autoRenew: {
      type: Boolean,
      default: true,
    },
    price: {
      original: Number,
      discountedPrice: Number,
      appliedDiscount: {
        type: Number,
        default: 0,
      },
      currency: {
        type: String,
        default: 'SAR',
      },
    },
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'bank_transfer', 'wallet', 'other'],
    },
    paymentHistory: [
      {
        date: {
          type: Date,
          default: Date.now,
        },
        amount: Number,
        status: {
          type: String,
          enum: ['pending', 'completed', 'failed', 'refunded'],
        },
        transactionId: String,
        notes: String,
      },
    ],
    usageStatistics: {
      sessionsAttended: {
        type: Number,
        default: 0,
      },
      resourcesDownloaded: {
        type: Number,
        default: 0,
      },
      resourcesSaved: {
        type: Number,
        default: 0,
      },
      hoursWatched: {
        type: Number,
        default: 0,
      },
      lastAccessDate: Date,
    },
    supportTickets: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'SupportTicket',
      },
    ],
    customizations: {
      notificationPreferences: {
        email: Boolean,
        sms: Boolean,
        inApp: Boolean,
      },
      contentPreferences: {
        disabilityFocus: String,
        preferredLanguage: String,
        contentTypes: [String],
      },
    },
    cancellationReason: String,
    cancellationDate: Date,
    notes: String,
    isTrialUser: {
      type: Boolean,
      default: false,
    },
    trialStartDate: Date,
    trialEndDate: Date,
    upgradedFromPlan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubscriptionPlan',
    },
    referralCode: {
      type: String,
      unique: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserSubscription',
    },
    referralBonuses: {
      referralsCount: {
        type: Number,
        default: 0,
      },
      bonusCredits: {
        type: Number,
        default: 0,
      },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
userSubscriptionSchema.index({ userId: 1 });
userSubscriptionSchema.index({ planId: 1 });
userSubscriptionSchema.index({ status: 1, endDate: 1 });
userSubscriptionSchema.index({ renewalDate: 1 });

// Virtual for is active
userSubscriptionSchema.virtual('isActive').get(function () {
  const now = new Date();
  return this.status === 'active' && this.endDate > now;
});

// Virtual for days remaining
userSubscriptionSchema.virtual('daysRemaining').get(function () {
  const now = new Date();
  const diff = this.endDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// Virtual for is expiring soon
userSubscriptionSchema.virtual('expiringInDays').get(function () {
  return this.daysRemaining <= 7 && this.daysRemaining > 0;
});

// Static method to get active subscriptions
userSubscriptionSchema.statics.getActiveSubscriptions = function () {
  const now = new Date();
  return this.find({
    status: 'active',
    endDate: { $gt: now },
  })
    .populate('userId', 'name email')
    .populate('planId', 'name features');
};

// Static method to get expiring subscriptions
userSubscriptionSchema.statics.getExpiringSubscriptions = function (daysThreshold = 7) {
  const now = new Date();
  const threshold = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);
  return this.find({
    status: 'active',
    endDate: { $lte: threshold, $gt: now },
  })
    .populate('userId', 'name email')
    .populate('planId', 'name');
};

// Instance method to upgrade plan
userSubscriptionSchema.methods.upgradePlan = function (newPlanId, newPrice) {
  this.upgradedFromPlan = this.planId;
  this.planId = newPlanId;
  this.price.discountedPrice = newPrice;
  this.status = 'active';
  return this.save();
};

// Instance method to cancel subscription
userSubscriptionSchema.methods.cancelSubscription = function (reason) {
  this.status = 'cancelled';
  this.cancellationReason = reason;
  this.cancellationDate = new Date();
  return this.save();
};

module.exports = mongoose.model('UserSubscription', userSubscriptionSchema);
