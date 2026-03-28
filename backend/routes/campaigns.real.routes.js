/**
 * Donations Routes — التبرعات والحملات والمتبرعين
 * Handles: /api/donations, /api/donors, /api/campaigns
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');
const { stripUpdateMeta } = require('../utils/sanitize');

router.use(authenticate);

// ═══════════════════════════════════════════════════════
//  CAMPAIGNS — حملات التبرع
// ═══════════════════════════════════════════════════════

// GET / — list campaigns
router.get('/', async (req, res) => {
  try {
    const Campaign = require('../models/Campaign');
    const { page = 1, limit = 50, status } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Campaign.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      Campaign.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    logger.error('Campaigns list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الحملات' });
  }
});

// GET /:id — single campaign
router.get('/:id', async (req, res) => {
  try {
    const Campaign = require('../models/Campaign');
    const data = await Campaign.findById(req.params.id).lean();
    if (!data) return res.status(404).json({ success: false, message: 'الحملة غير موجودة' });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Campaign get error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الحملة' });
  }
});

// POST / — create campaign
router.post('/', async (req, res) => {
  try {
    const Campaign = require('../models/Campaign');
    const data = await Campaign.create({ ...stripUpdateMeta(req.body), createdBy: req.user?.id });
    res.status(201).json({ success: true, data, message: 'تم إنشاء الحملة بنجاح' });
  } catch (err) {
    logger.error('Campaign create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الحملة' });
  }
});

// PUT /:id — update campaign
router.put('/:id', async (req, res) => {
  try {
    const Campaign = require('../models/Campaign');
    const data = await Campaign.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), { new: true }).lean();
    if (!data) return res.status(404).json({ success: false, message: 'الحملة غير موجودة' });
    res.json({ success: true, data, message: 'تم تحديث الحملة بنجاح' });
  } catch (err) {
    logger.error('Campaign update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث الحملة' });
  }
});

// DELETE /:id — soft-delete campaign
router.delete('/:id', async (req, res) => {
  try {
    const Campaign = require('../models/Campaign');
    await Campaign.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: 'تم حذف الحملة بنجاح' });
  } catch (err) {
    logger.error('Campaign delete error:', err);
    res.status(500).json({ success: false, message: 'خطأ في حذف الحملة' });
  }
});

module.exports = router;
