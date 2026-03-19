/**
 * Document Annotation & Comments Service — خدمة التعليقات والملاحظات
 *
 * Features:
 * - Inline annotations on documents
 * - Threaded comments
 * - @mentions with notifications
 * - Comment resolution workflow
 * - Annotation types (highlight, underline, strikethrough, note)
 * - Real-time collaboration on annotations
 */

const EventEmitter = require('events');

const ANNOTATION_TYPES = {
  HIGHLIGHT: 'highlight',
  UNDERLINE: 'underline',
  STRIKETHROUGH: 'strikethrough',
  NOTE: 'note',
  BOOKMARK: 'bookmark',
  DRAWING: 'drawing',
  STAMP: 'stamp',
  TEXT_BOX: 'textbox',
};

const ANNOTATION_COLORS = {
  YELLOW: '#FFEB3B',
  GREEN: '#4CAF50',
  BLUE: '#2196F3',
  RED: '#F44336',
  ORANGE: '#FF9800',
  PURPLE: '#9C27B0',
  PINK: '#E91E63',
  TEAL: '#009688',
};

const STAMP_TYPES = {
  APPROVED: { text: 'معتمد', textEn: 'APPROVED', color: '#4CAF50' },
  REJECTED: { text: 'مرفوض', textEn: 'REJECTED', color: '#F44336' },
  DRAFT: { text: 'مسودة', textEn: 'DRAFT', color: '#9E9E9E' },
  CONFIDENTIAL: { text: 'سري', textEn: 'CONFIDENTIAL', color: '#F44336' },
  URGENT: { text: 'عاجل', textEn: 'URGENT', color: '#FF5722' },
  FOR_REVIEW: { text: 'للمراجعة', textEn: 'FOR REVIEW', color: '#FF9800' },
  FINAL: { text: 'نهائي', textEn: 'FINAL', color: '#2196F3' },
  COPY: { text: 'نسخة', textEn: 'COPY', color: '#607D8B' },
};

class DocumentAnnotationService extends EventEmitter {
  constructor() {
    super();
    this.annotations = new Map(); // docId -> annotations[]
    this.comments = new Map(); // docId -> comments[]
  }

  // ── Annotations (التعليقات التوضيحية) ───────────────────────────────────

