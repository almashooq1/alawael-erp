/**
 * Messaging Routes - Phase 3
 * مسارات API للدردشة الفورية
 *
 * Endpoints:
 * - POST /api/messages/send - إرسال رسالة
 * - GET /api/messages/conversation/:id - رسائل محادثة
 * - POST /api/messages/mark-read/:conversationId - تحديد كمقروءة
 * - DELETE /api/messages/:id - حذف رسالة
 * - GET /api/messages/search - البحث في الرسائل
 *
 * - GET /api/conversations - محادثات المستخدم
 * - POST /api/conversations/private - إنشاء محادثة ثنائية
 * - POST /api/conversations/group - إنشاء مجموعة
 * - GET /api/conversations/:id - تفاصيل محادثة
 * - POST /api/conversations/:id/participants - إضافة مشارك
 * - DELETE /api/conversations/:id/participants/:userId - إزالة مشارك
 * - GET /api/messages/stats - إحصائيات الرسائل
 */

const express = require('express');
const router = express.Router();
const messagingService = require('../services/messaging.service');
const { authenticateToken } = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter');
const {
  sanitizeInput,
  commonValidations,
  handleValidationErrors,
} = require('../middleware/requestValidation');
const { body, param, query } = require('express-validator');

// جميع المسارات تتطلب مصادقة + حماية عامة
router.use(authenticateToken);
router.use(apiLimiter);
router.use(sanitizeInput);

// ==================== رسائل ====================

/**
 * إرسال رسالة
 * POST /api/messages/send
 */
router.post(
  '/send',
  [
    commonValidations.requiredString('content', 1, 2000),
    body('conversationId').isString().isLength({ min: 2 }).withMessage('ConversationId required'),
    body('attachments').optional().isArray({ max: 10 }).withMessage('Attachments must be array'),
    body('replyTo').optional().isString(),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const { conversationId, content, attachments, replyTo } = req.body;

      if (!conversationId || !content) {
        return res.status(400).json({
          success: false,
          message: 'معرّف المحادثة والمحتوى مطلوبان',
        });
      }

      const result = await messagingService.sendMessage(userId, conversationId, {
        content,
        attachments,
        replyTo,
      });

      res.json(result);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء إرسال الرسالة',
      });
    }
  }
);

/**
 * الحصول على رسائل محادثة
 * GET /api/messages/conversation/:id
 */
router.get(
  '/conversation/:id',
  [
    param('id').isString().isLength({ min: 2 }).withMessage('Invalid conversation id'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const conversationId = req.params.id;
      const { page = 1, limit = 50 } = req.query;

      const result = await messagingService.getConversationMessages(userId, conversationId, {
        page,
        limit,
      });

      res.json(result);
    } catch (error) {
      console.error('Error getting messages:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء جلب الرسائل',
      });
    }
  }
);

/**
 * تحديد جميع الرسائل كمقروءة
 * POST /api/messages/mark-read/:conversationId
 */
router.post(
  '/mark-read/:conversationId',
  [
    param('conversationId').isString().isLength({ min: 2 }).withMessage('Invalid conversation id'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const conversationId = req.params.conversationId;

      const result = await messagingService.markAllAsRead(userId, conversationId);

      res.json(result);
    } catch (error) {
      console.error('Error marking messages as read:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء تحديد الرسائل كمقروءة',
      });
    }
  }
);

/**
 * حذف رسالة
 * DELETE /api/messages/:id
 */
router.delete(
  '/:id',
  [
    param('id').isString().isLength({ min: 2 }).withMessage('Invalid message id'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const messageId = req.params.id;
      const { deleteForEveryone = false } = req.query;

      const result = await messagingService.deleteMessage(
        userId,
        messageId,
        deleteForEveryone === 'true'
      );

      res.json(result);
    } catch (error) {
      console.error('Error deleting message:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء حذف الرسالة',
      });
    }
  }
);

/**
 * البحث في الرسائل
 * GET /api/messages/search
 */
