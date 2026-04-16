// aiNotifications.js
const express = require('express');
const router = express.Router();
const { analyzeAndSuggestNotifications } = require('../services/aiNotificationService');
const { authenticateToken } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');

// تحليل بيانات الموظف واقتراح تنبيهات ذكية
router.post('/suggest', authenticateToken, requireBranchAccess, async (req, res) => {
  try {
    const employeeData = req.body;
    const suggestions = await analyzeAndSuggestNotifications(employeeData);
    res.json({ success: true, suggestions });
  } catch (err) {
    safeError(res, err, 'aiNotifications');
  }
});

module.exports = router;
