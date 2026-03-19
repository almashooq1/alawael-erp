/* eslint-disable no-unused-vars */
// aiNotifications.js
const express = require('express');
const router = express.Router();
const { analyzeAndSuggestNotifications } = require('../services/aiNotificationService');
const { authenticateToken } = require('../middleware/auth');

// تحليل بيانات الموظف واقتراح تنبيهات ذكية
router.post('/suggest', authenticateToken, async (req, res) => {
  try {
    const employeeData = req.body;
    const suggestions = await analyzeAndSuggestNotifications(employeeData);
    res.json({ success: true, suggestions });
  } catch (err) {
    res.status(500).json({ success: false, error: 'حدث خطأ في الخادم' });
  }
});

module.exports = router;
