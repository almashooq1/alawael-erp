'use strict';
/**
 * audit-chain-archiver.service.js — Wave 303
 *
 * Exports closed PlanReview audit chains older than N days to NDJSON
 * "blobs" (stub: in-memory or log-only). Designed to run BEFORE the
 * opt-in W300 TTL is enabled — once a chain is archived to immutable
 * cold storage, the live rows can be safely deleted without breaking
 * the regulator-facing audit trail.
 *
 * NOT enabled by default. Operators set:
 *   ENABLE_AUDIT_CHAIN_ARCHIVE=true
 *   AUDIT_CHAIN_ARCHIVE_DAYS=1825        (default 5y)
 *   AUDIT_CHAIN_ARCHIVE_TARGET=log|memory|blob  (blob requires storage adapter)
 *
 * Storage adapters are injected. The default `memory` adapter is for
 * tests; the `log` adapter logs the payload count + the first
 * planReviewId only (avoids PHI in app logs).
 */

const { hashLinkedPayload } = require('../intelligence/hash-chain.lib');
const { canonicalize } = require('./plan-review-ack-audit.service');

function defaultMemoryAdapter() {
  const stored = [];
  return {
    name: 'memory',
    async write(key, body) {
      stored.push({ key, body });
    },
    _stored: stored,
  };
}

function defaultLogAdapter(logger) {
  return {
    name: 'log',
    async write(key, body) {
      // Count lines instead of dumping the body — body is PHI-laden.
      const lines = body ? body.split('\n').filter(Boolean).length : 0;
      logger?.info?.(`[AuditChainArchiver] would write key=${key} lines=${lines}`);
    },
  };
}

/**
 * Group flat audit rows by planReviewId, preserving append order.
 * @param {Array<object>} rows
 * @returns {Map<string, Array<object>>}
 */
function groupByPlanReview(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = String(r.planReviewId);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(r);
  }
  for (const [, list] of map) {
    list.sort((a, b) => new Date(a.occurredAt) - new Date(b.occurredAt));
  }
  return map;
}

/**
 * Re-verify a single chain locally (does NOT touch the registry —
 * used as a guard to refuse archival of already-broken chains).
 */
function verifyChain(entries) {
  let prev = null;
  for (const e of entries) {
    const canon = canonicalize({
      action: e.action,
      level: e.level ?? null,
      planReviewId: e.planReviewId,
      beneficiaryId: e.beneficiaryId,
      actorUserId: e.actorUserId,
      occurredAt: e.occurredAt instanceof Date ? e.occurredAt : new Date(e.occurredAt),
      payload: e.payload || {},
    });
    const expected = hashLinkedPayload(canon, prev);
    if (expected !== e.currentHash) {
      return { ok: false, brokenAt: entries.indexOf(e) };
    }
    prev = e.currentHash;
  }
  return { ok: true };
}

class AuditChainArchiverService {
  /**
   * @param {object} deps
   * @param {import('mongoose').Model} deps.PlanReviewAckModel
   * @param {{write:(key:string,body:string)=>Promise<void>}} [deps.adapter]
   * @param {{info:Function,warn:Function,error:Function}} [deps.logger]
   * @param {number} [deps.archiveAfterDays]
   * @param {boolean} [deps.deleteAfterArchive]
   */
  constructor(deps = {}) {
    if (!deps.PlanReviewAckModel) {
      throw new Error('AuditChainArchiverService requires PlanReviewAckModel');
    }
    this.Model = deps.PlanReviewAckModel;
    this.logger = deps.logger || { info: () => {}, warn: () => {}, error: () => {} };
    this.adapter = deps.adapter || defaultMemoryAdapter();
    this.archiveAfterDays =
      typeof deps.archiveAfterDays === 'number' && deps.archiveAfterDays > 0
        ? deps.archiveAfterDays
        : 1825; // ~5y default
    this.deleteAfterArchive = !!deps.deleteAfterArchive;
  }

  async runOnce({ now = new Date() } = {}) {
    const cutoff = new Date(now.getTime() - this.archiveAfterDays * 86_400_000);
    let rows;
    try {
      const q = this.Model.find({ occurredAt: { $lt: cutoff } });
      // Support both mongoose and the in-memory test stub:
      const select = q.select?.();
      const lean = (select || q).lean?.();
      rows = await (lean || q);
    } catch (err) {
      this.logger.error?.(`[AuditChainArchiver] query failed: ${err.message}`);
      return { archivedChains: 0, skippedChains: 0, deletedRows: 0, error: err.message };
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return { archivedChains: 0, skippedChains: 0, deletedRows: 0 };
    }

    const grouped = groupByPlanReview(rows);
    let archivedChains = 0;
    let skippedChains = 0;
    let deletedRows = 0;

    for (const [planReviewId, entries] of grouped) {
      const v = verifyChain(entries);
      if (!v.ok) {
        skippedChains += 1;
        this.logger.warn?.(
          `[AuditChainArchiver] refusing to archive broken chain planReviewId=${planReviewId} brokenAt=${v.brokenAt}`
        );
        continue;
      }
      const key = `plan-review-audit/${planReviewId}/${entries[0].occurredAt instanceof Date ? entries[0].occurredAt.toISOString() : new Date(entries[0].occurredAt).toISOString()}.ndjson`;
      const body = entries.map(e => JSON.stringify(e)).join('\n');
      try {
        await this.adapter.write(key, body);
        archivedChains += 1;
        if (this.deleteAfterArchive && this.Model.deleteMany) {
          const res = await this.Model.deleteMany({ planReviewId });
          deletedRows += (res && (res.deletedCount || res.n)) || entries.length;
        }
      } catch (err) {
        skippedChains += 1;
        this.logger.error?.(
          `[AuditChainArchiver] adapter write failed planReviewId=${planReviewId}: ${err.message}`
        );
      }
    }

    this.logger.info?.(
      `[AuditChainArchiver] archived=${archivedChains} skipped=${skippedChains} deleted=${deletedRows} cutoff=${cutoff.toISOString()}`
    );
    return { archivedChains, skippedChains, deletedRows, cutoff };
  }
}

module.exports = {
  AuditChainArchiverService,
  defaultMemoryAdapter,
  defaultLogAdapter,
  groupByPlanReview,
  verifyChain,
};
