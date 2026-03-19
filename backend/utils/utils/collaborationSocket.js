/**
 * WebSocket Integration for Real-Time Collaboration
 * Socket.io handlers for collaboration events
 */

const io = require('socket.io');
const RealtimeCollaborationService = require('../services/realTimeCollaboration.service');
const Logger = require('../utils/logger');

class CollaborationSocketHandler {
  constructor(httpServer) {
    this.io = io(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      maxHttpBufferSize: 1e6, // 1MB
    });

    this.userSessions = new Map(); // userId -> sessionId mapping
    this.sessionSockets = new Map(); // sessionId -> Set of socket IDs
    this.setupEventHandlers();
  }

  /**
   * إعداد معالجات الأحداث الأساسية
   * Setup basic event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      Logger.info(`WebSocket user connected: ${socket.id}`);

      // ========== جلسات التعاون ==========
      socket.on('collaboration:join', (data) => this.handleJoinSession(socket, data));
      socket.on('collaboration:leave', (data) => this.handleLeaveSession(socket, data));

      // ========== التغييرات ==========
      socket.on('document:change', (data) => this.handleDocumentChange(socket, data));
      socket.on('document:undo', (data) => this.handleUndo(socket, data));
      socket.on('document:redo', (data) => this.handleRedo(socket, data));

      // ========== الموضع والحضور ==========
      socket.on('presence:update', (data) => this.handlePresenceUpdate(socket, data));
      socket.on('typing:start', (data) => this.handleTypingStart(socket, data));
      socket.on('typing:stop', (data) => this.handleTypingStop(socket, data));

      // ========== التعليقات ==========
      socket.on('comment:add', (data) => this.handleAddComment(socket, data));
      socket.on('comment:reply', (data) => this.handleReplyToComment(socket, data));

      // ========== النظافة ==========
      socket.on('disconnect', () => this.handleDisconnect(socket));
    });
  }

  /**
   * معالج الانضمام إلى الجلسة
   * Join session handler
   */
  handleJoinSession(socket, data) {
    const { sessionId, userId, color } = data;

    try {
      // إضافة المستخدم إلى الجلسة
      const session = RealtimeCollaborationService.addUserToSession(
        sessionId,
        userId,
        { color }
      );

      // حفظ mapping المستخدم والجلسة
      this.userSessions.set(socket.id, { userId, sessionId });

      // إضافة socket إلى غرفة الجلسة
      socket.join(`session:${sessionId}`);

      // تسجيل socket في الجلسة
      if (!this.sessionSockets.has(sessionId)) {
        this.sessionSockets.set(sessionId, new Set());
      }
      this.sessionSockets.get(sessionId).add(socket.id);

      // إخطار الآخرين
      this.io.to(`session:${sessionId}`).emit('user:joined', {
        userId,
        activeUsers: RealtimeCollaborationService.getActiveUsers(sessionId),
      });

      // إرسال الرد للمستخدم الذي انضم
      socket.emit('collaboration:joined', {
        success: true,
        sessionId,
        session,
        activeUsers: RealtimeCollaborationService.getActiveUsers(sessionId),
      });

      Logger.info(`User ${userId} joined session ${sessionId}`);
    } catch (error) {
      socket.emit('error', {
        code: 'JOIN_FAILED',
        message: error.message,
      });
      Logger.error(`Join session error: ${error.message}`);
    }
  }

  /**
   * معالج مغادرة الجلسة
   * Leave session handler
   */
  handleLeaveSession(socket, data) {
    const { sessionId, userId } = data;

    try {
      // إزالة المستخدم من الجلسة
      RealtimeCollaborationService.removeUserFromSession(sessionId, userId);

      // إزالة socket من الغرفة
      socket.leave(`session:${sessionId}`);

      // تحديث قائمة الـ sockets
      const sockets = this.sessionSockets.get(sessionId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          this.sessionSockets.delete(sessionId);
        }
      }

      // إزالة mapping المستخدم
      this.userSessions.delete(socket.id);

      // إخطار الآخرين
      this.io.to(`session:${sessionId}`).emit('user:left', {
        userId,
        activeUsers: RealtimeCollaborationService.getActiveUsers(sessionId),
      });

      Logger.info(`User ${userId} left session ${sessionId}`);
    } catch (error) {
      Logger.error(`Leave session error: ${error.message}`);
    }
  }

  /**
   * معالج تغيير المستند
   * Document change handler
   */
  handleDocumentChange(socket, data) {
    const { sessionId, userId, documentId, operation, position, content } = data;

    try {
      const change = RealtimeCollaborationService.applyChange({
        sessionId,
        userId,
        documentId,
        operation,
        position,
        content,
        timestamp: new Date(),
      });

      // بث التغيير إلى جميع المستخدمين في الجلسة
      this.io.to(`session:${sessionId}`).emit('document:changed', {
        change,
        userId,
      });

      Logger.info(`Change applied in session ${sessionId}`);
    } catch (error) {
      socket.emit('error', {
        code: 'CHANGE_FAILED',
        message: error.message,
      });
      Logger.error(`Document change error: ${error.message}`);
    }
  }

  /**
   * معالج التراجع عن التغيير
   * Undo handler
   */
  handleUndo(socket, data) {
    const { sessionId, userId } = data;

    try {
      const change = RealtimeCollaborationService.undo(sessionId, userId);

      // بث الإلغاء إلى جميع المستخدمين
      this.io.to(`session:${sessionId}`).emit('document:undone', {
        change,
        userId,
      });

      Logger.info(`Undo performed in session ${sessionId}`);
    } catch (error) {
      socket.emit('error', {
        code: 'UNDO_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * معالج إعادة التغيير
   * Redo handler
   */
  handleRedo(socket, data) {
    const { sessionId, userId } = data;

    try {
      const change = RealtimeCollaborationService.redo(sessionId, userId);

      // بث الإعادة إلى جميع المستخدمين
      this.io.to(`session:${sessionId}`).emit('document:redone', {
        change,
        userId,
      });

      Logger.info(`Redo performed in session ${sessionId}`);
    } catch (error) {
      socket.emit('error', {
        code: 'REDO_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * معالج تحديث الموضع
   * Presence update handler
   */
  handlePresenceUpdate(socket, data) {
    const { sessionId, userId, cursor, selection } = data;

    try {
      const presence = RealtimeCollaborationService.updateUserPresence(
        sessionId,
        userId,
        { cursor, selection }
      );

      // بث الموضع إلى جميع المستخدمين
      this.io.to(`session:${sessionId}`).emit('presence:changed', {
        userId,
        presence,
      });
    } catch (error) {
      Logger.error(`Presence update error: ${error.message}`);
    }
  }

  /**
   * معالج بداية الكتابة
   * Typing start handler
   */
  handleTypingStart(socket, data) {
    const { sessionId, userId } = data;

    try {
      RealtimeCollaborationService.setUserTypingStatus(sessionId, userId, true);

      // بث حالة الكتابة
      this.io.to(`session:${sessionId}`).emit('user:typing', {
        userId,
        isTyping: true,
      });
    } catch (error) {
      Logger.error(`Typing start error: ${error.message}`);
    }
  }

  /**
   * معالج نهاية الكتابة
   * Typing stop handler
   */
  handleTypingStop(socket, data) {
    const { sessionId, userId } = data;

    try {
      RealtimeCollaborationService.setUserTypingStatus(sessionId, userId, false);

      // بث حالة الكتابة
      this.io.to(`session:${sessionId}`).emit('user:typing', {
        userId,
        isTyping: false,
      });
    } catch (error) {
      Logger.error(`Typing stop error: ${error.message}`);
    }
  }

  /**
   * معالج إضافة التعليق
   * Add comment handler
   */
  handleAddComment(socket, data) {
    const { sessionId, userId, documentId, position, content } = data;

    try {
      const comment = RealtimeCollaborationService.addComment({
        sessionId,
        userId,
        documentId,
        position,
        content,
      });

      // بث التعليق إلى جميع المستخدمين
      this.io.to(`session:${sessionId}`).emit('comment:added', comment);

      Logger.info(`Comment added in session ${sessionId}`);
    } catch (error) {
      socket.emit('error', {
        code: 'COMMENT_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * معالج الرد على التعليق
   * Reply to comment handler
   */
  handleReplyToComment(socket, data) {
    const { sessionId, commentId, userId, content } = data;

    try {
      const reply = RealtimeCollaborationService.replyToComment(commentId, {
        userId,
        content,
      });

      // بث الرد إلى جميع المستخدمين
      this.io.to(`session:${sessionId}`).emit('comment:reply', {
        commentId,
        reply,
      });

      Logger.info(`Reply added to comment in session ${sessionId}`);
    } catch (error) {
      socket.emit('error', {
        code: 'REPLY_FAILED',
        message: error.message,
      });
    }
  }

  /**
   * معالج قطع الاتصال
   * Disconnect handler
   */
  handleDisconnect(socket) {
    const session = this.userSessions.get(socket.id);

    if (session) {
      const { userId, sessionId } = session;

      try {
        // إزالة المستخدم من الجلسة
        RealtimeCollaborationService.removeUserFromSession(sessionId, userId);

        // إزالة socket من الغرفة
        const sockets = this.sessionSockets.get(sessionId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.sessionSockets.delete(sessionId);
          }
        }

        // إخطار الآخرين
        this.io.to(`session:${sessionId}`).emit('user:disconnected', {
          userId,
          activeUsers: RealtimeCollaborationService.getActiveUsers(sessionId),
        });

        Logger.info(`User ${userId} disconnected from session ${sessionId}`);
      } catch (error) {
        Logger.error(`Disconnect handler error: ${error.message}`);
      }
    }

    this.userSessions.delete(socket.id);
    Logger.info(`WebSocket user disconnected: ${socket.id}`);
  }

  /**
   * الحصول على عدد المستخدمين النشطين في جلسة
   * Get active user count in session
   */
  getActiveUserCount(sessionId) {
    const sockets = this.sessionSockets.get(sessionId);
    return sockets ? sockets.size : 0;
  }

  /**
   * بث رسالة إلى جميع المستخدمين في جلسة
   * Broadcast message to session
   */
  broadcastToSession(sessionId, event, data) {
    this.io.to(`session:${sessionId}`).emit(event, data);
  }

  /**
   * إغلاق جميع الاتصالات في جلسة
   * Close all connections in session
   */
  closeSession(sessionId) {
    const sockets = this.sessionSockets.get(sessionId);
    if (sockets) {
      sockets.forEach(socketId => {
        this.io.to(socketId).emit('session:closed', { sessionId });
      });
      this.sessionSockets.delete(sessionId);
    }
  }
}

module.exports = CollaborationSocketHandler;
