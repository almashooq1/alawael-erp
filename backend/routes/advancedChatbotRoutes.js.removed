/**
 * ADVANCED CHATBOT ROUTES
 * Version: 2.0
 */

const express = require('express');
const router = express.Router();
const AdvancedChatbotService = require('../services/advancedChatbotService');
const authMiddleware = require('../middleware/authMiddleware');

// Initialize service
const chatbotService = new AdvancedChatbotService({
  maxConversationLength: 100,
  conversationTimeout: 3600000,
  confidenceThreshold: 0.6,
  learningEnabled: true,
  multiLanguageSupport: true,
});

/**
 * POST /api/v2/chatbot/message
 * Send message to chatbot
 */
router.post('/message', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { message, conversationId } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required',
        code: 'INVALID_MESSAGE',
      });
    }

    const result = await chatbotService.processMessage(userId, message, conversationId);

    res.json(result);
  } catch (error) {
    console.error('Error in chatbot message:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'CHATBOT_ERROR',
    });
  }
});

/**
 * POST /api/v2/chatbot/conversation
 * Start new conversation
 */
router.post('/conversation', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const conversationId = chatbotService.createConversation(userId);

    res.json({
      success: true,
      conversationId,
      message: 'محادثة جديدة تم إنشاؤها بنجاح',
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v2/chatbot/conversation/:conversationId
 * Get conversation history
 */
router.get('/conversation/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { limit = 50 } = req.query;

    const history = chatbotService.getConversationHistory(conversationId, parseInt(limit));

    if (!history) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
      });
    }

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v2/chatbot/conversations
 * Get user's conversations
 */
router.get('/conversations', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 20 } = req.query;

    const conversations = chatbotService.getUserConversations(userId, parseInt(limit));

    res.json({
      success: true,
      conversations,
      count: conversations.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/v2/chatbot/conversation/:conversationId
 * Clear conversation
 */
router.delete('/conversation/:conversationId', authMiddleware, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const result = chatbotService.clearConversation(conversationId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v2/chatbot/rate
 * Rate conversation
 */
router.post('/rate', authMiddleware, async (req, res) => {
  try {
    const { conversationId, rating, feedback } = req.body;

    if (!conversationId || rating === undefined) {
      return res.status(400).json({
        success: false,
        error: 'conversationId and rating are required',
      });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: 'Rating must be between 1 and 5',
      });
    }

    const result = chatbotService.rateConversation(conversationId, rating, feedback);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v2/chatbot/statistics
 * Get chatbot statistics
 */
router.get('/statistics', async (req, res) => {
  try {
    const stats = chatbotService.getStatistics();

    res.json({
      success: true,
      statistics: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v2/chatbot/recommendations
 * Get personalized recommendations
 */
router.get('/recommendations', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    const recommendations = chatbotService.getRecommendations(userId);

    res.json({
      success: true,
      recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v2/chatbot/learning-data
 * Export learning data (admin only)
 */
router.get('/learning-data', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const data = chatbotService.exportLearningData();

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
