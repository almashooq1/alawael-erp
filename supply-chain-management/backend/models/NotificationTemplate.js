const mongoose = require('mongoose');

/**
 * NotificationTemplate Schema
 * Pre-defined templates for notifications with variable substitution
 */
const NotificationTemplateSchema = new mongoose.Schema(
  {
    // Template Identification
    templateName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    templateCode: {
      type: String,
      unique: true,
      required: true,
    },

    // Template Description
    description: String,

    category: {
      type: String,
      enum: ['transactional', 'promotional', 'alert', 'reminder', 'notification', 'confirmation'],
      default: 'notification',
    },

    // Template Content
    emailSubject: String,

    emailBody: {
      type: String,
      required: true,
    },

    smsBody: String,

    pushTitle: String,

    pushMessage: String,

    inAppTitle: String,

    inAppMessage: String,

    // Channels Supported
    availableChannels: [
      {
        type: String,
        enum: ['email', 'sms', 'push', 'in_app', 'slack', 'webhook'],
      },
    ],

    defaultChannels: [
      {
        type: String,
        enum: ['email', 'sms', 'push', 'in_app', 'slack', 'webhook'],
      },
    ],

    // Variables/Tokens
    variables: [
      {
        name: String,
        description: String,
        required: Boolean,
        defaultValue: String,
      },
    ],

    // Template Status
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isDefault: {
      type: Boolean,
      default: false,
    },

    // Priority and Rules
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'critical'],
      default: 'normal',
    },

    requiresAction: {
      type: Boolean,
      default: false,
    },

    actionUrl: String,

    actionLabel: String,

    // Scheduling Rules
    quietHourStart: String, // HH:mm format

    quietHourEnd: String,

    quietHourTimezone: String,

    respectQuietHours: {
      type: Boolean,
      default: true,
    },

    bestTimeToSend: String, // e.g., '09:00', 'morning', 'evening'

    /**
     * Retry Configuration
     */
    maxRetries: {
      type: Number,
      default: 3,
    },

    retryDelayMinutes: {
      type: Number,
      default: 5,
    },

    // Personalization Rules
    personalization: {
      useFriendlyName: Boolean,
      useCompanyName: Boolean,
      includeCustomData: Boolean,
    },

    // Unsubscribe Information
    allowUnsubscribe: {
      type: Boolean,
      default: true,
    },

    unsubscribeLink: String,

    // Landing Page
    landingPageId: mongoose.Schema.Types.ObjectId,

    landingPageUrl: String,

    // Usage Statistics
    totalSent: {
      type: Number,
      default: 0,
    },

    totalDelivered: {
      type: Number,
      default: 0,
    },

    totalOpened: {
      type: Number,
      default: 0,
    },

    totalClicked: {
      type: Number,
      default: 0,
    },

    totalConverted: {
      type: Number,
      default: 0,
    },

    averageDeliveryTime: Number, // in seconds

    lastUsedAt: Date,

    // A/B Testing
    isTestVariant: {
      type: Boolean,
      default: false,
    },

    parentTemplateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'NotificationTemplate',
    },

    testVariants: [
      {
        variantId: mongoose.Schema.Types.ObjectId,
        variantName: String,
        description: String,
        performanceScore: Number,
      },
    ],

    // Audit Trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    approvedAt: Date,

    // Version Control
    version: {
      type: Number,
      default: 1,
    },

    previousVersions: [
      {
        versionNumber: Number,
        emailBody: String,
        smsBody: String,
        changedAt: Date,
        changedBy: mongoose.Schema.Types.ObjectId,
        changeDescription: String,
      },
    ],

    // Timestamps
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },

    deprecatedAt: Date,
  },
  { timestamps: true }
);

// Indexes
NotificationTemplateSchema.index({ templateCode: 1 });
NotificationTemplateSchema.index({ isActive: 1, category: 1 });
NotificationTemplateSchema.index({ createdAt: -1 });

// Virtuals

/**
 * Is template approved
 */
NotificationTemplateSchema.virtual('isApproved').get(function () {
  return this.approvedAt !== undefined && this.approvedAt !== null;
});

/**
 * Is template deprecated
 */
NotificationTemplateSchema.virtual('isDeprecated').get(function () {
  return this.deprecatedAt !== undefined && this.deprecatedAt !== null;
});

/**
 * Delivery rate
 */
