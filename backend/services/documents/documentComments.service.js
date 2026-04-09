'use strict';

/**
 * Document Comments & Annotations Service — خدمة التعليقات والتعليقات التوضيحية
 * ═══════════════════════════════════════════════════════════════════════════════
 * نظام متكامل للتعليقات المترابطة، الإشارات، التفاعلات،
 * التعليقات التوضيحية على الصفحات، والمناقشات
 */

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// ─────────────────────────────────────────────
// مخطط التعليق
// ─────────────────────────────────────────────

const CommentSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },

    // نوع التعليق
    type: {
      type: String,
      enum: ['comment', 'annotation', 'suggestion', 'question', 'approval_note', 'rejection_note'],
      default: 'comment',
    },

    // المحتوى
    content: { type: String, required: true, maxlength: 5000 },
    contentHtml: String,

    // الردود (تعليقات مترابطة)
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentComment',
      default: null,
      index: true,
    },
    threadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentComment',
      default: null,
    },
    depth: { type: Number, default: 0, max: 5 },
    repliesCount: { type: Number, default: 0 },

    // التعليقات التوضيحية (موقع على الصفحة)
    annotation: {
      pageNumber: Number,
      x: Number,
      y: Number,
      width: Number,
      height: Number,
      highlightedText: String,
      color: { type: String, default: '#FFEB3B' },
    },

    // الإشارات (@mention)
    mentions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        userName: String,
        notified: { type: Boolean, default: false },
      },
    ],

    // التفاعلات
    reactions: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],
    reactionsCount: { type: Number, default: 0 },

    // الحالة
    status: {
      type: String,
      enum: ['active', 'resolved', 'archived', 'deleted'],
      default: 'active',
    },
    isResolved: { type: Boolean, default: false },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: Date,

    isPinned: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    editedAt: Date,

    // المرفقات
    attachments: [
      {
        fileName: String,
        fileUrl: String,
        fileSize: Number,
        fileType: String,
      },
    ],

    // كاتب التعليق
    authorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    authorName: String,
    authorAvatar: String,
    authorRole: String,
  },
  {
    timestamps: true,
    collection: 'document_comments',
  }
);

CommentSchema.index({ documentId: 1, createdAt: -1 });
CommentSchema.index({ documentId: 1, parentId: 1 });
CommentSchema.index({ documentId: 1, type: 1 });
CommentSchema.index({ documentId: 1, status: 1 });
CommentSchema.index({ threadId: 1, createdAt: 1 });

const DocumentComment =
  mongoose.models.DocumentComment || mongoose.model('DocumentComment', CommentSchema);

// ─────────────────────────────────────────────
// خدمة التعليقات
// ─────────────────────────────────────────────

class DocumentCommentsService {
  /**
   * إضافة تعليق
   */
  async addComment(documentId, authorId, data) {
    try {
      const comment = new DocumentComment({
        documentId,
        type: data.type || 'comment',
        content: data.content,
        contentHtml: data.contentHtml,
        parentId: data.parentId || null,
        threadId: data.threadId || null,
        depth: data.depth || 0,
        annotation: data.annotation || undefined,
        mentions: data.mentions || [],
        attachments: data.attachments || [],
        authorId,
        authorName: data.authorName || '',
        authorAvatar: data.authorAvatar || '',
        authorRole: data.authorRole || '',
      });

      // إذا كان رداً، حدّث الـ threadId
      if (data.parentId) {
        const parent = await DocumentComment.findById(data.parentId);
        if (parent) {
          comment.threadId = parent.threadId || parent._id;
          comment.depth = Math.min((parent.depth || 0) + 1, 5);
          await DocumentComment.findByIdAndUpdate(data.parentId, {
            $inc: { repliesCount: 1 },
          });
        }
      }

      await comment.save();

      logger.info(`[Comments] تعليق جديد على المستند: ${documentId}`);
      return { success: true, comment: this._format(comment.toObject()) };
    } catch (err) {
      logger.error(`[Comments] خطأ في الإضافة: ${err.message}`);
      throw err;
    }
  }

