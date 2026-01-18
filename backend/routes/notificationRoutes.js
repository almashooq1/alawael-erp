/**
 * Enhanced Notification API Routes
 * Multi-channel notifications (Email, SMS, In-App, Push)
 */

const express = require('express');
const router = express.Router();
const notificationService = require('../services/notificationService');
const authMiddleware = require('../middleware/authMiddleware');

/**
 * POST /api/notifications/send-in-app
 * Send in-app notification
 */
router.post('/send-in-app', authMiddleware, async (req, res) => {
  try {
    const { userId, title, message, type = 'info', metadata = {} } = req.body;

    if (!userId || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'User ID, title, and message required',
      });
    }

    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await notificationService.sendInAppNotification(userId, title, message, type, metadata);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/send-email
 * Send email notification
 */
router.post('/send-email', authMiddleware, async (req, res) => {
  try {
    const { userId, userEmail, subject, htmlContent, metadata = {} } = req.body;

    if (!userId || !userEmail || !subject || !htmlContent) {
      return res.status(400).json({
        success: false,
        error: 'User ID, email, subject, and content required',
      });
    }

    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await notificationService.sendEmailNotification(userId, userEmail, subject, htmlContent, metadata);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/send-sms
 * Send SMS notification
 */
router.post('/send-sms', authMiddleware, async (req, res) => {
  try {
    const { userId, phoneNumber, message, metadata = {} } = req.body;

    if (!userId || !phoneNumber || !message) {
      return res.status(400).json({
        success: false,
        error: 'User ID, phone number, and message required',
      });
    }

    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await notificationService.sendSmsNotification(userId, phoneNumber, message, metadata);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/send-push
 * Send push notification
 */
router.post('/send-push', authMiddleware, async (req, res) => {
  try {
    const { userId, title, body, metadata = {} } = req.body;

    if (!userId || !title || !body) {
      return res.status(400).json({
        success: false,
        error: 'User ID, title, and body required',
      });
    }

    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await notificationService.sendPushNotification(userId, title, body, metadata);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/send-multi-channel
 * Send multi-channel notification
 */
router.post('/send-multi-channel', authMiddleware, async (req, res) => {
  try {
    const { userId, notification, channels = ['in-app', 'email'] } = req.body;

    if (!userId || !notification) {
      return res.status(400).json({
        success: false,
        error: 'User ID and notification required',
      });
    }

    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const result = await notificationService.sendMultiChannelNotification(userId, notification, channels);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/notifications
 * Get user notifications
 */
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { limit = 50, offset = 0 } = req.query;

    const result = await notificationService.getNotifications(userId, parseInt(limit), parseInt(offset));

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/:notificationId/read
 * Mark notification as read
 */
router.post('/:notificationId/read', authMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const result = await notificationService.markAsRead(notificationId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.post('/mark-all-read', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await notificationService.markAllAsRead(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/notifications/:notificationId
 * Delete notification
 */
router.delete('/:notificationId', authMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.params;

    const result = await notificationService.deleteNotification(notificationId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/preferences
 * Set notification preferences
 */
router.post('/preferences', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { preferences } = req.body;

    if (!preferences) {
      return res.status(400).json({
        success: false,
        error: 'Preferences required',
      });
    }

    const result = await notificationService.setNotificationPreferences(userId, preferences);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/notifications/preferences
 * Get notification preferences
 */
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await notificationService.getNotificationPreferences(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/notifications/schedule
 * Schedule notification
 */
router.post('/schedule', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;
    const { notification, scheduledFor } = req.body;

    if (!notification || !scheduledFor) {
      return res.status(400).json({
        success: false,
        error: 'Notification and scheduled time required',
      });
    }

    const result = await notificationService.scheduleNotification(userId, notification, scheduledFor);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await notificationService.getUnreadCount(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/notifications/statistics
 * Get notification statistics
 */
router.get('/statistics', authMiddleware, async (req, res) => {
  try {
    const { userId } = req.user;

    const result = await notificationService.getNotificationStats(userId);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
