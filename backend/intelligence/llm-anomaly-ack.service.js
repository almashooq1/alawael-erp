'use strict';

/**
 * llm-anomaly-ack.service.js — Wave 147.
 *
 * Operator acknowledgement / silencing for LLM anomalies. While an
 * ack is active, the [[wave146-llm-anomaly-dispatcher]] skips
 * delivering "anomaly-fired" events to channels. The anomaly stays
 * visible in the live dashboard so the operator can still see it —
 * acks are about reducing noise, not hiding state.
 *
 * Public API:
 *   ack({ anomalyId, durationMs, actor, role, reason, anomaly })
 *     → { ok, ack } | { ok:false, reason, errors }
 *   unack({ anomalyId })
 *     → { ok, removed } | { ok:false, reason }
 *   isAcked(anomalyId) → Promise<boolean>
 *   listActive() → Promise<Array<{anomalyId, expiresAt, ...}>>
 *
 * Behavior:
 *   - Duplicate ack of an active anomalyId: caller-friendly — we
 *     replace (extend) the expiration rather than erroring.
 *   - Expired acks are auto-deleted by Mongo's TTL on expiresAt.
 *   - Caller MUST supply durationMs > 0. Service caps to 30 days
 *     (model invariant; service surfaces validation).
 */

const VALID_DURATIONS = {
  ONE_HOUR_MS: 1 * 60 * 60 * 1000,
  SIX_HOURS_MS: 6 * 60 * 60 * 1000,
  ONE_DAY_MS: 24 * 60 * 60 * 1000,
  ONE_WEEK_MS: 7 * 24 * 60 * 60 * 1000,
};
const MAX_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

const REASON = Object.freeze({
  VALIDATION_FAILED: 'LLM_ANOMALY_ACK_VALIDATION_FAILED',
  NOT_FOUND: 'LLM_ANOMALY_ACK_NOT_FOUND',
  SAVE_FAILED: 'LLM_ANOMALY_ACK_SAVE_FAILED',
});

function createLlmAnomalyAckService({
  ackModel = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!ackModel) {
    throw new Error('llm-anomaly-ack: ackModel is required');
  }

  async function ack({
    anomalyId,
    durationMs,
    actor = null,
    role = null,
    reason = '',
    anomaly = null,
  } = {}) {
    if (!anomalyId || !String(anomalyId).trim()) {
      return {
        ok: false,
        reason: REASON.VALIDATION_FAILED,
        errors: { anomalyId: 'required' },
      };
    }
    const dur = Number(durationMs);
    if (!Number.isFinite(dur) || dur <= 0) {
      return {
        ok: false,
        reason: REASON.VALIDATION_FAILED,
        errors: { durationMs: 'must be a positive number of milliseconds' },
      };
    }
    if (dur > MAX_DURATION_MS) {
      return {
        ok: false,
        reason: REASON.VALIDATION_FAILED,
        errors: { durationMs: `cannot exceed ${MAX_DURATION_MS}ms (30 days)` },
      };
    }

    const acknowledgedAt = now();
    const expiresAt = new Date(acknowledgedAt.getTime() + dur);

    const payload = {
      anomalyId: String(anomalyId).trim(),
      acknowledgedAt,
      expiresAt,
      acknowledgedBy: actor ? String(actor).slice(0, 80) : null,
      acknowledgedByRole: role ? String(role).slice(0, 80) : null,
      reason: String(reason || '').slice(0, 500),
      anomalyKind: anomaly?.kind || null,
      anomalySeverity: anomaly?.severity || null,
      anomalySummary: anomaly?.summaryAr ? String(anomaly.summaryAr).slice(0, 500) : null,
    };

    // Upsert pattern: remove any existing ack for this anomalyId,
    // then insert fresh. Avoids the partial-unique index conflict
    // when caller wants to extend an existing ack.
    try {
      if (typeof ackModel.deleteMany === 'function') {
        await ackModel.deleteMany({ anomalyId: payload.anomalyId });
      } else if (typeof ackModel.deleteOne === 'function') {
        await ackModel.deleteOne({ anomalyId: payload.anomalyId });
      }
    } catch (err) {
      logger.warn && logger.warn(`[llm-anomaly-ack] delete-on-replace failed: ${err.message}`);
      // fall through — let the create surface the conflict if any
    }

    let doc;
    try {
      doc = new ackModel(payload);
      await doc.validate();
    } catch (err) {
      const errors = {};
      if (err && err.errors) {
        for (const [k, v] of Object.entries(err.errors)) {
          errors[k] = (v && v.message) || String(v);
        }
      }
      return { ok: false, reason: REASON.VALIDATION_FAILED, errors };
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error && logger.error(`[llm-anomaly-ack] save failed: ${err.message}`);
      return { ok: false, reason: REASON.SAVE_FAILED };
    }
    return { ok: true, ack: doc.toObject ? doc.toObject() : doc };
  }

  async function unack({ anomalyId } = {}) {
    if (!anomalyId || !String(anomalyId).trim()) {
      return { ok: false, reason: REASON.VALIDATION_FAILED, errors: { anomalyId: 'required' } };
    }
    const filter = { anomalyId: String(anomalyId).trim() };
    let removed = 0;
    try {
      if (typeof ackModel.deleteMany === 'function') {
        const r = await ackModel.deleteMany(filter);
        removed = r?.deletedCount ?? 0;
      } else if (typeof ackModel.deleteOne === 'function') {
        const r = await ackModel.deleteOne(filter);
        removed = r?.deletedCount ?? 0;
      }
    } catch (err) {
      logger.error && logger.error(`[llm-anomaly-ack] unack failed: ${err.message}`);
      return { ok: false, reason: REASON.SAVE_FAILED };
    }
    if (removed === 0) return { ok: false, reason: REASON.NOT_FOUND };
    return { ok: true, removed };
  }

  async function isAcked(anomalyId) {
    if (!anomalyId) return false;
    try {
      const cutoff = now();
      const q = ackModel.findOne({
        anomalyId: String(anomalyId).trim(),
        expiresAt: { $gt: cutoff },
      });
      // Some mocks return the result directly, real Mongoose returns a Query
      const r = typeof q?.lean === 'function' ? await q.lean() : await q;
      return !!r;
    } catch (err) {
      logger.warn && logger.warn(`[llm-anomaly-ack] isAcked threw: ${err.message}`);
      // Fail-open: when the ack layer breaks we'd rather page operators
      // than silently swallow alerts.
      return false;
    }
  }

  async function listActive() {
    try {
      const cutoff = now();
      const q = ackModel.find({ expiresAt: { $gt: cutoff } }).sort({ expiresAt: 1 });
      const items = typeof q?.lean === 'function' ? await q.lean() : await q;
      return { ok: true, items: items || [] };
    } catch (err) {
      logger.warn && logger.warn(`[llm-anomaly-ack] listActive threw: ${err.message}`);
      return { ok: true, items: [] };
    }
  }

  return { ack, unack, isAcked, listActive };
}

module.exports = {
  createLlmAnomalyAckService,
  VALID_DURATIONS,
  MAX_DURATION_MS,
  REASON,
};
