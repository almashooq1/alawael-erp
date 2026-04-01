/**
 * beneficiary-transfers.routes.js — مسارات نقل المستفيدين بين الفروع
 * Beneficiary Transfer Workflow Routes
 *
 * سير العمل:
 *   pending → approved → completed
 *   pending → rejected
 *
 * المسارات:
 *  GET    /api/beneficiary-transfers              — قائمة طلبات النقل
 *  GET    /api/beneficiary-transfers/:id         — تفاصيل طلب نقل
 *  POST   /api/beneficiaries/:id/transfer        — إنشاء طلب نقل لمستفيد
 *  POST   /api/beneficiary-transfers/:id/approve — الموافقة على الطلب
 *  POST   /api/beneficiary-transfers/:id/reject  — رفض الطلب
 *  POST   /api/beneficiary-transfers/:id/complete — إتمام النقل
 *
 * @module routes/beneficiary-transfers.routes
 */

'use strict';

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const BeneficiaryTransfer = require('../models/BeneficiaryTransfer');
const Beneficiary = require('../models/Beneficiary');
const beneficiaryService = require('../services/BeneficiaryService');
const { authenticateToken } = require('../middleware/auth.middleware');

// ─── دوال مساعدة ──────────────────────────────────────────────────────────────
const ok = (res, data, meta = {}) => res.json({ success: true, ...meta, data });
const fail = (res, msg, status = 400, extra = {}) =>
  res.status(status).json({ success: false, message: msg, ...extra });

const isValidId = id => mongoose.Types.ObjectId.isValid(id);

const validateId = (req, res, next) => {
  if (!isValidId(req.params.id)) return fail(res, 'معرّف غير صحيح', 400);
  next();
};

// ─── جميع المسارات تتطلب مصادقة ───────────────────────────────────────────────
router.use(authenticateToken);

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/beneficiary-transfers — قائمة طلبات النقل
// ══════════════════════════════════════════════════════════════════════════════
/**
 * @query {string}  [status]        تصفية بالحالة (pending/approved/completed/rejected)
 * @query {string}  [fromBranch]    الفرع المُرسِل
 * @query {string}  [toBranch]      الفرع المستقبِل
 * @query {string}  [beneficiaryId] مستفيد محدد
 * @query {number}  [page=1]
 * @query {number}  [limit=25]
 */
