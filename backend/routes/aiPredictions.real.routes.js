const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// GET /predictions/:userId
router.get('/predictions/:userId', async (req, res) => {
  try {
    const Prediction = require('../models/prediction.model');
    const data = await Prediction.find({ userId: req.params.userId }).sort({ createdAt: -1 }).limit(10).lean();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('AI predictions error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب التوقعات' });
  }
});

// GET /recommendations/:userId
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const Prediction = require('../models/prediction.model');
    const data = await Prediction.find({ userId: req.params.userId, type: 'recommendation' }).sort({ createdAt: -1 }).limit(10).lean();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('AI recommendations error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب التوصيات' });
  }
});

module.exports = router;
