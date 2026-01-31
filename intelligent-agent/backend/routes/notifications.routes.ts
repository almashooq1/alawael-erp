import * as express from 'express';
import { NotificationService, createNotificationService } from '../services/NotificationService';

/**
 * Notification Routes
 * Multi-channel notification management
 */

const router = express.Router();
const notificationService = createNotificationService({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASSWORD || '',
  },
  from: process.env.EMAIL_FROM || 'no-reply@system.ai',
});

/**
 * Create Notification
 * POST /api/notifications/create
 */
router.post('/create', (req: express.Request, res: express.Response) => {
  try {
    const { userId, type, title, message, priority = 'medium', recipients = [] } = req.body;

    if (!userId || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const notification = notificationService.createNotification(
      userId,
      type,
      title,
      message,
      priority,
      recipients
    );

    res.json({
      success: true,
      notification,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Create from Template
 * POST /api/notifications/from-template
 */
router.post('/from-template', (req: express.Request, res: express.Response) => {
  try {
    const { userId, type, templateName, variables, recipients = [] } = req.body;

    if (!userId || !type || !templateName || !variables) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const notification = notificationService.createFromTemplate(
      userId,
      type,
      templateName,
      variables,
      recipients
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Template not found',
      });
    }

    res.json({
      success: true,
      notification,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Send Email Notification
 * POST /api/notifications/send-email
 */
router.post('/send-email', async (req: express.Request, res: express.Response) => {
  try {
    const { recipients, subject, htmlContent } = req.body;

    if (!recipients || !subject || !htmlContent) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const sent = await notificationService.sendEmailNotification(recipients, subject, htmlContent);

    res.json({
      success: true,
      sent,
      message: sent ? '✓ Email sent successfully' : '✗ Failed to send email',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get User Notifications
 * GET /api/notifications/:userId
 */
router.get('/:userId', (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const notifications = notificationService.getUserNotifications(userId, parseInt(limit as string));

    res.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get Unread Notifications
 * GET /api/notifications/:userId/unread
 */
router.get('/:userId/unread', (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;

    const unread = notificationService.getUnreadNotifications(userId);

    res.json({
      success: true,
      count: unread.length,
      notifications: unread,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Mark Notification as Read
 * PUT /api/notifications/:notificationId/read
 */
router.put('/:notificationId/read', (req: express.Request, res: express.Response) => {
  try {
    const { notificationId } = req.params;

    const marked = notificationService.markAsRead(notificationId);

    if (!marked) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.json({
      success: true,
      message: '✓ Notification marked as read',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Delete Notification
 * DELETE /api/notifications/:notificationId
 */
router.delete('/:notificationId', (req: express.Request, res: express.Response) => {
  try {
    const { notificationId } = req.params;

    const deleted = notificationService.deleteNotification(notificationId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.json({
      success: true,
      message: '✓ Notification deleted',
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Clear User Notifications
 * DELETE /api/notifications/:userId/clear
 */
router.delete('/:userId/clear', (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const { type } = req.query;

    const count = notificationService.clearUserNotifications(userId, type as any);

    res.json({
      success: true,
      cleared: count,
      message: `✓ ${count} notifications cleared`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Set User Preferences
 * POST /api/notifications/:userId/preferences
 */
router.post('/:userId/preferences', (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;
    const preferences = req.body;

    notificationService.setUserPreferences(userId, preferences);

    res.json({
      success: true,
      message: '✓ Preferences updated',
      preferences: notificationService.getUserPreferences(userId),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get User Preferences
 * GET /api/notifications/:userId/preferences
 */
router.get('/:userId/preferences', (req: express.Request, res: express.Response) => {
  try {
    const { userId } = req.params;

    const preferences = notificationService.getUserPreferences(userId);

    res.json({
      success: true,
      preferences,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Bulk Create Notifications
 * POST /api/notifications/bulk/create
 */
router.post('/bulk/create', (req: express.Request, res: express.Response) => {
  try {
    const { userIds, type, title, message, priority = 'medium' } = req.body;

    if (!userIds || !type || !title || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    const notifications = notificationService.bulkCreate(userIds, type, title, message, priority);

    res.json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Get Statistics
 * GET /api/notifications/stats
 */
router.get('/stats', (req: express.Request, res: express.Response) => {
  try {
    const stats = notificationService.getStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Add Custom Template
 * POST /api/notifications/templates/add
 */
router.post('/templates/add', (req: express.Request, res: express.Response) => {
  try {
    const { name, template, subject, variables } = req.body;

    if (!name || !template || !variables) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields',
      });
    }

    notificationService.addTemplate(name, {
      name,
      template,
      subject,
      variables,
    });

    res.json({
      success: true,
      message: `✓ Template '${name}' added`,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
