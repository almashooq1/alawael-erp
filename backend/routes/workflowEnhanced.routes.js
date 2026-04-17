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
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { validateOutboundUrl } = require('../utils/validateUrl');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

const uid = req => (req.user && (req.user.id || req.user._id)) || null;

// ════════════════════════════════════════════════════════════════════════════════
// 1) COMMENTS & DISCUSSION — التعليقات والنقاشات
// ════════════════════════════════════════════════════════════════════════════════

/** List comments for an instance */
router.get(
  '/comments/instance/:instanceId',
  authMiddleware,
  requireBranchAccess,
  async (req, res) => {
    try {
      const { page = 1, limit = 30 } = req.query;
      const query = { workflowInstance: req.params.instanceId, isDeleted: false, isReply: false };

      const [comments, total] = await Promise.all([
        WorkflowComment.find(query)
          .populate('author', 'name avatar')
          .populate('mentions', 'name')
          .populate({
            path: 'parentComment',
            select: 'content author',
            populate: { path: 'author', select: 'name' },
          })
          .sort({ isPinned: -1, createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(+limit)
          .lean(),
        WorkflowComment.countDocuments(query),
      ]);

      // Load replies for each comment
      const commentIds = comments.map(c => c._id);
      const replies = await WorkflowComment.find({
        parentComment: { $in: commentIds },
        isDeleted: false,
      })
        .populate('author', 'name avatar')
        .populate('mentions', 'name')
        .sort({ createdAt: 1 })
        .lean();

      const replyMap = {};
      replies.forEach(r => {
        const pid = r.parentComment.toString();
        if (!replyMap[pid]) replyMap[pid] = [];
        replyMap[pid].push(r);
      });

      const enriched = comments.map(c => ({
        ...c,
        replies: replyMap[c._id.toString()] || [],
        replyCount: (replyMap[c._id.toString()] || []).length,
      }));

      res.json({
        success: true,
        data: enriched,
        pagination: { page: +page, limit: +limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (error) {
      res
        .status(500)
        .json({ success: false, message: 'حدث خطأ في جلب التعليقات', error: safeError(error) });
    }
  }
);

/** List comments for a task */
router.get('/comments/task/:taskId', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const comments = await WorkflowComment.find({
      taskInstance: req.params.taskId,
      isDeleted: false,
    })
      .populate('author', 'name avatar')
      .populate('mentions', 'name')
      .sort({ isPinned: -1, createdAt: -1 })
      .lean();
    res.json({ success: true, data: comments });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Add a comment */
router.post('/comments', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const {
      workflowInstance,
      taskInstance,
      parentComment,
      content,
      contentType,
      mentions,
      attachments,
    } = req.body;
    if (!content || (!workflowInstance && !taskInstance)) {
      return res.status(400).json({ success: false, message: 'المحتوى والهدف مطلوبان' });
    }

    const comment = await WorkflowComment.create({
      workflowInstance,
      taskInstance,
      parentComment: parentComment || null,
      isReply: !!parentComment,
      content,
      contentType: contentType || 'text',
      mentions: mentions || [],
      attachments: attachments || [],
      author: uid(req),
    });

    const populated = await WorkflowComment.findById(comment._id)
      .populate('author', 'name avatar')
      .populate('mentions', 'name')
      .lean();

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'حدث خطأ في إضافة التعليق', error: safeError(error) });
  }
});

/** Edit a comment */
router.put('/comments/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const comment = await WorkflowComment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'التعليق غير موجود' });
    if (comment.author.toString() !== uid(req)?.toString()) {
      return res.status(403).json({ success: false, message: 'لا يمكنك تعديل هذا التعليق' });
    }

    comment.content = req.body.content || comment.content;
    comment.isEdited = true;
    comment.editedAt = new Date();
    if (req.body.mentions) comment.mentions = req.body.mentions;
    await comment.save();

    const populated = await WorkflowComment.findById(comment._id)
      .populate('author', 'name avatar')
      .lean();
    res.json({ success: true, data: populated });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Delete (soft) a comment */
router.delete('/comments/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const comment = await WorkflowComment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'التعليق غير موجود' });

    comment.isDeleted = true;
    await comment.save();
    res.json({ success: true, message: 'تم حذف التعليق' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Pin / unpin a comment */
router.post('/comments/:id/pin', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const comment = await WorkflowComment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'غير موجود' });
    comment.isPinned = !comment.isPinned;
    await comment.save();
    res.json({ success: true, data: { isPinned: comment.isPinned } });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Add reaction to a comment */
router.post('/comments/:id/react', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const { emoji } = req.body;
    const comment = await WorkflowComment.findById(req.params.id);
    if (!comment) return res.status(404).json({ success: false, message: 'غير موجود' });

    const userId = uid(req);
    const existing = comment.reactions.find(
      r => r.emoji === emoji && r.user?.toString() === userId?.toString()
    );
    if (existing) {
      comment.reactions.pull(existing._id);
    } else {
      comment.reactions.push({ emoji, user: userId });
    }
    await comment.save();
    res.json({ success: true, data: comment.reactions });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

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
// 3) DELEGATION & OUT-OF-OFFICE — التفويض والنيابة
// ════════════════════════════════════════════════════════════════════════════════

/** List my delegations (as delegator or delegate) */
router.get('/delegations', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const userId = uid(req);
    const { role = 'all', status } = req.query;
    const query = {};
    if (role === 'delegator') query.delegator = userId;
    else if (role === 'delegate') query.delegate = userId;
    else query.$or = [{ delegator: userId }, { delegate: userId }];
    if (status) query.status = status;

    const delegations = await WorkflowDelegation.find(query)
      .populate('delegator', 'name avatar')
      .populate('delegate', 'name avatar')
      .populate('workflowDefinitions', 'name nameAr')
      .sort({ startDate: -1 })
      .lean();

    res.json({ success: true, data: delegations });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Create delegation */
router.post('/delegations', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const userId = uid(req);
    const {
      delegate,
      scope,
      workflowDefinitions,
      categories,
      startDate,
      endDate,
      reason,
      reasonText,
      autoReplyEnabled,
      autoReplyMessage,
    } = req.body;

    if (!delegate || !startDate || !endDate) {
      return res
        .status(400)
        .json({ success: false, message: 'المفوض إليه وتاريخ البداية والنهاية مطلوبة' });
    }

    if (delegate === userId?.toString()) {
      return res.status(400).json({ success: false, message: 'لا يمكنك تفويض نفسك' });
    }

    // Check for overlapping active delegations
    const overlap = await WorkflowDelegation.findOne({
      delegator: userId,
      status: { $in: ['active', 'pending'] },
      $or: [{ startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } }],
    });
    if (overlap) {
      return res.status(400).json({ success: false, message: 'يوجد تفويض متداخل في نفس الفترة' });
    }

    const now = new Date();
    const start = new Date(startDate);
    const delegation = await WorkflowDelegation.create({
      delegator: userId,
      delegate,
      scope: scope || 'all',
      workflowDefinitions: workflowDefinitions || [],
      categories: categories || [],
      startDate: start,
      endDate: new Date(endDate),
      reason: reason || 'vacation',
      reasonText,
      autoReplyEnabled: autoReplyEnabled || false,
      autoReplyMessage,
      status: start <= now ? 'active' : 'pending',
      createdBy: userId,
    });

    const populated = await WorkflowDelegation.findById(delegation._id)
      .populate('delegator', 'name')
      .populate('delegate', 'name')
      .lean();

    res.status(201).json({ success: true, data: populated, message: 'تم إنشاء التفويض بنجاح' });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: 'حدث خطأ في إنشاء التفويض', error: safeError(error) });
  }
});

/** Cancel delegation */
router.post('/delegations/:id/cancel', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const delegation = await WorkflowDelegation.findById(req.params.id);
    if (!delegation) return res.status(404).json({ success: false, message: 'التفويض غير موجود' });

    delegation.status = 'cancelled';
    delegation.cancelledBy = uid(req);
    delegation.cancelledAt = new Date();
    await delegation.save();

    res.json({ success: true, message: 'تم إلغاء التفويض' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Get active delegation for a user (used by task assignment) */
router.get('/delegations/active/:userId', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const now = new Date();
    const delegation = await WorkflowDelegation.findOne({
      delegator: req.params.userId,
      status: 'active',
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .populate('delegate', 'name')
      .lean();

    res.json({ success: true, data: delegation });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Auto-activate/expire delegations (cron-friendly) */
router.post('/delegations/process', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const now = new Date();

    // Activate pending delegations whose start date has passed
    const activated = await WorkflowDelegation.updateMany(
      { status: 'pending', startDate: { $lte: now } },
      { status: 'active' }
    );

    // Expire active delegations whose end date has passed
    const expired = await WorkflowDelegation.updateMany(
      { status: 'active', endDate: { $lt: now } },
      { status: 'expired' }
    );

    res.json({
      success: true,
      data: { activated: activated.modifiedCount, expired: expired.modifiedCount },
    });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

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
// 5) WEBHOOKS — الربط الخارجي
// ════════════════════════════════════════════════════════════════════════════════

/** List webhooks */
router.get('/webhooks', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const webhooks = await WorkflowWebhook.find({})
      .limit(200)
      .populate('workflowDefinition', 'name nameAr')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: webhooks });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Get webhook by ID */
router.get('/webhooks/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const wh = await WorkflowWebhook.findById(req.params.id)
      .populate('workflowDefinition', 'name nameAr')
      .lean();
    if (!wh) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: wh });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Create webhook */
router.post('/webhooks', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    // SSRF protection: validate webhook URL
    if (req.body.url) {
      const urlCheck = validateOutboundUrl(req.body.url);
      if (!urlCheck.valid) {
        return res
          .status(422)
          .json({ success: false, message: `رابط غير مسموح: ${urlCheck.reason}` });
      }
    }
    const wh = await WorkflowWebhook.create({
      ...req.body,
      createdBy: uid(req),
    });
    res.status(201).json({ success: true, data: wh, message: 'تم إنشاء الـ Webhook' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Update webhook */
router.put('/webhooks/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    // SSRF protection: validate webhook URL if being updated
    if (req.body.url) {
      const urlCheck = validateOutboundUrl(req.body.url);
      if (!urlCheck.valid) {
        return res
          .status(422)
          .json({ success: false, message: `رابط غير مسموح: ${urlCheck.reason}` });
      }
    }
    const wh = await WorkflowWebhook.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
    });
    if (!wh) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({ success: true, data: wh });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Delete webhook */
router.delete('/webhooks/:id', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    await WorkflowWebhook.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم الحذف' });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Test webhook */
router.post('/webhooks/:id/test', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const wh = await WorkflowWebhook.findById(req.params.id);
    if (!wh) return res.status(404).json({ success: false, message: 'غير موجود' });

    // SSRF protection: validate stored webhook URL before making request
    const urlCheck = validateOutboundUrl(wh.url);
    if (!urlCheck.valid) {
      return res
        .status(422)
        .json({ success: false, message: `رابط غير مسموح: ${urlCheck.reason}` });
    }

    // Send test payload
    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: { message: 'Webhook test from Al-Awael Workflow System' },
    };

    try {
      const https = require('https');
      const http = require('http');
      const url = new URL(wh.url);
      const transport = url.protocol === 'https:' ? https : http;

      await new Promise((resolve, reject) => {
        const r = transport.request(
          url,
          { method: wh.method || 'POST', headers: { 'Content-Type': 'application/json' } },
          response => {
            wh.lastTriggeredAt = new Date();
            wh.lastResponseStatus = response.statusCode;
            wh.totalTriggered += 1;
            wh.save();
            resolve(response.statusCode);
          }
        );
        r.on('error', err => {
          wh.lastError = err.message;
          wh.totalFailed += 1;
          wh.save();
          reject(err);
        });
        r.write(JSON.stringify(testPayload));
        r.end();
      });

      res.json({ success: true, message: 'تم إرسال الاختبار بنجاح' });
    } catch (err) {
      res.json({ success: false, message: 'فشل الاختبار', error: safeError(err) });
    }
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Webhook delivery log */
router.get('/webhooks/:id/logs', authMiddleware, requireBranchAccess, async (req, res) => {
  try {
    const wh = await WorkflowWebhook.findById(req.params.id).lean();
    if (!wh) return res.status(404).json({ success: false, message: 'غير موجود' });
    res.json({
      success: true,
      data: {
        totalTriggered: wh.totalTriggered,
        totalFailed: wh.totalFailed,
        lastTriggeredAt: wh.lastTriggeredAt,
        lastResponseStatus: wh.lastResponseStatus,
        lastError: wh.lastError,
      },
    });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

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
// 11) EXTENDED TEMPLATES — قوالب جديدة (10 إضافية)
// ════════════════════════════════════════════════════════════════════════════════

const EXTENDED_TEMPLATES = [
  // ── 6) طلب سلفة مالية ─────────────────────────────
  {
    id: 'salary-advance',
    name: 'Salary Advance Request',
    nameAr: 'طلب سلفة مالية',
    description: 'Employee salary advance request with multi-level approval',
    descriptionAr: 'طلب سلفة راتب للموظف مع موافقة متعددة المستويات',
    category: 'request',
    icon: '💰',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['submit'] },
      {
        id: 'submit',
        name: 'Submit Request',
        nameAr: 'تقديم الطلب',
        type: 'task',
        assignment: { type: 'previous_assignee' },
        taskConfig: { priority: 'medium', requireComment: true },
        nextSteps: ['amount_check'],
      },
      {
        id: 'amount_check',
        name: 'Amount Check',
        nameAr: 'فحص المبلغ',
        type: 'condition',
        conditions: [
          {
            id: 'low',
            field: 'amount',
            operator: 'lte',
            value: 5000,
            nextStep: 'manager_approval',
          },
          {
            id: 'high',
            field: 'amount',
            operator: 'gt',
            value: 5000,
            nextStep: 'director_approval',
          },
        ],
        defaultNextStep: 'manager_approval',
        nextSteps: ['manager_approval', 'director_approval'],
      },
      {
        id: 'manager_approval',
        name: 'Manager Approval',
        nameAr: 'موافقة المدير',
        type: 'approval',
        assignment: { type: 'manager' },
        sla: { enabled: true, duration: 1440, escalateAfter: 720 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'hr_review',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['hr_review', 'end_rejected'],
      },
      {
        id: 'director_approval',
        name: 'Director Approval',
        nameAr: 'موافقة المدير التنفيذي',
        type: 'approval',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 2880 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'hr_review',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['hr_review', 'end_rejected'],
      },
      {
        id: 'hr_review',
        name: 'HR Review',
        nameAr: 'مراجعة الموارد البشرية',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 1440 },
        nextSteps: ['finance_process'],
      },
      {
        id: 'finance_process',
        name: 'Finance Processing',
        nameAr: 'التنفيذ المالي',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 2880 },
        nextSteps: ['notify_employee'],
      },
      {
        id: 'notify_employee',
        name: 'Notify Employee',
        nameAr: 'إبلاغ الموظف',
        type: 'notification',
        notifications: [{ type: 'email', template: 'advance_approved', recipients: ['requester'] }],
        nextSteps: ['end_approved'],
      },
      { id: 'end_approved', name: 'End (Approved)', nameAr: 'نهاية (مقبول)', type: 'end' },
      { id: 'end_rejected', name: 'End (Rejected)', nameAr: 'نهاية (مرفوض)', type: 'end' },
    ],
  },

  // ── 7) طلب صيانة ─────────────────────────────────
  {
    id: 'maintenance-request',
    name: 'Maintenance Request',
    nameAr: 'طلب صيانة',
    description: 'Facility maintenance request with priority-based routing',
    descriptionAr: 'طلب صيانة مع توجيه حسب الأولوية',
    category: 'request',
    icon: '🔧',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['report'] },
      {
        id: 'report',
        name: 'Report Issue',
        nameAr: 'الإبلاغ عن المشكلة',
        type: 'task',
        taskConfig: { requireAttachment: true, requireComment: true },
        nextSteps: ['priority_check'],
      },
      {
        id: 'priority_check',
        name: 'Priority Check',
        nameAr: 'فحص الأولوية',
        type: 'condition',
        conditions: [
          {
            id: 'urgent',
            field: 'priority',
            operator: 'eq',
            value: 'urgent',
            nextStep: 'emergency_team',
          },
          {
            id: 'normal',
            field: 'priority',
            operator: 'in',
            value: ['medium', 'low'],
            nextStep: 'assign_technician',
          },
        ],
        defaultNextStep: 'assign_technician',
        nextSteps: ['emergency_team', 'assign_technician'],
      },
      {
        id: 'emergency_team',
        name: 'Emergency Team',
        nameAr: 'فريق الطوارئ',
        type: 'task',
        assignment: { type: 'group' },
        sla: { enabled: true, duration: 120 },
        nextSteps: ['work_order'],
      },
      {
        id: 'assign_technician',
        name: 'Assign Technician',
        nameAr: 'تعيين فني',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 1440 },
        nextSteps: ['work_order'],
      },
      {
        id: 'work_order',
        name: 'Execute Work Order',
        nameAr: 'تنفيذ أمر العمل',
        type: 'task',
        taskConfig: { requireComment: true, requireAttachment: true },
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['quality_check'],
      },
      {
        id: 'quality_check',
        name: 'Quality Check',
        nameAr: 'فحص الجودة',
        type: 'approval',
        taskConfig: {
          actions: [
            { id: 'pass', label: 'Pass', labelAr: 'ناجح', type: 'approve', nextStep: 'close' },
            { id: 'fail', label: 'Fail', labelAr: 'فاشل', type: 'reject', nextStep: 'work_order' },
          ],
        },
        nextSteps: ['close', 'work_order'],
      },
      {
        id: 'close',
        name: 'Close Request',
        nameAr: 'إغلاق الطلب',
        type: 'notification',
        notifications: [
          { type: 'in_app', template: 'maintenance_complete', recipients: ['requester'] },
        ],
        nextSteps: ['end'],
      },
      { id: 'end', name: 'End', nameAr: 'نهاية', type: 'end' },
    ],
  },

  // ── 8) طلب نقل موظف ─────────────────────────────
  {
    id: 'employee-transfer',
    name: 'Employee Transfer',
    nameAr: 'طلب نقل موظف',
    description: 'Internal employee transfer between departments',
    descriptionAr: 'نقل موظف بين الأقسام الداخلية',
    category: 'request',
    icon: '🔄',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['submit'] },
      {
        id: 'submit',
        name: 'Submit Transfer Request',
        nameAr: 'تقديم طلب النقل',
        type: 'task',
        taskConfig: { requireComment: true },
        nextSteps: ['current_manager'],
      },
      {
        id: 'current_manager',
        name: 'Current Manager Approval',
        nameAr: 'موافقة المدير الحالي',
        type: 'approval',
        assignment: { type: 'manager' },
        sla: { enabled: true, duration: 2880 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'new_manager',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['new_manager', 'end_rejected'],
      },
      {
        id: 'new_manager',
        name: 'New Manager Approval',
        nameAr: 'موافقة المدير الجديد',
        type: 'approval',
        sla: { enabled: true, duration: 2880 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'hr_process',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['hr_process', 'end_rejected'],
      },
      {
        id: 'hr_process',
        name: 'HR Processing',
        nameAr: 'إجراءات الموارد البشرية',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['it_setup'],
      },
      {
        id: 'it_setup',
        name: 'IT Setup (New Location)',
        nameAr: 'إعداد تقنية المعلومات',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 2880 },
        nextSteps: ['notify'],
      },
      {
        id: 'notify',
        name: 'Notify All Parties',
        nameAr: 'إبلاغ جميع الأطراف',
        type: 'notification',
        notifications: [
          { type: 'email', template: 'transfer_approved', recipients: ['requester', 'manager'] },
        ],
        nextSteps: ['end_approved'],
      },
      { id: 'end_approved', name: 'End (Approved)', nameAr: 'نهاية (مقبول)', type: 'end' },
      { id: 'end_rejected', name: 'End (Rejected)', nameAr: 'نهاية (مرفوض)', type: 'end' },
    ],
  },

  // ── 9) طلب تدريب ──────────────────────────────────
  {
    id: 'training-request',
    name: 'Training Request',
    nameAr: 'طلب تدريب',
    description: 'Employee training and development request',
    descriptionAr: 'طلب تدريب وتطوير الموظف',
    category: 'request',
    icon: '📚',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['submit'] },
      {
        id: 'submit',
        name: 'Submit Training Request',
        nameAr: 'تقديم طلب التدريب',
        type: 'task',
        taskConfig: { requireComment: true },
        nextSteps: ['manager_approval'],
      },
      {
        id: 'manager_approval',
        name: 'Manager Approval',
        nameAr: 'موافقة المدير',
        type: 'approval',
        assignment: { type: 'manager' },
        sla: { enabled: true, duration: 2880 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'budget_check',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['budget_check', 'end_rejected'],
      },
      {
        id: 'budget_check',
        name: 'Budget Verification',
        nameAr: 'التحقق من الميزانية',
        type: 'condition',
        conditions: [
          { id: 'within', field: 'cost', operator: 'lte', value: 10000, nextStep: 'hr_enroll' },
          { id: 'over', field: 'cost', operator: 'gt', value: 10000, nextStep: 'finance_approval' },
        ],
        defaultNextStep: 'hr_enroll',
        nextSteps: ['hr_enroll', 'finance_approval'],
      },
      {
        id: 'finance_approval',
        name: 'Finance Approval',
        nameAr: 'موافقة المالية',
        type: 'approval',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 2880 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'hr_enroll',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['hr_enroll', 'end_rejected'],
      },
      {
        id: 'hr_enroll',
        name: 'HR Enrollment',
        nameAr: 'تسجيل الموارد البشرية',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['training_execution'],
      },
      {
        id: 'training_execution',
        name: 'Training Execution',
        nameAr: 'تنفيذ التدريب',
        type: 'task',
        nextSteps: ['evaluation'],
      },
      {
        id: 'evaluation',
        name: 'Training Evaluation',
        nameAr: 'تقييم التدريب',
        type: 'task',
        taskConfig: { requireComment: true },
        nextSteps: ['end_completed'],
      },
      { id: 'end_completed', name: 'End', nameAr: 'نهاية', type: 'end' },
      { id: 'end_rejected', name: 'End (Rejected)', nameAr: 'نهاية (مرفوض)', type: 'end' },
    ],
  },

  // ── 10) طلب إجراء تأديبي ──────────────────────────
  {
    id: 'disciplinary-action',
    name: 'Disciplinary Action',
    nameAr: 'إجراء تأديبي',
    description: 'Employee disciplinary action workflow',
    descriptionAr: 'سير عمل الإجراء التأديبي للموظف',
    category: 'incident',
    icon: '⚠️',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['report'] },
      {
        id: 'report',
        name: 'Report Incident',
        nameAr: 'الإبلاغ عن المخالفة',
        type: 'task',
        taskConfig: { requireComment: true, requireAttachment: true },
        nextSteps: ['hr_review'],
      },
      {
        id: 'hr_review',
        name: 'HR Investigation',
        nameAr: 'تحقيق الموارد البشرية',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 7200 },
        nextSteps: ['hearing'],
      },
      {
        id: 'hearing',
        name: 'Employee Hearing',
        nameAr: 'جلسة استماع الموظف',
        type: 'task',
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['committee_decision'],
      },
      {
        id: 'committee_decision',
        name: 'Committee Decision',
        nameAr: 'قرار اللجنة',
        type: 'approval',
        taskConfig: {
          actions: [
            {
              id: 'warning',
              label: 'Warning',
              labelAr: 'إنذار',
              type: 'custom',
              nextStep: 'issue_warning',
            },
            {
              id: 'suspension',
              label: 'Suspension',
              labelAr: 'إيقاف',
              type: 'custom',
              nextStep: 'issue_suspension',
            },
            {
              id: 'termination',
              label: 'Termination',
              labelAr: 'إنهاء خدمة',
              type: 'custom',
              nextStep: 'legal_review',
            },
            {
              id: 'dismiss',
              label: 'Dismiss Case',
              labelAr: 'رفض القضية',
              type: 'custom',
              nextStep: 'end_dismissed',
            },
          ],
        },
        nextSteps: ['issue_warning', 'issue_suspension', 'legal_review', 'end_dismissed'],
      },
      {
        id: 'issue_warning',
        name: 'Issue Warning',
        nameAr: 'إصدار الإنذار',
        type: 'task',
        assignment: { type: 'role' },
        nextSteps: ['notify_employee'],
      },
      {
        id: 'issue_suspension',
        name: 'Issue Suspension',
        nameAr: 'إصدار الإيقاف',
        type: 'task',
        assignment: { type: 'role' },
        nextSteps: ['notify_employee'],
      },
      {
        id: 'legal_review',
        name: 'Legal Review',
        nameAr: 'المراجعة القانونية',
        type: 'approval',
        sla: { enabled: true, duration: 7200 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'notify_employee',
            },
            {
              id: 'return',
              label: 'Return',
              labelAr: 'إعادة',
              type: 'return',
              nextStep: 'committee_decision',
            },
          ],
        },
        nextSteps: ['notify_employee', 'committee_decision'],
      },
      {
        id: 'notify_employee',
        name: 'Notify Employee',
        nameAr: 'إبلاغ الموظف',
        type: 'notification',
        notifications: [
          { type: 'email', template: 'disciplinary_notice', recipients: ['requester'] },
        ],
        nextSteps: ['end_completed'],
      },
      { id: 'end_completed', name: 'End', nameAr: 'نهاية', type: 'end' },
      { id: 'end_dismissed', name: 'End (Dismissed)', nameAr: 'نهاية (مرفوض)', type: 'end' },
    ],
  },

  // ── 11) طلب عقد جديد ──────────────────────────────
  {
    id: 'contract-request',
    name: 'Contract Request',
    nameAr: 'طلب عقد جديد',
    description: 'New contract creation and approval workflow',
    descriptionAr: 'سير عمل إنشاء واعتماد العقود الجديدة',
    category: 'approval',
    icon: '📝',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['draft'] },
      {
        id: 'draft',
        name: 'Draft Contract',
        nameAr: 'صياغة العقد',
        type: 'task',
        taskConfig: { requireAttachment: true },
        sla: { enabled: true, duration: 7200 },
        nextSteps: ['legal_review'],
      },
      {
        id: 'legal_review',
        name: 'Legal Review',
        nameAr: 'المراجعة القانونية',
        type: 'approval',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 7200 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'value_check',
            },
            {
              id: 'return',
              label: 'Return for Changes',
              labelAr: 'إعادة للتعديل',
              type: 'return',
              nextStep: 'draft',
            },
          ],
        },
        nextSteps: ['value_check', 'draft'],
      },
      {
        id: 'value_check',
        name: 'Value Check',
        nameAr: 'فحص القيمة',
        type: 'condition',
        conditions: [
          {
            id: 'low',
            field: 'contractValue',
            operator: 'lte',
            value: 100000,
            nextStep: 'dept_manager',
          },
          {
            id: 'med',
            field: 'contractValue',
            operator: 'lte',
            value: 500000,
            nextStep: 'director',
          },
          {
            id: 'high',
            field: 'contractValue',
            operator: 'gt',
            value: 500000,
            nextStep: 'ceo_approval',
          },
        ],
        defaultNextStep: 'dept_manager',
        nextSteps: ['dept_manager', 'director', 'ceo_approval'],
      },
      {
        id: 'dept_manager',
        name: 'Department Manager Approval',
        nameAr: 'موافقة مدير القسم',
        type: 'approval',
        assignment: { type: 'manager' },
        sla: { enabled: true, duration: 2880 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'sign',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['sign', 'end_rejected'],
      },
      {
        id: 'director',
        name: 'Director Approval',
        nameAr: 'موافقة المدير التنفيذي',
        type: 'approval',
        sla: { enabled: true, duration: 4320 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'sign',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['sign', 'end_rejected'],
      },
      {
        id: 'ceo_approval',
        name: 'CEO Approval',
        nameAr: 'موافقة الرئيس التنفيذي',
        type: 'approval',
        sla: { enabled: true, duration: 5760 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'sign',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['sign', 'end_rejected'],
      },
      {
        id: 'sign',
        name: 'Contract Signing',
        nameAr: 'توقيع العقد',
        type: 'task',
        taskConfig: { requireAttachment: true },
        nextSteps: ['archive'],
      },
      {
        id: 'archive',
        name: 'Archive Contract',
        nameAr: 'أرشفة العقد',
        type: 'task',
        nextSteps: ['end_approved'],
      },
      { id: 'end_approved', name: 'End (Approved)', nameAr: 'نهاية (معتمد)', type: 'end' },
      { id: 'end_rejected', name: 'End (Rejected)', nameAr: 'نهاية (مرفوض)', type: 'end' },
    ],
  },

  // ── 12) طلب استقالة ───────────────────────────────
  {
    id: 'resignation-request',
    name: 'Resignation Request',
    nameAr: 'طلب استقالة',
    description: 'Employee resignation with exit procedures',
    descriptionAr: 'استقالة موظف مع إجراءات المغادرة',
    category: 'request',
    icon: '🚪',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['submit'] },
      {
        id: 'submit',
        name: 'Submit Resignation',
        nameAr: 'تقديم الاستقالة',
        type: 'task',
        taskConfig: { requireComment: true },
        nextSteps: ['manager_review'],
      },
      {
        id: 'manager_review',
        name: 'Manager Review',
        nameAr: 'مراجعة المدير',
        type: 'approval',
        assignment: { type: 'manager' },
        sla: { enabled: true, duration: 2880 },
        taskConfig: {
          actions: [
            {
              id: 'accept',
              label: 'Accept',
              labelAr: 'قبول',
              type: 'approve',
              nextStep: 'hr_process',
            },
            {
              id: 'counter',
              label: 'Counter Offer',
              labelAr: 'عرض بديل',
              type: 'custom',
              nextStep: 'counter_offer',
            },
          ],
        },
        nextSteps: ['hr_process', 'counter_offer'],
      },
      {
        id: 'counter_offer',
        name: 'Counter Offer',
        nameAr: 'عرض بديل',
        type: 'task',
        nextSteps: ['employee_decision'],
      },
      {
        id: 'employee_decision',
        name: 'Employee Decision',
        nameAr: 'قرار الموظف',
        type: 'approval',
        taskConfig: {
          actions: [
            {
              id: 'stay',
              label: 'Accept Offer',
              labelAr: 'قبول العرض',
              type: 'approve',
              nextStep: 'end_withdrawn',
            },
            {
              id: 'leave',
              label: 'Proceed Resignation',
              labelAr: 'متابعة الاستقالة',
              type: 'reject',
              nextStep: 'hr_process',
            },
          ],
        },
        nextSteps: ['end_withdrawn', 'hr_process'],
      },
      {
        id: 'hr_process',
        name: 'HR Exit Process',
        nameAr: 'إجراءات مغادرة الموارد البشرية',
        type: 'parallel',
        nextSteps: ['it_clearance', 'finance_clearance', 'admin_clearance'],
      },
      {
        id: 'it_clearance',
        name: 'IT Clearance',
        nameAr: 'تسوية تقنية المعلومات',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['final_settlement'],
      },
      {
        id: 'finance_clearance',
        name: 'Finance Clearance',
        nameAr: 'التسوية المالية',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['final_settlement'],
      },
      {
        id: 'admin_clearance',
        name: 'Admin Clearance',
        nameAr: 'التسوية الإدارية',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['final_settlement'],
      },
      {
        id: 'final_settlement',
        name: 'Final Settlement',
        nameAr: 'التسوية النهائية',
        type: 'task',
        assignment: { type: 'role' },
        nextSteps: ['end_completed'],
      },
      { id: 'end_completed', name: 'End', nameAr: 'نهاية', type: 'end' },
      { id: 'end_withdrawn', name: 'End (Withdrawn)', nameAr: 'نهاية (سُحبت)', type: 'end' },
    ],
  },

  // ── 13) طلب سفر عمل ──────────────────────────────
  {
    id: 'business-travel',
    name: 'Business Travel Request',
    nameAr: 'طلب سفر عمل',
    description: 'Business travel request with booking and expense',
    descriptionAr: 'طلب سفر عمل مع الحجز والمصاريف',
    category: 'request',
    icon: '✈️',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['submit'] },
      {
        id: 'submit',
        name: 'Submit Travel Request',
        nameAr: 'تقديم طلب السفر',
        type: 'task',
        taskConfig: { requireComment: true },
        nextSteps: ['manager_approval'],
      },
      {
        id: 'manager_approval',
        name: 'Manager Approval',
        nameAr: 'موافقة المدير',
        type: 'approval',
        assignment: { type: 'manager' },
        sla: { enabled: true, duration: 2880 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'موافقة',
              type: 'approve',
              nextStep: 'travel_desk',
            },
            {
              id: 'reject',
              label: 'Reject',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'end_rejected',
            },
          ],
        },
        nextSteps: ['travel_desk', 'end_rejected'],
      },
      {
        id: 'travel_desk',
        name: 'Travel Desk Booking',
        nameAr: 'حجز مكتب السفر',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['advance_payment'],
      },
      {
        id: 'advance_payment',
        name: 'Advance Payment',
        nameAr: 'صرف سلفة السفر',
        type: 'task',
        assignment: { type: 'role' },
        nextSteps: ['travel_execution'],
      },
      {
        id: 'travel_execution',
        name: 'Travel Period',
        nameAr: 'فترة السفر',
        type: 'task',
        nextSteps: ['expense_report'],
      },
      {
        id: 'expense_report',
        name: 'Expense Report',
        nameAr: 'تقرير المصاريف',
        type: 'task',
        taskConfig: { requireAttachment: true, requireComment: true },
        nextSteps: ['finance_settlement'],
      },
      {
        id: 'finance_settlement',
        name: 'Finance Settlement',
        nameAr: 'التسوية المالية',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 4320 },
        nextSteps: ['end_completed'],
      },
      { id: 'end_completed', name: 'End', nameAr: 'نهاية', type: 'end' },
      { id: 'end_rejected', name: 'End (Rejected)', nameAr: 'نهاية (مرفوض)', type: 'end' },
    ],
  },

  // ── 14) طلب تقييم أداء ────────────────────────────
  {
    id: 'performance-review',
    name: 'Performance Review',
    nameAr: 'تقييم الأداء',
    description: 'Annual/periodic performance review workflow',
    descriptionAr: 'سير عمل تقييم الأداء الدوري',
    category: 'project',
    icon: '📊',
    steps: [
      {
        id: 'start',
        name: 'Start',
        nameAr: 'بداية',
        type: 'start',
        nextSteps: ['self_assessment'],
      },
      {
        id: 'self_assessment',
        name: 'Self Assessment',
        nameAr: 'التقييم الذاتي',
        type: 'task',
        taskConfig: { requireComment: true },
        sla: { enabled: true, duration: 7200 },
        nextSteps: ['manager_review'],
      },
      {
        id: 'manager_review',
        name: 'Manager Review',
        nameAr: 'مراجعة المدير',
        type: 'task',
        assignment: { type: 'manager' },
        taskConfig: { requireComment: true },
        sla: { enabled: true, duration: 7200 },
        nextSteps: ['face_to_face'],
      },
      {
        id: 'face_to_face',
        name: 'Face-to-Face Meeting',
        nameAr: 'اجتماع وجهاً لوجه',
        type: 'task',
        taskConfig: { requireComment: true },
        nextSteps: ['goals_setting'],
      },
      {
        id: 'goals_setting',
        name: 'Goals Setting',
        nameAr: 'تحديد الأهداف',
        type: 'task',
        taskConfig: { requireComment: true },
        nextSteps: ['hr_review'],
      },
      {
        id: 'hr_review',
        name: 'HR Review & Calibration',
        nameAr: 'مراجعة وموازنة الموارد البشرية',
        type: 'approval',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 7200 },
        taskConfig: {
          actions: [
            {
              id: 'approve',
              label: 'Approve',
              labelAr: 'اعتماد',
              type: 'approve',
              nextStep: 'finalize',
            },
            {
              id: 'adjust',
              label: 'Request Adjustment',
              labelAr: 'طلب تعديل',
              type: 'return',
              nextStep: 'manager_review',
            },
          ],
        },
        nextSteps: ['finalize', 'manager_review'],
      },
      {
        id: 'finalize',
        name: 'Finalize & Archive',
        nameAr: 'الاعتماد والأرشفة',
        type: 'task',
        nextSteps: ['end'],
      },
      { id: 'end', name: 'End', nameAr: 'نهاية', type: 'end' },
    ],
  },

  // ── 15) طلب شكوى / تظلم ──────────────────────────
  {
    id: 'grievance-complaint',
    name: 'Grievance / Complaint',
    nameAr: 'شكوى / تظلم',
    description: 'Employee grievance and complaint handling',
    descriptionAr: 'معالجة شكاوى وتظلمات الموظفين',
    category: 'incident',
    icon: '📢',
    steps: [
      { id: 'start', name: 'Start', nameAr: 'بداية', type: 'start', nextSteps: ['submit'] },
      {
        id: 'submit',
        name: 'Submit Complaint',
        nameAr: 'تقديم الشكوى',
        type: 'task',
        taskConfig: { requireComment: true, requireAttachment: false },
        nextSteps: ['hr_receive'],
      },
      {
        id: 'hr_receive',
        name: 'HR Acknowledgment',
        nameAr: 'استلام الموارد البشرية',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 1440 },
        nextSteps: ['investigation'],
      },
      {
        id: 'investigation',
        name: 'Investigation',
        nameAr: 'التحقيق',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 14400 },
        taskConfig: { requireComment: true },
        nextSteps: ['committee_review'],
      },
      {
        id: 'committee_review',
        name: 'Committee Review',
        nameAr: 'مراجعة اللجنة',
        type: 'approval',
        sla: { enabled: true, duration: 7200 },
        taskConfig: {
          actions: [
            {
              id: 'uphold',
              label: 'Uphold Complaint',
              labelAr: 'قبول الشكوى',
              type: 'approve',
              nextStep: 'resolution',
            },
            {
              id: 'dismiss',
              label: 'Dismiss',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'notify_dismissed',
            },
            {
              id: 'escalate',
              label: 'Escalate',
              labelAr: 'تصعيد',
              type: 'delegate',
              nextStep: 'ceo_review',
            },
          ],
        },
        nextSteps: ['resolution', 'notify_dismissed', 'ceo_review'],
      },
      {
        id: 'ceo_review',
        name: 'CEO/Executive Review',
        nameAr: 'مراجعة الرئيس التنفيذي',
        type: 'approval',
        sla: { enabled: true, duration: 7200 },
        taskConfig: {
          actions: [
            {
              id: 'resolve',
              label: 'Resolve',
              labelAr: 'حل',
              type: 'approve',
              nextStep: 'resolution',
            },
            {
              id: 'dismiss',
              label: 'Dismiss',
              labelAr: 'رفض',
              type: 'reject',
              nextStep: 'notify_dismissed',
            },
          ],
        },
        nextSteps: ['resolution', 'notify_dismissed'],
      },
      {
        id: 'resolution',
        name: 'Implement Resolution',
        nameAr: 'تنفيذ الحل',
        type: 'task',
        assignment: { type: 'role' },
        sla: { enabled: true, duration: 7200 },
        nextSteps: ['notify_resolved'],
      },
      {
        id: 'notify_resolved',
        name: 'Notify Resolution',
        nameAr: 'إبلاغ بالحل',
        type: 'notification',
        notifications: [
          { type: 'email', template: 'complaint_resolved', recipients: ['requester'] },
        ],
        nextSteps: ['end_resolved'],
      },
      {
        id: 'notify_dismissed',
        name: 'Notify Dismissal',
        nameAr: 'إبلاغ بالرفض',
        type: 'notification',
        notifications: [
          { type: 'email', template: 'complaint_dismissed', recipients: ['requester'] },
        ],
        nextSteps: ['end_dismissed'],
      },
      { id: 'end_resolved', name: 'End (Resolved)', nameAr: 'نهاية (تم الحل)', type: 'end' },
      { id: 'end_dismissed', name: 'End (Dismissed)', nameAr: 'نهاية (مرفوض)', type: 'end' },
    ],
  },
];

