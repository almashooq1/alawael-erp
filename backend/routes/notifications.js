const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');

// Send Notification
router.post('/send', async (req, res) => {
  try {
    const result = await NotificationService.sendNotification(
      req.body.userId,
      req.body.notification
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get User Notifications
router.get('/user/:userId', async (req, res) => {
  try {
    const unreadOnly = req.query.unread === 'true';
    const limit = req.query.limit || 50;
    const result = await NotificationService.getNotifications(
      req.params.userId,
      parseInt(limit),
      unreadOnly
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Mark as Read
router.put('/:id/read', async (req, res) => {
  try {
    const result = await NotificationService.markAsRead(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete Notification
router.delete('/:id', async (req, res) => {
  try {
    const result = await NotificationService.deleteNotification(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete All User Notifications
router.delete('/user/:userId/all', async (req, res) => {
  try {
    const result = await NotificationService.deleteAllNotifications(req.params.userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Schedule Notification
router.post('/schedule', async (req, res) => {
  try {
    const result = await NotificationService.scheduleNotification(
      req.body.userId,
      req.body.notification,
      req.body.scheduleTime
    );
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
