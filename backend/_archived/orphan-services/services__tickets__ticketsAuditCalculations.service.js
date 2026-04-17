/**
 * Tickets & Audit Calculations Service
 * خدمة حسابات نظام التذاكر وسجل التدقيق
 * Support Tickets + Audit Trail + SLA Management
 * Pure Business Logic - No DB, No Side Effects
 * نظام AlAwael ERP - مراكز تأهيل ذوي الإعاقة
 */

'use strict';

// ========================================
// CONSTANTS
// ========================================
const TICKET_CONSTANTS = {
  PRIORITY: {
    CRITICAL: 'critical',
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low',
  },
  STATUS: {
    OPEN: 'open',
    IN_PROGRESS: 'in_progress',
    PENDING: 'pending',
    RESOLVED: 'resolved',
    CLOSED: 'closed',
    REOPENED: 'reopened',
  },
  SLA: {
    // وقت الاستجابة الأولى (بالدقائق)
    FIRST_RESPONSE: {
      critical: 30,
      high: 120, // 2 ساعات
      medium: 480, // 8 ساعات (يوم عمل)
      low: 1440, // 24 ساعة
    },
    // وقت الحل الكامل (بالدقائق)
    RESOLUTION: {
      critical: 240, // 4 ساعات
      high: 1440, // يوم واحد
      medium: 4320, // 3 أيام
      low: 10080, // 7 أيام
    },
  },
  CATEGORIES: ['technical', 'clinical', 'billing', 'hr', 'transport', 'general'],
  AUDIT_LEVELS: {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical',
    SECURITY: 'security',
  },
  RETENTION: {
    AUDIT_LOGS_DAYS: 365, // الاحتفاظ بسجلات التدقيق سنة
    TICKETS_CLOSED_DAYS: 90, // التذاكر المغلقة 90 يوم
    SECURITY_LOGS_DAYS: 730, // سجلات الأمان سنتان
  },
};

// ========================================
// SLA CALCULATIONS
// ========================================

/**
 * حساب وضع SLA لتذكرة
 * @param {object} ticket - {priority, createdAt, firstResponseAt, resolvedAt, status}
 * @returns {object} - حالة SLA والوقت المتبقي
 */
function calculateTicketSLA(ticket) {
  if (!ticket || !ticket.priority || !ticket.createdAt) {
    return { status: 'unknown', isBreached: false };
  }

  const now = new Date();
  const createdAt = new Date(ticket.createdAt);
  const priority = ticket.priority;

  const slaFirstResponse = TICKET_CONSTANTS.SLA.FIRST_RESPONSE[priority] || 480;
  const slaResolution = TICKET_CONSTANTS.SLA.RESOLUTION[priority] || 4320;

  // وقت الاستجابة الأولى
  const firstResponseDeadline = new Date(createdAt.getTime() + slaFirstResponse * 60 * 1000);
  const firstResponseBreached = ticket.firstResponseAt
    ? new Date(ticket.firstResponseAt) > firstResponseDeadline
    : now > firstResponseDeadline;

  const firstResponseMinutesLeft = Math.round(
    (firstResponseDeadline - (ticket.firstResponseAt ? new Date(ticket.firstResponseAt) : now)) /
      60000
  );

  // وقت الحل
  const resolutionDeadline = new Date(createdAt.getTime() + slaResolution * 60 * 1000);
  const resolutionBreached = ticket.resolvedAt
    ? new Date(ticket.resolvedAt) > resolutionDeadline
    : ticket.status !== 'resolved' && ticket.status !== 'closed' && now > resolutionDeadline;

  const resolutionMinutesLeft = Math.round(
    (resolutionDeadline - (ticket.resolvedAt ? new Date(ticket.resolvedAt) : now)) / 60000
  );

  // الوضع الإجمالي
  let slaStatus;
  if (resolutionBreached || firstResponseBreached) {
    slaStatus = 'breached';
  } else if (resolutionMinutesLeft < slaResolution * 0.1) {
    slaStatus = 'at_risk'; // أقل من 10% من الوقت متبقٍ
  } else {
    slaStatus = 'on_track';
  }

  return {
    status: slaStatus,
    isBreached: resolutionBreached || firstResponseBreached,
    firstResponse: {
      deadline: firstResponseDeadline.toISOString(),
      isBreached: firstResponseBreached,
      minutesLeft: firstResponseMinutesLeft,
      met: !!ticket.firstResponseAt,
    },
    resolution: {
      deadline: resolutionDeadline.toISOString(),
      isBreached: resolutionBreached,
      minutesLeft: resolutionMinutesLeft,
      met: !!ticket.resolvedAt,
    },
    priority,
    slaTargets: {
      firstResponseMinutes: slaFirstResponse,
      resolutionMinutes: slaResolution,
    },
  };
}

