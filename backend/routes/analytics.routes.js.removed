const express = require('express');
const router = express.Router();
const { body, param, query, validationResult } = require('express-validator');
const analyticsService = require('../services/analyticsService');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');
const { apiLimiter } = require('../middleware/rateLimiter');
const sanitizeInput = require('../middleware/sanitize');

// Global middleware
router.use(authenticateToken);
router.use(apiLimiter);
router.use(sanitizeInput);

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ success: false, message: 'Validation error', errors: errors.array() });
  }
  next();
};

// Get HR Overview (Aggregated from Phase 6)
router.get('/hr', authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const data = await analyticsService.getHRMetrics();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get System Health (Aggregated from Phase 9)
router.get('/system', authorizeRole('admin'), async (req, res) => {
  try {
    const data = await analyticsService.getSystemHealth();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get AI Insights (Phase 10 Core) with optional filtering
router.get(
  '/insights',
  query('period').optional().isIn(['day', 'week', 'month', 'year']),
  query('type').optional().isIn(['performance', 'security', 'compliance']),
  handleValidationErrors,
  authorizeRole(['admin', 'executive']),
  async (req, res) => {
    try {
      const data = await analyticsService.getAIInsights(req.query);
      res.status(200).json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

module.exports = router;

