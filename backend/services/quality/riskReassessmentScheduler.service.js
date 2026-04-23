'use strict';

/**
 * riskReassessmentScheduler.service.js — Phase 13 Commit 8 (4.0.62).
 *
 * Hourly sweeper over the existing `backend/models/quality/Risk.model.js`
 * that enforces the ISO 9001 §6.1 / CBAHI LD.3 requirement to
 * periodically re-assess risks. Cadence depends on risk level:
 *
 *   critical → 30 days
 *   high     → 60 days
 *   medium   → 90 days
 *   low      → 180 days
 *
 * For each open risk whose `reviewDate` is either null or older
 * than its cadence window, emits `quality.risk.reassessment_due`
 * once per window crossing. Downstream listeners (calendar + email
 * + notifications) fan out without this service knowing about them.
 *
 * Does NOT mutate the Risk record itself — ownership of
 * `reviewDate` lives with the Quality Manager who performs the
 * re-assessment. This sweeper just raises the alert.
 */

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000;

const CADENCE_DAYS = Object.freeze({
  critical: 30,
  high: 60,
  medium: 90,
  low: 180,
});

const ACTIVE_STATUSES = Object.freeze(['open', 'mitigating', 'monitoring']);

/**
 * Pure helper: given a risk doc + current date, returns
 * `{ overdue, daysSinceReview, cadenceDays }` or `null` if the
 * risk is terminal/accepted.
 */
function computeOverdue(risk, now = new Date()) {
  if (!risk) return null;
  if (!ACTIVE_STATUSES.includes(risk.status)) return null;
  const cadenceDays = CADENCE_DAYS[risk.riskLevel] || CADENCE_DAYS.medium;
  const lastReview = risk.reviewDate ? new Date(risk.reviewDate) : new Date(risk.createdAt || now);
  const daysSinceReview = Math.floor((now.getTime() - lastReview.getTime()) / 86400000);
  return {
    overdue: daysSinceReview > cadenceDays,
    daysSinceReview,
    cadenceDays,
  };
}

function createRiskReassessmentScheduler({
  riskModel, // Risk mongoose model (required)
  dispatcher = null,
  logger = console,
  now = () => new Date(),
  intervalMs = DEFAULT_INTERVAL_MS,
  batchSize = 200,
} = {}) {
  if (!riskModel) throw new Error('riskReassessmentScheduler: riskModel required');

  let timer = null;
  // In-memory dedup so a risk that's continuously overdue doesn't
  // emit on every tick. Key: riskId; value: timestamp of last emit.
  const _lastEmit = new Map();

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[Risk-Scheduler] dispatch ${name} failed: ${err.message}`);
    }
  }

  async function tick() {
    const nowDate = now();
    const report = { scanned: 0, overdue: 0, dueSoon: 0, errors: 0 };

    try {
      const risks = await riskModel
        .find({ status: { $in: [...ACTIVE_STATUSES] } })
        .limit(batchSize);

      for (const r of risks) {
        report.scanned++;
        try {
          const info = computeOverdue(r, nowDate);
          if (!info) continue;

          if (info.overdue) {
            // Only emit once every 24h per risk.
            const lastAt = _lastEmit.get(String(r._id)) || 0;
            if (nowDate.getTime() - lastAt >= 24 * 60 * 60 * 1000) {
              report.overdue++;
              _lastEmit.set(String(r._id), nowDate.getTime());
              await _emit('quality.risk.reassessment_due', {
                riskId: String(r._id),
                riskNumber: r.riskNumber,
                riskLevel: r.riskLevel,
                status: r.status,
                daysSinceReview: info.daysSinceReview,
                cadenceDays: info.cadenceDays,
                branchId: r.branchId ? String(r.branchId) : null,
                ownerId: r.ownerId ? String(r.ownerId) : null,
              });
            }
          } else {
            // Optional "due soon" warning at 80% of cadence — lets
            // downstream calendar highlight before it goes red.
            const pct = info.daysSinceReview / info.cadenceDays;
            if (pct >= 0.8 && pct <= 1) {
              report.dueSoon++;
              const lastAt = _lastEmit.get(`soon:${r._id}`) || 0;
              if (nowDate.getTime() - lastAt >= 7 * 86400000) {
                _lastEmit.set(`soon:${r._id}`, nowDate.getTime());
                await _emit('quality.risk.reassessment_due_soon', {
                  riskId: String(r._id),
                  riskNumber: r.riskNumber,
                  riskLevel: r.riskLevel,
                  daysSinceReview: info.daysSinceReview,
                  cadenceDays: info.cadenceDays,
                });
              }
            }
          }
        } catch (err) {
          report.errors++;
          logger.warn(`[Risk-Scheduler] risk ${r._id}: ${err.message}`);
        }
      }
    } catch (err) {
      logger.warn(`[Risk-Scheduler] scan failed: ${err.message}`);
    }

    return report;
  }

  function start() {
    if (timer) return;
    timer = setInterval(() => {
      tick().catch(err => logger.warn(`[Risk-Scheduler] tick error: ${err.message}`));
    }, intervalMs);
    if (timer.unref) timer.unref();
    logger.info(`[Risk-Scheduler] started (interval ${intervalMs}ms)`);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function resetDedup() {
    _lastEmit.clear();
  }

  return { tick, start, stop, resetDedup, CADENCE_DAYS };
}

let _default = null;
function getDefault() {
  if (!_default) {
    try {
      const riskModel = require('../../models/quality/Risk.model');
      _default = createRiskReassessmentScheduler({ riskModel });
    } catch {
      return null;
    }
  }
  return _default;
}

module.exports = {
  createRiskReassessmentScheduler,
  computeOverdue,
  getDefault,
  DEFAULT_INTERVAL_MS,
  CADENCE_DAYS,
  ACTIVE_STATUSES,
};
