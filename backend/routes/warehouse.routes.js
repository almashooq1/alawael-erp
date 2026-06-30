/**
 * Warehouse Management Routes — مسارات إدارة المستودعات
 *
 * Endpoints: warehouses CRUD, stock items, transactions,
 * transfers, stock counts, dashboard stats.
 */

const express = require('express');
const { stripUpdateMeta, escapeRegex } = require('../utils/sanitize');
// Register the stock-movement model so safeModel('WarehouseTransaction') resolves it.
// (It was never built when the domain was scaffolded → POST /transactions 500-ed.)
require('../models/WarehouseTransaction');
const router = express.Router();

// ── Helpers ──────────────────────────────────────────────────────
function safeModel(name) {
  try {
    return require('mongoose').model(name);
  } catch {
    try {
      return require(`../models/${name}`);
    } catch {
      return null;
    }
  }
}

// ── Auth ─────────────────────────────────────────────────────────
const { authenticate } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
router.use(authenticate);
router.use(requireBranchAccess);

function mergeListFilter(req, base = {}) {
  return { ...base, ...branchFilter(req) };
}

function scopedById(req, id) {
  return { _id: id, ...branchFilter(req) };
}

async function assertWarehouseInScope(req, warehouseId) {
  const WH = safeModel('Warehouse');
  if (!WH) return null;
  return WH.findOne({ _id: warehouseId, ...branchFilter(req) }).lean();
}

async function warehouseIdsInScope(req) {
  const scope = branchFilter(req);
  if (!scope.branchId) return null;
  const WH = safeModel('Warehouse');
  if (!WH) return [];
  return (await WH.find(scope).select('_id').lean()).map(w => w._id);
}

async function assertTransactionInScope(req, txId) {
  const WHTx = safeModel('WarehouseTransaction');
  if (!WHTx) return null;
  const tx = await WHTx.findById(txId);
  if (!tx?.warehouse) return null;
  const wh = await assertWarehouseInScope(req, tx.warehouse);
  return wh ? tx : null;
}
// ═══════════════════════════════════════════════════════════════════
// 1. DASHBOARD — لوحة المعلومات
// ═══════════════════════════════════════════════════════════════════
router.get('/dashboard', async (req, res) => {
  try {
    const WH = safeModel('Warehouse');
    const WHItem = safeModel('WarehouseItem');
    const WHTx = safeModel('WarehouseTransaction');
    const scope = branchFilter(req);
    let whIds = null;
    if (WH && scope.branchId) {
      whIds = (await WH.find(scope).select('_id').lean()).map(w => w._id);
    }
    const itemFilter = whIds ? { warehouse: { $in: whIds } } : {};
    const txFilter = whIds ? { warehouse: { $in: whIds } } : {};

    const [totalWarehouses, totalItems, lowStock, transactions] = await Promise.all([
      WH ? WH.countDocuments(mergeListFilter(req, { isActive: true })) : 0,
      WHItem ? WHItem.countDocuments(itemFilter) : 0,
      WHItem ? WHItem.countDocuments({ ...itemFilter, status: 'low_stock' }) : 0, // W1486: was 'low' (not in WHItem enum → always 0)
      WHTx
        ? WHTx.countDocuments({
            ...txFilter,
            createdAt: { $gte: new Date(Date.now() - 30 * 86400000) },
          })
        : 0,
    ]);

    const totalValue = WHItem
      ? (
          await WHItem.aggregate([
            ...(Object.keys(itemFilter).length ? [{ $match: itemFilter }] : []),
            { $group: { _id: null, v: { $sum: '$totalValue' } } },
          ])
        )[0]?.v || 0
      : 0;

    const categoryBreakdown = WHItem
      ? await WHItem.aggregate([
          ...(Object.keys(itemFilter).length ? [{ $match: itemFilter }] : []),
          { $group: { _id: '$category', count: { $sum: 1 }, value: { $sum: '$totalValue' } } },
          { $sort: { count: -1 } },
        ])
      : [];

    const recentTx = WHTx ? await WHTx.find(txFilter).sort({ createdAt: -1 }).limit(10).lean() : [];

    res.json({
      success: true,
      data: {
        summary: { totalWarehouses, totalItems, lowStock, totalValue, transactions },
        categoryBreakdown,
        recentTransactions: recentTx,
      },
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تحميل لوحة المستودعات', error: safeError(err) });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2. WAREHOUSES CRUD — إدارة المستودعات
// ═══════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const WH = safeModel('Warehouse');
    if (!WH) return res.json({ success: true, data: [] });
    const { status, type, page = 1, limit = 20 } = req.query;
    const filter = mergeListFilter(req, {});
    if (status) filter.status = status;
    if (type) filter.type = type;
    const total = await WH.countDocuments(filter);
    const data = await WH.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب المستودعات', error: safeError(err) });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const WH = safeModel('Warehouse');
    if (!WH) return res.status(404).json({ success: false, message: 'المستودع غير موجود' });
    const data = await WH.findOne(scopedById(req, req.params.id)).lean();
    if (!data) return res.status(404).json({ success: false, message: 'المستودع غير موجود' });
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'warehouse');
  }
});

router.post('/', async (req, res) => {
  try {
    const WH = safeModel('Warehouse');
    const payload = stripUpdateMeta(req.body);
    if (req.branchScope?.branchId) payload.branchId = req.branchScope.branchId;
    const data = await WH.create(payload);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في إنشاء المستودع', error: safeError(err) });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const WH = safeModel('Warehouse');
    const data = await WH.findOneAndUpdate(
      scopedById(req, req.params.id),
      stripUpdateMeta(req.body),
      {
        returnDocument: 'after',
        runValidators: true,
      }
    );
    if (!data) return res.status(404).json({ success: false, message: 'المستودع غير موجود' });
    res.json({ success: true, data });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في تحديث المستودع', error: safeError(err) });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const WH = safeModel('Warehouse');
    const data = await WH.findOneAndUpdate(
      scopedById(req, req.params.id),
      { status: 'closed' },
      { returnDocument: 'after' }
    );
    if (!data) return res.status(404).json({ success: false, message: 'المستودع غير موجود' });
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'warehouse');
  }
});

