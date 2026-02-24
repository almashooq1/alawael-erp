const mongoose = require('mongoose');

const scheduledNotificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    channels: {
      type: [String],
      enum: ['in-app', 'email', 'sms', 'whatsapp', 'push'],
      default: ['in-app'],
    },
    scheduleTime: {
      type: Date,
      required: true
    },
    sent: {
      type: Boolean,
      default: false,
    },
    sentAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

scheduledNotificationSchema.index({ sent: 1, scheduleTime: 1 });

const ScheduledNotification = mongoose.model('ScheduledNotification', scheduledNotificationSchema);

module.exports = ScheduledNotification;
