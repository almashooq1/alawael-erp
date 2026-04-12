/**
 * Unit Tests — ticketsAuditCalculations.service.js
 * Pure business logic — NO mocks needed
 */
'use strict';

const {
  TICKET_CONSTANTS,
  calculateTicketSLA,
  analyzeSLAPerformance,
  calculateTicketPriority,
  sortTicketsByUrgency,
  calculateTicketStatistics,
  analyzeAuditLogs,
  validateAuditEntry,
  applyAuditRetentionPolicy,
  identifyEscalationCandidates,
  analyzeResolutionTimes,
} = require('../../services/tickets/ticketsAuditCalculations.service');

// ═══════════════════════════════════════
//  TICKET_CONSTANTS
// ═══════════════════════════════════════
describe('TICKET_CONSTANTS', () => {
  it('exports expected keys', () => {
    expect(TICKET_CONSTANTS.PRIORITY.CRITICAL).toBe('critical');
    expect(TICKET_CONSTANTS.PRIORITY.LOW).toBe('low');
    expect(TICKET_CONSTANTS.STATUS.OPEN).toBe('open');
    expect(TICKET_CONSTANTS.SLA.FIRST_RESPONSE.critical).toBe(30);
    expect(TICKET_CONSTANTS.SLA.RESOLUTION.critical).toBe(240);
    expect(TICKET_CONSTANTS.RETENTION.AUDIT_LOGS_DAYS).toBe(365);
    expect(TICKET_CONSTANTS.RETENTION.SECURITY_LOGS_DAYS).toBe(730);
  });
});

// ═══════════════════════════════════════
//  calculateTicketSLA
// ═══════════════════════════════════════
describe('calculateTicketSLA', () => {
  it('returns unknown for null', () => {
    const r = calculateTicketSLA(null);
    expect(r.status).toBe('unknown');
    expect(r.isBreached).toBe(false);
  });

  it('returns on_track for fresh critical ticket', () => {
    const r = calculateTicketSLA({
      priority: 'critical',
      createdAt: new Date().toISOString(),
      status: 'open',
    });
    expect(r.status).toBe('on_track');
    expect(r.isBreached).toBe(false);
    expect(r.slaTargets.firstResponseMinutes).toBe(30);
    expect(r.slaTargets.resolutionMinutes).toBe(240);
  });

  it('detects breached SLA for old ticket', () => {
    const old = new Date();
    old.setDate(old.getDate() - 30);
    const r = calculateTicketSLA({
      priority: 'low',
      createdAt: old.toISOString(),
      status: 'open',
    });
    expect(r.isBreached).toBe(true);
    expect(r.status).toBe('breached');
  });

  it('marks first response as met when provided', () => {
    const now = new Date();
    const r = calculateTicketSLA({
      priority: 'medium',
      createdAt: now.toISOString(),
      firstResponseAt: new Date(now.getTime() + 5 * 60000).toISOString(),
      status: 'in_progress',
    });
    expect(r.firstResponse.met).toBe(true);
  });

  it('marks resolution as met when resolved', () => {
    const now = new Date();
    const r = calculateTicketSLA({
      priority: 'high',
      createdAt: now.toISOString(),
      resolvedAt: new Date(now.getTime() + 60 * 60000).toISOString(),
      status: 'resolved',
    });
    expect(r.resolution.met).toBe(true);
    expect(r.resolution.isBreached).toBe(false);
  });
});

// ═══════════════════════════════════════
//  analyzeSLAPerformance
// ═══════════════════════════════════════
describe('analyzeSLAPerformance', () => {
  it('returns 100% compliance for empty', () => {
    const r = analyzeSLAPerformance([]);
    expect(r.totalTickets).toBe(0);
    expect(r.slaCompliance).toBe(100);
  });

  it('computes compliance for mixed tickets', () => {
    const now = new Date();
    const old = new Date(now.getTime() - 60 * 24 * 60 * 60000); // 60 days ago
    const tickets = [
      { priority: 'high', createdAt: now.toISOString(), status: 'open' }, // on_track
      { priority: 'low', createdAt: old.toISOString(), status: 'open' }, // breached
    ];
    const r = analyzeSLAPerformance(tickets);
    expect(r.totalTickets).toBe(2);
    expect(r.breachedCount).toBe(1);
    expect(r.byPriority.high).toBeDefined();
    expect(r.byPriority.low).toBeDefined();
    expect(r.worstPriority).toBe('low');
  });
});

