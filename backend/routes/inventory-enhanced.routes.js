const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { requireBranchAccess, branchFilter } = require('../middleware/branchScope.middleware');
const svc = require('../services/inventory/inventory-enhanced.service');
const { stripUpdateMeta } = require('../utils/sanitize');
const safeError = require('../utils/safeError');
const escapeRegex = require('../utils/escapeRegex');

// ── تنبيهات إعادة الطلب والانتهاء ────────────────────
router.get('/alerts/reorder', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const data = await svc.getReorderAlerts();
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err);
  }
});

router.get('/alerts/expiring', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const data = await svc.getExpiringItems(req.query.days ? Number(req.query.days) : 30);
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err);
  }
});

// ── الأصناف ───────────────────────────────────────────
router.get('/items', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { InventoryItem } = require('../models/InventoryItem');
    const { page = 1, limit = 20, search, categoryId, type } = req.query;
    const filter = { isActive: true };
    if (categoryId) filter.categoryId = categoryId;
    if (type) filter.type = type;
    if (search)
      filter.$or = [
        { nameAr: { $regex: escapeRegex(search), $options: 'i' } },
        { nameEn: { $regex: escapeRegex(search), $options: 'i' } },
        { sku: { $regex: escapeRegex(search), $options: 'i' } },
      ];
    const items = await InventoryItem.find(filter)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .sort({ nameAr: 1 });
    const total = await InventoryItem.countDocuments(filter);
    res.json({ success: true, data: items, total, page: Number(page) });
  } catch (err) {
    safeError(res, err);
  }
});

router.post(
  '/items',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'inventory_manager'),
  async (req, res) => {
    try {
      const { InventoryItem } = require('../models/InventoryItem');
      const item = await InventoryItem.create(stripUpdateMeta(req.body));
      res.status(201).json({ success: true, data: item });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.get('/items/:itemId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { InventoryItem } = require('../models/InventoryItem');
    const _escapeRegex = require('../utils/escapeRegex');
    const item = await InventoryItem.findById(req.params.itemId).populate('categoryId');
    if (!item) return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
    res.json({ success: true, data: item });
  } catch (err) {
    safeError(res, err);
  }
});

router.put(
  '/items/:itemId',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'inventory_manager'),
  async (req, res) => {
    try {
      const { InventoryItem } = require('../models/InventoryItem');
      const item = await InventoryItem.findByIdAndUpdate(
        req.params.itemId,
        stripUpdateMeta(req.body),
        { returnDocument: 'after' }
      );
      if (!item) return res.status(404).json({ success: false, message: 'الصنف غير موجود' });
      res.json({ success: true, data: item });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.get('/items/:itemId/stock', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { InventoryStock } = require('../models/InventoryStock');
    const stock = await InventoryStock.find({ itemId: req.params.itemId }).populate('warehouseId');
    res.json({ success: true, data: stock });
  } catch (err) {
    safeError(res, err);
  }
});

router.get('/items/:itemId/transactions', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { InventoryTransaction } = require('../models/InventoryStock');
    const transactions = await InventoryTransaction.find({ itemId: req.params.itemId })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, data: transactions });
  } catch (err) {
    safeError(res, err);
  }
});

// ── تصنيفات الأصناف ───────────────────────────────────
router.get('/categories', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { ItemCategory } = require('../models/InventoryItem');
    const categories = await ItemCategory.find({ isActive: true }).sort({ nameAr: 1 });
    res.json({ success: true, data: categories });
  } catch (err) {
    safeError(res, err);
  }
});

router.post(
  '/categories',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      const { ItemCategory } = require('../models/InventoryItem');
      const cat = await ItemCategory.create(stripUpdateMeta(req.body));
      res.status(201).json({ success: true, data: cat });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── المستودعات ───────────────────────────────────────
router.get('/warehouses', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const Warehouse = require('../models/Warehouse');
    const warehouses = await Warehouse.find({ isActive: true, ...branchFilter(req) }).populate(
      'branchId'
    );
    res.json({ success: true, data: warehouses });
  } catch (err) {
    safeError(res, err);
  }
});

