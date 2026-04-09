/**
 * Workflow & Journey Routes — مسارات API لرحلة المستفيد ومحرك Workflow
 *
 * @module domains/workflow/routes/workflow.routes
 */

const express = require('express');
const router = express.Router();
const { journeyService } = require('../services/JourneyService');
const { workflowEngine } = require('../WorkflowEngine');

// ─── Helper ─────────────────────────────────────────────────────────────────

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function getUserId(req) {
  return req.user?._id || req.user?.id || req.headers['x-user-id'];
}

// ═════════════════════════════════════════════════════════════════════════════
// Journey Endpoints
// ═════════════════════════════════════════════════════════════════════════════

/**
 * POST /journey/start
 * بدء رحلة جديدة لمستفيد
 */
router.post(
  '/journey/start',
  asyncHandler(async (req, res) => {
    const { beneficiaryId, referralData } = req.body;
    if (!beneficiaryId) {
      return res.status(400).json({ success: false, message: 'معرّف المستفيد مطلوب' });
    }

    const result = await journeyService.startJourney({
      beneficiaryId,
      referralData,
      userId: getUserId(req),
      branchId: req.user?.branchId || req.body.branchId,
      organizationId: req.user?.organizationId || req.body.organizationId,
    });

    res.status(201).json({ success: true, data: result });
  })
);

/**
 * POST /journey/:episodeId/advance
 * نقل المستفيد للمرحلة التالية
 */
router.post(
  '/journey/:episodeId/advance',
  asyncHandler(async (req, res) => {
    const { toPhase, reason, context } = req.body;
    if (!toPhase) {
      return res.status(400).json({ success: false, message: 'المرحلة المطلوبة مفقودة' });
    }

    const result = await journeyService.advancePhase({
      episodeId: req.params.episodeId,
      toPhase,
      userId: getUserId(req),
      reason,
      context,
    });

    res.json({ success: true, data: result });
  })
);

/**
 * POST /journey/:episodeId/exception
 * تجاوز سريري (انتقال خارج القواعد)
 */
router.post(
  '/journey/:episodeId/exception',
  asyncHandler(async (req, res) => {
    const { toPhase, reason, approvedBy } = req.body;
    if (!toPhase || !reason) {
      return res.status(400).json({ success: false, message: 'المرحلة وسبب التجاوز مطلوبان' });
    }

    const result = await journeyService.exceptionAdvance({
      episodeId: req.params.episodeId,
      toPhase,
      userId: getUserId(req),
      reason,
      approvedBy,
    });

    res.json({ success: true, data: result });
  })
);

/**
 * GET /journey/:episodeId/status
 * حالة الرحلة الكاملة
 */
router.get(
  '/journey/:episodeId/status',
  asyncHandler(async (req, res) => {
    const status = await journeyService.getJourneyStatus(req.params.episodeId);
    if (!status) {
      return res.status(404).json({ success: false, message: 'الحلقة العلاجية غير موجودة' });
    }
    res.json({ success: true, data: status });
  })
);

/**
 * GET /journey/:episodeId/check-transition/:toPhase
 * التحقق من إمكانية الانتقال
 */
router.get(
  '/journey/:episodeId/check-transition/:toPhase',
  asyncHandler(async (req, res) => {
    const result = await journeyService.checkTransition(
      req.params.episodeId,
      req.params.toPhase,
      req.query
    );
    res.json({ success: true, data: result });
  })
);

// ═════════════════════════════════════════════════════════════════════════════
// Dashboard Endpoints
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /journey/dashboard/active
 * لوحة تحكم الرحلات النشطة
 */
router.get(
  '/journey/dashboard/active',
  asyncHandler(async (req, res) => {
    const data = await journeyService.getActiveJourneysDashboard({
      branchId: req.query.branchId || req.user?.branchId,
      limit: parseInt(req.query.limit) || 100,
    });
    res.json({ success: true, data });
  })
);

/**
 * GET /journey/analytics
 * تحليلات الرحلات
 */
router.get(
  '/journey/analytics',
  asyncHandler(async (req, res) => {
    const data = await journeyService.getJourneyAnalytics({
      branchId: req.query.branchId,
      from: req.query.from,
      to: req.query.to,
    });
    res.json({ success: true, data });
  })
);

// ═════════════════════════════════════════════════════════════════════════════
// Tasks Endpoints
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /tasks/my
 * مهام المستخدم الحالي
 */
router.get(
  '/tasks/my',
  asyncHandler(async (req, res) => {
    const data = await journeyService.getTaskDashboard(getUserId(req), {
      status: req.query.status,
      limit: parseInt(req.query.limit) || 50,
    });
    res.json({ success: true, data });
  })
);

/**
 * POST /tasks/:taskId/complete
 * إكمال مهمة
 */
router.post(
  '/tasks/:taskId/complete',
  asyncHandler(async (req, res) => {
    const task = await journeyService.completeTask(
      req.params.taskId,
      getUserId(req),
      req.body.notes,
      req.body.result
    );
    res.json({ success: true, data: task });
  })
);

/**
 * GET /tasks/overdue
 * المهام المتأخرة
 */
router.get(
  '/tasks/overdue',
  asyncHandler(async (req, res) => {
    const WorkflowTask = require('../models/WorkflowTask');
    const tasks = await WorkflowTask.getOverdueTasks(req.query.branchId || req.user?.branchId);
    res.json({ success: true, data: tasks });
  })
);

// ═════════════════════════════════════════════════════════════════════════════
// Workflow Meta Endpoints
// ═════════════════════════════════════════════════════════════════════════════

/**
 * GET /phases
 * جميع المراحل القياسية
 */
router.get(
  '/phases',
  asyncHandler(async (req, res) => {
    res.json({ success: true, data: workflowEngine.getAllPhases() });
  })
);

/**
 * GET /phases/:phase/transitions
 * الانتقالات الممكنة من مرحلة معينة
 */
router.get(
  '/phases/:phase/transitions',
  asyncHandler(async (req, res) => {
    const transitions = workflowEngine.getAvailableTransitions(req.params.phase);
    res.json({ success: true, data: transitions });
  })
);

module.exports = router;
