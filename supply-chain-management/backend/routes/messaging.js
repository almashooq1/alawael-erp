const express = require('express');
const router = express.Router();
const MessagingService = require('../services/messagingService');

/**
 * Real-Time Messaging Routes (Phase 3 Extension)
 * Base URL: /api/messaging
 */

const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/**
 * POST /api/messaging/send
 * Send a direct message
 */
router.post(
  '/send',
  asyncHandler(async (req, res) => {
    const { chatId, senderId, recipientId, message, type = 'text', metadata = {} } = req.body;

    if (!senderId || !recipientId || !message) {
      return res.status(400).json({
        success: false,
        error: 'senderId, recipientId, and message are required',
      });
    }

    const result = MessagingService.sendMessage({
      chatId: chatId || `${senderId}-${recipientId}`,
      senderId,
      recipientId,
      message,
      type,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Message sent',
    });
  })
);

/**
 * POST /api/messaging/group/send
 * Send a group message
 */
router.post(
  '/group/send',
  asyncHandler(async (req, res) => {
    const { chatId, senderId, message, type = 'text', metadata = {} } = req.body;

    if (!chatId || !senderId || !message) {
      return res.status(400).json({
        success: false,
        error: 'chatId, senderId, and message are required',
      });
    }

    const result = MessagingService.sendGroupMessage({
      chatId,
      senderId,
      message,
      type,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Group message sent',
    });
  })
);

/**
 * POST /api/messaging/typing
 * Send typing indicator
 */
router.post(
  '/typing',
  asyncHandler(async (req, res) => {
    const { userId, chatId, isTyping = true } = req.body;

    if (!userId || !chatId) {
      return res.status(400).json({
        success: false,
        error: 'userId and chatId are required',
      });
    }

    MessagingService.sendTypingIndicator(userId, chatId, isTyping);

    res.status(200).json({
      success: true,
      message: `Typing indicator ${isTyping ? 'sent' : 'removed'}`,
    });
  })
);

/**
 * POST /api/messaging/read-receipt
 * Mark message as read
 */
router.post(
  '/read-receipt',
  asyncHandler(async (req, res) => {
    const { userId, messageId, chatId } = req.body;

    if (!userId || !messageId) {
      return res.status(400).json({
        success: false,
        error: 'userId and messageId are required',
      });
    }

    MessagingService.sendReadReceipt(userId, messageId, chatId);

    res.status(200).json({
      success: true,
      message: 'Read receipt sent',
    });
  })
);

/**
 * POST /api/messaging/group/create
 * Create a group chat
 */
router.post(
  '/group/create',
  asyncHandler(async (req, res) => {
    const { chatId, name, participants, createdBy, metadata = {} } = req.body;

    if (!chatId || !name || !participants || !createdBy) {
      return res.status(400).json({
        success: false,
        error: 'chatId, name, participants, and createdBy are required',
      });
    }

    const group = MessagingService.createGroupChat({
      chatId,
      name,
      participants,
      createdBy,
      metadata,
    });

    res.status(201).json({
      success: true,
      data: group,
      message: 'Group chat created',
    });
  })
);

/**
 * POST /api/messaging/group/:chatId/add-participant
 * Add participant to group
 */
router.post(
  '/group/:chatId/add-participant',
  asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const { participantId, addedBy } = req.body;

    if (!participantId || !addedBy) {
      return res.status(400).json({
        success: false,
        error: 'participantId and addedBy are required',
      });
    }

    const result = MessagingService.addGroupParticipant(chatId, participantId, addedBy);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Group chat not found',
      });
    }

    res.status(200).json({
      success: true,
      data: result,
      message: 'Participant added to group',
    });
  })
);

/**
 * POST /api/messaging/group/:chatId/remove-participant
 * Remove participant from group
 */
router.post(
  '/group/:chatId/remove-participant',
  asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const { participantId, removedBy } = req.body;

    if (!participantId) {
      return res.status(400).json({
        success: false,
        error: 'participantId is required',
      });
    }

    const result = MessagingService.removeGroupParticipant(chatId, participantId, removedBy);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Group chat not found',
      });
    }

    res.status(200).json({
      success: true,
      data: result,
      message: 'Participant removed from group',
    });
  })
);

/**
 * GET /api/messaging/online-status/:userId
 * Get user's online status
 */
router.get(
  '/online-status/:userId',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    const status = MessagingService.getOnlineStatus(userId);

    res.status(200).json({
      success: true,
      data: status,
    });
  })
);

/**
 * GET /api/messaging/online-users
 * Get list of online users
 */
router.get(
  '/online-users',
  asyncHandler(async (req, res) => {
    const users = MessagingService.getOnlineUsers();

    res.status(200).json({
      success: true,
      data: {
        onlineCount: users.length,
        users,
      },
    });
  })
);

/**
 * GET /api/messaging/chat/:chatId/history
 * Get chat history
 */
router.get(
  '/chat/:chatId/history',
  asyncHandler(async (req, res) => {
    const { chatId } = req.params;
    const { limit = 50, skip = 0 } = req.query;

    const history = MessagingService.getChatHistory(chatId, parseInt(limit), parseInt(skip));

    if (!history) {
      return res.status(404).json({
        success: false,
        error: 'Chat not found',
      });
    }

    res.status(200).json({
      success: true,
      data: history,
    });
  })
);

/**
 * GET /api/messaging/statistics
 * Get messaging system statistics
 */
router.get(
  '/statistics',
  asyncHandler(async (req, res) => {
    const stats = MessagingService.getStatistics();

    res.status(200).json({
      success: true,
      data: stats,
    });
  })
);

// Error handling
router.use((error, req, res, next) => {
  console.error('Messaging Route Error:', error);

  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