  /**
   * جلب تعليقات المستند
   */
  async getComments(documentId, options = {}) {
    try {
      const query = { documentId, status: { $ne: 'deleted' } };
      if (options.type) query.type = options.type;
      if (options.parentId !== undefined) query.parentId = options.parentId;
      if (options.topLevelOnly) query.parentId = null;

      const page = options.page || 1;
      const limit = options.limit || 50;
      const sort = options.sort === 'oldest' ? { createdAt: 1 } : { isPinned: -1, createdAt: -1 };

      const [comments, total] = await Promise.all([
        DocumentComment.find(query)
          .populate('authorId', 'name email avatar')
          .populate('resolvedBy', 'name')
          .sort(sort)
          .skip((page - 1) * limit)
          .limit(limit)
          .lean(),
        DocumentComment.countDocuments(query),
      ]);

      // جلب الردود لكل تعليق رئيسي
      const formatted = [];
      for (const comment of comments) {
        const c = this._format(comment);
        if (!comment.parentId && comment.repliesCount > 0 && !options.flatMode) {
          const replies = await DocumentComment.find({
            threadId: comment._id,
            status: { $ne: 'deleted' },
          })
            .populate('authorId', 'name email avatar')
            .sort({ createdAt: 1 })
            .limit(20)
            .lean();
          c.replies = replies.map(r => this._format(r));
        }
        formatted.push(c);
      }

      return {
        success: true,
        comments: formatted,
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    } catch (err) {
      logger.error(`[Comments] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * تعديل تعليق
   */
  async updateComment(commentId, authorId, data) {
    try {
      const comment = await DocumentComment.findById(commentId);
      if (!comment) throw new Error('التعليق غير موجود');
      if (comment.authorId.toString() !== authorId.toString()) {
        throw new Error('غير مصرح لك بتعديل هذا التعليق');
      }

      comment.content = data.content || comment.content;
      comment.contentHtml = data.contentHtml || comment.contentHtml;
      comment.isEdited = true;
      comment.editedAt = new Date();

      if (data.mentions) comment.mentions = data.mentions;

      await comment.save();
      return { success: true, comment: this._format(comment.toObject()) };
    } catch (err) {
      logger.error(`[Comments] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * حذف تعليق (soft)
   */
  async deleteComment(commentId, userId) {
    try {
      const comment = await DocumentComment.findById(commentId);
      if (!comment) throw new Error('التعليق غير موجود');

      comment.status = 'deleted';
      await comment.save();

      // إنقاص عداد الردود من الأب
      if (comment.parentId) {
        await DocumentComment.findByIdAndUpdate(comment.parentId, {
          $inc: { repliesCount: -1 },
        });
      }

      return { success: true, message: 'تم حذف التعليق' };
    } catch (err) {
      logger.error(`[Comments] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إضافة تفاعل
   */
  async addReaction(commentId, userId, emoji) {
    try {
      const comment = await DocumentComment.findById(commentId);
      if (!comment) throw new Error('التعليق غير موجود');

      // إزالة تفاعل سابق من نفس المستخدم بنفس الإيموجي
      comment.reactions = comment.reactions.filter(
        r => !(r.userId.toString() === userId.toString() && r.emoji === emoji)
      );

      comment.reactions.push({ userId, emoji, createdAt: new Date() });
      comment.reactionsCount = comment.reactions.length;
      await comment.save();

      return { success: true, reactionsCount: comment.reactionsCount };
    } catch (err) {
      logger.error(`[Comments] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إزالة تفاعل
   */
  async removeReaction(commentId, userId, emoji) {
    try {
      await DocumentComment.findByIdAndUpdate(commentId, {
        $pull: { reactions: { userId, emoji } },
        $inc: { reactionsCount: -1 },
      });
      return { success: true };
    } catch (err) {
      logger.error(`[Comments] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * حل/إلغاء حل تعليق
   */
  async resolveComment(commentId, userId, resolve = true) {
    try {
      const update = resolve
        ? { isResolved: true, resolvedBy: userId, resolvedAt: new Date(), status: 'resolved' }
        : { isResolved: false, $unset: { resolvedBy: 1, resolvedAt: 1 }, status: 'active' };

      await DocumentComment.findByIdAndUpdate(commentId, update);
      return { success: true, resolved: resolve };
    } catch (err) {
      logger.error(`[Comments] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * تثبيت/إلغاء تثبيت تعليق
   */
  async togglePin(commentId) {
    try {
      const comment = await DocumentComment.findById(commentId);
      if (!comment) throw new Error('التعليق غير موجود');
      comment.isPinned = !comment.isPinned;
      await comment.save();
      return { success: true, isPinned: comment.isPinned };
    } catch (err) {
      logger.error(`[Comments] خطأ: ${err.message}`);
      throw err;
    }
  }

  /**
   * إحصائيات التعليقات لمستند
   */
  async getStats(documentId) {
    try {
      const [total, byType, unresolved, topCommenters] = await Promise.all([
        DocumentComment.countDocuments({ documentId, status: { $ne: 'deleted' } }),
        DocumentComment.aggregate([
          {
            $match: {
              documentId: new mongoose.Types.ObjectId(documentId),
              status: { $ne: 'deleted' },
            },
          },
          { $group: { _id: '$type', count: { $sum: 1 } } },
        ]),
        DocumentComment.countDocuments({
          documentId,
          status: 'active',
          isResolved: false,
          type: { $in: ['question', 'suggestion'] },
        }),
        DocumentComment.aggregate([
          {
            $match: {
              documentId: new mongoose.Types.ObjectId(documentId),
              status: { $ne: 'deleted' },
            },
          },
          { $group: { _id: '$authorId', count: { $sum: 1 }, name: { $first: '$authorName' } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
        ]),
      ]);

      return {
        success: true,
        stats: {
          total,
          byType: byType.map(t => ({ type: t._id, count: t.count })),
          unresolved,
          topCommenters,
        },
      };
    } catch (err) {
      logger.error(`[Comments] خطأ: ${err.message}`);
      throw err;
    }
  }

  _format(comment) {
    const typeLabels = {
      comment: { label: 'تعليق', icon: '💬', color: '#2196F3' },
      annotation: { label: 'تعليق توضيحي', icon: '📝', color: '#FF9800' },
      suggestion: { label: 'اقتراح', icon: '💡', color: '#4CAF50' },
      question: { label: 'سؤال', icon: '❓', color: '#9C27B0' },
      approval_note: { label: 'ملاحظة اعتماد', icon: '✅', color: '#00BCD4' },
      rejection_note: { label: 'ملاحظة رفض', icon: '❌', color: '#F44336' },
    };

    return {
      id: comment._id,
      documentId: comment.documentId,
      type: { key: comment.type, ...(typeLabels[comment.type] || typeLabels.comment) },
      content: comment.content,
      contentHtml: comment.contentHtml,
      parentId: comment.parentId,
      threadId: comment.threadId,
      depth: comment.depth,
      repliesCount: comment.repliesCount,
      annotation: comment.annotation,
      mentions: comment.mentions,
      reactions: comment.reactions,
      reactionsCount: comment.reactionsCount,
      status: comment.status,
      isResolved: comment.isResolved,
      resolvedBy: comment.resolvedBy,
      resolvedAt: comment.resolvedAt,
      isPinned: comment.isPinned,
      isEdited: comment.isEdited,
      editedAt: comment.editedAt,
      attachments: comment.attachments,
      author: {
        id: comment.authorId?._id || comment.authorId,
        name: comment.authorName || comment.authorId?.name,
        avatar: comment.authorAvatar || comment.authorId?.avatar,
        role: comment.authorRole,
      },
      replies: comment.replies || [],
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }
}

module.exports = new DocumentCommentsService();
module.exports.DocumentComment = DocumentComment;
