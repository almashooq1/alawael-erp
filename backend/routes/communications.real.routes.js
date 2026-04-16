const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const Communication = require('../models/Communication');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
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
    safeError(res, err, 'Communications stats error');
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
    safeError(res, err, 'Communications list error');
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
    safeError(res, err, 'Therapist comms error');
  }
});

// POST /
router.post('/', async (req, res) => {
  try {
    const comm = await Communication.create({ ...stripUpdateMeta(req.body), from: req.user?.id });
    res.status(201).json({ success: true, data: comm, message: 'تم إرسال المراسلة' });
  } catch (err) {
    safeError(res, err, 'Communication create error');
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
    safeError(res, err, 'Communication update error');
  }
});

// DELETE /:id
router.delete('/:id', async (req, res) => {
  try {
    await Communication.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'تم حذف المراسلة' });
  } catch (err) {
    safeError(res, err, 'Communication delete error');
  }
});

module.exports = router;
