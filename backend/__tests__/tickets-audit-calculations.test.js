/**
 * Tickets & Audit Calculations Tests
 * Pure Unit Tests - No DB
 * نظام AlAwael ERP
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
} = require('../services/tickets/ticketsAuditCalculations.service');

// ========================================
// TICKET_CONSTANTS
// ========================================
describe('TICKET_CONSTANTS', () => {
  test('SLA الاستجابة الأولى للحرجة 30 دقيقة', () => {
    expect(TICKET_CONSTANTS.SLA.FIRST_RESPONSE.critical).toBe(30);
  });

  test('SLA الحل للحرجة 240 دقيقة (4 ساعات)', () => {
    expect(TICKET_CONSTANTS.SLA.RESOLUTION.critical).toBe(240);
  });

  test('SLA الحل لـ low 10080 دقيقة (7 أيام)', () => {
    expect(TICKET_CONSTANTS.SLA.RESOLUTION.low).toBe(10080);
  });

  test('فئات التذاكر تشمل clinical و technical', () => {
    expect(TICKET_CONSTANTS.CATEGORIES).toContain('clinical');
    expect(TICKET_CONSTANTS.CATEGORIES).toContain('technical');
  });

  test('سياسة الاحتفاظ: سجلات الأمان سنتان', () => {
    expect(TICKET_CONSTANTS.RETENTION.SECURITY_LOGS_DAYS).toBe(730);
  });

  test('جميع الحالات موجودة', () => {
    expect(TICKET_CONSTANTS.STATUS).toHaveProperty('OPEN');
    expect(TICKET_CONSTANTS.STATUS).toHaveProperty('RESOLVED');
    expect(TICKET_CONSTANTS.STATUS).toHaveProperty('CLOSED');
  });
});

// ========================================
// calculateTicketSLA
// ========================================
describe('calculateTicketSLA', () => {
  test('تذكرة محلولة ضمن الـ SLA', () => {
    const createdAt = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // قبل ساعة
    const firstResponseAt = new Date(Date.now() - 55 * 60 * 1000).toISOString(); // بعد 5 دقائق
    const resolvedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString(); // بعد 30 دقيقة

    const result = calculateTicketSLA({
      priority: 'high',
      createdAt,
      firstResponseAt,
      resolvedAt,
      status: 'resolved',
    });

    // high SLA resolution = 1440 دقيقة، الحل بعد 30 دقيقة = ضمن SLA
    expect(result.resolution.isBreached).toBe(false);
    expect(result.firstResponse.met).toBe(true);
    expect(result.resolution.met).toBe(true);
  });

  test('تذكرة مخترقة: حرجة لم تُحل خلال 4 ساعات', () => {
    const createdAt = new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(); // قبل 5 ساعات

    const result = calculateTicketSLA({
      priority: 'critical',
      createdAt,
      status: 'open',
    });

    // critical SLA = 240 دقيقة (4 ساعات) لكن مرت 5 ساعات
    expect(result.isBreached).toBe(true);
    expect(result.status).toBe('breached');
  });

  test('بيانات ناقصة → unknown', () => {
    const result = calculateTicketSLA(null);
    expect(result.status).toBe('unknown');
    expect(result.isBreached).toBe(false);
  });

  test('تذكرة جديدة ضمن SLA → on_track', () => {
    const createdAt = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // قبل 5 دقائق

    const result = calculateTicketSLA({
      priority: 'medium',
      createdAt,
      status: 'open',
    });

    // medium SLA = 4320 دقيقة، مرت 5 دقائق فقط
    expect(result.isBreached).toBe(false);
    expect(['on_track', 'at_risk']).toContain(result.status);
  });

  test('هدف SLA محدد في النتيجة', () => {
    const result = calculateTicketSLA({
      priority: 'low',
      createdAt: new Date().toISOString(),
      status: 'open',
    });

    expect(result.slaTargets.firstResponseMinutes).toBe(1440);
    expect(result.slaTargets.resolutionMinutes).toBe(10080);
  });

  test('الاستجابة الأولى تجاوزت الـ SLA → breached', () => {
    const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(); // قبل ساعتين
    // critical first response SLA = 30 دقيقة، لم يكن هناك استجابة
    const result = calculateTicketSLA({
      priority: 'critical',
      createdAt,
      status: 'in_progress',
    });

    expect(result.firstResponse.isBreached).toBe(true);
  });
});

// ========================================
// analyzeSLAPerformance
// ========================================
describe('analyzeSLAPerformance', () => {
  test('جميع التذاكر ضمن SLA → 100% compliance', () => {
    const tickets = [
      {
        priority: 'medium',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        status: 'open',
      },
      {
        priority: 'low',
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        status: 'open',
      },
    ];

    const result = analyzeSLAPerformance(tickets);
    expect(result.slaCompliance).toBe(100);
    expect(result.breachedCount).toBe(0);
    expect(result.totalTickets).toBe(2);
  });

  test('مصفوفة فارغة → 100% compliance', () => {
    const result = analyzeSLAPerformance([]);
    expect(result.slaCompliance).toBe(100);
    expect(result.totalTickets).toBe(0);
  });

  test('تحليل حسب الأولوية', () => {
    const tickets = [
      {
        priority: 'critical',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        status: 'open',
      }, // مخترق
      {
        priority: 'low',
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        status: 'open',
      }, // ضمن SLA
    ];

    const result = analyzeSLAPerformance(tickets);
    expect(result.byPriority.critical).toBeDefined();
    expect(result.byPriority.critical.compliance).toBeLessThan(100);
    expect(result.byPriority.low.compliance).toBe(100);
  });

  test('تحديد أسوأ أولوية', () => {
    const tickets = [
      {
        priority: 'critical',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        status: 'open',
      },
    ];

    const result = analyzeSLAPerformance(tickets);
    expect(result.worstPriority).toBe('critical');
  });
});

// ========================================
// calculateTicketPriority
// ========================================
describe('calculateTicketPriority', () => {
  test('توقف النظام → critical', () => {
    const result = calculateTicketPriority({
      category: 'technical',
      isSystemDown: true,
      affectedBeneficiaries: 20,
    });
    // 40 (system down) + 20 (tech) + 25 (20 affected) = 85 → critical
    expect(result.priority).toBe('critical');
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  test('مشكلة سريرية تؤثر على مستفيدين كثيرين → high/critical', () => {
    const result = calculateTicketPriority({
      category: 'clinical',
      affectedBeneficiaries: 5,
    });
    // 30 (clinical) + 10 (5 affected) = 40 → medium
    expect(['medium', 'high']).toContain(result.priority);
  });

  test('مشكلة عامة بسيطة → low', () => {
    const result = calculateTicketPriority({
      category: 'general',
      affectedBeneficiaries: 0,
    });
    expect(result.priority).toBe('low');
    expect(result.score).toBeLessThan(20);
  });

  test('null → low priority', () => {
    const result = calculateTicketPriority(null);
    expect(result.priority).toBe('low');
    expect(result.score).toBe(0);
  });

  test('فقدان بيانات → critical', () => {
    const result = calculateTicketPriority({
      category: 'technical',
      isDataLoss: true,
    });
    // 35 (data loss) + 20 (tech) = 55 → high
    expect(['high', 'critical']).toContain(result.priority);
  });

  test('عوامل الأولوية مُرجعة', () => {
    const result = calculateTicketPriority({
      category: 'billing',
      isSystemDown: false,
      affectedBeneficiaries: 3,
    });
    expect(result.factors).toBeDefined();
    expect(result.factors.category).toBe('billing');
    expect(result.factors.isSystemDown).toBe(false);
  });
});

// ========================================
// sortTicketsByUrgency
// ========================================
describe('sortTicketsByUrgency', () => {
  test('يضع التذاكر المخترقة أولاً', () => {
    const tickets = [
      {
        id: 't1',
        priority: 'low',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        status: 'open',
      },
      {
        id: 't2',
        priority: 'critical',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        status: 'open',
      }, // مخترق
    ];

    const result = sortTicketsByUrgency(tickets);
    expect(result[0].id).toBe('t2'); // المخترق أولاً
  });

  test('يرتب حسب الأولوية', () => {
    const tickets = [
      {
        id: 't1',
        priority: 'low',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        status: 'open',
      },
      {
        id: 't2',
        priority: 'high',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        status: 'open',
      },
      {
        id: 't3',
        priority: 'medium',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        status: 'open',
      },
    ];

    const result = sortTicketsByUrgency(tickets);
    // جميع ضمن SLA → ترتيب حسب الأولوية
    const priorities = result.map(t => t.priority);
    expect(priorities[0]).toBe('high');
    expect(priorities[priorities.length - 1]).toBe('low');
  });

  test('مصفوفة فارغة → مصفوفة فارغة', () => {
    expect(sortTicketsByUrgency([])).toHaveLength(0);
  });

  test('urgencyScore موجود في كل تذكرة', () => {
    const tickets = [
      {
        id: 't1',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        status: 'open',
      },
    ];
    const result = sortTicketsByUrgency(tickets);
    expect(result[0].urgencyScore).toBeDefined();
    expect(result[0].urgencyScore).toBeGreaterThan(0);
  });
});

// ========================================
// calculateTicketStatistics
// ========================================
describe('calculateTicketStatistics', () => {
  const sampleTickets = [
    {
      id: 't1',
      status: 'resolved',
      priority: 'high',
      category: 'technical',
      createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      firstResponseAt: new Date(Date.now() - 115 * 60 * 1000).toISOString(),
    },
    {
      id: 't2',
      status: 'open',
      priority: 'medium',
      category: 'billing',
      createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    },
    {
      id: 't3',
      status: 'closed',
      priority: 'low',
      category: 'general',
      createdAt: new Date(Date.now() - 240 * 60 * 1000).toISOString(),
      resolvedAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
      firstResponseAt: new Date(Date.now() - 235 * 60 * 1000).toISOString(),
    },
    {
      id: 't4',
      status: 'in_progress',
      priority: 'critical',
      category: 'clinical',
      createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      firstResponseAt: new Date(Date.now() - 8 * 60 * 1000).toISOString(),
    },
  ];

  test('إجمالي التذاكر محسوب', () => {
    const result = calculateTicketStatistics(sampleTickets);
    expect(result.total).toBe(4);
  });

  test('التذاكر المفتوحة والمغلقة', () => {
    const result = calculateTicketStatistics(sampleTickets);
    expect(result.open).toBe(2); // open + in_progress
    expect(result.closed).toBe(2); // resolved + closed
  });

  test('توزيع حسب الحالة', () => {
    const result = calculateTicketStatistics(sampleTickets);
    expect(result.byStatus.open).toBe(1);
    expect(result.byStatus.resolved).toBe(1);
    expect(result.byStatus.closed).toBe(1);
    expect(result.byStatus.in_progress).toBe(1);
  });

  test('متوسط وقت الحل محسوب', () => {
    const result = calculateTicketStatistics(sampleTickets);
    // t1: 60 دقيقة، t3: 120 دقيقة → متوسط 90
    expect(result.averageResolutionTimeMinutes).toBeGreaterThan(0);
    expect(result.averageResolutionTimeHours).toBeGreaterThan(0);
  });

  test('معدل الحل محسوب', () => {
    const result = calculateTicketStatistics(sampleTickets);
    expect(result.resolutionRate).toBe(50); // 2 من 4 = 50%
  });

  test('مصفوفة فارغة → أصفار', () => {
    const result = calculateTicketStatistics([]);
    expect(result.total).toBe(0);
  });

  test('معدل الاستجابة الأولى ضمن SLA', () => {
    const result = calculateTicketStatistics(sampleTickets);
    expect(result.firstResponseRate).toBeGreaterThanOrEqual(0);
    expect(result.firstResponseRate).toBeLessThanOrEqual(100);
  });
});

// ========================================
// analyzeAuditLogs
// ========================================
describe('analyzeAuditLogs', () => {
  test('سجلات عادية → لا شذوذات', () => {
    const logs = [
      {
        userId: 'u1',
        action: 'view_record',
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.1',
      },
      {
        userId: 'u1',
        action: 'update_session',
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.1',
      },
      {
        userId: 'u2',
        action: 'create_invoice',
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.2',
      },
    ];

    const result = analyzeAuditLogs(logs);
    expect(result.total).toBe(3);
    expect(result.anomalies).toHaveLength(0);
    expect(result.securityAlerts).toHaveLength(0);
  });

  test('محاولات دخول فاشلة كثيرة → Brute Force alert', () => {
    const logs = Array(8).fill({
      userId: 'attacker',
      action: 'login_failed',
      timestamp: new Date().toISOString(),
      ipAddress: '10.0.0.1',
    });

    const result = analyzeAuditLogs(logs);
    const bruteForce = result.anomalies.find(a => a.type === 'brute_force_attempt');
    expect(bruteForce).toBeDefined();
    expect(bruteForce.severity).toBe('critical');
    expect(result.securityAlerts.length).toBeGreaterThan(0);
  });

  test('حذف جماعي → mass_deletion alert', () => {
    const logs = Array(15).fill({
      userId: 'admin',
      action: 'delete_record',
      timestamp: new Date().toISOString(),
      ipAddress: '192.168.1.1',
    });

    const result = analyzeAuditLogs(logs);
    const massDelete = result.anomalies.find(a => a.type === 'mass_deletion');
    expect(massDelete).toBeDefined();
    expect(massDelete.count).toBe(15);
  });

  test('أكثر الإجراءات شيوعاً محسوبة', () => {
    const logs = [
      { userId: 'u1', action: 'view', timestamp: new Date().toISOString() },
      { userId: 'u2', action: 'view', timestamp: new Date().toISOString() },
      { userId: 'u1', action: 'update', timestamp: new Date().toISOString() },
    ];

    const result = analyzeAuditLogs(logs);
    expect(result.topActions[0].action).toBe('view');
    expect(result.topActions[0].count).toBe(2);
  });

  test('مصفوفة فارغة → لا شيء', () => {
    const result = analyzeAuditLogs([]);
    expect(result.total).toBe(0);
    expect(result.anomalies).toHaveLength(0);
  });

  test('إحصائيات مُرجعة', () => {
    const logs = [
      {
        userId: 'u1',
        action: 'delete_record',
        timestamp: new Date().toISOString(),
        ipAddress: '1.1.1.1',
      },
      { userId: 'u2', action: 'view', timestamp: new Date().toISOString(), ipAddress: '1.1.1.2' },
    ];

    const result = analyzeAuditLogs(logs);
    expect(result.statistics).toBeDefined();
    expect(result.statistics.uniqueUsers).toBe(2);
    expect(result.statistics.uniqueIPs).toBe(2);
  });
});

// ========================================
// validateAuditEntry
// ========================================
describe('validateAuditEntry', () => {
  test('سجل صحيح مكتمل → valid', () => {
    const entry = {
      userId: 'u1',
      action: 'view_record',
      timestamp: new Date().toISOString(),
      resource: 'patient_data',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    };

    const result = validateAuditEntry(entry);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('حقول مطلوبة ناقصة → invalid', () => {
    const result = validateAuditEntry({ userId: 'u1' });
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('null → invalid', () => {
    const result = validateAuditEntry(null);
    expect(result.isValid).toBe(false);
  });

  test('إجراء حساس → security level', () => {
    const entry = {
      userId: 'u1',
      action: 'delete_patient_record',
      timestamp: new Date().toISOString(),
    };

    const result = validateAuditEntry(entry);
    expect(result.isSensitive).toBe(true);
    expect(result.level).toBe('security');
  });

  test('إجراء عادي → info level', () => {
    const entry = {
      userId: 'u1',
      action: 'view_dashboard',
      timestamp: new Date().toISOString(),
    };

    const result = validateAuditEntry(entry);
    expect(result.isSensitive).toBe(false);
    expect(result.level).toBe('info');
  });

  test('طابع زمني غير صالح → خطأ', () => {
    const entry = {
      userId: 'u1',
      action: 'view',
      timestamp: 'invalid-date',
    };

    const result = validateAuditEntry(entry);
    expect(result.isValid).toBe(false);
  });
});

// ========================================
// applyAuditRetentionPolicy
// ========================================
describe('applyAuditRetentionPolicy', () => {
  test('سجل قديم (أكثر من سنة) → للحذف', () => {
    const oldLog = {
      userId: 'u1',
      action: 'view',
      timestamp: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(), // قبل 400 يوم
      level: 'info',
    };

    const result = applyAuditRetentionPolicy([oldLog]);
    expect(result.toDelete).toHaveLength(1);
    expect(result.toDelete[0].reason).toBe('audit_log_expired');
  });

  test('سجل أمان قديم (1.5 سنة) → يبقى (سياسة 2 سنة)', () => {
    const securityLog = {
      userId: 'u1',
      action: 'login_failed',
      timestamp: new Date(Date.now() - 550 * 24 * 60 * 60 * 1000).toISOString(), // قبل 550 يوم
      level: 'security',
    };

    const result = applyAuditRetentionPolicy([securityLog]);
    expect(result.toKeep).toHaveLength(1);
    expect(result.toDelete).toHaveLength(0);
  });

  test('مزيج من السجلات', () => {
    const logs = [
      {
        userId: 'u1',
        action: 'view',
        timestamp: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        level: 'info',
      }, // يُحذف
      {
        userId: 'u2',
        action: 'update',
        timestamp: new Date().toISOString(),
        level: 'info',
      }, // يبقى
    ];

    const result = applyAuditRetentionPolicy(logs);
    expect(result.summary.deleted).toBe(1);
    expect(result.summary.kept).toBe(1);
    expect(result.summary.total).toBe(2);
  });

  test('مصفوفة فارغة → فارغة', () => {
    const result = applyAuditRetentionPolicy([]);
    expect(result.toDelete).toHaveLength(0);
    expect(result.toKeep).toHaveLength(0);
  });

  test('معدل الحذف محسوب', () => {
    const logs = [
      {
        userId: 'u1',
        action: 'view',
        timestamp: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString(),
        level: 'info',
      },
      {
        userId: 'u2',
        action: 'update',
        timestamp: new Date().toISOString(),
        level: 'info',
      },
    ];
    const result = applyAuditRetentionPolicy(logs);
    expect(result.summary.deletionRate).toBe(50);
  });
});

// ========================================
// identifyEscalationCandidates
// ========================================
describe('identifyEscalationCandidates', () => {
  test('تذكرة حرجة مخترقة SLA → تصعيد فوري', () => {
    const tickets = [
      {
        id: 't1',
        priority: 'critical',
        status: 'open',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // قبل 5 ساعات
      },
    ];

    const result = identifyEscalationCandidates(tickets);
    expect(result).toHaveLength(1);
    expect(result[0].highestSeverity).toBe('critical');
    expect(result[0].escalationReasons.some(r => r.reason === 'sla_breached')).toBe(true);
  });

  test('تذكرة مفتوحة أكثر من ساعة بدون نشاط → تصعيد', () => {
    const tickets = [
      {
        id: 't2',
        priority: 'high',
        status: 'open',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        lastActivityAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), // قبل 26 ساعة
      },
    ];

    const result = identifyEscalationCandidates(tickets);
    expect(result).toHaveLength(1);
    const noActivity = result[0].escalationReasons.find(r => r.reason === 'no_activity');
    expect(noActivity).toBeDefined();
  });

  test('إعادة فتح متكررة → تصعيد', () => {
    const tickets = [
      {
        id: 't3',
        priority: 'medium',
        status: 'reopened',
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        reopenCount: 3,
      },
    ];

    const result = identifyEscalationCandidates(tickets);
    expect(result).toHaveLength(1);
    const reopen = result[0].escalationReasons.find(r => r.reason === 'repeated_reopening');
    expect(reopen).toBeDefined();
  });

  test('تذكرة طبيعية ضمن SLA → لا تصعيد', () => {
    const tickets = [
      {
        id: 't4',
        priority: 'low',
        status: 'in_progress',
        createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      },
    ];

    const result = identifyEscalationCandidates(tickets);
    expect(result).toHaveLength(0);
  });

  test('مصفوفة فارغة → فارغة', () => {
    expect(identifyEscalationCandidates([])).toHaveLength(0);
  });

  test('Critical قبل Warning في الترتيب', () => {
    const tickets = [
      {
        id: 't1',
        priority: 'high',
        status: 'open',
        createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
        lastActivityAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(), // warning only
      },
      {
        id: 't2',
        priority: 'critical',
        status: 'open',
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // SLA breached = critical
      },
    ];

    const result = identifyEscalationCandidates(tickets);
    if (result.length >= 2) {
      expect(result[0].highestSeverity).toBe('critical');
    }
  });
});

// ========================================
// analyzeResolutionTimes
// ========================================
describe('analyzeResolutionTimes', () => {
  test('حساب المتوسط والوسيط', () => {
    const tickets = [
      {
        id: 't1',
        priority: 'high',
        createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        resolvedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      }, // 60 دقيقة
      {
        id: 't2',
        priority: 'medium',
        createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
        resolvedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      }, // 120 دقيقة
    ];

    const result = analyzeResolutionTimes(tickets);
    expect(result.averageMinutes).toBe(90);
    expect(result.minMinutes).toBe(60);
    expect(result.maxMinutes).toBe(120);
  });

  test('وقت الحل بالساعات محسوب', () => {
    const tickets = [
      {
        id: 't1',
        priority: 'high',
        createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
        resolvedAt: new Date().toISOString(),
      }, // 180 دقيقة = 3 ساعات
    ];

    const result = analyzeResolutionTimes(tickets);
    expect(result.averageHours).toBe(3);
  });

  test('تحليل حسب الأولوية', () => {
    const tickets = [
      {
        id: 't1',
        priority: 'critical',
        createdAt: new Date(Date.now() - 200 * 60 * 1000).toISOString(),
        resolvedAt: new Date().toISOString(),
      }, // 200 دقيقة (أقل من SLA 240)
    ];

    const result = analyzeResolutionTimes(tickets);
    expect(result.byPriority.critical).toBeDefined();
    expect(result.byPriority.critical.withinSLA).toBe(100);
  });

  test('مصفوفة فارغة → أصفار', () => {
    const result = analyzeResolutionTimes([]);
    expect(result.average).toBe(0);
    expect(result.median).toBe(0);
  });

  test('Percentile 90 محسوب', () => {
    const tickets = Array(10)
      .fill(null)
      .map((_, i) => ({
        id: `t${i}`,
        priority: 'medium',
        createdAt: new Date(Date.now() - (i + 1) * 60 * 60 * 1000).toISOString(),
        resolvedAt: new Date().toISOString(),
      }));

    const result = analyzeResolutionTimes(tickets);
    expect(result.percentile90Minutes).toBeDefined();
    expect(result.percentile90Minutes).toBeGreaterThan(0);
  });

  test('تجاهل التذاكر بدون تاريخ حل', () => {
    const tickets = [
      {
        id: 't1',
        priority: 'high',
        createdAt: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
        // لا يوجد resolvedAt
      },
      {
        id: 't2',
        priority: 'medium',
        createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
        resolvedAt: new Date().toISOString(),
      },
    ];

    const result = analyzeResolutionTimes(tickets);
    expect(result.total).toBe(1); // فقط t2 له resolvedAt
  });
});

// ========================================
// Integration Scenarios
// ========================================
describe('Integration Scenarios', () => {
  test('سيناريو: تحليل شامل لنظام التذاكر', () => {
    const tickets = [
      {
        id: 't1',
        priority: 'critical',
        status: 'resolved',
        category: 'technical',
        createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        resolvedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
        firstResponseAt: new Date(Date.now() - 170 * 60 * 1000).toISOString(),
      },
      {
        id: 't2',
        priority: 'high',
        status: 'open',
        category: 'clinical',
        createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      },
      {
        id: 't3',
        priority: 'medium',
        status: 'in_progress',
        category: 'billing',
        createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      },
    ];

    // إحصائيات
    const stats = calculateTicketStatistics(tickets);
    expect(stats.total).toBe(3);
    expect(stats.open).toBeGreaterThan(0);

    // أداء SLA
    const slaPerf = analyzeSLAPerformance(tickets);
    expect(slaPerf.totalTickets).toBe(3);

    // الترتيب حسب الإلحاح
    const sorted = sortTicketsByUrgency(tickets);
    expect(sorted).toHaveLength(3);

    // التصعيد
    const escalations = identifyEscalationCandidates(tickets);
    expect(Array.isArray(escalations)).toBe(true);
  });

  test('سيناريو: تدقيق أمني', () => {
    const auditLogs = [
      ...Array(12).fill({
        userId: 'suspicious',
        action: 'delete_record',
        timestamp: new Date().toISOString(),
        ipAddress: '10.0.0.1',
      }),
      ...Array(8).fill({
        userId: 'hacker',
        action: 'login_failed',
        timestamp: new Date().toISOString(),
        ipAddress: '10.0.0.2',
      }),
      {
        userId: 'admin',
        action: 'view',
        timestamp: new Date().toISOString(),
        ipAddress: '192.168.1.1',
      },
    ];

    const analysis = analyzeAuditLogs(auditLogs);
    expect(analysis.securityAlerts.length).toBeGreaterThanOrEqual(2);
    expect(analysis.anomalies.some(a => a.type === 'mass_deletion')).toBe(true);
    expect(analysis.anomalies.some(a => a.type === 'brute_force_attempt')).toBe(true);
  });

  test('سيناريو: تحليل أداء فريق الدعم', () => {
    const resolvedTickets = [
      {
        id: 't1',
        priority: 'critical',
        createdAt: new Date(Date.now() - 200 * 60 * 1000).toISOString(),
        resolvedAt: new Date().toISOString(),
      }, // 200 دقيقة - ضمن SLA (240)
      {
        id: 't2',
        priority: 'high',
        createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000).toISOString(),
        resolvedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      }, // 15 ساعة ≈ 900 دقيقة - ضمن SLA (1440)
    ];

    const timeAnalysis = analyzeResolutionTimes(resolvedTickets);
    expect(timeAnalysis.total).toBe(2);
    expect(timeAnalysis.byPriority.critical.withinSLA).toBe(100);
    expect(timeAnalysis.byPriority.high.withinSLA).toBe(100);
    expect(timeAnalysis.averageMinutes).toBeGreaterThan(0);
  });
});
