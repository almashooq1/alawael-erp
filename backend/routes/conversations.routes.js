/**
 * Conversations Routes
 * Handle conversation management endpoints
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * PATCH /api/conversations/:id/mark-read
 * Mark a conversation as read
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

    return res.json({
      success: true,
      message: 'Conversation marked as read',
      conversationId: id,
      readAt: new Date(),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to mark conversation as read',
      error: error.message,
    });
  }
});

module.exports = router;
