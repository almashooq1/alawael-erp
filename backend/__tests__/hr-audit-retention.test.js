'use strict';

/**
 * hr-audit-retention.test.js — Phase 11 Commit 27 (4.0.44).
 *
 * Integration coverage for the HR AuditLog retention service
 * (archive + purge). Real AuditLog model on mongodb-memory-server.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const {
  createHrAuditRetentionService,
  DEFAULTS,
} = require('../services/hr/hrAuditRetentionService');

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
  await mongoose.connect(mongoServer.getUri(), { dbName: 'audit-retention-test' });
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

const NOW = new Date('2026-04-23T12:00:00.000Z');
const MS_PER_DAY = 24 * 3600 * 1000;

async function seedEvent({
  daysAgo = 1,
  tags = ['hr'],
  isArchived = false,
  requiresReview = false,
  eventType = 'data.read',
}) {
  const createdAt = new Date(NOW.getTime() - daysAgo * MS_PER_DAY);
  return AuditLog.create({
    eventType,
    eventCategory: 'data',
    severity: 'info',
    status: 'success',
    userId: new mongoose.Types.ObjectId(),
    resource: 'hr:employee:seeded:view',
    message: 'seeded',
    metadata: { custom: {} },
    tags,
    flags: { isArchived, requiresReview },
    createdAt,
    updatedAt: createdAt,
  });
}

function buildService() {
  return createHrAuditRetentionService({
    auditLogModel: AuditLog,
    now: () => NOW,
  });
}

// ─── Construction ───────────────────────────────────────────────

describe('createHrAuditRetentionService — construction', () => {
  it('throws without auditLogModel', () => {
    expect(() => createHrAuditRetentionService({})).toThrow(/auditLogModel/);
  });

  it('exposes defaults', () => {
    expect(DEFAULTS.archiveAfterDays).toBe(365);
    expect(DEFAULTS.purgeAfterDays).toBe(1095);
    expect(DEFAULTS.batchSize).toBe(1000);
  });
});

// ─── archive ────────────────────────────────────────────────────

describe('archive', () => {
  it('marks events older than archiveAfterDays as archived', async () => {
    await seedEvent({ daysAgo: 10 }); // fresh — untouched
    await seedEvent({ daysAgo: 400 }); // stale — archive
    await seedEvent({ daysAgo: 500 }); // stale — archive

    const res = await buildService().archive();
    expect(res.mode).toBe('archive');
    expect(res.modified).toBe(2);

    const archived = await AuditLog.countDocuments({ 'flags.isArchived': true });
    expect(archived).toBe(2);
    const fresh = await AuditLog.countDocuments({ 'flags.isArchived': { $ne: true } });
    expect(fresh).toBe(1);
  });

  it('idempotent: second run of archive is a no-op', async () => {
    await seedEvent({ daysAgo: 400 });
    const svc = buildService();
    const first = await svc.archive();
    expect(first.modified).toBe(1);
    const second = await svc.archive();
    expect(second.modified).toBe(0);
    expect(second.matched).toBe(0);
  });

  it('respects custom archiveAfterDays', async () => {
    await seedEvent({ daysAgo: 60 });
    await seedEvent({ daysAgo: 100 });
    const svc = buildService();
    const res = await svc.archive({ archiveAfterDays: 90 });
    expect(res.modified).toBe(1);
  });

  it('excludes events without the hr tag', async () => {
    await seedEvent({ daysAgo: 400, tags: ['billing'] });
    await seedEvent({ daysAgo: 400, tags: ['hr'] });
    const res = await buildService().archive();
    expect(res.modified).toBe(1);

    const archivedBilling = await AuditLog.countDocuments({
      tags: 'billing',
      'flags.isArchived': true,
    });
    expect(archivedBilling).toBe(0);
  });

  it('excludes events with requiresReview: true (active governance)', async () => {
    await seedEvent({ daysAgo: 400, requiresReview: true });
    const res = await buildService().archive();
    expect(res.modified).toBe(0);

    const pending = await AuditLog.countDocuments({ 'flags.requiresReview': true });
    expect(pending).toBe(1);
  });

  it('dry-run counts without writing', async () => {
    await seedEvent({ daysAgo: 400 });
    await seedEvent({ daysAgo: 500 });
    const svc = buildService();
    const dry = await svc.archive({ dryRun: true });
    expect(dry.mode).toBe('dry-run-archive');
    expect(dry.matched).toBe(2);
    expect(dry.modified).toBe(0);

    const archived = await AuditLog.countDocuments({ 'flags.isArchived': true });
    expect(archived).toBe(0);
  });

  it('handles batchSize smaller than total', async () => {
    for (let i = 0; i < 12; i++) {
      await seedEvent({ daysAgo: 400 + i });
    }
    const svc = buildService();
    const res = await svc.archive({ batchSize: 5 });
    expect(res.modified).toBe(12);
    expect(res.batches).toBeGreaterThanOrEqual(3);
  });
});

// ─── purge ──────────────────────────────────────────────────────

describe('purge', () => {
  it('deletes archived events older than purgeAfterDays', async () => {
    await seedEvent({ daysAgo: 1200, isArchived: true });
    await seedEvent({ daysAgo: 1100, isArchived: true });
    await seedEvent({ daysAgo: 500, isArchived: true }); // archived but not old enough

    const res = await buildService().purge();
    expect(res.mode).toBe('purge');
    expect(res.deleted).toBe(2);

    const remaining = await AuditLog.countDocuments({});
    expect(remaining).toBe(1);
  });

  it('does NOT delete unarchived events (safety gate)', async () => {
    await seedEvent({ daysAgo: 2000, isArchived: false });
    const res = await buildService().purge();
    expect(res.deleted).toBe(0);

    const remaining = await AuditLog.countDocuments({});
    expect(remaining).toBe(1);
  });

  it('excludes requiresReview events', async () => {
    await seedEvent({ daysAgo: 2000, isArchived: true, requiresReview: true });
    const res = await buildService().purge();
    expect(res.deleted).toBe(0);
  });

  it('excludes non-hr events', async () => {
    await seedEvent({ daysAgo: 2000, isArchived: true, tags: ['billing'] });
    const res = await buildService().purge();
    expect(res.deleted).toBe(0);
  });

  it('respects custom purgeAfterDays', async () => {
    await seedEvent({ daysAgo: 500, isArchived: true });
    const svc = buildService();
    const standard = await svc.purge({ purgeAfterDays: 1095 });
    expect(standard.deleted).toBe(0);

    // Tighter window — 400 days
    const tight = await svc.purge({ purgeAfterDays: 400 });
    expect(tight.deleted).toBe(1);
  });

  it('dry-run counts without deleting', async () => {
    await seedEvent({ daysAgo: 2000, isArchived: true });
    await seedEvent({ daysAgo: 1500, isArchived: true });

    const svc = buildService();
    const dry = await svc.purge({ dryRun: true });
    expect(dry.mode).toBe('dry-run-purge');
    expect(dry.matched).toBe(2);
    expect(dry.deleted).toBe(0);

    expect(await AuditLog.countDocuments({})).toBe(2);
  });
});

// ─── runFullRetention ──────────────────────────────────────────

describe('runFullRetention', () => {
  it('archives first, then purges', async () => {
    await seedEvent({ daysAgo: 10 }); // fresh
    await seedEvent({ daysAgo: 400 }); // → archive
    await seedEvent({ daysAgo: 2000, isArchived: true }); // → purge

    const res = await buildService().runFullRetention();
    expect(res.archive.modified).toBe(1);
    expect(res.purge.deleted).toBe(1);

    expect(await AuditLog.countDocuments({})).toBe(2);
    expect(await AuditLog.countDocuments({ 'flags.isArchived': true })).toBe(1);
    expect(await AuditLog.countDocuments({ 'flags.isArchived': { $ne: true } })).toBe(1);
  });

  it('dry-run: no writes in either phase', async () => {
    await seedEvent({ daysAgo: 400 });
    await seedEvent({ daysAgo: 2000, isArchived: true });

    const res = await buildService().runFullRetention({ dryRun: true });
    expect(res.dryRun).toBe(true);
    expect(res.archive.mode).toBe('dry-run-archive');
    expect(res.purge.mode).toBe('dry-run-purge');
    expect(res.archive.matched).toBe(1);
    expect(res.purge.matched).toBe(1);

    expect(await AuditLog.countDocuments({})).toBe(2);
    expect(await AuditLog.countDocuments({ 'flags.isArchived': true })).toBe(1);
  });
});
