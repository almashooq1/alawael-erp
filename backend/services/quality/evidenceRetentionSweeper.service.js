'use strict';

/**
 * evidenceRetentionSweeper.service.js — Phase 13 Commit 11 (4.0.60).
 *
 * Scans the EvidenceItem collection on a cadence and:
 *
 *   1. Flips items past `validUntil` to status `expired` (unless
 *      already terminal) and emits `compliance.evidence.expired`.
 *
 *   2. Emits `compliance.evidence.expiring` once per item that has
 *      crossed a warning window (default 30d, 14d, 7d, 1d) — using
 *      an in-process `alertsFired` snapshot stored on the item's
 *      retention metadata so we never double-fire.
 *
 *   3. Produces a summary report `{ expired, expiring, scanned }`
 *      for operator visibility.
 *
 * Pure service with a driver pair (`start`, `stop`). Registered by
 * the qualityCompliance bootstrap. Tests drive it by calling
 * `tick()` directly.
 */

const DEFAULT_WARNING_WINDOWS = Object.freeze([30, 14, 7, 1]);

function createEvidenceRetentionSweeper({
  evidenceModel,
  dispatcher = null,
  logger = console,
  warningWindows = DEFAULT_WARNING_WINDOWS,
  intervalMs = 60 * 60 * 1000, // hourly
  now = () => new Date(),
} = {}) {
  if (!evidenceModel) throw new Error('evidenceRetentionSweeper: evidenceModel required');

  let timer = null;

  async function _emit(name, payload) {
    if (!dispatcher || typeof dispatcher.emit !== 'function') return;
    try {
      await dispatcher.emit(name, payload);
    } catch (err) {
      logger.warn(`[EvidenceSweeper] dispatch ${name} failed: ${err.message}`);
    }
  }

  async function tick() {
    const nowDate = now();
    const report = { scanned: 0, expired: 0, expiring: 0, alerts: 0 };

    // 1. Flip past-expiry items.
    try {
      const toExpire = await evidenceModel.find({
        deleted_at: null,
        status: { $in: ['valid', 'expiring'] },
        validUntil: { $ne: null, $lt: nowDate },
      });
      for (const doc of toExpire) {
        report.scanned++;
        doc.status = 'expired';
        await doc.save();
        report.expired++;
        await _emit('compliance.evidence.expired', {
          evidenceId: String(doc._id),
          code: doc.code,
          validUntil: doc.validUntil,
          branchId: doc.branchId ? String(doc.branchId) : null,
        });
      }
    } catch (err) {
      logger.warn(`[EvidenceSweeper] expiry flip failed: ${err.message}`);
    }

    // 2. Fire warning events for items within each window not yet alerted.
    try {
      const maxDays = Math.max(...warningWindows);
      const horizon = new Date(nowDate.getTime() + maxDays * 86400000);
      const items = await evidenceModel.find({
        deleted_at: null,
        status: { $in: ['valid', 'expiring'] },
        validUntil: { $ne: null, $gte: nowDate, $lte: horizon },
      });
      for (const doc of items) {
        report.scanned++;
        const daysLeft = Math.max(
          0,
          Math.ceil((new Date(doc.validUntil).getTime() - nowDate.getTime()) / 86400000)
        );
        const alreadyFired = new Set(
          (doc.retention && doc.retention.alertsFired ? doc.retention.alertsFired : []).map(
            a => a.window
          )
        );
        const crossed = warningWindows.filter(w => daysLeft <= w && !alreadyFired.has(w));
        if (!crossed.length) continue;

        for (const w of crossed) {
          doc.retention.alertsFired.push({ window: w, firedAt: nowDate });
          report.alerts++;
          await _emit('compliance.evidence.expiring', {
            evidenceId: String(doc._id),
            code: doc.code,
            daysLeft,
            window: w,
            validUntil: doc.validUntil,
            branchId: doc.branchId ? String(doc.branchId) : null,
          });
        }
        if (doc.status === 'valid' && daysLeft <= Math.max(...warningWindows)) {
          doc.status = 'expiring';
        }
        await doc.save();
        report.expiring++;
      }
    } catch (err) {
      logger.warn(`[EvidenceSweeper] warning sweep failed: ${err.message}`);
    }

    return report;
  }

  function start() {
    if (timer) return;
    timer = setInterval(() => {
      tick().catch(err => logger.warn(`[EvidenceSweeper] tick error: ${err.message}`));
    }, intervalMs);
    if (timer.unref) timer.unref();
    logger.info(`[EvidenceSweeper] started (interval ${intervalMs}ms)`);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return { tick, start, stop, warningWindows };
}

// Lazy singleton for boot-time use.
let _default = null;
function getDefault() {
  if (!_default) {
    const evidenceModel = require('../../models/quality/EvidenceItem.model');
    _default = createEvidenceRetentionSweeper({ evidenceModel });
  }
  return _default;
}

module.exports = {
  createEvidenceRetentionSweeper,
  getDefault,
  DEFAULT_WARNING_WINDOWS,
};
