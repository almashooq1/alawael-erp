/**
 * Maintenance Issue Routes — مسارات مشاكل وعيوب الصيانة
 * Issue tracking, root cause analysis, resolution tracking
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const MaintenanceIssue = require('../models/MaintenanceIssue');
const logger = require('../utils/logger');
const { safeError } = require('../utils/safeError');
const { stripUpdateMeta } = require('../utils/sanitize');

/** GET /api/maintenance-issues — list issues */
router.get('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const {
      vehicle,
      status,
      severity,
      category,
      priority,
      isRecurring,
      page = 1,
      limit = 25,
    } = req.query;
    const filter = { ...branchFilter(req) };
    if (vehicle) filter.vehicle = vehicle;
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;
    if (isRecurring !== undefined) filter['quality.isRecurring'] = isRecurring === 'true';

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      MaintenanceIssue.find(filter)
        .populate('vehicle', 'plateNumber make model')
        .populate('reportedBy', 'name')
        .populate('diagnosis.diagnostician', 'name')
        .populate('resolution.assignedTechnician', 'name')
        .sort({ reportedDate: -1 })
        .skip(skip)
        .limit(Number(limit)),
      MaintenanceIssue.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, page: Number(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    safeError(res, err, 'maintenanceIssue list error');
  }
});

/** GET /api/maintenance-issues/stats — issue statistics */
router.get('/stats', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const scope = branchFilter(req);
    const stats = await MaintenanceIssue.aggregate([
      { $match: { ...scope } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          open: { $sum: { $cond: [{ $eq: ['$status', 'جديد'] }, 1, 0] } },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'قيد المعالجة'] }, 1, 0] } },
          completed: { $sum: { $cond: [{ $eq: ['$status', 'مكتمل'] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'حرجة'] }, 1, 0] } },
          recurring: { $sum: { $cond: [{ $eq: ['$quality.isRecurring', true] }, 1, 0] } },
          avgResolutionTime: { $avg: '$metrics.timeToResolution' },
        },
      },
    ]);
    const byCategory = await MaintenanceIssue.aggregate([
      { $match: { ...scope } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    res.json({ success: true, data: { summary: stats[0] || {}, byCategory } });
  } catch (err) {
    safeError(res, err, 'maintenanceIssue stats error');
  }
});

/** GET /api/maintenance-issues/:id — get single issue */
router.get('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const issue = await MaintenanceIssue.findOne({ _id: req.params.id, ...branchFilter(req) })
      .populate('vehicle')
      .populate('reportedBy', 'name email')
      .populate('diagnosis.diagnostician', 'name')
      .populate('resolution.assignedTechnician', 'name')
      .populate('relatedIssues', 'issueId title status')
      .populate('relatedTasks', 'taskId title status');
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    res.json({ success: true, data: issue });
  } catch (err) {
    safeError(res, err, 'maintenanceIssue get error');
  }
});

/** POST /api/maintenance-issues — create issue */
router.post('/', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const body = { ...req.body, reportedBy: req.body.reportedBy || req.user?._id || req.user?.id };
    if (req.branchScope && req.branchScope.branchId) {
      body.branchId = req.branchScope.branchId;
    }
    const issue = await MaintenanceIssue.create(body);
    res.status(201).json({ success: true, data: issue });
  } catch (err) {
    logger.error('maintenanceIssue create error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** PUT /api/maintenance-issues/:id — update issue */
router.put('/:id', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const issue = await MaintenanceIssue.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      stripUpdateMeta(req.body),
      {
        new: true,
        runValidators: true,
      }
    );
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    res.json({ success: true, data: issue });
  } catch (err) {
    logger.error('maintenanceIssue update error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** DELETE /api/maintenance-issues/:id — delete issue (admin) */
router.delete(
  '/:id',
  requireAuth,
  requireBranchAccess,
  requireRole(['admin']),
  async (req, res) => {
    try {
      const issue = await MaintenanceIssue.findOneAndDelete({
        _id: req.params.id,
        ...branchFilter(req),
      });
      if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
      res.json({ success: true, message: 'Issue deleted' });
    } catch (err) {
      safeError(res, err, 'maintenanceIssue delete error');
    }
  }
);

/** PATCH /api/maintenance-issues/:id/status — update issue status */
router.patch('/:id/status', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const { status } = req.body;
    const update = { status };
    if (status === 'قيد المعالجة') update.startedDate = new Date();
    if (status === 'مكتمل') {
      update.resolvedDate = new Date();
      update['resolution.successfullyClosed'] = true;
    }

    const issue = await MaintenanceIssue.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      update,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });

    // Log activity
    issue.activityLog.push({
      action: `Status changed to ${status}`,
      timestamp: new Date(),
      performedBy: req.user?.name || 'System',
    });
    await issue.save();

    res.json({ success: true, data: issue });
  } catch (err) {
    logger.error('maintenanceIssue status error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/maintenance-issues/:id/diagnosis — add diagnosis */
router.post('/:id/diagnosis', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const issue = await MaintenanceIssue.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      {
        diagnosis: {
          ...req.body,
          diagnostician: req.body.diagnostician || req.user?._id || req.user?.id,
          diagnosisDate: new Date(),
        },
      },
      { new: true }
    );
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    res.json({ success: true, data: issue });
  } catch (err) {
    logger.error('maintenanceIssue diagnosis error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

/** POST /api/maintenance-issues/:id/comments — add comment */
router.post('/:id/comments', requireAuth, requireBranchAccess, async (req, res) => {
  try {
    const issue = await MaintenanceIssue.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req) },
      {
        $push: {
          comments: {
            author: req.user?.name || req.body.author,
            text: req.body.text,
            timestamp: new Date(),
          },
        },
      },
      { new: true }
    );
    if (!issue) return res.status(404).json({ success: false, message: 'Issue not found' });
    res.json({ success: true, data: issue.comments[issue.comments.length - 1] });
  } catch (err) {
    logger.error('maintenanceIssue comment error:', err);
    res.status(400).json({ success: false, message: safeError(err) });
  }
});

module.exports = router;
