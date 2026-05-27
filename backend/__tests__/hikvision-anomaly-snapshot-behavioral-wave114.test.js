'use strict';

/**
 * hikvision-anomaly-snapshot-behavioral-wave114.test.js — behavioral coverage
 * for W114 HikvisionAnomalySnapshot.
 *
 * Mirrors W144 LlmAnomalySnapshot structure: persisted anomaly-detector
 * run with compact items + summary counts + 30-day TTL. Wave-18 invariants:
 *   1. recordedAt required
 *   2. summary.total === items.length
 *   3. summary.{critical+warning+info} sums to summary.total
 *   4. items[].id non-empty (dedup key)
 *
 * Per CLAUDE.md doctrine — 33× application. 4th Hikvision suite entry.
 *
 * Run: cd backend && npx jest --config=jest.config.js __tests__/hikvision-anomaly-snapshot-behavioral-wave114.test.js --runInBand
 */

jest.unmock('mongoose');
jest.unmock('../intelligence/hikvision.registry');
jest.setTimeout(30000);

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let Snapshot;

beforeAll(async () => {
  const URI_FILE = path.join(__dirname, '..', '.test-mongo-uri');
  let uri;
  if (fs.existsSync(URI_FILE)) {
    uri = fs.readFileSync(URI_FILE, 'utf-8').trim();
  } else {
    mongod = await MongoMemoryServer.create({ instance: { dbName: 'w114-anomaly-snapshot-test' } });
    uri = mongod.getUri();
  }
  await mongoose.connect(uri);
  require('../config/mongoose.plugins'); // Mongoose-9 legacy-hook shim
  Snapshot = require('../models/HikvisionAnomalySnapshot');
  await Snapshot.init().catch(() => null);
});

afterAll(async () => {
  await mongoose.disconnect().catch(() => null);
  if (mongod) await mongod.stop().catch(() => null);
});

beforeEach(async () => {
  await Snapshot.deleteMany({});
});

const ANOMALY_KINDS = [
  'circuit-open-cluster',
  'stream-errors-spike',
  'sync-drift-high',
  'fraud-critical',
  'review-queue-stale',
  'reconciliation-backlog',
  'scheduler-failure',
  'no-stream-devices',
];

function baseSnapshot(overrides = {}) {
  return {
    summary: { total: 0, critical: 0, warning: 0, info: 0 },
    ...overrides,
  };
}

// ─── 1. Required + defaults ─────────────────────────────────────────

describe('W114 behavioral — required fields + defaults', () => {
  it('SAVES empty snapshot with zero-summary + source=scheduler default', async () => {
    const doc = await Snapshot.create(baseSnapshot());
    expect(doc.source).toBe('scheduler');
    expect(doc.items).toEqual([]);
    expect(doc.recordedAt).toBeInstanceOf(Date);
  });

  it('REJECTS without summary fields', async () => {
    const p = new Snapshot({});
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS invalid source enum', async () => {
    const p = new Snapshot(baseSnapshot({ source: 'cosmic' }));
    await expect(p.save()).rejects.toThrow();
  });

  for (const valid of ['scheduler', 'manual', 'startup']) {
    it(`SAVES source='${valid}'`, async () => {
      const doc = await Snapshot.create(baseSnapshot({ source: valid }));
      expect(doc.source).toBe(valid);
    });
  }
});

// ─── 2. items subdoc enums ──────────────────────────────────────────

describe('W114 behavioral — items[].kind enum (8 anomaly kinds)', () => {
  for (const kind of ANOMALY_KINDS) {
    it(`SAVES item with kind='${kind}'`, async () => {
      const doc = await Snapshot.create(
        baseSnapshot({
          items: [{ id: `${kind}:001`, kind, severity: 'warning' }],
          summary: { total: 1, critical: 0, warning: 1, info: 0 },
        })
      );
      expect(doc.items[0].kind).toBe(kind);
    });
  }

  it('REJECTS invalid item kind', async () => {
    const p = new Snapshot(
      baseSnapshot({
        items: [{ id: 'x:001', kind: 'cosmic-pattern', severity: 'info' }],
        summary: { total: 1, critical: 0, warning: 0, info: 1 },
      })
    );
    await expect(p.save()).rejects.toThrow();
  });

  for (const sev of ['info', 'warning', 'critical']) {
    it(`SAVES severity='${sev}'`, async () => {
      const doc = await Snapshot.create(
        baseSnapshot({
          items: [{ id: 'x:001', kind: 'fraud-critical', severity: sev }],
          summary: {
            total: 1,
            critical: sev === 'critical' ? 1 : 0,
            warning: sev === 'warning' ? 1 : 0,
            info: sev === 'info' ? 1 : 0,
          },
        })
      );
      expect(doc.items[0].severity).toBe(sev);
    });
  }
});

// ─── 3. Wave-18: summary.total === items.length ─────────────────────

