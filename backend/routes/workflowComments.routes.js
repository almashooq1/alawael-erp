/**
 * Workflow Comments & Discussion — extracted from workflowEnhanced.routes.js.
 *
 * Concrete sub-module #1 of the workflowEnhanced refactor. Same router,
 * same endpoint paths, same middleware order — only the file boundary
 * is new. Mount through `workflowEnhanced.routes.js` which forwards via
 * `router.use('/', require('./workflowComments.routes'))` so the public
 * URLs (`/api/workflow-enhanced/comments/...` and the v1 alias) do not
 * change.
 *
 * Endpoints:
 *   GET    /comments/instance/:instanceId
 *   GET    /comments/task/:taskId
 *   POST   /comments
 *   PUT    /comments/:id
 *   DELETE /comments/:id
 *   POST   /comments/:id/pin
 *   POST   /comments/:id/react
 */

'use strict';

const express = require('express');
const router = express.Router();

const { WorkflowComment } = require('../models/WorkflowEnhanced');

const { authenticateToken: authMiddleware } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

const uid = req => (req.user && (req.user.id || req.user._id)) || null;

// ════════════════════════════════════════════════════════════════════════════════
// COMMENTS & DISCUSSION — التعليقات والنقاشات
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

module.exports = router;
