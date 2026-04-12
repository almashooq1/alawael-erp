const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// POST /:id/schedule
router.post('/:id/schedule', async (req, res) => {
  try {
    const Report = require('../models/Report');
    const report = await Report.create({ ...req.body, studentId: req.params.id, type: 'scheduled', createdBy: req.user?.id });
    res.status(201).json({ success: true, data: report, message: 'تم جدولة التقرير' });
  } catch (err) {
    safeError(res, err, 'Student report schedule error');
  }
});

// POST /:id/comparison
router.post('/:id/comparison', async (req, res) => {
  try {
    const Report = require('../models/Report');
const safeError = require('../utils/safeError');
    const report = await Report.create({ ...req.body, studentId: req.params.id, type: 'comparison', createdBy: req.user?.id });
    res.status(201).json({ success: true, data: report, message: 'تم إنشاء تقرير المقارنة' });
  } catch (err) {
    safeError(res, err, 'Student report comparison error');
  }
});

module.exports = router;
