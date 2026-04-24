/**
 * hr-access-audit-service.test.js — Phase 11 Commit 6 (4.0.23).
 *
 * Unit coverage against a stub AuditLog model (no DB). Verifies
 * schema-mapping, fire-and-forget semantics (never throws), and
 * querying helpers for anomaly detection + DSAR fulfilment.
 */

'use strict';

const { createHrAccessAuditService } = require('../services/hr/hrAccessAuditService');

function stubLogger() {
  const out = { warn: jest.fn() };
  return out;
}

function stubAuditModel({ createImpl, countImpl, findImpl } = {}) {
  const create = jest.fn(createImpl || (async doc => ({ _id: 'audit-' + Math.random(), ...doc })));
  const countDocuments = jest.fn(countImpl || (async () => 0));
  const find = jest.fn(
    findImpl ||
      (() => ({
        sort() {
          return this;
        },
        limit() {
          return this;
        },
        async lean() {
          return [];
        },
      }))
  );
  return { create, countDocuments, find };
}

// ─── Constructor guard ──────────────────────────────────────────

describe('createHrAccessAuditService — construction', () => {
  it('throws when auditLogModel is missing', () => {
    expect(() => createHrAccessAuditService({})).toThrow(/auditLogModel is required/);
  });

  it('builds a frozen service with 5 methods', () => {
    const svc = createHrAccessAuditService({ auditLogModel: stubAuditModel() });
    expect(Object.isFrozen(svc)).toBe(true);
    expect(typeof svc.logHrAccess).toBe('function');
    expect(typeof svc.logHrAccessDenied).toBe('function');
    expect(typeof svc.logHrExport).toBe('function');
    expect(typeof svc.countRecentAccesses).toBe('function');
    expect(typeof svc.recentAccessesFor).toBe('function');
  });
});

// ─── logHrAccess ────────────────────────────────────────────────

describe('logHrAccess', () => {
  it('writes a DATA_READ event with canonical resource + metadata', async () => {
    const AuditLog = stubAuditModel();
    const svc = createHrAccessAuditService({ auditLogModel: AuditLog });

    const res = await svc.logHrAccess({
      actorUserId: 'user-123',
      actorRole: 'hr_manager',
      entityType: 'employee',
      entityId: 'emp-999',
      action: 'view',
      redactedCount: 0,
      isSelfAccess: false,
      ipAddress: '10.0.0.7',
    });

    expect(res.logged).toBe(true);
    expect(AuditLog.create).toHaveBeenCalledTimes(1);
    const doc = AuditLog.create.mock.calls[0][0];
    expect(doc.eventType).toBe('data.read');
    expect(doc.eventCategory).toBe('data');
    expect(doc.severity).toBe('info');
    expect(doc.status).toBe('success');
    expect(doc.userId).toBe('user-123');
    expect(doc.userRole).toBe('hr_manager');
    expect(doc.resource).toBe('hr:employee:emp-999:view');
    expect(doc.message).toContain('HR employee view');
    expect(doc.ipAddress).toBe('10.0.0.7');
    expect(doc.metadata.custom.entityType).toBe('hr:employee');
    expect(doc.metadata.custom.entityId).toBe('emp-999');
    expect(doc.metadata.custom.action).toBe('view');
    expect(doc.metadata.custom.redactedCount).toBe(0);
    expect(doc.metadata.custom.isSelfAccess).toBe(false);
    expect(doc.tags).toEqual(['hr', 'hr:employee']);
  });

  it('marks self-access in the message + metadata', async () => {
    const AuditLog = stubAuditModel();
    const svc = createHrAccessAuditService({ auditLogModel: AuditLog });

    await svc.logHrAccess({
      actorUserId: 'user-self',
      actorRole: 'therapist',
      entityType: 'employee',
      entityId: 'emp-self',
      isSelfAccess: true,
    });

    const doc = AuditLog.create.mock.calls[0][0];
    expect(doc.message).toContain('(self)');
    expect(doc.metadata.custom.isSelfAccess).toBe(true);
  });

  it('tolerates a create() failure without throwing', async () => {
    const AuditLog = stubAuditModel({
      createImpl: async () => {
        throw new Error('mongo down');
      },
    });
    const logger = stubLogger();
    const svc = createHrAccessAuditService({ auditLogModel: AuditLog, logger });

    const res = await svc.logHrAccess({
      actorUserId: 'user-1',
      actorRole: 'hr_manager',
      entityType: 'employee',
    });

    expect(res.logged).toBe(false);
    expect(res.error).toContain('mongo down');
    expect(logger.warn).toHaveBeenCalled();
  });

  it('entities with no id still produce a valid resource string', async () => {
    const AuditLog = stubAuditModel();
    const svc = createHrAccessAuditService({ auditLogModel: AuditLog });

    await svc.logHrAccess({
      actorUserId: 'user-1',
      actorRole: 'hr_manager',
      entityType: 'dashboard',
      action: 'snapshot',
    });

    const doc = AuditLog.create.mock.calls[0][0];
    expect(doc.resource).toBe('hr:dashboard:snapshot');
    expect(doc.metadata.custom.entityId).toBeNull();
  });
});

// ─── logHrAccessDenied ──────────────────────────────────────────

