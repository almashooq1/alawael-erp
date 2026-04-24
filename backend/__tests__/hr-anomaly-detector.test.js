'use strict';

/**
 * hr-anomaly-detector.test.js — Phase 11 Commit 19 (4.0.36).
 *
 * Integration coverage for the HR anomaly detector service against
 * a real AuditLog model on mongodb-memory-server.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { createHrAnomalyDetectorService } = require('../services/hr/hrAnomalyDetectorService');

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
  await mongoose.connect(mongoServer.getUri(), { dbName: 'anomaly-test' });
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

const NOW = new Date('2026-04-22T12:00:00.000Z');
const MS_PER_MIN = 60 * 1000;

function buildService(nowOverride = NOW) {
  return createHrAnomalyDetectorService({
    auditLogModel: AuditLog,
    now: () => nowOverride,
  });
}

async function seedReadEvent({ userId, userRole = 'hr_officer', minutesAgo = 5 }) {
  const createdAt = new Date(NOW.getTime() - minutesAgo * MS_PER_MIN);
  return AuditLog.create({
    eventType: 'data.read',
    eventCategory: 'data',
    severity: 'info',
    status: 'success',
    userId,
    userRole,
    resource: `hr:employee:${new mongoose.Types.ObjectId()}:view`,
    message: 'seeded',
    metadata: { custom: { action: 'view' } },
    tags: ['hr'],
    createdAt,
    updatedAt: createdAt,
  });
}

async function seedExportEvent({ userId, userRole = 'hr_manager', hoursAgo = 1 }) {
  const createdAt = new Date(NOW.getTime() - hoursAgo * 60 * MS_PER_MIN);
  return AuditLog.create({
    eventType: 'data.exported',
    eventCategory: 'data',
    severity: 'high',
    status: 'success',
    userId,
    userRole,
    resource: `hr:employee:${new mongoose.Types.ObjectId()}:data_export_admin`,
    message: 'seeded export',
    metadata: { custom: { action: 'data_export_admin', format: 'json' } },
    tags: ['hr'],
    createdAt,
    updatedAt: createdAt,
  });
}

async function seedCooldownFlag({ userId, reason, minutesAgo = 30 }) {
  const createdAt = new Date(NOW.getTime() - minutesAgo * MS_PER_MIN);
  return AuditLog.create({
    eventType: 'security.suspicious_activity',
    eventCategory: 'security',
    severity: 'high',
    status: 'success',
    userId,
    userRole: 'hr_officer',
    resource: `hr:anomaly:${reason}`,
    message: 'prior flag',
    metadata: { custom: { reason } },
    tags: ['hr', 'hr:anomaly', reason],
    createdAt,
    updatedAt: createdAt,
  });
}

// ─── Construction ───────────────────────────────────────────────

describe('createHrAnomalyDetectorService — construction', () => {
  it('throws without auditLogModel', () => {
    expect(() => createHrAnomalyDetectorService({})).toThrow(/auditLogModel is required/);
  });

  it('exposes scan + DEFAULTS', () => {
    const svc = buildService();
    expect(typeof svc.scan).toBe('function');
    expect(svc.DEFAULTS.readsPerHourThreshold).toBe(100);
  });
});

// ─── Read anomalies ─────────────────────────────────────────────

describe('scan — read anomalies', () => {
  it('flags user with reads >= threshold in window', async () => {
    const heavyReader = new mongoose.Types.ObjectId();
    for (let i = 0; i < 110; i++) {
      await seedReadEvent({ userId: heavyReader, minutesAgo: (i % 50) + 1 });
    }

    const report = await buildService().scan();
    expect(report.totals.read_anomalies).toBe(1);
    expect(report.flagged).toHaveLength(1);
    expect(String(report.flagged[0].userId)).toBe(String(heavyReader));
    expect(report.flagged[0].reason).toBe('excessive_reads');
    expect(report.flagged[0].observedCount).toBe(110);
    expect(report.flagged[0].cooldownSkipped).toBe(false);
  });

  it('does NOT flag user with reads below threshold', async () => {
    const lightReader = new mongoose.Types.ObjectId();
    for (let i = 0; i < 50; i++) {
      await seedReadEvent({ userId: lightReader, minutesAgo: (i % 50) + 1 });
    }
    const report = await buildService().scan();
    expect(report.totals.read_anomalies).toBe(0);
  });

  it('respects custom readsPerHourThreshold', async () => {
    const user = new mongoose.Types.ObjectId();
    for (let i = 0; i < 40; i++) {
      await seedReadEvent({ userId: user, minutesAgo: (i % 50) + 1 });
    }
    const report = await buildService().scan({ readsPerHourThreshold: 30 });
    expect(report.totals.read_anomalies).toBe(1);
  });

  it('scales threshold by window (30-min window → half)', async () => {
    const user = new mongoose.Types.ObjectId();
    // Seed 60 events in the last 20 minutes (inside a 30-min scan window)
    for (let i = 0; i < 60; i++) {
      await seedReadEvent({ userId: user, minutesAgo: (i % 20) + 1 });
    }
    // 30-min window, 100 reads/hour → effective threshold 50.
    // 60 observed > 50 → flagged.
    const report = await buildService().scan({
      windowMinutes: 30,
      readsPerHourThreshold: 100,
    });
    expect(report.totals.read_anomalies).toBe(1);
  });

  it('excludes reads outside the window', async () => {
    const user = new mongoose.Types.ObjectId();
    // 150 events all 2 hours ago — outside default 60-min window
    for (let i = 0; i < 150; i++) {
      await seedReadEvent({ userId: user, minutesAgo: 120 + i });
    }
    const report = await buildService().scan();
    expect(report.totals.read_anomalies).toBe(0);
  });

  it('groups per-user independently', async () => {
    const userA = new mongoose.Types.ObjectId();
    const userB = new mongoose.Types.ObjectId();
    for (let i = 0; i < 110; i++) {
      await seedReadEvent({ userId: userA, minutesAgo: (i % 50) + 1 });
    }
    for (let i = 0; i < 60; i++) {
      await seedReadEvent({ userId: userB, minutesAgo: (i % 50) + 1 });
    }
    const report = await buildService().scan();
    expect(report.totals.read_anomalies).toBe(1);
    expect(report.flagged.every(f => String(f.userId) === String(userA))).toBe(true);
  });
});

// ─── Export anomalies ───────────────────────────────────────────

describe('scan — export anomalies', () => {
  it('flags user with exports >= threshold over 24h', async () => {
    const exporter = new mongoose.Types.ObjectId();
    for (let i = 0; i < 6; i++) {
      await seedExportEvent({ userId: exporter, hoursAgo: i + 1 });
    }
    const report = await buildService().scan();
    expect(report.totals.export_anomalies).toBe(1);
    expect(report.flagged[0].reason).toBe('excessive_exports');
  });

  it('does NOT flag below threshold', async () => {
    const exporter = new mongoose.Types.ObjectId();
    for (let i = 0; i < 3; i++) {
      await seedExportEvent({ userId: exporter, hoursAgo: i + 1 });
    }
    const report = await buildService().scan();
    expect(report.totals.export_anomalies).toBe(0);
  });

  it('respects custom exportsPerDayThreshold', async () => {
    const exporter = new mongoose.Types.ObjectId();
    for (let i = 0; i < 3; i++) {
      await seedExportEvent({ userId: exporter, hoursAgo: i + 1 });
    }
    const report = await buildService().scan({ exportsPerDayThreshold: 3 });
    expect(report.totals.export_anomalies).toBe(1);
  });
});

// ─── Event emission ─────────────────────────────────────────────

describe('scan — event emission', () => {
  it('writes a security.suspicious_activity row on flag', async () => {
    const heavyReader = new mongoose.Types.ObjectId();
    for (let i = 0; i < 110; i++) {
      await seedReadEvent({ userId: heavyReader, minutesAgo: (i % 50) + 1 });
    }
    await buildService().scan();

    const emitted = await AuditLog.find({
      eventType: 'security.suspicious_activity',
      userId: heavyReader,
    }).lean();
    expect(emitted.length).toBe(1);
    const row = emitted[0];
    expect(row.severity).toBe('high');
    expect(row.eventCategory).toBe('security');
    expect(row.resource).toBe('hr:anomaly:excessive_reads');
    expect(row.metadata.custom.reason).toBe('excessive_reads');
    expect(row.metadata.custom.observedCount).toBe(110);
    expect(row.tags).toEqual(expect.arrayContaining(['hr', 'hr:anomaly', 'excessive_reads']));
    expect(row.flags.requiresReview).toBe(true);
    expect(row.flags.isSuspicious).toBe(true);
  });

  it('dryRun: detects but does NOT emit', async () => {
    const heavyReader = new mongoose.Types.ObjectId();
    for (let i = 0; i < 110; i++) {
      await seedReadEvent({ userId: heavyReader, minutesAgo: (i % 50) + 1 });
    }
    const report = await buildService().scan({ dryRun: true });
    expect(report.totals.read_anomalies).toBe(1);

    const emitted = await AuditLog.find({
      eventType: 'security.suspicious_activity',
    }).lean();
    expect(emitted.length).toBe(0);
  });
});

// ─── Cooldown ───────────────────────────────────────────────────

describe('scan — cooldown', () => {
  it('skips emission when a recent flag exists for the same (user, reason)', async () => {
    const user = new mongoose.Types.ObjectId();
    for (let i = 0; i < 110; i++) {
      await seedReadEvent({ userId: user, minutesAgo: (i % 50) + 1 });
    }
    await seedCooldownFlag({ userId: user, reason: 'excessive_reads', minutesAgo: 15 });

    const report = await buildService().scan();
    expect(report.totals.read_anomalies).toBe(0);
    expect(report.totals.cooldown_skipped).toBe(1);
    expect(report.flagged).toHaveLength(1);
    expect(report.flagged[0].cooldownSkipped).toBe(true);

    // And no new emission
    const emitted = await AuditLog.find({
      eventType: 'security.suspicious_activity',
      userId: user,
    }).lean();
    expect(emitted.length).toBe(1); // only the pre-seeded one
  });

  it('re-emits when the prior flag is older than cooldown', async () => {
    const user = new mongoose.Types.ObjectId();
    for (let i = 0; i < 110; i++) {
      await seedReadEvent({ userId: user, minutesAgo: (i % 50) + 1 });
    }
    // Prior flag 90 minutes ago → outside the 60-min cooldown window
    await seedCooldownFlag({ userId: user, reason: 'excessive_reads', minutesAgo: 90 });

    const report = await buildService().scan({ cooldownMinutes: 60 });
    expect(report.totals.read_anomalies).toBe(1);
    expect(report.totals.cooldown_skipped).toBe(0);
  });

  it('cooldown is per-reason — an excessive-reads cooldown does NOT suppress excessive-exports', async () => {
    const user = new mongoose.Types.ObjectId();
    for (let i = 0; i < 110; i++) {
      await seedReadEvent({ userId: user, minutesAgo: (i % 50) + 1 });
    }
    for (let i = 0; i < 6; i++) {
      await seedExportEvent({ userId: user, hoursAgo: i + 1 });
    }
    // Only a READS cooldown
    await seedCooldownFlag({ userId: user, reason: 'excessive_reads', minutesAgo: 15 });

    const report = await buildService().scan();
    expect(report.totals.read_anomalies).toBe(0); // suppressed by cooldown
    expect(report.totals.export_anomalies).toBe(1); // NOT suppressed
  });
});

// ─── Totals + shape ─────────────────────────────────────────────

describe('scan — totals + shape', () => {
  it('returns an empty flagged array on a clean system', async () => {
    const report = await buildService().scan();
    expect(report.flagged).toEqual([]);
    expect(report.totals).toEqual({
      read_anomalies: 0,
      export_anomalies: 0,
      cooldown_skipped: 0,
      webhooks_dispatched: 0,
    });
    expect(report.scannedAt).toBe(NOW.toISOString());
  });
});
