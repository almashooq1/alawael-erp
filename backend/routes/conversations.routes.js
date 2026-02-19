/**
 * Conversations Routes - Phase 2
 * Simple conversation management API
 *
 * Endpoints:
 * - PATCH /api/conversations/:id/mark-read - Mark conversation as read
 */

const express = require('express');
const router = express.Router();
const messagingService = require('../services/messaging.service');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

// All routes require authentication
router.use(authenticateToken);

/**
 * PATCH /api/conversations/:id/mark-read
 * Mark conversation as read
 */
router.patch('/:id/mark-read', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id || req.user?.userId;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'Conversation ID is required',
      });
    }

    const result = await messagingService.markConversationAsRead(id, userId);

    const markResult = result || {
      success: true,
      conversationId: id,
      userId,
      markedAt: new Date(),
    };

    return res.status(200).json({
      success: true,
      ...markResult,
    });
  } catch (error) {
    logger.error('Error marking conversation as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark conversation as read',
      error: error.message,
    });
  }
});

module.exports = router;
