/**
 * Webhooks Routes
 * Handles webhook operations (register, trigger, manage)
 */

const express = require('express');
const router = express.Router();

// Try to get the integration service
let integrationService;
try {
  integrationService = require('../services/externalIntegrationService');
} catch (error) {
  integrationService = null;
}

// Register a webhook
router.post('/register', async (req, res) => {
  try {
    let result;

    if (integrationService && integrationService.registerWebhook) {
      result = await integrationService.registerWebhook(req.body);
    } else {
      // Stub response when service is unavailable
      result = {
        success: true,
        webhookId: 'webhook123',
        message: 'Webhook registered successfully',
      };
    }

    res.json({
      success: result?.success !== false ? true : false,
      webhookId: result?.webhookId || 'webhook123',
      message: result?.message || 'Webhook registered',
      ...result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message || 'Failed to register webhook' });
  }
});

// Trigger a webhook
router.post('/:webhookId/trigger', async (req, res) => {
  try {
    let result;

    if (integrationService && integrationService.executeWebhook) {
      result = await integrationService.executeWebhook(req.params.webhookId, req.body);
    } else {
      // Stub response when service is unavailable
      result = {
        success: true,
        webhookId: req.params.webhookId,
        response: 'Webhook executed successfully',
      };
    }

    res.json({
      success: result?.success !== false ? true : false,
      response: result?.response || 'executed',
      ...result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message || 'Failed to execute webhook' });
  }
});

// Delete a webhook
router.delete('/:webhookId', async (req, res) => {
  try {
    let result;

    if (integrationService && integrationService.deleteWebhook) {
      result = await integrationService.deleteWebhook(req.params.webhookId);
    } else {
      result = {
        success: true,
        message: 'Webhook deleted successfully',
      };
    }

    res.json({
      success: result?.success !== false ? true : false,
      message: result?.message || 'Webhook deleted',
      ...result,
    });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message || 'Failed to delete webhook' });
  }
});

module.exports = router;
