/**
 * Enhanced Workflow Routes — المسارات المتقدمة لنظام سير العمل
 *
 * الميزات الجديدة:
 * ─────────────────────────────────────────────────────
 *  1) التعليقات والنقاشات  (Comments & Discussion)
 *  2) المفضلة والمثبتات     (Favorites & Bookmarks)
 *  3) التفويض والنيابة       (Delegation & Out-of-Office)
 *  4) التذكيرات              (Reminders)
 *  5) Webhooks              (External Triggers)
 *  6) التقارير المحفوظة      (Saved Reports)
 *  7) الوسوم والتصنيفات      (Tags)
 *  8) سجل الإصدارات          (Version History)
 *  9) تفضيلات الإشعارات      (Notification Preferences)
 * 10) عرض التقويم             (Calendar View)
 * 11) 10 قوالب جديدة         (10 New Templates)
 * 12) العمليات المجمعة المتقدمة (Advanced Batch Ops)
 * ─────────────────────────────────────────────────────
 */

const express = require('express');
const _mongoose = require('mongoose');
const router = express.Router();

const {
  WorkflowDefinition,
  WorkflowInstance,
  TaskInstance,
  WorkflowAuditLog,
} = require('../workflow/intelligent-workflow-engine');

const {
  WorkflowComment,
  WorkflowFavorite,
  WorkflowDelegation,
  WorkflowReminder,
  WorkflowWebhook,
  WorkflowSavedReport,
  WorkflowTag,
  WorkflowVersion,
  WorkflowNotifPref,
} = require('../models/WorkflowEnhanced');

const { authenticateToken: authMiddleware } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

const uid = req => (req.user && (req.user.id || req.user._id)) || null;

// ════════════════════════════════════════════════════════════════════════════════
// 1) COMMENTS & DISCUSSION — extracted to ./workflowComments.routes.js
//    Sub-router mounted at the same prefix; URLs unchanged externally.
// ════════════════════════════════════════════════════════════════════════════════
router.use('/', require('./workflowComments.routes'));

// ════════════════════════════════════════════════════════════════════════════════
// 2) FAVORITES & BOOKMARKS — المفضلة والمثبتات
// ════════════════════════════════════════════════════════════════════════════════

