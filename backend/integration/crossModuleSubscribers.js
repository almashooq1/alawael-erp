/**
 * Cross-Module Subscribers — المشتركون عبر الوحدات
 *
 * Wires domain events to their cross-module consumers, turning the
 * existing (unused) infrastructure into a live nervous system.
 *
 * Each subscriber reacts to events from one domain and triggers side
 * effects in another — creating a fully event-driven architecture
 * without tight coupling.
 *
 * Event flows implemented:
 *
 *  HR → Notification    : employee.hired          → Send welcome notification
 *  HR → Finance         : employee.terminated     → Initiate settlement
 *  HR → Attendance      : department.transferred  → Sync attendance records
 *
 *  Finance → Dashboard  : payment.received        → Update dashboard KPI
 *  Finance → Notification: budget.threshold_reached → Alert management
 *  Finance → Audit      : invoice.created         → Create audit trail
 *
 *  Medical → Dashboard  : therapy.session_completed → Update therapy KPIs
 *  Medical → Notification: risk.alert_raised       → Alert care team
 *
 *  Beneficiary → Medical: beneficiary.registered   → Create initial record
 *  Beneficiary → Notification: beneficiary.status_changed → Notify stakeholders
 *  Beneficiary → Dashboard: assessment.completed   → Update assessment KPIs
 *
 *  Attendance → HR      : absence.detected         → Flag for HR review
 *  Attendance → Payroll : employee.checked_out     → Log work hours
 *
 *  System → Security    : auth.permission_denied   → Security alert
 *  System → Monitoring  : system.error             → Error monitoring
 *
 * @module integration/crossModuleSubscribers
 */

'use strict';

const logger = console;

// Unified email service for email delivery in cross-module events
let emailManager;
try {
  const { emailManager: em } = require('../services/email');
  emailManager = em;
} catch {
  emailManager = null;
}