describe('W114 behavioral — summary.total === items.length invariant', () => {
  it('REJECTS total < items.length', async () => {
    const p = new Snapshot(
      baseSnapshot({
        items: [
          { id: 'x:1', kind: 'fraud-critical', severity: 'critical' },
          { id: 'x:2', kind: 'stream-errors-spike', severity: 'warning' },
        ],
        summary: { total: 1, critical: 1, warning: 0, info: 0 },
      })
    );
    await expect(p.save()).rejects.toThrow(/expected 2 \(items.length\), got 1/);
  });

  it('REJECTS total > items.length', async () => {
    const p = new Snapshot(
      baseSnapshot({
        items: [{ id: 'x:1', kind: 'fraud-critical', severity: 'critical' }],
        summary: { total: 5, critical: 5, warning: 0, info: 0 },
      })
    );
    await expect(p.save()).rejects.toThrow(/expected 1 \(items.length\), got 5/);
  });

  it('SAVES when total === items.length (3 items)', async () => {
    const doc = await Snapshot.create(
      baseSnapshot({
        items: [
          { id: 'x:1', kind: 'fraud-critical', severity: 'critical' },
          { id: 'x:2', kind: 'stream-errors-spike', severity: 'warning' },
          { id: 'x:3', kind: 'sync-drift-high', severity: 'info' },
        ],
        summary: { total: 3, critical: 1, warning: 1, info: 1 },
      })
    );
    expect(doc.items).toHaveLength(3);
  });
});

// ─── 4. Wave-18: severity counts sum to total ──────────────────────

describe('W114 behavioral — severity counts sum to total invariant', () => {
  it('REJECTS when sum < total', async () => {
    const p = new Snapshot(
      baseSnapshot({
        items: [
          { id: 'x:1', kind: 'fraud-critical', severity: 'critical' },
          { id: 'x:2', kind: 'fraud-critical', severity: 'critical' },
        ],
        summary: { total: 2, critical: 1, warning: 0, info: 0 },
      })
    );
    await expect(p.save()).rejects.toThrow(/severity counts \(1\) must equal total \(2\)/);
  });

  it('REJECTS when sum > total', async () => {
    const p = new Snapshot(
      baseSnapshot({
        items: [{ id: 'x:1', kind: 'fraud-critical', severity: 'critical' }],
        summary: { total: 1, critical: 1, warning: 1, info: 0 },
      })
    );
    await expect(p.save()).rejects.toThrow(/severity counts \(2\) must equal total \(1\)/);
  });

  it('SAVES when sum === total (mixed severities)', async () => {
    const doc = await Snapshot.create(
      baseSnapshot({
        items: [
          { id: 'a', kind: 'fraud-critical', severity: 'critical' },
          { id: 'b', kind: 'review-queue-stale', severity: 'warning' },
          { id: 'c', kind: 'no-stream-devices', severity: 'warning' },
          { id: 'd', kind: 'sync-drift-high', severity: 'info' },
        ],
        summary: { total: 4, critical: 1, warning: 2, info: 1 },
      })
    );
    expect(doc.summary.total).toBe(4);
  });
});

// ─── 5. items[].id non-empty ───────────────────────────────────────

describe('W114 behavioral — items[].id required', () => {
  it('REJECTS item without id', async () => {
    const p = new Snapshot(
      baseSnapshot({
        items: [{ kind: 'fraud-critical', severity: 'critical' }],
        summary: { total: 1, critical: 1, warning: 0, info: 0 },
      })
    );
    await expect(p.save()).rejects.toThrow(/id/);
  });
});

// ─── 6. Numeric bounds ─────────────────────────────────────────────

describe('W114 behavioral — summary numeric bounds', () => {
  it('REJECTS summary.total < 0', async () => {
    const p = new Snapshot(
      baseSnapshot({ summary: { total: -1, critical: 0, warning: 0, info: 0 } })
    );
    await expect(p.save()).rejects.toThrow();
  });

  it('REJECTS durationMs < 0', async () => {
    const p = new Snapshot(baseSnapshot({ durationMs: -10 }));
    await expect(p.save()).rejects.toThrow();
  });
});

// ─── 7. Collection name + canonical surface ────────────────────────

describe('W114 behavioral — canonical collection name', () => {
  it('uses canonical collection name hikvision_anomaly_snapshots', () => {
    expect(Snapshot.collection.collectionName).toBe('hikvision_anomaly_snapshots');
  });
});

// ─── 8. End-to-end: detector run → store snapshot ──────────────────

describe('W114 behavioral — detector-run snapshot pipeline', () => {
  it('records a 4-item scheduler snapshot with mixed severities + durationMs', async () => {
    const snap = await Snapshot.create({
      source: 'scheduler',
      items: [
        { id: 'fraud-critical:branch-a:emp-001', kind: 'fraud-critical', severity: 'critical' },
        { id: 'stream-errors-spike:cam-12', kind: 'stream-errors-spike', severity: 'warning' },
        { id: 'review-queue-stale:branch-a', kind: 'review-queue-stale', severity: 'warning' },
        { id: 'sync-drift-high:device-7', kind: 'sync-drift-high', severity: 'info' },
      ],
      summary: { total: 4, critical: 1, warning: 2, info: 1 },
      durationMs: 412,
      meta: { cronRunId: 'cron-2026-05-27-T0300', branchScope: 'all' },
    });

    expect(snap.summary.total).toBe(4);
    expect(snap.summary.critical).toBe(1);
    expect(snap.durationMs).toBe(412);
    expect(snap.meta.cronRunId).toBe('cron-2026-05-27-T0300');
  });
});
