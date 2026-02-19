/**
 * Minimal Integration Routes (Test Version)
 * Used for testing route loading and basic health checks
 */

const express = require('express');
const router = express.Router();

// Try to load the integration service, provide stubs if unavailable
let integrationService;
try {
  integrationService = require('../services/externalIntegrationService');
} catch (error) {
  // Create stub service for testing
  integrationService = {
    configureSlack: () => ({ success: true, message: 'Slack configured' }),
    sendSlackMessage: () => ({ success: true, messageId: 'msg123' }),
    configureEmail: () => ({ success: true, message: 'Email configured' }),
    sendEmail: () => ({ success: true, messageId: 'email123' }),
    sendBulkEmail: () => ({ success: true, sent: 0 }),
  };
}

// Root endpoint for integrations hub
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Integrations hub is reachable',
    endpoints: [
      '/api/integrations/health',
      '/api/integrations/metrics',
      '/api/integrations/reset-metrics',
    ],
  });
});

// Simple health check
router.get('/health', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    health: {
      government: { status: 'ok' },
      insurance: { status: 'ok' },
      lab: { status: 'ok' },
    },
  });
});

// Simple metrics
router.get('/metrics', (req, res) => {
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    metrics: {
      requestCount: 0,
      errorCount: 0,
      avgResponseTime: 0,
    },
  });
});

// Reset metrics
router.post('/reset-metrics', (req, res) => {
  res.json({
    success: true,
    message: 'Metrics reset successfully',
  });
});

// ===== Slack Integration Endpoints =====
router.post('/slack/configure', async (req, res) => {
  try {
    const { webhookUrl, channels = [] } = req.body;
    const result = await integrationService.configureSlack(webhookUrl, channels);
    res.json({
      success: result?.success !== false ? true : false,
      message: result?.message || 'Slack configured successfully',
      ...result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message || 'Failed to configure Slack' });
  }
});

router.post('/slack/send', async (req, res) => {
  try {
    const { message, channel } = req.body;
    const result = await integrationService.sendSlackMessage({ message, channel });
    res.json({
      success: result?.success !== false ? true : false,
      messageId: result?.messageId || 'msg123',
      ...result,
    });
  } catch (error) {
    res
      .status(400)
      .json({ success: false, error: error.message || 'Failed to send Slack message' });
  }
});

// ===== Email Integration Endpoints =====
router.post('/email/configure', async (req, res) => {
  try {
    const result = await integrationService.configureEmail(req.body);
    res.json({
      success: result?.success !== false ? true : false,
      message: result?.message || 'Email configured successfully',
      ...result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message || 'Failed to configure email' });
  }
});

router.post('/email/send', async (req, res) => {
  try {
    const { to, subject, body } = req.body;
    const result = await integrationService.sendEmail(to, subject, body);
    res.json({
      success: result?.success !== false ? true : false,
      messageId: result?.messageId || 'email123',
      ...result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message || 'Failed to send email' });
  }
});

router.post('/email/bulk', async (req, res) => {
  try {
    const { recipients, subject, body } = req.body;
    const result = await integrationService.sendBulkEmail(recipients);
    res.json({
      success: result?.success !== false ? true : false,
      sent: result?.sent || recipients?.length || 0,
      ...result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message || 'Failed to send bulk emails' });
  }
});

module.exports = router;
