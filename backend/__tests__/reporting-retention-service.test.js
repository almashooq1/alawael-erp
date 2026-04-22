/**
 * reporting-retention-service.test.js — Phase 10 Commit 6.
 */

'use strict';

const {
  cutoffFor,
  findExpired,
  purgeOne,
  runRetentionSweep,
} = require('../services/reporting/retentionService');

function makeDelivery(overrides = {}) {
  const base = {
    _id: 'd1',
    reportId: 'ben.progress.weekly',
    status: 'READ',
    createdAt: new Date('2025-01-01T00:00:00Z'),
    ...overrides,
  };
  return {
    ...base,
    deleteOne: jest.fn(async function () {
      return this;
    }),
  };
}

function makeModel(rows) {
  return {
    model: {
      find(filter) {
        let out = rows.slice();
        if (filter.reportId) out = out.filter(r => r.reportId === filter.reportId);
        if (filter.status && filter.status.$in) {
          out = out.filter(r => filter.status.$in.includes(r.status));
        }
        if (filter.createdAt && filter.createdAt.$lt) {
          out = out.filter(r => new Date(r.createdAt) < new Date(filter.createdAt.$lt));
        }
        const chain = {
          sort() {
            return chain;
          },
          limit() {
            return chain;
          },
          then(res, rej) {
            return Promise.resolve(out).then(res, rej);
          },
        };
        return chain;
      },
    },
  };
}

function makeCatalog(entries) {
  const REPORTS = entries;
  return {
    REPORTS,
    enabled: () => REPORTS.filter(r => r.enabled !== false),
  };
}

// ─── cutoffFor ────────────────────────────────────────────────

describe('cutoffFor', () => {
  test('365-day retention subtracts a year from now', () => {
    const now = new Date('2026-04-22T00:00:00Z');
    const out = cutoffFor({ retention: { days: 365 } }, { now });
    expect(out.getTime()).toBe(now.getTime() - 365 * 24 * 3600 * 1000);
  });

  test('missing retention returns null', () => {
    expect(cutoffFor({})).toBeNull();
    expect(cutoffFor(null)).toBeNull();
  });
});

// ─── findExpired ──────────────────────────────────────────────

describe('findExpired', () => {
  test('returns only TERMINAL rows older than retention window', async () => {
    const now = new Date('2026-04-22T00:00:00Z');
    const old = new Date(now.getTime() - 400 * 24 * 3600 * 1000);
    const freshish = new Date(now.getTime() - 100 * 24 * 3600 * 1000);
    const rows = [
      makeDelivery({ _id: 'old-read', status: 'READ', createdAt: old }),
      makeDelivery({ _id: 'old-esc', status: 'ESCALATED', createdAt: old }),
      makeDelivery({ _id: 'old-sent', status: 'SENT', createdAt: old }), // not terminal → skip
      makeDelivery({ _id: 'fresh', status: 'READ', createdAt: freshish }), // too fresh
    ];
    const out = await findExpired(
      makeModel(rows),
      { id: 'ben.progress.weekly', retention: { days: 365 } },
      { now }
    );
    expect(out.map(r => r._id).sort()).toEqual(['old-esc', 'old-read']);
  });

  test('returns [] when report has no retention', async () => {
    const out = await findExpired(makeModel([]), { id: 'x' });
    expect(out).toEqual([]);
  });
});

// ─── purgeOne ─────────────────────────────────────────────────

describe('purgeOne', () => {
  test('calls deleteOne and returns true', async () => {
    const d = makeDelivery();
    const ok = await purgeOne(d);
    expect(ok).toBe(true);
    expect(d.deleteOne).toHaveBeenCalled();
  });

  test('onPurge override wins — false skips delete', async () => {
    const d = makeDelivery();
    const ok = await purgeOne(d, { onPurge: async () => false });
    expect(ok).toBe(false);
    expect(d.deleteOne).not.toHaveBeenCalled();
  });

  test('returns false when neither deleteOne nor remove exists', async () => {
    const ok = await purgeOne({});
    expect(ok).toBe(false);
  });
});

// ─── runRetentionSweep ────────────────────────────────────────

describe('runRetentionSweep', () => {
  test('walks every enabled catalog entry and deletes expired rows', async () => {
    const now = new Date('2026-04-22T00:00:00Z');
    const veryOld = new Date(now.getTime() - 400 * 24 * 3600 * 1000);
    const catalog = makeCatalog([
      { id: 'ben.progress.weekly', retention: { days: 365 }, enabled: true },
      { id: 'exec.annual.report', retention: { days: 2555 }, enabled: true }, // 7 years
    ]);
    const rows = [
      makeDelivery({
        _id: 'a',
        reportId: 'ben.progress.weekly',
        status: 'READ',
        createdAt: veryOld,
      }),
      makeDelivery({
        _id: 'b',
        reportId: 'exec.annual.report',
        status: 'READ',
        createdAt: veryOld,
      }), // still within 7y
    ];
    const events = [];
    const summary = await runRetentionSweep({
      DeliveryModel: makeModel(rows),
      catalog,
      eventBus: { emit: (n, p) => events.push({ n, p }) },
      now,
    });
    expect(summary.scanned).toBe(1); // only 'a' is candidate
    expect(summary.purged).toBe(1);
    expect(summary.byReport['ben.progress.weekly'].purged).toBe(1);
    expect(summary.byReport['exec.annual.report'].candidates).toBe(0);
    expect(events.find(e => e.n === 'report.delivery.purged')).toBeTruthy();
  });

  test('dryRun reports candidates without deleting', async () => {
    const now = new Date('2026-04-22T00:00:00Z');
    const old = new Date(now.getTime() - 400 * 24 * 3600 * 1000);
    const catalog = makeCatalog([{ id: 'r1', retention: { days: 365 }, enabled: true }]);
    const rows = [makeDelivery({ reportId: 'r1', status: 'READ', createdAt: old })];
    const summary = await runRetentionSweep({
      DeliveryModel: makeModel(rows),
      catalog,
      dryRun: true,
      now,
    });
    expect(summary.scanned).toBe(1);
    expect(summary.purged).toBe(0);
    expect(rows[0].deleteOne).not.toHaveBeenCalled();
  });

  test('throws on missing deps', async () => {
    await expect(runRetentionSweep({})).rejects.toThrow(/DeliveryModel \+ catalog required/);
  });
});
