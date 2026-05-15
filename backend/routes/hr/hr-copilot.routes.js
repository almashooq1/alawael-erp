'use strict';

/**
 * hr-copilot.routes.js — Phase 30 (Intelligent HR Platform).
 *
 * Exposes the LLM-backed HR Copilot over HTTP.
 *
 *   GET    /status                       — { available, model }
 *   POST   /summarize/:employeeId        — executive brief from real data
 *   POST   /draft-letter                 — bilingual letter draft
 *   POST   /q-and-a                      — policy Q&A bounded to supplied context
 *   POST   /suggest/:evaluationId        — coaching plan for a performance evaluation
 *
 * Mounted at /api/v1/hr/copilot. All routes require auth; sensitive routes
 * additionally require admin/hr_manager. Every call writes a `hr.copilot.*`
 * audit event so we can answer "who asked what" for compliance.
 */

const express = require('express');
const { authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');

const ADMIN_ROLES = ['admin', 'super_admin', 'hr_manager', 'manager'];

/**
 * @param {{ logger, copilot, auditLogger? }} opts
 */
function createHrCopilotRouter({ logger, copilot, auditLogger = null } = {}) {
  if (!copilot || typeof copilot.summarizeEmployee !== 'function') {
    throw new Error('hr-copilot.routes: copilot service is required');
  }

  const router = express.Router();

  // Lazy model loaders — degrade if a model isn't available.
  const loaders = {};
  function tryLoad(key, path) {
    try {
      loaders[key] = require(path);
    } catch (err) {
      logger.warn(`[hr-copilot] ${key} unavailable: ${err.message}`);
    }
  }
  tryLoad('Employee', '../../models/Employee');
  tryLoad('PerformanceEvaluation', '../../models/PerformanceEvaluation');
  tryLoad('AuditLog', '../../models/AuditLog');

  async function audit(action, req, metadata) {
    if (!auditLogger || typeof auditLogger.log !== 'function') return;
    try {
      await auditLogger.log({
        action,
        actorUserId: req.user?._id || req.user?.id,
        actorRole: req.user?.role || null,
        entityType: 'hr_copilot',
        ipAddress: req.ip,
        metadata,
      });
    } catch (err) {
      logger.warn('[hr-copilot] audit failed: ' + err.message);
    }
  }

  router.get('/status', (_req, res) => {
    try {
      res.json({ success: true, data: copilot.stats() });
    } catch (err) {
      safeError(res, err, 'hr-copilot status');
    }
  });

  router.post('/summarize/:employeeId', authorize(ADMIN_ROLES), async (req, res) => {
    try {
      const Employee = loaders.Employee;
      if (!Employee)
        return res.status(503).json({ success: false, message: 'Employee model unavailable' });

      const emp = await Employee.findById(req.params.employeeId).lean();
      if (!emp) return res.status(404).json({ success: false, message: 'employee not found' });

      // Build the input — pass through the body-supplied attendance/review
      // when the route caller has them in hand. Otherwise the copilot
      // operates on profile only.
      const result = await copilot.summarizeEmployee({
        employee: {
          jobTitle: emp.jobTitle ?? emp.position ?? null,
          department: emp.department ?? null,
          contractType: emp.contractType ?? null,
          hireDate: emp.hireDate ?? emp.hire_date ?? null,
          status: emp.status ?? null,
        },
        attendance: req.body?.attendance ?? null,
        lastReview: req.body?.lastReview ?? null,
      });

      await audit('hr.copilot.summarize_employee', req, {
        employeeId: String(emp._id),
        available: result.available,
        cached: !!result.cached,
        error: result.error || null,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      safeError(res, err, 'hr-copilot summarize');
    }
  });

  router.post(
    '/draft-letter',
    authorize(['admin', 'super_admin', 'hr_manager']),
    async (req, res) => {
      try {
        const { employeeId, kind, params = {} } = req.body || {};
        if (!employeeId || !kind) {
          return res
            .status(400)
            .json({ success: false, message: 'employeeId and kind are required' });
        }
        const Employee = loaders.Employee;
        const emp = Employee ? await Employee.findById(employeeId).lean() : null;
        if (!emp) return res.status(404).json({ success: false, message: 'employee not found' });

        const result = await copilot.draftLetter({
          kind,
          employee: {
            jobTitle: emp.jobTitle ?? emp.position ?? null,
            department: emp.department ?? null,
            hireDate: emp.hireDate ?? emp.hire_date ?? null,
          },
          params,
        });

        await audit('hr.copilot.draft_letter', req, {
          employeeId: String(emp._id),
          kind,
          available: result.available,
          error: result.error || null,
        });
        res.json({ success: true, data: result });
      } catch (err) {
        safeError(res, err, 'hr-copilot draftLetter');
      }
    }
  );

  router.post('/q-and-a', async (req, res) => {
    try {
      const { question, context = [], lang = 'ar' } = req.body || {};
      if (!question || typeof question !== 'string' || question.trim().length < 3) {
        return res
          .status(400)
          .json({ success: false, message: 'question is required (min 3 chars)' });
      }
      const result = await copilot.answerQuestion({ question, context, lang });
      await audit('hr.copilot.q_and_a', req, {
        questionLength: question.length,
        contextItems: Array.isArray(context) ? context.length : 0,
        available: result.available,
        confidence: result.data?.confidence ?? null,
        outOfScope: result.data?.outOfScope ?? null,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      safeError(res, err, 'hr-copilot qAndA');
    }
  });

  router.post('/suggest/:evaluationId', authorize(ADMIN_ROLES), async (req, res) => {
    try {
      const PerformanceEvaluation = loaders.PerformanceEvaluation;
      if (!PerformanceEvaluation) {
        return res
          .status(503)
          .json({ success: false, message: 'PerformanceEvaluation model unavailable' });
      }
      const ev = await PerformanceEvaluation.findById(req.params.evaluationId).lean();
      if (!ev) return res.status(404).json({ success: false, message: 'evaluation not found' });

      const result = await copilot.suggestImprovements({ evaluation: ev });
      await audit('hr.copilot.suggest', req, {
        evaluationId: String(ev._id),
        available: result.available,
        error: result.error || null,
      });
      res.json({ success: true, data: result });
    } catch (err) {
      safeError(res, err, 'hr-copilot suggest');
    }
  });

  return router;
}

module.exports = { createHrCopilotRouter };
