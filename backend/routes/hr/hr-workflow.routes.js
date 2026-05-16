'use strict';

/**
 * hr-workflow.routes.js — Phase 30 (Intelligent HR Platform).
 *
 * Surfaces the HR Workflow Automation Engine over HTTP.
 *
 *   GET    /rules                — list all known rules + their config
 *   POST   /run                  — execute every enabled rule once
 *   POST   /rules/:id/run        — execute a single rule
 *   POST   /dry-run              — evaluate without notifying/auditing
 *
 * Mounted at /api/v1/hr/workflow. All routes are admin/hr_manager only — the
 * engine fires real notifications and writes to AuditLog, so we keep access
 * tight.
 */

const express = require('express');
const { authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const { createHrWorkflowEngine } = require('../../services/hr/hrWorkflowEngine');

const ADMIN_ROLES = ['admin', 'super_admin', 'hr_manager'];

/**
 * @param {{ logger: object, notifier?: object, auditLogger?: object, config?: object }} opts
 */
function createHrWorkflowRouter({ logger, notifier = null, auditLogger = null, config = {} } = {}) {
  const router = express.Router();

  // Lazy DI — models are loaded on first request so a missing model degrades
  // the dependent rule without crashing the router at boot.
  let engine;
  let engineModels = null;
  let activeConfig = { ...config }; // merged: static config from factory + DB overrides

  function tryLoad(key, path) {
    try {
      return require(path);
    } catch (err) {
      logger.warn(`[hr-workflow] ${key} unavailable: ${err.message}`);
      return null;
    }
  }

  function loadEngineModels() {
    if (engineModels) return engineModels;
    engineModels = {};
    const set = (k, p) => {
      const m = tryLoad(k, p);
      if (m) engineModels[k] = m;
    };
    set('Employee', '../../models/Employee');
    set('LeaveRequest', '../../models/LeaveRequest');
    set('Grievance', '../../models/HR/Grievance');
    set('EmploymentContract', '../../models/HR/EmploymentContract');
    set('Certification', '../../models/HR/Certification');
    set('TrainingPlan', '../../models/HR/TrainingPlan');
    set('DisciplinaryAction', '../../models/HR/DisciplinaryAction');
    set('LeaveBalance', '../../models/LeaveBalance');
    set('PayrollRun', '../../models/HR/PayrollRun');
    set('SmartAttendance', '../../models/smart-attendance');
    set('PerformanceEvaluation', '../../models/PerformanceEvaluation');
    set('User', '../../models/user.model');
    return engineModels;
  }

  function buildEngine() {
    return createHrWorkflowEngine({
      models: loadEngineModels(),
      notifier,
      auditLogger,
      logger,
      config: activeConfig,
    });
  }

  function getEngine() {
    if (!engine) engine = buildEngine();
    return engine;
  }

  // Re-read DB overrides + rebuild the engine so the next call uses them.
  // Called from /config PATCH/DELETE; also exposed for tests.
  async function refreshEngineConfig() {
    const HrWorkflowRuleConfig = tryLoad(
      'HrWorkflowRuleConfig',
      '../../models/HR/HrWorkflowRuleConfig'
    );
    if (!HrWorkflowRuleConfig) return; // model not available — keep current
    try {
      const dbConfig = await HrWorkflowRuleConfig.loadAsConfigMap();
      activeConfig = { ...config, ...dbConfig };
      engine = buildEngine();
    } catch (err) {
      logger.warn(`[hr-workflow] config refresh failed: ${err.message}`);
    }
  }

  // Warm-up on first request — non-blocking on subsequent calls.
  let warmedUp = false;
  router.use(async (_req, _res, next) => {
    if (!warmedUp) {
      warmedUp = true;
      refreshEngineConfig().catch(err => logger.warn(`[hr-workflow] warmup: ${err.message}`));
    }
    next();
  });

  router.get('/rules', authorize(ADMIN_ROLES), async (_req, res) => {
    try {
      // Refresh DB config before listing so the UI reflects any change
      // an admin made via /config without waiting for the next cron tick.
      await refreshEngineConfig();
      const rules = getEngine().listRules();
      res.json({ success: true, data: rules });
    } catch (err) {
      safeError(res, err, 'hr-workflow listRules');
    }
  });

  // GET /config — every persisted rule override (sparse — rules without
  // overrides are absent from the response).
  router.get('/config', authorize(ADMIN_ROLES), async (_req, res) => {
    try {
      const HrWorkflowRuleConfig = tryLoad(
        'HrWorkflowRuleConfig',
        '../../models/HR/HrWorkflowRuleConfig'
      );
      if (!HrWorkflowRuleConfig) {
        return res.json({ success: true, data: { configs: {}, available: false } });
      }
      const configs = await HrWorkflowRuleConfig.loadAsConfigMap();
      res.json({ success: true, data: { configs, available: true } });
    } catch (err) {
      safeError(res, err, 'hr-workflow getConfig');
    }
  });

  // PATCH /config/:ruleId — upsert an override for a single rule.
  // Body: { enabled?: boolean, params?: object, notes?: string }
  router.patch('/config/:ruleId', authorize(ADMIN_ROLES), async (req, res) => {
    try {
      const HrWorkflowRuleConfig = tryLoad(
        'HrWorkflowRuleConfig',
        '../../models/HR/HrWorkflowRuleConfig'
      );
      if (!HrWorkflowRuleConfig) {
        return res
          .status(503)
          .json({ success: false, message: 'HrWorkflowRuleConfig model unavailable' });
      }

      const { ruleId } = req.params;
      const allowedRuleIds = getEngine()
        .listRules()
        .map(r => r.id);
      if (!allowedRuleIds.includes(ruleId)) {
        return res.status(404).json({ success: false, message: `unknown rule: ${ruleId}` });
      }

      const update = {};
      if (typeof req.body.enabled === 'boolean') update.enabled = req.body.enabled;
      if (
        req.body.params &&
        typeof req.body.params === 'object' &&
        !Array.isArray(req.body.params)
      ) {
        update.params = req.body.params;
      }
      if (typeof req.body.notes === 'string') update.notes = req.body.notes.slice(0, 500);
      update.updatedByUserId = req.user?._id || null;
      update.updatedByName = req.user?.name || req.user?.email || null;

      if (Object.keys(update).length <= 2) {
        return res
          .status(400)
          .json({ success: false, message: 'nothing to update (expected enabled and/or params)' });
      }

      const doc = await HrWorkflowRuleConfig.findOneAndUpdate(
        { ruleId },
        { $set: update },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      ).lean();

      // Bust the engine's in-memory config + refresh.
      await refreshEngineConfig();

      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'hr-workflow setConfig');
    }
  });

  // DELETE /config/:ruleId — remove the override (rule reverts to defaults).
  router.delete('/config/:ruleId', authorize(ADMIN_ROLES), async (req, res) => {
    try {
      const HrWorkflowRuleConfig = tryLoad(
        'HrWorkflowRuleConfig',
        '../../models/HR/HrWorkflowRuleConfig'
      );
      if (!HrWorkflowRuleConfig) {
        return res
          .status(503)
          .json({ success: false, message: 'HrWorkflowRuleConfig model unavailable' });
      }
      await HrWorkflowRuleConfig.deleteOne({ ruleId: req.params.ruleId });
      await refreshEngineConfig();
      res.json({ success: true, message: 'override cleared — rule reverts to defaults' });
    } catch (err) {
      safeError(res, err, 'hr-workflow deleteConfig');
    }
  });

  router.post('/run', authorize(ADMIN_ROLES), async (_req, res) => {
    try {
      const result = await getEngine().run();
      res.json({ success: true, data: result });
    } catch (err) {
      safeError(res, err, 'hr-workflow run');
    }
  });

  router.post('/dry-run', authorize(ADMIN_ROLES), async (_req, res) => {
    try {
      const result = await getEngine().dryRun();
      res.json({ success: true, data: result });
    } catch (err) {
      safeError(res, err, 'hr-workflow dryRun');
    }
  });

  router.post('/rules/:id/run', authorize(ADMIN_ROLES), async (req, res) => {
    try {
      const result = await getEngine().runRule(req.params.id);
      res.json({ success: true, data: result });
    } catch (err) {
      if (err.message && err.message.startsWith('unknown rule')) {
        return res.status(404).json({ success: false, message: err.message });
      }
      safeError(res, err, 'hr-workflow runRule');
    }
  });

  // GET /scheduler/status — surface the cron scheduler's last-run summary
  // + the next scheduled tick. Useful for "is the engine alive?" checks.
  router.get('/scheduler/status', authorize(ADMIN_ROLES), (_req, res) => {
    try {
      const registry = tryLoad('hrSchedulerRegistry', '../../services/hr/hrSchedulerRegistry');
      const scheduler = registry?.getScheduler ? registry.getScheduler() : null;
      if (!scheduler) {
        return res.json({
          success: true,
          data: {
            running: false,
            reason: 'scheduler not registered (boot order, or HR_WORKFLOW_DISABLED=true)',
          },
        });
      }
      const lastRun = scheduler.getLastRunSummary ? scheduler.getLastRunSummary() : null;
      res.json({
        success: true,
        data: {
          running: true,
          cronExpression: process.env.HR_WORKFLOW_CRON || '0 */2 * * *',
          lastRun,
        },
      });
    } catch (err) {
      safeError(res, err, 'hr-workflow scheduler/status');
    }
  });

  // GET /audit — paginated list of recent rule firings + scheduled runs
  // Surfaces the AuditLog rows the engine writes whenever a rule emits a
  // finding. Useful for the intelligence-center history view.
  router.get('/audit', authorize(ADMIN_ROLES), async (req, res) => {
    try {
      const AuditLog = (() => {
        try {
          return require('../../models/AuditLog');
        } catch {
          return null;
        }
      })();
      if (!AuditLog) {
        return res.json({ success: true, data: { items: [], total: 0 } });
      }

      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
      const skip = (page - 1) * limit;

      const filter = {
        eventType: {
          $in: [
            'hr.workflow.rule_fired',
            'hr.copilot.summarize_employee',
            'hr.copilot.draft_letter',
            'hr.copilot.q_and_a',
            'hr.copilot.suggest',
          ],
        },
      };

      if (
        req.query.severity &&
        ['low', 'medium', 'high', 'critical', 'info'].includes(req.query.severity)
      ) {
        filter.severity = req.query.severity;
      }
      if (req.query.kind === 'workflow') {
        filter.eventType = 'hr.workflow.rule_fired';
      } else if (req.query.kind === 'copilot') {
        filter.eventType = { $regex: /^hr\.copilot\./ };
      }
      if (req.query.ruleId) {
        filter['metadata.ruleId'] = req.query.ruleId;
      }
      if (req.query.since) {
        const d = new Date(req.query.since);
        if (!isNaN(d.getTime())) filter.timestamp = { $gte: d };
      }

      const [items, total] = await Promise.all([
        AuditLog.find(filter).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
        AuditLog.countDocuments(filter),
      ]);

      res.json({
        success: true,
        data: {
          items: items.map(d => ({
            _id: String(d._id),
            eventType: d.eventType,
            severity: d.severity,
            timestamp: d.timestamp,
            actorUserId: d.userId ? String(d.userId) : null,
            resource: d.resource || null,
            metadata: d.metadata || {},
          })),
          total,
          pagination: { page, pages: Math.ceil(total / limit), limit },
        },
      });
    } catch (err) {
      safeError(res, err, 'hr-workflow audit');
    }
  });

  return router;
}

module.exports = { createHrWorkflowRouter };