// ═══════════════════════════════════════
//  calculateTicketPriority
// ═══════════════════════════════════════
describe('calculateTicketPriority', () => {
  it('returns low for null', () => {
    const r = calculateTicketPriority(null);
    expect(r.priority).toBe('low');
    expect(r.score).toBe(0);
  });

  it('critical for system down + clinical + many affected', () => {
    const r = calculateTicketPriority({
      isSystemDown: true,
      category: 'clinical',
      affectedBeneficiaries: 100,
    });
    expect(r.priority).toBe('critical');
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.factors.isSystemDown).toBe(true);
  });

  it('high for data loss', () => {
    const r = calculateTicketPriority({ isDataLoss: true, category: 'technical' });
    // dataLoss=35 + technical=20 = 55 → high (>=45)
    expect(r.priority).toBe('high');
  });

  it('medium for moderate impact', () => {
    const r = calculateTicketPriority({ category: 'clinical', affectedBeneficiaries: 5 });
    // clinical=30 + affected>0=10 = 40 → medium (>=20)
    expect(r.priority).toBe('medium');
  });

  it('low for general category no impact', () => {
    const r = calculateTicketPriority({ category: 'general' });
    // general=5 → low (<20)
    expect(r.priority).toBe('low');
    expect(r.score).toBe(5);
  });
});

// ═══════════════════════════════════════
//  sortTicketsByUrgency
// ═══════════════════════════════════════
describe('sortTicketsByUrgency', () => {
  it('returns empty for empty', () => {
    expect(sortTicketsByUrgency([])).toEqual([]);
  });

  it('sorts SLA-breached tickets first', () => {
    const now = new Date();
    const old = new Date(now.getTime() - 60 * 24 * 60 * 60000);
    const tickets = [
      { id: 't1', priority: 'low', createdAt: now.toISOString(), status: 'open' },
      { id: 't2', priority: 'low', createdAt: old.toISOString(), status: 'open' }, // breached
    ];
    const sorted = sortTicketsByUrgency(tickets);
    expect(sorted[0].id).toBe('t2'); // breached first
  });

  it('sorts by priority within same SLA status', () => {
    const now = new Date();
    const tickets = [
      { id: 't1', priority: 'low', createdAt: now.toISOString(), status: 'open' },
      { id: 't2', priority: 'critical', createdAt: now.toISOString(), status: 'open' },
    ];
    const sorted = sortTicketsByUrgency(tickets);
    expect(sorted[0].priority).toBe('critical');
  });
});