/**
 * تحليل أداء SLA لمجموعة تذاكر
 * @param {Array} tickets - مصفوفة التذاكر
 * @returns {object} - إحصائيات SLA
 */
function analyzeSLAPerformance(tickets) {
  if (!Array.isArray(tickets) || tickets.length === 0) {
    return {
      totalTickets: 0,
      slaCompliance: 100,
      breachedCount: 0,
      atRiskCount: 0,
      byPriority: {},
    };
  }

  const analyzed = tickets.map(t => ({ ...t, sla: calculateTicketSLA(t) }));

  const breached = analyzed.filter(t => t.sla.isBreached);
  const atRisk = analyzed.filter(t => t.sla.status === 'at_risk');
  const compliant = analyzed.filter(t => t.sla.status === 'on_track');

  const slaCompliance = Math.round((compliant.length / tickets.length) * 100);

  // تحليل حسب الأولوية
  const byPriority = {};
  for (const priority of Object.values(TICKET_CONSTANTS.PRIORITY)) {
    const priorityTickets = analyzed.filter(t => t.priority === priority);
    if (priorityTickets.length > 0) {
      const priorityBreached = priorityTickets.filter(t => t.sla.isBreached).length;
      byPriority[priority] = {
        total: priorityTickets.length,
        breached: priorityBreached,
        compliance: Math.round(
          ((priorityTickets.length - priorityBreached) / priorityTickets.length) * 100
        ),
      };
    }
  }

  return {
    totalTickets: tickets.length,
    slaCompliance,
    breachedCount: breached.length,
    atRiskCount: atRisk.length,
    onTrackCount: compliant.length,
    byPriority,
    worstPriority:
      Object.entries(byPriority).sort((a, b) => a[1].compliance - b[1].compliance)[0]?.[0] || null,
  };
}

// ========================================
// TICKET PRIORITIZATION
// ========================================

/**
 * حساب نقاط الأولوية التلقائية للتذكرة
 * @param {object} ticketData - بيانات التذكرة
 * @returns {object} - الأولوية المقترحة والنقاط
 */
function calculateTicketPriority(ticketData) {
  if (!ticketData) {
    return { priority: TICKET_CONSTANTS.PRIORITY.LOW, score: 0 };
  }

  let score = 0;

  // 1. تأثير على المستفيدين
  const affectedBeneficiaries = ticketData.affectedBeneficiaries || 0;
  if (affectedBeneficiaries > 50) score += 40;
  else if (affectedBeneficiaries > 10) score += 25;
  else if (affectedBeneficiaries > 0) score += 10;

  // 2. نوع المشكلة
  const categoryScores = {
    technical: 20, // مشاكل تقنية
    clinical: 30, // مشاكل سريرية (أعلى أولوية)
    billing: 15,
    hr: 10,
    transport: 20,
    general: 5,
  };
  score += categoryScores[ticketData.category] || 5;

  // 3. توقف النظام
  if (ticketData.isSystemDown) score += 40;
  if (ticketData.isDataLoss) score += 35;
  if (ticketData.isSecurityIssue) score += 30;

  // 4. الوقت منذ الإنشاء (يزيد الأولوية مع الوقت)
  if (ticketData.createdAt) {
    const hoursSinceCreation = (new Date() - new Date(ticketData.createdAt)) / 3600000;
    if (hoursSinceCreation > 24) score += 10;
    if (hoursSinceCreation > 48) score += 10;
  }

  // تحديد الأولوية بناءً على النقاط
  let priority;
  if (score >= 70) priority = TICKET_CONSTANTS.PRIORITY.CRITICAL;
  else if (score >= 45) priority = TICKET_CONSTANTS.PRIORITY.HIGH;
  else if (score >= 20) priority = TICKET_CONSTANTS.PRIORITY.MEDIUM;
  else priority = TICKET_CONSTANTS.PRIORITY.LOW;

  return {
    priority,
    score,
    factors: {
      affectedBeneficiaries,
      category: ticketData.category,
      isSystemDown: !!ticketData.isSystemDown,
      isDataLoss: !!ticketData.isDataLoss,
      isSecurityIssue: !!ticketData.isSecurityIssue,
    },
  };
}

