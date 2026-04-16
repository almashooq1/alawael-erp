/**
 * Donations Routes — التبرعات والحملات والمتبرعين
 * Handles: /api/donations, /api/donors, /api/campaigns
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const { stripUpdateMeta } = require('../utils/sanitize');

router.use(authenticate);
router.use(requireBranchAccess);
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
    safeError(res, err, 'Campaigns list error');
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
    safeError(res, err, 'Campaign get error');
  }
});

// POST / — create campaign
router.post('/', async (req, res) => {
  try {
    const Campaign = require('../models/Campaign');
const safeError = require('../utils/safeError');
    const data = await Campaign.create({ ...stripUpdateMeta(req.body), createdBy: req.user?.id });
    res.status(201).json({ success: true, data, message: 'تم إنشاء الحملة بنجاح' });
  } catch (err) {
    safeError(res, err, 'Campaign create error');
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
    safeError(res, err, 'Campaign update error');
  }
});

// DELETE /:id — soft-delete campaign
router.delete('/:id', async (req, res) => {
  try {
    const Campaign = require('../models/Campaign');
    await Campaign.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: 'تم حذف الحملة بنجاح' });
  } catch (err) {
    safeError(res, err, 'Campaign delete error');
  }
});

module.exports = router;