router.post(
  '/warehouses',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      const Warehouse = require('../models/Warehouse');
      const warehouse = await Warehouse.create(stripUpdateMeta(req.body));
      res.status(201).json({ success: true, data: warehouse });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.get('/warehouses/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const Warehouse = require('../models/Warehouse');
    const warehouse = await Warehouse.findOne({
      _id: req.params.id,
      ...branchFilter(req),
    }).populate('branchId');
    if (!warehouse) return res.status(404).json({ success: false, message: 'المستودع غير موجود' });
    res.json({ success: true, data: warehouse });
  } catch (err) {
    safeError(res, err);
  }
});

router.put(
  '/warehouses/:id',
  authenticate,
  requireBranchAccess,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      const Warehouse = require('../models/Warehouse');
      const warehouse = await Warehouse.findByIdAndUpdate(
        req.params.id,
        stripUpdateMeta(req.body),
        { returnDocument: 'after' }
      );
      if (!warehouse)
        return res.status(404).json({ success: false, message: 'المستودع غير موجود' });
      res.json({ success: true, data: warehouse });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── الموردون ──────────────────────────────────────────
router.get('/suppliers', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Supplier } = require('../models/InventoryStock');
    const suppliers = await Supplier.find({ isActive: true }).sort({ nameAr: 1 });
    res.json({ success: true, data: suppliers });
  } catch (err) {
    safeError(res, err);
  }
});

router.post(
  '/suppliers',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'inventory_manager'),
  async (req, res) => {
    try {
      const { Supplier } = require('../models/InventoryStock');
      const supplier = await Supplier.create(stripUpdateMeta(req.body));
      res.status(201).json({ success: true, data: supplier });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.get('/suppliers/:id', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Supplier } = require('../models/InventoryStock');
    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) return res.status(404).json({ success: false, message: 'المورد غير موجود' });
    res.json({ success: true, data: supplier });
  } catch (err) {
    safeError(res, err);
  }
});

