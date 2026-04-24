'use strict';

/**
 * hrAuditRetentionService.js — Phase 11 Commit 27 (4.0.44).
 *
 * Retention policy for HR AuditLog events. Two phases:
 *
 *   ARCHIVE  — events older than `archiveAfterDays` (default 365)
 *              get `flags.isArchived: true`. They remain queryable
 *              via AuditLog with a filter, but fall out of the
 *              default dashboard/DSAR/metrics views (which filter
 *              `isArchived: { $ne: true }`).
 *
 *   PURGE    — events older than `purgeAfterDays` (default 1095 =
 *              3 years) AND already archived get hard-deleted.
 *              Frees storage + keeps query plans hot.
 *
 * Default timeline:
 *
 *   0 → 365 days    hot (default views + DSAR windows cover this)
 *   365 → 1095      archived (retained for forensic queries,
 *                   regulator-initiated DSARs with > 365d window)
 *   1095+           purged (storage pressure relief)
 *
 * Design decisions:
 *
 *   1. Two-phase (archive then purge), NOT single-phase delete.
 *      Archive is reversible (set flag back), purge is not.
 *      Operators can tune `archiveAfterDays` shorter than
 *      `purgeAfterDays` so a misconfiguration catches review
 *      signals before causing irreversible data loss.
 *
 *   2. Only HR-scoped events are touched. Filter on
 *      `tags: { $in: ['hr'] }` so non-HR AuditLog rows
 *      (reporting deliveries, session attendance, etc.) follow
 *      their own retention policy.
 *
 *   3. Batched writes. `batchSize` (default 1000) per updateMany
 *      / deleteMany call. Prevents locking the collection on a
 *      large sweep + keeps each op under the 16MB BSON limit.
 *
 *   4. Dry-run preview. Both `archive` and `purge` accept
 *      `dryRun: true` that COUNTS affected rows without writing.
 *      Lets operators validate thresholds before they take effect.
 *
 *   5. Never touches pending or requiresReview events. Archiving
 *      a still-pending review row would hide governance work;
 *      filter excludes `flags.requiresReview: true`.
 *
 *   6. Clock injection for tests. No persistent state — each
 *      run re-reads from Mongo.
 */

const MS_PER_DAY = 24 * 3600 * 1000;

const DEFAULTS = Object.freeze({
  archiveAfterDays: 365,
  purgeAfterDays: 1095,
  batchSize: 1000,
});

