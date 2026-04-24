'use strict';

/**
 * NotificationPreferences.model.js — Phase 16 Commit 8 (4.0.73).
 *
 * One document per user holding quiet-hours, per-channel opt-ins,
 * manual DND window, and digest preferences. Consumed by the
 * `notificationDispatch.service` when deciding how to route an
 * incoming notification.
 *
 * Why a dedicated collection rather than stamping fields on the
 * User model: channel opt-ins change frequently, the User schema
 * is shared with IAM and touching it is intrusive. A separate
 * model keeps the ownership boundary clean.
 *
 * Lazy-create pattern: callers that need prefs invoke
 * `getOrDefault(userId)` on the service, which upserts a default
 * doc if none exists.
 */

const mongoose = require('mongoose');
const {
  SUPPORTED_CHANNELS,
  DEFAULT_QUIET_HOURS,
  DEFAULT_DIGEST_HOUR,
} = require('../../config/notificationDispatch.registry');

const channelPrefSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    address: { type: String, default: null }, // email, phone, slack id, etc.
  },
  { _id: false }
);

const quietHoursSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: DEFAULT_QUIET_HOURS.enabled },
    startHour: { type: Number, default: DEFAULT_QUIET_HOURS.startHour, min: 0, max: 23 },
    endHour: { type: Number, default: DEFAULT_QUIET_HOURS.endHour, min: 0, max: 23 },
    timezone: { type: String, default: DEFAULT_QUIET_HOURS.timezone },
  },
  { _id: false }
);

const digestPrefSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: false },
    sendHour: { type: Number, default: DEFAULT_DIGEST_HOUR, min: 0, max: 23 },
    includePriorities: { type: [String], default: ['low', 'normal'] },
  },
  { _id: false }
);

const notificationPreferencesSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },

    // ── per-channel preferences ───────────────────────────────
    channelPreferences: {
      email: { type: channelPrefSchema, default: () => ({ enabled: true }) },
      sms: { type: channelPrefSchema, default: () => ({ enabled: true }) },
      push: { type: channelPrefSchema, default: () => ({ enabled: true }) },
      slack: { type: channelPrefSchema, default: () => ({ enabled: false }) },
      in_app: { type: channelPrefSchema, default: () => ({ enabled: true }) },
      whatsapp: { type: channelPrefSchema, default: () => ({ enabled: false }) },
    },

    // ── quiet hours ───────────────────────────────────────────
    quietHours: { type: quietHoursSchema, default: () => ({}) },

    // ── manual DND window (overrides everything except critical) ──
    dndUntil: { type: Date, default: null, index: true },
    dndReason: { type: String, default: null },

    // ── availability signal (set by calendar/meeting service) ──
    inMeetingUntil: { type: Date, default: null },
    inSessionUntil: { type: Date, default: null },

    // ── digest ────────────────────────────────────────────────
    digest: { type: digestPrefSchema, default: () => ({}) },
    lastDigestSentAt: { type: Date, default: null },

    // ── misc ──────────────────────────────────────────────────
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, collection: 'notification_preferences' }
);

notificationPreferencesSchema.index({ dndUntil: 1 });

const NotificationPreferences =
  mongoose.models.NotificationPreferences ||
  mongoose.model('NotificationPreferences', notificationPreferencesSchema);

module.exports = NotificationPreferences;
module.exports.SUPPORTED_CHANNELS = SUPPORTED_CHANNELS;