// ═══════════════════════════════════════════════════════════════════
// 3. STOCK ITEMS — أصناف المخزون
// ═══════════════════════════════════════════════════════════════════
router.get('/:warehouseId/items', async (req, res) => {
  try {
    const WHItem = safeModel('WarehouseItem');
    if (!WHItem) return res.json({ success: true, data: [] });
    const wh = await assertWarehouseInScope(req, req.params.warehouseId);
    if (!wh) return res.status(404).json({ success: false, message: 'المستودع غير موجود' });
    const { category, status, search, page = 1, limit = 30 } = req.query;
    const filter = { warehouse: req.params.warehouseId };
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) filter.nameAr = { $regex: escapeRegex(search), $options: 'i' };
    const total = await WHItem.countDocuments(filter);
    const data = await WHItem.find(filter)
      .sort({ nameAr: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    safeError(res, err, 'warehouse');
  }
});

router.post('/:warehouseId/items', async (req, res) => {
  try {
    const WHItem = safeModel('WarehouseItem');
    const wh = await assertWarehouseInScope(req, req.params.warehouseId);
    if (!wh) return res.status(404).json({ success: false, message: 'المستودع غير موجود' });
    const data = await WHItem.create({ ...req.body, warehouse: req.params.warehouseId });
    res.status(201).json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'warehouse');
  }
});

// Non-scoped item detail + create (so the dashboard's row / receive screens
// can resolve without a warehouseId in the URL; warehouse comes from the body).
router.get('/items/:id', async (req, res) => {
  try {
    const WHItem = safeModel('WarehouseItem');
    if (!WHItem) return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
    const item = await WHItem.findById(req.params.id).lean();
    if (!item?.warehouse)
      return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
    const wh = await assertWarehouseInScope(req, item.warehouse);
    if (!wh) return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
    res.json({ success: true, data: item });
  } catch (err) {
    safeError(res, err, 'warehouse');
  }
});

