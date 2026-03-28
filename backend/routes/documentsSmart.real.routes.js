const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// GET /templates
router.get('/templates', async (req, res) => {
  try {
    const Template = require('../models/Template');
    const data = await Template.find().sort({ createdAt: -1 }).limit(200).lean();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Smart docs templates error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب القوالب' });
  }
});

// POST /generate
router.post('/generate', async (req, res) => {
  try {
    const Document = require('../models/Document');
    const doc = await Document.create({
      ...req.body,
      createdBy: req.user?.id,
      type: 'smart-generated',
    });
    res.status(201).json({ success: true, data: doc, message: 'تم إنشاء المستند' });
  } catch (err) {
    logger.error('Smart docs generate error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء المستند' });
  }
});

module.exports = router;
