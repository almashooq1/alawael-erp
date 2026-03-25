const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');

router.use(authenticate);

// GET /incentives
router.get('/incentives', async (req, res) => {
  try {
    const { IndividualIncentive } = require('../models/compensation.model');
    const { page = 1, limit = 20, status } = req.query;
    const filter = {};
    if (status) filter.status = status;
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      IndividualIncentive.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      IndividualIncentive.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    logger.error('Compensation incentives error:', err);
    res.status(500).json({ success: false, message: 'خطأ في جلب الحوافز' });
  }
});

// POST /incentives
router.post('/incentives', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { IndividualIncentive } = require('../models/compensation.model');
    const incentive = await IndividualIncentive.create({ ...req.body, createdBy: req.user?.id });
    res.status(201).json({ success: true, data: incentive, message: 'تم إنشاء الحافز' });
  } catch (err) {
    logger.error('Compensation create error:', err);
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الحافز' });
  }
});

// PUT /incentives/:id/approve
router.put('/incentives/:id/approve', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { IndividualIncentive } = require('../models/compensation.model');
    const item = await IndividualIncentive.findByIdAndUpdate(req.params.id, { status: 'approved', approvedBy: req.user?.id, approvedAt: new Date() }, { new: true }).lean();
    if (!item) return res.status(404).json({ success: false, message: 'الحافز غير موجود' });
    res.json({ success: true, data: item, message: 'تم اعتماد الحافز' });
  } catch (err) {
    logger.error('Compensation approve error:', err);
    res.status(500).json({ success: false, message: 'خطأ في اعتماد الحافز' });
  }
});

// PUT /incentives/:id/mark-paid
router.put('/incentives/:id/mark-paid', authorize(['admin']), async (req, res) => {
  try {
    const { IndividualIncentive } = require('../models/compensation.model');
    const item = await IndividualIncentive.findByIdAndUpdate(req.params.id, { status: 'paid', paidAt: new Date() }, { new: true }).lean();
    if (!item) return res.status(404).json({ success: false, message: 'الحافز غير موجود' });
    res.json({ success: true, data: item, message: 'تم صرف الحافز' });
  } catch (err) {
    logger.error('Compensation mark-paid error:', err);
    res.status(500).json({ success: false, message: 'خطأ في صرف الحافز' });
  }
});

module.exports = router;
