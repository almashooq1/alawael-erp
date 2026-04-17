/**
 * Donors Routes — إدارة المتبرعين
 * Handles: /api/donors
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
// GET / — list donors
router.get('/', async (req, res) => {
  try {
    const Donor = require('../models/Donor');
    const { page = 1, limit = 50, status } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Donor.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      Donor.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    safeError(res, err, 'Donors list error');
  }
});

// GET /:id — single donor
router.get('/:id', async (req, res) => {
  try {
    const Donor = require('../models/Donor');
    const data = await Donor.findById(req.params.id).lean();
    if (!data) return res.status(404).json({ success: false, message: 'المتبرع غير موجود' });
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'Donor get error');
  }
});

// POST / — create donor
router.post('/', async (req, res) => {
  try {
    const Donor = require('../models/Donor');
    const data = await Donor.create(stripUpdateMeta(req.body));
    res.status(201).json({ success: true, data, message: 'تم إضافة المتبرع بنجاح' });
  } catch (err) {
    safeError(res, err, 'Donor create error');
  }
});

// PUT /:id — update donor
router.put('/:id', async (req, res) => {
  try {
    const Donor = require('../models/Donor');
    const data = await Donor.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      new: true,
    }).lean();
    if (!data) return res.status(404).json({ success: false, message: 'المتبرع غير موجود' });
    res.json({ success: true, data, message: 'تم تحديث المتبرع بنجاح' });
  } catch (err) {
    safeError(res, err, 'Donor update error');
  }
});

// DELETE /:id — soft-delete donor
router.delete('/:id', async (req, res) => {
  try {
    const Donor = require('../models/Donor');
    await Donor.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: 'تم حذف المتبرع بنجاح' });
  } catch (err) {
    safeError(res, err, 'Donor delete error');
  }
});

module.exports = router;