router.put(
  '/suppliers/:id',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'inventory_manager'),
  async (req, res) => {
    try {
      const { Supplier } = require('../models/InventoryStock');
      const supplier = await Supplier.findByIdAndUpdate(req.params.id, stripUpdateMeta(req.body), {
        returnDocument: 'after',
      });
      res.json({ success: true, data: supplier });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── حركات المخزون ────────────────────────────────────
router.post(
  '/transactions/receive',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'inventory_manager', 'warehouse_keeper'),
  async (req, res) => {
    try {
      const { itemId, warehouseId, quantity, ...meta } = req.body;
      const tx = await svc.receive(itemId, warehouseId, quantity, {
        ...meta,
        performedBy: req.user._id,
      });
      res.status(201).json({ success: true, data: tx });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.post(
  '/transactions/issue',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'inventory_manager', 'warehouse_keeper'),
  async (req, res) => {
    try {
      const { itemId, warehouseId, quantity, ...meta } = req.body;
      const tx = await svc.issue(itemId, warehouseId, quantity, {
        ...meta,
        performedBy: req.user._id,
      });
      res.status(201).json({ success: true, data: tx });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.post(
  '/transactions/transfer',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'inventory_manager'),
  async (req, res) => {
    try {
      const { itemId, fromWarehouseId, toWarehouseId, quantity, reason } = req.body;
      const txs = await svc.transfer(
        itemId,
        fromWarehouseId,
        toWarehouseId,
        quantity,
        reason,
        req.user._id
      );
      res.status(201).json({ success: true, data: txs });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.post(
  '/transactions/adjust',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'inventory_manager'),
  async (req, res) => {
    try {
      const { itemId, warehouseId, newQuantity, reason } = req.body;
      const tx = await svc.adjust(itemId, warehouseId, newQuantity, reason, req.user._id);
      res.status(201).json({ success: true, data: tx });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── أوامر الشراء ─────────────────────────────────────
router.get('/purchase-orders', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { PurchaseOrder } = require('../models/InventoryStock');
    const { status, branchId } = req.query;
    const bf = branchFilter(req);
    const filter = { ...bf };
    if (status) filter.status = status;
    if (branchId && !bf.branchId) filter.branchId = branchId;
    const orders = await PurchaseOrder.find(filter)
      .populate('supplierId branchId warehouseId requestedBy')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: orders });
  } catch (err) {
    safeError(res, err);
  }
});

router.post('/purchase-orders', authenticate, requireBranchAccess, async (req, res) => {
  try {
    // W933 — branchId is required on PurchaseOrder. Stamp the creator's branch
    // (W269: scoped for restricted users via ENABLE_USER_BRANCH_ENRICH; explicit
    // body branch only for cross-branch creators). Pass requestedBy as the proper
    // 2nd arg (the service signature is createPurchaseOrder(data, requestedBy);
    // JWT carries id, not _id).
    const { branchId: _b1, branch_id: _b2, ...rest } = req.body || {};
    const branchId =
      req.branchScope?.branchId || (req.branchScope?.allBranches ? _b1 || _b2 : undefined);
    const actorId = req.user?.id || req.user?._id;
    const po = await svc.createPurchaseOrder(
      { ...rest, ...(branchId ? { branchId } : {}) },
      actorId
    );
    res.status(201).json({ success: true, data: po });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

router.get('/purchase-orders/:poId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { PurchaseOrder } = require('../models/InventoryStock');
    const po = await PurchaseOrder.findOne({ _id: req.params.poId, ...branchFilter(req) }).populate(
      'supplierId branchId warehouseId requestedBy approvedBy items.itemId'
    );
    if (!po) return res.status(404).json({ success: false, message: 'أمر الشراء غير موجود' });
    res.json({ success: true, data: po });
  } catch (err) {
    safeError(res, err);
  }
});

router.put(
  '/purchase-orders/:poId/approve',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'finance_manager'),
  async (req, res) => {
    try {
      const { PurchaseOrder } = require('../models/InventoryStock');
      const po = await PurchaseOrder.findByIdAndUpdate(
        req.params.poId,
        { status: 'approved', approvedBy: req.user._id, approvedAt: new Date() },
        { returnDocument: 'after' }
      );
      res.json({ success: true, data: po });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.post(
  '/purchase-orders/:poId/receive',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'inventory_manager', 'warehouse_keeper'),
  async (req, res) => {
    try {
      const result = await svc.receiveGoodsFromPO(req.params.poId, req.body.items, req.user._id);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

// ── الأصول الثابتة ───────────────────────────────────
router.get('/assets', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Asset } = require('../models/InventoryStock');
    const { branchId, status, category } = req.query;
    const bf = branchFilter(req);
    const filter = { ...bf };
    if (branchId && !bf.branchId) filter.branchId = branchId;
    if (status) filter.status = status;
    if (category) filter.category = category;
    const assets = await Asset.find(filter).populate('branchId warehouseId assignedTo');
    res.json({ success: true, data: assets });
  } catch (err) {
    safeError(res, err);
  }
});

router.post(
  '/assets',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'inventory_manager'),
  async (req, res) => {
    try {
      const { Asset } = require('../models/InventoryStock');
      // Strip privileged/lifecycle fields; stamp branch from caller scope (cross-branch
      // creators may pass branchId explicitly). branchId is required on Asset.
      const payload = stripUpdateMeta(req.body) || {};
      ['status', 'currentValue', 'disposedAt', 'disposalValue'].forEach(k => delete payload[k]);
      const assetBranch =
        req.branchScope?.branchId ||
        (req.branchScope?.allBranches ? payload.branchId || payload.branch_id : undefined);
      delete payload.branchId;
      delete payload.branch_id;
      const asset = await Asset.create({
        ...payload,
        ...(assetBranch ? { branchId: assetBranch } : {}),
      });
      res.status(201).json({ success: true, data: asset });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.get('/assets/:assetId', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Asset } = require('../models/InventoryStock');
    const asset = await Asset.findOne({
      _id: req.params.assetId,
      ...branchFilter(req),
    }).populate('branchId assignedTo');
    if (!asset) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    res.json({ success: true, data: asset });
  } catch (err) {
    safeError(res, err);
  }
});

router.put(
  '/assets/:assetId',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'inventory_manager'),
  async (req, res) => {
    try {
      const { Asset } = require('../models/InventoryStock');
      // Branch-scoped update; strip branch/lifecycle/value fields (no forging another
      // branch's ownership, status, or asset value via a plain PUT).
      const payload = stripUpdateMeta(req.body) || {};
      ['branchId', 'branch_id', 'status', 'currentValue', 'disposedAt', 'disposalValue'].forEach(
        k => delete payload[k]
      );
      const asset = await Asset.findOneAndUpdate(
        { _id: req.params.assetId, ...branchFilter(req) },
        payload,
        { returnDocument: 'after', runValidators: true }
      );
      if (!asset) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
      res.json({ success: true, data: asset });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.get('/assets/:assetId/depreciation', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Asset } = require('../models/InventoryStock');
    const asset = await Asset.findOne({ _id: req.params.assetId, ...branchFilter(req) });
    if (!asset) return res.status(404).json({ success: false, message: 'الأصل غير موجود' });
    const data = svc.calculateDepreciation(asset);
    res.json({ success: true, data });
  } catch (err) {
    safeError(res, err);
  }
});

router.post('/assets/:assetId/maintenance', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { Asset } = require('../models/InventoryStock');
    const { notes, nextMaintenanceDate, cost } = req.body;
    const asset = await Asset.findOneAndUpdate(
      { _id: req.params.assetId, ...branchFilter(req) },
      {
        lastMaintenanceDate: new Date(),
        nextMaintenanceDate,
        $push: {
          maintenanceHistory: {
            $each: [{ date: new Date(), notes, cost, performedBy: req.user._id }],
            $slice: -200,
          },
        },
      },
      { returnDocument: 'after' }
    );
    res.json({ success: true, data: asset });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── الجرد الدوري ──────────────────────────────────────
router.get('/stock-counts', authenticate, requireBranchAccess, async (req, res) => {
  try {
    const { StockCount } = require('../models/InventoryStock');
    // StockCount has no branchId; scope through the owning warehouse for restricted users.
    const bf = branchFilter(req);
    let scFilter = {};
    if (bf.branchId) {
      const Warehouse = require('../models/Warehouse');
      const whIds = await Warehouse.find({ branchId: bf.branchId }).distinct('_id');
      scFilter = { warehouseId: { $in: whIds } };
    }
    const counts = await StockCount.find(scFilter)
      .populate('warehouseId initiatedBy')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: counts });
  } catch (err) {
    safeError(res, err);
  }
});

router.post(
  '/stock-counts',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin', 'inventory_manager'),
  async (req, res) => {
    try {
      const count = await svc.createStockCount(
        req.body.warehouseId,
        req.body.type,
        req.body.countDate,
        req.user._id
      );
      res.status(201).json({ success: true, data: count });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.post(
  '/stock-counts/:countId/items/:itemId/count',
  authenticate,
  requireBranchAccess,
  async (req, res) => {
    try {
      const result = await svc.recordItemCount(
        req.params.countId,
        req.params.itemId,
        req.body.countedQuantity
      );
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

router.put(
  '/stock-counts/:countId/approve',
  authenticate,
  requireBranchAccess,
  requireBranchAccess,
  authorize('admin', 'super_admin'),
  async (req, res) => {
    try {
      const result = await svc.approveStockCount(req.params.countId, req.user._id);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message });
    }
  }
);

module.exports = router;
