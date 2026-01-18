const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

// Get HR Overview (Aggregated from Phase 6)
router.get('/hr', authenticateToken, authorizeRole(['admin', 'manager']), async (req, res) => {
  try {
    const data = await analyticsService.getHRMetrics();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get System Health (Aggregated from Phase 9)
router.get('/system', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const data = await analyticsService.getSystemHealth();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get AI Insights (Phase 10 Core)
router.get('/insights', authenticateToken, authorizeRole('admin', 'executive'), async (req, res) => {
  try {
    const data = await analyticsService.getAIInsights();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