router.get(
  '/search',
  [
    query('q').isString().isLength({ min: 1, max: 100 }).withMessage('Search text required'),
    query('conversationId').optional().isString(),
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const { q, conversationId, page = 1, limit = 20 } = req.query;

      if (!q || q.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'نص البحث مطلوب',
        });
      }

      const result = await messagingService.searchMessages(userId, q, {
        conversationId,
        page,
        limit,
      });

      res.json(result);
    } catch (error) {
      console.error('Error searching messages:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء البحث في الرسائل',
      });
    }
  }
);

/**
 * إحصائيات الرسائل
 * GET /api/messages/stats
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;

    const result = await messagingService.getMessagingStats(userId);

    res.json(result);
  } catch (error) {
    console.error('Error getting messaging stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'حدث خطأ أثناء جلب الإحصائيات',
    });
  }
});

// ==================== محادثات ====================

/**
 * الحصول على محادثات المستخدم
 * GET /api/conversations
 */
router.get(
  '/conversations',
  [
    query('page').optional().isInt({ min: 1 }).toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('archived').optional().isBoolean().toBoolean(),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const { page = 1, limit = 20, archived = false } = req.query;

      const result = await messagingService.getUserConversations(userId, {
        page,
        limit,
        archived: archived === 'true',
      });

      res.json(result);
    } catch (error) {
      console.error('Error getting conversations:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء جلب المحادثات',
      });
    }
  }
);

/**
 * إنشاء محادثة ثنائية
 * POST /api/conversations/private
 */
router.post(
  '/conversations/private',
  [
    body('userId').isString().isLength({ min: 2 }).withMessage('Other userId required'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const { userId: otherUserId } = req.body;

      if (!otherUserId) {
        return res.status(400).json({
          success: false,
          message: 'معرّف المستخدم الآخر مطلوب',
        });
      }

      const result = await messagingService.createPrivateConversation(userId, otherUserId);

      res.json(result);
    } catch (error) {
      console.error('Error creating private conversation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء إنشاء المحادثة',
      });
    }
  }
);

/**
 * إنشاء محادثة جماعية
 * POST /api/conversations/group
 */
router.post(
  '/conversations/group',
  [
    body('name').isString().isLength({ min: 2, max: 100 }).withMessage('Group name required'),
    body('description').optional().isLength({ max: 500 }),
    body('participantIds')
      .optional()
      .isArray({ max: 200 })
      .withMessage('Participants must be array'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const { name, description, participantIds } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'اسم المجموعة مطلوب',
        });
      }

      const result = await messagingService.createGroupConversation(userId, {
        name,
        description,
        participantIds,
      });

      res.json(result);
    } catch (error) {
      console.error('Error creating group conversation:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء إنشاء المجموعة',
      });
    }
  }
);

/**
 * إضافة مشارك للمحادثة
 * POST /api/conversations/:id/participants
 */
router.post(
  '/conversations/:id/participants',
  [
    param('id').isString().isLength({ min: 2 }).withMessage('Invalid conversation id'),
    body('userId').isString().isLength({ min: 2 }).withMessage('Participant userId required'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const conversationId = req.params.id;
      const { userId: newParticipantId } = req.body;

      if (!newParticipantId) {
        return res.status(400).json({
          success: false,
          message: 'معرّف المشارك مطلوب',
        });
      }

      const result = await messagingService.addParticipant(
        userId,
        conversationId,
        newParticipantId
      );

      res.json(result);
    } catch (error) {
      console.error('Error adding participant:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء إضافة المشارك',
      });
    }
  }
);

/**
 * إزالة مشارك من المحادثة
 * DELETE /api/conversations/:id/participants/:userId
 */
router.delete(
  '/conversations/:id/participants/:userId',
  [
    param('id').isString().isLength({ min: 2 }).withMessage('Invalid conversation id'),
    param('userId').isString().isLength({ min: 2 }).withMessage('Invalid participant id'),
    handleValidationErrors,
  ],
  async (req, res) => {
    try {
      const userId = req.user.id || req.user._id;
      const conversationId = req.params.id;
      const participantId = req.params.userId;

      const result = await messagingService.removeParticipant(
        userId,
        conversationId,
        participantId
      );

      res.json(result);
    } catch (error) {
      console.error('Error removing participant:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'حدث خطأ أثناء إزالة المشارك',
      });
    }
  }
);

module.exports = router;