// User model for lookups
let User;
try {
  User = require('../models/User');
} catch {
  User = null;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Cross-Module Subscriber Definitions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Each subscriber is a { pattern, name, handler(event, context) } object.
 * The pattern uses NATS-style wildcards (some.* or some.>).
 */
function createSubscribers(integrationBus, moduleConnector) {
  const subscribers = [];

  // ─── HR → Notification: Welcome new employees ──────────────────────
  subscribers.push({
    name: 'hr:hired → notification:welcome',
    pattern: 'hr.employee.hired',
    handler: async event => {
      logger.info(`[CrossModule] New employee hired: ${event.payload.name} — sending welcome`);
      try {
        if (moduleConnector && moduleConnector.hasService('notification.send')) {
          await moduleConnector.invoke('notification.send', {
            type: 'welcome',
            recipientId: event.payload.employeeId,
            templateData: {
              name: event.payload.name,
              department: event.payload.department,
              position: event.payload.position,
              startDate: event.payload.startDate,
            },
          });
        }
      } catch (err) {
        logger.warn(`[CrossModule] Failed to send welcome notification:`, err.message);
      }
    },
  });

  // ─── HR → Finance: Settlement on termination ──────────────────────
  subscribers.push({
    name: 'hr:terminated → finance:settlement',
    pattern: 'hr.employee.terminated',
    handler: async event => {
      logger.info(
        `[CrossModule] Employee terminated: ${event.payload.employeeId} — initiating settlement`
      );
      try {
        await integrationBus.publish(
          'finance',
          'settlement.requested',
          {
            employeeId: event.payload.employeeId,
            reason: event.payload.reason,
            effectiveDate: event.payload.effectiveDate,
            settlementAmount: event.payload.settlementAmount,
            originEvent: event.id,
          },
          {
            metadata: {
              correlationId: event.metadata?.correlationId,
              causationId: event.id,
              source: 'cross-module-subscriber',
            },
          }
        );
      } catch (err) {
        logger.warn(`[CrossModule] Failed to initiate settlement:`, err.message);
      }
    },
  });

  // ─── HR → Attendance: Sync department transfers ────────────────────
  subscribers.push({
    name: 'hr:transferred → attendance:sync',
    pattern: 'hr.department.transferred',
    handler: async event => {
      logger.info(`[CrossModule] Department transfer: ${event.payload.employeeId}`);
      try {
        await integrationBus.publish('attendance', 'department.sync', {
          employeeId: event.payload.employeeId,
          toDepartment: event.payload.toDepartment,
          effectiveDate: event.payload.effectiveDate,
          originEvent: event.id,
        });
      } catch (err) {
        logger.warn(`[CrossModule] Failed to sync attendance:`, err.message);
      }
    },
  });

  // ─── Finance → Dashboard: Payment KPI update ──────────────────────
  subscribers.push({
    name: 'finance:payment → dashboard:kpi',
    pattern: 'finance.payment.received',
    handler: async event => {
      logger.info(
        `[CrossModule] Payment received: ${event.payload.paymentId} — updating dashboard`
      );
      try {
        await integrationBus.publish('dashboard', 'kpi.update', {
          module: 'finance',
          metric: 'payment_received',
          value: event.payload.amount,
          timestamp: event.metadata?.timestamp || new Date().toISOString(),
        });
      } catch (err) {
        logger.warn(`[CrossModule] Failed to update dashboard KPI:`, err.message);
      }
    },
  });

  // ─── Finance → Notification: Budget threshold alert ────────────────
  subscribers.push({
    name: 'finance:budget → notification:alert',
    pattern: 'finance.budget.threshold_reached',
    handler: async event => {
      logger.info(`[CrossModule] Budget threshold reached: ${event.payload.percentage}%`);
      try {
        if (moduleConnector && moduleConnector.hasService('notification.send')) {
          await moduleConnector.invoke('notification.send', {
            type: 'budget_alert',
            channel: 'push',
            priority: 'high',
            templateData: {
              departmentId: event.payload.departmentId,
              currentSpend: event.payload.currentSpend,
              budgetLimit: event.payload.budgetLimit,
              percentage: event.payload.percentage,
            },
          });
        }
      } catch (err) {
        logger.warn(`[CrossModule] Failed to send budget alert:`, err.message);
      }
    },
  });

  // ─── Finance → Audit: Invoice audit trail ──────────────────────────
  subscribers.push({
    name: 'finance:invoice → audit:trail',
    pattern: 'finance.invoice.created',
    handler: async event => {
      logger.info(`[CrossModule] Invoice created: ${event.payload.invoiceId} — audit trail`);
      try {
        await integrationBus.publish('system', 'audit.entry', {
          action: 'invoice.created',
          module: 'finance',
          entityType: 'invoice',
          entityId: event.payload.invoiceId,
          details: {
            amount: event.payload.amount,
            beneficiaryId: event.payload.beneficiaryId,
          },
          userId: event.metadata?.userId,
          correlationId: event.metadata?.correlationId,
        });
      } catch (err) {
        logger.warn(`[CrossModule] Failed to create audit trail:`, err.message);
      }
    },
  });

  // ─── Medical → Dashboard: Therapy session KPI ──────────────────────
  subscribers.push({
    name: 'medical:therapy → dashboard:kpi',
    pattern: 'medical.therapy.session_completed',
    handler: async event => {
      logger.info(`[CrossModule] Therapy session completed — updating KPI`);
      try {
        await integrationBus.publish('dashboard', 'kpi.update', {
          module: 'medical',
          metric: 'therapy_sessions',
          value: 1,
          sessionType: event.payload.sessionType,
          duration: event.payload.duration,
          timestamp: event.metadata?.timestamp || new Date().toISOString(),
        });
      } catch (err) {
        logger.warn(`[CrossModule] Failed to update therapy KPI:`, err.message);
      }
    },
  });

  // ─── Medical → Notification: Risk alert ────────────────────────────
  subscribers.push({
    name: 'medical:risk → notification:urgent',
    pattern: 'medical.risk.alert_raised',
    handler: async event => {
      logger.info(
        `[CrossModule] MEDICAL RISK ALERT: ${event.payload.riskType} for ${event.payload.beneficiaryId}`
      );
      try {
        if (moduleConnector && moduleConnector.hasService('notification.send')) {
          await moduleConnector.invoke('notification.send', {
            type: 'medical_risk_alert',
            channel: 'push',
            priority: 'critical',
            templateData: {
              beneficiaryId: event.payload.beneficiaryId,
              riskLevel: event.payload.riskLevel,
              riskType: event.payload.riskType,
              details: event.payload.details,
            },
          });
        }
      } catch (err) {
        logger.warn(`[CrossModule] Failed to send risk alert:`, err.message);
      }
    },
  });

  // ─── Beneficiary → Medical: Initial record creation ────────────────
  subscribers.push({
    name: 'beneficiary:registered → medical:init',
    pattern: 'beneficiary.beneficiary.registered',
    handler: async event => {
      logger.info(
        `[CrossModule] New beneficiary registered: ${event.payload.beneficiaryId} — creating medical record`
      );
      try {
        await integrationBus.publish('medical', 'record.init_requested', {
          beneficiaryId: event.payload.beneficiaryId,
          name: event.payload.name,
          type: event.payload.type,
          originEvent: event.id,
        });
      } catch (err) {
        logger.warn(`[CrossModule] Failed to initiate medical record:`, err.message);
      }
    },
  });

  // ─── Beneficiary → Notification: Status change notification ────────
  subscribers.push({
    name: 'beneficiary:status → notification:notify',
    pattern: 'beneficiary.beneficiary.status_changed',
    handler: async event => {
      logger.info(`[CrossModule] Beneficiary status changed: ${event.payload.beneficiaryId}`);
      try {
        if (moduleConnector && moduleConnector.hasService('notification.send')) {
          await moduleConnector.invoke('notification.send', {
            type: 'beneficiary_status_change',
            templateData: {
              beneficiaryId: event.payload.beneficiaryId,
              oldStatus: event.payload.oldStatus,
              newStatus: event.payload.newStatus,
              reason: event.payload.reason,
            },
          });
        }
      } catch (err) {
        logger.warn(`[CrossModule] Failed to send status notification:`, err.message);
      }
    },
  });

  // ─── Beneficiary → Dashboard: Assessment KPI ──────────────────────
  subscribers.push({
    name: 'beneficiary:assessment → dashboard:kpi',
    pattern: 'beneficiary.assessment.completed',
    handler: async event => {
      logger.info(`[CrossModule] Assessment completed — updating dashboard`);
      try {
        await integrationBus.publish('dashboard', 'kpi.update', {
          module: 'beneficiary',
          metric: 'assessments_completed',
          value: 1,
          assessmentType: event.payload.assessmentType,
          overallScore: event.payload.overallScore,
          timestamp: event.metadata?.timestamp || new Date().toISOString(),
        });
      } catch (err) {
        logger.warn(`[CrossModule] Failed to update assessment KPI:`, err.message);
      }
    },
  });

  // ─── Attendance → HR: Absence flag ─────────────────────────────────
  subscribers.push({
    name: 'attendance:absence → hr:flag',
    pattern: 'attendance.absence.detected',
    handler: async event => {
      logger.info(`[CrossModule] Absence detected: ${event.payload.employeeId}`);
      try {
        await integrationBus.publish('hr', 'absence.flagged', {
          employeeId: event.payload.employeeId,
          date: event.payload.date,
          type: event.payload.type,
          originEvent: event.id,
        });
      } catch (err) {
        logger.warn(`[CrossModule] Failed to flag absence:`, err.message);
      }
    },
  });

  // ─── Attendance → Payroll: Work hours log ──────────────────────────
  subscribers.push({
    name: 'attendance:checkout → payroll:hours',
    pattern: 'attendance.employee.checked_out',
    handler: async event => {
      try {
        await integrationBus.publish('finance', 'workhours.logged', {
          employeeId: event.payload.employeeId,
          totalHours: event.payload.totalHours,
          date: event.payload.checkedOutAt,
          originEvent: event.id,
        });
      } catch (err) {
        logger.warn(`[CrossModule] Failed to log work hours:`, err.message);
      }
    },
  });

  // ─── System → Security: Permission denied alert ────────────────────
  subscribers.push({
    name: 'system:denied → security:alert',
    pattern: 'system.auth.permission_denied',
    handler: async event => {
      logger.info(
        `[CrossModule] SECURITY: Permission denied for ${event.payload.userId} on ${event.payload.resource}`
      );
      try {
        await integrationBus.publish('system', 'security.alert', {
          type: 'permission_denied',
          userId: event.payload.userId,
          resource: event.payload.resource,
          action: event.payload.action,
          ip: event.payload.ip,
          originEvent: event.id,
        });
      } catch (err) {
        logger.warn(`[CrossModule] Failed to create security alert:`, err.message);
      }
    },
  });

  // ─── System → Monitoring: Error aggregation ────────────────────────
  subscribers.push({
    name: 'system:error → monitoring:aggregate',
    pattern: 'system.error.*',
    handler: async event => {
      logger.error(
        `[CrossModule] SYSTEM ERROR in ${event.payload.module}: ${event.payload.message}`
      );
      // Error events are already persisted via the integration bus
      // This subscriber can be extended to push to external monitoring
    },
  });

  // ─── Leave → Payroll: Leave deduction notification ─────────────────
  subscribers.push({
    name: 'hr:leave → finance:deduct',
    pattern: 'hr.leave.approved',
    handler: async event => {
      logger.info(`[CrossModule] Leave approved for ${event.payload.employeeId}`);
      try {
        await integrationBus.publish('finance', 'leave.deduction_check', {
          employeeId: event.payload.employeeId,
          leaveType: event.payload.leaveType,
          startDate: event.payload.startDate,
          endDate: event.payload.endDate,
          originEvent: event.id,
        });
      } catch (err) {
        logger.warn(`[CrossModule] Failed to notify payroll of leave:`, err.message);
      }
    },
  });

  // ─── Salary → Finance: Salary budget impact ───────────────────────
  subscribers.push({
    name: 'hr:salary → finance:budget',
    pattern: 'hr.salary.changed',
    handler: async event => {
      logger.info(`[CrossModule] Salary changed for ${event.payload.employeeId}`);
      try {
        await integrationBus.publish('finance', 'salary.budget_impact', {
          employeeId: event.payload.employeeId,
          oldSalary: event.payload.oldSalary,
          newSalary: event.payload.newSalary,
          effectiveDate: event.payload.effectiveDate,
          monthlyDelta: event.payload.newSalary - event.payload.oldSalary,
          originEvent: event.id,
        });
      } catch (err) {
        logger.warn(`[CrossModule] Failed to notify finance of salary change:`, err.message);
      }
    },
  });

  // ═══════════════════════════════════════════════════════════════════════════
  //  EMAIL DELIVERY SUBSCRIBERS — Route domain events to email notifications
  // ═══════════════════════════════════════════════════════════════════════════

  // ─── HR → Email: Welcome email for new hires ──────────────────────
  subscribers.push({
    name: 'hr:hired → email:welcome',
    pattern: 'hr.employee.hired',
    handler: async event => {
      if (!emailManager || !event.payload.email) return;
      try {
        await emailManager.sendWelcome(event.payload.email, {
          fullName: event.payload.name,
          email: event.payload.email,
          department: event.payload.department,
          position: event.payload.position,
        });
        logger.info(`[CrossModule/Email] Welcome email sent to ${event.payload.name}`);
      } catch (err) {
        logger.warn(`[CrossModule/Email] Failed to send welcome email:`, err.message);
      }
    },
  });

  // ─── Finance → Email: Budget threshold alert ──────────────────────
  subscribers.push({
    name: 'finance:budget_alert → email:alert',
    pattern: 'finance.budget.threshold_reached',
    handler: async event => {
      if (!emailManager) return;
      const financeEmail = process.env.FINANCE_MANAGER_EMAIL;
      if (!financeEmail) return;
      try {
        await emailManager.sendAlert(financeEmail, {
          title: 'تنبيه: تجاوز حد الميزانية',
          message: `الميزانية "${event.payload.budgetName || ''}" وصلت إلى ${event.payload.percentage || 0}% من الحد المسموح. المبلغ المتبقي: ${event.payload.remaining || 0} ر.س`,
          severity: event.payload.percentage >= 100 ? 'critical' : 'high',
        });
        logger.info(`[CrossModule/Email] Budget alert sent`);
      } catch (err) {
        logger.warn(`[CrossModule/Email] Failed to send budget alert:`, err.message);
      }
    },
  });

  // ─── Medical → Email: Risk alert to care team ─────────────────────
  subscribers.push({
    name: 'medical:risk_alert → email:alert',
    pattern: 'medical.risk.alert_raised',
    handler: async event => {
      if (!emailManager) return;
      const careEmail = process.env.CARE_TEAM_EMAIL;
      if (!careEmail) return;
      try {
        await emailManager.sendAlert(careEmail, {
          title: 'تنبيه طبي عاجل',
          message: `تنبيه مخاطر للمستفيد: ${event.payload.beneficiaryName || 'غير محدد'} - النوع: ${event.payload.riskType || ''} - المستوى: ${event.payload.severity || 'متوسط'}`,
          severity: event.payload.severity || 'high',
        });
        logger.info(`[CrossModule/Email] Medical risk alert sent`);
      } catch (err) {
        logger.warn(`[CrossModule/Email] Failed to send medical risk alert:`, err.message);
      }
    },
  });

  // ─── Beneficiary → Email: Status change notification ──────────────
  subscribers.push({
    name: 'beneficiary:status → email:notification',
    pattern: 'beneficiary.status.changed',
    handler: async event => {
      if (!emailManager || !User) return;
      try {
        // Notify stakeholders about beneficiary status change
        const stakeholderIds = event.payload.stakeholderIds || [];
        for (const id of stakeholderIds.slice(0, 5)) {
          const user = await User.findById(id).select('email fullName').lean();
          if (user && user.email) {
            await emailManager.sendStatusChange(user.email, {
              fullName: user.fullName,
              itemType: 'مستفيد',
              itemName: event.payload.beneficiaryName || '',
              oldStatus: event.payload.oldStatus || '',
              newStatus: event.payload.newStatus || '',
              changedBy: event.payload.changedBy || 'النظام',
            });
          }
        }
        logger.info(`[CrossModule/Email] Beneficiary status emails sent`);
      } catch (err) {
        logger.warn(`[CrossModule/Email] Failed to send beneficiary status email:`, err.message);
      }
    },
  });

  // ─── System → Email: Critical error alerts ────────────────────────
  subscribers.push({
    name: 'system:error → email:alert',
    pattern: 'system.error.*',
    handler: async event => {
      if (!emailManager) return;
      const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.SYSTEM_ADMIN_EMAIL;
      if (!adminEmail) return;
      // Only alert on critical/fatal errors
      const severity = event.payload.severity || 'error';
      if (!['critical', 'fatal'].includes(severity)) return;
      try {
        await emailManager.sendAlert(adminEmail, {
          title: `خطأ حرج في النظام: ${event.payload.module || 'غير محدد'}`,
          message: `${event.payload.message || 'حدث خطأ حرج'}${event.payload.stack ? '\n\n' + event.payload.stack.slice(0, 500) : ''}`,
          severity: 'critical',
        });
        logger.info(`[CrossModule/Email] System error alert sent`);
      } catch (err) {
        logger.warn(`[CrossModule/Email] Failed to send system error alert:`, err.message);
      }
    },
  });

  // ─── Auth → Email: Account locked alert ───────────────────────────
  subscribers.push({
    name: 'auth:locked → email:alert',
    pattern: 'auth.account.locked',
    handler: async event => {
      if (!emailManager || !event.payload.email) return;
      try {
        await emailManager.sendAccountLocked(event.payload.email, {
          fullName: event.payload.fullName || event.payload.email,
          reason: event.payload.reason || 'تجاوز عدد المحاولات المسموح',
          lockDuration: event.payload.lockDuration || '30 دقيقة',
          ip: event.payload.ip || '',
        });
        logger.info(`[CrossModule/Email] Account locked email sent`);
      } catch (err) {
        logger.warn(`[CrossModule/Email] Failed to send account locked email:`, err.message);
      }
    },
  });

  return subscribers;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Bootstrap — Wire all subscribers to the integration bus
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Initialize all cross-module event subscriptions
 *
 * @param {Object} integrationBus  - SystemIntegrationBus instance
 * @param {Object} moduleConnector - ModuleConnector instance (optional)
 * @returns {Object} { subscriberCount, subscribers[] }
 */
function initializeCrossModuleSubscribers(integrationBus, moduleConnector = null) {
  if (!integrationBus) {
    logger.warn('[CrossModule] No integration bus — skipping subscriber initialization');
    return { subscriberCount: 0, subscribers: [] };
  }

  const subscribers = createSubscribers(integrationBus, moduleConnector);
  const registered = [];

  for (const sub of subscribers) {
    try {
      integrationBus.subscribe(sub.pattern, sub.handler);
      registered.push({ name: sub.name, pattern: sub.pattern });
      logger.info(`[CrossModule] ✓ Registered: ${sub.name}`);
    } catch (error) {
      logger.error(`[CrossModule] ✗ Failed to register ${sub.name}:`, error.message);
    }
  }

  logger.info(
    `[CrossModule] Initialized ${registered.length}/${subscribers.length} cross-module subscribers`
  );

  return {
    subscriberCount: registered.length,
    subscribers: registered,
  };
}

// ─── Module Exports ──────────────────────────────────────────────────────────

module.exports = {
  createSubscribers,
  initializeCrossModuleSubscribers,
};
