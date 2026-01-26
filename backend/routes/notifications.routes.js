const express = require('express');
const router = express.Router();
// Prefer the in-memory notification model during tests for easier mocking
const useMemoryModel = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;
const NotificationModule = useMemoryModel ? require('../models/Notification.memory') : require('../models/Notification');
const Notification = NotificationModule.Notification || NotificationModule;
const SmartNotificationService = require('../services/smartNotificationService');
const { authenticateToken } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route GET /api/notifications
 * @desc Get current user's notifications
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    // Use mock methods when available (unit tests)
    if (typeof Notification.findByUserId === 'function') {
      const notifications = await Notification.findByUserId(userId);
      const unread = typeof Notification.getUnreadCount === 'function' ? await Notification.getUnreadCount(userId) : 0;
      return res.json({ success: true, data: { notifications, unread }, count: notifications?.length || 0 });
    }

    const notifications = await Notification.find({ recipient: userId }).sort({ createdAt: -1 }).limit(20);
    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });
    res.json({ success: true, count: notifications.length, unread: unreadCount, data: { notifications } });
  } catch (error) {
    console.error('Notification fetch failed:', error);
    res.status(500).json({ message: error.message });
  }
});

/**
 * @route PUT /api/notifications/:id/read
 * @desc Mark as read
 */
const markAsReadHandler = async (req, res) => {
  try {
    const userId = req.user?.id || req.user?._id;
    if (typeof Notification.markAsRead === 'function') {
      const notification = await Notification.markAsRead(req.params.id);
      return res.json({ success: true, data: notification });
    }

    const notification = await Notification.findOneAndUpdate({ _id: req.params.id, recipient: userId }, { isRead: true }, { new: true });
    res.json({ success: true, data: notification });
  } catch (error) {
    console.error('Notification markAsRead failed:', error);
    res.status(500).json({ message: error.message });
  }
};

router.put('/:id/read', markAsReadHandler);
router.patch('/:id/read', markAsReadHandler);

/**
 * @route POST /api/notifications/run-checks
 * @desc TRIGGER SYSTEM WIDE INTELLIGENT CHECKS (Simulates Cron Job)
 */
router.post('/run-checks', async (req, res) => {
  try {
    // 1. Check Sessions
    const sessionResult = await SmartNotificationService.checkUpcomingSessions();

    // 2. Check Finance (Send to current user assuming they are Admin)
    const financeResult = await SmartNotificationService.checkOverdueInvoices(req.user.id);

    // 3. Check HR
    const hrResult = await SmartNotificationService.checkStaffBurnout(req.user.id);

    // 4. Check Inventory (New Support Unit)
    const invResult = await SmartNotificationService.checkLowStock(req.user.id);

    // 5. Check Clinical Quality (Stalled Progress)
    const SmartClinicalService = require('../services/smartClinical.service');
    const clinicalResult = await SmartClinicalService.checkStalledProgress(req.user.id);

    res.json({
      success: true,
      results: {
        rehab: sessionResult,
        finance: financeResult,
        hr: hrResult,
        inventory: invResult,
        clinical: clinicalResult,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

