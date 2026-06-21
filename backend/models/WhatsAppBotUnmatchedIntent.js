'use strict';

/**
 * WhatsAppBotUnmatchedIntent — W1417 bot tuning-feedback loop.
 * ════════════════════════════════════════════════════════════════════════════
 * When the menu bot cannot route an idle free-text message to any unit
 * (`resolveUnitId → null`), it re-shows the menu — but the user's phrase was
 * lost, so nobody could see WHAT users ask that the bot misses. This collection
 * captures those misses (aggregated by normalized phrase + a hit count) so an
 * admin can review the top unmatched intents and extend `UNIT_KEYWORDS`
 * (data-driven keyword tuning, the natural complement to W1416's smarter NLU).
 *
 * Privacy (PDPL): stores the NORMALIZED intent phrase (an intent, not a data
 * submission) + a truncated raw sample, aggregated; 30-day TTL on `lastSeen`
 * auto-expires it; the read endpoint is admin-gated. This is aggregate tuning
 * telemetry, not per-beneficiary PII — so it is intentionally GLOBAL (not
 * branch-scoped); a phrase like "ابغى احجز" carries no tenant boundary.
 */

const mongoose = require('mongoose');

const whatsAppBotUnmatchedIntentSchema = new mongoose.Schema(
  {
    /** Normalized phrase (match key) — see registry.normalize(). Unique. */
    phrase: { type: String, required: true, unique: true, trim: true },
    /** How many times this phrase has been seen unmatched. */
    count: { type: Number, default: 1, min: 1 },
    /** Most-recent raw sample (truncated) — context for the admin. */
    sample: { type: String, default: null },
    firstSeen: { type: Date, default: Date.now },
    /** TTL anchor — refreshed on every hit; doc expires 30d after last seen. */
    lastSeen: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

// Top-N by frequency (the admin review query).
whatsAppBotUnmatchedIntentSchema.index({ count: -1, lastSeen: -1 });
// 30-day PDPL TTL — aggregate tuning telemetry must not accumulate forever.
whatsAppBotUnmatchedIntentSchema.index({ lastSeen: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

module.exports =
  mongoose.models.WhatsAppBotUnmatchedIntent ||
  mongoose.model('WhatsAppBotUnmatchedIntent', whatsAppBotUnmatchedIntentSchema);
