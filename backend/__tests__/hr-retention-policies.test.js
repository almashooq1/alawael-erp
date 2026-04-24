'use strict';

/**
 * hr-retention-policies.test.js — Phase 11 Commit 33 (4.0.50).
 *
 * Config invariants for the per-tag retention policies + service
 * integration for runRetentionByPolicies + tagFilter.
 */

jest.unmock('mongoose');
jest.resetModules();

process.env.NODE_ENV = 'test';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { POLICIES, byTag, sortedByPriority } = require('../config/hr-retention-policies');
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
  await mongoose.connect(mongoServer.getUri(), { dbName: 'retention-policies' });
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

// ─── Config invariants ──────────────────────────────────────────

describe('hr-retention-policies — shape', () => {
  it('has at least 4 policies', () => {
    expect(POLICIES.length).toBeGreaterThanOrEqual(4);
  });

  it('includes hr:anomaly + hr:change_request at minimum', () => {
    const tags = POLICIES.map(p => p.tag);
    expect(tags).toContain('hr:anomaly');
    expect(tags).toContain('hr:change_request');
  });

  it('every policy has required fields + valid day counts', () => {
    for (const p of POLICIES) {
      expect(typeof p.tag).toBe('string');
      expect(p.tag.length).toBeGreaterThan(0);
      expect(typeof p.archiveAfterDays).toBe('number');
      expect(typeof p.purgeAfterDays).toBe('number');
      expect(p.archiveAfterDays).toBeGreaterThan(0);
      expect(p.purgeAfterDays).toBeGreaterThan(p.archiveAfterDays);
    }
  });

  it('hr:anomaly retains longer than hr:change_request (security evidence weight)', () => {
    const anomaly = byTag('hr:anomaly');
    const changeReq = byTag('hr:change_request');
    expect(anomaly.archiveAfterDays).toBeGreaterThanOrEqual(changeReq.archiveAfterDays);
    expect(anomaly.purgeAfterDays).toBeGreaterThanOrEqual(changeReq.purgeAfterDays);
  });

  it('every tag id is unique', () => {
    const tags = POLICIES.map(p => p.tag);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it('byTag returns null for unknown tag', () => {
    expect(byTag('nope:unknown')).toBeNull();
  });

  it('sortedByPriority returns ascending priority order', () => {
    const sorted = sortedByPriority();
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1].priority || 100;
      const curr = sorted[i].priority || 100;
      expect(curr).toBeGreaterThanOrEqual(prev);
    }
  });

  it('POLICIES is frozen', () => {
    expect(Object.isFrozen(POLICIES)).toBe(true);
  });
});

// ─── Service — tagFilter ────────────────────────────────────────

describe('archive + purge — tagFilter', () => {
  const MS_PER_DAY = 24 * 3600 * 1000;

  async function seedRow({ tags = ['hr'], daysAgo = 1, isArchived = false }) {
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
      tags,
      flags: { isArchived },
      createdAt,
      updatedAt: createdAt,
    });
  }

  function buildService() {
    return createHrAuditRetentionService({ auditLogModel: AuditLog });
  }

  it('archive with tagFilter:hr:anomaly only touches anomaly-tagged rows', async () => {
    await seedRow({ tags: ['hr', 'hr:anomaly'], daysAgo: 800 });
    await seedRow({ tags: ['hr', 'hr:employee'], daysAgo: 800 });
    await seedRow({ tags: ['hr', 'hr:dashboard'], daysAgo: 800 });

    const svc = buildService();
    const res = await svc.archive({
      archiveAfterDays: 730,
      tagFilter: 'hr:anomaly',
    });
    expect(res.modified).toBe(1);
    expect(res.tagFilter).toBe('hr:anomaly');

    // Others untouched
    const otherArchived = await AuditLog.countDocuments({
      tags: 'hr:employee',
      'flags.isArchived': true,
    });
    expect(otherArchived).toBe(0);
  });

  it('purge with tagFilter only deletes matching archived rows', async () => {
    await seedRow({ tags: ['hr', 'hr:dashboard'], daysAgo: 1200, isArchived: true });
    await seedRow({ tags: ['hr', 'hr:employee'], daysAgo: 1200, isArchived: true });

    const svc = buildService();
    const res = await svc.purge({
      purgeAfterDays: 1095,
      tagFilter: 'hr:dashboard',
    });
    expect(res.deleted).toBe(1);
    const remaining = await AuditLog.countDocuments({});
    expect(remaining).toBe(1);
  });
});

