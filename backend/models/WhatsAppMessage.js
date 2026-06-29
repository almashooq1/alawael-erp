/**
 * WhatsApp Message Model
 * نموذج رسائل WhatsApp
 */

'use strict';

const mongoose = require('mongoose');
const {
  MESSAGE_STATUS,
  MESSAGE_TYPE,
  MESSAGE_DIRECTION,
} = require('../integrations/whatsapp/constants');

const whatsAppMessageSchema = new mongoose.Schema(
  {
    // Provider details
    provider: { type: String, required: true },
    providerMessageId: { type: String, index: true },

    // Recipient / Sender
    phoneNumber: { type: String, required: true, index: true },
    fromPhone: { type: String, index: true },
    toPhone: { type: String, index: true },

    // Linked entities
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    notificationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Notification' },

    // Message content
    direction: {
      type: String,
      enum: Object.values(MESSAGE_DIRECTION),
      default: MESSAGE_DIRECTION.OUTBOUND,
      index: true,
    },
    type: {
      type: String,
      enum: Object.values(MESSAGE_TYPE),
      default: MESSAGE_TYPE.TEXT,
    },
    body: { type: String, maxlength: 4096 },
    templateName: { type: String },
    templateParams: { type: mongoose.Schema.Types.Mixed },
    language: { type: String, default: 'ar' },

    // Media
    mediaUrl: { type: String },
    mediaType: { type: String },
    mediaSize: { type: Number },
    mediaCaption: { type: String },

    // Interactive
    buttons: [{ type: mongoose.Schema.Types.Mixed }],
    listSections: [{ type: mongoose.Schema.Types.Mixed }],
    selectedButtonId: { type: String },
    selectedListRowId: { type: String },

    // Status tracking
    status: {
      type: String,
      enum: Object.values(MESSAGE_STATUS),
      default: MESSAGE_STATUS.PENDING,
      index: true,
    },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    readAt: { type: Date },
    failedAt: { type: Date },
    errorMessage: { type: String },
    retryCount: { type: Number, default: 0 },

    // Categorization
    tag: { type: String, index: true },
    priority: { type: Number, default: 1 },
    category: { type: String, default: 'general' },

    // Context / Session
    sessionId: { type: String, index: true },
    conversationId: { type: String, index: true },
    context: { type: mongoose.Schema.Types.Mixed, default: {} },

    // Metadata
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    rawPayload: { type: mongoose.Schema.Types.Mixed },

    // Cost tracking
    cost: { type: Number, default: 0 },
    currency: { type: String, default: 'SAR' },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for common queries
whatsAppMessageSchema.index({ phoneNumber: 1, createdAt: -1 });
whatsAppMessageSchema.index({ status: 1, createdAt: -1 });
whatsAppMessageSchema.index({ beneficiaryId: 1, createdAt: -1 });
whatsAppMessageSchema.index({ direction: 1, status: 1, createdAt: -1 });
whatsAppMessageSchema.index({ tag: 1, createdAt: -1 });
whatsAppMessageSchema.index({ providerMessageId: 1, provider: 1 }, { unique: true, sparse: true });
whatsAppMessageSchema.index({ sessionId: 1, createdAt: -1 });

// Virtuals
whatsAppMessageSchema.virtual('isDelivered').get(function () {
  return this.status === MESSAGE_STATUS.DELIVERED || this.status === MESSAGE_STATUS.READ;
});

whatsAppMessageSchema.virtual('isRead').get(function () {
  return this.status === MESSAGE_STATUS.READ;
});

whatsAppMessageSchema.virtual('isFailed').get(function () {
  return this.status === MESSAGE_STATUS.FAILED;
});

whatsAppMessageSchema.virtual('deliveryTimeMs').get(function () {
  if (!this.sentAt || !this.deliveredAt) return null;
  return this.deliveredAt.getTime() - this.sentAt.getTime();
});

// Static methods
whatsAppMessageSchema.statics.findByPhone = function (phoneNumber, options = {}) {
  const query = { phoneNumber };
  if (options.direction) query.direction = options.direction;
  if (options.status) query.status = options.status;
  if (options.tag) query.tag = options.tag;
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

whatsAppMessageSchema.statics.findByBeneficiary = function (beneficiaryId, options = {}) {
  const query = { beneficiaryId };
  if (options.direction) query.direction = options.direction;
  return this.find(query)
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

whatsAppMessageSchema.statics.updateStatus = async function (
  providerMessageId,
  status,
  details = {}
) {
  const update = { status };
  if (status === MESSAGE_STATUS.SENT) update.sentAt = new Date();
  if (status === MESSAGE_STATUS.DELIVERED) update.deliveredAt = new Date();
  if (status === MESSAGE_STATUS.READ) update.readAt = new Date();
  if (status === MESSAGE_STATUS.FAILED) {
    update.failedAt = new Date();
    update.errorMessage = details.errorMessage || 'Unknown error';
  }
  return this.findOneAndUpdate({ providerMessageId }, { $set: update }, { new: true });
};

whatsAppMessageSchema.statics.getStats = async function (period = '24h') {
  const since = new Date(Date.now() - (period === '24h' ? 86400000 : 604800000));
  const [outbound, inbound, failed] = await Promise.all([
    this.countDocuments({ direction: MESSAGE_DIRECTION.OUTBOUND, createdAt: { $gte: since } }),
    this.countDocuments({ direction: MESSAGE_DIRECTION.INBOUND, createdAt: { $gte: since } }),
    this.countDocuments({ status: MESSAGE_STATUS.FAILED, createdAt: { $gte: since } }),
  ]);
  return { period, outbound, inbound, failed, total: outbound + inbound };
};

module.exports =
  mongoose.models.WhatsAppMessage || mongoose.model('WhatsAppMessage', whatsAppMessageSchema);
