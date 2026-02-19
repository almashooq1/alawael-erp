const express = require('express');
const router = express.Router();
const smartNotificationService = require('../services/smartNotificationService');
const Notification = require('../models/Notification');
const NotificationTemplate = require('../models/NotificationTemplate');

// Async handler middleware
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ======================= NOTIFICATION ENDPOINTS =======================

/**
 * SEND NOTIFICATION
 * POST /api/notifications/send
 */
router.post(
  '/send',
  asyncHandler(async (req, res) => {
    const { templateCode, recipientId, variables, channels, priority } = req.body;

    if (!templateCode || !recipientId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: templateCode, recipientId',
      });
    }

    const notification = await smartNotificationService.sendNotification(
      templateCode,
      recipientId,
      variables || {},
      { channels, priority }
    );

    res.status(201).json({
      success: true,
      data: notification,
      message: 'Notification sent successfully',
    });
  })
);

/**
 * BATCH SEND NOTIFICATIONS
 * POST /api/notifications/batch-send
 */
router.post(
  '/batch-send',
  asyncHandler(async (req, res) => {
    const { recipientIds, templateCode, variables } = req.body;

    if (!templateCode || !recipientIds || recipientIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: templateCode, recipientIds',
      });
    }

    const notifications = await smartNotificationService.batchSend(
      recipientIds,
      templateCode,
      variables || {}
    );

    res.status(201).json({
      success: true,
      data: {
        count: notifications.length,
        notifications,
      },
      message: `${notifications.length} notifications sent successfully`,
    });
  })
);

/**
 * SCHEDULE NOTIFICATIONS
 * POST /api/notifications/schedule
 */
router.post(
  '/schedule',
  asyncHandler(async (req, res) => {
    const { recipients, templateCode, scheduledFor, variables } = req.body;

    if (!templateCode || !recipients || recipients.length === 0 || !scheduledFor) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: templateCode, recipients, scheduledFor',
      });
    }

    const notifications = await smartNotificationService.scheduleBulk(
      recipients,
      templateCode,
      new Date(scheduledFor),
      variables || {}
    );

    res.status(201).json({
      success: true,
      data: {
        count: notifications.length,
        scheduledFor,
      },
      message: `${notifications.length} notifications scheduled successfully`,
    });
  })
);

/**
 * GET UNREAD NOTIFICATIONS
 * GET /api/notifications/unread/:recipientId
 */
router.get(
  '/unread/:recipientId',
  asyncHandler(async (req, res) => {
    const { recipientId } = req.params;
    const { limit = 10 } = req.query;

    const notifications = await smartNotificationService.getUnreadNotifications(
      recipientId,
      parseInt(limit)
    );

    res.status(200).json({
      success: true,
      data: notifications,
      count: notifications.length,
    });
  })
);

/**
 * GET SINGLE NOTIFICATION
 * GET /api/notifications/:notificationId
 */
router.get(
  '/:notificationId',
  asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    const notification = await smartNotificationService.getNotification(notificationId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.status(200).json({
      success: true,
      data: notification,
    });
  })
);

/**
 * MARK AS READ
 * POST /api/notifications/:notificationId/read
 */
router.post(
  '/:notificationId/read',
  asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    const notification = await smartNotificationService.markAsRead(notificationId);

    res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification marked as read',
    });
  })
);

/**
 * RECORD CLICK
 * POST /api/notifications/:notificationId/click
 */
router.post(
  '/:notificationId/click',
  asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    const notification = await smartNotificationService.recordClick(notificationId);

    res.status(200).json({
      success: true,
      data: notification,
      message: 'Notification click recorded',
    });
  })
);

/**
 * UNSUBSCRIBE
 * POST /api/notifications/:notificationId/unsubscribe
 */
router.post(
  '/:notificationId/unsubscribe',
  asyncHandler(async (req, res) => {
    const { notificationId } = req.params;

    const notification = await smartNotificationService.unsubscribe(notificationId);

    res.status(200).json({
      success: true,
      data: notification,
      message: 'Unsubscribed from notification',
    });
  })
);

/**
 * GET NOTIFICATIONS BY TYPE
 * GET /api/notifications/type/:type/:recipientId
 */