/**
 * ترتيب قائمة التذاكر حسب الأولوية والـ SLA
 * @param {Array} tickets - مصفوفة التذاكر
 * @returns {Array} - التذاكر مرتبة
 */
function sortTicketsByUrgency(tickets) {
  if (!Array.isArray(tickets) || tickets.length === 0) return [];

  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

  return tickets
    .map(ticket => ({
      ...ticket,
      sla: calculateTicketSLA(ticket),
      urgencyScore: _calculateUrgencyScore(ticket),
    }))
    .sort((a, b) => {
      // أولاً: التذاكر المخترقة للـ SLA
      if (a.sla.isBreached !== b.sla.isBreached) {
        return a.sla.isBreached ? -1 : 1;
      }
      // ثانياً: الأولوية
      const pa = priorityOrder[a.priority] ?? 3;
      const pb = priorityOrder[b.priority] ?? 3;
      if (pa !== pb) return pa - pb;
      // ثالثاً: الأقدم أولاً
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
}

function _calculateUrgencyScore(ticket) {
  const priorityScores = { critical: 100, high: 75, medium: 50, low: 25 };
  let score = priorityScores[ticket.priority] || 25;
  const sla = calculateTicketSLA(ticket);
  if (sla.isBreached) score += 50;
  if (sla.status === 'at_risk') score += 25;
  return score;
}

// ========================================
// TICKET STATISTICS
// ========================================

/**
 * حساب إحصائيات نظام التذاكر
 * @param {Array} tickets - مصفوفة التذاكر
 * @returns {object} - إحصائيات شاملة
 */
function calculateTicketStatistics(tickets) {
  if (!Array.isArray(tickets) || tickets.length === 0) {
    return {
      total: 0,
      byStatus: {},
      byPriority: {},
      averageResolutionTime: 0,
      firstResponseRate: 0,
    };
  }

  // توزيع حسب الحالة
  const byStatus = {};
  for (const status of Object.values(TICKET_CONSTANTS.STATUS)) {
    byStatus[status] = tickets.filter(t => t.status === status).length;
  }

  // توزيع حسب الأولوية
  const byPriority = {};
  for (const priority of Object.values(TICKET_CONSTANTS.PRIORITY)) {
    byPriority[priority] = tickets.filter(t => t.priority === priority).length;
  }

  // متوسط وقت الحل (بالدقائق)
  const resolvedTickets = tickets.filter(
    t => t.resolvedAt && t.createdAt && (t.status === 'resolved' || t.status === 'closed')
  );

  const avgResolutionTime =
    resolvedTickets.length > 0
      ? Math.round(
          resolvedTickets.reduce((sum, t) => {
            return sum + (new Date(t.resolvedAt) - new Date(t.createdAt)) / 60000;
          }, 0) / resolvedTickets.length
        )
      : 0;

  // معدل الاستجابة الأولى ضمن الـ SLA
  const ticketsWithFirstResponse = tickets.filter(t => t.firstResponseAt && t.createdAt);
  const onTimeFirstResponse = ticketsWithFirstResponse.filter(t => {
    const slaTarget = TICKET_CONSTANTS.SLA.FIRST_RESPONSE[t.priority] || 480;
    const responseTime = (new Date(t.firstResponseAt) - new Date(t.createdAt)) / 60000;
    return responseTime <= slaTarget;
  });

  const firstResponseRate =
    ticketsWithFirstResponse.length > 0
      ? Math.round((onTimeFirstResponse.length / ticketsWithFirstResponse.length) * 100)
      : 0;

  // توزيع حسب الفئة
  const byCategory = {};
  for (const category of TICKET_CONSTANTS.CATEGORIES) {
    const count = tickets.filter(t => t.category === category).length;
    if (count > 0) byCategory[category] = count;
  }

  return {
    total: tickets.length,
    open: (byStatus.open || 0) + (byStatus.in_progress || 0) + (byStatus.pending || 0),
    closed: (byStatus.resolved || 0) + (byStatus.closed || 0),
    byStatus,
    byPriority,
    byCategory,
    averageResolutionTimeMinutes: avgResolutionTime,
    averageResolutionTimeHours: Math.round((avgResolutionTime / 60) * 10) / 10,
    firstResponseRate,
    resolutionRate:
      tickets.length > 0
        ? Math.round((((byStatus.resolved || 0) + (byStatus.closed || 0)) / tickets.length) * 100)
        : 0,
  };
}

// ========================================
// AUDIT LOG ANALYSIS
// ========================================

/**
 * تحليل سجلات التدقيق وكشف الأنماط المشبوهة
 * @param {Array} auditLogs - [{userId, action, resource, timestamp, ipAddress}]
 * @returns {object} - تحليل وتنبيهات أمنية
 */
function analyzeAuditLogs(auditLogs) {
  if (!Array.isArray(auditLogs) || auditLogs.length === 0) {
    return {
      total: 0,
      anomalies: [],
      topActions: [],
      topUsers: [],
      securityAlerts: [],
    };
  }

  // أكثر الإجراءات شيوعاً
  const actionCounts = {};
  const userCounts = {};
  const ipCounts = {};
  const securityAlerts = [];

  for (const log of auditLogs) {
    if (log.action) actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    if (log.userId) userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
    if (log.ipAddress) ipCounts[log.ipAddress] = (ipCounts[log.ipAddress] || 0) + 1;
  }

  const topActions = Object.entries(actionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([action, count]) => ({ action, count }));

  const topUsers = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, count]) => ({ userId, count }));

  // كشف الأنماط المشبوهة
  const anomalies = [];

  // 1. نشاط خارج ساعات العمل (قبل 6 صباحاً أو بعد 11 مساءً)
  const offHoursLogs = auditLogs.filter(log => {
    if (!log.timestamp) return false;
    const hour = new Date(log.timestamp).getHours();
    return hour < 6 || hour >= 23;
  });

  if (offHoursLogs.length > 0) {
    anomalies.push({
      type: 'off_hours_activity',
      count: offHoursLogs.length,
      severity: 'warning',
      description: `${offHoursLogs.length} نشاط خارج ساعات العمل`,
    });
  }

  // 2. محاولات حذف متعددة
  const deleteActions = auditLogs.filter(
    log => log.action && log.action.toLowerCase().includes('delete')
  );
  if (deleteActions.length > 10) {
    anomalies.push({
      type: 'mass_deletion',
      count: deleteActions.length,
      severity: 'critical',
      description: `${deleteActions.length} عملية حذف - يحتمل حذف جماعي`,
    });
    securityAlerts.push({
      type: 'mass_deletion_alert',
      severity: 'critical',
      message: `تحذير: ${deleteActions.length} عملية حذف مشبوهة`,
    });
  }

  // 3. محاولات تسجيل دخول فاشلة متعددة
  const failedLogins = auditLogs.filter(
    log => log.action === 'login_failed' || log.action === 'auth_failed'
  );
  if (failedLogins.length > 5) {
    anomalies.push({
      type: 'brute_force_attempt',
      count: failedLogins.length,
      severity: 'critical',
      description: `${failedLogins.length} محاولة دخول فاشلة - احتمال هجوم Brute Force`,
    });
    securityAlerts.push({
      type: 'brute_force',
      severity: 'critical',
      message: `تحذير أمني: ${failedLogins.length} محاولة دخول فاشلة`,
    });
  }

  // 4. وصول من IP غير معتادة
  const suspiciousIPs = Object.entries(ipCounts)
    .filter(([ip, count]) => count > 100)
    .map(([ip, count]) => ({ ip, count }));

  if (suspiciousIPs.length > 0) {
    anomalies.push({
      type: 'high_frequency_ip',
      ips: suspiciousIPs,
      severity: 'warning',
      description: `${suspiciousIPs.length} عنوان IP بنشاط مرتفع`,
    });
  }

  // 5. الوصول لبيانات حساسة
  const sensitiveAccess = auditLogs.filter(
    log =>
      log.resource &&
      ['patient_records', 'financial_data', 'employee_data', 'medical_records'].includes(
        log.resource
      )
  );

  return {
    total: auditLogs.length,
    anomalies,
    topActions,
    topUsers,
    securityAlerts,
    statistics: {
      deleteOperations: deleteActions.length,
      failedLogins: failedLogins.length,
      offHoursActivity: offHoursLogs.length,
      sensitiveDataAccess: sensitiveAccess.length,
      uniqueUsers: Object.keys(userCounts).length,
      uniqueIPs: Object.keys(ipCounts).length,
    },
  };
}

