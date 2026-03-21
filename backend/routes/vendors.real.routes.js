/* eslint-disable no-unused-vars */
/**
 * Vendors Routes — إدارة الموردين
 * Handles: /api/vendors
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// GET /dashboard/stats — vendor dashboard statistics
router.get('/dashboard/stats', async (req, res) => {
  try {
    const Vendor = require('../models/Vendor');
    const VendorEvaluation = require('../models/VendorEvaluation');

    const [totalVendors, activeVendors, blacklisted, evaluations] = await Promise.all([
      Vendor.countDocuments({ isDeleted: { $ne: true } }),
      Vendor.countDocuments({ status: 'active', isDeleted: { $ne: true } }),
      Vendor.countDocuments({ status: 'blacklisted', isDeleted: { $ne: true } }),
      VendorEvaluation.aggregate([
        { $group: { _id: null, avgScore: { $avg: '$overallScore' } } },
      ]),
    ]);

    // By category
    const byCategory = await Vendor.aggregate([
      { $match: { isDeleted: { $ne: true } } },
      { $group: { _id: '$category', count: { $sum: 1 }, totalAmount: { $sum: '$totalAmount' } } },
      { $sort: { count: -1 } },
    ]);

    // Top vendors
    const topVendors = await Vendor.find({ isDeleted: { $ne: true } })
      .sort({ rating: -1 })
      .limit(10)
      .select('name category rating totalOrders totalAmount')
      .lean();

    res.json({
      success: true,
      data: {
        totalVendors,
        activeVendors,
        blacklisted,
        averageScore: evaluations[0]?.avgScore || 0,
        byCategory,
        topVendors,
      },
    });
  } catch (err) {
    logger.error('Vendors dashboard error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب إحصائيات الموردين' });
  }
});

// GET / — list vendors
router.get('/', async (req, res) => {
  try {
    const Vendor = require('../models/Vendor');
    const { page = 1, limit = 50, status, category, search } = req.query;
    const filter = { isDeleted: { $ne: true } };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: 'i' };
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Vendor.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      Vendor.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    logger.error('Vendors list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الموردين' });
  }
});

// GET /:id — single vendor
router.get('/:id', async (req, res) => {
  try {
    const Vendor = require('../models/Vendor');
    const data = await Vendor.findById(req.params.id).lean();
    if (!data) return res.status(404).json({ success: false, message: 'المورد غير موجود' });
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Vendor get error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب المورد' });
  }
});

// POST / — create vendor
router.post('/', async (req, res) => {
  try {
    const Vendor = require('../models/Vendor');
    const data = await Vendor.create(req.body);
    res.status(201).json({ success: true, data, message: 'تم إضافة المورد بنجاح' });
  } catch (err) {
    logger.error('Vendor create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إضافة المورد' });
  }
});

// PUT /:id — update vendor
router.put('/:id', async (req, res) => {
  try {
    const Vendor = require('../models/Vendor');
    const data = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();
    if (!data) return res.status(404).json({ success: false, message: 'المورد غير موجود' });
    res.json({ success: true, data, message: 'تم تحديث المورد بنجاح' });
  } catch (err) {
    logger.error('Vendor update error:', err);
    res.status(500).json({ success: false, message: 'خطأ في تحديث المورد' });
  }
});

// DELETE /:id — soft-delete vendor
router.delete('/:id', async (req, res) => {
  try {
    const Vendor = require('../models/Vendor');
    await Vendor.findByIdAndUpdate(req.params.id, { isDeleted: true });
    res.json({ success: true, message: 'تم حذف المورد بنجاح' });
  } catch (err) {
    logger.error('Vendor delete error:', err);
    res.status(500).json({ success: false, message: 'خطأ في حذف المورد' });
  }
});

module.exports = router;
