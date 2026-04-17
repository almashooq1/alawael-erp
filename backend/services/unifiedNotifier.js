/**
 * unifiedNotifier.js — single entry point for multi-channel notifications.
 *
 * One function, smart routing:
 *   notify({ to, channels, subject, body, priority, beneficiaryId, ... })
 *
 * Default channel priority: whatsapp → sms → email
 * If a channel fails, the next is tried automatically (unless channels is
 * an exact list — then each is attempted independently).
 *
 * All deliveries are logged to the NotificationLog collection (for audit
 * + retry + reporting).
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');
const sendEmail = require('./emailService');
const sendSMS = require('./smsService');
const sendPush = require('./pushService');

// ── NotificationLog model (created inline if absent) ───────────────────────
const logSchema = new mongoose.Schema(
  {
    channel: { type: String, enum: ['whatsapp', 'sms', 'email', 'push', 'in-app'], required: true },
    to: { type: String, required: true, trim: true },
    subject: { type: String, trim: true, maxlength: 500 },
    body: { type: String, trim: true, maxlength: 4000 },
    priority: { type: String, enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
    status: {
      type: String,
      enum: ['pending', 'sent', 'failed', 'skipped'],
      default: 'pending',
      index: true,
    },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, maxlength: 500 },
    providerMessageId: { type: String, maxlength: 200 },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    templateKey: { type: String, maxlength: 100 },
    metadata: { type: Object },
    sentAt: { type: Date },
  },
  { timestamps: true }
);
logSchema.index({ createdAt: -1 });
logSchema.index({ channel: 1, status: 1 });
const NotificationLog =
  mongoose.models.NotificationLog || mongoose.model('NotificationLog', logSchema);

// ── WhatsApp via wa.me link (client-side) OR Cloud API (server-side) ──
// Client-side wa.me is a URL (not actually sent) — kept for frontend use.
// This function only logs + returns a shareable URL. Real delivery needs
// WhatsApp Cloud API credentials (WA_TOKEN, WA_PHONE_NUMBER_ID).
async function sendWhatsApp({ to, body }) {
  const token = process.env.WA_TOKEN;
  const phoneId = process.env.WA_PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    return {
      success: false,
      skipped: true,
      reason: 'wa_cloud_api_not_configured',
      fallbackUrl: `https://wa.me/${to.replace(/\D/g, '')}?text=${encodeURIComponent(body)}`,
    };
  }

  try {
    const resp = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: to.replace(/\D/g, ''),
        type: 'text',
        text: { body },
      }),
    });
    const data = await resp.json().catch(() => ({}));
    if (resp.ok) {
      return { success: true, providerMessageId: data.messages?.[0]?.id };
    }
    return { success: false, error: data.error?.message || `HTTP ${resp.status}` };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ── Main dispatcher ────────────────────────────────────────────────────────
/**
 * @param {object} opts
 *   to:          string|{phone,email,token}
 *   channels:    array of 'whatsapp'|'sms'|'email'|'push' (tried in order)
 *                OR 'auto' (default): whatsapp→sms→email fallback chain
 *   subject:     string (for email)
 *   body:        string (required)
 *   priority:    'low'|'normal'|'high'|'urgent'
 *   templateKey: string (for audit/analytics)
 *   beneficiaryId, userId: ObjectId refs
 *   metadata:    any extra data to log
 */
async function notify(opts) {
  const {
    to,
    channels = 'auto',
    subject,
    body,
    priority = 'normal',
    templateKey,
    beneficiaryId,
    userId,
    metadata,
  } = opts;

  if (!body) throw new Error('notify: body is required');
  if (!to) throw new Error('notify: to is required');

  const toObj =
    typeof to === 'string'
      ? { phone: to.includes('@') ? '' : to, email: to.includes('@') ? to : '' }
      : to;

  // Resolve channel list
  const channelList =
    channels === 'auto'
      ? ['whatsapp', 'sms', 'email'].filter(c => {
          if (c === 'whatsapp' || c === 'sms') return !!toObj.phone;
          if (c === 'email') return !!toObj.email;
          return false;
        })
      : Array.isArray(channels)
        ? channels
        : [channels];

  const results = [];

  for (const channel of channelList) {
    const log = await NotificationLog.create({
      channel,
      to: toObj[channel === 'email' ? 'email' : 'phone'] || String(to),
      subject,
      body,
      priority,
      status: 'pending',
      beneficiaryId,
      userId,
      templateKey,
      metadata,
    });

    let result;
    try {
      if (channel === 'whatsapp') {
        result = await sendWhatsApp({ to: toObj.phone, body });
      } else if (channel === 'sms') {
        result = await sendSMS({ to: toObj.phone, message: body });
      } else if (channel === 'email') {
        result = await sendEmail({
          to: toObj.email,
          subject: subject || 'إشعار من مراكز الأوائل',
          body,
        });
      } else if (channel === 'push') {
        result = await sendPush({ to: toObj.token, notification: { title: subject, body } });
      } else {
        result = { success: false, error: 'unsupported_channel' };
      }
    } catch (err) {
      result = { success: false, error: err.message };
    }

    log.attempts = 1;
    log.status = result.success ? 'sent' : result.skipped ? 'skipped' : 'failed';
    log.lastError = result.error || result.reason || '';
    log.providerMessageId = result.providerMessageId;
    log.sentAt = result.success ? new Date() : undefined;
    await log.save();

    results.push({ channel, ...result, logId: log._id });

    // In 'auto' mode, stop on first success (fallback chain).
    if (channels === 'auto' && result.success) break;
  }

  const anySuccess = results.some(r => r.success);
  logger.info('[notify]', { channels: channelList, success: anySuccess, count: results.length });
  return { success: anySuccess, results };
}

module.exports = { notify, NotificationLog, sendWhatsApp };