/**
 * التحقق من اكتمال سجل التدقيق وجودته
 * @param {object} auditEntry - سجل تدقيق واحد
 * @returns {object} - نتيجة التحقق
 */
function validateAuditEntry(auditEntry) {
  if (!auditEntry || typeof auditEntry !== 'object') {
    return { isValid: false, errors: ['سجل التدقيق فارغ'] };
  }

  const requiredFields = ['userId', 'action', 'timestamp'];
  const errors = [];
  const warnings = [];

  for (const field of requiredFields) {
    if (!auditEntry[field]) {
      errors.push(`الحقل "${field}" مطلوب`);
    }
  }

  // التحقق من صحة الطابع الزمني
  if (auditEntry.timestamp) {
    const ts = new Date(auditEntry.timestamp);
    if (isNaN(ts.getTime())) {
      errors.push('الطابع الزمني غير صالح');
    } else if (ts > new Date()) {
      warnings.push('الطابع الزمني في المستقبل');
    }
  }

  // الحقول الموصى بها
  if (!auditEntry.resource) warnings.push('المورد المتأثر غير محدد');
  if (!auditEntry.ipAddress) warnings.push('عنوان IP غير مسجل');
  if (!auditEntry.userAgent) warnings.push('User Agent غير مسجل');

  // تحديد مستوى التدقيق
  const sensitiveActions = ['delete', 'login_failed', 'permission_change', 'data_export'];
  const isSensitive = sensitiveActions.some(action =>
    auditEntry.action?.toLowerCase().includes(action)
  );

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    isSensitive,
    level: isSensitive
      ? TICKET_CONSTANTS.AUDIT_LEVELS.SECURITY
      : TICKET_CONSTANTS.AUDIT_LEVELS.INFO,
  };
}

