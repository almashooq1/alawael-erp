/**
 * Unit Tests — documentAuditService.js
 * In-memory singleton (EventEmitter) — NO DB mocks needed
 */
'use strict';

const auditService = require('../../services/documentAuditService');
const { AUDIT_EVENTS } = auditService;

// Reset in-memory state between tests
beforeEach(() => {
  auditService.auditLog = [];
  auditService.lastHash = null;
  auditService.removeAllListeners();
});

// ═══════════════════════════════════════
//  AUDIT_EVENTS
// ═══════════════════════════════════════
describe('AUDIT_EVENTS', () => {
  it('has all expected event types', () => {
    expect(AUDIT_EVENTS.CREATED).toBe('document.created');
    expect(AUDIT_EVENTS.VIEWED).toBe('document.viewed');
    expect(AUDIT_EVENTS.DELETED).toBe('document.deleted');
    expect(AUDIT_EVENTS.SHARED).toBe('document.shared');
    expect(AUDIT_EVENTS.ACCESS_DENIED).toBe('document.access_denied');
    expect(AUDIT_EVENTS.SIGNED).toBe('document.signed');
    expect(AUDIT_EVENTS.BULK_OPERATION).toBe('document.bulk_operation');
    expect(AUDIT_EVENTS.LOCKED).toBe('document.locked');
  });
});

