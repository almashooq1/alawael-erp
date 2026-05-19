'use strict';

/**
 * attendance-event-emitter.service.js — Wave 130.
 *
 * Decoupled outbox-pattern event emitter. Attendance services emit
 * lifecycle events here; downstream consumers (Payroll / HR Perf /
 * KPI / external systems) register handlers and the dispatch loop
 * delivers them.
 *
 * Why outbox (not event-bus-in-memory):
 *   - Survives process restart
 *   - Replay for failed deliveries
 *   - Idempotency on the outbox row (re-emit = upsert)
 *   - Audit trail per downstream system
 *
 * Topics (canonical):
 *   attendance.source-event.persisted
 *   attendance.exception.opened
 *   attendance.exception.resolved
 *   attendance.correction.approved
 *   attendance.correction.rejected
 *   attendance.daily-rollup
 *   attendance.payroll.period-locked
 *   attendance.payroll.period-reopened
 *
 * Public API:
 *   emit({ topic, payload, idempotencyKey, partitionKey? })
 *   subscribe(topic, handler)         — in-process handler registry
 *   unsubscribe(topic, handler)
 *   dispatchPending({ topic?, batchSize?, maxAttempts? })
 *   computeDailyRollup({ employeeId, dayDate, sourceEventModel })
 *     — pure helper; the caller decides whether to emit
 *
 * Handlers signature: async ({ topic, payload }) → { ok: bool, error? }
 * Handlers that return ok=false or throw mark the row failed with
 * lastError captured. Handlers that succeed mark delivered.
 */

const reg = require('./attendance.registry');

const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_ATTEMPTS = 5;

