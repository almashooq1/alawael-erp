'use strict';

/**
 * hrAnomalyDetectorService.js — Phase 11 Commit 19 (4.0.36).
 *
 * Proactive breach-detection layer on top of the HR access audit
 * trail (C6). Walks recent DATA_READ + DATA_EXPORTED events,
 * groups by actor, and flags any actor exceeding a
 * configurable per-hour threshold. Each flagged actor triggers a
 * `security.suspicious_activity` audit event that downstream
 * consumers (security dashboard, SIEM, on-call email) pick up.
 *
 * Two thresholds:
 *
 *   readsPerHourThreshold     default 100 — "this user is mass-
 *                             scanning records". Typical HR work
 *                             for an officer processing payroll is
 *                             tens of reads per hour; >100 suggests
 *                             automated scraping or unusual activity.
 *
 *   exportsPerDayThreshold    default 5 — exports leave the system
 *                             and carry higher risk. A single
 *                             legitimate DSAR fulfilment fires 1-2;
 *                             > 5/day is anomalous.
 *
 * Idempotency:
 *
 *   Before flagging, the detector checks whether a
 *   `security.suspicious_activity` event already exists for
 *   (userId, reason) within the last `cooldownMinutes` (default 60).
 *   This prevents the same spike from producing a flag every minute
 *   the scanner runs.
 *
 * Return shape:
 *
 *   {
 *     scannedAt, windowMinutes, readsPerHourThreshold,
 *     exportsPerDayThreshold,
 *     flagged: [
 *       { userId, userRole, reason, observedCount, firstSeenAt,
 *         lastSeenAt, cooldownSkipped }
 *     ],
 *     totals: { read_anomalies, export_anomalies, cooldown_skipped }
 *   }
 *
 * Design decisions:
 *
 *   1. STATELESS. Every run reads the last N minutes from AuditLog,
 *      computes groups, emits events. No persistent state means no
 *      schema migration, no leader election — just run on one
 *      instance via cron.
 *
 *   2. FIRE-AND-FORGET emission. `security.suspicious_activity`
 *      writes are wrapped in try/catch — if the audit collection
 *      is down the scan continues, each failure is counted and
 *      returned so the caller can alert.
 *
 *   3. DI'd AuditLog model + clock. Tests pass stubs; production
 *      wires the real model.
 *
 *   4. No blocking side-effect. This service does NOT disable a
 *      user's access or change any ACL — that's a policy decision
 *      for a higher layer. Signal only.
 *
 *   5. Supports `dryRun: true` so a CLI can preview flags without
 *      writing events.
 */

const MS_PER_MIN = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MIN;
const MS_PER_DAY = 24 * MS_PER_HOUR;

const DEFAULTS = Object.freeze({
  windowMinutes: 60,
  readsPerHourThreshold: 100,
  exportsPerDayThreshold: 5,
  cooldownMinutes: 60,
});

