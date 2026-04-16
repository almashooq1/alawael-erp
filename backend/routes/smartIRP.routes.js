/**
 * Smart IRP Routes — مسارات خطة التأهيل الفردية الذكية
 * Manage Individual Rehabilitation Plans using SMART goals
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const SmartIRPService = require('../services/smartIRP.service');
const SmartIRP = require('../models/SmartIRP');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

// ── IRP CRUD ─────────────────────────────────────────────────────

/** GET /api/smart-irp — list IRPs (with pagination & filters) */
router.get('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { page = 1, limit = 20, status, beneficiary } = req.query;
    const skip = (page - 1) * limit;
    const filter = { ...branchFilter(req) };
    if (status) filter.status = status;
    if (beneficiary) filter.beneficiary = beneficiary;

    const [irps, total] = await Promise.all([
      SmartIRP.find(filter)
        .populate('beneficiary', 'name fileNumber')
        .populate('createdBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(+limit)
        .lean(),
      SmartIRP.countDocuments(filter),
    ]);
    res.json({ success: true, data: irps, total, page: +page, pages: Math.ceil(total / limit) });
  } catch (err) {
    safeError(res, err, 'smart-irp list error');
  }
});

/** GET /api/smart-irp/:id — get single IRP with full details */
router.get('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const irp = await SmartIRP.findOne({ _id: req.params.id, ...branchFilter(req) })
      .populate('beneficiary', 'name fileNumber dateOfBirth')
      .populate('createdBy', 'name')
      .populate('goals.assignedTo', 'name');
    if (!irp) return res.status(404).json({ success: false, message: 'IRP not found' });
    res.json({ success: true, data: irp });
  } catch (err) {
    safeError(res, err, 'smart-irp get error');
  }
});

/** POST /api/smart-irp — create new IRP */
router.post('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const body = { ...req.body };
    if (req.branchScope && req.branchScope.branchId) {
      body.branchId = req.branchScope.branchId;
    }
    const irp = await SmartIRPService.createIRP(body, req.user._id);
    res.status(201).json({ success: true, data: irp });
  } catch (err) {
    logger.error('smart-irp create error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** PUT /api/smart-irp/:id — update IRP metadata */
router.put('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const irp = await SmartIRP.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      stripUpdateMeta(req.body),
      { new: true, runValidators: true }
    );
    if (!irp) return res.status(404).json({ success: false, message: 'IRP not found' });
    res.json({ success: true, data: irp });
  } catch (err) {
    logger.error('smart-irp update error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** DELETE /api/smart-irp/:id — archive IRP */
router.delete(
  '/:id',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin', 'manager']),
  async (req, res) => {
    try {
      const irp = await SmartIRP.findOneAndUpdate(
        { _id: req.params.id, ...branchFilter(req) },
        { status: 'archived' },
        { new: true }
      );
      if (!irp) return res.status(404).json({ success: false, message: 'IRP not found' });
      res.json({ success: true, message: 'IRP archived', data: irp });
    } catch (err) {
      safeError(res, err, 'smart-irp archive error');
    }
  }
);

// ── Goals ────────────────────────────────────────────────────────

/** POST /api/smart-irp/:id/goals — add SMART goal to IRP */
router.post('/:id/goals', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const irp = await SmartIRPService.addGoal(req.params.id, req.body, req.user._id);
    res.status(201).json({ success: true, data: irp });
  } catch (err) {
    logger.error('smart-irp add-goal error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** PUT /api/smart-irp/:id/goals/:goalId/progress — update goal progress */
router.put('/:id/goals/:goalId/progress', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const irp = await SmartIRPService.updateGoalProgress(
      req.params.id,
      req.params.goalId,
      req.body,
      req.user._id
    );
    res.json({ success: true, data: irp });
  } catch (err) {
    logger.error('smart-irp goal-progress error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/smart-irp/:id/goals/validate — validate SMART goal (dry-run) */
router.post('/:id/goals/validate', requireAuth, requireBranchAccess, (req, res) => {
  try {
    const result = SmartIRPService.validateSMARTGoal(req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    logger.error('smart-irp validate-goal error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

// ── Assessment & Reports ─────────────────────────────────────────

/** POST /api/smart-irp/:id/assess — perform assessment */
router.post('/:id/assess', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const irp = await SmartIRPService.performAssessment(req.params.id, req.body, req.user._id);
    res.json({ success: true, data: irp });
  } catch (err) {
    logger.error('smart-irp assess error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** GET /api/smart-irp/:id/analytics — get IRP analytics */
router.get('/:id/analytics', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const analytics = await SmartIRPService.getAnalytics(req.params.id);
    res.json({ success: true, data: analytics });
  } catch (err) {
    safeError(res, err, 'smart-irp analytics error');
  }
});

/** GET /api/smart-irp/:id/family-report — generate family-friendly report */
router.get('/:id/family-report', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const irp = await SmartIRP.findOne({ _id: req.params.id, ...branchFilter(req) }).populate(
      'beneficiary'
    );
    if (!irp) return res.status(404).json({ success: false, message: 'IRP not found' });
    const report = await SmartIRPService.generateFamilyReport(irp);
    res.json({ success: true, data: report });
  } catch (err) {
    safeError(res, err, 'smart-irp family-report error');
  }
});

/** POST /api/smart-irp/:id/auto-review — trigger automatic review */
router.post(
  '/:id/auto-review',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin', 'manager']),
  async (req, res) => {
    try {
      const irp = await SmartIRPService.performAutoReview(req.params.id);
      res.json({ success: true, data: irp });
    } catch (err) {
      safeError(res, err, 'smart-irp auto-review error');
    }
  }
);

/** POST /api/smart-irp/scheduled-reviews — run all scheduled reviews (admin) */
router.post('/scheduled-reviews', requireAuth, requireRole(['admin']), async (req, res) => {
  try {
    const results = await SmartIRPService.runScheduledReviews();
    res.json({ success: true, data: results });
  } catch (err) {
    safeError(res, err, 'smart-irp scheduled-reviews error');
  }
});

module.exports = router;