function createAttendanceEventEmitter({
  outboxModel = null,
  logger = console,
  now = () => new Date(),
} = {}) {
  if (!outboxModel) {
    throw new Error('attendance-event-emitter: outboxModel required');
  }

  // ─── Handler registry ──────────────────────────────────────

  const _handlers = new Map(); // topic → Set<handler>

  function subscribe(topic, handler) {
    if (!topic || typeof handler !== 'function') {
      return false;
    }
    if (!_handlers.has(topic)) _handlers.set(topic, new Set());
    _handlers.get(topic).add(handler);
    return true;
  }

  function unsubscribe(topic, handler) {
    const s = _handlers.get(topic);
    if (!s) return false;
    return s.delete(handler);
  }

  function listSubscribers(topic) {
    const s = _handlers.get(topic);
    return s ? [...s] : [];
  }

  // ─── Emit ──────────────────────────────────────────────────

  async function emit({ topic, payload, idempotencyKey, partitionKey = null } = {}) {
    if (!topic || !idempotencyKey || payload === undefined || payload === null) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: {
          topic: !topic ? 'required' : undefined,
          payload: payload == null ? 'required' : undefined,
          idempotencyKey: !idempotencyKey ? 'required' : undefined,
        },
      };
    }

    // Idempotent: same key → return existing row.
    let existing = null;
    try {
      const cursor = outboxModel.findOne({ idempotencyKey });
      existing = typeof cursor.lean === 'function' ? await cursor.lean() : await cursor;
    } catch (err) {
      logger.warn(`[event-emitter] dup lookup failed: ${err.message}`);
    }
    if (existing) {
      return { ok: true, idempotent: true, row: existing };
    }

    const doc = new outboxModel({
      topic,
      payload,
      idempotencyKey,
      partitionKey,
      status: 'pending',
      createdAt: now(),
    });
    try {
      await doc.validate();
    } catch (err) {
      const errors = {};
      if (err && err.errors) {
        for (const [k, v] of Object.entries(err.errors)) {
          errors[k] = (v && v.message) || String(v);
        }
      }
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED, errors };
    }
    try {
      await doc.save();
    } catch (err) {
      logger.error('[event-emitter] save failed:', err.message);
      return { ok: false, reason: reg.REASON.SAVE_FAILED };
    }
    return { ok: true, row: doc.toObject ? doc.toObject() : doc };
  }

  // ─── Dispatch ──────────────────────────────────────────────

  async function _loadPending({ topic, batchSize }) {
    const q = { status: 'pending' };
    if (topic) q.topic = topic;
    let cursor = outboxModel.find(q);
    if (typeof cursor.sort === 'function') cursor = cursor.sort({ createdAt: 1 });
    if (typeof cursor.limit === 'function') cursor = cursor.limit(batchSize);
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    try {
      return (await cursor) || [];
    } catch (err) {
      logger.warn(`[event-emitter] load pending failed: ${err.message}`);
      return [];
    }
  }

  async function _markRow(id, patch) {
    try {
      await outboxModel.updateOne({ _id: id }, { $set: patch });
      return true;
    } catch (err) {
      logger.warn(`[event-emitter] mark failed: ${err.message}`);
      return false;
    }
  }

  async function dispatchPending({
    topic = null,
    batchSize = DEFAULT_BATCH_SIZE,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
  } = {}) {
    const rows = await _loadPending({ topic, batchSize });
    let delivered = 0;
    let failed = 0;
    let noHandlers = 0;
    for (const row of rows) {
      const subs = listSubscribers(row.topic);
      if (subs.length === 0) {
        noHandlers += 1;
        continue;
      }
      const attempts = (row.deliveryAttempts || 0) + 1;
      let allOk = true;
      let firstErr = null;
      for (const handler of subs) {
        try {
          const r = await handler({ topic: row.topic, payload: row.payload });
          if (r && r.ok === false) {
            allOk = false;
            firstErr = r.error || 'HANDLER_RETURNED_NOT_OK';
            break;
          }
        } catch (err) {
          allOk = false;
          firstErr = (err && err.message) || String(err);
          break;
        }
      }
      if (allOk) {
        delivered += 1;
        await _markRow(row._id, {
          status: 'delivered',
          deliveredAt: now(),
          deliveryAttempts: attempts,
          lastError: null,
        });
      } else {
        if (attempts >= maxAttempts) {
          failed += 1;
          await _markRow(row._id, {
            status: 'failed',
            deliveryAttempts: attempts,
            lastError: String(firstErr).slice(0, 500),
          });
        } else {
          // Keep pending; bump attempts + error so the next dispatch
          // tries again (back-off is the consumer-job's concern).
          await _markRow(row._id, {
            deliveryAttempts: attempts,
            lastError: String(firstErr).slice(0, 500),
          });
        }
      }
    }
    return {
      ok: true,
      scanned: rows.length,
      delivered,
      failed,
      noHandlers,
    };
  }

  // ─── Pure helper: computeDailyRollup ────────────────────────

  async function computeDailyRollup({ employeeId, dayDate, sourceEventModel }) {
    if (!employeeId) return { ok: false, reason: reg.REASON.EMPLOYEE_REQUIRED };
    if (!dayDate) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { dayDate: 'required' },
      };
    }
    if (!sourceEventModel) {
      return {
        ok: false,
        reason: reg.REASON.VALIDATION_FAILED,
        errors: { sourceEventModel: 'required' },
      };
    }
    const day = new Date(dayDate);
    day.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayDate);
    dayEnd.setHours(23, 59, 59, 999);

    let cursor = sourceEventModel.find({
      employeeId,
      eventTime: { $gte: day, $lte: dayEnd },
    });
    if (typeof cursor.lean === 'function') cursor = cursor.lean();
    let events = [];
    try {
      events = (await cursor) || [];
    } catch (err) {
      logger.warn(`[event-emitter] rollup read failed: ${err.message}`);
      return { ok: false, reason: reg.REASON.VALIDATION_FAILED };
    }
    events.sort((a, b) => new Date(a.eventTime) - new Date(b.eventTime));
    const checkIn = events.find(e => e.eventKind === 'check-in') || null;
    const checkOut = [...events].reverse().find(e => e.eventKind === 'check-out') || null;
    let workedMinutes = null;
    if (checkIn && checkOut) {
      const span = new Date(checkOut.eventTime).getTime() - new Date(checkIn.eventTime).getTime();
      workedMinutes = Math.max(0, Math.round(span / 60_000));
    }
    return {
      ok: true,
      employeeId,
      day,
      eventCount: events.length,
      checkInAt: checkIn ? checkIn.eventTime : null,
      checkOutAt: checkOut ? checkOut.eventTime : null,
      workedMinutes,
      sources: [...new Set(events.map(e => e.source))],
      flags: [...new Set(events.flatMap(e => e.flags || []))],
    };
  }

  return {
    emit,
    subscribe,
    unsubscribe,
    listSubscribers,
    dispatchPending,
    computeDailyRollup,
    DEFAULT_BATCH_SIZE,
    DEFAULT_MAX_ATTEMPTS,
  };
}

module.exports = {
  createAttendanceEventEmitter,
  DEFAULT_BATCH_SIZE,
  DEFAULT_MAX_ATTEMPTS,
};
