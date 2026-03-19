/* eslint-disable no-unused-vars */
/**
 * Email Models - نماذج البريد الإلكتروني
 * MongoDB models for email service
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

/**
 * Email Template Model
 * قوالب البريد الإلكتروني
 */
const EmailTemplateSchema = new Schema(
  {
    templateId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },
    subject: {
      type: String,
      required: true,
    },
    subjectAr: {
      type: String,
      default: '',
    },
    htmlContent: {
      type: String,
      required: true,
    },
    textContent: {
      type: String,
      default: '',
    },
    variables: [
      {
        name: String,
        description: String,
        defaultValue: String,
        required: { type: Boolean, default: false },
      },
    ],
    category: {
      type: String,
      enum: [
        'authentication',
        'notification',
        'marketing',
        'transactional',
        'alert',
        'report',
        'hr',
        'finance',
        'system',
      ],
      default: 'notification',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    version: {
      type: Number,
      default: 1,
    },
    parentTemplate: {
      type: Schema.Types.ObjectId,
      ref: 'EmailTemplate',
    },
    tags: [String],
    metadata: {
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      lastModifiedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      notes: String,
    },
  },
  {
    timestamps: true,
    collection: 'email_templates',
  }
);

// Indexes
EmailTemplateSchema.index({ category: 1, isActive: 1 });
EmailTemplateSchema.index({ slug: 1, version: 1 });

/**
 * Email Log Model
 * سجل رسائل البريد الإلكتروني
 */
const EmailLogSchema = new Schema(
  {
    emailId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    messageId: {
      type: String,
      index: true,
    },
    // Sender info
    from: {
      name: String,
      address: { type: String, required: true },
    },
    // Recipients
    to: [
      {
        address: { type: String, required: true },
        name: String,
      },
    ],
    cc: [
      {
        address: String,
        name: String,
      },
    ],
    bcc: [
      {
        address: String,
        name: String,
      },
    ],
    // Content
    subject: {
      type: String,
      required: true,
    },
    template: {
      id: { type: Schema.Types.ObjectId, ref: 'EmailTemplate' },
      slug: String,
      variables: Schema.Types.Mixed,
    },
    hasAttachments: {
      type: Boolean,
      default: false,
    },
    attachments: [
      {
        filename: String,
        contentType: String,
        size: Number,
      },
    ],
    // Status tracking
    status: {
      type: String,
      enum: [
        'queued',
        'pending',
        'sent',
        'delivered',
        'opened',
        'clicked',
        'failed',
        'bounced',
        'spam',
        'unsubscribed',
      ],
      default: 'queued',
      index: true,
    },
    // Provider info
    provider: {
      type: String,
      enum: ['smtp', 'sendgrid', 'mailgun', 'ses', 'postmark', 'sparkpost'],
      index: true,
    },
    providerResponse: Schema.Types.Mixed,
    // Error tracking
    error: {
      code: String,
      message: String,
      category: { type: String, enum: ['transient', 'permanent', 'configuration'] },
      retryCount: { type: Number, default: 0 },
    },
    // Engagement tracking
    tracking: {
      opens: [
        {
          timestamp: Date,
          ipAddress: String,
          userAgent: String,
          location: {
            country: String,
            city: String,
          },
        },
      ],
      clicks: [
        {
          timestamp: Date,
          url: String,
          ipAddress: String,
          userAgent: String,
        },
      ],
      totalOpens: { type: Number, default: 0 },
      uniqueOpens: { type: Number, default: 0 },
      totalClicks: { type: Number, default: 0 },
      uniqueClicks: { type: Number, default: 0 },
    },
    // Metadata
    metadata: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
      tenantId: { type: Schema.Types.ObjectId, index: true },
      organizationId: { type: Schema.Types.ObjectId, index: true },
      correlationId: String,
      campaignId: String,
      priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
      tags: [String],
    },
    // Timestamps
    timestamps: {
      queuedAt: Date,
      processedAt: Date,
      sentAt: Date,
      deliveredAt: Date,
      firstOpenedAt: Date,
      lastOpenedAt: Date,
      failedAt: Date,
      bouncedAt: Date,
    },
    // Scheduling
    scheduledFor: Date,
    expiresAt: Date,
    // Delivery attempts
    deliveryAttempts: [
      {
        timestamp: Date,
        provider: String,
        success: Boolean,
        error: String,
      },
    ],
  },
  {
    timestamps: true,
    collection: 'email_logs',
  }
);

// Indexes for EmailLog
EmailLogSchema.index({ 'to.address': 1 });
EmailLogSchema.index({ status: 1, createdAt: -1 });
EmailLogSchema.index({ provider: 1, status: 1 });
EmailLogSchema.index({ createdAt: -1 });
EmailLogSchema.index({ scheduledFor: 1, status: 1 });
EmailLogSchema.index({ 'metadata.userId': 1, createdAt: -1 });
EmailLogSchema.index({ 'metadata.tenantId': 1, createdAt: -1 });
EmailLogSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

/**
 * Email Campaign Model
 * حملات البريد الإلكتروني
 */
