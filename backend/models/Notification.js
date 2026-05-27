/**
 * Notification Model
 *
 * Originally a pass-through to a top-level `UNIFIED_NOTIFICATION_MODEL.js`
 * that lived above the backend root. That file is gone — the unified
 * notification surface is now served by `services/unifiedNotificationManager.js`
 * and `services/unifiedNotification.service.js`. This model defines a single
 * Mongoose schema that the rest of the codebase can `require('../models/Notification')`
 * against, regardless of which surface (REST, queue worker, scheduler) is calling.
 */

'use strict';

const mongoose = require('mongoose');

if (mongoose.models.Notification) {
  module.exports = mongoose.models.Notification;
} else {
  const notificationSchema = new mongoose.Schema(
    {
      recipientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      recipientEmail: String,
      recipientPhone: String,
      notificationId: { type: String, unique: true, sparse: true },
      title: { type: String, required: true, trim: true, maxlength: 200 },
      message: { type: String, required: true, trim: true, maxlength: 2000 },
      body: { type: String, trim: true, maxlength: 2000 },
      type: {
        type: String,
        enum: [
          'info',
          'success',
          'warning',
          'error',
          'alert',
          'system',
          'task',
          'reminder',
          'approval',
          'message',
          'update',
          'finance',
          'hr',
          'security',
          'maintenance',
          'general',
          'notification',
        ],
        default: 'info',
      },
      category: { type: String, default: 'general' },
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent', 'critical'],
        default: 'medium',
      },
      read: { type: Boolean, default: false },
      isRead: { type: Boolean, default: false },
      readAt: Date,
      status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'read', 'failed', 'archived'],
        default: 'pending',
      },
      channel: {
        type: String,
        enum: ['in-app', 'email', 'sms', 'push', 'whatsapp', 'slack', 'all'],
        default: 'in-app',
      },
      link: String,
      actionUrl: String,
      metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
      data: { type: mongoose.Schema.Types.Mixed, default: {} },
      expiresAt: Date,
      deletedAt: Date,
    },
    {
      timestamps: true,
      toJSON: { virtuals: true },
      toObject: { virtuals: true },
    }
  );

  notificationSchema.index({ recipientId: 1, read: 1, createdAt: -1 });
  notificationSchema.index({ userId: 1, isRead: 1 });
  notificationSchema.index({ createdAt: -1 });
  notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

  module.exports =
    mongoose.models.Notification || mongoose.model('Notification', notificationSchema);
}
