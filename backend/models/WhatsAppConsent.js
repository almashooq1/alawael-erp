'use strict';

/**
 * WhatsAppConsent — opt-in / opt-out tracking
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Required by:
 *   1. Meta WhatsApp Business Policy — sending marketing/notification
 *      messages to numbers that haven't opted in risks account suspension.
 *   2. Saudi PDPL Art.13 — operators must keep a record of consent
 *      decisions for any messaging that handles personal data.
 *
 * Model is keyed by E.164 phone (without `+`). One document per phone.
 * Consent state is the most-recent record on the `history` array; the
 * top-level `optedIn` field caches it for fast queries.
 *
 * Anyone calling whatsappService.sendText / sendTemplate / etc. should
 * first call `WhatsAppConsent.canMessage(phone)` and short-circuit if
 * `false`. Transactional 1:1 replies to an inbound message are exempt
 * (Meta's 24-hour service window) — see `canReply()`.
 */

const mongoose = require('mongoose');

const consentHistorySchema = new mongoose.Schema(
  {
    optedIn: { type: Boolean, required: true },
    reason: {
      type: String,
      enum: ['user_request', 'admin_action', 'imported', 'first_inbound', 'spam_complaint'],
      default: 'admin_action',
    },
    channel: {
      type: String,
      enum: ['whatsapp_reply', 'web_form', 'admin_ui', 'csv_import', 'api'],
      default: 'admin_ui',
    },
    note: { type: String, default: null },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    ip: { type: String, default: null },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const whatsappConsentSchema = new mongoose.Schema(
  {
    /** E.164 without `+` (e.g. `966512345678`). */
    phone: { type: String, required: true, unique: true, trim: true },

    /** Cached: most-recent history entry's `optedIn`. */
    optedIn: { type: Boolean, default: false, index: true },

    /** When the user/admin last toggled consent. */
    optedInAt: { type: Date, default: null },
    optedOutAt: { type: Date, default: null },

    /**
     * Last inbound message timestamp. Used by `canReply()` to enforce
     * Meta's 24-hour customer-service window for free-form replies.
     */
    lastInboundAt: { type: Date, default: null },

    /** Optional link to the family member / beneficiary the phone belongs to. */
    familyMemberId: { type: mongoose.Schema.Types.ObjectId, ref: 'FamilyMember', default: null },
    beneficiaryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Beneficiary', default: null },

    history: { type: [consentHistorySchema], default: [] },
  },
  { timestamps: true, collection: 'whatsapp_consents' }
);

whatsappConsentSchema.index({ familyMemberId: 1 });
whatsappConsentSchema.index({ beneficiaryId: 1 });

/**
 * Set opt-in/out state. Pushes a history entry and updates cached fields.
 * Always returns the updated doc.
 */
whatsappConsentSchema.statics.setConsent = async function (phone, optedIn, ctx = {}) {
  const now = new Date();
  const entry = {
    optedIn,
    reason: ctx.reason || 'admin_action',
    channel: ctx.channel || 'admin_ui',
    note: ctx.note || null,
    actorUserId: ctx.actorUserId || null,
    ip: ctx.ip || null,
    at: now,
  };
  const update = {
    $setOnInsert: { phone },
    $set: {
      optedIn,
      ...(optedIn ? { optedInAt: now } : { optedOutAt: now }),
    },
    $push: { history: entry },
  };
  return this.findOneAndUpdate({ phone }, update, { upsert: true, new: true });
};

/**
 * Record an inbound message — opens / extends the 24-hour reply window
 * AND optionally marks consent as opted-in on first contact.
 */
whatsappConsentSchema.statics.recordInbound = async function (phone, opts = {}) {
  const now = new Date();
  const existing = await this.findOne({ phone });
  if (!existing) {
    // First-time inbound = implicit opt-in (user initiated contact).
    return this.create({
      phone,
      optedIn: true,
      optedInAt: now,
      lastInboundAt: now,
      familyMemberId: opts.familyMemberId || null,
      beneficiaryId: opts.beneficiaryId || null,
      history: [
        {
          optedIn: true,
          reason: 'first_inbound',
          channel: 'whatsapp_reply',
          at: now,
        },
      ],
    });
  }
  existing.lastInboundAt = now;
  if (opts.familyMemberId && !existing.familyMemberId)
    existing.familyMemberId = opts.familyMemberId;
  if (opts.beneficiaryId && !existing.beneficiaryId) existing.beneficiaryId = opts.beneficiaryId;
  await existing.save();
  return existing;
};

/**
 * Can we send ANY message (template / marketing) to this phone?
 * Requires explicit opt-in (or a fresh inbound within 24h, since the
 * customer-service window covers any message during it).
 */
whatsappConsentSchema.statics.canMessage = async function (phone) {
  if (!phone) return { allowed: false, reason: 'no_phone' };
  const doc = await this.findOne({ phone }).lean();
  if (!doc) return { allowed: false, reason: 'no_consent_record' };
  if (doc.optedIn) return { allowed: true, reason: 'opted_in' };
  if (doc.lastInboundAt && Date.now() - new Date(doc.lastInboundAt).getTime() < 24 * 3600 * 1000) {
    return { allowed: true, reason: 'in_service_window' };
  }
  return { allowed: false, reason: 'opted_out' };
};

/**
 * Can we send a free-form reply (not a pre-approved template)? Only
 * within Meta's 24-hour customer-service window from the last inbound.
 */
whatsappConsentSchema.statics.canReply = async function (phone) {
  const doc = await this.findOne({ phone }).lean();
  if (!doc || !doc.lastInboundAt) return false;
  return Date.now() - new Date(doc.lastInboundAt).getTime() < 24 * 3600 * 1000;
};

module.exports =
  mongoose.models.WhatsAppConsent || mongoose.model('WhatsAppConsent', whatsappConsentSchema);
