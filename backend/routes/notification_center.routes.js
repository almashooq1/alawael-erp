const express = require('express');
const router = express.Router();
const NotificationCenterService = require('../services/notificationCenter.service');
const { authenticateToken, authorizeRole } = require('../middleware/auth.middleware');

router.use(authenticateToken);

/**
 * @route POST /api/notifications-center/send
 * @desc Manually trigger notification (e.g., Delay alert)
 */
router.post('/send', authorizeRole(['ADMIN', 'RECEPTIONIST']), async (req, res) => {
  try {
    // recipientMock for demo
    const recipient = {
      phone: req.body.phone,
      email: req.body.email,
      preferences: { whatsapp: true, email: true },
    };

    const results = await NotificationCenterService.sendNotification(recipient, req.body.type, req.body.message);
    res.json({ success: true, results });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

