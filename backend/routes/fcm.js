// backend/routes/fcm.js
const express = require('express');
const router = express.Router();
const fcmController = require('../controllers/fcmController');
const { authenticateToken } = require('../middleware/auth');

// جميع المسارات تتطلب مصادقة
router.use(authenticateToken);

// تسجيل توكن FCM
router.post('/register', fcmController.registerToken);
// حذف توكن FCM
router.post('/unregister', fcmController.unregisterToken);

module.exports = router;
