'use strict';

/**
 * hrAdaptiveRetentionService.js — Phase 11 Commit 31 (4.0.48).
 *
 * Wraps the base retention service (C27) with storage-pressure
 * awareness. Reads the current hot-tier row count (the same gauge
 * exposed by `/metrics` in C29) and compresses the archive cutoff
 * when hot rows approach the ceiling. The adaptive path lets an
 * org handle a growth spike (e.g., a detector misconfiguration
 * flooding the AuditLog) without manual env-var retuning.
 *
 * Compute rules — `computeAdaptiveArchiveAfterDays`:
 *
 *   hot < warningThreshold         → baselineArchiveAfterDays (365)
 *   warning ≤ hot < ceiling        → baseline × tightenWarningFactor (0.8 → 292)
 *   hot ≥ ceilingThreshold         → baseline × tightenCeilingFactor (0.6 → 219)
 *   always                         → Math.max(computedDays, floorDays)
 *                                     (floor is absolute min; default 180)
 *
 * The floor exists because:
 *   1. PDPL Art. 18 implies a reasonable lookback (90+ days).
 *   2. `/me/access-log` default window is 90 days — setting archive
 *      below 90 means the self-serve DSAR would show zero rows,
 *      breaking the compliance path.
 *   3. Operators should handle storage pressure by purging archived
 *      rows (C27 purge phase) or by sharding the collection, NOT
 *      by aggressively archiving fresh events.
 *
 * Design decisions:
 *
 *   1. Pure compute function EXPORTED. Tests pin the thresholds
 *      without any DB fixtures.
 *
 *   2. `runAdaptiveRetention` end-to-end: count → compute → call
 *      `retentionService.archive` with the computed value. Returns
 *      both the adaptive input (`hotCount`, `computedArchiveAfterDays`,
 *      `baselineArchiveAfterDays`) and the downstream archive
 *      report. Lets callers reason about "why did we archive this
 *      much today?" after the fact.
 *
 *   3. Purge phase is NOT adaptive. Purging is irreversible +
 *      requires `isArchived: true` already set. Speeding up purge
 *      under storage pressure would defeat the archive safety
 *      gate. Callers run purge separately (or via the CLI's
 *      default both-phases mode) with its own config.
 *
 *   4. DI'd retentionService + auditLogModel. Tests pass fakes;
 *      production wires real instances.
 */

const DEFAULT_CONFIG = Object.freeze({
  baselineArchiveAfterDays: 365,
  warningThresholdRows: 500_000,
  ceilingThresholdRows: 1_000_000,
  tightenWarningFactor: 0.8,
  tightenCeilingFactor: 0.6,
  floorDays: 180,
});

/**
 * Pure: given hot-tier row count + thresholds, return the
 * effective archiveAfterDays.
 */
function computeAdaptiveArchiveAfterDays({
  hotCount,
  baselineArchiveAfterDays = DEFAULT_CONFIG.baselineArchiveAfterDays,
  warningThresholdRows = DEFAULT_CONFIG.warningThresholdRows,
  ceilingThresholdRows = DEFAULT_CONFIG.ceilingThresholdRows,
  tightenWarningFactor = DEFAULT_CONFIG.tightenWarningFactor,
  tightenCeilingFactor = DEFAULT_CONFIG.tightenCeilingFactor,
  floorDays = DEFAULT_CONFIG.floorDays,
} = {}) {
  if (typeof hotCount !== 'number' || !Number.isFinite(hotCount) || hotCount < 0) {
    // Garbage input → keep baseline. Over-archiving on bad telemetry
    // is worse than under-archiving.
    return baselineArchiveAfterDays;
  }
  let factor = 1.0;
  if (hotCount >= ceilingThresholdRows) {
    factor = tightenCeilingFactor;
  } else if (hotCount >= warningThresholdRows) {
    factor = tightenWarningFactor;
  }
  const computed = Math.floor(baselineArchiveAfterDays * factor);
  return Math.max(computed, floorDays);
}

function createHrAdaptiveRetentionService(deps = {}) {
  const retentionService = deps.retentionService;
  const AuditLog = deps.auditLogModel;
  const config = Object.assign({}, DEFAULT_CONFIG, deps.config || {});

  if (!retentionService || typeof retentionService.archive !== 'function') {
    throw new Error('hrAdaptiveRetentionService: retentionService with archive() is required');
  }
  if (!AuditLog) {
    throw new Error('hrAdaptiveRetentionService: auditLogModel is required');
  }

  async function countHotTier() {
    try {
      return await AuditLog.countDocuments({
        tags: { $in: ['hr'] },
        'flags.isArchived': { $ne: true },
      });
    } catch {
      return null;
    }
  }

  /**
   * End-to-end adaptive archive. Returns:
   *   {
   *     hotCount,
   *     baselineArchiveAfterDays,
   *     computedArchiveAfterDays,
   *     pressureLevel: 'normal' | 'warning' | 'ceiling' | 'unknown',
   *     archive: <retentionService.archive report>
   *   }
   */
  async function runAdaptiveRetention({
    baselineArchiveAfterDays = config.baselineArchiveAfterDays,
    batchSize,
    dryRun = false,
  } = {}) {
    const hotCount = await countHotTier();

    let pressureLevel = 'unknown';
    if (typeof hotCount === 'number') {
      if (hotCount >= config.ceilingThresholdRows) pressureLevel = 'ceiling';
      else if (hotCount >= config.warningThresholdRows) pressureLevel = 'warning';
      else pressureLevel = 'normal';
    }

    const computedArchiveAfterDays = computeAdaptiveArchiveAfterDays({
      hotCount: typeof hotCount === 'number' ? hotCount : 0,
      baselineArchiveAfterDays,
      warningThresholdRows: config.warningThresholdRows,
      ceilingThresholdRows: config.ceilingThresholdRows,
      tightenWarningFactor: config.tightenWarningFactor,
      tightenCeilingFactor: config.tightenCeilingFactor,
      floorDays: config.floorDays,
    });

    const archive = await retentionService.archive({
      archiveAfterDays: computedArchiveAfterDays,
      batchSize,
      dryRun,
    });

    return {
      hotCount,
      baselineArchiveAfterDays,
      computedArchiveAfterDays,
      pressureLevel,
      archive,
    };
  }

  return Object.freeze({
    computeAdaptiveArchiveAfterDays,
    runAdaptiveRetention,
    DEFAULT_CONFIG,
  });
}

module.exports = {
  createHrAdaptiveRetentionService,
  computeAdaptiveArchiveAfterDays,
  DEFAULT_CONFIG,
};
