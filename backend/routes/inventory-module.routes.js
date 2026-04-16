/**
 * Inventory Module Routes — مسارات وحدة المخزون
 * prompt_08 — Rehab-ERP v2.0
 */

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authenticate } = require('../middleware/auth');

const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const InventoryItem = require('../models/inventory/InventoryItem');
const InventoryTransaction = require('../models/inventory/InventoryTransaction');
const PurchaseOrder = require('../models/inventory/PurchaseOrder');
const safeError = require('../utils/safeError');

router.use(authenticate);
router.use(requireBranchAccess);
// ═══════════════════════════════════════════════════════
// عناصر المخزون — Inventory Items
// ═══════════════════════════════════════════════════════

// GET /api/inventory-module/items
router.get('/items', async (req, res) => {
  try {
    const { category, search, low_stock, branch_id, page = 1, limit = 20 } = req.query;
    const filter = { deleted_at: null };
    if (category) filter.category = category;
    if (branch_id) filter.branch_id = branch_id;
    if (low_stock === 'true') filter.$expr = { $lte: ['$quantity_on_hand', '$minimum_stock'] };
    if (search) filter.$text = { $search: search };

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      InventoryItem.find(filter).sort({ name_ar: 1 }).skip(skip).limit(Number(limit)).lean(),
      InventoryItem.countDocuments(filter),
    ]);
    res.json({ items, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) {
    safeError(res, e, 'inventory-module');
  }
});

// GET /api/inventory-module/items/low-stock
router.get('/items/low-stock', async (req, res) => {
  try {
    const { branch_id } = req.query;
    const filter = { deleted_at: null, $expr: { $lte: ['$quantity_on_hand', '$minimum_stock'] } };
    if (branch_id) filter.branch_id = branch_id;
    const items = await InventoryItem.find(filter).sort({ quantity_on_hand: 1 }).limit(50);
    res.json({ items, count: items.length });
  } catch (e) {
    safeError(res, e, 'inventory-module');
  }
});

// GET /api/inventory-module/items/:id
router.get('/items/:id', async (req, res) => {
  try {
    const item = await InventoryItem.findOne({ _id: req.params.id, deleted_at: null });
    if (!item) return res.status(404).json({ error: 'العنصر غير موجود' });
    res.json({ item });
  } catch (e) {
    safeError(res, e, 'inventory-module');
  }
});

