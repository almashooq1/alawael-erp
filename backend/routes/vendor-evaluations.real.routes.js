/* eslint-disable no-unused-vars */
/**
 * Vendor Evaluations Routes — تقييمات الموردين
 * Handles: /api/vendor-evaluations
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// GET / — list evaluations
router.get('/', async (req, res) => {
  try {
    const VendorEvaluation = require('../models/VendorEvaluation');
    const { page = 1, limit = 50, vendorId } = req.query;
    const filter = {};
    if (vendorId) filter.vendorId = vendorId;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      VendorEvaluation.find(filter)
        .sort({ date: -1 })
        .skip(skip)
        .limit(+limit)
        .populate('vendorId', 'name category')
        .lean(),
      VendorEvaluation.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    logger.error('Evaluations list error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب التقييمات' });
  }
});

// GET /vendor/:vendorId — evaluations for specific vendor
router.get('/vendor/:vendorId', async (req, res) => {
  try {
    const VendorEvaluation = require('../models/VendorEvaluation');
    const data = await VendorEvaluation.find({ vendorId: req.params.vendorId })
      .sort({ date: -1 })
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    logger.error('Vendor evaluations error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب تقييمات المورد' });
  }
});

// POST / — create evaluation
router.post('/', async (req, res) => {
  try {
    const VendorEvaluation = require('../models/VendorEvaluation');
    const Vendor = require('../models/Vendor');

    // Calculate overall score
    const scores = [
      'qualityScore',
      'deliveryScore',
      'priceScore',
      'communicationScore',
      'complianceScore',
    ];
    const validScores = scores.filter(s => req.body[s] != null);
    const overallScore =
      validScores.length > 0
        ? validScores.reduce((sum, s) => sum + (+req.body[s] || 0), 0) / validScores.length
        : 0;

    const data = await VendorEvaluation.create({
      ...req.body,
      overallScore: Math.round(overallScore * 10) / 10,
      evaluatedBy: req.user?.id,
    });

    // Update vendor rating
    if (req.body.vendorId) {
      const evals = await VendorEvaluation.find({ vendorId: req.body.vendorId });
      const avgRating = evals.reduce((s, e) => s + e.overallScore, 0) / evals.length;
      await Vendor.findByIdAndUpdate(req.body.vendorId, {
        rating: Math.round((avgRating / 20) * 10) / 10, // convert 0-100 to 0-5
      });
    }

    res.status(201).json({ success: true, data, message: 'تم إضافة التقييم بنجاح' });
  } catch (err) {
    logger.error('Evaluation create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إضافة التقييم' });
  }
});

module.exports = router;
