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
const logger = require('../utils/logger');
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
    const { nameAr, nameEn, code, depreciationMethod, usefulLifeYears, parentId } = req.body;
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
      { new: true, runValidators: true }
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
    const [total, byStatus, byCategory, warrantyExpiringSoon, maintenanceDue] = await Promise.all([
      Asset.countDocuments(),
      Asset.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Asset.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]),
      Asset.countDocuments({
        warrantyExpiryDate: { $gte: new Date(), $lte: new Date(Date.now() + 60 * 864e5) },
      }),
      Asset.countDocuments({
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
    const { search, status, category, branchId, page = 1, limit: rawLimit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (branchId) filter.location = { $regex: escapeRegex(branchId), $options: 'i' };
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
    const asset = await Asset.create({ ...stripUpdateMeta(req.body), createdBy: req.user?.id });
    res.status(201).json({ success: true, data: asset, message: 'تم إضافة الأصل' });
  } catch (err) {
    safeError(res, err, 'assets create error');
  }
});

router.get('/assets/:id', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const asset = await Asset.findById(req.params.id).lean();
    if (!asset) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    res.json({ success: true, data: asset });
  } catch (err) {
    safeError(res, err, 'asset get error');
  }
});

router.put('/assets/:id', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const asset = await Asset.findByIdAndUpdate(
      req.params.id,
      { ...stripUpdateMeta(req.body), updatedAt: new Date() },
      { new: true, runValidators: true }
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
    const asset = await Asset.findById(req.params.id);
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
    const filter = {};
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
      depreciationDate,
      depreciationAmount,
      accumulatedDepreciation,
      netBookValue,
    } = req.body;
    if (!assetId || !periodYear || !periodMonth || !depreciationAmount) {
      return res.status(400).json({ success: false, message: 'البيانات الأساسية مطلوبة' });
    }
    const schedule = await AssetDepreciationSchedule.create({
      ...stripUpdateMeta(req.body),
      createdBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: schedule, message: 'تم إنشاء جدول الإهلاك' });
  } catch (err) {
    safeError(res, err, 'depreciation create error');
  }
});

// Post depreciation (mark as posted)
router.patch('/depreciation/:id/post', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const schedule = await AssetDepreciationSchedule.findByIdAndUpdate(
      req.params.id,
      { status: 'posted', postedBy: req.user?.id, postedAt: new Date() },
      { new: true }
    ).lean();
    if (!schedule) return res.status(404).json({ success: false, message: 'السجل غير موجود' });
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
    const filter = {};
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
    const workOrderNumber = genCode('WO');
    const workOrder = await MaintenanceWorkOrder.create({
      ...stripUpdateMeta(req.body),
      workOrderNumber,
      status: 'pending',
      createdBy: req.user?.id,
    });
    // Update asset status to under_maintenance for corrective/emergency
    if (['corrective', 'emergency'].includes(type)) {
      await Asset.findByIdAndUpdate(assetId, { status: 'maintenance' });
    }
    res.status(201).json({ success: true, data: workOrder, message: 'تم إنشاء أمر العمل' });
  } catch (err) {
    safeError(res, err, 'work-orders create error');
  }
});

router.get('/work-orders/:id', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const wo = await MaintenanceWorkOrder.findById(req.params.id)
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
    const wo = await MaintenanceWorkOrder.findByIdAndUpdate(
      req.params.id,
      { ...stripUpdateMeta(req.body), updatedBy: req.user?.id },
      { new: true, runValidators: true }
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
      const { findings, resolution, actualCost, partsUsed, assetCondition } = req.body;
      if (!findings || !resolution) {
        return res.status(400).json({ success: false, message: 'النتائج والإجراء مطلوبان' });
      }
      const wo = await MaintenanceWorkOrder.findByIdAndUpdate(
        req.params.id,
        {
          status: 'completed',
          findings,
          resolution,
          actualCost,
          partsUsed,
          completedDate: new Date(),
          updatedBy: req.user?.id,
        },
        { new: true }
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
    const wo = await MaintenanceWorkOrder.findByIdAndDelete(req.params.id);
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
    const filter = {};
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
    const transfer = await AssetTransfer.create({
      ...stripUpdateMeta(req.body),
      transferNumber,
      status: 'pending',
      requestedBy: req.user?.id,
      createdBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: transfer, message: 'تم إنشاء طلب النقل' });
  } catch (err) {
    safeError(res, err, 'transfers create error');
  }
});

