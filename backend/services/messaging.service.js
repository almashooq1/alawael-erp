/**
 * Messaging Service - Phase 3
 * خدمة الرسائل للدردشة الفورية
 *
 * Features:
 * - إرسال واستقبال الرسائل
 * - إدارة المحادثات
 * - البحث في الرسائل
 * - الإحصائيات
 */

const Message = require('../models/message.model');
const Conversation = require('../models/conversation.model');
const socketManager = require('../config/socket.config');

class MessagingService {
  /**
   * إرسال رسالة
   */
  async sendMessage(senderId, conversationId, messageData) {
    try {
      const { content, attachments = [], replyTo } = messageData;

      // التحقق من وجود المحادثة والصلاحية
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('المحادثة غير موجودة');
      }

      const isParticipant = conversation.participants.some(p => p.user.toString() === senderId.toString() && p.isActive);

      if (!isParticipant) {
        throw new Error('ليس لديك صلاحية للإرسال في هذه المحادثة');
      }

      // إنشاء الرسالة
      const message = await Message.create({
        conversationId,
        sender: senderId,
        content: {
          text: content,
          type: attachments.length > 0 ? 'file' : 'text',
        },
        attachments,
        replyTo,
      });

      // تحميل بيانات المرسل
      await message.populate('sender', 'fullName email avatar role');

      if (replyTo) {
        await message.populate('replyTo', 'content sender');
      }

      // تحديث المحادثة
      await conversation.updateLastMessage(message);

      // إرسال الإشعارات
      const participants = conversation.participants.filter(p => p.user.toString() !== senderId.toString() && p.isActive);

      participants.forEach(participant => {
        if (participant.notifications.enabled && !participant.notifications.muted) {
          socketManager.sendNotificationToUser(participant.user.toString(), {
            type: 'new_message',
            title: 'رسالة جديدة',
            message: `رسالة جديدة من ${message.sender.fullName}`,
            conversationId,
            messageId: message._id,
          });
        }
      });

      return {
        success: true,
        message: 'تم إرسال الرسالة بنجاح',
        data: { message },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * الحصول على رسائل المحادثة
   */
  async getConversationMessages(userId, conversationId, options = {}) {
    try {
      const { page = 1, limit = 50 } = options;

      // التحقق من الصلاحية
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('المحادثة غير موجودة');
      }

      const isParticipant = conversation.participants.some(p => p.user.toString() === userId.toString() && p.isActive);

      if (!isParticipant) {
        throw new Error('ليس لديك صلاحية لعرض هذه المحادثة');
      }

      // الحصول على الرسائل
      const messages = await Message.getConversationMessages(conversationId, userId, { page, limit });

      // الحصول على العدد الكلي
      const total = await Message.countDocuments({
        conversationId,
        deletedFor: { $ne: userId },
      });

      return {
        success: true,
        data: {
          messages,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * الحصول على محادثات المستخدم
   */
  async getUserConversations(userId, options = {}) {
    try {
      const conversations = await Conversation.getUserConversations(userId, options);

      // إضافة عدد الرسائل غير المقروءة لكل محادثة
      const conversationsWithUnread = await Promise.all(
        conversations.map(async conv => {
          const unreadCount = await Message.getUnreadCount(conv._id, userId);
          return {
            ...conv.toObject(),
            unreadCount,
          };
        }),
      );

      return {
        success: true,
        data: { conversations: conversationsWithUnread },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * إنشاء محادثة ثنائية
   */
  async createPrivateConversation(userId1, userId2) {
    try {
      const conversation = await Conversation.createPrivateConversation(userId1, userId2);

      return {
        success: true,
        message: 'تم إنشاء المحادثة بنجاح',
        data: { conversation },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * إنشاء محادثة جماعية
   */
  async createGroupConversation(creatorId, groupData) {
    try {
      const { name, description, participantIds = [] } = groupData;

      if (!name || name.trim() === '') {
        throw new Error('اسم المجموعة مطلوب');
      }

      const conversation = await Conversation.createGroupConversation(creatorId, name, description, participantIds);

      return {
        success: true,
        message: 'تم إنشاء المجموعة بنجاح',
        data: { conversation },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * إضافة مشارك للمحادثة
   */
  async addParticipant(userId, conversationId, newParticipantId) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('المحادثة غير موجودة');
      }

      // التحقق من أن المستخدم مشرف في المجموعة
      const userParticipant = conversation.participants.find(p => p.user.toString() === userId.toString());

      if (!userParticipant || userParticipant.role !== 'admin') {
        throw new Error('ليس لديك صلاحية لإضافة مشاركين');
      }

      await conversation.addParticipant(newParticipantId);

      return {
        success: true,
        message: 'تم إضافة المشارك بنجاح',
        data: { conversation },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * إزالة مشارك من المحادثة
   */
  async removeParticipant(userId, conversationId, participantId) {
    try {
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        throw new Error('المحادثة غير موجودة');
      }

      // التحقق من الصلاحيات
      const userParticipant = conversation.participants.find(p => p.user.toString() === userId.toString());

      if (!userParticipant || (userParticipant.role !== 'admin' && userId.toString() !== participantId.toString())) {
        throw new Error('ليس لديك صلاحية لإزالة مشاركين');
      }

      await conversation.removeParticipant(participantId);

      return {
        success: true,
        message: 'تم إزالة المشارك بنجاح',
        data: { conversation },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * تحديد جميع الرسائل كمقروءة
   */
  async markAllAsRead(userId, conversationId) {
    try {
      const count = await Message.markAllAsRead(conversationId, userId);

      // تحديث وقت آخر قراءة
      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        await conversation.updateLastReadAt(userId);
      }

      return {
        success: true,
        message: `تم تحديد ${count} رسالة كمقروءة`,
        data: { markedCount: count },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * حذف رسالة
   */
  async deleteMessage(userId, messageId, deleteForEveryone = false) {
    try {
      const message = await Message.findById(messageId);
      if (!message) {
        throw new Error('الرسالة غير موجودة');
      }

      if (deleteForEveryone) {
        // التحقق من أن المستخدم هو المرسل
        if (message.sender.toString() !== userId.toString()) {
          throw new Error('ليس لديك صلاحية لحذف هذه الرسالة');
        }

        message.isDeleted = true;
        await message.save();

        // إشعار جميع المشاركين
        socketManager.sendNotificationToConversation(message.conversationId, {
          type: 'message_deleted',
          messageId: message._id,
        });
      } else {
        // حذف للمستخدم فقط
        await message.deleteForUser(userId);
      }

      return {
        success: true,
        message: 'تم حذف الرسالة بنجاح',
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * البحث في الرسائل
   */
  async searchMessages(userId, searchTerm, options = {}) {
    try {
      const { conversationId, page = 1, limit = 20 } = options;

      const query = {
        'content.text': { $regex: searchTerm, $options: 'i' },
        deletedFor: { $ne: userId },
        isDeleted: false,
      };

      if (conversationId) {
        query.conversationId = conversationId;
      } else {
        // البحث في جميع محادثات المستخدم
        const conversations = await Conversation.find({
          'participants.user': userId,
          'participants.isActive': true,
        }).select('_id');

        query.conversationId = { $in: conversations.map(c => c._id) };
      }

      const messages = await Message.find(query)
        .populate('sender', 'fullName email avatar')
        .populate('conversationId', 'type groupInfo.name participants')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Message.countDocuments(query);

      return {
        success: true,
        data: {
          messages,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * الحصول على إحصائيات الرسائل
   */
  async getMessagingStats(userId) {
    try {
      // عدد المحادثات
      const totalConversations = await Conversation.countDocuments({
        'participants.user': userId,
        'participants.isActive': true,
      });

      // عدد الرسائل غير المقروءة
      const conversations = await Conversation.find({
        'participants.user': userId,
        'participants.isActive': true,
      }).select('_id');

      const conversationIds = conversations.map(c => c._id);

      const totalUnread = await Message.countDocuments({
        conversationId: { $in: conversationIds },
        sender: { $ne: userId },
        'readBy.user': { $ne: userId },
        deletedFor: { $ne: userId },
      });

      // عدد الرسائل المرسلة
      const sentMessages = await Message.countDocuments({
        sender: userId,
      });

      // عدد الرسائل المستلمة
      const receivedMessages = await Message.countDocuments({
        conversationId: { $in: conversationIds },
        sender: { $ne: userId },
        deletedFor: { $ne: userId },
      });

      return {
        success: true,
        data: {
          totalConversations,
          totalUnread,
          sentMessages,
          receivedMessages,
        },
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = MessagingService;