router.get(
  '/type/:type/:recipientId',
  asyncHandler(async (req, res) => {
    const { type, recipientId } = req.params;

    const notifications = await smartNotificationService.getNotificationsByType(recipientId, type);

    res.status(200).json({
      success: true,
      data: notifications,
      count: notifications.length,
    });
  })
);

// ======================= TEMPLATE ENDPOINTS =======================

/**
 * CREATE TEMPLATE
 * POST /api/notifications/templates
 */
router.post(
  '/templates',
  asyncHandler(async (req, res) => {
    const {
      name,
      code,
      description,
      emailBody,
      emailSubject,
      smsBody,
      pushMessage,
      variables,
      defaultChannels,
    } = req.body;

    if (!name || !code || !emailBody) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, code, emailBody',
      });
    }

    const template = await smartNotificationService.createTemplate({
      name,
      code,
      description,
      emailBody,
      emailSubject,
      smsBody,
      pushMessage,
      variables,
      defaultChannels,
    });

    res.status(201).json({
      success: true,
      data: template,
      message: 'Template created successfully',
    });
  })
);

/**
 * GET TEMPLATE
 * GET /api/notifications/templates/:templateCode
 */
router.get(
  '/templates/:templateCode',
  asyncHandler(async (req, res) => {
    const { templateCode } = req.params;

    const template = await NotificationTemplate.getByCode(templateCode);

    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.status(200).json({
      success: true,
      data: template,
    });
  })
);

/**
 * GET ACTIVE TEMPLATES
 * GET /api/notifications/templates
 */
router.get(
  '/templates',
  asyncHandler(async (req, res) => {
    const { category } = req.query;

    const templates = await NotificationTemplate.getActive(category || null);

    res.status(200).json({
      success: true,
      data: templates,
      count: templates.length,
    });
  })
);

/**
 * GET TEMPLATE PERFORMANCE
 * GET /api/notifications/templates/:templateId/performance
 */
router.get(
  '/templates/:templateId/performance',
  asyncHandler(async (req, res) => {
    const { templateId } = req.params;

    const performance = await smartNotificationService.getTemplatePerformance(templateId);

    res.status(200).json({
      success: true,
      data: performance,
    });
  })
);

/**
 * UPDATE TEMPLATE
 * PUT /api/notifications/templates/:templateId
 */
router.put(
  '/templates/:templateId',
  asyncHandler(async (req, res) => {
    const { templateId } = req.params;
    const { emailBody, smsBody, pushMessage, name, description } = req.body;

    const template = await NotificationTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    if (emailBody) template.emailBody = emailBody;
    if (smsBody) template.smsBody = smsBody;
    if (pushMessage) template.pushMessage = pushMessage;
    if (name) template.templateName = name;
    if (description) template.description = description;

    await template.saveVersion(req.user?._id, 'Updated via API');

    res.status(200).json({
      success: true,
      data: template,
      message: 'Template updated successfully',
    });
  })
);

// ======================= ANALYTICS ENDPOINTS =======================

/**
 * GET ANALYTICS
 * GET /api/notifications/analytics/summary
 */
router.get(
  '/analytics/summary',
  asyncHandler(async (req, res) => {
    const { hours = 24 } = req.query;

    const stats = await smartNotificationService.getAnalytics(parseInt(hours));

    res.status(200).json({
      success: true,
      data: stats,
    });
  })
);

/**
 * PROCESS PENDING NOTIFICATIONS
 * POST /api/notifications/process-pending
 */
router.post(
  '/process-pending',
  asyncHandler(async (req, res) => {
    const processed = await smartNotificationService.processPending();

    res.status(200).json({
      success: true,
      data: {
        count: processed.length,
        processed,
      },
      message: `${processed.length} pending notifications processed`,
    });
  })
);

/**
 * RETRY FAILED NOTIFICATIONS
 * POST /api/notifications/retry-failed
 */
router.post(
  '/retry-failed',
  asyncHandler(async (req, res) => {
    const retried = await smartNotificationService.retryFailed();

    res.status(200).json({
      success: true,
      data: {
        count: retried.length,
        retried,
      },
      message: `${retried.length} failed notifications retried`,
    });
  })
);

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('[Notification Routes Error]', error.message);
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error',
  });
});

module.exports = router;
