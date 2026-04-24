'use strict';

/**
 * hr-adaptive-retention.test.js — Phase 11 Commit 31 (4.0.48).
 *
 * Pure + integration tests for the adaptive retention wrapper.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createHrAdaptiveRetentionService,
  computeAdaptiveArchiveAfterDays,
  DEFAULT_CONFIG,
} = require('../services/hr/hrAdaptiveRetentionService');
const { createHrAuditRetentionService } = require('../services/hr/hrAuditRetentionService');

let mongoServer;
let AuditLog;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  if (mongoose.connection.readyState !== 0) {
    try {
      await mongoose.disconnect();
    } catch {
      /* ignore */
    }
  }
  await mongoose.connect(mongoServer.getUri(), { dbName: 'adaptive-retention' });
  AuditLog = require('../models/auditLog.model').AuditLog;
}, 60_000);

afterAll(async () => {
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  if (mongoServer) await mongoServer.stop();
}, 60_000);

beforeEach(async () => {
  await AuditLog.deleteMany({});
});

// ─── computeAdaptiveArchiveAfterDays (pure) ─────────────────────

describe('computeAdaptiveArchiveAfterDays', () => {
  it('returns baseline when hotCount is below warning threshold', () => {
    expect(computeAdaptiveArchiveAfterDays({ hotCount: 0 })).toBe(365);
    expect(computeAdaptiveArchiveAfterDays({ hotCount: 499_999 })).toBe(365);
  });

  it('tightens at warning threshold (× 0.8 → 292)', () => {
    expect(computeAdaptiveArchiveAfterDays({ hotCount: 500_000 })).toBe(292);
    expect(computeAdaptiveArchiveAfterDays({ hotCount: 700_000 })).toBe(292);
  });

  it('tightens further at ceiling threshold (× 0.6 → 219)', () => {
    expect(computeAdaptiveArchiveAfterDays({ hotCount: 1_000_000 })).toBe(219);
    expect(computeAdaptiveArchiveAfterDays({ hotCount: 5_000_000 })).toBe(219);
  });

  it('never goes below floorDays (180)', () => {
    expect(
      computeAdaptiveArchiveAfterDays({
        hotCount: 10_000_000,
        baselineArchiveAfterDays: 180,
        tightenCeilingFactor: 0.1,
      })
    ).toBe(180);
  });

  it('custom floorDays honored', () => {
    expect(
      computeAdaptiveArchiveAfterDays({
        hotCount: 10_000_000,
        baselineArchiveAfterDays: 365,
        floorDays: 300,
      })
    ).toBe(300);
  });

  it('custom tighten factors applied', () => {
    expect(
      computeAdaptiveArchiveAfterDays({
        hotCount: 1_000_000,
        baselineArchiveAfterDays: 365,
        tightenCeilingFactor: 0.5,
      })
    ).toBe(182); // floor(182.5) = 182
  });

  it('garbage input falls back to baseline', () => {
    expect(computeAdaptiveArchiveAfterDays({ hotCount: -5 })).toBe(365);
    expect(computeAdaptiveArchiveAfterDays({ hotCount: NaN })).toBe(365);
    expect(computeAdaptiveArchiveAfterDays({ hotCount: 'lots' })).toBe(365);
    expect(computeAdaptiveArchiveAfterDays({ hotCount: null })).toBe(365);
  });

  it('respects custom baseline + thresholds', () => {
    const custom = computeAdaptiveArchiveAfterDays({
      hotCount: 200_000,
      baselineArchiveAfterDays: 180,
      warningThresholdRows: 100_000,
      ceilingThresholdRows: 500_000,
      floorDays: 90,
    });
    expect(custom).toBe(144); // floor(180 * 0.8)
  });

  it('exposes DEFAULT_CONFIG', () => {
    expect(DEFAULT_CONFIG.baselineArchiveAfterDays).toBe(365);
    expect(DEFAULT_CONFIG.floorDays).toBe(180);
  });
});

// ─── Construction ───────────────────────────────────────────────

describe('createHrAdaptiveRetentionService — construction', () => {
  it('throws without retentionService', () => {
    expect(() => createHrAdaptiveRetentionService({ auditLogModel: AuditLog })).toThrow(
      /retentionService/
    );
  });

  it('throws without auditLogModel', () => {
    expect(() =>
      createHrAdaptiveRetentionService({
        retentionService: { archive: async () => {} },
      })
    ).toThrow(/auditLogModel/);
  });
});