  /**
   * Add annotation — إضافة تعليق توضيحي
   */
  async addAnnotation(documentId, annotationData) {
    if (!this.annotations.has(documentId)) {
      this.annotations.set(documentId, []);
    }

    const annotation = {
      id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      documentId,
      type: annotationData.type || ANNOTATION_TYPES.HIGHLIGHT,
      content: annotationData.content || '',
      color: annotationData.color || ANNOTATION_COLORS.YELLOW,
      // Position data
      page: annotationData.page || 1,
      position: annotationData.position || { x: 0, y: 0 },
      size: annotationData.size || { width: 100, height: 30 },
      selectedText: annotationData.selectedText || '',
      // Stamp specific
      stampType: annotationData.stampType || null,
      // Author
      authorId: annotationData.authorId,
      authorName: annotationData.authorName || '',
      authorAvatar: annotationData.authorAvatar || '',
      // Status
      status: 'active', // active, resolved, deleted
      isPrivate: annotationData.isPrivate || false,
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.annotations.get(documentId).push(annotation);
    this.emit('annotationAdded', annotation);

    return {
      success: true,
      data: annotation,
      message: 'تمت إضافة التعليق التوضيحي',
    };
  }

  /**
   * Get document annotations — جلب التعليقات التوضيحية
   */
  async getAnnotations(documentId, userId, filters = {}) {
    const annotations = this.annotations.get(documentId) || [];

    let filtered = annotations.filter(a => a.status !== 'deleted');

    // Filter private annotations
    filtered = filtered.filter(a => !a.isPrivate || a.authorId === userId);

    // Filter by type
    if (filters.type) {
      filtered = filtered.filter(a => a.type === filters.type);
    }

    // Filter by page
    if (filters.page) {
      filtered = filtered.filter(a => a.page === parseInt(filters.page));
    }

    // Filter by author
    if (filters.authorId) {
      filtered = filtered.filter(a => a.authorId === filters.authorId);
    }

    return {
      success: true,
      data: filtered,
      total: filtered.length,
    };
  }

  /**
   * Update annotation — تحديث التعليق التوضيحي
   */
  async updateAnnotation(documentId, annotationId, updates) {
    const annotations = this.annotations.get(documentId);
    if (!annotations) return { success: false, message: 'لا توجد تعليقات لهذا المستند' };

    const annotation = annotations.find(a => a.id === annotationId);
    if (!annotation) return { success: false, message: 'التعليق غير موجود' };

    Object.assign(annotation, {
      ...updates,
      updatedAt: new Date(),
    });

    this.emit('annotationUpdated', annotation);
    return { success: true, data: annotation, message: 'تم تحديث التعليق' };
  }

  /**
   * Delete annotation — حذف التعليق التوضيحي
   */
  async deleteAnnotation(documentId, annotationId, userId) {
    const annotations = this.annotations.get(documentId);
    if (!annotations) return { success: false, message: 'لا توجد تعليقات' };

    const annotation = annotations.find(a => a.id === annotationId);
    if (!annotation) return { success: false, message: 'التعليق غير موجود' };

    if (annotation.authorId !== userId) {
      return { success: false, message: 'لا يمكنك حذف تعليقات الآخرين' };
    }

    annotation.status = 'deleted';
    annotation.deletedAt = new Date();

    this.emit('annotationDeleted', { documentId, annotationId });
    return { success: true, message: 'تم حذف التعليق' };
  }

  // ── Comments (تعليقات مناقشة) ─────────────────────────────────────────

  /**
   * Add comment — إضافة تعليق
   */
  async addComment(documentId, commentData) {
    if (!this.comments.has(documentId)) {
      this.comments.set(documentId, []);
    }

    const comment = {
      id: `cmt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      documentId,
      parentId: commentData.parentId || null, // For threaded replies
      content: commentData.content,
      contentHtml: commentData.contentHtml || commentData.content,
      authorId: commentData.authorId,
      authorName: commentData.authorName || '',
      authorAvatar: commentData.authorAvatar || '',
      authorRole: commentData.authorRole || '',
      mentions: this._extractMentions(commentData.content),
      attachments: commentData.attachments || [],
      reactions: [],
      status: 'active', // active, resolved, hidden, deleted
      isEdited: false,
      editHistory: [],
      // Linked annotation
      annotationId: commentData.annotationId || null,
      page: commentData.page || null,
      // Timestamps
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.comments.get(documentId).push(comment);
    this.emit('commentAdded', comment);

    // Notify mentioned users
    if (comment.mentions.length > 0) {
      this.emit('usersMentioned', {
        documentId,
        commentId: comment.id,
        mentions: comment.mentions,
        by: comment.authorName,
      });
    }

    return {
      success: true,
      data: comment,
      message: 'تمت إضافة التعليق',
    };
  }

  /**
   * Extract @mentions from content
   */
  _extractMentions(content) {
    if (!content) return [];
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      mentions.push(match[1]);
    }
    return mentions;
  }

  /**
   * Get document comments — جلب التعليقات
   */
  async getComments(documentId, filters = {}) {
    const comments = (this.comments.get(documentId) || []).filter(c => c.status !== 'deleted');

    // Build threaded structure
    if (filters.threaded !== false) {
      const rootComments = comments.filter(c => !c.parentId);
      const replies = comments.filter(c => c.parentId);

      const threaded = rootComments.map(comment => ({
        ...comment,
        replies: replies
          .filter(r => r.parentId === comment.id)
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
        replyCount: replies.filter(r => r.parentId === comment.id).length,
      }));

      // Sort by newest first
      threaded.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      return {
        success: true,
        data: threaded,
        total: comments.length,
      };
    }

    return {
      success: true,
      data: comments,
      total: comments.length,
    };
  }

  /**
   * Reply to comment — الرد على تعليق
   */
  async replyToComment(documentId, parentCommentId, replyData) {
    return this.addComment(documentId, {
      ...replyData,
      parentId: parentCommentId,
    });
  }

  /**
   * Edit comment — تعديل التعليق
   */
  async editComment(documentId, commentId, newContent, editorId) {
    const comments = this.comments.get(documentId);
    if (!comments) return { success: false, message: 'لا توجد تعليقات' };

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return { success: false, message: 'التعليق غير موجود' };

    if (comment.authorId !== editorId) {
      return { success: false, message: 'لا يمكنك تعديل تعليقات الآخرين' };
    }

    comment.editHistory.push({
      oldContent: comment.content,
      editedAt: new Date(),
    });

    comment.content = newContent;
    comment.isEdited = true;
    comment.updatedAt = new Date();
    comment.mentions = this._extractMentions(newContent);

    return { success: true, data: comment, message: 'تم تعديل التعليق' };
  }

  /**
   * Delete comment — حذف التعليق
   */
  async deleteComment(documentId, commentId, userId) {
    const comments = this.comments.get(documentId);
    if (!comments) return { success: false, message: 'لا توجد تعليقات' };

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return { success: false, message: 'التعليق غير موجود' };

    if (comment.authorId !== userId) {
      return { success: false, message: 'لا يمكنك حذف تعليقات الآخرين' };
    }

    comment.status = 'deleted';
    comment.deletedAt = new Date();

    return { success: true, message: 'تم حذف التعليق' };
  }

  /**
   * Resolve/unresolve comment — حل/إلغاء حل التعليق
   */
  async toggleResolveComment(documentId, commentId, userId) {
    const comments = this.comments.get(documentId);
    if (!comments) return { success: false, message: 'لا توجد تعليقات' };

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return { success: false, message: 'التعليق غير موجود' };

    comment.status = comment.status === 'resolved' ? 'active' : 'resolved';
    comment.resolvedBy = comment.status === 'resolved' ? userId : null;
    comment.resolvedAt = comment.status === 'resolved' ? new Date() : null;

    this.emit('commentResolved', {
      documentId,
      commentId,
      resolved: comment.status === 'resolved',
    });

    return {
      success: true,
      data: comment,
      message: comment.status === 'resolved' ? 'تم حل التعليق' : 'تم إعادة فتح التعليق',
    };
  }

  /**
   * Add reaction to comment — إضافة تفاعل
   */
  async addReaction(documentId, commentId, reaction, userId) {
    const comments = this.comments.get(documentId);
    if (!comments) return { success: false, message: 'لا توجد تعليقات' };

    const comment = comments.find(c => c.id === commentId);
    if (!comment) return { success: false, message: 'التعليق غير موجود' };

    // Toggle reaction
    const existingIdx = comment.reactions.findIndex(
      r => r.userId === userId && r.emoji === reaction
    );
    if (existingIdx >= 0) {
      comment.reactions.splice(existingIdx, 1);
    } else {
      comment.reactions.push({ userId, emoji: reaction, addedAt: new Date() });
    }

    return { success: true, data: comment };
  }

  /**
   * Get annotation/comment statistics — الإحصائيات
   */
  async getStatistics(documentId) {
    const annotations = this.annotations.get(documentId) || [];
    const comments = this.comments.get(documentId) || [];

    const activeAnnotations = annotations.filter(a => a.status === 'active');
    const activeComments = comments.filter(c => c.status !== 'deleted');
    const resolvedComments = comments.filter(c => c.status === 'resolved');

    const byAnnotationType = {};
    activeAnnotations.forEach(a => {
      byAnnotationType[a.type] = (byAnnotationType[a.type] || 0) + 1;
    });

    const uniqueContributors = new Set([
      ...activeAnnotations.map(a => a.authorId),
      ...activeComments.map(c => c.authorId),
    ]);

    return {
      success: true,
      data: {
        totalAnnotations: activeAnnotations.length,
        totalComments: activeComments.length,
        resolvedComments: resolvedComments.length,
        unresolvedComments: activeComments.length - resolvedComments.length,
        byAnnotationType,
        uniqueContributors: uniqueContributors.size,
        totalReactions: activeComments.reduce((sum, c) => sum + c.reactions.length, 0),
      },
    };
  }

  /**
   * Get available stamp types — أنواع الأختام المتاحة
   */
  getStampTypes() {
    return {
      success: true,
      data: STAMP_TYPES,
    };
  }

  /**
   * Get annotation types — أنواع التعليقات التوضيحية
   */
  getAnnotationTypes() {
    return {
      success: true,
      data: {
        types: ANNOTATION_TYPES,
        colors: ANNOTATION_COLORS,
      },
    };
  }
}

const annotationService = new DocumentAnnotationService();
annotationService.ANNOTATION_TYPES = ANNOTATION_TYPES;
annotationService.ANNOTATION_COLORS = ANNOTATION_COLORS;
annotationService.STAMP_TYPES = STAMP_TYPES;
module.exports = annotationService;