// ========================================
// AUDIT RETENTION POLICY
// ========================================

/**
 * تطبيق سياسة الاحتفاظ بسجلات التدقيق
 * @param {Array} auditLogs - سجلات التدقيق
 * @returns {object} - السجلات للحذف والاحتفاظ
 */
function applyAuditRetentionPolicy(auditLogs) {
  if (!Array.isArray(auditLogs) || auditLogs.length === 0) {
    return { toDelete: [], toKeep: [], summary: { deleted: 0, kept: 0 } };
  }

  const now = new Date();
  const toDelete = [];
  const toKeep = [];

  for (const log of auditLogs) {
    if (!log.timestamp) {
      toKeep.push(log);
      continue;
    }

    const logDate = new Date(log.timestamp);
    const ageInDays = Math.round((now - logDate) / (1000 * 60 * 60 * 24));

    // سجلات الأمان: 2 سنة
    if (log.level === TICKET_CONSTANTS.AUDIT_LEVELS.SECURITY) {
      if (ageInDays > TICKET_CONSTANTS.RETENTION.SECURITY_LOGS_DAYS) {
        toDelete.push({ ...log, reason: 'security_log_expired' });
      } else {
        toKeep.push(log);
      }
    }
    // سجلات عادية: سنة واحدة
    else {
      if (ageInDays > TICKET_CONSTANTS.RETENTION.AUDIT_LOGS_DAYS) {
        toDelete.push({ ...log, reason: 'audit_log_expired' });
      } else {
        toKeep.push(log);
      }
    }
  }

  return {
    toDelete,
    toKeep,
    summary: {
      total: auditLogs.length,
      deleted: toDelete.length,
      kept: toKeep.length,
      deletionRate: Math.round((toDelete.length / auditLogs.length) * 100),
    },
  };
}

// ========================================
// TICKET ESCALATION
// ========================================

/**
 * تحديد التذاكر التي تحتاج إلى تصعيد
 * @param {Array} tickets - مصفوفة التذاكر
 * @returns {Array} - التذاكر التي تحتاج تصعيداً
 */