function createHrAuditRetentionService(deps = {}) {
  const AuditLog = deps.auditLogModel;
  if (AuditLog == null) {
    throw new Error('hrAuditRetentionService: auditLogModel is required');
  }
  const nowFn = deps.now || (() => new Date());

  /**
   * Archive old HR audit events. Idempotent — already-archived
   * events are skipped via the filter.
   */
  async function archive({
    archiveAfterDays = DEFAULTS.archiveAfterDays,
    batchSize = DEFAULTS.batchSize,
    dryRun = false,
    tagFilter = 'hr', // Phase-11 C33 — per-tag retention override
  } = {}) {
    const now = nowFn();
    const cutoff = new Date(now.getTime() - archiveAfterDays * MS_PER_DAY);

    const filter = {
      tags: { $in: [tagFilter] },
      createdAt: { $lt: cutoff },
      'flags.isArchived': { $ne: true },
      'flags.requiresReview': { $ne: true },
    };

    const started = Date.now();
    let totalMatched = 0;
    let totalArchived = 0;
    let batches = 0;

    if (dryRun) {
      totalMatched = await AuditLog.countDocuments(filter);
      return {
        mode: 'dry-run-archive',
        cutoff: cutoff.toISOString(),
        archiveAfterDays,
        matched: totalMatched,
        modified: 0,
        batches: 0,
        durationMs: Date.now() - started,
      };
    }

    // Batched update — updateMany with a limit isn't directly
    // supported, so loop: find N ids, update those, repeat until
    // nothing matches.
    while (true) {
      const docs = await AuditLog.find(filter).limit(batchSize).select('_id').lean();
      if (docs.length === 0) break;
      const ids = docs.map(d => d._id);
      const res = await AuditLog.updateMany(
        { _id: { $in: ids } },
        { $set: { 'flags.isArchived': true } }
      );
      totalMatched += ids.length;
      totalArchived += res.modifiedCount || 0;
      batches += 1;
      if (ids.length < batchSize) break;
    }

    return {
      mode: 'archive',
      cutoff: cutoff.toISOString(),
      archiveAfterDays,
      batchSize,
      tagFilter,
      matched: totalMatched,
      modified: totalArchived,
      batches,
      durationMs: Date.now() - started,
    };
  }

  /**
   * Purge archived HR audit events older than the purge threshold.
   * Hard-deletes. Only operates on rows that ARE already archived —
   * a safety gate against accidental over-deletion if someone
   * misconfigures a short `purgeAfterDays` without archive running.
   */
  async function purge({
    purgeAfterDays = DEFAULTS.purgeAfterDays,
    batchSize = DEFAULTS.batchSize,
    dryRun = false,
    tagFilter = 'hr',
  } = {}) {
    const now = nowFn();
    const cutoff = new Date(now.getTime() - purgeAfterDays * MS_PER_DAY);

    const filter = {
      tags: { $in: [tagFilter] },
      createdAt: { $lt: cutoff },
      'flags.isArchived': true,
      'flags.requiresReview': { $ne: true },
    };

    const started = Date.now();

    if (dryRun) {
      const matched = await AuditLog.countDocuments(filter);
      return {
        mode: 'dry-run-purge',
        cutoff: cutoff.toISOString(),
        purgeAfterDays,
        matched,
        deleted: 0,
        batches: 0,
        durationMs: Date.now() - started,
      };
    }

    let totalDeleted = 0;
    let batches = 0;
    while (true) {
      const docs = await AuditLog.find(filter).limit(batchSize).select('_id').lean();
      if (docs.length === 0) break;
      const ids = docs.map(d => d._id);
      const res = await AuditLog.deleteMany({ _id: { $in: ids } });
      totalDeleted += res.deletedCount || 0;
      batches += 1;
      if (ids.length < batchSize) break;
    }

    return {
      mode: 'purge',
      cutoff: cutoff.toISOString(),
      purgeAfterDays,
      batchSize,
      tagFilter,
      deleted: totalDeleted,
      batches,
      durationMs: Date.now() - started,
    };
  }

  /**
   * Phase-11 C33 — apply a list of per-tag policies sequentially.
   * Each policy runs archive + purge with its own thresholds. Returns
   * a report keyed by tag for downstream logging + alerting.
   *
   * `policies` — array of { tag, archiveAfterDays, purgeAfterDays }
   * objects. When absent, loads from config/hr-retention-policies.js.
   */
  async function runRetentionByPolicies({
    policies = null,
    batchSize = DEFAULTS.batchSize,
    dryRun = false,
  } = {}) {
    const list =
      policies ||
      (() => {
        try {
          // Phase-11 C36 — honor env-driven override when caller
          // didn't pass an explicit policies list.
          const { resolveActivePolicies } = require('../../config/hr-retention-policies');
          return resolveActivePolicies().policies;
        } catch {
          return [];
        }
      })();

    const perPolicy = [];
    const totals = { archived: 0, purged: 0 };
    const started = Date.now();

    for (const p of list) {
      const archiveReport = await archive({
        archiveAfterDays: p.archiveAfterDays,
        batchSize,
        dryRun,
        tagFilter: p.tag,
      });
      const purgeReport = await purge({
        purgeAfterDays: p.purgeAfterDays,
        batchSize,
        dryRun,
        tagFilter: p.tag,
      });
      totals.archived += archiveReport.modified || 0;
      totals.purged += purgeReport.deleted || 0;
      perPolicy.push({
        tag: p.tag,
        label: p.label || null,
        priority: p.priority || 100,
        archive: archiveReport,
        purge: purgeReport,
      });
    }

    return {
      mode: 'by-policies',
      dryRun,
      policiesRun: perPolicy.length,
      totals,
      perPolicy,
      durationMs: Date.now() - started,
    };
  }

  /**
   * Run both phases in the correct order. Archive first (events
   * crossing the 365d boundary), then purge (events crossing the
   * 1095d boundary). Returns a combined report.
   */
  async function runFullRetention({
    archiveAfterDays,
    purgeAfterDays,
    batchSize,
    dryRun = false,
  } = {}) {
    const archiveReport = await archive({
      archiveAfterDays,
      batchSize,
      dryRun,
    });
    const purgeReport = await purge({ purgeAfterDays, batchSize, dryRun });
    return {
      archive: archiveReport,
      purge: purgeReport,
      startedAt: archiveReport.cutoff,
      dryRun,
    };
  }

  return Object.freeze({
    archive,
    purge,
    runFullRetention,
    runRetentionByPolicies,
    DEFAULTS,
  });
}

module.exports = { createHrAuditRetentionService, DEFAULTS };
