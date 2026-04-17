/* eslint-disable no-unused-vars */
/**
 * Integration Routes
 * مسارات التكاملات الخارجية
 */

const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const integrationService = require('../../services/externalIntegrationService');
const safeError = require('../../utils/safeError');

// Require authentication for all integration routes
router.use(authenticateToken);

// ── Validation helpers ────────────────────────────────────────────────────

/** Validate a URL string is well-formed and uses https */
function isValidHttpsUrl(value) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
}

/** Validate Slack webhook URL belongs to hooks.slack.com */
function isValidSlackWebhook(url) {
  if (!isValidHttpsUrl(url)) return false;
  try {
    return new URL(url).hostname === 'hooks.slack.com';
  } catch {
    return false;
  }
}

/** Basic RFC 5322-compatible email check */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_RE.test(value.trim());
}

// ===== Slack Routes =====

router.post('/integrations/slack/configure', async (req, res, next) => {
  try {
    const { webhookUrl, channels } = req.body;

    if (!webhookUrl || !isValidSlackWebhook(webhookUrl)) {
      return res.status(400).json({
        success: false,
        message: 'webhookUrl يجب أن يكون رابط Slack صحيحاً (https://hooks.slack.com/...)',
      });
    }
    if (channels !== undefined && !Array.isArray(channels)) {
      return res.status(400).json({ success: false, message: 'channels يجب أن يكون مصفوفة' });
    }

    const result = await integrationService.configureSlack(webhookUrl, channels);
    res.json(result);
  } catch (error) {
    safeError(res, error, 'integration');
  }
});

router.post('/integrations/slack/send', async (req, res, next) => {
  try {
    const { channel, message, options } = req.body;

    if (!channel || typeof channel !== 'string') {
      return res.status(400).json({ success: false, message: 'channel مطلوب' });
    }
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, message: 'message مطلوب' });
    }

    const result = await integrationService.sendSlackMessage(channel, message, options);
    res.json(result);
  } catch (error) {
    safeError(res, error, 'integration');
  }
});

// ===== Email Routes =====

router.post('/integrations/email/configure', async (req, res, next) => {
  try {
    const config = req.body;
    if (!config.smtpHost || !config.smtpPort) {
      return res.status(400).json({ success: false, message: 'SMTP Host and Port are required' });
    }
    const port = Number(config.smtpPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      return res.status(400).json({ success: false, message: 'smtpPort يجب أن يكون رقماً بين 1 و 65535' });
    }
    const result = await integrationService.configureEmail(config);
    res.json(result);
  } catch (error) {
    safeError(res, error, 'integration');
  }
});

router.post('/integrations/email/send', async (req, res, next) => {
  try {
    const { to, subject, body, options } = req.body;

    if (!to || !isValidEmail(to)) {
      return res.status(400).json({ success: false, message: 'to يجب أن يكون بريداً إلكترونياً صالحاً' });
    }
    if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'subject مطلوب' });
    }
    if (!body || typeof body !== 'string') {
      return res.status(400).json({ success: false, message: 'body مطلوب' });
    }

    const result = await integrationService.sendEmail(to.trim(), subject.trim(), body, options);
    res.json(result);
  } catch (error) {
    safeError(res, error, 'integration');
  }
});

router.post('/integrations/email/bulk', async (req, res, next) => {
  try {
    const { recipients, subject, template, data } = req.body;

    if (!Array.isArray(recipients) || recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'recipients يجب أن تكون مصفوفة غير فارغة' });
    }
    const invalidEmails = recipients.filter(r => !isValidEmail(r));
    if (invalidEmails.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'بعض عناوين البريد الإلكتروني غير صالحة',
        invalid: invalidEmails,
      });
    }
    if (!subject || typeof subject !== 'string') {
      return res.status(400).json({ success: false, message: 'subject مطلوب' });
    }

    const result = await integrationService.sendBulkEmail(recipients, subject, template, data);
    res.json(result);
  } catch (error) {
    safeError(res, error, 'integration');
  }
});

// ===== Webhook Routes =====

router.post('/webhooks/register', (req, res, next) => {
  try {
    const { event, url, options } = req.body;
    const result = integrationService.registerWebhook(event, url, options);
    res.status(201).json(result);
  } catch (error) {
    safeError(res, error, 'integration');
  }
});

router.post('/webhooks/:id/trigger', async (req, res, next) => {
  try {
    const { data } = req.body;
    const webhook = integrationService.webhooks
      ? integrationService.webhooks.get(req.params.id)
      : null;

    if (!webhook) {
      return res.status(404).json({ success: false, error: 'Webhook غير موجود' });
    }

    const result = await integrationService.executeWebhook(webhook, data);
    res.json(result);
  } catch (error) {
    safeError(res, error, 'integration');
  }
});

router.delete('/webhooks/:id', (req, res, next) => {
  try {
    const result = integrationService.deleteWebhook(req.params.id);
    res.json(result);
  } catch (error) {
    safeError(res, error, 'integration');
  }
});

// ===== Status Routes =====

router.get('/integrations/status', (req, res, next) => {
  try {
    const status = integrationService.getConnectionStatus
      ? integrationService.getConnectionStatus()
      : { connected: true };
    res.json({ success: true, status });
  } catch (error) {
    safeError(res, error, 'integration');
  }
});

router.get('/integrations/log', (req, res, next) => {
  try {
    const { type, limit } = req.query;
    const log = integrationService.getEventLog
      ? integrationService.getEventLog({ type, limit: parseInt(limit) || 50 })
      : [];
    res.json({ success: true, log });
  } catch (error) {
    safeError(res, error, 'integration');
  }
});

module.exports = router;
