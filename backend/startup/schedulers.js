/**
 * startup/schedulers.js — Background schedulers & shutdown hooks
 * ═══════════════════════════════════════════════════════════════
 * Extracted from app.js for maintainability.
 *
 * Manages: AI Scheduler, SLA Scheduler, settings seed,
 *          and graceful shutdown hooks for timer-based services.
 */

const logger = require('../utils/logger');
const { registerShutdownHook } = require('../utils/gracefulShutdown');

/**
 * Start background schedulers and register shutdown hooks.
 * Skipped entirely in test environments.
 *
 * @param {object}  opts
 * @param {boolean} opts.isTestEnv
 */
function setupSchedulers({ isTestEnv }) {
  if (isTestEnv) return;

  // ── AI Scheduler — daily AI checks (prompt 20) ──────────────────────────
  try {
    const { startScheduler, stopScheduler } = require('../services/ai/aiScheduler');
    registerShutdownHook('AI Scheduler', stopScheduler);
    const aiSchedulerTimer = setTimeout(() => {
      startScheduler();
      logger.info(
        '✅ prompt_20 AI Scheduler started (daily checks at 06:00, monthly reports on 1st)'
      );
    }, 30000);
    if (aiSchedulerTimer.unref) aiSchedulerTimer.unref();
  } catch (err) {
    logger.warn('⚠️  AI Scheduler could not start', { error: err.message });
  }

  // ── SLA Scheduler — ticket SLA breach checks (prompt 22) ────────────────
  try {
    const { startSlaScheduler, stopSlaScheduler } = require('../services/ticketSlaScheduler');
    registerShutdownHook('SLA Scheduler', stopSlaScheduler);
    setTimeout(() => {
      startSlaScheduler();
      logger.info(
        '✅ prompt_22 SLA Scheduler started (every 15 min: response + resolution breach checks)'
      );
    }, 35000);
  } catch (err) {
    logger.warn('⚠️  SLA Scheduler could not start', { error: err.message });
  }

  // ── Shutdown hooks for timer-based services ──────────────────────────────
  const shutdownServices = [
    ['HealthCheck', () => require('../services/HealthCheck').shutdown()],
    ['CachingService', () => require('../services/cachingService').shutdown()],
    ['RealtimeDashboard', () => require('../services/realtimeDashboardService').shutdown()],
    ['BackupAnalytics', () => require('../services/backup-analytics.service').shutdown()],
    ['BackupPerformance', () => require('../services/backup-performance.service').shutdown()],
    ['BackupSync', () => require('../services/backup-sync.service').shutdown()],
    ['BackupSecurity', () => require('../services/backup-security.service').shutdown()],
    ['DatabaseMaintenance', () => require('../services/database-maintenance-service').stop()],
    ['DatabaseReplication', () => require('../services/database-replication-service').stop()],
  ];

  for (const [name, fn] of shutdownServices) {
    registerShutdownHook(name, async () => {
      try {
        await fn();
      } catch {
        /* service may not have been initialised — ignore */
      }
    });
  }

  // ── Settings seed — default settings initialization (prompt 24) ──────────
  setTimeout(async () => {
    try {
      const settingsService = require('../services/settingsService');
      await settingsService.seedDefaultSettings();
      logger.info('✅ prompt_24 Default settings seeded (GlobalSetting collection)');
    } catch (err) {
      logger.warn('⚠️  Settings seed failed', { error: err.message });
    }
  }, 40000);

  // ── QMS & Compliance bootstrap (Phase 13 C11) ───────────────────────────
  //
  // Wires Phase-13 services (ManagementReview, EvidenceVault,
  // ComplianceCalendar, ControlLibrary, HealthScoreAggregator) with
  // cross-service adapters, and starts two sweepers: evidence
  // retention + compliance-calendar alerts.
  //
  // Runs at +45s to ensure Mongo is connected and other bootstraps
  // have settled. Safe to skip if Mongo isn't ready — the
  // bootstrap returns null and we just move on.
  setTimeout(() => {
    try {
      const { bootstrapQualityCompliance } = require('./qualityComplianceBootstrap');
      const qms = bootstrapQualityCompliance({ logger, startSweepers: true });
      if (qms) {
        registerShutdownHook('QualityCompliance', qms.shutdown);
        logger.info('✅ Phase 13 QMS & Compliance stack online (sweepers running)');
      }
    } catch (err) {
      logger.warn('⚠️  QMS bootstrap failed', { error: err.message });
    }
  }, 45000);

  // ── Ops layer bootstrap (Phase 16 C1: SLA engine) ───────────────────────
  //
  // Wires the unified ops SLA engine. Runs at +50s, after QMS so the
  // qualityEventBus singleton is already seated — we reuse it as the
  // dispatcher so ops.* events flow through the same notification
  // router Phase 15 configured.
  setTimeout(() => {
    try {
      const { bootstrapOperations } = require('./operationsBootstrap');
      const ops = bootstrapOperations({ logger, startSchedulers: true });
      if (ops) {
        registerShutdownHook('Operations', ops.shutdown);
        logger.info('✅ Phase 16 Ops layer online (SLA engine ticking)');
      }
    } catch (err) {
      logger.warn('⚠️  Ops bootstrap failed', { error: err.message });
    }
  }, 50000);

  // ── Care Platform bootstrap (Phase 17 C1: CRM lead funnel) ──────────────
  //
  // Runs at +55s — after ops bootstrap seats the SLA engine singleton,
  // so the care services can inject it without an extra lookup.
  setTimeout(() => {
    try {
      const { bootstrapCare } = require('./careBootstrap');
      const care = bootstrapCare({ logger });
      if (care) {
        registerShutdownHook('Care', care.shutdown);
        logger.info('✅ Phase 17 Care Platform online (CRM lead funnel)');
      }
    } catch (err) {
      logger.warn('⚠️  Care bootstrap failed', { error: err.message });
    }
  }, 55000);

  // ── Phase 30 HR Workflow Engine scheduler ───────────────────────────────
  //
  // Runs the rule-driven HR workflow engine on a cron. Default cadence
  // is every 2 hours (override with `HR_WORKFLOW_CRON`). Set
  // `HR_WORKFLOW_DISABLED=true` to skip in dev/test. The engine itself
  // is built lazily on first call so a missing model degrades a single
  // rule rather than blocking the cron.
  setTimeout(() => {
    if (process.env.HR_WORKFLOW_DISABLED === 'true') {
      logger.info('[HrWorkflowScheduler] disabled via HR_WORKFLOW_DISABLED');
      return;
    }
    try {
      const { createHrWorkflowEngine } = require('../services/hr/hrWorkflowEngine');
      const { createHrWorkflowScheduler } = require('../services/hr/hrWorkflowScheduler');

      // Build models — match the route-side resolver in hr-workflow.routes.js
      const models = {};
      const tryModel = (key, path) => {
        try {
          models[key] = require(path);
        } catch (e) {
          logger.warn(`[HrWorkflowScheduler] model ${key} unavailable: ${e.message}`);
        }
      };
      tryModel('Employee', '../models/Employee');
      tryModel('LeaveRequest', '../models/LeaveRequest');
      tryModel('Grievance', '../models/HR/Grievance');
      tryModel('EmploymentContract', '../models/HR/EmploymentContract');
      tryModel('Certification', '../models/HR/Certification');
      tryModel('SmartAttendance', '../models/smart-attendance');
      tryModel('PerformanceEvaluation', '../models/PerformanceEvaluation');
      tryModel('User', '../models/user.model');

      let notifier = null;
      try {
        notifier = require('../services/unifiedNotifier');
      } catch {
        /* optional */
      }

      let auditLogger = null;
      try {
        const AuditLog = require('../models/AuditLog');
        auditLogger = {
          async log(entry) {
            // Translate the engine's natural shape ({action, entityType, ...})
            // into the canonical AuditLog schema ({eventType, eventCategory,
            // ...}). Without this translation the writes fail mongoose
            // validation silently — caught here previously and logged as
            // generic warnings, drowning the boot log.
            try {
              await AuditLog.create({
                eventType: entry.action || 'hr.workflow.rule_fired',
                eventCategory: 'hr',
                severity: entry.severity || 'info',
                status: 'success',
                action: entry.action || 'hr.workflow.rule_fired',
                resource: { type: entry.entityType, id: entry.entityId || null },
                metadata: entry.metadata || {},
                timestamp: new Date(),
              });
            } catch (e) {
              logger.warn('[HrWorkflowScheduler audit]', e.message);
            }
          },
        };
      } catch {
        /* optional */
      }

      const engine = createHrWorkflowEngine({ models, notifier, auditLogger, logger });

      let cron = null;
      try {
        cron = require('node-cron');
      } catch (e) {
        logger.warn(
          '[HrWorkflowScheduler] node-cron not installed, scheduler not started: ' + e.message
        );
        return;
      }

      const scheduler = createHrWorkflowScheduler({ engine, cron, logger });
      scheduler.start();
      registerShutdownHook('HrWorkflowScheduler', scheduler.stop);

      // Stash the running scheduler so /scheduler/status can surface
      // last-run summary without re-instantiating the engine.
      try {
        require('../services/hr/hrSchedulerRegistry').setScheduler(scheduler);
      } catch (e) {
        logger.warn('[HrWorkflowScheduler] registry write failed:', e.message);
      }

      logger.info('✅ Phase 30 HR Workflow scheduler ticking');
    } catch (err) {
      logger.warn('⚠️  HR Workflow scheduler failed to start', { error: err.message });
    }
  }, 60000);
}

module.exports = { setupSchedulers };
