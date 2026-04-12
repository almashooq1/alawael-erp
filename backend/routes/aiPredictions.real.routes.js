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
    safeError(res, err, 'AI predictions error');
  }
});

// GET /recommendations/:userId
router.get('/recommendations/:userId', async (req, res) => {
  try {
    const Prediction = require('../models/prediction.model');
const safeError = require('../utils/safeError');
    const data = await Prediction.find({ userId: req.params.userId, type: 'recommendation' }).sort({ createdAt: -1 }).limit(10).lean();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'AI recommendations error');
  }
});

module.exports = router;
