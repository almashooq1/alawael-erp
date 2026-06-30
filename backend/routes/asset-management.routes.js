/**
 * Asset Management Routes — مسارات إدارة الأصول والموارد
 * النظام 34: إدارة الأصول والموارد
 *
 * Base: /api/asset-management
 * ─── Asset Categories    /categories
 * ─── Assets (Enhanced)   /assets
 * ─── Depreciation        /depreciation
 * ─── Work Orders         /work-orders
 * ─── Transfers           /transfers
 * ─── Resource Bookings   /bookings
 * ─── Inventories         /inventories
 * ─── Dashboard           /dashboard
 */
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const crypto = require('crypto');
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const { effectiveBranchScope } = require('../middleware/assertBranchMatch');
const _logger = require('../utils/logger');
const escapeRegex = require('../utils/escapeRegex');

// Models
const AssetCategory = require('../models/AssetCategory');
const Asset = require('../models/Asset');
const AssetDepreciationSchedule = require('../models/AssetDepreciationSchedule');
const MaintenanceWorkOrder = require('../models/MaintenanceWorkOrder');
const AssetTransfer = require('../models/AssetTransfer');
const ResourceBooking = require('../models/ResourceBooking');
const AssetInventory = require('../models/AssetInventory');
const AssetInventoryItem = require('../models/AssetInventoryItem');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const MAX_LIMIT = 100;
const clamp = v => Math.max(1, Math.min(parseInt(v, 10) || 20, MAX_LIMIT));
const validId = (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    res.status(400).json({ success: false, message: 'معرف غير صالح' });
    return false;
  }
  return true;
};
const genCode = prefix => {
  const year = new Date().getFullYear();
  const rnd = crypto.randomInt(1000, 9999);
  const ts = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-${year}-${ts}${rnd}`;
};

/** W912 — branch-scoped models (work orders, transfers, bookings, inventories). */
function mergeTenantFilter(req, base = {}) {
  return { ...base, ...branchFilter(req) };
}

function scopedById(req, id) {
  return { _id: id, ...branchFilter(req) };
}

router.use(authenticate);
router.use(requireBranchAccess);
// ═══════════════════════════════════════════════════════════════════════════════
// ASSET CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/categories', async (req, res) => {
  try {
    const { isActive, parentId, page = 1, limit: rawLimit = 20 } = req.query;
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (parentId) filter.parentId = parentId === 'null' ? null : parentId;
    const limit = clamp(rawLimit);
    const skip = (Math.max(1, +page) - 1) * limit;
    const [data, total] = await Promise.all([
      AssetCategory.find(filter).sort({ code: 1 }).skip(skip).limit(limit).lean(),
      AssetCategory.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit, total } });
  } catch (err) {
    safeError(res, err, 'categories list error');
  }
});

router.post('/categories', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { nameAr, code } = req.body;
    if (!nameAr || !code)
      return res.status(400).json({ success: false, message: 'الاسم والكود مطلوبان' });
    const category = await AssetCategory.create({
      ...stripUpdateMeta(req.body),
      code: code.toUpperCase(),
      createdBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: category, message: 'تم إنشاء التصنيف' });
  } catch (err) {
    if (err.code === 11000)
      return res.status(409).json({ success: false, message: 'الكود مستخدم مسبقاً' });
    safeError(res, err, 'categories create error');
  }
});

router.put('/categories/:id', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const category = await AssetCategory.findByIdAndUpdate(
      req.params.id,
      { ...stripUpdateMeta(req.body), updatedBy: req.user?.id },
      { returnDocument: 'after', runValidators: true }
    ).lean();
    if (!category) return res.status(404).json({ success: false, message: 'التصنيف غير موجود' });
    res.json({ success: true, data: category, message: 'تم التحديث' });
  } catch (err) {
    safeError(res, err, 'categories update error');
  }
});

router.delete('/categories/:id', authorize(['admin']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const category = await AssetCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'التصنيف غير موجود' });
    res.json({ success: true, message: 'تم حذف التصنيف' });
  } catch (err) {
    safeError(res, err, 'categories delete error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ASSETS (Enhanced)
// ═══════════════════════════════════════════════════════════════════════════════

// Dashboard stats
router.get('/assets/stats', async (req, res) => {
  try {
    const scope = branchFilter(req);
    const [total, byStatus, _byCategory, warrantyExpiringSoon, maintenanceDue] = await Promise.all([
      Asset.countDocuments(scope),
      Asset.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Asset.aggregate([{ $match: scope }, { $group: { _id: '$category', count: { $sum: 1 } } }]),
      Asset.countDocuments({
        ...scope,
        warrantyExpiryDate: { $gte: new Date(), $lte: new Date(Date.now() + 60 * 864e5) },
      }),
      Asset.countDocuments({
        ...scope,
        lastMaintenanceDate: { $lte: new Date(Date.now() - 30 * 864e5) },
        status: 'active',
      }),
    ]);
    const stats = { total, byStatus: {}, warrantyExpiringSoon, maintenanceDue };
    byStatus.forEach(s => {
      stats.byStatus[s._id || 'unknown'] = s.count;
    });
    res.json({ success: true, data: stats });
  } catch (err) {
    safeError(res, err, 'assets stats error');
  }
});

router.get('/assets', async (req, res) => {
  try {
    const { search, status, category, page = 1, limit: rawLimit = 20 } = req.query;
    const filter = { ...branchFilter(req) };
    if (status) filter.status = status;
    if (category) filter.category = category;
    const scopedBranch = effectiveBranchScope(req);
    if (scopedBranch) filter.branchId = scopedBranch;
    if (search) {
      const safe = escapeRegex(String(search));
      filter.$or = [
        { name: { $regex: escapeRegex(safe), $options: 'i' } },
        { tags: { $in: [new RegExp(safe, 'i')] } },
      ];
    }
    const limit = clamp(rawLimit);
    const skip = (Math.max(1, +page) - 1) * limit;
    const [data, total] = await Promise.all([
      Asset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Asset.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit, total } });
  } catch (err) {
    safeError(res, err, 'assets list error');
  }
});

router.post('/assets', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { name, category } = req.body;
    if (!name || !category)
      return res.status(400).json({ success: false, message: 'الاسم والفئة مطلوبان' });
    const payload = stripUpdateMeta(req.body);
    delete payload.branchId;
    const asset = await Asset.create({
      ...payload,
      createdBy: req.user?.id,
      ...(req.branchScope?.branchId && { branchId: req.branchScope.branchId }),
    });
    res.status(201).json({ success: true, data: asset, message: 'تم إضافة الأصل' });
  } catch (err) {
    safeError(res, err, 'assets create error');
  }
});

router.get('/assets/:id', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const asset = await Asset.findOne(scopedById(req, req.params.id)).lean();
    if (!asset) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    res.json({ success: true, data: asset });
  } catch (err) {
    safeError(res, err, 'asset get error');
  }
});

router.put('/assets/:id', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const body = stripUpdateMeta(req.body);
    delete body.branchId;
    const asset = await Asset.findOneAndUpdate(
      scopedById(req, req.params.id),
      { ...body, updatedAt: new Date() },
      { returnDocument: 'after', runValidators: true }
    ).lean();
    if (!asset) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    res.json({ success: true, data: asset, message: 'تم تحديث الأصل' });
  } catch (err) {
    safeError(res, err, 'asset update error');
  }
});

router.delete('/assets/:id', authorize(['admin']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const asset = await Asset.findOne(scopedById(req, req.params.id));
    if (!asset) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    if (asset.status === 'active')
      return res.status(409).json({ success: false, message: 'لا يمكن حذف أصل نشط' });
    await asset.deleteOne();
    res.json({ success: true, message: 'تم حذف الأصل' });
  } catch (err) {
    safeError(res, err, 'asset delete error');
  }
});

// Scan barcode
router.get('/assets/scan/:barcode', async (req, res) => {
  try {
    const asset = await Asset.findOne({
      ...branchFilter(req),
      $or: [{ tags: req.params.barcode }, { location: req.params.barcode }],
    }).lean();
    if (!asset) return res.status(404).json({ success: false, message: 'لم يُعثر على الأصل' });
    res.json({ success: true, data: asset });
  } catch (err) {
    safeError(res, err, 'barcode scan error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DEPRECIATION SCHEDULES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/depreciation', async (req, res) => {
  try {
    const { assetId, status, year, page = 1, limit: rawLimit = 20 } = req.query;
    // branch-scope the depreciation schedule (AssetDepreciationSchedule has a
    // branchId) — was unscoped → a restricted user could read every branch's
    // depreciation amounts / net book values.
    const filter = mergeTenantFilter(req);
    if (assetId) filter.assetId = assetId;
    if (status) filter.status = status;
    if (year) filter.periodYear = +year;
    const limit = clamp(rawLimit);
    const skip = (Math.max(1, +page) - 1) * limit;
    const [data, total] = await Promise.all([
      AssetDepreciationSchedule.find(filter)
        .populate('assetId', 'name category')
        .sort({ depreciationDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AssetDepreciationSchedule.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit, total } });
  } catch (err) {
    safeError(res, err, 'depreciation list error');
  }
});

router.post('/depreciation', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const {
      assetId,
      periodYear,
      periodMonth,
      _depreciationDate,
      depreciationAmount,
      _accumulatedDepreciation,
      _netBookValue,
    } = req.body;
    if (!assetId || !periodYear || !periodMonth || !depreciationAmount) {
      return res.status(400).json({ success: false, message: 'البيانات الأساسية مطلوبة' });
    }
    // verify the target asset belongs to the caller's branch (else a restricted
    // user could attach depreciation to another branch's asset) + stamp branchId
    // so the schedule is itself branch-scoped (mirrors the /work-orders pattern).
    const scope = branchFilter(req);
    if (Object.keys(scope).length) {
      const owned = await Asset.findOne({ _id: assetId, ...scope }).select('_id').lean();
      if (!owned) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    }
    const depPayload = {
      ...stripUpdateMeta(req.body),
      createdBy: req.user?.id,
    };
    if (req.branchScope?.branchId) depPayload.branchId = req.branchScope.branchId;
    const schedule = await AssetDepreciationSchedule.create(depPayload);
    res.status(201).json({ success: true, data: schedule, message: 'تم إنشاء جدول الإهلاك' });
  } catch (err) {
    safeError(res, err, 'depreciation create error');
  }
});

// Post depreciation (mark as posted)
router.patch('/depreciation/:id/post', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    // branch-scope the match + require status 'scheduled' (was unscoped by id →
    // a restricted user could post another branch's depreciation to the ledger,
    // and a 'reversed' entry could be silently re-posted).
    const schedule = await AssetDepreciationSchedule.findOneAndUpdate(
      { _id: req.params.id, ...branchFilter(req), status: 'scheduled' },
      { status: 'posted', postedBy: req.user?.id, postedAt: new Date() },
      { returnDocument: 'after' }
    ).lean();
    if (!schedule)
      return res
        .status(404)
        .json({ success: false, message: 'السجل غير موجود أو تمّ ترحيله مسبقاً' });
    res.json({ success: true, data: schedule, message: 'تم ترحيل الإهلاك' });
  } catch (err) {
    safeError(res, err, 'depreciation post error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// MAINTENANCE WORK ORDERS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/work-orders', async (req, res) => {
  try {
    const {
      assetId,
      status,
      type,
      priority,
      dateFrom,
      dateTo,
      page = 1,
      limit: rawLimit = 20,
    } = req.query;
    const filter = mergeTenantFilter(req, {});
    if (assetId) filter.assetId = assetId;
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (dateFrom || dateTo) {
      filter.scheduledDate = {};
      if (dateFrom) filter.scheduledDate.$gte = new Date(dateFrom);
      if (dateTo) filter.scheduledDate.$lte = new Date(dateTo);
    }
    const limit = clamp(rawLimit);
    const skip = (Math.max(1, +page) - 1) * limit;
    const [data, total] = await Promise.all([
      MaintenanceWorkOrder.find(filter)
        .populate('assetId', 'name category location')
        .populate('assignedTo', 'name email')
        .sort({ scheduledDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      MaintenanceWorkOrder.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit, total } });
  } catch (err) {
    safeError(res, err, 'work-orders list error');
  }
});

router.post('/work-orders', authorize(['admin', 'manager', 'technician']), async (req, res) => {
  try {
    const { assetId, type, title, scheduledDate } = req.body;
    if (!assetId || !type || !title || !scheduledDate) {
      return res
        .status(400)
        .json({ success: false, message: 'الأصل، النوع، العنوان، والتاريخ مطلوبة' });
    }
    const scope = branchFilter(req);
    if (Object.keys(scope).length) {
      const owned = await Asset.findOne({ _id: assetId, ...scope })
        .select('_id')
        .lean();
      if (!owned) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    }
    const workOrderNumber = genCode('WO');
    const woPayload = {
      ...stripUpdateMeta(req.body),
      workOrderNumber,
      status: 'pending',
      createdBy: req.user?.id,
    };
    if (req.branchScope?.branchId) woPayload.branchId = req.branchScope.branchId;
    const workOrder = await MaintenanceWorkOrder.create(woPayload);
    // Update asset status to under_maintenance for corrective/emergency
    if (['corrective', 'emergency'].includes(type)) {
      await Asset.findOneAndUpdate(
        Object.keys(scope).length ? { _id: assetId, ...scope } : { _id: assetId },
        { status: 'maintenance' }
      );
    }
    res.status(201).json({ success: true, data: workOrder, message: 'تم إنشاء أمر العمل' });
  } catch (err) {
    safeError(res, err, 'work-orders create error');
  }
});

router.get('/work-orders/:id', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const wo = await MaintenanceWorkOrder.findOne(scopedById(req, req.params.id))
      .populate('assetId', 'name category location')
      .populate('assignedTo', 'name email')
      .lean();
    if (!wo) return res.status(404).json({ success: false, message: 'أمر العمل غير موجود' });
    res.json({ success: true, data: wo });
  } catch (err) {
    safeError(res, err, 'work-order get error');
  }
});

router.put('/work-orders/:id', authorize(['admin', 'manager', 'technician']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const wo = await MaintenanceWorkOrder.findOneAndUpdate(
      scopedById(req, req.params.id),
      { ...stripUpdateMeta(req.body), updatedBy: req.user?.id },
      { returnDocument: 'after', runValidators: true }
    ).lean();
    if (!wo) return res.status(404).json({ success: false, message: 'أمر العمل غير موجود' });
    res.json({ success: true, data: wo, message: 'تم التحديث' });
  } catch (err) {
    safeError(res, err, 'work-order update error');
  }
});

// Complete work order
router.patch(
  '/work-orders/:id/complete',
  authorize(['admin', 'manager', 'technician']),
  async (req, res) => {
    if (!validId(req, res)) return;
    try {
      const { findings, resolution, actualCost, partsUsed } = req.body;
      if (!findings || !resolution) {
        return res.status(400).json({ success: false, message: 'النتائج والإجراء مطلوبان' });
      }
      const wo = await MaintenanceWorkOrder.findOneAndUpdate(
        scopedById(req, req.params.id),
        {
          status: 'completed',
          findings,
          resolution,
          actualCost,
          partsUsed,
          completedDate: new Date(),
          updatedBy: req.user?.id,
        },
        { returnDocument: 'after' }
      );
      if (!wo) return res.status(404).json({ success: false, message: 'أمر العمل غير موجود' });
      // Reactivate asset
      await Asset.findByIdAndUpdate(wo.assetId, {
        status: 'active',
        lastMaintenanceDate: new Date(),
      });
      res.json({ success: true, data: wo, message: 'تم إتمام أمر العمل' });
    } catch (err) {
      safeError(res, err, 'work-order complete error');
    }
  }
);

router.delete('/work-orders/:id', authorize(['admin']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const wo = await MaintenanceWorkOrder.findOneAndDelete(scopedById(req, req.params.id));
    if (!wo) return res.status(404).json({ success: false, message: 'أمر العمل غير موجود' });
    res.json({ success: true, message: 'تم الحذف' });
  } catch (err) {
    safeError(res, err, 'work-order delete error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ASSET TRANSFERS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/transfers', async (req, res) => {
  try {
    const { assetId, status, fromBranchId, toBranchId, page = 1, limit: rawLimit = 20 } = req.query;
    const filter = mergeTenantFilter(req, {});
    if (assetId) filter.assetId = assetId;
    if (status) filter.status = status;
    if (fromBranchId) filter.fromBranchId = fromBranchId;
    if (toBranchId) filter.toBranchId = toBranchId;
    const limit = clamp(rawLimit);
    const skip = (Math.max(1, +page) - 1) * limit;
    const [data, total] = await Promise.all([
      AssetTransfer.find(filter)
        .populate('assetId', 'name category')
        .populate('requestedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AssetTransfer.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit, total } });
  } catch (err) {
    safeError(res, err, 'transfers list error');
  }
});

router.post('/transfers', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { assetId, fromBranchId, toBranchId, transferDate, reason } = req.body;
    if (!assetId || !fromBranchId || !toBranchId || !transferDate || !reason) {
      return res.status(400).json({ success: false, message: 'البيانات الأساسية مطلوبة' });
    }
    const transferNumber = genCode('TR');
    const trPayload = {
      ...stripUpdateMeta(req.body),
      transferNumber,
      status: 'pending',
      requestedBy: req.user?.id,
      createdBy: req.user?.id,
    };
    if (req.branchScope?.branchId) trPayload.branchId = req.branchScope.branchId;
    const transfer = await AssetTransfer.create(trPayload);
    res.status(201).json({ success: true, data: transfer, message: 'تم إنشاء طلب النقل' });
  } catch (err) {
    safeError(res, err, 'transfers create error');
  }
});

router.patch('/transfers/:id/approve', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const transfer = await AssetTransfer.findOneAndUpdate(
      { ...scopedById(req, req.params.id), status: 'pending' },
      { status: 'approved', approvedBy: req.user?.id },
      { returnDocument: 'after' }
    ).lean();
    if (!transfer)
      return res
        .status(404)
        .json({ success: false, message: 'طلب النقل غير موجود أو ليس قيد الانتظار' });
    res.json({ success: true, data: transfer, message: 'تمت الموافقة على النقل' });
  } catch (err) {
    safeError(res, err, 'transfers approve error');
  }
});

router.patch('/transfers/:id/receive', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const transfer = await AssetTransfer.findOne(scopedById(req, req.params.id));
    if (!transfer) return res.status(404).json({ success: false, message: 'طلب النقل غير موجود' });
    // only an approved transfer can be received (was unconditional → a pending
    // transfer could be received without approval, or an already-received one
    // re-received).
    if (transfer.status !== 'approved') {
      return res
        .status(409)
        .json({ success: false, message: 'لا يمكن استلام النقل (يجب أن يكون معتمداً)' });
    }
    transfer.status = 'received';
    transfer.receivedDate = new Date();
    transfer.receivedBy = req.user?.id;
    if (req.body.conditionAfter) transfer.conditionAfter = req.body.conditionAfter;
    await transfer.save();
    // Move the asset to the destination branch + location — the whole point of a
    // transfer (receive previously updated only location, so a completed
    // inter-branch transfer left the asset owned by the source branch).
    await Asset.findByIdAndUpdate(transfer.assetId, {
      location: transfer.toLocation || 'Transferred',
      ...(transfer.toBranchId && { branchId: transfer.toBranchId }),
    });
    res.json({ success: true, data: transfer, message: 'تم استلام الأصل' });
  } catch (err) {
    safeError(res, err, 'transfers receive error');
  }
});

router.patch('/transfers/:id/reject', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const transfer = await AssetTransfer.findOneAndUpdate(
      { ...scopedById(req, req.params.id), status: 'pending' },
      { status: 'rejected', updatedBy: req.user?.id },
      { returnDocument: 'after' }
    ).lean();
    if (!transfer)
      return res
        .status(404)
        .json({ success: false, message: 'طلب النقل غير موجود أو ليس قيد الانتظار' });
    res.json({ success: true, data: transfer, message: 'تم رفض طلب النقل' });
  } catch (err) {
    safeError(res, err, 'transfers reject error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// RESOURCE BOOKINGS
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/bookings', async (req, res) => {
  try {
    const { assetId, status, date, page = 1, limit: rawLimit = 20 } = req.query;
    const filter = mergeTenantFilter(req, {});
    if (assetId) filter.assetId = assetId;
    if (status) filter.status = status;
    if (date) filter.bookingDate = new Date(date);
    const limit = clamp(rawLimit);
    const skip = (Math.max(1, +page) - 1) * limit;
    const [data, total] = await Promise.all([
      ResourceBooking.find(filter)
        .populate('assetId', 'name location')
        .populate('bookedBy', 'name email')
        .sort({ bookingDate: 1, startTime: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ResourceBooking.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit, total } });
  } catch (err) {
    safeError(res, err, 'bookings list error');
  }
});

router.post('/bookings', async (req, res) => {
  try {
    const { assetId, bookingDate, startTime, endTime, purpose } = req.body;
    if (!assetId || !bookingDate || !startTime || !endTime || !purpose) {
      return res.status(400).json({ success: false, message: 'بيانات الحجز ناقصة' });
    }
    // Conflict check
    const conflict = await ResourceBooking.findOne({
      assetId,
      bookingDate: new Date(bookingDate),
      status: { $in: ['confirmed'] },
      $or: [{ startTime: { $lt: endTime }, endTime: { $gt: startTime } }],
    });
    if (conflict) {
      return res.status(409).json({ success: false, message: 'المورد محجوز في هذا الوقت' });
    }
    const bookingNumber = genCode('BK');
    const bkPayload = {
      ...stripUpdateMeta(req.body),
      bookingNumber,
      bookedBy: req.user?.id,
      createdBy: req.user?.id,
    };
    if (req.branchScope?.branchId) bkPayload.branchId = req.branchScope.branchId;
    const booking = await ResourceBooking.create(bkPayload);
    res.status(201).json({ success: true, data: booking, message: 'تم إنشاء الحجز' });
  } catch (err) {
    safeError(res, err, 'bookings create error');
  }
});

router.patch('/bookings/:id/cancel', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const booking = await ResourceBooking.findOneAndUpdate(
      scopedById(req, req.params.id),
      { status: 'cancelled', updatedBy: req.user?.id },
      { returnDocument: 'after' }
    ).lean();
    if (!booking) return res.status(404).json({ success: false, message: 'الحجز غير موجود' });
    res.json({ success: true, data: booking, message: 'تم إلغاء الحجز' });
  } catch (err) {
    safeError(res, err, 'bookings cancel error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ASSET INVENTORIES
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/inventories', async (req, res) => {
  try {
    const { status, page = 1, limit: rawLimit = 20 } = req.query;
    const filter = mergeTenantFilter(req, {});
    if (status) filter.status = status;
    const limit = clamp(rawLimit);
    const skip = (Math.max(1, +page) - 1) * limit;
    const [data, total] = await Promise.all([
      AssetInventory.find(filter)
        .populate('conductedBy', 'name')
        .sort({ inventoryDate: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AssetInventory.countDocuments(filter),
    ]);
    res.json({ success: true, data, pagination: { page: +page, limit, total } });
  } catch (err) {
    safeError(res, err, 'inventories list error');
  }
});

router.post('/inventories', authorize(['admin', 'manager']), async (req, res) => {
  try {
    const { title, inventoryDate } = req.body;
    if (!title || !inventoryDate)
      return res.status(400).json({ success: false, message: 'العنوان والتاريخ مطلوبان' });
    const inventoryNumber = genCode('INV');
    const invPayload = {
      ...stripUpdateMeta(req.body),
      inventoryNumber,
      conductedBy: req.body.conductedBy || req.user?.id,
      createdBy: req.user?.id,
    };
    if (req.branchScope?.branchId) invPayload.branchId = req.branchScope.branchId;
    const inventory = await AssetInventory.create(invPayload);
    res.status(201).json({ success: true, data: inventory, message: 'تم إنشاء سجل الجرد' });
  } catch (err) {
    safeError(res, err, 'inventories create error');
  }
});

router.get('/inventories/:id', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const inventory = await AssetInventory.findOne(scopedById(req, req.params.id))
      .populate('conductedBy', 'name email')
      .lean();
    if (!inventory) return res.status(404).json({ success: false, message: 'الجرد غير موجود' });
    const items = await AssetInventoryItem.find({ inventoryId: req.params.id })
      .populate('assetId', 'name category location')
      .lean();
    res.json({ success: true, data: { ...inventory, items } });
  } catch (err) {
    safeError(res, err, 'inventory get error');
  }
});

// Add inventory item (scan asset)
router.post('/inventories/:id/items', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const parent = await AssetInventory.findOne(scopedById(req, req.params.id))
      .select('_id branchId')
      .lean();
    if (!parent) return res.status(404).json({ success: false, message: 'الجرد غير موجود' });
    const { assetId, status, condition, actualLocation, marketValue, notes } = req.body;
    if (!assetId || !status)
      return res.status(400).json({ success: false, message: 'الأصل والحالة مطلوبان' });
    const scopedBranchId = parent.branchId || req.branchScope?.branchId;
    const item = await AssetInventoryItem.create({
      inventoryId: req.params.id,
      assetId,
      status,
      condition,
      actualLocation,
      marketValue,
      notes,
      scannedBy: req.user?.name || req.user?.email,
      scannedAt: new Date(),
      ...(scopedBranchId ? { branchId: scopedBranchId } : {}),
      createdBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: item, message: 'تم تسجيل بند الجرد' });
  } catch (err) {
    safeError(res, err, 'inventory item create error');
  }
});

// Complete inventory
router.patch('/inventories/:id/complete', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const items = await AssetInventoryItem.find({ inventoryId: req.params.id });
    const found = items.filter(i => i.status === 'found').length;
    const missing = items.filter(i => i.status === 'missing').length;
    const damaged = items.filter(i => i.status === 'damaged').length;
    const inventory = await AssetInventory.findOneAndUpdate(
      scopedById(req, req.params.id),
      {
        status: 'completed',
        totalAssetsCounted: items.length,
        assetsFound: found,
        assetsMissing: missing,
        assetsDamaged: damaged,
        completedAt: new Date(),
        updatedBy: req.user?.id,
      },
      { returnDocument: 'after' }
    ).lean();
    if (!inventory) return res.status(404).json({ success: false, message: 'الجرد غير موجود' });
    res.json({ success: true, data: inventory, message: 'تم إتمام الجرد' });
  } catch (err) {
    safeError(res, err, 'inventory complete error');
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

router.get('/dashboard', async (req, res) => {
  try {
    const now = new Date();
    const _soon30 = new Date(now.getTime() + 30 * 864e5);
    const soon60 = new Date(now.getTime() + 60 * 864e5);
    const tenant = branchFilter(req);
    const [
      totalAssets,
      activeAssets,
      underMaintenance,
      pendingWorkOrders,
      overdueWorkOrders,
      pendingTransfers,
      upcomingMaintenance,
      warrantyExpiringSoon,
      activeBookingsToday,
    ] = await Promise.all([
      Asset.countDocuments(tenant),
      Asset.countDocuments({ ...tenant, status: 'active' }),
      Asset.countDocuments({ ...tenant, status: 'maintenance' }),
      MaintenanceWorkOrder.countDocuments({ ...tenant, status: 'pending' }),
      MaintenanceWorkOrder.countDocuments({
        ...tenant,
        scheduledDate: { $lt: now },
        status: { $in: ['pending', 'approved'] },
      }),
      AssetTransfer.countDocuments({ ...tenant, status: 'pending' }),
      Asset.countDocuments({ ...tenant, lastMaintenanceDate: { $lte: now }, status: 'active' }),
      // NOTE: warrantyExpiryDate is not a declared Asset field → this count is
      // always 0 (kept branch-scoped + key preserved for FE compat; add a warranty
      // field to the Asset schema to make the metric real).
      Asset.countDocuments({ ...tenant, warrantyExpiryDate: { $gte: now, $lte: soon60 } }),
      ResourceBooking.countDocuments({
        ...tenant,
        bookingDate: {
          $gte: new Date(now.toDateString()),
          $lt: new Date(new Date(now.toDateString()).getTime() + 864e5),
        },
        status: 'confirmed',
      }),
    ]);
    res.json({
      success: true,
      data: {
        totalAssets,
        activeAssets,
        underMaintenance,
        pendingWorkOrders,
        overdueWorkOrders,
        pendingTransfers,
        upcomingMaintenance,
        warrantyExpiringSoon,
        activeBookingsToday,
      },
    });
  } catch (err) {
    safeError(res, err, 'dashboard error');
  }
});

module.exports = router;
