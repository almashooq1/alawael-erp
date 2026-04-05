'use strict';

const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    category: {
      type: String,
      required: true,
      enum: [
        'appointment',
        'billing',
        'hr',
        'transport',
        'clinical',
        'system',
        'quality',
        'inventory',
      ],
    },
    channelDatabase: { type: Boolean, default: true },
    channelEmail: { type: Boolean, default: true },
    channelSms: { type: Boolean, default: false },
    channelWhatsapp: { type: Boolean, default: true },
    channelPush: { type: Boolean, default: true },
    isMuted: { type: Boolean, default: false },
    quietHoursStart: { type: String, default: null }, // 'HH:MM'
    quietHoursEnd: { type: String, default: null },
  },
  { timestamps: true }
);

notificationPreferenceSchema.index({ userId: 1, category: 1 }, { unique: true });

module.exports =
  mongoose.models.NotificationPreference ||
  mongoose.model('NotificationPreference', notificationPreferenceSchema);