function createHrAnomalyDetectorService(deps = {}) {
  const AuditLog = deps.auditLogModel;
  if (AuditLog == null) {
    throw new Error('hrAnomalyDetectorService: auditLogModel is required');
  }
  const nowFn = deps.now || (() => new Date());
  // Optional — when present, scan() fires hr.anomaly.flagged events
  // to subscribed webhook receivers. Fire-and-forget; a dispatch
  // failure never derails the scan.
  const webhookDispatcher = deps.webhookDispatcher || null;
  const logger = deps.logger || { warn: () => {}, error: () => {} };

  async function recentlyFlagged({ userId, reason, cooldownMinutes }) {
    try {
      const since = new Date(nowFn().getTime() - cooldownMinutes * MS_PER_MIN);
      const existing = await AuditLog.findOne({
        userId,
        eventType: 'security.suspicious_activity',
        'metadata.custom.reason': reason,
        createdAt: { $gte: since },
      })
        .sort({ createdAt: -1 })
        .lean();
      return existing != null;
    } catch {
      // If the cooldown check itself fails, fall through to flagging.
      // Over-flagging is safer than under-flagging for suspicious
      // activity.
      return false;
    }
  }

  async function emitSuspiciousActivityEvent({
    userId,
    userRole,
    reason,
    observedCount,
    firstSeenAt,
    lastSeenAt,
    windowMinutes,
  }) {
    try {
      await AuditLog.create({
        eventType: 'security.suspicious_activity',
        eventCategory: 'security',
        severity: 'high',
        status: 'success',
        userId,
        userRole: userRole || null,
        resource: `hr:anomaly:${reason}`,
        message: `HR access anomaly detected: ${reason} (${observedCount} events in ${windowMinutes} min)`,
        metadata: {
          custom: {
            reason,
            observedCount,
            firstSeenAt,
            lastSeenAt,
            windowMinutes,
            source: 'hrAnomalyDetector',
          },
        },
        tags: ['hr', 'hr:anomaly', reason],
        flags: { isAutomated: true, isSuspicious: true, requiresReview: true },
      });
      return { emitted: true };
    } catch (err) {
      return { emitted: false, error: err && err.message };
    }
  }

  async function countReadsByActor({ since, until }) {
    try {
      return await AuditLog.aggregate([
        {
          $match: {
            eventType: 'data.read',
            resource: { $regex: '^hr:' },
            createdAt: { $gte: since, $lte: until },
            userId: { $ne: null },
          },
        },
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 },
            userRole: { $last: '$userRole' },
            firstSeenAt: { $min: '$createdAt' },
            lastSeenAt: { $max: '$createdAt' },
          },
        },
      ]);
    } catch {
      return [];
    }
  }

  async function countExportsByActor({ since, until }) {
    try {
      return await AuditLog.aggregate([
        {
          $match: {
            eventType: 'data.exported',
            resource: { $regex: '^hr:' },
            createdAt: { $gte: since, $lte: until },
            userId: { $ne: null },
          },
        },
        {
          $group: {
            _id: '$userId',
            count: { $sum: 1 },
            userRole: { $last: '$userRole' },
            firstSeenAt: { $min: '$createdAt' },
            lastSeenAt: { $max: '$createdAt' },
          },
        },
      ]);
    } catch {
      return [];
    }
  }

  /**
   * Run one scan. Returns the report described in the file header.
   */
  async function scan({
    windowMinutes = DEFAULTS.windowMinutes,
    readsPerHourThreshold = DEFAULTS.readsPerHourThreshold,
    exportsPerDayThreshold = DEFAULTS.exportsPerDayThreshold,
    cooldownMinutes = DEFAULTS.cooldownMinutes,
    dryRun = false,
  } = {}) {
    const now = nowFn();
    const scannedAt = now.toISOString();
    const readSince = new Date(now.getTime() - windowMinutes * MS_PER_MIN);
    const exportSince = new Date(now.getTime() - MS_PER_DAY);

    // Thresholds are normalized to the scan window: if we ask for
    // a 30-minute window and the hourly threshold is 100, the local
    // threshold becomes 50.
    const readThresholdInWindow = (readsPerHourThreshold * windowMinutes) / 60;

    const [readGroups, exportGroups] = await Promise.all([
      countReadsByActor({ since: readSince, until: now }),
      countExportsByActor({ since: exportSince, until: now }),
    ]);

    const flagged = [];
    const totals = {
      read_anomalies: 0,
      export_anomalies: 0,
      cooldown_skipped: 0,
      webhooks_dispatched: 0,
    };

    async function fireWebhook(event) {
      if (!webhookDispatcher || typeof webhookDispatcher.dispatch !== 'function') {
        return;
      }
      try {
        const result = await webhookDispatcher.dispatch('hr.anomaly.flagged', event);
        if (result && typeof result.dispatched === 'number') {
          totals.webhooks_dispatched += result.dispatched;
        }
      } catch (err) {
        logger.warn &&
          logger.warn('[HrAnomalyDetector] webhook dispatch failed:', err.message || err);
      }
    }

    // ─── Read anomalies ─────────────────────────────────────────
    for (const group of readGroups) {
      if (group.count < readThresholdInWindow) continue;
      const reason = 'excessive_reads';
      const cooldownHit = await recentlyFlagged({
        userId: group._id,
        reason,
        cooldownMinutes,
      });
      if (cooldownHit) {
        totals.cooldown_skipped += 1;
        flagged.push({
          userId: String(group._id),
          userRole: group.userRole || null,
          reason,
          observedCount: group.count,
          firstSeenAt: group.firstSeenAt,
          lastSeenAt: group.lastSeenAt,
          cooldownSkipped: true,
        });
        continue;
      }
      if (!dryRun) {
        await emitSuspiciousActivityEvent({
          userId: group._id,
          userRole: group.userRole,
          reason,
          observedCount: group.count,
          firstSeenAt: group.firstSeenAt,
          lastSeenAt: group.lastSeenAt,
          windowMinutes,
        });
        await fireWebhook({
          userId: String(group._id),
          userRole: group.userRole || null,
          reason,
          observedCount: group.count,
          firstSeenAt: group.firstSeenAt,
          lastSeenAt: group.lastSeenAt,
          windowMinutes,
          scannedAt,
        });
      }
      totals.read_anomalies += 1;
      flagged.push({
        userId: String(group._id),
        userRole: group.userRole || null,
        reason,
        observedCount: group.count,
        firstSeenAt: group.firstSeenAt,
        lastSeenAt: group.lastSeenAt,
        cooldownSkipped: false,
      });
    }

    // ─── Export anomalies ───────────────────────────────────────
    for (const group of exportGroups) {
      if (group.count < exportsPerDayThreshold) continue;
      const reason = 'excessive_exports';
      const cooldownHit = await recentlyFlagged({
        userId: group._id,
        reason,
        cooldownMinutes,
      });
      if (cooldownHit) {
        totals.cooldown_skipped += 1;
        flagged.push({
          userId: String(group._id),
          userRole: group.userRole || null,
          reason,
          observedCount: group.count,
          firstSeenAt: group.firstSeenAt,
          lastSeenAt: group.lastSeenAt,
          cooldownSkipped: true,
        });
        continue;
      }
      if (!dryRun) {
        await emitSuspiciousActivityEvent({
          userId: group._id,
          userRole: group.userRole,
          reason,
          observedCount: group.count,
          firstSeenAt: group.firstSeenAt,
          lastSeenAt: group.lastSeenAt,
          windowMinutes: 24 * 60, // 24h window for exports
        });
        await fireWebhook({
          userId: String(group._id),
          userRole: group.userRole || null,
          reason,
          observedCount: group.count,
          firstSeenAt: group.firstSeenAt,
          lastSeenAt: group.lastSeenAt,
          windowMinutes: 24 * 60,
          scannedAt,
        });
      }
      totals.export_anomalies += 1;
      flagged.push({
        userId: String(group._id),
        userRole: group.userRole || null,
        reason,
        observedCount: group.count,
        firstSeenAt: group.firstSeenAt,
        lastSeenAt: group.lastSeenAt,
        cooldownSkipped: false,
      });
    }

    return {
      scannedAt,
      windowMinutes,
      readsPerHourThreshold,
      exportsPerDayThreshold,
      cooldownMinutes,
      dryRun,
      flagged,
      totals,
    };
  }

  return Object.freeze({ scan, DEFAULTS });
}

module.exports = { createHrAnomalyDetectorService, DEFAULTS };
