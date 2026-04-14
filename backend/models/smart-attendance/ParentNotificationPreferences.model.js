'use strict';

const mongoose = require('mongoose');

const ParentNotificationPreferencesSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
      unique: true,
    },
    parentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Parent',
      },
    ],
    communicationChannels: {
      email: {
        enabled: Boolean,
        addresses: [String],
      },
      sms: {
        enabled: Boolean,
        numbers: [String],
      },
      pushNotification: {
        enabled: Boolean,
      },
      whatsapp: {
        enabled: Boolean,
        numbers: [String],
      },
      inApp: {
        enabled: Boolean,
      },
    },
    alertPreferences: {
      lateArrival: {
        enabled: Boolean,
        threshold: {
          type: String,
          enum: ['any', '5', '10', '15', 'none'],
          default: 'any',
        },
        frequency: {
          type: String,
          enum: ['immediate', 'daily_summary', 'weekly_summary'],
        },
      },
      absence: {
        enabled: Boolean,
        notifyImmediately: Boolean,
      },
      earlyDeparture: {
        enabled: Boolean,
      },
      healthAlert: {
        enabled: Boolean,
        alertOnFever: Boolean,
        threshold: Number,
      },
      behavioralAlert: {
        enabled: Boolean,
      },
      monthlyReport: {
        enabled: Boolean,
        deliveryDate: Number, // Day of month
      },
    },
    quietHours: {
      enabled: Boolean,
      startTime: String, // HH:mm
      endTime: String,
      daysApplicable: [String], // Monday, Tuesday, etc.
    },
    language: {
      type: String,
      enum: ['AR', 'EN'],
      default: 'AR',
    },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'parent_notification_preferences' }
);

const ParentNotificationPreferences =
  mongoose.models.ParentNotificationPreferences ||
  mongoose.model('ParentNotificationPreferences', ParentNotificationPreferencesSchema);

module.exports = ParentNotificationPreferences;
