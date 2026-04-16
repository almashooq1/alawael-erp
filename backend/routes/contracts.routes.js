/**
 * Contract Management Routes
 * مسارات إدارة العقود
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const { body } = require('express-validator');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const logger = require('../utils/logger');
const Contract = require('../models/Contract.model');
const safeError = require('../utils/safeError');

/** Max page size to prevent memory exhaustion */
const MAX_PAGE_LIMIT = 100;
const clampLimit = v => Math.max(1, Math.min(parseInt(v, 10) || 20, MAX_PAGE_LIMIT));

/** Guard: reject invalid ObjectIds early (400 instead of CastError 500) */
const validObjectId = (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'معرف غير صالح' });
    return false;
  }
  return true;
};

router.use(authenticate);
router.use(requireBranchAccess);
// ─── List contracts ──────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, type, page = 1, limit: rawLimit = 20 } = req.query;
    const limit = clampLimit(rawLimit);
    const filter = {};
    if (status) filter.status = status.toUpperCase();
    if (type) filter.contractType = type.toUpperCase();
    const skip = (Math.max(1, +page) - 1) * limit;
    const [data, total] = await Promise.all([
      Contract.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Contract.countDocuments(filter),
    ]);
    res.json({
      success: true,
      data,
      pagination: { page: +page, limit: +limit, total },
      message: 'قائمة العقود',
    });
  } catch (error) {
    safeError(res, error, 'fetching contracts');
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
    safeError(res, error, 'fetching contract stats');
  }
});

// ─── Get single contract ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  if (!validObjectId(req, res)) return;
  try {
    const contract = await Contract.findById(req.params.id).lean();
    if (!contract) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    res.json({ success: true, data: contract, message: 'بيانات العقد' });
  } catch (error) {
    safeError(res, error, 'fetching contract');
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
      // Atomic counter — avoids race condition where two concurrent requests
      // both read the same countDocuments() value and produce duplicate numbers.
      const year = new Date().getFullYear();
      const seq = crypto.randomInt(1000, 9999);
      const ts = Date.now().toString(36).slice(-4).toUpperCase();
      const contractNumber = `CT-${year}-${ts}${seq}`;
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
      safeError(res, error, 'creating contract');
    }
  }
);

// ─── Update contract ─────────────────────────────────────────────────────────
router.put('/:id', authorize(['admin', 'manager']), async (req, res) => {
  if (!validObjectId(req, res)) return;
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
    safeError(res, error, 'updating contract');
  }
});

// ─── Delete contract ─────────────────────────────────────────────────────────
router.delete('/:id', authorize(['admin']), async (req, res) => {
  if (!validObjectId(req, res)) return;
  try {
    const contract = await Contract.findByIdAndDelete(req.params.id);
    if (!contract) return res.status(404).json({ success: false, message: 'العقد غير موجود' });
    res.json({ success: true, message: 'تم حذف العقد بنجاح' });
  } catch (error) {
    safeError(res, error, 'deleting contract');
  }
});

// ─── Renew contract ──────────────────────────────────────────────────────────
router.post('/:id/renew', authorize(['admin', 'manager']), async (req, res) => {
  if (!validObjectId(req, res)) return;
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
    safeError(res, error, 'renewing contract');
  }
});

module.exports = router;
