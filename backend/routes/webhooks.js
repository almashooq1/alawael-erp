const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { WebhookService } = require('../services/webhookService');
const logger = require('../utils/logger');
const safeError = require('../utils/safeError');

// Initialize service
const webhookService = new WebhookService();

// Middleware to verify service is ready
router.use((_req, res, next) => {
  if (!webhookService) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Webhook service not initialized',
    });
  }
  next();
});

/**
 * @route   GET /api/webhooks
 * @desc    Get all webhooks
 * @access  Private/Admin
 */
router.get(
  '/',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const webhooks = await webhookService.getAllWebhooks(req.query);
      res.status(200).json({
        success: true,
        count: webhooks.length,
        data: webhooks,
      });
    } catch (error) {
      safeError(res, error, 'fetching webhooks');
    }
  }
);

/**
 * @route   POST /api/webhooks/register
 * @desc    Register new webhook
 * @access  Private/Admin
 */
router.post(
  '/register',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const { url, events, secret, description } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'Webhook URL is required',
        });
      }

      if (!events || !Array.isArray(events) || events.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'At least one event must be specified',
        });
      }

      const MAX_WEBHOOK_EVENTS = 20;
      if (events.length > MAX_WEBHOOK_EVENTS) {
        return res.status(400).json({
          success: false,
          error: `Maximum ${MAX_WEBHOOK_EVENTS} events allowed per webhook`,
        });
      }

      const webhook = await webhookService.registerWebhook({
        url,
        events,
        secret,
        description,
        createdBy: req.user.id,
      });

      res.status(201).json({
        success: true,
        data: webhook,
      });
    } catch (error) {
      safeError(res, error, 'registering webhook');
    }
  }
);

/**
 * @route   GET /api/webhooks/:webhookId
 * @desc    Get specific webhook
 * @access  Private/Admin
 */
router.get(
  '/:webhookId',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const webhook = await webhookService.getWebhookById(req.params.webhookId);

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: 'Webhook not found',
        });
      }

      res.status(200).json({
        success: true,
        data: webhook,
      });
    } catch (error) {
      safeError(res, error, 'fetching webhook');
    }
  }
);

/**
 * @route   PUT /api/webhooks/:webhookId
 * @desc    Update webhook
 * @access  Private/Admin
 */
router.put(
  '/:webhookId',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const webhook = await webhookService.updateWebhook(req.params.webhookId, req.body);

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: 'Webhook not found',
        });
      }

      res.status(200).json({
        success: true,
        data: webhook,
      });
    } catch (error) {
      safeError(res, error, 'updating webhook');
    }
  }
);

/**
 * @route   DELETE /api/webhooks/:webhookId
 * @desc    Delete webhook
 * @access  Private/Admin
 */
router.delete(
  '/:webhookId',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin']),
  async (req, res) => {
    try {
      const result = await webhookService.deleteWebhook(req.params.webhookId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Webhook not found',
        });
      }

      res.status(200).json({
        success: true,
        message: 'Webhook deleted successfully',
      });
    } catch (error) {
      safeError(res, error, 'deleting webhook');
    }
  }
);

/**
 * @route   POST /api/webhooks/:webhookId/trigger
 * @desc    Manually trigger webhook
 * @access  Private/Admin
 */
router.post(
  '/:webhookId/trigger',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const webhook = await webhookService.getWebhookById(req.params.webhookId);

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: 'Webhook not found',
        });
      }

      const result = await webhookService.triggerWebhook(
        req.params.webhookId,
        req.body.event,
        req.body.data
      );

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'triggering webhook');
    }
  }
);

/**
 * @route   POST /api/webhooks/:webhookId/test
 * @desc    Test webhook with sample payload
 * @access  Private/Admin
 */
router.post(
  '/:webhookId/test',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const webhook = await webhookService.getWebhookById(req.params.webhookId);

      if (!webhook) {
        return res.status(404).json({
          success: false,
          error: 'Webhook not found',
        });
      }

      const result = await webhookService.testWebhook(req.params.webhookId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      safeError(res, error, 'testing webhook');
    }
  }
);

/**
 * @route   GET /api/webhooks/:webhookId/deliveries
 * @desc    Get webhook delivery history
 * @access  Private/Admin
 */
router.get(
  '/:webhookId/deliveries',
  authenticate, requireBranchAccess, requireBranchAccess,
  authorize(['admin', 'manager']),
  async (req, res) => {
    try {
      const deliveries = await webhookService.getDeliveryHistory(req.params.webhookId, req.query);

      if (!deliveries) {
        return res.status(404).json({
          success: false,
          error: 'Webhook not found',
        });
      }

      res.status(200).json({
        success: true,
        count: deliveries.length,
        data: deliveries,
      });
    } catch (error) {
      safeError(res, error, 'fetching deliveries');
    }
  }
);

// Error handling middleware
router.use((err, _req, res, _next) => {
  safeError(res, error, 'Router error');

module.exports = router;
