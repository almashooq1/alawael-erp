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
  function getEngine() {
    if (engine) return engine;
    const models = {};
    const tryModel = (key, path) => {
      try {
        models[key] = require(path);
      } catch (err) {
        logger.warn(`[hr-workflow] model ${key} unavailable: ${err.message}`);
      }
    };
    tryModel('Employee', '../../models/Employee');
    tryModel('LeaveRequest', '../../models/LeaveRequest');
    tryModel('Grievance', '../../models/HR/Grievance');
    tryModel('EmploymentContract', '../../models/HR/EmploymentContract');
    tryModel('SmartAttendance', '../../models/smart-attendance');
    tryModel('User', '../../models/user.model');

    engine = createHrWorkflowEngine({ models, notifier, auditLogger, logger, config });
    return engine;
  }

  router.get('/rules', authorize(ADMIN_ROLES), (_req, res) => {
    try {
      const rules = getEngine().listRules();
      res.json({ success: true, data: rules });
    } catch (err) {
      safeError(res, err, 'hr-workflow listRules');
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