function identifyEscalationCandidates(tickets) {
  if (!Array.isArray(tickets) || tickets.length === 0) return [];

  const now = new Date();
  const escalationCandidates = [];

  for (const ticket of tickets) {
    const reasons = [];
    const sla = calculateTicketSLA(ticket);

    // 1. خرق SLA
    if (sla.isBreached) {
      reasons.push({
        reason: 'sla_breached',
        details: 'تم خرق الـ SLA',
        severity: 'critical',
      });
    }

    // 2. تذكرة حرجة مفتوحة أكثر من ساعة
    if (ticket.priority === 'critical' && ticket.status === 'open') {
      const minutesOpen = (now - new Date(ticket.createdAt)) / 60000;
      if (minutesOpen > 60) {
        reasons.push({
          reason: 'critical_unassigned',
          details: `تذكرة حرجة مفتوحة منذ ${Math.round(minutesOpen)} دقيقة`,
          severity: 'critical',
        });
      }
    }

    // 3. لا يوجد رد منذ 24 ساعة
    if (ticket.lastActivityAt) {
      const hoursSinceActivity = (now - new Date(ticket.lastActivityAt)) / 3600000;
      if (hoursSinceActivity > 24 && ticket.status !== 'closed' && ticket.status !== 'resolved') {
        reasons.push({
          reason: 'no_activity',
          details: `${Math.round(hoursSinceActivity)} ساعة بدون نشاط`,
          severity: 'warning',
        });
      }
    }

    // 4. إعادة فتح أكثر من مرتين
    if (ticket.reopenCount && ticket.reopenCount >= 2) {
      reasons.push({
        reason: 'repeated_reopening',
        details: `تم فتحها ${ticket.reopenCount} مرة`,
        severity: 'warning',
      });
    }

    if (reasons.length > 0) {
      escalationCandidates.push({
        ticketId: ticket.id,
        priority: ticket.priority,
        status: ticket.status,
        escalationReasons: reasons,
        highestSeverity: reasons.some(r => r.severity === 'critical') ? 'critical' : 'warning',
      });
    }
  }

  return escalationCandidates.sort((a, b) => {
    if (a.highestSeverity !== b.highestSeverity) {
      return a.highestSeverity === 'critical' ? -1 : 1;
    }
    return b.escalationReasons.length - a.escalationReasons.length;
  });
}

// ========================================
// RESOLUTION TIME ANALYSIS
// ========================================

/**
 * تحليل أوقات حل التذاكر وحساب المعدلات
 * @param {Array} resolvedTickets - التذاكر المحلولة
 * @returns {object} - تحليل أوقات الحل
 */
function analyzeResolutionTimes(resolvedTickets) {
  if (!Array.isArray(resolvedTickets) || resolvedTickets.length === 0) {
    return {
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      percentile90: 0,
      byPriority: {},
    };
  }

  const resolutionTimes = resolvedTickets
    .filter(t => t.resolvedAt && t.createdAt)
    .map(t => ({
      ...t,
      resolutionMinutes: Math.round((new Date(t.resolvedAt) - new Date(t.createdAt)) / 60000),
    }))
    .sort((a, b) => a.resolutionMinutes - b.resolutionMinutes);

  if (resolutionTimes.length === 0) {
    return { average: 0, median: 0, min: 0, max: 0, percentile90: 0, byPriority: {} };
  }

  const times = resolutionTimes.map(t => t.resolutionMinutes);
  const sum = times.reduce((a, b) => a + b, 0);
  const average = Math.round(sum / times.length);
  const median = times[Math.floor(times.length / 2)];
  const p90Index = Math.floor(times.length * 0.9);
  const percentile90 = times[p90Index] || times[times.length - 1];

  // تحليل حسب الأولوية
  const byPriority = {};
  for (const priority of Object.values(TICKET_CONSTANTS.PRIORITY)) {
    const priorityTimes = resolutionTimes
      .filter(t => t.priority === priority)
      .map(t => t.resolutionMinutes);

    if (priorityTimes.length > 0) {
      const avgTime = Math.round(priorityTimes.reduce((a, b) => a + b, 0) / priorityTimes.length);
      const slaTarget = TICKET_CONSTANTS.SLA.RESOLUTION[priority];
      byPriority[priority] = {
        count: priorityTimes.length,
        averageMinutes: avgTime,
        slaTarget,
        withinSLA: Math.round(
          (priorityTimes.filter(t => t <= slaTarget).length / priorityTimes.length) * 100
        ),
      };
    }
  }

  return {
    total: resolutionTimes.length,
    averageMinutes: average,
    averageHours: Math.round((average / 60) * 10) / 10,
    medianMinutes: median,
    minMinutes: times[0],
    maxMinutes: times[times.length - 1],
    percentile90Minutes: percentile90,
    byPriority,
  };
}

// ========================================
// EXPORTS
// ========================================
module.exports = {
  TICKET_CONSTANTS,
  // SLA
  calculateTicketSLA,
  analyzeSLAPerformance,
  // Priority
  calculateTicketPriority,
  sortTicketsByUrgency,
  // Statistics
  calculateTicketStatistics,
  // Audit
  analyzeAuditLogs,
  validateAuditEntry,
  applyAuditRetentionPolicy,
  // Escalation
  identifyEscalationCandidates,
  // Analysis
  analyzeResolutionTimes,
};
