/**
 * Unit tests for rbac-auditing.service.js
 * Class export (not singleton), in-memory arrays/Maps, logger
 * Cleanup timer is skipped in test env (process.env.JEST_WORKER_ID)
 */

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
}));

const RBACAuditingService = require('../../services/rbac-auditing.service');

let svc;
beforeEach(() => {
  svc = new RBACAuditingService({ alertingEnabled: true });
});

afterEach(() => {
  svc.stopCleanupTimer();
});

/* ── helper ── */
function logEvent(overrides = {}) {
  return svc.logAuditEvent({
    eventType: 'ACCESS',
    userId: 'user-1',
    actor: 'user-1',
    action: 'READ',
    resource: 'beneficiaries',
    status: 'success',
    ...overrides,
  });
}

describe('RBACAuditingService', () => {
  /* ═══════════════════════════════════════════════════
   * 1. logAuditEvent
   * ═══════════════════════════════════════════════════ */
  describe('logAuditEvent', () => {
    it('adds event to audit log', () => {
      const entry = logEvent();
      expect(entry.id).toBeDefined();
      expect(entry.eventType).toBe('ACCESS');
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect(svc.auditLog).toHaveLength(1);
    });

    it('assigns severity based on event type', () => {
      const entry = logEvent({ eventType: 'ROLE_DELETED' });
      expect(entry.severity).toBe('critical');
    });

    it('enforces maxLogSize', () => {
      svc.config.maxLogSize = 5;
      for (let i = 0; i < 10; i++) logEvent();
      expect(svc.auditLog.length).toBeLessThanOrEqual(5);
    });

    it('detects brute force when 5+ failures in 1 hour', () => {
      for (let i = 0; i < 6; i++) {
        logEvent({ status: 'failure', action: 'LOGIN' });
      }
      const bruteForce = svc.securityIncidents.find(i => i.type === 'BRUTE_FORCE_ATTEMPT');
      expect(bruteForce).toBeDefined();
      expect(bruteForce.severity).toBe('high');
    });

    it('detects sensitive operations', () => {
      logEvent({ eventType: 'ROLE_DELETED' });
      const sensitive = svc.securityIncidents.find(i => i.type === 'SENSITIVE_OPERATION');
      expect(sensitive).toBeDefined();
    });
  });

  /* ═══════════════════════════════════════════════════
   * 2. queryAuditLog
   * ═══════════════════════════════════════════════════ */
  describe('queryAuditLog', () => {
    beforeEach(() => {
      logEvent({ eventType: 'ACCESS', userId: 'u1', action: 'READ', status: 'success' });
      logEvent({ eventType: 'ROLE_CREATED', userId: 'u2', action: 'CREATE', status: 'success' });
      logEvent({ eventType: 'ACCESS', userId: 'u1', action: 'WRITE', status: 'failure' });
    });

    it('returns all logs when no filters', () => {
      const result = svc.queryAuditLog();
      expect(result.total).toBe(3);
      expect(result.returned).toBe(3);
    });

    it('filters by eventType', () => {
      const result = svc.queryAuditLog({ eventType: 'ACCESS' });
      expect(result.returned).toBe(2);
    });

    it('filters by userId', () => {
      const result = svc.queryAuditLog({ userId: 'u2' });
      expect(result.returned).toBe(1);
    });

    it('filters by action', () => {
      const result = svc.queryAuditLog({ action: 'READ' });
      expect(result.returned).toBe(1);
    });

    it('filters by status', () => {
      const result = svc.queryAuditLog({ status: 'failure' });
      expect(result.returned).toBe(1);
    });

    it('supports text search', () => {
      const result = svc.queryAuditLog({ search: 'beneficiaries' });
      expect(result.returned).toBe(3);
    });

    it('supports limit', () => {
      const result = svc.queryAuditLog({ limit: 1 });
      expect(result.returned).toBe(1);
    });

    it('filters by eventType array', () => {
      const result = svc.queryAuditLog({ eventType: ['ACCESS', 'ROLE_CREATED'] });
      expect(result.returned).toBe(3);
    });

    it('filters by severity', () => {
      logEvent({ eventType: 'UNAUTHORIZED_ACCESS', severity: 'high' });
      const result = svc.queryAuditLog({ severity: 'high' });
      expect(result.returned).toBeGreaterThanOrEqual(1);
    });
  });

  /* ═══════════════════════════════════════════════════
   * 3. reportSecurityIncident / getSecurityIncidents
   * ═══════════════════════════════════════════════════ */
  describe('reportSecurityIncident / getSecurityIncidents', () => {
    it('creates incident with id and status', () => {
      const inc = svc.reportSecurityIncident({
        type: 'UNAUTHORIZED_ACCESS',
        severity: 'high',
        userId: 'u1',
      });
      expect(inc.id).toBeDefined();
      expect(inc.status).toBe('open');
      expect(inc.reportedAt).toBeInstanceOf(Date);
    });

    it('filters incidents by status', () => {
      svc.reportSecurityIncident({ type: 'X', severity: 'low', status: 'open' });
      svc.reportSecurityIncident({ type: 'Y', severity: 'high', status: 'open' });
      const open = svc.getSecurityIncidents({ status: 'open' });
      expect(open.length).toBe(2);
    });

    it('filters incidents by severity', () => {
      svc.reportSecurityIncident({ type: 'X', severity: 'low' });
      svc.reportSecurityIncident({ type: 'Y', severity: 'high' });
      const high = svc.getSecurityIncidents({ severity: 'high' });
      expect(high.length).toBe(1);
    });

    it('filters incidents by type', () => {
      svc.reportSecurityIncident({ type: 'BRUTE_FORCE', severity: 'high' });
      svc.reportSecurityIncident({ type: 'OTHER', severity: 'low' });
      const bf = svc.getSecurityIncidents({ type: 'BRUTE_FORCE' });
      expect(bf.length).toBe(1);
    });
  });

  /* ═══════════════════════════════════════════════════
   * 4. generateAuditReport
   * ═══════════════════════════════════════════════════ */
  describe('generateAuditReport', () => {
    it('generates report with summary and distribution', () => {
      logEvent({ status: 'success', eventType: 'ACCESS' });
      logEvent({ status: 'failure', eventType: 'ACCESS' });
      logEvent({ eventType: 'ROLE_CREATED' });

      const report = svc.generateAuditReport();
      expect(report.id).toBeDefined();
      expect(report.summary.totalEvents).toBe(3);
      expect(report.summary.successfulActions).toBe(2);
      expect(report.summary.failedActions).toBe(1);
      expect(report.eventDistribution).toBeDefined();
      expect(report.userActivity).toBeDefined();
      expect(report.changesSummary).toBeDefined();
    });

    it('stores report in complianceReports', () => {
      svc.generateAuditReport();
      expect(svc.complianceReports).toHaveLength(1);
    });

    it('respects custom date range', () => {
      const now = new Date();
      logEvent();
      const report = svc.generateAuditReport({
        startDate: new Date(now.getTime() - 1000),
        endDate: new Date(now.getTime() + 1000),
      });
      expect(report.summary.totalEvents).toBeGreaterThanOrEqual(1);
    });
  });

  /* ═══════════════════════════════════════════════════
   * 5. generateComplianceReport
   * ═══════════════════════════════════════════════════ */
  describe('generateComplianceReport', () => {
    it('returns compliance checks and certifications', () => {
      const report = svc.generateComplianceReport();
      expect(report.checks.auditLoggingEnabled).toBe(true);
      expect(report.certifications.SOC2).toBe('compliant');
      expect(report.certifications.HIPAA).toBe('partial');
      expect(report.riskAssessment).toBeDefined();
    });
  });

  /* ═══════════════════════════════════════════════════
   * 6. Pattern Analysis
   * ═══════════════════════════════════════════════════ */
  describe('recordNormalPattern / _isNormalAccessPattern', () => {
    it('records access pattern', () => {
      svc.recordNormalPattern('u1', 'READ');
      const key = 'u1:READ';
      expect(svc.accessPatterns.has(key)).toBe(true);
      expect(svc.accessPatterns.get(key).occurrences).toBe(1);
    });

    it('increments pattern occurrences', () => {
      svc.recordNormalPattern('u1', 'READ');
      svc.recordNormalPattern('u1', 'READ');
      expect(svc.accessPatterns.get('u1:READ').occurrences).toBe(2);
    });

    it('records location and device', () => {
      svc.recordNormalPattern('u1', 'READ', { location: 'office', device: 'desktop' });
      const p = svc.accessPatterns.get('u1:READ');
      expect(p.locations).toContain('office');
      expect(p.devices).toContain('desktop');
    });

    it('_isNormalAccessPattern returns true for unknown patterns', () => {
      expect(svc._isNormalAccessPattern({ userId: 'unknown', action: 'X' })).toBe(true);
    });

    it('limits pattern arrays to 100 entries', () => {
      for (let i = 0; i < 110; i++) {
        svc.recordNormalPattern('u1', 'READ');
      }
      const p = svc.accessPatterns.get('u1:READ');
      expect(p.times.length).toBeLessThanOrEqual(100);
    });
  });

  /* ═══════════════════════════════════════════════════
   * 7. exportAuditLogs
   * ═══════════════════════════════════════════════════ */
  describe('exportAuditLogs', () => {
    it('exports as JSON by default', () => {
      logEvent();
      const result = svc.exportAuditLogs();
      expect(result.exportDate).toBeInstanceOf(Date);
      expect(result.totalRecords).toBe(1);
      expect(result.data).toHaveLength(1);
    });

    it('exports as CSV', () => {
      logEvent();
      const csv = svc.exportAuditLogs('csv');
      expect(typeof csv).toBe('string');
      expect(csv).toContain('Timestamp');
      expect(csv).toContain('EventType');
    });
  });

  /* ═══════════════════════════════════════════════════
   * 8. getSecuritySummary
   * ═══════════════════════════════════════════════════ */
  describe('getSecuritySummary', () => {
    it('returns summary with time-based breakdowns', () => {
      logEvent({ status: 'failure' });
      logEvent({ status: 'success' });
      svc.reportSecurityIncident({ type: 'X', severity: 'high' });

      const summary = svc.getSecuritySummary();
      expect(summary.last7Days.totalEvents).toBe(2);
      expect(summary.last7Days.failures).toBe(1);
      expect(summary.last30Days.totalEvents).toBe(2);
      expect(summary.activeIncidents).toBeGreaterThanOrEqual(1);
    });
  });

  /* ═══════════════════════════════════════════════════
   * 9. getUserAccessHistory
   * ═══════════════════════════════════════════════════ */
  describe('getUserAccessHistory', () => {
    it('returns mapped history for user', () => {
      logEvent({ userId: 'u1', action: 'READ' });
      logEvent({ userId: 'u1', action: 'WRITE' });
      logEvent({ userId: 'u2', action: 'DELETE' });

      const history = svc.getUserAccessHistory('u1', 50);
      expect(history).toHaveLength(2);
      expect(history[0]).toHaveProperty('action');
      expect(history[0]).toHaveProperty('ipAddress');
      expect(history[0]).toHaveProperty('severity');
    });

    it('respects limit', () => {
      for (let i = 0; i < 10; i++) logEvent({ userId: 'u1' });
      const history = svc.getUserAccessHistory('u1', 3);
      expect(history).toHaveLength(3);
    });
  });

  /* ═══════════════════════════════════════════════════
   * 10. Private helpers
   * ═══════════════════════════════════════════════════ */
  describe('private helpers', () => {
    it('_calculateSeverity returns correct levels', () => {
      expect(svc._calculateSeverity('ROLE_DELETED')).toBe('critical');
      expect(svc._calculateSeverity('PERMISSION_REVOKED')).toBe('high');
      expect(svc._calculateSeverity('UNAUTHORIZED_ACCESS')).toBe('high');
      expect(svc._calculateSeverity('ROLE_CREATED')).toBe('medium');
      expect(svc._calculateSeverity('PERMISSION_ASSIGNED')).toBe('low');
      expect(svc._calculateSeverity('UNKNOWN')).toBe('low');
    });

    it('_generateId returns unique strings', () => {
      const id1 = svc._generateId();
      const id2 = svc._generateId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^audit_/);
    });

    it('_calculateEventDistribution groups by eventType', () => {
      const dist = svc._calculateEventDistribution([
        { eventType: 'A' },
        { eventType: 'A' },
        { eventType: 'B' },
      ]);
      expect(dist.A).toBe(2);
      expect(dist.B).toBe(1);
    });

    it('_calculateUserActivity groups by userId', () => {
      const act = svc._calculateUserActivity([
        { userId: 'u1', status: 'success', action: 'READ' },
        { userId: 'u1', status: 'failure', action: 'WRITE' },
        { userId: 'u2', status: 'success', action: 'READ' },
      ]);
      expect(act.u1.totalActions).toBe(2);
      expect(act.u1.successfulActions).toBe(1);
      expect(act.u1.failedActions).toBe(1);
    });

    it('_calculateResourceActivity groups by resource', () => {
      const act = svc._calculateResourceActivity([
        { resource: 'roles', action: 'READ', userId: 'u1' },
        { resource: 'roles', action: 'DELETE', userId: 'u2' },
      ]);
      expect(act.roles.accesses).toBe(2);
      expect(act.roles.deletions).toBe(1);
      expect(act.roles.users).toContain('u1');
    });
  });

  /* ═══════════════════════════════════════════════════
   * 11. Cleanup timer
   * ═══════════════════════════════════════════════════ */
  describe('stopCleanupTimer', () => {
    it('stops cleanup timer', () => {
      const s = new RBACAuditingService();
      s.stopCleanupTimer();
      expect(s._cleanupTimer).toBeNull();
    });
  });
});
