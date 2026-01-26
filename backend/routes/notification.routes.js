const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notification.service');
const { authenticateToken } = require('../middleware/auth.middleware'); // Corrected import

// All routes here require authentication
router.use(authenticateToken); // Apply to all routes

router.get('/', async (req, res) => {
  try {
    const { page, unreadOnly } = req.query;
    const result = await NotificationService.getUserNotifications(req.user._id || req.user.id, unreadOnly === 'true', parseInt(page) || 1);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/read', async (req, res) => {
  try {
    await NotificationService.markAsRead(req.params.id, req.user._id || req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/mark-all-read', async (req, res) => {
  try {
    await NotificationService.markAllAsRead(req.user._id || req.user.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

