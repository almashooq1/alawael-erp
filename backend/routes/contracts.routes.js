/**
 * Contract Management Routes
 * مسارات إدارة العقود
 */
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const logger = require('../utils/logger');
const Contract = require('../models/Contract.model');

router.use(authenticate);

// ─── List contracts ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status.toUpperCase();
    if (type) filter.contractType = type.toUpperCase();
    const skip = (Math.max(1, +page) - 1) * +limit;
    const [data, total] = await Promise.all([
      Contract.find(filter).sort({ createdAt: -1 }).skip(skip).limit(+limit).lean(),
      Contract.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { page: +page, limit: +limit, total },
      message: 'قائمة العقود',
    });
  } catch (error) {
    logger.error('Error fetching contracts:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب العقود' });
  }
});

// ─── Contract statistics (must be before /:id) ───────────────────────────────
router.get('/stats/summary', async (req, res) => {
  try {
    const [total, byStatus] = await Promise.all([
      Contract.countDocuments(),
      Contract.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    ]);
    const stats = { total, active: 0, expired: 0, draft: 0, suspended: 0, terminated: 0 };
    byStatus.forEach(s => {
      const key = (s._id || '').toLowerCase();
      if (stats[key] !== undefined) stats[key] = s.count;
    });
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    stats.expiringSoon = await Contract.countDocuments({
      status: 'ACTIVE',
      endDate: { $gte: now, $lte: soon },
    });
    res.json({ success: true, data: stats, message: 'إحصائيات العقود' });
  } catch (error) {
    logger.error('Error fetching contract stats:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب الإحصائيات' });
  }
});

// ─── Get single contract ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id).lean();
    if (!contract) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    res.json({ success: true, data: contract, message: 'بيانات العقد' });
  } catch (error) {
    logger.error('Error fetching contract:', error);
    res.status(500).json({ success: false, message: 'خطأ في جلب العقد' });
  }
});

// ─── Create contract ─────────────────────────────────────────────────────────
router.post(
  '/',
  authorize(['admin', 'manager']),
  validate([
    body('contractTitle').trim().notEmpty().withMessage('عنوان العقد مطلوب'),
    body('contractType').trim().notEmpty().withMessage('نوع العقد مطلوب'),
    body('startDate').optional().isISO8601().withMessage('تاريخ البداية غير صالح'),
    body('endDate').optional().isISO8601().withMessage('تاريخ النهاية غير صالح'),
    body('value').optional().isNumeric().withMessage('قيمة العقد يجب أن تكون رقماً'),
  ]),
  async (req, res) => {
    try {
      const { contractTitle, contractType, supplier, startDate, endDate, value } = req.body;
      if (!contractTitle || !contractType) {
        return res.status(400).json({ success: false, message: 'العنوان والنوع مطلوبان' });
      }
      const count = await Contract.countDocuments();
      const contractNumber = `CT-${new Date().getFullYear()}-${String(count + 1).padStart(3, '0')}`;
      const contract = await Contract.create({
        contractNumber,
        contractTitle,
        contractType,
        supplier,
        startDate,
        endDate,
        value,
        status: 'DRAFT',
        createdBy: req.user?.id,
      });
      res.status(201).json({ success: true, data: contract, message: 'تم إنشاء العقد بنجاح' });
    } catch (error) {
      logger.error('Error creating contract:', error);
      res.status(500).json({ success: false, message: 'خطأ في إنشاء العقد' });
    }
  }
);

// ─── Update contract ─────────────────────────────────────────────────────────
router.put('/:id', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const {
      contractTitle,
      contractType,
      supplier,
      startDate,
      endDate,
      value,
      status,
      terms,
      notes,
    } = req.body;
    const contract = await Contract.findByIdAndUpdate(
      req.params.id,
      { contractTitle, contractType, supplier, startDate, endDate, value, status, terms, notes },
      {
        new: true,
        runValidators: true,
      }
    ).lean();
    if (!contract) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    res.json({ success: true, data: contract, message: 'تم تحديث العقد بنجاح' });
  } catch (error) {
    logger.error('Error updating contract:', error);
    res.status(500).json({ success: false, message: 'خطأ في تحديث العقد' });
  }
});

// ─── Delete contract ─────────────────────────────────────────────────────────
router.delete('/:id', authorize(['admin']), async (req, res) => {
  try {
    const contract = await Contract.findByIdAndDelete(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    res.json({ success: true, message: 'تم حذف العقد بنجاح' });
  } catch (error) {
    logger.error('Error deleting contract:', error);
    res.status(500).json({ success: false, message: 'خطأ في حذف العقد' });
  }
});

// ─── Renew contract ──────────────────────────────────────────────────────────
router.post('/:id/renew', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    contract.status = 'ACTIVE';
    if (contract.endDate) {
      const end = new Date(contract.endDate);
      contract.startDate = new Date(end);
      end.setFullYear(end.getFullYear() + 1);
      contract.endDate = end;
    }
    await contract.save();
    res.json({ success: true, data: contract, message: 'تم تجديد العقد بنجاح' });
  } catch (error) {
    logger.error('Error renewing contract:', error);
    res.status(500).json({ success: false, message: 'خطأ في تجديد العقد' });
  }
});

module.exports = router;
