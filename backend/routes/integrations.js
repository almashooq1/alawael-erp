// Integration Routes
const express = require('express');
const IntegrationService = require('../services/integrationService');

const router = express.Router();

// Payment integration
router.post('/payments/process', (req, res) => {
  try {
    const result = IntegrationService.integratePaymentGateway(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Email integration
router.post('/email/send', (req, res) => {
  try {
    const result = IntegrationService.sendEmailIntegration(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// SMS integration
router.post('/sms/send', (req, res) => {
  try {
    const result = IntegrationService.sendSMSIntegration(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Cloud storage integration
router.post('/storage/upload', (req, res) => {
  try {
    const result = IntegrationService.uploadToCloudStorage(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// CRM sync
router.post('/crm/sync', (req, res) => {
  try {
    const result = IntegrationService.syncWithCRM(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analytics tracking
router.post('/analytics/track', (req, res) => {
  try {
    const result = IntegrationService.trackAnalytics(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get integration status
router.get('/status', (req, res) => {
  try {
    const status = IntegrationService.getIntegrationStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get available integrations
router.get('/available', (req, res) => {
  try {
    const integrations = IntegrationService.getAvailableIntegrations();
    res.json(integrations);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Webhook handler
router.post('/webhooks/handle', (req, res) => {
  try {
    const result = IntegrationService.handleWebhook(req.body);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Check rate limit
router.get('/rate-limit/:apiKey', (req, res) => {
  try {
    const rateLimit = IntegrationService.checkRateLimit(req.params.apiKey);
    res.json(rateLimit);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
