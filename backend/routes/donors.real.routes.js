/* eslint-disable no-unused-vars */
/**
 * Donors Routes — إدارة المتبرعين
 * Handles: /api/donors
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

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
    logger.error('Donors list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب المتبرعين' });
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
    logger.error('Donor get error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب المتبرع' });
  }
});

// POST / — create donor
router.post('/', async (req, res) => {
  try {
    const Donor = require('../models/Donor');
    const data = await Donor.create(req.body);
    res.status(201).json({ success: true, data, message: 'تم إضافة المتبرع بنجاح' });
  } catch (err) {
    logger.error('Donor create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إضافة المتبرع' });
  }
});

// PUT /:id — update donor
router.put('/:id', async (req, res) => {
  try {
    const Donor = require('../models/Donor');
    const data = await Donor.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!data) return res.status(404).json({ success: false, message: 'المتبرع غير موجود' });
    res.json({ success: true, data, message: 'تم تحديث المتبرع بنجاح' });
  } catch (err) {
    logger.error('Donor update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث المتبرع' });
  }
});

// DELETE /:id — soft-delete donor
router.delete('/:id', async (req, res) => {
  try {
    const Donor = require('../models/Donor');
    await Donor.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: 'تم حذف المتبرع بنجاح' });
  } catch (err) {
    logger.error('Donor delete error:', err);
    res.status(500).json({ success: false, message: 'خطأ في حذف المتبرع' });
  }
});

module.exports = router;
