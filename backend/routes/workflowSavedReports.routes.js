/**
 * Workflow Saved Reports — extracted from workflowEnhanced.routes.js.
 *
 * Sub-router mounted at the same prefix; URLs unchanged externally
 * (e.g. `/api/workflow-enhanced/reports`). 6 endpoints:
 *   GET    /reports
 *   GET    /reports/:id
 *   POST   /reports
 *   PUT    /reports/:id
 *   DELETE /reports/:id
 *   POST   /reports/:id/generate  ← 7 aggregation report types
 */

'use strict';

const express = require('express');
const router = express.Router();

const {
  WorkflowDefinition,
  WorkflowInstance,
  TaskInstance,
} = require('../workflow/intelligent-workflow-engine');
const { WorkflowSavedReport } = require('../models/WorkflowEnhanced');

const { authenticateToken: authMiddleware } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const uid = req => (req.user && (req.user.id || req.user._id)) || null;

/** List reports */
router.get('/reports', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const userId = uid(req);
    const reports = await WorkflowSavedReport.find({
      $or: [{ createdBy: userId }, { isPublic: true }, { sharedWith: userId }],
    })
      .populate('createdBy', 'name')
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ success: true, data: reports });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Get single report */
router.get('/reports/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const report = await WorkflowSavedReport.findById(req.params.id)
      .populate('createdBy', 'name')
      .populate('filters.assignees', 'name')
      .populate('filters.definitions', 'name nameAr')
      .lean();
    if (!report) return res.status(404).json({ success: false, message: 'التقرير غير موجود' });
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Create report */
router.post('/reports', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const report = await WorkflowSavedReport.create({
      ...req.body,
      createdBy: uid(req),
    });
    res.status(201).json({ success: true, data: report, message: 'تم حفظ التقرير' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Update report */
router.put('/reports/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const report = await WorkflowSavedReport.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { returnDocument: 'after' }
    );
    if (!report) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: report });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Delete report */
router.delete('/reports/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    await WorkflowSavedReport.findOneAndDelete({ _id: req.params.id, createdBy: uid(req) });
    res.json({ success: true, message: 'تم حذف التقرير' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Generate report data on-the-fly */
router.post('/reports/:id/generate', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const report = await WorkflowSavedReport.findById(req.params.id).lean();
    if (!report) return res.status(404).json({ success: false, message: 'غير موجود' });

    const { filters } = report;
    const instanceQuery = {};
    const taskQuery = {};
    if (filters?.dateRange?.start) {
      instanceQuery.createdAt = { $gte: new Date(filters.dateRange.start) };
      taskQuery.createdAt = { $gte: new Date(filters.dateRange.start) };
    }
    if (filters?.dateRange?.end) {
      instanceQuery.createdAt = {
        ...instanceQuery.createdAt,
        $lte: new Date(filters.dateRange.end),
      };
      taskQuery.createdAt = { ...taskQuery.createdAt, $lte: new Date(filters.dateRange.end) };
    }
    if (filters?.statuses?.length) instanceQuery.status = { $in: filters.statuses };
    if (filters?.priorities?.length) instanceQuery.priority = { $in: filters.priorities };
    if (filters?.categories?.length) {
      const defs = await WorkflowDefinition.find({ category: { $in: filters.categories } })
        .select('_id')
        .lean();
      instanceQuery.definition = { $in: defs.map(d => d._id) };
    }

    let data = {};
    switch (report.reportType) {
      case 'performance': {
        const [instances, tasks] = await Promise.all([
          WorkflowInstance.find(instanceQuery).lean(),
          TaskInstance.find(taskQuery).lean(),
        ]);
        const avgCompletion =
          instances
            .filter(i => i.completedAt && i.startedAt)
            .reduce((sum, i) => {
              return sum + (new Date(i.completedAt) - new Date(i.startedAt));
            }, 0) / (instances.filter(i => i.completedAt).length || 1);
        data = {
          totalInstances: instances.length,
          totalTasks: tasks.length,
          avgCompletionMs: Math.round(avgCompletion),
          avgCompletionHours: Math.round(avgCompletion / 3600000),
          completedInstances: instances.filter(i => i.status === 'completed').length,
          cancelledInstances: instances.filter(i => i.status === 'cancelled').length,
          errorInstances: instances.filter(i => i.status === 'error').length,
          completedTasks: tasks.filter(t => t.status === 'completed').length,
          overdueTasks: tasks.filter(t => t.sla?.violated).length,
        };
        break;
      }
      case 'sla_compliance': {
        const slaData = await WorkflowInstance.aggregate([
          { $match: { ...instanceQuery, 'sla.duration': { $exists: true, $gt: 0 } } },
          {
            $group: {
              _id: null,
              total: { $sum: 1 },
              violated: { $sum: { $cond: ['$sla.violated', 1, 0] } },
              avgDuration: { $avg: { $subtract: ['$completedAt', '$startedAt'] } },
            },
          },
        ]);
        data = {
          total: slaData[0]?.total || 0,
          violated: slaData[0]?.violated || 0,
          compliant: (slaData[0]?.total || 0) - (slaData[0]?.violated || 0),
          complianceRate:
            slaData[0]?.total > 0
              ? Math.round((1 - slaData[0].violated / slaData[0].total) * 100 * 10) / 10
              : 100,
          avgDurationHours: slaData[0]?.avgDuration
            ? Math.round(slaData[0].avgDuration / 3600000)
            : null,
        };
        break;
      }
      case 'task_distribution': {
        data = await TaskInstance.aggregate([
          { $match: taskQuery },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 },
            },
          },
        ]);
        break;
      }
      case 'bottleneck_analysis': {
        data = await TaskInstance.aggregate([
          { $match: { ...taskQuery, status: { $in: ['assigned', 'in_progress'] } } },
          {
            $group: {
              _id: '$name',
              waiting: { $sum: 1 },
              avgWait: { $avg: { $subtract: [new Date(), '$createdAt'] } },
              overdue: { $sum: { $cond: ['$sla.violated', 1, 0] } },
            },
          },
          { $sort: { waiting: -1 } },
          { $limit: 20 },
        ]);
        break;
      }
      case 'user_productivity': {
        data = await TaskInstance.aggregate([
          { $match: { ...taskQuery, status: 'completed' } },
          {
            $group: {
              _id: '$assignee',
              completed: { $sum: 1 },
              avgDuration: { $avg: { $subtract: ['$completedAt', '$createdAt'] } },
              onTime: { $sum: { $cond: [{ $ne: ['$sla.violated', true] }, 1, 0] } },
            },
          },
          { $sort: { completed: -1 } },
          { $limit: 20 },
          {
            $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' },
          },
          { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              name: '$user.name',
              completed: 1,
              avgDurationHours: { $divide: ['$avgDuration', 3600000] },
              onTime: 1,
              onTimeRate: {
                $cond: [
                  { $gt: ['$completed', 0] },
                  { $multiply: [{ $divide: ['$onTime', '$completed'] }, 100] },
                  100,
                ],
              },
            },
          },
        ]);
        break;
      }
      case 'category_breakdown': {
        data = await WorkflowInstance.aggregate([
          { $match: instanceQuery },
          {
            $lookup: {
              from: 'workflowdefinitions',
              localField: 'definition',
              foreignField: '_id',
              as: 'def',
            },
          },
          { $unwind: '$def' },
          {
            $group: {
              _id: '$def.category',
              total: { $sum: 1 },
              running: { $sum: { $cond: [{ $eq: ['$status', 'running'] }, 1, 0] } },
              completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
            },
          },
          { $sort: { total: -1 } },
        ]);
        break;
      }
      case 'trend_analysis': {
        data = await WorkflowInstance.aggregate([
          { $match: instanceQuery },
          {
            $group: {
              _id: {
                year: { $year: '$createdAt' },
                month: { $month: '$createdAt' },
              },
              started: { $sum: 1 },
              completed: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
              avgDuration: { $avg: { $subtract: ['$completedAt', '$startedAt'] } },
            },
          },
          { $sort: { '_id.year': 1, '_id.month': 1 } },
        ]);
        break;
      }
      default:
        data = { message: 'نوع التقرير غير مدعوم' };
    }

    // Update last generated
    await WorkflowSavedReport.updateOne({ _id: report._id }, { lastGeneratedAt: new Date() });

    res.json({ success: true, data, reportType: report.reportType, generatedAt: new Date() });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'حدث خطأ في توليد التقرير', error: safeError(error) });
  }
});

module.exports = router;
