'use strict';

/**
 * WhatsAppBotUnitUsage — W1419 bot usage funnel.
 * ════════════════════════════════════════════════════════════════════════════
 * Per-unit counters for the menu bot: how many conversations ENTERED each unit
 * vs how many COMPLETED its flow (reached a side effect). Together with W1417's
 * unmatched-intent capture this gives an admin the full picture — which units
 * users engage, and where flows are abandoned (entered ≫ completed = a flow that
 * needs shortening). Aggregate non-PII counters (a unit id + integers), so no
 * TTL — usage trends are worth keeping. Admin-gated read endpoint.
 */

const mongoose = require('mongoose');

const whatsAppBotUnitUsageSchema = new mongoose.Schema(
  {
    /** Unit id from the registry (e.g. 'appointment', 'complaint'). Unique. */
    unitId: { type: String, required: true, unique: true, trim: true },
    /** Times a conversation entered this unit from idle. */
    entered: { type: Number, default: 0, min: 0 },
    /** Times a flow in this unit completed (reached a side effect). */
    completed: { type: Number, default: 0, min: 0 },
    lastUsed: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

module.exports =
  mongoose.models.WhatsAppBotUnitUsage ||
  mongoose.model('WhatsAppBotUnitUsage', whatsAppBotUnitUsageSchema);