// ═══════════════════════════════════════
//  calculateTicketStatistics
// ═══════════════════════════════════════
describe('calculateTicketStatistics', () => {
  it('returns zeros for empty', () => {
    const r = calculateTicketStatistics([]);
    expect(r.total).toBe(0);
  });

  it('computes comprehensive stats', () => {
    const now = new Date();
    const tickets = [
      { status: 'open', priority: 'high', category: 'technical', createdAt: now.toISOString() },
      {
        status: 'resolved',
        priority: 'medium',
        category: 'clinical',
        createdAt: new Date(now.getTime() - 120 * 60000).toISOString(),
        resolvedAt: now.toISOString(),
        firstResponseAt: new Date(now.getTime() - 100 * 60000).toISOString(),
      },
      {
        status: 'closed',
        priority: 'low',
        category: 'billing',
        createdAt: new Date(now.getTime() - 60 * 60000).toISOString(),
        resolvedAt: now.toISOString(),
      },
    ];
    const r = calculateTicketStatistics(tickets);
    expect(r.total).toBe(3);
    expect(r.open).toBe(1);
    expect(r.closed).toBe(2);
    expect(r.byStatus.open).toBe(1);
    expect(r.byPriority.high).toBe(1);
    expect(r.byCategory.technical).toBe(1);
    expect(r.averageResolutionTimeMinutes).toBeGreaterThan(0);
    expect(r.resolutionRate).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════
//  analyzeAuditLogs
// ═══════════════════════════════════════
describe('analyzeAuditLogs', () => {
  it('returns empty for no logs', () => {
    const r = analyzeAuditLogs([]);
    expect(r.total).toBe(0);
    expect(r.anomalies).toEqual([]);
  });

  it('detects off-hours activity', () => {
    // getHours() returns local time — use 01:00 UTC so local time is still <6 in most TZs
    const offHour = new Date();
    offHour.setHours(2, 0, 0, 0); // 2 AM local — clearly off-hours (h<6)
    const logs = [
      { userId: 'u1', action: 'login', timestamp: offHour.toISOString(), ipAddress: '1.1.1.1' },
    ];
    const r = analyzeAuditLogs(logs);
    expect(r.anomalies.some(a => a.type === 'off_hours_activity')).toBe(true);
  });

  it('detects mass deletion', () => {
    const logs = Array.from({ length: 12 }, (_, i) => ({
      userId: 'u1',
      action: `delete_record_${i}`,
      timestamp: '2025-06-01T10:00:00Z',
    }));
    const r = analyzeAuditLogs(logs);
    expect(r.anomalies.some(a => a.type === 'mass_deletion')).toBe(true);
    expect(r.securityAlerts.some(a => a.type === 'mass_deletion_alert')).toBe(true);
  });

  it('detects brute force attempts', () => {
    const logs = Array.from({ length: 6 }, () => ({
      userId: 'u1',
      action: 'login_failed',
      timestamp: '2025-06-01T10:00:00Z',
    }));
    const r = analyzeAuditLogs(logs);
    expect(r.anomalies.some(a => a.type === 'brute_force_attempt')).toBe(true);
    expect(r.securityAlerts.length).toBeGreaterThan(0);
  });

  it('returns top actions and users', () => {
    const logs = [
      { userId: 'u1', action: 'view', timestamp: '2025-06-01T10:00:00Z' },
      { userId: 'u1', action: 'view', timestamp: '2025-06-01T11:00:00Z' },
      { userId: 'u2', action: 'edit', timestamp: '2025-06-01T12:00:00Z' },
    ];
    const r = analyzeAuditLogs(logs);
    expect(r.topActions[0].action).toBe('view');
    expect(r.topUsers[0].userId).toBe('u1');
    expect(r.statistics.uniqueUsers).toBe(2);
  });
});

// ═══════════════════════════════════════
//  validateAuditEntry
// ═══════════════════════════════════════
describe('validateAuditEntry', () => {
  it('returns invalid for null', () => {
    const r = validateAuditEntry(null);
    expect(r.isValid).toBe(false);
    expect(r.errors).toContain('سجل التدقيق فارغ');
  });

  it('validates complete entry', () => {
    const r = validateAuditEntry({
      userId: 'u1',
      action: 'view',
      timestamp: new Date().toISOString(),
      resource: 'patients',
      ipAddress: '1.1.1.1',
      userAgent: 'Chrome',
    });
    expect(r.isValid).toBe(true);
    expect(r.errors).toHaveLength(0);
    expect(r.warnings).toHaveLength(0);
    expect(r.isSensitive).toBe(false);
    expect(r.level).toBe('info');
  });

  it('detects missing required fields', () => {
    const r = validateAuditEntry({ action: 'view' });
    expect(r.isValid).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });

  it('marks sensitive actions', () => {
    const r = validateAuditEntry({
      userId: 'u1',
      action: 'delete_user',
      timestamp: new Date().toISOString(),
    });
    expect(r.isSensitive).toBe(true);
    expect(r.level).toBe('security');
  });

  it('warns for future timestamp', () => {
    const future = new Date(Date.now() + 86400000);
    const r = validateAuditEntry({
      userId: 'u1',
      action: 'view',
      timestamp: future.toISOString(),
    });
    expect(r.isValid).toBe(true);
    expect(r.warnings.some(w => w.includes('المستقبل'))).toBe(true);
  });

  it('warns for missing optional fields', () => {
    const r = validateAuditEntry({
      userId: 'u1',
      action: 'view',
      timestamp: new Date().toISOString(),
    });
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════
//  applyAuditRetentionPolicy
// ═══════════════════════════════════════
describe('applyAuditRetentionPolicy', () => {
  it('returns empty for no logs', () => {
    const r = applyAuditRetentionPolicy([]);
    expect(r.toDelete).toEqual([]);
    expect(r.toKeep).toEqual([]);
  });

  it('keeps recent logs', () => {
    const r = applyAuditRetentionPolicy([{ timestamp: new Date().toISOString(), level: 'info' }]);
    expect(r.toKeep).toHaveLength(1);
    expect(r.toDelete).toHaveLength(0);
  });

  it('deletes old normal logs past 365 days', () => {
    const old = new Date();
    old.setDate(old.getDate() - 400);
    const r = applyAuditRetentionPolicy([{ timestamp: old.toISOString(), level: 'info' }]);
    expect(r.toDelete).toHaveLength(1);
    expect(r.toDelete[0].reason).toBe('audit_log_expired');
  });

  it('keeps security logs up to 730 days', () => {
    const within = new Date();
    within.setDate(within.getDate() - 700);
    const r = applyAuditRetentionPolicy([{ timestamp: within.toISOString(), level: 'security' }]);
    expect(r.toKeep).toHaveLength(1);
  });

  it('deletes security logs past 730 days', () => {
    const old = new Date();
    old.setDate(old.getDate() - 800);
    const r = applyAuditRetentionPolicy([{ timestamp: old.toISOString(), level: 'security' }]);
    expect(r.toDelete).toHaveLength(1);
    expect(r.toDelete[0].reason).toBe('security_log_expired');
  });

  it('provides summary with deletion rate', () => {
    const old = new Date();
    old.setDate(old.getDate() - 400);
    const r = applyAuditRetentionPolicy([
      { timestamp: old.toISOString(), level: 'info' },
      { timestamp: new Date().toISOString(), level: 'info' },
    ]);
    expect(r.summary.total).toBe(2);
    expect(r.summary.deleted).toBe(1);
    expect(r.summary.kept).toBe(1);
    expect(r.summary.deletionRate).toBe(50);
  });
});

// ═══════════════════════════════════════
//  identifyEscalationCandidates
// ═══════════════════════════════════════
describe('identifyEscalationCandidates', () => {
  it('returns empty for empty', () => {
    expect(identifyEscalationCandidates([])).toEqual([]);
  });

  it('flags SLA-breached tickets', () => {
    const old = new Date();
    old.setDate(old.getDate() - 30);
    const r = identifyEscalationCandidates([
      { id: 't1', priority: 'high', createdAt: old.toISOString(), status: 'open' },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].escalationReasons.some(r => r.reason === 'sla_breached')).toBe(true);
  });

  it('flags critical unassigned > 60 min', () => {
    const old = new Date(Date.now() - 90 * 60000);
    const r = identifyEscalationCandidates([
      { id: 't1', priority: 'critical', createdAt: old.toISOString(), status: 'open' },
    ]);
    expect(r[0].escalationReasons.some(r => r.reason === 'critical_unassigned')).toBe(true);
    expect(r[0].highestSeverity).toBe('critical');
  });

  it('flags repeated reopening', () => {
    const r = identifyEscalationCandidates([
      {
        id: 't1',
        priority: 'low',
        createdAt: new Date().toISOString(),
        status: 'open',
        reopenCount: 3,
      },
    ]);
    expect(r[0].escalationReasons.some(r => r.reason === 'repeated_reopening')).toBe(true);
  });

  it('sorts critical severity first', () => {
    const old = new Date();
    old.setDate(old.getDate() - 30);
    const r = identifyEscalationCandidates([
      {
        id: 't1',
        priority: 'low',
        createdAt: new Date().toISOString(),
        status: 'open',
        reopenCount: 2,
      }, // warning
      { id: 't2', priority: 'high', createdAt: old.toISOString(), status: 'open' }, // critical (breached)
    ]);
    expect(r[0].highestSeverity).toBe('critical');
  });
});

// ═══════════════════════════════════════
//  analyzeResolutionTimes
// ═══════════════════════════════════════
describe('analyzeResolutionTimes', () => {
  it('returns zeros for empty', () => {
    const r = analyzeResolutionTimes([]);
    expect(r.average).toBe(0);
    expect(r.median).toBe(0);
  });

  it('computes statistics for resolved tickets', () => {
    const now = new Date();
    const tickets = [
      {
        priority: 'high',
        createdAt: new Date(now.getTime() - 120 * 60000).toISOString(),
        resolvedAt: now.toISOString(),
      },
      {
        priority: 'high',
        createdAt: new Date(now.getTime() - 60 * 60000).toISOString(),
        resolvedAt: now.toISOString(),
      },
      {
        priority: 'low',
        createdAt: new Date(now.getTime() - 180 * 60000).toISOString(),
        resolvedAt: now.toISOString(),
      },
    ];
    const r = analyzeResolutionTimes(tickets);
    expect(r.total).toBe(3);
    expect(r.averageMinutes).toBe(120); // (120+60+180)/3
    expect(r.minMinutes).toBe(60);
    expect(r.maxMinutes).toBe(180);
    expect(r.byPriority.high.count).toBe(2);
    expect(r.byPriority.high.averageMinutes).toBe(90); // (120+60)/2
    expect(r.byPriority.low.count).toBe(1);
  });

  it('handles tickets missing resolvedAt', () => {
    const r = analyzeResolutionTimes([{ priority: 'high', createdAt: new Date().toISOString() }]);
    expect(r.average).toBe(0);
  });
});
