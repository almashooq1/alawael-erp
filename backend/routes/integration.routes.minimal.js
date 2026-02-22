/**
 * Integration Routes - Minimal
 * مسارات التكاملات - الحد الأدنى
 */

const express = require('express');
const router = express.Router();
const integrationService = require('../services/externalIntegrationService');

// ============================================
// Slack Integration
// ============================================

router.post('/slack/configure', async (req, res, next) => {
  try {
    const { webhookUrl, channels } = req.body;
    const result = await integrationService.configureSlack(webhookUrl, channels);
    res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/slack/send', async (req, res, next) => {
  try {
    const { channel, message, options } = req.body;
    const result = await integrationService.sendSlackMessage(channel, message, options);
    res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Email Integration
// ============================================

router.post('/email/configure', async (req, res, next) => {
  try {
    const config = req.body;
    if (!config.smtpHost || !config.smtpPort) {
      return res.status(400).json({ success: false, error: 'SMTP Host and Port are required' });
    }
    const result = await integrationService.configureEmail(config);
    res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/email/send', async (req, res, next) => {
  try {
    const { to, subject, body, options } = req.body;
    const result = await integrationService.sendEmail(to, subject, body, options);
    res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/email/bulk', async (req, res, next) => {
  try {
    const { recipients, subject, template, data } = req.body;
    const result = await integrationService.sendBulkEmail(recipients, subject, template, data);
    res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Webhook Integration
// ============================================

router.post('/webhooks/register', (req, res, next) => {
  try {
    const { event, url, options } = req.body;
    const result = integrationService.registerWebhook(event, url, options);
    res.status(201).json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/webhooks/:id/trigger', async (req, res, next) => {
  try {
    const { data } = req.body;
    const webhook = integrationService.webhooks ? integrationService.webhooks.get(req.params.id) : null;

    if (!webhook) {
      return res.status(404).json({ success: false, error: 'Webhook غير موجود' });
    }

    const result = await integrationService.executeWebhook(webhook, data);
    res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/webhooks/:id', (req, res, next) => {
  try {
    const result = integrationService.deleteWebhook(req.params.id);
    res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================
// Additional Endpoints
// ============================================

router.get('/available', (req, res) => {
  res.json({
    success: true,
    integrations: [
      { id: 1, name: 'Slack', status: 'active' },
      { id: 2, name: 'Email', status: 'active' },
      { id: 3, name: 'Webhooks', status: 'active' },
    ],
  });
});

router.get('/webhooks', (req, res) => {
  res.json({
    success: true,
    webhooks: []
  });
});

module.exports = router;
