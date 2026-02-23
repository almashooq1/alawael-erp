/**
 * Unified Notification Routes
 * مسارات الإشعارات الموحدة
 */

const express = require('express');
const router = express.Router();
const unifiedNotificationService = require('../services/unifiedNotification.service');
const { authenticateToken, requireAdmin } = require('../middleware/auth.middleware');

/**
 * Send notification (Admin only)
 * @route POST /api/notifications-unified/send
 * @access Admin
 */
router.post('/send', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const notification = req.body;
    const result = await unifiedNotificationService.send(notification);

    res.json({
      success: true,
      message: 'Notification queued successfully',
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send notification',
      message: error.message,
    });
  }
});

/**
 * Send batch notifications (Admin only)
 * @route POST /api/notifications-unified/send-batch
 * @access Admin
 */
router.post('/send-batch', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { notifications } = req.body;

    if (!Array.isArray(notifications)) {
      return res.status(400).json({
        success: false,
        error: 'notifications must be an array',
      });
    }

    const results = await unifiedNotificationService.sendBatch(notifications);

    res.json({
      success: true,
      message: `Sent ${results.length} notifications`,
      results,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to send batch notifications',
      message: error.message,
    });
  }
});

/**
 * Get notification history for current user
 * @route GET /api/notifications-unified/history
 * @access Private
 */
router.get('/history', authenticateToken, async (req, res) => {
  try {
    const options = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      status: req.query.status,
      type: req.query.type,
      channel: req.query.channel,
      unreadOnly: req.query.unreadOnly === 'true',
    };

    const result = await unifiedNotificationService.getHistory(req.userId, options);

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get notification history',
      message: error.message,
    });
  }
});

/**
 * Get unread count
 * @route GET /api/notifications-unified/unread-count
 * @access Private
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await unifiedNotificationService.getUnreadCount(req.userId);

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
      message: error.message,
    });
  }
});

/**
 * Mark notification as read
 * @route PUT /api/notifications-unified/:id/read
 * @access Private
 */
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const notification = await unifiedNotificationService.markAsRead(req.params.id, req.userId);

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: 'Notification not found',
      });
    }

    res.json({
      success: true,
      notification,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read',
      message: error.message,
    });
  }
});

/**
 * Mark all notifications as read
 * @route PUT /api/notifications-unified/read-all
 * @access Private
 */
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    const result = await unifiedNotificationService.markAllAsRead(req.userId);

    res.json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to mark all notifications as read',
      message: error.message,
    });
  }
});

/**
 * Delete notification
 * @route DELETE /api/notifications-unified/:id
 * @access Private
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await unifiedNotificationService.deleteNotification(req.params.id, req.userId);

    res.json({
      success: true,
      message: 'Notification deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to delete notification',
      message: error.message,
    });
  }
});

/**
 * Update user notification preferences
 * @route PUT /api/notifications-unified/preferences
 * @access Private
 */
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const User = require('../models/User');
    const { channels, types, quietHours } = req.body;

    const update = {};
    if (channels) update['notificationPreferences.channels'] = channels;
    if (types) update['notificationPreferences.types'] = types;
    if (quietHours) update['notificationPreferences.quietHours'] = quietHours;

    const user = await User.findByIdAndUpdate(req.userId, update, { new: true }).select(
      'notificationPreferences'
    );

    res.json({
      success: true,
      message: 'Notification preferences updated',
      preferences: user.notificationPreferences,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update preferences',
      message: error.message,
    });
  }
});

/**
 * Get user notification preferences
 * @route GET /api/notifications-unified/preferences
 * @access Private
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.userId).select('notificationPreferences');

    res.json({
      success: true,
      preferences: user.notificationPreferences || {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get preferences',
      message: error.message,
    });
  }
});

module.exports = router;