router.post('/items', async (req, res) => {
  try {
    const WHItem = safeModel('WarehouseItem');
    if (!WHItem) return res.status(503).json({ success: false, message: 'الخدمة غير متاحة' });
    const warehouseId = req.body.warehouse;
    const wh = await assertWarehouseInScope(req, warehouseId);
    if (!wh) return res.status(404).json({ success: false, message: 'المستودع غير موجود' });
    const data = await WHItem.create({ ...req.body, warehouse: warehouseId });
    res.status(201).json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'warehouse');
  }
});

router.put('/items/:id', async (req, res) => {
  try {
    const WHItem = safeModel('WarehouseItem');
    const existing = await WHItem.findById(req.params.id).lean();
    if (!existing?.warehouse) {
      return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
    }
    const wh = await assertWarehouseInScope(req, existing.warehouse);
    if (!wh) return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
    const data = await WHItem.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
      returnDocument: 'after',
    });
    if (!data) return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'warehouse');
  }
});

// ═══════════════════════════════════════════════════════════════════
// 4. TRANSACTIONS — حركات المستودع
// ═══════════════════════════════════════════════════════════════════
router.get('/transactions/list', async (req, res) => {
  try {
    const WHTx = safeModel('WarehouseTransaction');
    if (!WHTx) return res.json({ success: true, data: [] });
    const { type, status, warehouse, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (warehouse) {
      const wh = await assertWarehouseInScope(req, warehouse);
      if (!wh)
        return res.json({
          success: true,
          data: [],
          pagination: { page: +page, limit: +limit, total: 0 },
        });
      filter.warehouse = warehouse;
    } else {
      const whIds = await warehouseIdsInScope(req);
      if (whIds) filter.warehouse = { $in: whIds };
    }
    const total = await WHTx.countDocuments(filter);
    const data = await WHTx.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    safeError(res, err, 'warehouse');
  }
});

router.post('/transactions', async (req, res) => {
  try {
    const WHTx = safeModel('WarehouseTransaction');
    if (req.body?.warehouse) {
      const wh = await assertWarehouseInScope(req, req.body.warehouse);
      if (!wh) return res.status(404).json({ success: false, message: 'المستودع غير موجود' });
    }
    const num = `WH-TX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const data = await WHTx.create({
      ...req.body,
      transactionNumber: num,
      requestedBy: req.user?._id,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    safeError(res, err, 'warehouse');
  }
});

router.put('/transactions/:id/approve', async (req, res) => {
  try {
    const tx = await assertTransactionInScope(req, req.params.id);
    if (!tx) return res.status(404).json({ success: false, message: 'الحركة غير موجودة' });
    tx.status = 'approved';
    tx.approvedBy = req.user?._id;
    await tx.save();
    res.json({ success: true, data: tx });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في اعتماد الحركة', error: safeError(err) });
  }
});

router.put('/transactions/:id/complete', async (req, res) => {
  try {
    const tx = await assertTransactionInScope(req, req.params.id);
    if (!tx) return res.status(404).json({ success: false, message: 'الحركة غير موجودة' });
    tx.status = 'completed';
    tx.completedAt = new Date();
    await tx.save();
    res.json({ success: true, data: tx });
  } catch (err) {
    safeError(res, err, 'warehouse');
  }
});

// ═══════════════════════════════════════════════════════════════════
// 5. LOW STOCK ALERTS — تنبيهات نقص المخزون
// ═══════════════════════════════════════════════════════════════════
router.get('/alerts/low-stock', async (req, res) => {
  try {
    const WHItem = safeModel('WarehouseItem');
    if (!WHItem) return res.json({ success: true, data: [] });
    const whIds = await warehouseIdsInScope(req);
    const filter = { $expr: { $lte: ['$quantity', '$minQuantity'] } };
    if (whIds) filter.warehouse = { $in: whIds };
    const data = await WHItem.find(filter)
      .populate('warehouse', 'nameAr code')
      .sort({ quantity: 1 })
      .limit(50)
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: 'خطأ في جلب التنبيهات', error: safeError(err) });
  }
});

module.exports = router;
