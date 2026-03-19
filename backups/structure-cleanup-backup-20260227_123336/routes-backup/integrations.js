// إرسال بيانات إلى نظام خارجي (عام)
router.post('/send', async (req, res) => {
  try {
    const { url, method, data, headers } = req.body;
    const axios = require('axios');
    const response = await axios({ url, method: method || 'post', data, headers });
    res.json({ success: true, response: response.data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// استقبال Webhook من نظام خارجي
router.post('/webhook/:source', async (req, res) => {
  // يمكن تخصيص المعالجة حسب المصدر
  // مثال: req.params.source === 'erp' أو 'pay'
  // حفظ البيانات أو تنفيذ منطق معين
  res.json({ success: true, received: req.body });
});
// Integration Routes
const express = require('express');
const IntegrationService = require('../services/integrationService');
const { ApiResponse, ApiError } = require('../utils/apiResponse');

const router = express.Router();

// Payment integration
router.post('/payments/process', (req, res, next) => {
  try {
    const result = IntegrationService.integratePaymentGateway(req.body);
    return res.status(201).json(new ApiResponse(201, result, 'Payment processed'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to process payment', [error.message]));
  }
});

// Email integration
router.post('/email/send', (req, res, next) => {
  try {
    const result = IntegrationService.sendEmailIntegration(req.body);
    return res.status(201).json(new ApiResponse(201, result, 'Email sent'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to send email', [error.message]));
  }
});

// SMS integration
router.post('/sms/send', (req, res, next) => {
  try {
    const result = IntegrationService.sendSMSIntegration(req.body);
    return res.status(201).json(new ApiResponse(201, result, 'SMS sent'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to send SMS', [error.message]));
  }
});

// Cloud storage integration
router.post('/storage/upload', (req, res, next) => {
  try {
    const result = IntegrationService.uploadToCloudStorage(req.body);
    return res.status(201).json(new ApiResponse(201, result, 'File uploaded'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to upload file', [error.message]));
  }
});

// CRM sync
router.post('/crm/sync', (req, res, next) => {
  try {
    const result = IntegrationService.syncWithCRM(req.body);
    return res.status(201).json(new ApiResponse(201, result, 'CRM synced'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to sync with CRM', [error.message]));
  }
});

// Analytics tracking
router.post('/analytics/track', (req, res, next) => {
  try {
    const result = IntegrationService.trackAnalytics(req.body);
    return res.status(201).json(new ApiResponse(201, result, 'Analytics tracked'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to track analytics', [error.message]));
  }
});

// Get integration status
router.get('/status', (_req, res, next) => {
  try {
    const status = IntegrationService.getIntegrationStatus();
    return res.json(new ApiResponse(200, status, 'Integration status fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch integration status', [error.message]));
  }
});

// Get available integrations
router.get('/available', (_req, res, next) => {
  try {
    const integrations = IntegrationService.getAvailableIntegrations();
    return res.json(new ApiResponse(200, integrations, 'Available integrations fetched'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to fetch available integrations', [error.message]));
  }
});

// Webhook handler
router.post('/webhooks/handle', (req, res, next) => {
  try {
    const result = IntegrationService.handleWebhook(req.body);
    return res.status(200).json(new ApiResponse(200, result, 'Webhook handled'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to handle webhook', [error.message]));
  }
});

// Check rate limit
router.get('/rate-limit/:apiKey', (req, res, next) => {
  try {
    const rateLimit = IntegrationService.checkRateLimit(req.params.apiKey);
    return res.json(new ApiResponse(200, rateLimit, 'Rate limit checked'));
  } catch (error) {
    return next(new ApiError(500, 'Failed to check rate limit', [error.message]));
  }
});

module.exports = router;