/** List my favorites */
router.get('/favorites', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const userId = uid(req);
    const favorites = await WorkflowFavorite.find({ user: userId })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();

    // Expand references
    const expanded = await Promise.all(
      favorites.map(async fav => {
        let target = null;
        if (fav.targetType === 'definition') {
          target = await WorkflowDefinition.findById(fav.targetId)
            .select('name nameAr code category status')
            .lean();
        } else if (fav.targetType === 'instance') {
          target = await WorkflowInstance.findById(fav.targetId)
            .select('title status priority currentStep')
            .populate('definition', 'name nameAr')
            .lean();
        }
        return { ...fav, target };
      })
    );

    res.json({ success: true, data: expanded });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Toggle favorite */
router.post('/favorites/toggle', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { targetType, targetId, label, color } = req.body;
    const userId = uid(req);

    const existing = await WorkflowFavorite.findOne({ user: userId, targetType, targetId });
    if (existing) {
      await WorkflowFavorite.deleteOne({ _id: existing._id });
      return res.json({
        success: true,
        data: { isFavorite: false },
        message: 'تمت الإزالة من المفضلة',
      });
    }

    const fav = await WorkflowFavorite.create({
      user: userId,
      targetType,
      targetId,
      label,
      color,
    });
    res.status(201).json({
      success: true,
      data: { isFavorite: true, favorite: fav },
      message: 'تمت الإضافة للمفضلة',
    });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Check if favorited */
router.get(
  '/favorites/check/:targetType/:targetId',
  authMiddleware,
  requireBranchAccess,
  async (req, res) => {
    try {
      const exists = await WorkflowFavorite.exists({
        user: uid(req),
        targetType: req.params.targetType,
        targetId: req.params.targetId,
      });
      res.json({ success: true, data: { isFavorite: !!exists } });
    } catch (error) {
      safeError(res, error, 'workflowEnhanced');
    }
  }
);

/** Reorder favorites */
router.put('/favorites/reorder', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { items } = req.body; // [{id, sortOrder}]
    const ops = (items || []).map(i =>
      WorkflowFavorite.updateOne({ _id: i.id, user: uid(req) }, { sortOrder: i.sortOrder })
    );
    await Promise.all(ops);
    res.json({ success: true, message: 'تم إعادة الترتيب' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 3) DELEGATION & OUT-OF-OFFICE — extracted to ./workflowDelegations.routes.js
// ════════════════════════════════════════════════════════════════════════════════
router.use('/', require('./workflowDelegations.routes'));

// ════════════════════════════════════════════════════════════════════════════════
// 4) REMINDERS — التذكيرات
// ════════════════════════════════════════════════════════════════════════════════

/** List my reminders */
router.get('/reminders', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const reminders = await WorkflowReminder.find({ user: uid(req), status })
      .populate('workflowInstance', 'title status')
      .populate('taskInstance', 'name status')
      .sort({ reminderDate: 1 })
      .lean();
    res.json({ success: true, data: reminders });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Create reminder */
router.post('/reminders', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const {
      workflowInstance,
      taskInstance,
      reminderDate,
      isRecurring,
      recurringInterval,
      recurringHours,
      title,
      message,
      priority,
      channels,
    } = req.body;

    if (!reminderDate || !title) {
      return res.status(400).json({ success: false, message: 'التاريخ والعنوان مطلوبان' });
    }

    const reminder = await WorkflowReminder.create({
      workflowInstance,
      taskInstance,
      user: uid(req),
      reminderDate: new Date(reminderDate),
      isRecurring: isRecurring || false,
      recurringInterval,
      recurringHours,
      nextReminderDate: isRecurring ? new Date(reminderDate) : null,
      title,
      message,
      priority: priority || 'medium',
      channels: channels || ['in_app'],
      createdBy: uid(req),
    });

    res.status(201).json({ success: true, data: reminder, message: 'تم إنشاء التذكير' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Cancel reminder */
router.delete('/reminders/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    await WorkflowReminder.findOneAndUpdate(
      { _id: req.params.id, user: uid(req) },
      { status: 'cancelled' }
    );
    res.json({ success: true, message: 'تم إلغاء التذكير' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Process due reminders (cron-friendly) */
router.post('/reminders/process', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const now = new Date();
    const dueReminders = await WorkflowReminder.find({
      status: 'pending',
      reminderDate: { $lte: now },
    }).lean();

    let sent = 0;
    for (const reminder of dueReminders) {
      // Mark as sent (actual notification logic can be added)
      await WorkflowReminder.updateOne(
        { _id: reminder._id },
        {
          status: 'sent',
          sentAt: now,
          ...(reminder.isRecurring
            ? {
                status: 'pending',
                reminderDate: _getNextDate(reminder),
                nextReminderDate: _getNextDate(reminder),
              }
            : {}),
        }
      );
      sent++;
    }

    res.json({ success: true, data: { processed: sent } });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

function _getNextDate(reminder) {
  const d = new Date(reminder.reminderDate);
  if (reminder.recurringInterval === 'daily') d.setDate(d.getDate() + 1);
  else if (reminder.recurringInterval === 'weekly') d.setDate(d.getDate() + 7);
  else if (reminder.recurringInterval === 'custom_hours')
    d.setHours(d.getHours() + (reminder.recurringHours || 24));
  return d;
}

// ════════════════════════════════════════════════════════════════════════════════
// 5) WEBHOOKS — extracted to ./workflowWebhooks.routes.js
// ════════════════════════════════════════════════════════════════════════════════
router.use('/', require('./workflowWebhooks.routes'));

// ════════════════════════════════════════════════════════════════════════════════
// 6) SAVED REPORTS — التقارير المحفوظة
// ════════════════════════════════════════════════════════════════════════════════

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
      { new: true }
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

// ════════════════════════════════════════════════════════════════════════════════
// 7) TAGS — الوسوم والتصنيفات
// ════════════════════════════════════════════════════════════════════════════════

/** List all tags */
router.get('/tags', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { category } = req.query;
    const query = {};
    if (category) query.category = category;
    const tags = await WorkflowTag.find(query).sort({ usageCount: -1, name: 1 }).lean();
    res.json({ success: true, data: tags });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Create tag */
router.post('/tags', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const tag = await WorkflowTag.create({ ...req.body, createdBy: uid(req) });
    res.status(201).json({ success: true, data: tag });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'الوسم موجود بالفعل' });
    }
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Update tag */
router.put('/tags/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const tag = await WorkflowTag.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
    });
    if (!tag) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: tag });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Delete tag */
router.delete('/tags/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    await WorkflowTag.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم حذف الوسم' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Add tags to an instance */
router.post('/tags/assign/:instanceId', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { tags } = req.body; // Array of tag names
    const instance = await WorkflowInstance.findById(req.params.instanceId);
    if (!instance) return res.status(404).json({ success: false, message: 'المثيل غير موجود' });

    // Merge tags (avoid duplicates)
    const existing = instance.tags || [];
    const merged = [...new Set([...existing, ...(tags || [])])];
    instance.tags = merged;
    await instance.save();

    // Increment usage count
    await WorkflowTag.updateMany({ name: { $in: tags } }, { $inc: { usageCount: 1 } });

    res.json({ success: true, data: { tags: instance.tags } });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Remove tag from instance */
router.delete(
  '/tags/assign/:instanceId/:tagName',
  authMiddleware,
  requireBranchAccess,
  async (req, res) => {
    try {
      const instance = await WorkflowInstance.findById(req.params.instanceId);
      if (!instance) return res.status(404).json({ success: false, message: 'غير موجود' });

      instance.tags = (instance.tags || []).filter(t => t !== req.params.tagName);
      await instance.save();

      await WorkflowTag.updateOne({ name: req.params.tagName }, { $inc: { usageCount: -1 } });

      res.json({ success: true, data: { tags: instance.tags } });
    } catch (error) {
      safeError(res, error, 'workflowEnhanced');
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════════
// 8) VERSION HISTORY — سجل الإصدارات
// ════════════════════════════════════════════════════════════════════════════════

/** Get version history for a definition */
router.get('/versions/:definitionId', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const versions = await WorkflowVersion.find({ workflowDefinition: req.params.definitionId })
      .populate('createdBy', 'name')
      .sort({ version: -1 })
      .lean();
    res.json({ success: true, data: versions });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Get specific version snapshot */
router.get(
  '/versions/:definitionId/:version',
  authMiddleware,
  requireBranchAccess,
  async (req, res) => {
    try {
      const ver = await WorkflowVersion.findOne({
        workflowDefinition: req.params.definitionId,
        version: +req.params.version,
      })
        .populate('createdBy', 'name')
        .lean();
      if (!ver) return res.status(404).json({ success: false, message: 'الإصدار غير موجود' });
      res.json({ success: true, data: ver });
    } catch (error) {
      safeError(res, error, 'workflowEnhanced');
    }
  }
);

/** Create version snapshot manually */
router.post('/versions/:definitionId', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const def = await WorkflowDefinition.findById(req.params.definitionId).lean();
    if (!def) return res.status(404).json({ success: false, message: 'التعريف غير موجود' });

    const latestVer = await WorkflowVersion.findOne({ workflowDefinition: def._id })
      .sort({ version: -1 })
      .lean();
    const newVersion = (latestVer?.version || 0) + 1;

    const ver = await WorkflowVersion.create({
      workflowDefinition: def._id,
      version: newVersion,
      snapshot: def,
      changeLog: req.body.changeLog || '',
      changeType: req.body.changeType || 'steps_modified',
      createdBy: uid(req),
    });

    res.status(201).json({ success: true, data: ver });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Compare two versions */
router.get(
  '/versions/:definitionId/compare/:v1/:v2',
  authMiddleware,
  requireBranchAccess,
  async (req, res) => {
    try {
      const [ver1, ver2] = await Promise.all([
        WorkflowVersion.findOne({
          workflowDefinition: req.params.definitionId,
          version: +req.params.v1,
        }).lean(),
        WorkflowVersion.findOne({
          workflowDefinition: req.params.definitionId,
          version: +req.params.v2,
        }).lean(),
      ]);

      if (!ver1 || !ver2) {
        return res.status(404).json({ success: false, message: 'أحد الإصدارات غير موجود' });
      }

      // Simple diff: compare step counts, names, types
      const steps1 = ver1.snapshot.steps || [];
      const steps2 = ver2.snapshot.steps || [];

      const diff = {
        version1: { version: ver1.version, stepsCount: steps1.length, createdAt: ver1.createdAt },
        version2: { version: ver2.version, stepsCount: steps2.length, createdAt: ver2.createdAt },
        addedSteps: steps2
          .filter(s => !steps1.find(x => x.id === s.id))
          .map(s => ({ id: s.id, name: s.name })),
        removedSteps: steps1
          .filter(s => !steps2.find(x => x.id === s.id))
          .map(s => ({ id: s.id, name: s.name })),
        modifiedSteps: steps2
          .filter(s => {
            const orig = steps1.find(x => x.id === s.id);
            return orig && JSON.stringify(orig) !== JSON.stringify(s);
          })
          .map(s => ({ id: s.id, name: s.name })),
        settingsChanged:
          JSON.stringify(ver1.snapshot.settings) !== JSON.stringify(ver2.snapshot.settings),
      };

      res.json({ success: true, data: diff });
    } catch (error) {
      safeError(res, error, 'workflowEnhanced');
    }
  }
);

/** Restore a version */
router.post(
  '/versions/:definitionId/:version/restore',
  authMiddleware,
  requireBranchAccess,
  async (req, res) => {
    try {
      const ver = await WorkflowVersion.findOne({
        workflowDefinition: req.params.definitionId,
        version: +req.params.version,
      }).lean();
      if (!ver) return res.status(404).json({ success: false, message: 'الإصدار غير موجود' });

      // Backup current version first
      const currentDef = await WorkflowDefinition.findById(req.params.definitionId).lean();
      const latestVer = await WorkflowVersion.findOne({ workflowDefinition: currentDef._id })
        .sort({ version: -1 })
        .lean();

      await WorkflowVersion.create({
        workflowDefinition: currentDef._id,
        version: (latestVer?.version || 0) + 1,
        snapshot: currentDef,
        changeLog: `نسخة احتياطية قبل الاستعادة للإصدار ${ver.version}`,
        changeType: 'steps_modified',
        createdBy: uid(req),
      });

      // Restore
      const { _id, __v, _createdAt, _updatedAt, ...restoreData } = ver.snapshot;
      await WorkflowDefinition.findByIdAndUpdate(req.params.definitionId, {
        ...restoreData,
        updatedBy: uid(req),
      });

      res.json({ success: true, message: `تم استعادة الإصدار ${ver.version}` });
    } catch (error) {
      safeError(res, error, 'workflowEnhanced');
    }
  }
);

// ════════════════════════════════════════════════════════════════════════════════
// 9) NOTIFICATION PREFERENCES — تفضيلات الإشعارات
// ════════════════════════════════════════════════════════════════════════════════

/** Get my notification preferences */
router.get('/notification-prefs', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    let prefs = await WorkflowNotifPref.findOne({ user: uid(req) }).lean();
    if (!prefs) {
      // Return defaults
      prefs = { enabled: true, events: {}, digestEnabled: false, quietHoursEnabled: false };
    }
    res.json({ success: true, data: prefs });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Update notification preferences */
router.put('/notification-prefs', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const prefs = await WorkflowNotifPref.findOneAndUpdate(
      { user: uid(req) },
      { ...req.body, user: uid(req) },
      { new: true, upsert: true }
    );
    res.json({ success: true, data: prefs, message: 'تم تحديث تفضيلات الإشعارات' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 10) CALENDAR VIEW — عرض التقويم
// ════════════════════════════════════════════════════════════════════════════════

/** Get calendar events (tasks + instance deadlines) */
router.get('/calendar', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const userId = uid(req);
    const { start, end, _view = 'month' } = req.query;

    const startDate = start ? new Date(start) : new Date(new Date().setDate(1));
    const endDate = end
      ? new Date(end)
      : new Date(new Date(startDate).setMonth(startDate.getMonth() + 1));

    // My tasks with deadlines
    const tasks = await TaskInstance.find({
      assignee: userId,
      status: { $in: ['assigned', 'in_progress'] },
      $or: [
        { 'sla.deadline': { $gte: startDate, $lte: endDate } },
        { createdAt: { $gte: startDate, $lte: endDate } },
      ],
    })
      .populate({
        path: 'workflowInstance',
        select: 'title definition',
        populate: { path: 'definition', select: 'name nameAr category' },
      })
      .lean();

    // Instance deadlines
    const instances = await WorkflowInstance.find({
      $and: [
        { $or: [{ requester: userId }, { currentAssignee: userId }] },
        {
          $or: [
            { 'sla.deadline': { $gte: startDate, $lte: endDate } },
            { dueDate: { $gte: startDate, $lte: endDate } },
          ],
        },
      ],
      status: 'running',
    })
      .populate('definition', 'name nameAr category')
      .lean();

    // Reminders in range
    const reminders = await WorkflowReminder.find({
      user: userId,
      status: 'pending',
      reminderDate: { $gte: startDate, $lte: endDate },
    }).lean();

    // Build calendar events
    const events = [];

    tasks.forEach(t => {
      events.push({
        id: `task-${t._id}`,
        type: 'task',
        title: t.nameAr || t.name,
        date: t.sla?.deadline || t.createdAt,
        priority: t.action?.type === 'urgent' ? 'urgent' : 'medium',
        status: t.status,
        isOverdue: t.sla?.violated || false,
        workflowName:
          t.workflowInstance?.definition?.nameAr || t.workflowInstance?.definition?.name,
        category: t.workflowInstance?.definition?.category,
        taskId: t._id,
        instanceId: t.workflowInstance?._id,
      });
    });

    instances.forEach(inst => {
      const deadline = inst.sla?.deadline || inst.dueDate;
      if (deadline) {
        events.push({
          id: `instance-${inst._id}`,
          type: 'deadline',
          title: inst.title,
          date: deadline,
          priority: inst.priority,
          status: inst.status,
          isOverdue: inst.sla?.violated || false,
          workflowName: inst.definition?.nameAr || inst.definition?.name,
          category: inst.definition?.category,
          instanceId: inst._id,
        });
      }
    });

    reminders.forEach(r => {
      events.push({
        id: `reminder-${r._id}`,
        type: 'reminder',
        title: r.title,
        date: r.reminderDate,
        priority: r.priority,
        message: r.message,
      });
    });

    // Sort by date
    events.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Group by date for calendar view
    const grouped = {};
    events.forEach(e => {
      const day = new Date(e.date).toISOString().split('T')[0];
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(e);
    });

    res.json({
      success: true,
      data: {
        events,
        grouped,
        range: { start: startDate, end: endDate },
        summary: {
          totalEvents: events.length,
          tasks: events.filter(e => e.type === 'task').length,
          deadlines: events.filter(e => e.type === 'deadline').length,
          reminders: events.filter(e => e.type === 'reminder').length,
          overdue: events.filter(e => e.isOverdue).length,
        },
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'حدث خطأ في جلب التقويم', error: safeError(error) });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 11) EXTENDED TEMPLATES — extracted to ./workflowTemplates.routes.js
// ════════════════════════════════════════════════════════════════════════════════
router.use('/', require('./workflowTemplates.routes'));

// ════════════════════════════════════════════════════════════════════════════════
// 12) ADVANCED BATCH OPERATIONS — العمليات المجمعة المتقدمة
// ════════════════════════════════════════════════════════════════════════════════

/** Bulk reassign tasks */
router.post('/batch/reassign', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { taskIds, newAssignee, reason } = req.body;
    if (!taskIds?.length || !newAssignee) {
      return res.status(400).json({ success: false, message: 'المهام والمفوض إليه مطلوبان' });
    }

    const result = await TaskInstance.updateMany(
      { _id: { $in: taskIds }, status: { $in: ['assigned', 'in_progress'] } },
      { assignee: newAssignee, assignedAt: new Date() }
    );

    // Log audit
    for (const taskId of taskIds) {
      await WorkflowAuditLog.create({
        taskInstance: taskId,
        action: 'reassign',
        toAssignee: newAssignee,
        comment: reason || 'إعادة تعيين مجمعة',
        performedBy: uid(req),
      });
    }

    res.json({
      success: true,
      data: { modified: result.modifiedCount },
      message: 'تم إعادة التعيين بنجاح',
    });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Bulk cancel instances */
router.post('/batch/cancel-instances', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { instanceIds, reason } = req.body;
    if (!instanceIds?.length) {
      return res.status(400).json({ success: false, message: 'المثيلات مطلوبة' });
    }

    const result = await WorkflowInstance.updateMany(
      { _id: { $in: instanceIds }, status: { $in: ['running', 'suspended'] } },
      { status: 'cancelled', completedAt: new Date() }
    );

    // Cancel related tasks
    await TaskInstance.updateMany(
      {
        workflowInstance: { $in: instanceIds },
        status: { $in: ['pending', 'assigned', 'in_progress'] },
      },
      { status: 'cancelled' }
    );

    for (const instId of instanceIds) {
      await WorkflowAuditLog.create({
        workflowInstance: instId,
        action: 'cancel',
        comment: reason || 'إلغاء مجمع',
        performedBy: uid(req),
      });
    }

    res.json({
      success: true,
      data: { modified: result.modifiedCount },
      message: 'تم الإلغاء بنجاح',
    });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Bulk update task priority */
router.post('/batch/update-priority', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { instanceIds, priority } = req.body;
    if (!instanceIds?.length || !priority) {
      return res.status(400).json({ success: false, message: 'المثيلات والأولوية مطلوبان' });
    }

    const result = await WorkflowInstance.updateMany({ _id: { $in: instanceIds } }, { priority });

    res.json({ success: true, data: { modified: result.modifiedCount } });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Batch add tags to instances */
router.post('/batch/add-tags', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { instanceIds, tags } = req.body;
    if (!instanceIds?.length || !tags?.length) {
      return res.status(400).json({ success: false, message: 'المثيلات والوسوم مطلوبة' });
    }

    const result = await WorkflowInstance.updateMany(
      { _id: { $in: instanceIds } },
      { $addToSet: { tags: { $each: tags } } }
    );

    res.json({ success: true, data: { modified: result.modifiedCount } });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// 13) WORKFLOW STATISTICS ENHANCED — إحصائيات متقدمة
// ════════════════════════════════════════════════════════════════════════════════

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
    if (!q || q.length < 2) {
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
