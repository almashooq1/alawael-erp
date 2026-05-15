'use strict';

/**
 * hr-performance.routes.js — مسارات تقييم الأداء الوظيفي
 *
 * Factory-function pattern matching existing HR routes (hr-ops, hr-dashboard).
 * All business logic delegated to HrPerformanceService.
 *
 * Mounted at: /api/v1/hr/performance
 *
 * Endpoints:
 *   GET    /evaluations              — list evaluations (paginated)
 *   GET    /evaluations/:id          — get single evaluation
 *   POST   /evaluations              — create draft evaluation [admin, hr_manager, manager]
 *   POST   /evaluations/:id/submit   — submit evaluator scores
 *   POST   /evaluations/:id/approve  — approve evaluation [admin, hr_manager]
 *   DELETE /evaluations/:id          — archive evaluation [admin, hr_manager]
 *   GET    /succession               — list succession plans
 *   POST   /succession               — create succession plan [admin, hr_manager]
 *   PATCH  /succession/:id           — update succession plan
 *   DELETE /succession/:id           — delete succession plan [admin]
 *   GET    /stats                    — performance dashboard stats
 */

const express = require('express');
const { authorize } = require('../../middleware/auth');
const safeError = require('../../utils/safeError');
const { HrPerformanceService } = require('../../services/hr/hrPerformanceService');

/**
 * @param {{ logger: object }} opts
 */
function createHrPerformanceRouter({ logger }) {
  const router = express.Router();

  // Lazy-load models inside the factory so missing models degrade gracefully
  let svc;
  function getService() {
    if (svc) return svc;
    const PerformanceEvaluation = require('../../models/PerformanceEvaluation');
    const SuccessionPlan = require('../../models/SuccessionPlan');
    svc = new HrPerformanceService({ PerformanceEvaluation, SuccessionPlan, logger });
    return svc;
  }

  /* ─── Performance Evaluations ─────────────────────────────── */

  // GET /evaluations
  router.get('/evaluations', async (req, res) => {
    try {
      const { employeeId, status, period, page, limit } = req.query;
      const branchId = req.branchId; // set by requireBranchAccess
      const result = await getService().listEvaluations({
        employeeId,
        status,
        period,
        page,
        limit,
        branchId,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      safeError(res, err, 'listing evaluations');
    }
  });

  // GET /evaluations/stats — must come BEFORE /:id
  router.get('/evaluations/stats', async (req, res) => {
    try {
      const branchId = req.branchId;
      const stats = await getService().getPerformanceStats({ branchId });
      res.json({ success: true, data: stats });
    } catch (err) {
      safeError(res, err, 'performance stats');
    }
  });

  // GET /evaluations/:id
  router.get('/evaluations/:id', async (req, res) => {
    try {
      const doc = await getService().getEvaluation(req.params.id);
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'fetching evaluation');
    }
  });

  // POST /evaluations
  router.post(
    '/evaluations',
    authorize(['admin', 'super_admin', 'hr_manager', 'manager']),
    async (req, res) => {
      try {
        const doc = await getService().createEvaluation(req.body, req.user?._id);
        res.status(201).json({ success: true, data: doc });
      } catch (err) {
        safeError(res, err, 'creating evaluation');
      }
    }
  );

  // POST /evaluations/:id/submit
  router.post('/evaluations/:id/submit', async (req, res) => {
    try {
      const { evaluationType, scores, comments, strengths, areasForImprovement } = req.body;
      if (!evaluationType) {
        return res.status(400).json({ success: false, message: 'نوع المقيّم مطلوب' });
      }
      const doc = await getService().submitEvaluation(req.params.id, {
        evaluatorId: req.user?._id,
        evaluationType,
        scores,
        comments,
        strengths,
        areasForImprovement,
      });
      res.json({ success: true, data: doc });
    } catch (err) {
      safeError(res, err, 'submitting evaluation');
    }
  });

  // POST /evaluations/:id/approve
  router.post(
    '/evaluations/:id/approve',
    authorize(['admin', 'super_admin', 'hr_manager']),
    async (req, res) => {
      try {
        const doc = await getService().approveEvaluation(req.params.id, req.user?._id);
        res.json({ success: true, data: doc, message: 'تم اعتماد التقييم بنجاح' });
      } catch (err) {
        safeError(res, err, 'approving evaluation');
      }
    }
  );

  // DELETE /evaluations/:id
  router.delete(
    '/evaluations/:id',
    authorize(['admin', 'super_admin', 'hr_manager']),
    async (req, res) => {
      try {
        const result = await getService().deleteEvaluation(req.params.id);
        res.json({ success: true, ...result });
      } catch (err) {
        safeError(res, err, 'deleting evaluation');
      }
    }
  );

  /* ─── Succession Plans ────────────────────────────────────── */

  // GET /succession
  router.get('/succession', async (req, res) => {
    try {
      const { status, department, page, limit } = req.query;
      const result = await getService().listSuccessionPlans({ status, department, page, limit });
      res.json({ success: true, ...result });
    } catch (err) {
      safeError(res, err, 'listing succession plans');
    }
  });

  // POST /succession
  router.post(
    '/succession',
    authorize(['admin', 'super_admin', 'hr_manager']),
    async (req, res) => {
      try {
        const doc = await getService().createSuccessionPlan(req.body);
        res.status(201).json({ success: true, data: doc });
      } catch (err) {
        safeError(res, err, 'creating succession plan');
      }
    }
  );

  // PATCH /succession/:id
  router.patch(
    '/succession/:id',
    authorize(['admin', 'super_admin', 'hr_manager']),
    async (req, res) => {
      try {
        const doc = await getService().updateSuccessionPlan(req.params.id, req.body);
        res.json({ success: true, data: doc });
      } catch (err) {
        safeError(res, err, 'updating succession plan');
      }
    }
  );

  // DELETE /succession/:id
  router.delete('/succession/:id', authorize(['admin', 'super_admin']), async (req, res) => {
    try {
      const result = await getService().deleteSuccessionPlan(req.params.id);
      res.json({ success: true, ...result });
    } catch (err) {
      safeError(res, err, 'deleting succession plan');
    }
  });

  /* ─── Dashboard Stats ─────────────────────────────────────── */

  // GET /stats
  router.get('/stats', async (req, res) => {
    try {
      const stats = await getService().getPerformanceStats({ branchId: req.branchId });
      res.json({ success: true, data: stats });
    } catch (err) {
      safeError(res, err, 'performance stats');
    }
  });

  return router;
}

module.exports = { createHrPerformanceRouter };