// ─── runRetentionByPolicies ─────────────────────────────────────

describe('runRetentionByPolicies', () => {
  const MS_PER_DAY = 24 * 3600 * 1000;

  async function seedRow({ tags, daysAgo, isArchived = false }) {
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
      tags,
      flags: { isArchived },
      createdAt,
      updatedAt: createdAt,
    });
  }

  function buildService() {
    return createHrAuditRetentionService({ auditLogModel: AuditLog });
  }

  it('applies each policy with its own thresholds', async () => {
    // anomaly: archive at 730d → seed row at 800d (should archive)
    await seedRow({ tags: ['hr', 'hr:anomaly'], daysAgo: 800 });
    // change_request: archive at 365d → seed row at 400d (should archive)
    await seedRow({ tags: ['hr', 'hr:change_request'], daysAgo: 400 });
    // anomaly row at 400d (< 730) → should NOT archive
    await seedRow({ tags: ['hr', 'hr:anomaly'], daysAgo: 400 });

    const svc = buildService();
    const res = await svc.runRetentionByPolicies();
    expect(res.mode).toBe('by-policies');
    expect(res.totals.archived).toBe(2);

    const anomalyArchived = await AuditLog.countDocuments({
      tags: 'hr:anomaly',
      'flags.isArchived': true,
    });
    expect(anomalyArchived).toBe(1);
  });

  it('accepts custom policies array', async () => {
    await seedRow({ tags: ['hr', 'custom:tag'], daysAgo: 100 });
    const svc = buildService();
    const res = await svc.runRetentionByPolicies({
      policies: [{ tag: 'custom:tag', archiveAfterDays: 50, purgeAfterDays: 300 }],
    });
    expect(res.policiesRun).toBe(1);
    expect(res.totals.archived).toBe(1);
  });

  it('dry-run: reports without writing', async () => {
    await seedRow({ tags: ['hr', 'hr:anomaly'], daysAgo: 800 });
    const svc = buildService();
    const res = await svc.runRetentionByPolicies({ dryRun: true });
    expect(res.dryRun).toBe(true);
    const archived = await AuditLog.countDocuments({ 'flags.isArchived': true });
    expect(archived).toBe(0);
  });

  it('perPolicy reports are keyed by tag', async () => {
    await seedRow({ tags: ['hr', 'hr:anomaly'], daysAgo: 800 });
    const svc = buildService();
    const res = await svc.runRetentionByPolicies();
    const anomaly = res.perPolicy.find(p => p.tag === 'hr:anomaly');
    expect(anomaly).toBeDefined();
    expect(anomaly.archive.tagFilter).toBe('hr:anomaly');
    expect(anomaly.purge.tagFilter).toBe('hr:anomaly');
  });

  it('does NOT touch archived rows from other tags', async () => {
    await seedRow({ tags: ['hr', 'hr:anomaly'], daysAgo: 800 });
    // Also seed a change_request archive-candidate row to verify
    // policies don't bleed into each other
    await seedRow({ tags: ['hr', 'hr:change_request'], daysAgo: 400 });

    const svc = buildService();
    await svc.runRetentionByPolicies();

    const anomalyArchived = await AuditLog.countDocuments({
      tags: 'hr:anomaly',
      'flags.isArchived': true,
    });
    const crArchived = await AuditLog.countDocuments({
      tags: 'hr:change_request',
      'flags.isArchived': true,
    });
    expect(anomalyArchived).toBe(1);
    expect(crArchived).toBe(1);
  });
});