// POST /api/inventory-module/items
router.post('/items', async (req, res) => {
  try {
    const item = new InventoryItem({ ...req.body, created_by: req.user._id });
    await item.save();
    res.status(201).json({ item, message: 'تم إضافة العنصر بنجاح' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/inventory-module/items/:id
router.put('/items/:id', async (req, res) => {
  try {
    const item = await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { ...req.body, updated_by: req.user._id },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ error: 'العنصر غير موجود' });
    res.json({ item, message: 'تم تحديث العنصر' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/inventory-module/items/:id
router.delete('/items/:id', async (req, res) => {
  try {
    const item = await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { deleted_at: new Date() },
      { new: true }
    );
    if (!item) return res.status(404).json({ error: 'العنصر غير موجود' });
    res.json({ message: 'تم حذف العنصر' });
  } catch (e) {
    safeError(res, e, 'inventory-module');
  }
});

// ═══════════════════════════════════════════════════════
// حركات المخزون — Inventory Transactions
// ═══════════════════════════════════════════════════════

// GET /api/inventory-module/transactions
router.get('/transactions', async (req, res) => {
  try {
    const {
      item_id,
      transaction_type,
      branch_id,
      date_from,
      date_to,
      page = 1,
      limit = 25,
    } = req.query;
    const filter = { deleted_at: null };
    if (item_id) filter.item_id = item_id;
    if (transaction_type) filter.transaction_type = transaction_type;
    if (branch_id) filter.branch_id = branch_id;
    if (date_from || date_to) {
      filter.transaction_date = {};
      if (date_from) filter.transaction_date.$gte = new Date(date_from);
      if (date_to) filter.transaction_date.$lte = new Date(date_to);
    }
    const skip = (Number(page) - 1) * Number(limit);
    const [transactions, total] = await Promise.all([
      InventoryTransaction.find(filter)
        .populate('item_id', 'name_ar item_code unit_of_measure')
        .populate('created_by', 'name')
        .sort({ transaction_date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      InventoryTransaction.countDocuments(filter),
    ]);
    res.json({ transactions, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) {
    safeError(res, e, 'inventory-module');
  }
});

// POST /api/inventory-module/transactions — إنشاء حركة (استلام / صرف / تسوية)
router.post('/transactions', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { item_id, transaction_type, quantity, unit_cost, notes, ...rest } = req.body;

    const item = await InventoryItem.findOne({ _id: item_id, deleted_at: null }).session(session);
    if (!item) throw new Error('العنصر غير موجود');

    const qty = Number(quantity);
    const before = item.quantity_on_hand;
    let after = before;

    const addTypes = ['receipt', 'return', 'adjustment_add'];
    const subTypes = ['issue', 'disposal', 'purchase_return', 'adjustment_sub'];

    if (addTypes.includes(transaction_type)) after = before + qty;
    else if (subTypes.includes(transaction_type)) {
      if (before < qty) throw new Error('الكمية المتاحة غير كافية');
      after = before - qty;
    }

    item.quantity_on_hand = after;
    item.quantity_available = Math.max(0, after - (item.quantity_reserved || 0));
    await item.save({ session });

    const txn = new InventoryTransaction({
      item_id,
      transaction_type,
      quantity: qty,
      unit_cost: unit_cost || item.unit_cost,
      quantity_before: before,
      quantity_after: after,
      notes,
      created_by: req.user._id,
      branch_id: rest.branch_id || item.branch_id,
      ...rest,
    });
    await txn.save({ session });
    await session.commitTransaction();

    res.status(201).json({ transaction: txn, item, message: 'تم تسجيل الحركة بنجاح' });
  } catch (e) {
    await session.abortTransaction();
    res.status(400).json({ error: e.message });
  } finally {
    session.endSession();
  }
});

// GET /api/inventory-module/transactions/:id
router.get('/transactions/:id', async (req, res) => {
  try {
    const txn = await InventoryTransaction.findOne({ _id: req.params.id, deleted_at: null })
      .populate('item_id', 'name_ar item_code')
      .populate('created_by', 'name');
    if (!txn) return res.status(404).json({ error: 'الحركة غير موجودة' });
    res.json({ transaction: txn });
  } catch (e) {
    safeError(res, e, 'inventory-module');
  }
});

// ═══════════════════════════════════════════════════════
// أوامر الشراء — Purchase Orders
// ═══════════════════════════════════════════════════════

// GET /api/inventory-module/purchase-orders
router.get('/purchase-orders', async (req, res) => {
  try {
    const { status, supplier_id, branch_id, page = 1, limit = 20 } = req.query;
    const filter = { deleted_at: null };
    if (status) filter.status = status;
    if (supplier_id) filter.supplier_id = supplier_id;
    if (branch_id) filter.branch_id = branch_id;
    const skip = (Number(page) - 1) * Number(limit);
    const [orders, total] = await Promise.all([
      PurchaseOrder.find(filter)
        .populate('created_by', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      PurchaseOrder.countDocuments(filter),
    ]);
    res.json({ orders, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (e) {
    safeError(res, e, 'inventory-module');
  }
});

// POST /api/inventory-module/purchase-orders
router.post('/purchase-orders', async (req, res) => {
  try {
    const po = new PurchaseOrder({ ...req.body, created_by: req.user._id, status: 'draft' });
    await po.save();
    res.status(201).json({ order: po, message: 'تم إنشاء أمر الشراء' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/inventory-module/purchase-orders/:id
router.get('/purchase-orders/:id', async (req, res) => {
  try {
    const po = await PurchaseOrder.findOne({ _id: req.params.id, deleted_at: null })
      .populate('items.item_id', 'name_ar item_code unit_of_measure')
      .populate('approved_by', 'name');
    if (!po) return res.status(404).json({ error: 'أمر الشراء غير موجود' });
    res.json({ order: po });
  } catch (e) {
    safeError(res, e, 'inventory-module');
  }
});

// PUT /api/inventory-module/purchase-orders/:id
router.put('/purchase-orders/:id', async (req, res) => {
  try {
    const po = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: { $in: ['draft', 'pending_approval'] } },
      { ...req.body, updated_by: req.user._id },
      { new: true, runValidators: true }
    );
    if (!po) return res.status(404).json({ error: 'لا يمكن تعديل هذا الأمر' });
    res.json({ order: po, message: 'تم تحديث أمر الشراء' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// POST /api/inventory-module/purchase-orders/:id/submit
router.post('/purchase-orders/:id/submit', async (req, res) => {
  try {
    const po = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: 'draft' },
      { status: 'pending_approval' },
      { new: true }
    );
    if (!po) return res.status(404).json({ error: 'لا يمكن إرسال هذا الأمر' });
    res.json({ order: po, message: 'تم إرسال أمر الشراء للاعتماد' });
  } catch (e) {
    safeError(res, e, 'inventory-module');
  }
});

// POST /api/inventory-module/purchase-orders/:id/approve
router.post('/purchase-orders/:id/approve', async (req, res) => {
  try {
    const po = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: 'pending_approval' },
      { status: 'approved', approved_by: req.user._id, approved_at: new Date() },
      { new: true }
    );
    if (!po) return res.status(404).json({ error: 'لا يمكن اعتماد هذا الأمر' });
    res.json({ order: po, message: 'تم اعتماد أمر الشراء' });
  } catch (e) {
    safeError(res, e, 'inventory-module');
  }
});

// POST /api/inventory-module/purchase-orders/:id/receive — استلام البضاعة
router.post('/purchase-orders/:id/receive', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { received_items } = req.body; // [{item_id, quantity_received}]
    const po = await PurchaseOrder.findOne({
      _id: req.params.id,
      deleted_at: null,
      status: { $in: ['approved', 'sent', 'partial'] },
    }).session(session);
    if (!po) throw new Error('لا يمكن استلام هذا الأمر');

    for (const ri of received_items || []) {
      const poItem = po.items.id
        ? po.items.find(i => String(i.item_id) === String(ri.item_id))
        : null;
      if (!poItem) continue;
      poItem.quantity_received = (poItem.quantity_received || 0) + Number(ri.quantity_received);

      const item = await InventoryItem.findById(ri.item_id).session(session);
      if (item) {
        item.quantity_on_hand += Number(ri.quantity_received);
        item.quantity_available = Math.max(
          0,
          item.quantity_on_hand - (item.quantity_reserved || 0)
        );
        await item.save({ session });

        await new InventoryTransaction({
          item_id: ri.item_id,
          transaction_type: 'receipt',
          quantity: Number(ri.quantity_received),
          unit_cost: poItem.unit_cost,
          quantity_before: item.quantity_on_hand - Number(ri.quantity_received),
          quantity_after: item.quantity_on_hand,
          reference_type: 'PurchaseOrder',
          reference_id: po._id,
          reference_number: po.po_number,
          branch_id: po.branch_id,
          created_by: req.user._id,
        }).save({ session });
      }
    }

    // تحديث حالة أمر الشراء
    const allReceived = po.items.every(i => (i.quantity_received || 0) >= i.quantity_ordered);
    po.status = allReceived ? 'received' : 'partial';
    if (allReceived) po.actual_delivery_date = new Date();
    await po.save({ session });
    await session.commitTransaction();

    res.json({ order: po, message: 'تم تسجيل الاستلام بنجاح' });
  } catch (e) {
    await session.abortTransaction();
    res.status(400).json({ error: e.message });
  } finally {
    session.endSession();
  }
});

// DELETE /api/inventory-module/purchase-orders/:id
router.delete('/purchase-orders/:id', async (req, res) => {
  try {
    const po = await PurchaseOrder.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null, status: { $in: ['draft', 'pending_approval'] } },
      { deleted_at: new Date(), status: 'cancelled' },
      { new: true }
    );
    if (!po) return res.status(404).json({ error: 'لا يمكن حذف هذا الأمر' });
    res.json({ message: 'تم إلغاء أمر الشراء' });
  } catch (e) {
    safeError(res, e, 'inventory-module');
  }
});

// GET /api/inventory-module/stats — إحصائيات المخزون
router.get('/stats', async (req, res) => {
  try {
    const { branch_id } = req.query;
    const baseFilter = { deleted_at: null };
    if (branch_id) baseFilter.branch_id = new mongoose.Types.ObjectId(branch_id);

    const [totalItems, lowStockItems, categorySummary, recentTransactions, pendingPOs] =
      await Promise.all([
        InventoryItem.countDocuments(baseFilter),
        InventoryItem.countDocuments({
          ...baseFilter,
          $expr: { $lte: ['$quantity_on_hand', '$minimum_stock'] },
        }),
        InventoryItem.aggregate([
          { $match: baseFilter },
          {
            $group: {
              _id: '$category',
              count: { $sum: 1 },
              totalValue: { $sum: { $multiply: ['$quantity_on_hand', '$unit_cost'] } },
            },
          },
        ]),
        InventoryTransaction.find({ deleted_at: null, ...(branch_id ? { branch_id } : {}) })
          .sort({ transaction_date: -1 })
          .limit(5)
          .populate('item_id', 'name_ar item_code'),
        PurchaseOrder.countDocuments({
          deleted_at: null,
          status: { $in: ['pending_approval', 'approved', 'sent'] },
          ...(branch_id ? { branch_id } : {}),
        }),
      ]);

    res.json({ totalItems, lowStockItems, categorySummary, recentTransactions, pendingPOs });
  } catch (e) {
    safeError(res, e, 'inventory-module');
  }
});

module.exports = router;
