/**
 * Integration Routes
 * مسارات التكاملات الخارجية
 */

const express = require('express');
const router = express.Router();
const ExternalIntegrationService = require('../../services/externalIntegrationService');

const integrationService = new ExternalIntegrationService();

// ===== Slack Routes =====

router.post('/integrations/slack/configure', async (req, res, next) => {
  try {
    const { webhookUrl, channels } = req.body;
    const result = await integrationService.configureSlack(webhookUrl, channels);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/integrations/slack/send', async (req, res, next) => {
  try {
    const { channel, message, options } = req.body;
    const result = await integrationService.sendSlackMessage(channel, message, options);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ===== Email Routes =====

router.post('/integrations/email/configure', async (req, res, next) => {
  try {
    const config = req.body;
    const result = await integrationService.configureEmail(config);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/integrations/email/send', async (req, res, next) => {
  try {
    const { to, subject, body, options } = req.body;
    const result = await integrationService.sendEmail(to, subject, body, options);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/integrations/email/bulk', async (req, res, next) => {
  try {
    const { recipients, subject, template, data } = req.body;
    const result = await integrationService.sendBulkEmail(recipients, subject, template, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ===== Webhook Routes =====

router.post('/webhooks/register', (req, res, next) => {
  try {
    const { event, url, options } = req.body;
    const result = integrationService.registerWebhook(event, url, options);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/webhooks/:id/trigger', async (req, res, next) => {
  try {
    const { data } = req.body;
    const webhook = integrationService.webhooks.get(req.params.id);

    if (!webhook) {
      return res.status(404).json({ success: false, error: 'Webhook غير موجود' });
    }

    const result = await integrationService.executeWebhook(webhook, data);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.delete('/webhooks/:id', (req, res, next) => {
  try {
    const result = integrationService.deleteWebhook(req.params.id);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// ===== Status Routes =====

router.get('/integrations/status', (req, res, next) => {
  try {
    const status = integrationService.getConnectionStatus();
    res.json({ success: true, status });
  } catch (error) {
    next(error);
  }
});

router.get('/integrations/log', (req, res, next) => {
  try {
    const { type, limit } = req.query;
    const log = integrationService.getEventLog({ type, limit: parseInt(limit) || 50 });
    res.json({ success: true, log });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
