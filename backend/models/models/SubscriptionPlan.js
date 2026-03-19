const mongoose = require('mongoose');

const subscriptionPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'اسم الخطة مطلوب'],
      enum: ['free', 'basic', 'premium', 'enterprise'],
      unique: true,
    },
    description: {
      type: String,
      required: [true, 'وصف الخطة مطلوب'],
    },
    price: {
      currency: {
        type: String,
        default: 'SAR',
      },
      monthly: {
        type: Number,
        default: 0,
      },
      annual: {
        type: Number,
        default: 0,
      },
    },
    features: {
      contentAccess: {
        type: [String],
        default: [],
        description: 'أنواع المحتوى المتاح',
      },
      sessionAccess: {
        type: String,
        enum: ['unlimited', 'limited', 'none'],
        default: 'none',
      },
      libraryAccess: {
        type: String,
        enum: ['unlimited', 'limited', 'none'],
        default: 'none',
      },
      storageGB: {
        type: Number,
        default: 0,
      },
      supportLevel: {
        type: String,
        enum: ['none', 'email', 'priority', '24/7'],
        default: 'email',
      },
      customReports: Boolean,
      apiAccess: Boolean,
      downloadLimit: {
        type: Number,
        default: 0,
        description: 'حد أقصى للتنزيلات شهرياً (0 = غير محدود)',
      },
    },
    limitations: {
      sessionLimitPerMonth: {
        type: Number,
        default: 0,
        description: '0 = غير محدود',
      },
      resourcesPerDay: {
        type: Number,
        default: 0,
      },
      maxSavedItems: {
        type: Number,
        default: 0,
      },
      concurrent_users: {
        type: Number,
        default: 1,
      },
    },
    disabilityFocus: {
      type: [String],
      enum: ['visual', 'hearing', 'mobility', 'intellectual', 'psychosocial', 'multiple', 'all'],
      default: ['all'],
    },
    duration: {
      type: String,
      enum: ['monthly', 'annual', 'lifetime'],
      default: 'monthly',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountDescription: String,
    specialOffer: {
      isActive: Boolean,
      description: String,
      validUntil: Date,
    },
    maxSubscribers: {
      type: Number,
      default: -1,
      description: '-1 = غير محدود',
    },
    currentSubscribers: {
      type: Number,
      default: 0,
    },
    trialPeriod: {
      enabled: Boolean,
      days: {
        type: Number,
        default: 0,
      },
    },
    autoRenewal: {
      type: Boolean,
      default: true,
    },
    cancellationPolicy: String,
    refundPolicy: String,
    customization: {
      brandingAllowed: Boolean,
      customDomain: Boolean,
      whiteLabel: Boolean,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

subscriptionPlanSchema.index({ name: 1 });
subscriptionPlanSchema.index({ isActive: 1, price: 1 });

module.exports = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);