const EmailCampaignSchema = new Schema(
  {
    campaignId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    template: {
      type: Schema.Types.ObjectId,
      ref: 'EmailTemplate',
      required: true,
    },
    // Targeting
    recipients: {
      type: {
        type: String,
        enum: ['list', 'segment', 'all', 'manual'],
        default: 'manual',
      },
      lists: [{ type: Schema.Types.ObjectId, ref: 'EmailList' }],
      segments: [String],
      excludeLists: [{ type: Schema.Types.ObjectId, ref: 'EmailList' }],
      filters: Schema.Types.Mixed,
    },
    // Content customization
    content: {
      subject: String,
      preheader: String,
      customVariables: Schema.Types.Mixed,
    },
    // Scheduling
    schedule: {
      sendAt: Date,
      timezone: { type: String, default: 'Asia/Riyadh' },
      isRecurring: { type: Boolean, default: false },
      recurringPattern: {
        frequency: { type: String, enum: ['daily', 'weekly', 'monthly', 'yearly'] },
        interval: Number,
        endDate: Date,
        maxOccurrences: Number,
      },
    },
    // Status
    status: {
      type: String,
      enum: [
        'draft',
        'scheduled',
        'processing',
        'sending',
        'sent',
        'paused',
        'cancelled',
        'failed',
      ],
      default: 'draft',
      index: true,
    },
    // Statistics
    stats: {
      totalRecipients: { type: Number, default: 0 },
      sent: { type: Number, default: 0 },
      delivered: { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      clicked: { type: Number, default: 0 },
      bounced: { type: Number, default: 0 },
      unsubscribed: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    // Tracking
    trackingSettings: {
      opens: { type: Boolean, default: true },
      clicks: { type: Boolean, default: true },
      googleAnalytics: Boolean,
      customDomain: String,
    },
    // A/B Testing
    abTest: {
      enabled: { type: Boolean, default: false },
      variantA: {
        subject: String,
        content: String,
      },
      variantB: {
        subject: String,
        content: String,
      },
      testPercentage: { type: Number, default: 10 },
      winnerCriteria: { type: String, enum: ['opens', 'clicks', 'conversions'] },
      winner: { type: String, enum: ['A', 'B'] },
    },
    // Metadata
    metadata: {
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      tenantId: { type: Schema.Types.ObjectId, index: true },
      tags: [String],
    },
  },
  {
    timestamps: true,
    collection: 'email_campaigns',
  }
);

EmailCampaignSchema.index({ 'metadata.tenantId': 1, status: 1 });
EmailCampaignSchema.index({ 'schedule.sendAt': 1, status: 1 });

/**
 * Email List Model
 * قوائم البريد الإلكتروني
 */
const EmailListSchema = new Schema(
  {
    listId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    description: String,
    type: {
      type: String,
      enum: ['subscribers', 'customers', 'leads', 'employees', 'custom'],
      default: 'custom',
    },
    subscribers: [
      {
        email: { type: String, required: true },
        name: String,
        status: {
          type: String,
          enum: ['active', 'unsubscribed', 'bounced', 'complained'],
          default: 'active',
        },
        subscribedAt: { type: Date, default: Date.now },
        unsubscribedAt: Date,
        customFields: Schema.Types.Mixed,
      },
    ],
    stats: {
      total: { type: Number, default: 0 },
      active: { type: Number, default: 0 },
      unsubscribed: { type: Number, default: 0 },
      bounced: { type: Number, default: 0 },
    },
    settings: {
      doubleOptIn: { type: Boolean, default: true },
      welcomeEmail: { type: Boolean, default: true },
      gdprCompliant: { type: Boolean, default: true },
    },
    metadata: {
      createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
      tenantId: { type: Schema.Types.ObjectId, index: true },
      isPublic: { type: Boolean, default: false },
    },
  },
  {
    timestamps: true,
    collection: 'email_lists',
  }
);

/**
 * Email Signature Model
 * توقيعات البريد الإلكتروني
 */
const EmailSignatureSchema = new Schema(
  {
    signatureId: {
      type: String,
      required: true,
      unique: true,
    },
    name: {
      type: String,
      required: true,
    },
    html: {
      type: String,
      required: true,
    },
    text: String,
    isDefault: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      userId: { type: Schema.Types.ObjectId, ref: 'User' },
      tenantId: { type: Schema.Types.ObjectId, index: true },
    },
  },
  {
    timestamps: true,
    collection: 'email_signatures',
  }
);

/**
 * Email Queue Model
 * قائمة انتظار البريد الإلكتروني
 */
const EmailQueueSchema = new Schema(
  {
    queueId: {
      type: String,
      required: true,
      unique: true,
    },
    emailData: {
      to: [String],
      cc: [String],
      bcc: [String],
      subject: String,
      html: String,
      text: String,
      template: String,
      variables: Schema.Types.Mixed,
      attachments: Schema.Types.Mixed,
    },
    priority: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    scheduledFor: {
      type: Date,
      default: Date.now,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    lastAttemptAt: Date,
    nextAttemptAt: Date,
    error: String,
    metadata: {
      tenantId: Schema.Types.ObjectId,
      userId: Schema.Types.ObjectId,
      campaignId: String,
      correlationId: String,
    },
  },
  {
    timestamps: true,
    collection: 'email_queue',
  }
);

EmailQueueSchema.index({ status: 1, scheduledFor: 1, priority: -1 });
EmailQueueSchema.index({ 'metadata.tenantId': 1, status: 1 });

// Create models
const EmailTemplate = mongoose.model('EmailTemplate', EmailTemplateSchema);
const EmailLog = mongoose.model('EmailLog', EmailLogSchema);
const EmailCampaign = mongoose.model('EmailCampaign', EmailCampaignSchema);
const EmailList = mongoose.model('EmailList', EmailListSchema);
const EmailSignature = mongoose.model('EmailSignature', EmailSignatureSchema);
const EmailQueue = mongoose.model('EmailQueue', EmailQueueSchema);

module.exports = {
  EmailTemplate,
  EmailLog,
  EmailCampaign,
  EmailList,
  EmailSignature,
  EmailQueue,
  // Also export schemas for reference
  schemas: {
    EmailTemplateSchema,
    EmailLogSchema,
    EmailCampaignSchema,
    EmailListSchema,
    EmailSignatureSchema,
    EmailQueueSchema,
  },
};
