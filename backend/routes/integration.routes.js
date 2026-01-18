const express = require('express');
const router = express.Router();
const integrationService = require('../services/integrationService');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

// Setup or update integration
router.post('/configure', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const { name, type, config } = req.body;
    const result = await integrationService.configureIntegration(name, type, config);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Trigger a test webhook
router.post('/trigger/:name', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const result = await integrationService.triggerWebhook(req.params.name, req.body);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// List all integrations
router.get('/', authenticateToken, authorizeRole('admin'), async (req, res) => {
  try {
    const list = await integrationService.listIntegrations();
    res.status(200).json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
