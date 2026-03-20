/* eslint-disable no-unused-vars */
const mongoose = require('mongoose');

const smartNotificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 1000 },
    type: {
      type: String,
      enum: ['info', 'warning', 'error', 'success', 'task', 'reminder', 'system', 'approval'],
      default: 'info',
    },
    category: {
      type: String,
      enum: ['general', 'hr', 'finance', 'medical', 'admin', 'security', 'maintenance'],
      default: 'general',
    },
    priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    link: { type: String },
    actionRequired: { type: Boolean, default: false },
    actionTaken: { type: Boolean, default: false },
    actionUrl: { type: String },
    relatedModel: { type: String },
    relatedId: { type: mongoose.Schema.Types.ObjectId },
    channel: {
      type: String,
      enum: ['in_app', 'email', 'sms', 'push', 'whatsapp'],
      default: 'in_app',
    },
    deliveryStatus: {
      type: String,
      enum: ['pending', 'sent', 'delivered', 'failed'],
      default: 'pending',
    },
    expiresAt: { type: Date },
    metadata: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

smartNotificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });
smartNotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports =
  mongoose.models.SmartNotification || mongoose.model('SmartNotification', smartNotificationSchema);
