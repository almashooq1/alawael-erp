const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const Communication = require('../models/Communication');

router.use(authenticate);

// GET /stats
router.get('/stats', async (req, res) => {
  try {
    const [total, sent, received] = await Promise.all([
      Communication.countDocuments(),
      Communication.countDocuments({ direction: 'outgoing' }),
      Communication.countDocuments({ direction: 'incoming' }),
    ]);
    res.json({ success: true, data: { total, sent, received, pending: 0 } });
  } catch (err) {
    logger.error('Communications stats error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب إحصائيات المراسلات' });
  }
});

// GET /
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const filter = {};
    if (type) filter.type = type;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Communication.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      Communication.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    logger.error('Communications list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب المراسلات' });
  }
});

// GET /therapist
router.get('/therapist', async (req, res) => {
  try {
    const data = await Communication.find({ $or: [{ from: req.user?.id }, { to: req.user?.id }] })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Therapist comms error:', err);
    res.status(500).json({ success: false, message: 'خطأ' });
  }
});

// POST /
router.post('/', async (req, res) => {
  try {
    const comm = await Communication.create({ ...req.body, from: req.user?.id });
    res.status(201).json({ success: true, data: comm, message: 'تم إرسال المراسلة' });
  } catch (err) {
    logger.error('Communication create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إرسال المراسلة' });
  }
});

// PATCH /:id
router.patch('/:id', async (req, res) => {
  try {
    const { subject, message, to, type, priority, status, isRead } = req.body;
    const comm = await Communication.findByIdAndUpdate(
      req.params.id,
      { subject, message, to, type, priority, status, isRead },
      { new: true }
    ).lean();
    if (!comm) return res.status(404).json({ success: false, message: 'المراسلة غير موجودة' });
    res.json({ success: true, data: comm });
  } catch (err) {
    logger.error('Communication update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث المراسلة' });
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    await Communication.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم حذف المراسلة' });
  } catch (err) {
    logger.error('Communication delete error:', err);
    res.status(500).json({ success: false, message: 'خطأ في حذف المراسلة' });
  }
});

module.exports = router;
