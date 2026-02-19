const express = require('express');
const router = express.Router();
const AuditLog = require('../models/AuditLog');
const { authMiddleware, adminOnly } = require('../middleware/auth');

// جلب أحدث السجلات (مع إمكانية التصفية لاحقاً)
router.get('/', authMiddleware, async (req, res) => {
  try {
    // فقط admin/manager يمكنهم رؤية السجل الكامل
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ message: 'غير مصرح' });
    }
    const logs = await AuditLog.find({})
      .populate('user', 'username role')
      .sort({ timestamp: -1 })
      .limit(100);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'خطأ في جلب السجل' });
  }
});

module.exports = router;