describe('logHrAccessDenied', () => {
  it('writes a security.access_denied event with reason', async () => {
    const AuditLog = stubAuditModel();
    const svc = createHrAccessAuditService({ auditLogModel: AuditLog });

    await svc.logHrAccessDenied({
      actorUserId: 'user-x',
      actorRole: 'therapist',
      entityType: 'employee',
      entityId: 'emp-other',
      reason: 'insufficient_privilege',
    });

    const doc = AuditLog.create.mock.calls[0][0];
    expect(doc.eventType).toBe('security.access_denied');
    expect(doc.eventCategory).toBe('security');
    expect(doc.severity).toBe('medium');
    expect(doc.status).toBe('failure');
    expect(doc.message).toContain('insufficient_privilege');
    expect(doc.metadata.custom.reason).toBe('insufficient_privilege');
  });
});

// ─── logHrExport ────────────────────────────────────────────────

describe('logHrExport', () => {
  it('writes DATA_EXPORTED with high severity and record count', async () => {
    const AuditLog = stubAuditModel();
    const svc = createHrAccessAuditService({ auditLogModel: AuditLog });

    await svc.logHrExport({
      actorUserId: 'user-hr',
      actorRole: 'hr_manager',
      entityType: 'employee',
      action: 'export',
      recordCount: 245,
      format: 'xlsx',
    });

    const doc = AuditLog.create.mock.calls[0][0];
    expect(doc.eventType).toBe('data.exported');
    expect(doc.eventCategory).toBe('data');
    expect(doc.severity).toBe('high');
    expect(doc.message).toContain('(xlsx, 245 records)');
    expect(doc.metadata.custom.recordCount).toBe(245);
    expect(doc.metadata.custom.format).toBe('xlsx');
  });
});

// ─── countRecentAccesses ────────────────────────────────────────

describe('countRecentAccesses', () => {
  it('returns 0 when actorUserId is missing', async () => {
    const AuditLog = stubAuditModel();
    const svc = createHrAccessAuditService({ auditLogModel: AuditLog });
    expect(await svc.countRecentAccesses({})).toBe(0);
    expect(AuditLog.countDocuments).not.toHaveBeenCalled();
  });

  it('queries DATA_READ events in window with hr: resource prefix', async () => {
    const AuditLog = stubAuditModel({ countImpl: async () => 42 });
    const svc = createHrAccessAuditService({ auditLogModel: AuditLog });

    const count = await svc.countRecentAccesses({
      actorUserId: 'user-1',
      windowMinutes: 30,
    });
    expect(count).toBe(42);

    const query = AuditLog.countDocuments.mock.calls[0][0];
    expect(query.userId).toBe('user-1');
    expect(query.eventType).toBe('data.read');
    expect(query.resource).toEqual({ $regex: '^hr:' });
    expect(query.createdAt.$gte).toBeInstanceOf(Date);
  });

  it('returns 0 and logs warning when countDocuments fails', async () => {
    const AuditLog = stubAuditModel({
      countImpl: async () => {
        throw new Error('index missing');
      },
    });
    const logger = stubLogger();
    const svc = createHrAccessAuditService({ auditLogModel: AuditLog, logger });

    expect(await svc.countRecentAccesses({ actorUserId: 'user-1' })).toBe(0);
    expect(logger.warn).toHaveBeenCalled();
  });
});

// ─── recentAccessesFor ──────────────────────────────────────────

describe('recentAccessesFor', () => {
  it('returns empty array when employeeId missing', async () => {
    const AuditLog = stubAuditModel();
    const svc = createHrAccessAuditService({ auditLogModel: AuditLog });
    expect(await svc.recentAccessesFor({})).toEqual([]);
    expect(AuditLog.find).not.toHaveBeenCalled();
  });

  it('builds a resource regex matching the employee id anywhere in the chain', async () => {
    const rows = [
      { resource: 'hr:employee:emp-abc:view', eventType: 'data.read' },
      { resource: 'hr:employee:emp-abc:export', eventType: 'data.exported' },
    ];
    const AuditLog = stubAuditModel({
      findImpl: () => ({
        sort() {
          return this;
        },
        limit() {
          return this;
        },
        async lean() {
          return rows;
        },
      }),
    });
    const svc = createHrAccessAuditService({ auditLogModel: AuditLog });

    const out = await svc.recentAccessesFor({
      employeeId: 'emp-abc',
      windowDays: 30,
      limit: 50,
    });
    expect(out).toEqual(rows);

    const query = AuditLog.find.mock.calls[0][0];
    expect(query.resource.$regex).toContain('emp-abc');
    expect(query.eventType.$in).toEqual(['data.read', 'data.exported']);
    expect(query.createdAt.$gte).toBeInstanceOf(Date);
  });

  it('returns [] and logs warning when find throws', async () => {
    const AuditLog = stubAuditModel({
      findImpl: () => {
        throw new Error('connection reset');
      },
    });
    const logger = stubLogger();
    const svc = createHrAccessAuditService({ auditLogModel: AuditLog, logger });

    expect(await svc.recentAccessesFor({ employeeId: 'emp-1' })).toEqual([]);
    expect(logger.warn).toHaveBeenCalled();
  });
});
