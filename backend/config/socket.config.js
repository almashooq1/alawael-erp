/* eslint-disable no-unused-vars */
/**
 * Socket.IO Configuration - Phase 3
 * إعداد Socket.IO للدردشة الفورية
 *
 * Features:
 * - مصادقة المستخدمين
 * - إدارة الاتصالات
 * - أحداث الرسائل
 * - حالة الكتابة
 * - حالة الاتصال
 */

const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');

class SocketManager {
  constructor() {
    this.io = null;
    this.users = new Map(); // userId -> socketId
  }

  /**
   * تهيئة Socket.IO
   * @param {Object} io - Socket.IO instance
   */
  initialize(io) {
    this.io = io;

    this.setupMiddleware();
    this.setupEventHandlers();

    logger.info('Socket.IO initialized for Messaging');
  }

  /**
   * إعداد Middleware للمصادقة
   */
  setupMiddleware() {
    // 1) Authentication middleware
    this.io.use((socket, next) => {
      try {
        const token =
          socket.handshake.auth.token ||
          socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication error: No token provided'));
        }

        const { jwtSecret } = require('./secrets');
        const decoded = jwt.verify(token, jwtSecret);
        socket.userId = decoded.id || decoded.userId;
        socket.userEmail = decoded.email;

        next();
      } catch (error) {
        logger.error('Socket authentication error:', error);
        next(new Error('Authentication error: Invalid token'));
      }
    });