// ─── runAdaptiveRetention (integration) ─────────────────────────

describe('runAdaptiveRetention — integration', () => {
  const MS_PER_DAY = 24 * 3600 * 1000;

  async function seedHrRow({ isArchived = false, daysAgo = 1 }) {
    const createdAt = new Date(Date.now() - daysAgo * MS_PER_DAY);
    return AuditLog.create({
      eventType: 'data.read',
      eventCategory: 'data',
      severity: 'info',
      status: 'success',
      userId: new mongoose.Types.ObjectId(),
      resource: 'hr:seed',
      message: 'seed',
      metadata: { custom: {} },
      tags: ['hr'],
      flags: { isArchived },
      createdAt,
      updatedAt: createdAt,
    });
  }

  function buildService(config = {}) {
    const retentionService = createHrAuditRetentionService({
      auditLogModel: AuditLog,
    });
    return createHrAdaptiveRetentionService({
      retentionService,
      auditLogModel: AuditLog,
      config,
    });
  }

  it('normal pressure: uses baselineArchiveAfterDays as-is', async () => {
    await seedHrRow({ daysAgo: 400 });
    const svc = buildService({
      warningThresholdRows: 10,
      ceilingThresholdRows: 100,
    });
    const res = await svc.runAdaptiveRetention();
    expect(res.pressureLevel).toBe('normal');
    expect(res.computedArchiveAfterDays).toBe(365);
    expect(res.archive.modified).toBe(1);
  });

  it('warning pressure: tightens archiveAfterDays', async () => {
    // Seed 5 rows — cross warning threshold (3) but not ceiling (10)
    for (let i = 0; i < 5; i++) await seedHrRow({ daysAgo: 300 + i });
    const svc = buildService({
      warningThresholdRows: 3,
      ceilingThresholdRows: 10,
      floorDays: 1,
    });
    const res = await svc.runAdaptiveRetention();
    expect(res.pressureLevel).toBe('warning');
    expect(res.computedArchiveAfterDays).toBe(Math.floor(365 * 0.8));
    // 5 rows at ~300d — all cross the 292-day tightened cutoff
    expect(res.archive.modified).toBe(5);
  });

  it('ceiling pressure: most aggressive tightening', async () => {
    for (let i = 0; i < 12; i++) await seedHrRow({ daysAgo: 250 + i });
    const svc = buildService({
      warningThresholdRows: 3,
      ceilingThresholdRows: 10,
      floorDays: 1,
    });
    const res = await svc.runAdaptiveRetention();
    expect(res.pressureLevel).toBe('ceiling');
    expect(res.computedArchiveAfterDays).toBe(Math.floor(365 * 0.6)); // 219
    // Rows at 250-261 days old all cross the 219-day cutoff
    expect(res.archive.modified).toBe(12);
  });

  it('reports hotCount accurately', async () => {
    await seedHrRow({ isArchived: false });
    await seedHrRow({ isArchived: false });
    await seedHrRow({ isArchived: true }); // excluded
    const svc = buildService();
    const res = await svc.runAdaptiveRetention();
    expect(res.hotCount).toBe(2);
  });

  it('dry-run mode does not write', async () => {
    await seedHrRow({ daysAgo: 400 });
    const svc = buildService();
    const res = await svc.runAdaptiveRetention({ dryRun: true });
    expect(res.archive.mode).toBe('dry-run-archive');
    expect(res.archive.modified).toBe(0);

    // Underlying row still not archived
    const count = await AuditLog.countDocuments({ 'flags.isArchived': true });
    expect(count).toBe(0);
  });

  it('honors caller-supplied baseline override (respecting floor)', async () => {
    await seedHrRow({ daysAgo: 100 });
    // Use a custom floor below the override to isolate the baseline behavior
    const svc = buildService({
      warningThresholdRows: 10,
      ceilingThresholdRows: 100,
      floorDays: 10,
    });
    const res = await svc.runAdaptiveRetention({
      baselineArchiveAfterDays: 60,
    });
    // Normal pressure with 1 row, baseline=60, floor=10 → computed=60
    expect(res.computedArchiveAfterDays).toBe(60);
    expect(res.archive.modified).toBe(1);
  });
});
