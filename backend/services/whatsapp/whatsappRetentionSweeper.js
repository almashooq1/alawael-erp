'use strict';

/**
 * WhatsApp conversation retention sweeper (W1424n).
 * ══════════════════════════════════════════════════════════════════════════
 * PDPL data-minimisation MECHANISM — intentionally OFF by default. The WhatsApp
 * conversation thread holds guardian PII (phone, message bodies, internal notes);
 * the audit flagged it has no retention. But the retention WINDOW for clinical
 * communication is a regulated policy decision (often years), NOT an agent call —
 * so this ships as a switch, not a default. The owner enables it + sets the
 * window via env (ENABLE_WHATSAPP_RETENTION_SWEEPER=true + WHATSAPP_RETENTION_DAYS).
 *
 * When enabled, deletes WhatsAppConversation docs whose last activity is older
 * than the window. Deletion (not archival) = simplest PDPL-minimisation; switch
 * to archival if records must be retained in cold storage.
 */

function getConversationModel() {
  try {
    return require('mongoose').model('WhatsAppConversation');
  } catch {
    try {
      return require('../../models/WhatsAppConversation');
    } catch {
      return null;
    }
  }
}

/**
 * Delete conversations whose lastMessageAt (fallback createdAt) is older than
 * `days`. Best-effort, never throws to the scheduler. Returns a summary.
 * @param {{days:number, now?:Date, logger?:object, dryRun?:boolean}} opts
 */
async function sweepExpired({ days, now = new Date(), logger = console, dryRun = false } = {}) {
  if (!Number.isFinite(days) || days < 1) {
    return { ok: false, reason: 'invalid_days', deleted: 0 };
  }
  const Conversation = getConversationModel();
  if (!Conversation) return { ok: false, reason: 'model_unavailable', deleted: 0 };

  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const filter = {
    $or: [{ lastMessageAt: { $lt: cutoff } }, { lastMessageAt: { $exists: false }, createdAt: { $lt: cutoff } }],
  };

  if (dryRun) {
    const count = await Conversation.countDocuments(filter);
    logger.info?.(`[WhatsApp Retention] DRY-RUN — ${count} conversations older than ${days}d (cutoff ${cutoff.toISOString()})`);
    return { ok: true, deleted: 0, wouldDelete: count, cutoff, dryRun: true };
  }

  const res = await Conversation.deleteMany(filter);
  const deleted = res?.deletedCount || 0;
  logger.info?.(`[WhatsApp Retention] swept ${deleted} conversations older than ${days}d (cutoff ${cutoff.toISOString()})`);
  return { ok: true, deleted, cutoff };
}

module.exports = { sweepExpired, getConversationModel };
