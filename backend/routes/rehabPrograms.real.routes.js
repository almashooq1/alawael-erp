const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// GET /
router.get('/', async (req, res) => {
  try {
    const RehabProgram = require('../models/RehabilitationProgramModels');
    const data = await RehabProgram.RehabilitationProgram.find().sort({ createdAt: -1 }).lean();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Rehab programs error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب برامج التأهيل' });
  }
});

module.exports = router;
