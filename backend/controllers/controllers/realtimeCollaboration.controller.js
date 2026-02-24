/**
 * متحكم التعاون في الوقت الفعلي
 * Real-Time Collaboration Controller
 */

const RealtimeCollaborationService = require('../services/realTimeCollaboration.service');
const Logger = require('../utils/logger');

class RealtimeCollaborationController {
  /**
   * إنشاء جلسة تعاون جديدة
   * POST /api/collaboration/sessions
   */
  static async createSession(req, res) {
    try {
      const { documentId, title, maxParticipants, settings } = req.body;
      const userId = req.user.id;

      if (!documentId) {
        return res.status(400).json({
          success: false,
          message: 'معرف المستند مطلوب',
          en: 'Document ID is required',
        });
      }

      const session = RealtimeCollaborationService.createCollaborationSession({
        documentId,
        userId,
        title: title || `Document ${documentId}`,
        maxParticipants: maxParticipants || 50,
        permissions: settings?.permissions || {},
        allowComments: settings?.allowComments !== false,
        allowTracking: settings?.allowTracking !== false,
      });

      Logger.info(`Collaboration session created: ${session.id} by ${userId}`);

      res.status(201).json({
        success: true,
        message: 'تم إنشاء جلسة التعاون بنجاح',
        en: 'Collaboration session created successfully',
        data: session,
      });
    } catch (error) {
      Logger.error(`Create session error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل إنشاء جلسة التعاون',
        en: 'Failed to create collaboration session',
        error: error.message,
      });
    }
  }

  /**
   * الانضمام إلى جلسة تعاون
   * POST /api/collaboration/sessions/:sessionId/join
   */
  static async joinSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;
      const { color } = req.body;

      const session = RealtimeCollaborationService.addUserToSession(
        sessionId,
        userId,
        { color }
      );

      Logger.info(`User ${userId} joined session ${sessionId}`);

      res.json({
        success: true,
        message: 'تم الانضمام إلى الجلسة بنجاح',
        en: 'Successfully joined session',
        data: {
          session,
          activeUsers: RealtimeCollaborationService.getActiveUsers(sessionId),
        },
      });
    } catch (error) {
      Logger.error(`Join session error: ${error.message}`);
      res.status(error.message.includes('full') ? 400 : 500).json({
        success: false,
        message: error.message,
        en: error.message,
      });
    }
  }

  /**
   * تطبيق تغيير على المستند
   * POST /api/collaboration/sessions/:sessionId/changes
   */
  static async applyChange(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;
      const { operation, position, content } = req.body;

      if (!['insert', 'delete'].includes(operation)) {
        return res.status(400).json({
          success: false,
          message: 'نوع العملية غير صحيح',
          en: 'Invalid operation type',
        });
      }

      const change = RealtimeCollaborationService.applyChange({
        sessionId,
        userId,
        documentId: req.body.documentId,
        operation,
        position: parseInt(position) || 0,
        content: content || '',
        timestamp: new Date(),
      });

      res.json({
        success: true,
        message: 'تم تطبيق التغيير بنجاح',
        en: 'Change applied successfully',
        data: change,
      });
    } catch (error) {
      Logger.error(`Apply change error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل تطبيق التغيير',
        en: 'Failed to apply change',
        error: error.message,
      });
    }
  }

  /**
   * تحديث موضع المؤشر والتحديد
   * PATCH /api/collaboration/sessions/:sessionId/presence
   */
  static async updatePresence(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;
      const { cursor, selection } = req.body;

      const presence = RealtimeCollaborationService.updateUserPresence(
        sessionId,
        userId,
        {
          cursor: cursor || { line: 0, ch: 0 },
          selection: selection || null,
        }
      );

      res.json({
        success: true,
        message: 'تم تحديث موضع المؤشر',
        en: 'Presence updated',
        data: presence,
      });
    } catch (error) {
      Logger.error(`Update presence error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل تحديث الموضع',
        en: 'Failed to update presence',
        error: error.message,
      });
    }
  }

  /**
   * تحديث حالة الكتابة
   * PATCH /api/collaboration/sessions/:sessionId/typing
   */
  static async updateTypingStatus(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;
      const { isTyping } = req.body;

      RealtimeCollaborationService.setUserTypingStatus(
        sessionId,
        userId,
        isTyping === true
      );

      res.json({
        success: true,
        message: 'تم تحديث حالة الكتابة',
        en: 'Typing status updated',
      });
    } catch (error) {
      Logger.error(`Update typing status error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل تحديث الحالة',
        en: 'Failed to update typing status',
        error: error.message,
      });
    }
  }

  /**
   * إضافة تعليق
   * POST /api/collaboration/sessions/:sessionId/comments
   */
  static async addComment(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;
      const { documentId, position, content } = req.body;

      const comment = RealtimeCollaborationService.addComment({
        sessionId,
        documentId,
        userId,
        position,
        content,
      });

      Logger.info(`Comment added by ${userId} in session ${sessionId}`);

      res.status(201).json({
        success: true,
        message: 'تم إضافة التعليق بنجاح',
        en: 'Comment added successfully',
        data: comment,
      });
    } catch (error) {
      Logger.error(`Add comment error: ${error.message}`);
      res.status(error.message.includes('not allowed') ? 400 : 500).json({
        success: false,
        message: error.message,
        en: error.message,
      });
    }
  }

  /**
   * الرد على تعليق
   * POST /api/collaboration/comments/:commentId/replies
   */
  static async replyToComment(req, res) {
    try {
      const { commentId } = req.params;
      const userId = req.user.id;
      const { content } = req.body;

      const reply = RealtimeCollaborationService.replyToComment(commentId, {
        userId,
        content,
      });

      res.status(201).json({
        success: true,
        message: 'تم إضافة الرد بنجاح',
        en: 'Reply added successfully',
        data: reply,
      });
    } catch (error) {
      Logger.error(`Reply to comment error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل إضافة الرد',
        en: 'Failed to add reply',
        error: error.message,
      });
    }
  }

  /**
   * التراجع عن التغيير الأخير
   * POST /api/collaboration/sessions/:sessionId/undo
   */
  static async undo(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      const change = RealtimeCollaborationService.undo(sessionId, userId);

      Logger.info(`Change undone by ${userId} in session ${sessionId}`);

      res.json({
        success: true,
        message: 'تم التراجع عن التغيير',
        en: 'Change undone',
        data: change,
      });
    } catch (error) {
      Logger.error(`Undo error: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
        en: error.message,
      });
    }
  }

  /**
   * إعادة التغيير المتراجع عنه
   * POST /api/collaboration/sessions/:sessionId/redo
   */
  static async redo(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      const change = RealtimeCollaborationService.redo(sessionId, userId);

      Logger.info(`Change redone by ${userId} in session ${sessionId}`);

      res.json({
        success: true,
        message: 'تم إعادة التغيير',
        en: 'Change redone',
        data: change,
      });
    } catch (error) {
      Logger.error(`Redo error: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
        en: error.message,
      });
    }
  }

  /**
   * الحصول على نسخة المستند عند نقطة زمنية معينة
   * GET /api/collaboration/sessions/:sessionId/snapshot
   */
  static async getDocumentSnapshot(req, res) {
    try {
      const { sessionId } = req.params;
      const { timestamp } = req.query;

      const snapshot = RealtimeCollaborationService.getDocumentSnapshot(
        sessionId,
        timestamp ? new Date(timestamp) : new Date()
      );

      res.json({
        success: true,
        message: 'تم جلب النسخة بنجاح',
        en: 'Snapshot retrieved successfully',
        data: {
          sessionId,
          changesCount: snapshot.length,
          changes: snapshot,
        },
      });
    } catch (error) {
      Logger.error(`Get snapshot error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل جلب النسخة',
        en: 'Failed to get snapshot',
        error: error.message,
      });
    }
  }

  /**
   * الحصول على جميع المستخدمين النشطين
   * GET /api/collaboration/sessions/:sessionId/users
   */
  static async getActiveUsers(req, res) {
    try {
      const { sessionId } = req.params;

      const activeUsers = RealtimeCollaborationService.getActiveUsers(sessionId);

      res.json({
        success: true,
        message: 'تم جلب المستخدمين',
        en: 'Users retrieved',
        data: {
          sessionId,
          count: activeUsers.length,
          users: activeUsers,
        },
      });
    } catch (error) {
      Logger.error(`Get active users error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل جلب المستخدمين',
        en: 'Failed to get users',
        error: error.message,
      });
    }
  }

  /**
   * مغادرة الجلسة
   * POST /api/collaboration/sessions/:sessionId/leave
   */
  static async leaveSession(req, res) {
    try {
      const { sessionId } = req.params;
      const userId = req.user.id;

      RealtimeCollaborationService.removeUserFromSession(sessionId, userId);

      Logger.info(`User ${userId} left session ${sessionId}`);

      res.json({
        success: true,
        message: 'تم مغادرة الجلسة بنجاح',
        en: 'Successfully left session',
      });
    } catch (error) {
      Logger.error(`Leave session error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل مغادرة الجلسة',
        en: 'Failed to leave session',
        error: error.message,
      });
    }
  }

  /**
   * الحصول على إحصائيات الجلسة
   * GET /api/collaboration/sessions/:sessionId/stats
   */
  static async getSessionStats(req, res) {
    try {
      const { sessionId } = req.params;

      const stats = RealtimeCollaborationService.getSessionStats(sessionId);

      if (!stats) {
        return res.status(404).json({
          success: false,
          message: 'الجلسة غير موجودة',
          en: 'Session not found',
        });
      }

      res.json({
        success: true,
        message: 'تم جلب الإحصائيات',
        en: 'Statistics retrieved',
        data: stats,
      });
    } catch (error) {
      Logger.error(`Get stats error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل جلب الإحصائيات',
        en: 'Failed to get statistics',
        error: error.message,
      });
    }
  }

  /**
   * تصدير سجل التغييرات
   * GET /api/collaboration/sessions/:sessionId/export
   */
  static async exportChangeHistory(req, res) {
    try {
      const { sessionId } = req.params;
      const { userId } = req.query;

      const history = RealtimeCollaborationService.exportChangeHistory(
        sessionId,
        { userId }
      );

      if (!history) {
        return res.status(404).json({
          success: false,
          message: 'الجلسة غير موجودة',
          en: 'Session not found',
        });
      }

      res.json({
        success: true,
        message: 'تم تصدير السجل بنجاح',
        en: 'History exported successfully',
        data: history,
      });
    } catch (error) {
      Logger.error(`Export history error: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'فشل تصدير السجل',
        en: 'Failed to export history',
        error: error.message,
      });
    }
  }
}

module.exports = RealtimeCollaborationController;
