'use strict';

/**
 * WhatsApp DLQ Service — خدمة قائمة الفشل
 * ═══════════════════════════════════════════════════════════════════════════
 * Two responsibilities:
 *   1. `enqueue(payload, error, ctx)` — called from the send wrappers when
 *      in-process retries are exhausted. Persists to WhatsAppDlq.
 *   2. `sweepOnce()` — picks the next pending item and attempts a replay.
 *      Worker bootstrap calls this on an interval.
 *
 * The send → DLQ → replay loop is the only piece that survives process
 * restarts. In-memory back-off in `whatsappService.withRetry` covers Meta's
 * "soft" 429s; the DLQ covers everything else.
 *
 * @module services/whatsapp/dlq.service
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

function getDlqModel() {
  try {
    return mongoose.model('WhatsAppDlq');
  } catch {
    return require('../../models/WhatsAppDlq');
  }
}

function getService() {
  // Lazy to avoid circular import: dlq.service ← whatsappService → dlq.service
  return require('./whatsappService');
}

/**
 * Persist a failed send. Returns the DLQ document (or null if the model is
 * unavailable — e.g. during early bootstrap or in tests that skip mongoose).
 */
async function enqueue(sendType, payload, error, ctx = {}) {
  const Dlq = getDlqModel();
  if (!Dlq) return null;
  try {
    return await Dlq.enqueueFailure(payload, error, { sendType, ...ctx });
  } catch (err) {
    logger.warn(`[WhatsApp DLQ] enqueue failed (will drop): ${err.message}`);
    return null;
  }
}

/**
 * Replay a single DLQ item by id. Used by:
 *   - sweepOnce() (worker path)
 *   - admin "force replay" endpoint
 *
 * The actual send is dispatched via the canonical service so it goes
 * through consent + rate-limit + signature-verification paths just like a
 * fresh send.
 */
async function replayOne(id, { skipConsent = false } = {}) {
  const Dlq = getDlqModel();
  if (!Dlq) return { ok: false, error: 'dlq_model_unavailable' };

  const doc = await Dlq.findById(id);
  if (!doc) return { ok: false, error: 'not_found' };
  if (doc.status === 'replayed') return { ok: true, alreadyReplayed: true };

  const svc = getService();
  let sendResult;
  try {
    sendResult = await dispatchByType(svc, doc.sendType, doc.payload, { skipConsent });
  } catch (err) {
    await Dlq.markRetryFailure(id, err);
    return { ok: false, error: err.message };
  }

  if (sendResult?.success) {
    await Dlq.markReplayed(id, sendResult.messageId || null);
    return { ok: true, result: sendResult };
  }
  await Dlq.markRetryFailure(id, new Error('replay returned non-success'));
  return { ok: false, error: 'send_not_successful' };
}

/**
 * Walk the next ready item (status=pending, nextRetryAt<=now), claim it,
 * attempt replay. Returns { processed: 0|1, ... }. Single-step so the
 * caller can drive the cadence (bootstrap timer or admin-triggered).
 */
async function sweepOnce() {
  const Dlq = getDlqModel();
  if (!Dlq) return { processed: 0, reason: 'dlq_model_unavailable' };

  const item = await Dlq.claimNext();
  if (!item) return { processed: 0, reason: 'nothing_due' };

  // Replay with consent re-check — if a beneficiary opted out between the
  // original send and now, we must respect that.
  const r = await replayOne(item._id, { skipConsent: false });
  return { processed: 1, id: item._id, ...r };
}

function dispatchByType(svc, sendType, payload, _opts) {
  switch (sendType) {
    case 'text':
      return svc.sendText(payload.to, payload.text, payload.meta || {});
    case 'template':
      return svc.sendTemplate(
        payload.to,
        payload.templateName,
        payload.language || 'ar',
        payload.components || []
      );
    case 'document':
      return svc.sendDocument(payload.to, payload.url, payload.caption || '', payload.opts || {});
    case 'image':
      return svc.sendImage(payload.to, payload.url, payload.caption || '');
    case 'interactive':
      if (payload.kind === 'buttons') {
        return svc.sendInteractiveButtons(
          payload.to,
          payload.bodyText,
          payload.buttons,
          payload.headerText,
          payload.footerText
        );
      }
      return svc.sendInteractiveList(
        payload.to,
        payload.bodyText,
        payload.buttonLabel,
        payload.items,
        payload.sectionTitle
      );
    case 'otp':
      return svc.sendOtp(payload.to, payload.otp, payload.expiryMinutes || 5);
    case 'notification':
      return svc.sendNotification(payload.to, payload.title, payload.body);
    default:
      // Unknown sendType — keep the doc but advance attempts so it eventually
      // exhausts instead of blocking the queue.
      return Promise.resolve({ success: false, unsupported: true });
  }
}

// ─── Worker bootstrap ──────────────────────────────────────────────────────

let sweepTimer = null;

/**
 * Start a periodic sweeper. Idempotent — calling twice does NOT double-fire.
 * Default cadence: every 30 seconds. The interval is decoupled from
 * nextRetryAt so a delayed item just waits one extra tick at worst.
 *
 * Call once from `startup/` bootstrap. Pairs with stop() in tests.
 */
function startWorker({ intervalMs = 30_000 } = {}) {
  if (sweepTimer) return;
  if (process.env.WHATSAPP_DLQ_WORKER_DISABLED === 'true') {
    logger.info('[WhatsApp DLQ] worker disabled via env');
    return;
  }
  sweepTimer = setInterval(async () => {
    try {
      const r = await sweepOnce();
      if (r.processed) {
        logger.info(`[WhatsApp DLQ] swept ${r.id} → ${r.ok ? 'replayed' : 'failed'}`);
      }
    } catch (err) {
      logger.warn(`[WhatsApp DLQ] sweep error: ${err.message}`);
    }
  }, intervalMs);
  if (typeof sweepTimer.unref === 'function') sweepTimer.unref();
  logger.info(`[WhatsApp DLQ] worker started (every ${intervalMs}ms)`);
}

function stopWorker() {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}

module.exports = {
  enqueue,
  replayOne,
  sweepOnce,
  startWorker,
  stopWorker,
};