router.patch('/transfers/:id/approve', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const transfer = await AssetTransfer.findByIdAndUpdate(
      req.params.id,
      { status: 'approved', approvedBy: req.user?.id },
      { new: true }
    ).lean();
    if (!transfer) return res.status(404).json({ success: false, message: 'طلب النقل غير موجود' });
    res.json({ success: true, data: transfer, message: 'تمت الموافقة على النقل' });
  } catch (err) {
    safeError(res, err, 'transfers approve error');
  }
});

router.patch('/transfers/:id/receive', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const transfer = await AssetTransfer.findById(req.params.id);
    if (!transfer) return res.status(404).json({ success: false, message: 'طلب النقل غير موجود' });
    transfer.status = 'received';
    transfer.receivedDate = new Date();
    transfer.receivedBy = req.user?.id;
    if (req.body.conditionAfter) transfer.conditionAfter = req.body.conditionAfter;
    await transfer.save();
    // Update asset's current location
    await Asset.findByIdAndUpdate(transfer.assetId, {
      location: transfer.toLocation || 'Transferred',
    });
    res.json({ success: true, data: transfer, message: 'تم استلام الأصل' });
  } catch (err) {
    safeError(res, err, 'transfers receive error');
  }
});

router.patch('/transfers/:id/reject', authorize(['admin', 'manager']), async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const transfer = await AssetTransfer.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected', updatedBy: req.user?.id },
      { new: true }
    ).lean();
    if (!transfer) return res.status(404).json({ success: false, message: 'طلب النقل غير موجود' });
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
    const filter = {};
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
    const booking = await ResourceBooking.create({
      ...stripUpdateMeta(req.body),
      bookingNumber,
      bookedBy: req.user?.id,
      createdBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: booking, message: 'تم إنشاء الحجز' });
  } catch (err) {
    safeError(res, err, 'bookings create error');
  }
});

router.patch('/bookings/:id/cancel', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const booking = await ResourceBooking.findByIdAndUpdate(
      req.params.id,
      { status: 'cancelled', updatedBy: req.user?.id },
      { new: true }
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
    const filter = {};
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
    const inventory = await AssetInventory.create({
      ...stripUpdateMeta(req.body),
      inventoryNumber,
      conductedBy: req.body.conductedBy || req.user?.id,
      createdBy: req.user?.id,
    });
    res.status(201).json({ success: true, data: inventory, message: 'تم إنشاء سجل الجرد' });
  } catch (err) {
    safeError(res, err, 'inventories create error');
  }
});

router.get('/inventories/:id', async (req, res) => {
  if (!validId(req, res)) return;
  try {
    const inventory = await AssetInventory.findById(req.params.id)
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
    const { assetId, status, condition, actualLocation, marketValue, notes } = req.body;
    if (!assetId || !status)
      return res.status(400).json({ success: false, message: 'الأصل والحالة مطلوبان' });
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
      branchId: req.body.branchId,
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
    const inventory = await AssetInventory.findByIdAndUpdate(
      req.params.id,
      {
        status: 'completed',
        totalAssetsCounted: items.length,
        assetsFound: found,
        assetsMissing: missing,
        assetsDamaged: damaged,
        completedAt: new Date(),
        updatedBy: req.user?.id,
      },
      { new: true }
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
    const soon30 = new Date(now.getTime() + 30 * 864e5);
    const soon60 = new Date(now.getTime() + 60 * 864e5);
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
      Asset.countDocuments(),
      Asset.countDocuments({ status: 'active' }),
      Asset.countDocuments({ status: 'maintenance' }),
      MaintenanceWorkOrder.countDocuments({ status: 'pending' }),
      MaintenanceWorkOrder.countDocuments({
        scheduledDate: { $lt: now },
        status: { $in: ['pending', 'approved'] },
      }),
      AssetTransfer.countDocuments({ status: 'pending' }),
      Asset.countDocuments({ lastMaintenanceDate: { $lte: now }, status: 'active' }),
      Asset.countDocuments({ warrantyExpiryDate: { $gte: now, $lte: soon60 } }),
      ResourceBooking.countDocuments({
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