/** List extended templates */
router.get('/templates/extended', authMiddleware, requireBranchAccess, async (_req, res) => {
  try {
    const templates = EXTENDED_TEMPLATES.map(t => ({
      id: t.id,
      name: t.name,
      nameAr: t.nameAr,
      description: t.description,
      descriptionAr: t.descriptionAr,
      category: t.category,
      icon: t.icon,
      stepsCount: t.steps.length,
    }));
    res.json({ success: true, data: templates, total: templates.length });
  } catch (error) {
    safeError(res, error, 'workflowEnhanced');
  }
});

/** Get extended template detail */
router.get(
  '/templates/extended/:templateId',
  authMiddleware,
  requireBranchAccess,
  async (req, res) => {
    try {
      const tmpl = EXTENDED_TEMPLATES.find(t => t.id === req.params.templateId);
      if (!tmpl) return res.status(404).json({ success: false, message: 'القالب غير موجود' });
      res.json({ success: true, data: tmpl });
    } catch (error) {
      safeError(res, error, 'workflowEnhanced');
    }
  }
);

/** Deploy extended template */
router.post(
  '/templates/extended/:templateId/deploy',
  authMiddleware,
  requireBranchAccess,
  async (req, res) => {
    try {
      const tmpl = EXTENDED_TEMPLATES.find(t => t.id === req.params.templateId);
      if (!tmpl) return res.status(404).json({ success: false, message: 'القالب غير موجود' });

      const { name, nameAr } = req.body;
      const code = `${tmpl.id}-${Date.now()}`;

      const definition = new WorkflowDefinition({
        name: name || tmpl.name,
        nameAr: nameAr || tmpl.nameAr,
        code,
        description: tmpl.description,
        category: tmpl.category,
        status: 'draft',
        version: 1,
        steps: tmpl.steps,
        trigger: { type: 'manual' },
        settings: {
          allowReassignment: true,
          allowDelegation: true,
          allowCancellation: true,
          autoAssign: true,
          notifyOnComplete: true,
          notifyOnError: true,
        },
        createdBy: uid(req),
      });

      await definition.save();
      res.status(201).json({
        success: true,
        data: definition,
        message: `تم نشر قالب "${tmpl.nameAr}" بنجاح`,
      });
    } catch (error) {
      safeError(res, error, 'workflowEnhanced');
    }
  }
);

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
