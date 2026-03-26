/**
 * Warehouse Management Routes — مسارات إدارة المستودعات
 *
 * Endpoints: warehouses CRUD, stock items, transactions,
 * transfers, stock counts, dashboard stats.
 */

const express = require('express');
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
const { escapeRegex } = require('../utils/sanitize');
router.use(authenticate);

// ═══════════════════════════════════════════════════════════════════
// 1. DASHBOARD — لوحة المعلومات
// ═══════════════════════════════════════════════════════════════════
router.get('/dashboard', async (_req, res) => {
  try {
    const WH = safeModel('Warehouse');
    const WHItem = safeModel('WarehouseItem');
    const WHTx = safeModel('WarehouseTransaction');

    const [totalWarehouses, totalItems, lowStock, transactions] = await Promise.all([
      WH ? WH.countDocuments({ status: 'active' }) : 0,
      WHItem ? WHItem.countDocuments() : 0,
      WHItem ? WHItem.countDocuments({ status: 'low' }) : 0,
      WHTx ? WHTx.countDocuments({ createdAt: { $gte: new Date(Date.now() - 30 * 86400000) } }) : 0,
    ]);

    const totalValue = WHItem
      ? (await WHItem.aggregate([{ $group: { _id: null, v: { $sum: '$totalValue' } } }]))[0]?.v || 0
      : 0;

    const categoryBreakdown = WHItem
      ? await WHItem.aggregate([
          { $group: { _id: '$category', count: { $sum: 1 }, value: { $sum: '$totalValue' } } },
          { $sort: { count: -1 } },
        ])
      : [];

    const recentTx = WHTx ? await WHTx.find().sort({ createdAt: -1 }).limit(10).lean() : [];

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
      .json({ success: false, message: 'خطأ في تحميل لوحة المستودعات', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 2. WAREHOUSES CRUD — إدارة المستودعات
// ═══════════════════════════════════════════════════════════════════
router.get('/', async (req, res) => {
  try {
    const WH = safeModel('Warehouse');
    if (!WH) return res.json({ success: true, data: [] });
    const { status, type, branch, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (branch) filter.branch = branch;
    const total = await WH.countDocuments(filter);
    const data = await WH.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب المستودعات', error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const WH = safeModel('Warehouse');
    if (!WH) return res.status(404).json({ success: false, message: 'المستودع غير موجود' });
    const data = await WH.findById(req.params.id).lean();
    if (!data) return res.status(404).json({ success: false, message: 'المستودع غير موجود' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ', error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const WH = safeModel('Warehouse');
    if (!WH) return res.status(500).json({ success: false, message: 'النموذج غير متوفر' });
    const data = await WH.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في إنشاء المستودع', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const WH = safeModel('Warehouse');
    const data = await WH.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!data) return res.status(404).json({ success: false, message: 'المستودع غير موجود' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث المستودع', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const WH = safeModel('Warehouse');
    const data = await WH.findByIdAndUpdate(req.params.id, { status: 'closed' }, { new: true });
    if (!data) return res.status(404).json({ success: false, message: 'المستودع غير موجود' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في حذف المستودع', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 3. STOCK ITEMS — أصناف المخزون
// ═══════════════════════════════════════════════════════════════════
router.get('/:warehouseId/items', async (req, res) => {
  try {
    const WHItem = safeModel('WarehouseItem');
    if (!WHItem) return res.json({ success: true, data: [] });
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
    res.status(500).json({ success: false, message: 'خطأ في جلب الأصناف', error: err.message });
  }
});

router.post('/:warehouseId/items', async (req, res) => {
  try {
    const WHItem = safeModel('WarehouseItem');
    const data = await WHItem.create({ ...req.body, warehouse: req.params.warehouseId });
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في إضافة الصنف', error: err.message });
  }
});

router.put('/items/:id', async (req, res) => {
  try {
    const WHItem = safeModel('WarehouseItem');
    const data = await WHItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!data) return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في تحديث الصنف', error: err.message });
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
    if (warehouse) filter.warehouse = warehouse;
    const total = await WHTx.countDocuments(filter);
    const data = await WHTx.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .lean();
    res.json({ success: true, data, pagination: { page: +page, limit: +limit, total } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب الحركات', error: err.message });
  }
});

router.post('/transactions', async (req, res) => {
  try {
    const WHTx = safeModel('WarehouseTransaction');
    const num = `WH-TX-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const data = await WHTx.create({
      ...req.body,
      transactionNumber: num,
      requestedBy: req.user?._id,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في إنشاء الحركة', error: err.message });
  }
});

router.put('/transactions/:id/approve', async (req, res) => {
  try {
    const WHTx = safeModel('WarehouseTransaction');
    const tx = await WHTx.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, message: 'الحركة غير موجودة' });
    tx.status = 'approved';
    tx.approvedBy = req.user?._id;
    await tx.save();
    res.json({ success: true, data: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في اعتماد الحركة', error: err.message });
  }
});

router.put('/transactions/:id/complete', async (req, res) => {
  try {
    const WHTx = safeModel('WarehouseTransaction');
    const tx = await WHTx.findById(req.params.id);
    if (!tx) return res.status(404).json({ success: false, message: 'الحركة غير موجودة' });
    tx.status = 'completed';
    tx.completedAt = new Date();
    await tx.save();
    res.json({ success: true, data: tx });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في إكمال الحركة', error: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 5. LOW STOCK ALERTS — تنبيهات نقص المخزون
// ═══════════════════════════════════════════════════════════════════
router.get('/alerts/low-stock', async (_req, res) => {
  try {
    const WHItem = safeModel('WarehouseItem');
    if (!WHItem) return res.json({ success: true, data: [] });
    const data = await WHItem.find({
      $expr: { $lte: ['$quantity', '$minQuantity'] },
    })
      .populate('warehouse', 'nameAr code')
      .sort({ quantity: 1 })
      .limit(50)
      .lean();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: 'خطأ في جلب التنبيهات', error: err.message });
  }
});

module.exports = router;
