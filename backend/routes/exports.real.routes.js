/* eslint-disable no-unused-vars */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// GET /:format
router.get('/:format', async (req, res) => {
  try {
    const format = req.params.format;
    res.json({ success: true, data: { format, status: 'ready', timestamp: new Date() }, message: 'جاهز للتصدير' });
  } catch (err) {
    logger.error('Export format error:', err);
    res.status(500).json({ success: false, message: 'خطأ في التصدير' });
  }
});

module.exports = router;