NotificationTemplateSchema.virtual('deliveryRate').get(function () {
  if (this.totalSent === 0) return 0;
  return (this.totalDelivered / this.totalSent) * 100;
});

/**
 * Open rate
 */
NotificationTemplateSchema.virtual('openRate').get(function () {
  if (this.totalDelivered === 0) return 0;
  return (this.totalOpened / this.totalDelivered) * 100;
});

/**
 * Click rate
 */
NotificationTemplateSchema.virtual('clickRate').get(function () {
  if (this.totalOpened === 0) return 0;
  return (this.totalClicked / this.totalOpened) * 100;
});

/**
 * Conversion rate
 */
NotificationTemplateSchema.virtual('conversionRate').get(function () {
  if (this.totalClicked === 0) return 0;
  return (this.totalConverted / this.totalClicked) * 100;
});

// Instance Methods

/**
 * Render template with variables
 */
NotificationTemplateSchema.methods.render = function (data = {}) {
  let emailBody = this.emailBody || '';
  let smsBody = this.smsBody || '';
  let pushMessage = this.pushMessage || '';
  let emailSubject = this.emailSubject || '';

  // Replace variables
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    const value = data[key] !== null ? data[key] : '';
    emailBody = emailBody.replace(regex, value);
    smsBody = smsBody.replace(regex, value);
    pushMessage = pushMessage.replace(regex, value);
    emailSubject = emailSubject.replace(regex, value);
  });

  return {
    emailSubject,
    emailBody,
    smsBody,
    pushMessage,
  };
};

/**
 * Validate template
 */
NotificationTemplateSchema.methods.validate = function () {
  const errors = [];

  if (!this.emailBody && !this.smsBody && !this.pushMessage) {
    errors.push('At least one channel content is required');
  }

  if (this.emailBody && !this.emailSubject) {
    errors.push('Email subject is required for email channel');
  }

  // Check for required variables
  this.variables.forEach(variable => {
    if (variable.required) {
      const regex = new RegExp(`{{${variable.name}}}`, 'g');
      if (
        !this.emailBody.match(regex) &&
        !this.smsBody.match(regex) &&
        !this.pushMessage.match(regex)
      ) {
        errors.push(`Required variable ${variable.name} is not used in any channel`);
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Create version
 */
NotificationTemplateSchema.methods.saveVersion = function (userId, description) {
  if (!this.previousVersions) this.previousVersions = [];

  this.previousVersions.push({
    versionNumber: this.version,
    emailBody: this.emailBody,
    smsBody: this.smsBody,
    changedAt: new Date(),
    changedBy: userId,
    changeDescription: description,
  });

  this.version += 1;
  return this.save();
};

/**
 * Record usage
 */
NotificationTemplateSchema.methods.recordUsage = function (stats = {}) {
  this.totalSent += stats.sent || 0;
  this.totalDelivered += stats.delivered || 0;
  this.totalOpened += stats.opened || 0;
  this.totalClicked += stats.clicked || 0;
  this.totalConverted += stats.converted || 0;
  this.lastUsedAt = new Date();
  return this.save();
};

/**
 * Approve template
 */
NotificationTemplateSchema.methods.approve = function (userId) {
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

/**
 * Deprecate template
 */
NotificationTemplateSchema.methods.deprecate = function () {
  this.deprecatedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Static Methods

/**
 * Get active templates
 */
NotificationTemplateSchema.statics.getActive = function (category = null) {
  const query = { isActive: true, deprecatedAt: null };
  if (category) query.category = category;
  return this.find(query);
};

/**
 * Get by code
 */
NotificationTemplateSchema.statics.getByCode = function (code) {
  return this.findOne({ templateCode: code });
};

/**
 * Get best performing templates
 */
NotificationTemplateSchema.statics.getTopPerformers = function (
  metric = 'deliveryRate',
  limit = 10
) {
  const sortField =
    metric === 'deliveryRate'
      ? 'totalDelivered'
      : `total${metric.charAt(0).toUpperCase()}${metric.slice(1)}`;
  return this.find({ isActive: true })
    .sort({ [sortField]: -1 })
    .limit(limit);
};

/**
 * Get templates needing approval
 */
NotificationTemplateSchema.statics.getPendingApproval = function () {
  return this.find({
    approvedAt: null,
    deprecatedAt: null,
  });
};

module.exports = mongoose.model('NotificationTemplate', NotificationTemplateSchema);
