/**
 * AI Recommendations Routes
 * مسارات توصيات الذكاء الاصطناعي
 *
 * API Routes for AI-powered recommendation system
 * مسارات API لنظام الذكاء الاصطناعي
 */

const aiController = require('../controllers/aiRecommendations.controller');

// Export the controller routes directly if it's a Router
// Otherwise wrap in error handling
if (aiController && typeof aiController === 'object') {
  module.exports = aiController;
} else {
  // Fallback
  const express = require('express');
  const router = express.Router();
  router.all('*', (_req, res) => {
    res.status(501).json({
      success: false,
      message: 'AI Recommendations routes not fully initialized',
      status: 'NOT_IMPLEMENTED',
    });
  });
  module.exports = router;
}