router.get('/', async (req, res) => {
  try {
    const { status, fromBranch, toBranch, beneficiaryId, page = 1, limit = 25 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (fromBranch && isValidId(fromBranch)) filter.fromBranch = fromBranch;
    if (toBranch && isValidId(toBranch)) filter.toBranch = toBranch;
    if (beneficiaryId && isValidId(beneficiaryId)) filter.beneficiary = beneficiaryId;

    // إذا لم يكن super-admin، يرى فقط طلبات فرعه
    if (!req.user?.isSuperAdmin && req.user?.branch) {
      filter.$or = [{ fromBranch: req.user.branch }, { toBranch: req.user.branch }];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [transfers, total] = await Promise.all([
      BeneficiaryTransfer.find(filter)
        .populate('beneficiary', 'fileNumber firstName_ar lastName_ar disabilityType')
        .populate('fromBranch', 'nameAr code')
        .populate('toBranch', 'nameAr code')
        .populate('approvedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      BeneficiaryTransfer.countDocuments(filter),
    ]);

    return ok(res, transfers, {
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// GET /api/beneficiary-transfers/:id — تفاصيل طلب نقل
// ══════════════════════════════════════════════════════════════════════════════
router.get('/:id', validateId, async (req, res) => {
  try {
    const transfer = await BeneficiaryTransfer.findById(req.params.id)
      .populate(
        'beneficiary',
        'fileNumber firstName_ar lastName_ar status branch disabilityType disabilitySeverity'
      )
      .populate('fromBranch', 'nameAr code')
      .populate('toBranch', 'nameAr code')
      .populate('approvedBy', 'name')
      .lean();

    if (!transfer) return fail(res, 'طلب النقل غير موجود', 404);
    return ok(res, transfer);
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/beneficiaries/:beneficiaryId/transfer — إنشاء طلب نقل
// ══════════════════════════════════════════════════════════════════════════════
// هذا المسار يُثبَّت أيضاً على /api/beneficiaries/:beneficiaryId/transfer
// انظر _registry.js
router.post('/initiate/:beneficiaryId', async (req, res) => {
  try {
    const { beneficiaryId } = req.params;
    if (!isValidId(beneficiaryId)) return fail(res, 'معرّف المستفيد غير صحيح', 400);

    const { toBranchId, transferDate, reason } = req.body;

    if (!toBranchId || !isValidId(toBranchId)) return fail(res, 'الفرع المستقبِل مطلوب', 422);
    if (!transferDate) return fail(res, 'تاريخ النقل مطلوب', 422);
    if (!reason || !reason.trim()) return fail(res, 'سبب النقل مطلوب', 422);

    const parsedDate = new Date(transferDate);
    if (isNaN(parsedDate.getTime())) return fail(res, 'تاريخ النقل غير صحيح', 422);

    // تاريخ النقل يجب أن يكون اليوم أو في المستقبل
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (parsedDate < today) return fail(res, 'تاريخ النقل يجب أن يكون اليوم أو في المستقبل', 422);

    const beneficiary = await Beneficiary.findById(beneficiaryId).populate('branch', 'code');
    if (!beneficiary) return fail(res, 'المستفيد غير موجود', 404);

    if (beneficiary.status !== 'active') {
      return fail(res, 'يمكن نقل المستفيدين النشطين فقط', 422);
    }

    const transfer = await beneficiaryService.initiateTransfer(
      beneficiary,
      toBranchId,
      parsedDate,
      reason.trim(),
      req.user?._id
    );

    return res.status(201).json({
      success: true,
      message: 'تم إنشاء طلب النقل. في انتظار الموافقة.',
      data: transfer,
    });
  } catch (err) {
    if (err.code === 'BRANCH_CAPACITY_EXCEEDED')
      return fail(res, err.message, 422, { code: err.code });
    if (err.code === 'SAME_BRANCH_TRANSFER') return fail(res, err.message, 422, { code: err.code });
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/beneficiary-transfers/:id/approve — الموافقة على الطلب
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/approve', validateId, async (req, res) => {
  try {
    const { notes } = req.body;

    const transfer = await BeneficiaryTransfer.findById(req.params.id);
    if (!transfer) return fail(res, 'طلب النقل غير موجود', 404);

    if (transfer.status !== 'pending') {
      return fail(res, `لا يمكن الموافقة على طلب بحالة "${transfer.status}"`, 422);
    }

    transfer.status = 'approved';
    transfer.approvedBy = req.user?._id;
    transfer.approvedAt = new Date();
    if (notes) transfer.notes = notes;
    await transfer.save();

    return ok(res, transfer, { message: 'تمت الموافقة على طلب النقل' });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/beneficiary-transfers/:id/reject — رفض الطلب
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/reject', validateId, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) return fail(res, 'سبب الرفض مطلوب', 422);

    const transfer = await BeneficiaryTransfer.findById(req.params.id);
    if (!transfer) return fail(res, 'طلب النقل غير موجود', 404);

    if (!['pending', 'approved'].includes(transfer.status)) {
      return fail(res, `لا يمكن رفض طلب بحالة "${transfer.status}"`, 422);
    }

    transfer.status = 'rejected';
    transfer.rejectionReason = reason.trim();
    transfer.rejectedBy = req.user?._id;
    transfer.rejectedAt = new Date();
    await transfer.save();

    return ok(res, transfer, { message: 'تم رفض طلب النقل' });
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

// ══════════════════════════════════════════════════════════════════════════════
// POST /api/beneficiary-transfers/:id/complete — إتمام النقل
// ══════════════════════════════════════════════════════════════════════════════
router.post('/:id/complete', validateId, async (req, res) => {
  try {
    const transfer = await BeneficiaryTransfer.findById(req.params.id).populate(
      'toBranch',
      'code nameAr'
    );
    if (!transfer) return fail(res, 'طلب النقل غير موجود', 404);

    if (transfer.status !== 'approved') {
      return fail(res, 'يجب أن يكون الطلب مُوافَقاً عليه قبل الإتمام', 422);
    }

    const branchCode = transfer.toBranch?.code;
    const updatedBeneficiary = await beneficiaryService.completeTransfer(
      transfer,
      req.user?._id,
      branchCode
    );

    return ok(
      res,
      {
        transfer,
        beneficiary: {
          _id: updatedBeneficiary._id,
          fileNumber: updatedBeneficiary.fileNumber,
          branch: updatedBeneficiary.branch,
          status: updatedBeneficiary.status,
        },
      },
      { message: `تم نقل المستفيد بنجاح إلى ${transfer.toBranch?.nameAr || 'الفرع الجديد'}` }
    );
  } catch (err) {
    return fail(res, err.message, 500);
  }
});

module.exports = router;