    // 2) Per-socket event rate limiting (prevents flooding)
    this.io.use((socket, next) => {
      const MAX_EVENTS = 50; // max events per window
      const WINDOW_MS = 10000; // 10 seconds
      let eventTimestamps = [];

      const originalOnEvent = socket.onevent?.bind(socket);
      if (originalOnEvent) {
        socket.onevent = packet => {
          const now = Date.now();
          eventTimestamps = eventTimestamps.filter(t => t > now - WINDOW_MS);
          eventTimestamps.push(now);

          if (eventTimestamps.length > MAX_EVENTS) {
            logger.warn(
              `Socket flood detected: user ${socket.userId}, events=${eventTimestamps.length}/${WINDOW_MS}ms`
            );
            socket.emit('error', { message: 'Rate limit exceeded' });
            return; // drop the event
          }
          originalOnEvent(packet);
        };
      }
      next();
    });
  }

  /**
   * إعداد معالجات الأحداث
   */
  setupEventHandlers() {
    this.io.on('connection', socket => {
      logger.info(`User connected: ${socket.userId}`);

      // تسجيل المستخدم
      this.users.set(socket.userId, socket.id);

      // إرسال حالة الاتصال
      this.broadcastUserStatus(socket.userId, 'online');

      // الانضمام إلى غرف المحادثات
      this.joinUserConversations(socket);

      // معالجة الأحداث
      this.handleSendMessage(socket);
      this.handleTyping(socket);
      this.handleStopTyping(socket);
      this.handleMessageRead(socket);
      this.handleMessageDelivered(socket);
      this.handleJoinConversation(socket);
      this.handleLeaveConversation(socket);
      this.handleDisconnect(socket);
    });
  }

  /**
   * الانضمام إلى غرف المحادثات
   */
  async joinUserConversations(socket) {
    try {
      const conversations = await Conversation.find({
        'participants.user': socket.userId,
        'participants.isActive': true,
      });

      conversations.forEach(conv => {
        socket.join(`conversation:${conv._id}`);
      });

      logger.info(`User ${socket.userId} joined ${conversations.length} conversations`);
    } catch (error) {
      logger.error('Error joining conversations:', error);
    }
  }

  /**
   * إرسال رسالة
   */
  handleSendMessage(socket) {
    socket.on('send_message', async data => {
      try {
        const { conversationId, content, attachments, replyTo } = data;

        // إنشاء الرسالة
        const message = await Message.create({
          conversationId,
          sender: socket.userId,
          content: {
            text: content,
            type: attachments?.length > 0 ? 'file' : 'text',
          },
          attachments,
          replyTo,
        });

        // تحميل بيانات المرسل
        await message.populate('sender', 'fullName email avatar role');

        // تحديث المحادثة
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          await conversation.updateLastMessage(message);
        }

        // إرسال الرسالة لجميع المشاركين
        this.io.to(`conversation:${conversationId}`).emit('new_message', {
          message,
          conversationId,
        });

        // إرسال تأكيد للمرسل
        socket.emit('message_sent', { message });

        // إيقاف حالة الكتابة
        if (conversation) {
          await conversation.removeTypingUser(socket.userId);
          this.io.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
            conversationId,
            userId: socket.userId,
          });
        }
      } catch (error) {
        logger.error('Error sending message:', error);
        socket.emit('message_error', { error: 'حدث خطأ داخلي' });
      }
    });
  }

  /**
   * حالة الكتابة
   */
  handleTyping(socket) {
    socket.on('typing', async data => {
      try {
        const { conversationId } = data;

        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          await conversation.addTypingUser(socket.userId);

          // إرسال حالة الكتابة للآخرين فقط
          socket.to(`conversation:${conversationId}`).emit('user_typing', {
            conversationId,
            userId: socket.userId,
            userEmail: socket.userEmail,
          });
        }
      } catch (error) {
        logger.error('Error handling typing:', error);
      }
    });
  }

  /**
   * إيقاف حالة الكتابة
   */
  handleStopTyping(socket) {
    socket.on('stop_typing', async data => {
      try {
        const { conversationId } = data;

        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          await conversation.removeTypingUser(socket.userId);

          socket.to(`conversation:${conversationId}`).emit('user_stopped_typing', {
            conversationId,
            userId: socket.userId,
          });
        }
      } catch (error) {
        logger.error('Error handling stop typing:', error);
      }
    });
  }

  /**
   * تحديد قراءة الرسالة
   */
  handleMessageRead(socket) {
    socket.on('message_read', async data => {
      try {
        const { messageId, conversationId } = data;

        const message = await Message.findById(messageId);
        if (message) {
          await message.markAsRead(socket.userId);

          // تحديث وقت آخر قراءة في المحادثة
          const conversation = await Conversation.findById(conversationId);
          if (conversation) {
            await conversation.updateLastReadAt(socket.userId);
          }

          // إشعار المرسل بالقراءة
          this.io.to(`conversation:${conversationId}`).emit('message_read_update', {
            messageId,
            conversationId,
            userId: socket.userId,
          });
        }
      } catch (error) {
        logger.error('Error marking message as read:', error);
      }
    });
  }

  /**
   * تحديد تسليم الرسالة
   */
  handleMessageDelivered(socket) {
    socket.on('message_delivered', async data => {
      try {
        const { messageId } = data;

        const message = await Message.findById(messageId);
        if (message) {
          await message.markAsDelivered(socket.userId);

          // إشعار المرسل بالتسليم
          const senderSocketId = this.users.get(message.sender.toString());
          if (senderSocketId) {
            this.io.to(senderSocketId).emit('message_delivered_update', {
              messageId,
              userId: socket.userId,
            });
          }
        }
      } catch (error) {
        logger.error('Error marking message as delivered:', error);
      }
    });
  }

  /**
   * الانضمام لمحادثة
   */
  handleJoinConversation(socket) {
    socket.on('join_conversation', data => {
      const { conversationId } = data;
      socket.join(`conversation:${conversationId}`);
      logger.info(`User ${socket.userId} joined conversation ${conversationId}`);
    });
  }

  /**
   * مغادرة محادثة
   */
  handleLeaveConversation(socket) {
    socket.on('leave_conversation', data => {
      const { conversationId } = data;
      socket.leave(`conversation:${conversationId}`);
      logger.info(`User ${socket.userId} left conversation ${conversationId}`);
    });
  }

  /**
   * قطع الاتصال
   */
  handleDisconnect(socket) {
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.userId}`);

      // إزالة المستخدم من القائمة
      this.users.delete(socket.userId);

      // إرسال حالة عدم الاتصال
      this.broadcastUserStatus(socket.userId, 'offline');
    });
  }

  /**
   * بث حالة المستخدم
   */
  broadcastUserStatus(userId, status) {
    this.io.emit('user_status_change', {
      userId,
      status,
      timestamp: new Date(),
    });
  }

  /**
   * إرسال إشعار لمستخدم معين
   */
  sendNotificationToUser(userId, notification) {
    const socketId = this.users.get(userId);
    if (socketId) {
      this.io.to(socketId).emit('notification', notification);
    }
  }

  /**
   * إرسال إشعار لجميع المستخدمين في محادثة
   */
  sendNotificationToConversation(conversationId, notification, excludeUserId = null) {
    if (excludeUserId) {
      const socketId = this.users.get(excludeUserId);
      if (socketId) {
        this.io
          .to(`conversation:${conversationId}`)
          .except(socketId)
          .emit('notification', notification);
        return;
      }
    }

    this.io.to(`conversation:${conversationId}`).emit('notification', notification);
  }

  /**
   * الحصول على المستخدمين المتصلين
   */
  getOnlineUsers() {
    return Array.from(this.users.keys());
  }

  /**
   * التحقق من اتصال المستخدم
   */
  isUserOnline(userId) {
    return this.users.has(userId);
  }
}

// إنشاء نسخة واحدة فقط
const socketManager = new SocketManager();

module.exports = socketManager;
