/**
 * Workflow Statistics + Search — extracted from workflowEnhanced.routes.js.
 *
 * 3 endpoints (URLs unchanged externally):
 *   GET /stats/comprehensive
 *   GET /stats/workload
 *   GET /search
 */

'use strict';

const express = require('express');
const router = express.Router();

const {
  WorkflowDefinition,
  WorkflowInstance,
  TaskInstance,
} = require('../workflow/intelligent-workflow-engine');
const {
  WorkflowComment,
  WorkflowFavorite,
  WorkflowDelegation,
  WorkflowReminder,
  WorkflowWebhook,
  WorkflowTag,
} = require('../models/WorkflowEnhanced');

const { authenticateToken: authMiddleware } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

/** Get comprehensive workflow statistics */
router.get('/stats/comprehensive', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      totalDefinitions,
      activeDefinitions,
      totalInstancesAll,
      runningInstances,
      completedInstances30d,
      cancelledInstances30d,
      totalTasks,
      completedTasks30d,
      overdueTasks,
      avgCompletionTime,
      topCategories,
      weeklyTrend,
      delegationsActive,
      remindersActive,
      webhooksActive,
      totalComments,
      totalFavorites,
      totalTags,
    ] = await Promise.all([
      WorkflowDefinition.countDocuments({}),
      WorkflowDefinition.countDocuments({ status: 'active' }),
      WorkflowInstance.countDocuments({}),
      WorkflowInstance.countDocuments({ status: 'running' }),
      WorkflowInstance.countDocuments({
        status: 'completed',
        completedAt: { $gte: thirtyDaysAgo },
      }),
      WorkflowInstance.countDocuments({
        status: 'cancelled',
        completedAt: { $gte: thirtyDaysAgo },
      }),
      TaskInstance.countDocuments({}),
      TaskInstance.countDocuments({ status: 'completed', completedAt: { $gte: thirtyDaysAgo } }),
      TaskInstance.countDocuments({
        status: { $in: ['assigned', 'in_progress'] },
        'sla.violated': true,
      }),
      WorkflowInstance.aggregate([
        { $match: { status: 'completed', completedAt: { $exists: true } } },
        { $group: { _id: null, avg: { $avg: { $subtract: ['$completedAt', '$startedAt'] } } } },
      ]),
      WorkflowInstance.aggregate([
        {
          $lookup: {
            from: 'workflowdefinitions',
            localField: 'definition',
            foreignField: '_id',
            as: 'def',
          },
        },
        { $unwind: '$def' },
        { $group: { _id: '$def.category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 6 },
      ]),
      WorkflowInstance.aggregate([
        { $match: { createdAt: { $gte: sevenDaysAgo } } },
        {
          $group: {
            _id: { $dayOfWeek: '$createdAt' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      WorkflowDelegation.countDocuments({ status: 'active' }),
      WorkflowReminder.countDocuments({ status: 'pending' }),
      WorkflowWebhook.countDocuments({ status: 'active' }),
      WorkflowComment.countDocuments({ isDeleted: false }),
      WorkflowFavorite.countDocuments({}),
      WorkflowTag.countDocuments({}),
    ]);

    res.json({
      success: true,
      data: {
        definitions: { total: totalDefinitions, active: activeDefinitions },
        instances: {
          total: totalInstancesAll,
          running: runningInstances,
          completed30d: completedInstances30d,
          cancelled30d: cancelledInstances30d,
        },
        tasks: {
          total: totalTasks,
          completed30d: completedTasks30d,
          overdue: overdueTasks,
        },
        avgCompletionTimeHours: avgCompletionTime[0]
          ? Math.round(avgCompletionTime[0].avg / 3600000)
          : null,
        topCategories,
        weeklyTrend,
        enhanced: {
          activeDelegations: delegationsActive,
          pendingReminders: remindersActive,
          activeWebhooks: webhooksActive,
          totalComments,
          totalFavorites,
          totalTags,
        },
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'حدث خطأ في الإحصائيات', error: safeError(error) });
  }
});

/** Get workload distribution */
router.get('/stats/workload', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const workload = await TaskInstance.aggregate([
      { $match: { status: { $in: ['assigned', 'in_progress'] } } },
      {
        $group: {
          _id: '$assignee',
          total: { $sum: 1 },
          inProgress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          assigned: { $sum: { $cond: [{ $eq: ['$status', 'assigned'] }, 1, 0] } },
          overdue: { $sum: { $cond: ['$sla.violated', 1, 0] } },
          urgent: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $ne: ['$sla.deadline', null] },
                    { $lte: ['$sla.deadline', new Date(Date.now() + 24 * 60 * 60 * 1000)] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          userId: '$_id',
          name: '$user.name',
          total: 1,
          inProgress: 1,
          assigned: 1,
          overdue: 1,
          urgent: 1,
        },
      },
      { $sort: { total: -1 } },
    ]);

    res.json({ success: true, data: workload });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Global search across workflows */
router.get('/search', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { q, type = 'all', page = 1, limit = 20 } = req.query;
    if (typeof q !== 'string' || q.length < 2) {
      return res
        .status(400)
        .json({ success: false, message: 'كلمة البحث يجب أن تكون حرفين على الأقل' });
    }

    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const results = { definitions: [], instances: [], tasks: [] };
    const skip = (page - 1) * limit;

    if (type === 'all' || type === 'definitions') {
      results.definitions = await WorkflowDefinition.find({
        $or: [{ name: regex }, { nameAr: regex }, { code: regex }, { description: regex }],
      })
        .select('name nameAr code category status')
        .limit(+limit)
        .skip(skip)
        .lean();
    }

    if (type === 'all' || type === 'instances') {
      results.instances = await WorkflowInstance.find({
        $or: [{ title: regex }, { businessKey: regex }, { tags: regex }],
      })
        .populate('definition', 'name nameAr')
        .select('title status priority currentStep tags')
        .limit(+limit)
        .skip(skip)
        .lean();
    }

    if (type === 'all' || type === 'tasks') {
      results.tasks = await TaskInstance.find({
        $or: [{ name: regex }, { nameAr: regex }, { description: regex }],
      })
        .populate('workflowInstance', 'title')
        .select('name nameAr status assignee')
        .limit(+limit)
        .skip(skip)
        .lean();
    }

    const total = results.definitions.length + results.instances.length + results.tasks.length;

    res.json({ success: true, data: results, total });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

module.exports = router;
