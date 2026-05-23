'use strict';
/**
 * audit-chain-archiver.test.js — Wave 303
 */

const {
  AuditChainArchiverService,
  defaultMemoryAdapter,
  groupByPlanReview,
} = require('../services/audit-chain-archiver.service');
const { PlanReviewAckAuditService } = require('../services/plan-review-ack-audit.service');

// Tiny in-memory PlanReviewAck model shaped to satisfy both the audit
// service (create + findOne) and the archiver (find + deleteMany).
function makeModel() {
  const rows = [];
  const Model = {
    _rows: rows,
    async create(doc) {
      const _id = `row-${rows.length + 1}`;
      const row = { _id, ...doc };
      rows.push(row);
      return row;
    },
    findOne(filter) {
      const list = rows.filter(r =>
        Object.entries(filter).every(([k, v]) => String(r[k]) === String(v))
      );
      const chain = {
        sort(spec) {
          const key = Object.keys(spec)[0];
          const dir = spec[key];
          list.sort((a, b) => (a[key] > b[key] ? dir : -dir));
          return chain;
        },
        select() {
          return chain;
        },
        async lean() {
          return list[0] || null;
        },
      };
      return chain;
    },
    find(filter) {
      const list = rows.filter(r => {
        if (filter.occurredAt?.$lt) return r.occurredAt < filter.occurredAt.$lt;
        return true;
      });
      const chain = {
        select() {
          return chain;
        },
        async lean() {
          return list.map(r => ({ ...r }));
        },
      };
      return chain;
    },
    async deleteMany(filter) {
      const before = rows.length;
      const survivors = rows.filter(
        r => !Object.entries(filter).every(([k, v]) => String(r[k]) === String(v))
      );
      rows.length = 0;
      rows.push(...survivors);
      return { deletedCount: before - survivors.length };
    },
  };
  return Model;
}

async function appendN(svc, planReviewId, beneficiaryId, count, startTs) {
  for (let i = 0; i < count; i += 1) {
    await svc._append({
      action: i === 0 ? 'TRIGGERED' : 'ACK',
      planReviewId,
      beneficiaryId,
      now: new Date(startTs + i * 1000),
      payload: { i },
    });
  }
}

describe('W303 — audit-chain archiver', () => {
  test('archives a complete + valid chain into NDJSON and (optionally) deletes', async () => {
    const Model = makeModel();
    const audit = new PlanReviewAckAuditService({ PlanReviewAckModel: Model });
    // 7 years ago = past cutoff
    const oldTs = Date.now() - 7 * 365 * 86400_000;
    await appendN(audit, 'rev-A', 'ben-1', 3, oldTs);
    // Recent chain (should NOT be archived)
    await appendN(audit, 'rev-B', 'ben-2', 2, Date.now() - 10_000);

    const adapter = defaultMemoryAdapter();
    const archiver = new AuditChainArchiverService({
      PlanReviewAckModel: Model,
      adapter,
      deleteAfterArchive: true,
      archiveAfterDays: 1825,
    });

    const result = await archiver.runOnce();
    expect(result.archivedChains).toBe(1);
    expect(result.skippedChains).toBe(0);
    expect(result.deletedRows).toBe(3);
    expect(adapter._stored).toHaveLength(1);
    expect(adapter._stored[0].key).toMatch(/^plan-review-audit\/rev-A\/.*\.ndjson$/);
    const lines = adapter._stored[0].body.split('\n');
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0]).action).toBe('TRIGGERED');
    // Recent chain survived
    expect(Model._rows.filter(r => r.planReviewId === 'rev-B')).toHaveLength(2);
  });

  test('refuses to archive a tampered chain (broken hash)', async () => {
    const Model = makeModel();
    const audit = new PlanReviewAckAuditService({ PlanReviewAckModel: Model });
    const oldTs = Date.now() - 7 * 365 * 86400_000;
    await appendN(audit, 'rev-T', 'ben-9', 3, oldTs);
    // Tamper the middle row's payload (currentHash no longer matches)
    Model._rows[1].payload = { tampered: true };

    const adapter = defaultMemoryAdapter();
    const archiver = new AuditChainArchiverService({
      PlanReviewAckModel: Model,
      adapter,
      deleteAfterArchive: true,
    });

    const result = await archiver.runOnce();
    expect(result.archivedChains).toBe(0);
    expect(result.skippedChains).toBe(1);
    expect(result.deletedRows).toBe(0);
    expect(adapter._stored).toHaveLength(0);
    // Tampered rows preserved for forensic review
    expect(Model._rows.filter(r => r.planReviewId === 'rev-T')).toHaveLength(3);
  });

  test('groupByPlanReview sorts entries chronologically per chain', () => {
    const grouped = groupByPlanReview([
      { planReviewId: 'X', occurredAt: new Date(3000) },
      { planReviewId: 'X', occurredAt: new Date(1000) },
      { planReviewId: 'Y', occurredAt: new Date(2000) },
      { planReviewId: 'X', occurredAt: new Date(2000) },
    ]);
    expect(grouped.get('X').map(r => r.occurredAt.getTime())).toEqual([1000, 2000, 3000]);
    expect(grouped.get('Y')).toHaveLength(1);
  });
});