// ═══════════════════════════════════════
//  logEvent
// ═══════════════════════════════════════
describe('logEvent', () => {
  it('creates an audit entry', async () => {
    const r = await auditService.logEvent({
      eventType: AUDIT_EVENTS.CREATED,
      documentId: 'doc1',
      documentTitle: 'Test Doc',
      userId: 'user1',
      userName: 'أحمد',
    });
    expect(r.success).toBe(true);
    expect(r.data.eventType).toBe('document.created');
    expect(r.data.documentId).toBe('doc1');
    expect(r.data.hash).toBeTruthy();
    expect(r.data.timestamp).toBeDefined();
  });

  it('builds hash chain (genesis + subsequent)', async () => {
    await auditService.logEvent({
      eventType: AUDIT_EVENTS.CREATED,
      documentId: 'd1',
      userId: 'u1',
    });
    await auditService.logEvent({ eventType: AUDIT_EVENTS.VIEWED, documentId: 'd1', userId: 'u1' });
    expect(auditService.auditLog[0].previousHash).toBe('GENESIS');
    expect(auditService.auditLog[1].previousHash).toBe(auditService.auditLog[0].hash);
  });

  it('emits auditEvent', async () => {
    const spy = jest.fn();
    auditService.on('auditEvent', spy);
    await auditService.logEvent({
      eventType: AUDIT_EVENTS.CREATED,
      documentId: 'd1',
      userId: 'u1',
    });
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('sets default userName and fields', async () => {
    const r = await auditService.logEvent({
      eventType: AUDIT_EVENTS.VIEWED,
      documentId: 'd1',
      userId: 'u1',
    });
    expect(r.data.userName).toBe('مستخدم غير معروف');
    expect(r.data.ipAddress).toBe('unknown');
    expect(r.data.userAgent).toBe('unknown');
  });
});

// ═══════════════════════════════════════
//  _getEventSeverity
// ═══════════════════════════════════════
describe('_getEventSeverity', () => {
  it('critical for delete/access_denied/permission', () => {
    expect(auditService._getEventSeverity('document.deleted')).toBe('critical');
    expect(auditService._getEventSeverity('document.access_denied')).toBe('critical');
    expect(auditService._getEventSeverity('document.permission_changed')).toBe('critical');
  });

  it('high for share/sign/export', () => {
    expect(auditService._getEventSeverity('document.shared')).toBe('high');
    expect(auditService._getEventSeverity('document.signed')).toBe('high');
    expect(auditService._getEventSeverity('document.exported')).toBe('high');
  });

  it('medium for update/approve/reject', () => {
    expect(auditService._getEventSeverity('document.updated')).toBe('medium');
    expect(auditService._getEventSeverity('document.approved')).toBe('medium');
  });

  it('low for view/download', () => {
    expect(auditService._getEventSeverity('document.viewed')).toBe('low');
    expect(auditService._getEventSeverity('document.downloaded')).toBe('low');
  });
});

// ═══════════════════════════════════════
//  _getEventCategory
// ═══════════════════════════════════════
describe('_getEventCategory', () => {
  it('security for permission/shared/access', () => {
    expect(auditService._getEventCategory('document.permission_changed')).toBe('security');
    expect(auditService._getEventCategory('document.shared')).toBe('security');
    expect(auditService._getEventCategory('document.access_denied')).toBe('security');
  });

  it('modification for version/updated', () => {
    expect(auditService._getEventCategory('document.updated')).toBe('modification');
    expect(auditService._getEventCategory('document.version_created')).toBe('modification');
  });

  it('access for viewed/downloaded', () => {
    expect(auditService._getEventCategory('document.viewed')).toBe('access');
    expect(auditService._getEventCategory('document.downloaded')).toBe('access');
  });

  it('workflow for approved/rejected/signed', () => {
    expect(auditService._getEventCategory('document.approved')).toBe('workflow');
    expect(auditService._getEventCategory('document.signed')).toBe('workflow');
  });

  it('general for unknown', () => {
    expect(auditService._getEventCategory('document.created')).toBe('general');
  });
});

// ═══════════════════════════════════════
//  suspicious activity detection
// ═══════════════════════════════════════
describe('_checkSuspiciousActivity', () => {
  it('emits excessive_downloads alert', async () => {
    const spy = jest.fn();
    auditService.on('suspiciousActivity', spy);
    for (let i = 0; i < 22; i++) {
      await auditService.logEvent({
        eventType: AUDIT_EVENTS.DOWNLOADED,
        documentId: `d${i}`,
        userId: 'suspicious_user',
      });
    }
    const downloads = spy.mock.calls.filter(c => c[0].type === 'excessive_downloads');
    expect(downloads.length).toBeGreaterThan(0);
  });

  it('emits repeated_access_denied', async () => {
    const spy = jest.fn();
    auditService.on('suspiciousActivity', spy);
    for (let i = 0; i < 7; i++) {
      await auditService.logEvent({
        eventType: AUDIT_EVENTS.ACCESS_DENIED,
        documentId: 'd1',
        userId: 'blocked_user',
      });
    }
    const denials = spy.mock.calls.filter(c => c[0].type === 'repeated_access_denied');
    expect(denials.length).toBeGreaterThan(0);
  });

  it('emits mass_deletion', async () => {
    const spy = jest.fn();
    auditService.on('suspiciousActivity', spy);
    for (let i = 0; i < 12; i++) {
      await auditService.logEvent({
        eventType: AUDIT_EVENTS.DELETED,
        documentId: `d${i}`,
        userId: 'deleter',
      });
    }
    const deletions = spy.mock.calls.filter(c => c[0].type === 'mass_deletion');
    expect(deletions.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════
//  getAuditLog
// ═══════════════════════════════════════
describe('getAuditLog', () => {
  beforeEach(async () => {
    await auditService.logEvent({
      eventType: AUDIT_EVENTS.CREATED,
      documentId: 'd1',
      userId: 'u1',
      userName: 'أحمد',
    });
    await auditService.logEvent({
      eventType: AUDIT_EVENTS.VIEWED,
      documentId: 'd1',
      userId: 'u2',
      userName: 'سارة',
    });
    await auditService.logEvent({
      eventType: AUDIT_EVENTS.DELETED,
      documentId: 'd2',
      userId: 'u1',
      userName: 'أحمد',
    });
  });

  it('returns all logs', async () => {
    const r = await auditService.getAuditLog();
    expect(r.success).toBe(true);
    expect(r.total).toBe(3);
    expect(r.data.length).toBe(3);
  });

  it('filters by documentId', async () => {
    const r = await auditService.getAuditLog({ documentId: 'd1' });
    expect(r.total).toBe(2);
  });

  it('filters by userId', async () => {
    const r = await auditService.getAuditLog({ userId: 'u1' });
    expect(r.total).toBe(2);
  });

  it('filters by eventType', async () => {
    const r = await auditService.getAuditLog({ eventType: AUDIT_EVENTS.DELETED });
    expect(r.total).toBe(1);
  });

  it('filters by severity', async () => {
    const r = await auditService.getAuditLog({ severity: 'critical' });
    expect(r.total).toBe(1); // only delete is critical
  });

  it('filters by search', async () => {
    const r = await auditService.getAuditLog({ search: 'أحمد' });
    expect(r.total).toBe(2);
  });

  it('paginates', async () => {
    const r = await auditService.getAuditLog({ page: 1, limit: 2 });
    expect(r.data.length).toBe(2);
    expect(r.pages).toBe(2);
  });
});

// ═══════════════════════════════════════
//  getDocumentAuditTrail
// ═══════════════════════════════════════
describe('getDocumentAuditTrail', () => {
  it('returns trail with summary', async () => {
    await auditService.logEvent({
      eventType: AUDIT_EVENTS.CREATED,
      documentId: 'd1',
      userId: 'u1',
    });
    await auditService.logEvent({ eventType: AUDIT_EVENTS.VIEWED, documentId: 'd1', userId: 'u2' });
    const r = await auditService.getDocumentAuditTrail('d1');
    expect(r.success).toBe(true);
    expect(r.total).toBe(2);
    expect(r.summary.uniqueUsers).toBe(2);
    expect(r.summary.eventTypes).toContain(AUDIT_EVENTS.CREATED);
    expect(r.summary.firstEvent).toBeTruthy();
    expect(r.summary.lastEvent).toBeTruthy();
  });

  it('empty for unknown document', async () => {
    const r = await auditService.getDocumentAuditTrail('nonexistent');
    expect(r.total).toBe(0);
    expect(r.summary.totalEvents).toBe(0);
  });
});

// ═══════════════════════════════════════
//  getUserActivityReport
// ═══════════════════════════════════════
describe('getUserActivityReport', () => {
  it('returns user activity summary', async () => {
    await auditService.logEvent({
      eventType: AUDIT_EVENTS.CREATED,
      documentId: 'd1',
      userId: 'u1',
    });
    await auditService.logEvent({ eventType: AUDIT_EVENTS.VIEWED, documentId: 'd2', userId: 'u1' });
    const r = await auditService.getUserActivityReport('u1');
    expect(r.success).toBe(true);
    expect(r.data.totalActions).toBe(2);
    expect(Object.keys(r.data.eventCounts).length).toBe(2);
    expect(Object.keys(r.data.dailyActivity).length).toBeGreaterThan(0);
    expect(r.data.recentActions.length).toBe(2);
  });
});

// ═══════════════════════════════════════
//  generateComplianceReport
// ═══════════════════════════════════════
describe('generateComplianceReport', () => {
  it('returns compliance summary', async () => {
    await auditService.logEvent({
      eventType: AUDIT_EVENTS.DELETED,
      documentId: 'd1',
      userId: 'u1',
    });
    await auditService.logEvent({
      eventType: AUDIT_EVENTS.ACCESS_DENIED,
      documentId: 'd2',
      userId: 'u1',
    });
    const r = await auditService.generateComplianceReport();
    expect(r.success).toBe(true);
    expect(r.data.summary.totalEvents).toBe(2);
    expect(r.data.summary.criticalEvents).toBe(2);
    expect(r.data.riskAssessment.level).toBeTruthy();
    expect(r.data.chainIntegrity).toBeDefined();
  });

  it('low risk with no events', async () => {
    const r = await auditService.generateComplianceReport();
    expect(r.data.riskAssessment.level).toBe('منخفض');
  });
});

// ═══════════════════════════════════════
//  verifyChainIntegrity
// ═══════════════════════════════════════
describe('verifyChainIntegrity', () => {
  it('valid for empty log', () => {
    const r = auditService.verifyChainIntegrity();
    expect(r.valid).toBe(true);
    expect(r.entries).toBe(0);
  });

  it('valid for proper chain', async () => {
    await auditService.logEvent({
      eventType: AUDIT_EVENTS.CREATED,
      documentId: 'd1',
      userId: 'u1',
    });
    await auditService.logEvent({ eventType: AUDIT_EVENTS.VIEWED, documentId: 'd1', userId: 'u1' });
    await auditService.logEvent({
      eventType: AUDIT_EVENTS.UPDATED,
      documentId: 'd1',
      userId: 'u1',
    });
    const r = auditService.verifyChainIntegrity();
    expect(r.valid).toBe(true);
    expect(r.entries).toBe(3);
    expect(r.message).toContain('سليمة');
  });

  it('detects tampered entry', async () => {
    await auditService.logEvent({
      eventType: AUDIT_EVENTS.CREATED,
      documentId: 'd1',
      userId: 'u1',
    });
    await auditService.logEvent({ eventType: AUDIT_EVENTS.VIEWED, documentId: 'd1', userId: 'u1' });
    // Tamper with hash
    auditService.auditLog[0].hash = 'tampered_hash';
    const r = auditService.verifyChainIntegrity();
    expect(r.valid).toBe(false);
    expect(r.brokenAt).toBe(1);
    expect(r.message).toContain('تلاعب');
  });
});

// ═══════════════════════════════════════
//  exportAuditLog
// ═══════════════════════════════════════
describe('exportAuditLog', () => {
  beforeEach(async () => {
    await auditService.logEvent({
      eventType: AUDIT_EVENTS.CREATED,
      documentId: 'd1',
      userId: 'u1',
      documentTitle: 'Doc 1',
      userName: 'أحمد',
    });
  });

  it('exports JSON by default', async () => {
    const r = await auditService.exportAuditLog();
    expect(r.success).toBe(true);
    expect(r.format).toBe('json');
    expect(r.mimeType).toBe('application/json');
    const parsed = JSON.parse(r.data);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('exports CSV', async () => {
    const r = await auditService.exportAuditLog('csv');
    expect(r.success).toBe(true);
    expect(r.format).toBe('csv');
    expect(r.mimeType).toBe('text/csv');
    expect(r.data).toContain('التاريخ');
    expect(r.data).toContain('أحمد');
  });
});

// ═══════════════════════════════════════
//  getStatistics
// ═══════════════════════════════════════
describe('getStatistics', () => {
  it('returns stats for empty log', async () => {
    const r = await auditService.getStatistics();
    expect(r.success).toBe(true);
    expect(r.data.totalEvents).toBe(0);
    expect(r.data.averagePerDay).toBe(0);
  });

  it('computes breakdowns', async () => {
    await auditService.logEvent({
      eventType: AUDIT_EVENTS.CREATED,
      documentId: 'd1',
      userId: 'u1',
    });
    await auditService.logEvent({
      eventType: AUDIT_EVENTS.DELETED,
      documentId: 'd2',
      userId: 'u1',
    });
    const r = await auditService.getStatistics();
    expect(r.data.totalEvents).toBe(2);
    expect(r.data.byEventType[AUDIT_EVENTS.CREATED]).toBe(1);
    expect(r.data.byEventType[AUDIT_EVENTS.DELETED]).toBe(1);
    expect(r.data.bySeverity.critical).toBe(1);
    expect(r.data.bySeverity.low).toBe(1);
  });
});
