/**
 * Domain Event Contracts — عقود الأحداث بين الأنظمة
 *
 * Type-safe event definitions that establish formal contracts
 * between domain modules. Every cross-module communication
 * MUST use a registered event contract.
 *
 * Each contract defines:
 *  - domain:       The owning domain
 *  - eventType:    Unique event identifier
 *  - version:      Schema version for backward compatibility
 *  - description:  Human-readable event purpose (Arabic + English)
 *  - payload:      Expected payload schema (field → type)
 *  - delivery:     Default routing strategy
 *  - priority:     Default priority level
 *  - consumers:    Which domains typically consume this event
 *
 * @module events/contracts/domainEventContracts
 */

'use strict';

const { DELIVERY, PRIORITY } = require('../../integration/systemIntegrationBus');

// ═══════════════════════════════════════════════════════════════════════════════
//  HR Domain Events — أحداث الموارد البشرية
// ═══════════════════════════════════════════════════════════════════════════════

const HR_EVENTS = {
  EMPLOYEE_HIRED: {
    domain: 'hr',
    eventType: 'employee.hired',
    version: 1,
    description: 'تم توظيف موظف جديد — New employee hired',
    payload: {
      employeeId: 'string',
      name: 'string',
      department: 'string',
      position: 'string',
      startDate: 'date',
      contractType: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['finance', 'notification', 'attendance', 'system'],
  },

  EMPLOYEE_TERMINATED: {
    domain: 'hr',
    eventType: 'employee.terminated',
    version: 1,
    description: 'تم إنهاء خدمات موظف — Employee terminated',
    payload: {
      employeeId: 'string',
      reason: 'string',
      effectiveDate: 'date',
      settlementAmount: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['finance', 'notification', 'payroll', 'system'],
  },

  LEAVE_REQUESTED: {
    domain: 'hr',
    eventType: 'leave.requested',
    version: 1,
    description: 'تم طلب إجازة — Leave request submitted',
    payload: {
      employeeId: 'string',
      leaveType: 'string',
      startDate: 'date',
      endDate: 'date',
      days: 'number',
    },
    delivery: [DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['notification', 'attendance'],
  },

  LEAVE_APPROVED: {
    domain: 'hr',
    eventType: 'leave.approved',
    version: 1,
    description: 'تمت الموافقة على إجازة — Leave approved',
    payload: {
      employeeId: 'string',
      leaveType: 'string',
      startDate: 'date',
      endDate: 'date',
      approvedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['finance', 'payroll', 'attendance', 'notification'],
  },

  SALARY_CHANGED: {
    domain: 'hr',
    eventType: 'salary.changed',
    version: 1,
    description: 'تم تعديل الراتب — Salary updated',
    payload: {
      employeeId: 'string',
      oldSalary: 'number',
      newSalary: 'number',
      effectiveDate: 'date',
      reason: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.CRITICAL,
    consumers: ['finance', 'payroll'],
  },

  DEPARTMENT_TRANSFERRED: {
    domain: 'hr',
    eventType: 'department.transferred',
    version: 1,
    description: 'تم نقل موظف بين الأقسام — Employee department transfer',
    payload: {
      employeeId: 'string',
      fromDepartment: 'string',
      toDepartment: 'string',
      effectiveDate: 'date',
    },
    delivery: [DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['notification', 'attendance', 'system'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Finance Domain Events — أحداث المالية
// ═══════════════════════════════════════════════════════════════════════════════

const FINANCE_EVENTS = {
  INVOICE_CREATED: {
    domain: 'finance',
    eventType: 'invoice.created',
    version: 1,
    description: 'تم إنشاء فاتورة — Invoice created',
    payload: {
      invoiceId: 'string',
      beneficiaryId: 'string',
      amount: 'number',
      currency: 'string',
      dueDate: 'date',
      items: 'array',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.CRITICAL,
    consumers: ['notification', 'accounting', 'reporting'],
  },

  PAYMENT_RECEIVED: {
    domain: 'finance',
    eventType: 'payment.received',
    version: 1,
    description: 'تم استلام دفعة — Payment received',
    payload: {
      paymentId: 'string',
      invoiceId: 'string',
      amount: 'number',
      method: 'string',
      receivedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.CRITICAL,
    consumers: ['notification', 'accounting', 'dashboard'],
  },

  EXPENSE_APPROVED: {
    domain: 'finance',
    eventType: 'expense.approved',
    version: 1,
    description: 'تمت الموافقة على مصروف — Expense approved',
    payload: {
      expenseId: 'string',
      amount: 'number',
      category: 'string',
      approvedBy: 'string',
      department: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['accounting', 'reporting', 'notification'],
  },

  BUDGET_THRESHOLD_REACHED: {
    domain: 'finance',
    eventType: 'budget.threshold_reached',
    version: 1,
    description: 'تم بلوغ حد الميزانية — Budget threshold reached',
    payload: {
      departmentId: 'string',
      budgetId: 'string',
      currentSpend: 'number',
      budgetLimit: 'number',
      percentage: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.CRITICAL,
    consumers: ['notification', 'dashboard', 'management'],
  },

  PAYROLL_PROCESSED: {
    domain: 'finance',
    eventType: 'payroll.processed',
    version: 1,
    description: 'تمت معالجة الرواتب — Payroll processed',
    payload: {
      payrollId: 'string',
      period: 'string',
      totalAmount: 'number',
      employeeCount: 'number',
      processedAt: 'date',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.CRITICAL,
    consumers: ['hr', 'notification', 'accounting', 'dashboard'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Beneficiary Domain Events — أحداث المستفيدين
// ═══════════════════════════════════════════════════════════════════════════════

const BENEFICIARY_EVENTS = {
  REGISTERED: {
    domain: 'beneficiary',
    eventType: 'beneficiary.registered',
    version: 1,
    description: 'تم تسجيل مستفيد جديد — Beneficiary registered',
    payload: {
      beneficiaryId: 'string',
      name: 'string',
      type: 'string',
      registeredBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['medical', 'finance', 'notification', 'dashboard'],
  },

  STATUS_CHANGED: {
    domain: 'beneficiary',
    eventType: 'beneficiary.status_changed',
    version: 1,
    description: 'تغيرت حالة المستفيد — Beneficiary status changed',
    payload: {
      beneficiaryId: 'string',
      oldStatus: 'string',
      newStatus: 'string',
      reason: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['medical', 'finance', 'notification'],
  },

  DISCHARGED: {
    domain: 'beneficiary',
    eventType: 'beneficiary.discharged',
    version: 1,
    description: 'تم تخريج المستفيد — Beneficiary discharged',
    payload: {
      beneficiaryId: 'string',
      dischargeDate: 'date',
      reason: 'string',
      followUpPlan: 'object',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['medical', 'finance', 'notification', 'reporting'],
  },

  ASSESSMENT_COMPLETED: {
    domain: 'beneficiary',
    eventType: 'assessment.completed',
    version: 1,
    description: 'تم إكمال التقييم — Assessment completed',
    payload: {
      beneficiaryId: 'string',
      assessmentId: 'string',
      assessmentType: 'string',
      overallScore: 'number',
      assessor: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['medical', 'rehabilitation', 'notification', 'dashboard'],
  },

  GOAL_ACHIEVED: {
    domain: 'beneficiary',
    eventType: 'goal.achieved',
    version: 1,
    description: 'تم تحقيق هدف علاجي — Therapy goal achieved',
    payload: {
      beneficiaryId: 'string',
      goalId: 'string',
      goalName: 'string',
      achievedDate: 'date',
    },
    delivery: [DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['medical', 'notification', 'dashboard'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Medical Domain Events — أحداث طبية
// ═══════════════════════════════════════════════════════════════════════════════

const MEDICAL_EVENTS = {
  RECORD_CREATED: {
    domain: 'medical',
    eventType: 'record.created',
    version: 1,
    description: 'تم إنشاء سجل طبي — Medical record created',
    payload: {
      recordId: 'string',
      beneficiaryId: 'string',
      recordType: 'string',
      createdBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['notification', 'reporting'],
  },

  THERAPY_SESSION_COMPLETED: {
    domain: 'medical',
    eventType: 'therapy.session_completed',
    version: 1,
    description: 'تم إكمال جلسة علاجية — Therapy session completed',
    payload: {
      sessionId: 'string',
      beneficiaryId: 'string',
      therapistId: 'string',
      sessionType: 'string',
      duration: 'number',
      outcome: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['beneficiary', 'finance', 'notification', 'dashboard'],
  },

  PRESCRIPTION_ISSUED: {
    domain: 'medical',
    eventType: 'prescription.issued',
    version: 1,
    description: 'تم صرف وصفة طبية — Prescription issued',
    payload: {
      prescriptionId: 'string',
      beneficiaryId: 'string',
      doctorId: 'string',
      medications: 'array',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['notification', 'inventory'],
  },

  RISK_ALERT_RAISED: {
    domain: 'medical',
    eventType: 'risk.alert_raised',
    version: 1,
    description: 'تم رفع تنبيه طبي — Medical risk alert raised',
    payload: {
      beneficiaryId: 'string',
      riskLevel: 'string',
      riskType: 'string',
      details: 'string',
      raisedBy: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.CRITICAL,
    consumers: ['notification', 'dashboard', 'management'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Attendance Domain Events — أحداث الحضور
// ═══════════════════════════════════════════════════════════════════════════════

const ATTENDANCE_EVENTS = {
  CHECKED_IN: {
    domain: 'attendance',
    eventType: 'employee.checked_in',
    version: 1,
    description: 'تم تسجيل حضور — Employee checked in',
    payload: {
      employeeId: 'string',
      checkedInAt: 'date',
      location: 'string',
      method: 'string',
    },
    delivery: [DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.LOW,
    consumers: ['hr', 'dashboard'],
  },

  CHECKED_OUT: {
    domain: 'attendance',
    eventType: 'employee.checked_out',
    version: 1,
    description: 'تم تسجيل انصراف — Employee checked out',
    payload: {
      employeeId: 'string',
      checkedOutAt: 'date',
      totalHours: 'number',
    },
    delivery: [DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.LOW,
    consumers: ['hr', 'payroll'],
  },

  ABSENCE_DETECTED: {
    domain: 'attendance',
    eventType: 'absence.detected',
    version: 1,
    description: 'تم رصد غياب — Absence detected',
    payload: {
      employeeId: 'string',
      date: 'date',
      type: 'string',
    },
    delivery: [DELIVERY.BROADCAST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['hr', 'notification', 'payroll'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Notification Domain Events — أحداث الإشعارات
// ═══════════════════════════════════════════════════════════════════════════════

const NOTIFICATION_EVENTS = {
  SENT: {
    domain: 'notification',
    eventType: 'notification.sent',
    version: 1,
    description: 'تم إرسال إشعار — Notification sent',
    payload: {
      notificationId: 'string',
      recipientId: 'string',
      channel: 'string',
      type: 'string',
      status: 'string',
    },
    delivery: [DELIVERY.LOCAL],
    priority: PRIORITY.LOW,
    consumers: ['analytics'],
  },

  DELIVERY_FAILED: {
    domain: 'notification',
    eventType: 'notification.delivery_failed',
    version: 1,
    description: 'فشل تسليم الإشعار — Notification delivery failed',
    payload: {
      notificationId: 'string',
      recipientId: 'string',
      channel: 'string',
      error: 'string',
      retryCount: 'number',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['monitoring'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  System Domain Events — أحداث النظام
// ═══════════════════════════════════════════════════════════════════════════════

const SYSTEM_EVENTS = {
  USER_LOGGED_IN: {
    domain: 'system',
    eventType: 'auth.logged_in',
    version: 1,
    description: 'تسجيل دخول — User logged in',
    payload: {
      userId: 'string',
      ip: 'string',
      userAgent: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.LOCAL],
    priority: PRIORITY.NORMAL,
    consumers: ['security', 'analytics'],
  },

  USER_LOGGED_OUT: {
    domain: 'system',
    eventType: 'auth.logged_out',
    version: 1,
    description: 'تسجيل خروج — User logged out',
    payload: {
      userId: 'string',
    },
    delivery: [DELIVERY.LOCAL],
    priority: PRIORITY.LOW,
    consumers: ['analytics'],
  },

  PERMISSION_DENIED: {
    domain: 'system',
    eventType: 'auth.permission_denied',
    version: 1,
    description: 'تم رفض صلاحية — Permission denied',
    payload: {
      userId: 'string',
      resource: 'string',
      action: 'string',
      ip: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.HIGH,
    consumers: ['security', 'notification', 'monitoring'],
  },

  ERROR_OCCURRED: {
    domain: 'system',
    eventType: 'system.error',
    version: 1,
    description: 'حدث خطأ في النظام — System error occurred',
    payload: {
      errorCode: 'string',
      message: 'string',
      stack: 'string',
      module: 'string',
      severity: 'string',
    },
    delivery: [DELIVERY.PERSIST, DELIVERY.REALTIME, DELIVERY.LOCAL],
    priority: PRIORITY.CRITICAL,
    consumers: ['monitoring', 'notification'],
  },

  CACHE_INVALIDATED: {
    domain: 'system',
    eventType: 'cache.invalidated',
    version: 1,
    description: 'تم مسح الكاش — Cache invalidated',
    payload: {
      keys: 'array',
      reason: 'string',
      module: 'string',
    },
    delivery: [DELIVERY.BROADCAST, DELIVERY.LOCAL],
    priority: PRIORITY.LOW,
    consumers: ['system'],
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Contract Registry — سجل العقود
// ═══════════════════════════════════════════════════════════════════════════════

const ALL_CONTRACTS = {
  hr: HR_EVENTS,
  finance: FINANCE_EVENTS,
  beneficiary: BENEFICIARY_EVENTS,
  medical: MEDICAL_EVENTS,
  attendance: ATTENDANCE_EVENTS,
  notification: NOTIFICATION_EVENTS,
  system: SYSTEM_EVENTS,
};

/**
 * Get a specific contract by domain.eventType
 */
function getContract(domain, eventType) {
  const domainContracts = ALL_CONTRACTS[domain];
  if (!domainContracts) return null;
  return Object.values(domainContracts).find(c => c.eventType === eventType) || null;
}

/**
 * Get all contracts for a domain
 */
function getDomainContracts(domain) {
  return ALL_CONTRACTS[domain] || null;
}

/**
 * List all event types across all domains
 */
function listAllEventTypes() {
  const types = [];
  for (const [domain, contracts] of Object.entries(ALL_CONTRACTS)) {
    for (const contract of Object.values(contracts)) {
      types.push({
        domain,
        eventType: contract.eventType,
        description: contract.description,
        priority: contract.priority,
        consumers: contract.consumers,
      });
    }
  }
  return types;
}

/**
 * Validate event payload against its contract
 */
function validatePayload(domain, eventType, payload) {
  const contract = getContract(domain, eventType);
  if (!contract) {
    return { valid: false, errors: [`No contract found for ${domain}.${eventType}`] };
  }

  const errors = [];
  for (const [field, expectedType] of Object.entries(contract.payload)) {
    if (payload[field] === undefined) {
      // Fields are recommended but not strictly required
      continue;
    }
    const actualType = Array.isArray(payload[field])
      ? 'array'
      : payload[field] instanceof Date
        ? 'date'
        : typeof payload[field];
    if (actualType !== expectedType && expectedType !== 'object') {
      errors.push(`Field "${field}" expected ${expectedType}, got ${actualType}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Get total counts per domain
 */
function getContractStats() {
  const stats = {};
  for (const [domain, contracts] of Object.entries(ALL_CONTRACTS)) {
    stats[domain] = Object.keys(contracts).length;
  }
  return {
    domains: Object.keys(ALL_CONTRACTS).length,
    totalEvents: Object.values(stats).reduce((s, n) => s + n, 0),
    perDomain: stats,
  };
}

// ─── Module Exports ──────────────────────────────────────────────────────────

module.exports = {
  // Domain-specific exports
  HR_EVENTS,
  FINANCE_EVENTS,
  BENEFICIARY_EVENTS,
  MEDICAL_EVENTS,
  ATTENDANCE_EVENTS,
  NOTIFICATION_EVENTS,
  SYSTEM_EVENTS,

  // Registry
  ALL_CONTRACTS,

  // Utilities
  getContract,
  getDomainContracts,
  listAllEventTypes,
  validatePayload,
  getContractStats,
};
