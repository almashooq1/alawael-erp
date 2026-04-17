const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const svc = require('../services/branches/branch-enhanced.service');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

// مقارنة أداء الفروع
router.get('/compare', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { branch_ids, period } = req.query;
    const ids = Array.isArray(branch_ids) ? branch_ids : [branch_ids].filter(Boolean);
    const data = await svc.compareBranches(ids, period || 'month');
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err);
  }
});

// قائمة الفروع
router.get('/', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const Branch = require('../models/Branch');
    const branches = await Branch.find({ isActive: true }).select('-__v');
    res.json({ success: true, data: branches });
  } catch (err) {
    safeError(res, err);
  }
});

// إنشاء فرع جديد
router.post(
  '/',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      const Branch = require('../models/Branch');
      const branch = await Branch.create(stripUpdateMeta(req.body));
      await svc.initializeSettings(branch._id);
      res.status(201).json({ success: true, data: branch });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// تفاصيل فرع
router.get('/:branchId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const Branch = require('../models/Branch');
    const branch = await Branch.findById(req.params.branchId);
    if (!branch) return res.status(404).json({ success: false, message: 'الفرع غير موجود' });
    res.json({ success: true, data: branch });
  } catch (err) {
    safeError(res, err);
  }
});

// تحديث فرع
router.put(
  '/:branchId',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'branch_manager'),
  async (req, res) => {
    try {
      const Branch = require('../models/Branch');
      const branch = await Branch.findByIdAndUpdate(
        req.params.branchId,
        stripUpdateMeta(req.body),
        { new: true }
      );
      if (!branch) return res.status(404).json({ success: false, message: 'الفرع غير موجود' });
      res.json({ success: true, data: branch });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// لوحة إحصاءات الفرع
router.get('/:branchId/dashboard', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { period } = req.query;
    const data = await svc.compareBranches([req.params.branchId], period || 'month');
    res.json({ success: true, data: data[0] || {} });
  } catch (err) {
    safeError(res, err);
  }
});

// ── إعدادات الفرع ──────────────────────────────────
router.get('/:branchId/settings', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const BranchSetting = require('../models/BranchSetting');
    const settings = await BranchSetting.find({ branchId: req.params.branchId });
    res.json({ success: true, data: settings });
  } catch (err) {
    safeError(res, err);
  }
});

router.put(
  '/:branchId/settings',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'branch_manager'),
  async (req, res) => {
    try {
      const BranchSetting = require('../models/BranchSetting');
      const { settings } = req.body; // [{key, value}]
      const results = [];
      for (const s of settings) {
        const updated = await BranchSetting.findOneAndUpdate(
          { branchId: req.params.branchId, key: s.key },
          { value: String(s.value) },
          { new: true, upsert: true }
        );
        results.push(updated);
      }
      res.json({ success: true, data: results });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── الغرف ──────────────────────────────────────────
router.get('/:branchId/rooms', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const Room = require('../models/Room');
    const rooms = await Room.find({ branchId: req.params.branchId, isActive: true });
    res.json({ success: true, data: rooms });
  } catch (err) {
    safeError(res, err);
  }
});

router.post(
  '/:branchId/rooms',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'branch_manager'),
  async (req, res) => {
    try {
      const room = await svc.createRoom(req.params.branchId, req.body);
      res.status(201).json({ success: true, data: room });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.put(
  '/:branchId/rooms/:roomId',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'branch_manager'),
  async (req, res) => {
    try {
      const Room = require('../models/Room');
      const room = await Room.findOneAndUpdate(
        { _id: req.params.roomId, branchId: req.params.branchId },
        req.body,
        { new: true }
      );
      if (!room) return res.status(404).json({ success: false, message: 'الغرفة غير موجودة' });
      res.json({ success: true, data: room });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.delete(
  '/:branchId/rooms/:roomId',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      const Room = require('../models/Room');
      await Room.findOneAndUpdate(
        { _id: req.params.roomId, branchId: req.params.branchId },
        { isActive: false }
      );
      res.json({ success: true, message: 'تم حذف الغرفة' });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── الخدمات ────────────────────────────────────────
router.get('/:branchId/services', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const BranchService = require('../models/BranchService');
    const services = await BranchService.find({ branchId: req.params.branchId, isActive: true });
    res.json({ success: true, data: services });
  } catch (err) {
    safeError(res, err);
  }
});

router.post(
  '/:branchId/services',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'branch_manager'),
  async (req, res) => {
    try {
      const service = await svc.upsertBranchService(req.params.branchId, req.body);
      res.status(201).json({ success: true, data: service });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.put(
  '/:branchId/services/:serviceId',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'branch_manager'),
  async (req, res) => {
    try {
      const BranchService = require('../models/BranchService');
      const service = await BranchService.findOneAndUpdate(
        { _id: req.params.serviceId, branchId: req.params.branchId },
        req.body,
        { new: true }
      );
      if (!service) return res.status(404).json({ success: false, message: 'الخدمة غير موجودة' });
      res.json({ success: true, data: service });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── نقل المستفيدين ──────────────────────────────────
router.get('/transfers', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const BeneficiaryTransfer = require('../models/BeneficiaryTransfer');
    const transfers = await BeneficiaryTransfer.find()
      .populate('beneficiaryId', 'full_name_ar file_number')
      .populate('fromBranchId', 'name nameAr')
      .populate('toBranchId', 'name nameAr')
      .populate('requestedBy', 'name email')
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ success: true, data: transfers });
  } catch (err) {
    safeError(res, err);
  }
});

router.post('/transfers', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const BeneficiaryTransfer = require('../models/BeneficiaryTransfer');
    const transfer = await BeneficiaryTransfer.create({
      ...req.body,
      requestedBy: req.user._id,
      status: 'pending',
    });
    res.status(201).json({ success: true, data: transfer });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.put(
  '/transfers/:transferId/approve',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'branch_manager'),
  async (req, res) => {
    try {
      const BeneficiaryTransfer = require('../models/BeneficiaryTransfer');
      const transfer = await BeneficiaryTransfer.findByIdAndUpdate(
        req.params.transferId,
        { status: 'approved', approvedBy: req.user._id, approvedAt: new Date() },
        { new: true }
      );
      res.json({ success: true, data: transfer });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.put(
  '/transfers/:transferId/reject',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'branch_manager'),
  async (req, res) => {
    try {
      const BeneficiaryTransfer = require('../models/BeneficiaryTransfer');
      const transfer = await BeneficiaryTransfer.findByIdAndUpdate(
        req.params.transferId,
        { status: 'rejected', rejectionReason: req.body.reason },
        { new: true }
      );
      res.json({ success: true, data: transfer });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.post(
  '/transfers/:transferId/complete',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'branch_manager'),
  async (req, res) => {
    try {
      const BeneficiaryTransfer = require('../models/BeneficiaryTransfer');
      const transfer = await BeneficiaryTransfer.findById(req.params.transferId);
      if (!transfer)
        return res.status(404).json({ success: false, message: 'طلب النقل غير موجود' });
      await svc.completeBeneficiaryTransfer(transfer);
      res.json({ success: true, message: 'تم نقل المستفيد بنجاح', data: transfer });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
