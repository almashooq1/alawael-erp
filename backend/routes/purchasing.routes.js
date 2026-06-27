/**
 * Purchasing Routes — /api/v1/purchasing/*
 * W773 — PR adapter; W780 — vendors/orders; W781 — receipts + vendor contracts; W785 — PO receipts; W799 — platform-stats.
 */
'use strict';

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const { branchFilter, requireBranchAccess } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const adapter = require('../services/purchasingAdapter.service');

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

// W834 — activate branchFilter(req) (was a silent no-op without req.branchScope).
router.use(requireBranchAccess);

function actor(req) {
  const u = req.user || {};
  return { id: u.id || u._id, name: u.name || u.fullName };
}

function invalidId(res) {
  return res.status(400).json({ success: false, message: 'invalid_id' });
}

async function handleApproveRequest(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);
  const { id, name } = actor(req);
  const roles = (req.user && req.user.roles) || [];
  const data = await adapter.approveRequest(req.params.id, {
    approverId: id,
    approverName: name,
    role: req.body.role || roles[0] || 'procurement_manager',
  });
  res.json({ success: true, data });
}

async function handleRejectRequest(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);
  const { id } = actor(req);
  const data = await adapter.rejectRequest(req.params.id, {
    approverId: id,
    reason: req.body.reason || 'rejected',
  });
  res.json({ success: true, data });
}

router.get(
  '/stats',
  wrap(async (req, res) => {
    const data = await adapter.getStats();
    res.json({ success: true, data });
  })
);

router.get(
  '/platform-stats',
  wrap(async (req, res) => {
    const scope = branchFilter(req);
    const data = await adapter.getPlatformStats({
      ...req.query,
      branchId: scope.branchId || req.query.branchId,
    });
    res.json({ success: true, data });
  })
);

router.get(
  '/dashboard',
  wrap(async (req, res) => {
    const stats = await adapter.getStats();
    res.json({
      success: true,
      data: {
        overview: {
          totalOrders: stats.activeOrders,
          pendingApproval: stats.pendingRequests,
          totalVendors: stats.totalVendors,
        },
        recentOrders: [],
        topVendors: [],
        budgetSummary: {},
      },
    });
  })
);

router.get(
  '/vendors',
  wrap(async (req, res) => {
    const data = await adapter.listVendors(req.query);
    res.json({ success: true, data });
  })
);
router.get(
  '/vendors/:id',
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'invalid_id' });
    }
    const data = await adapter.getVendor(req.params.id);
    res.json({ success: true, data });
  })
);
router.post(
  '/vendors',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) => {
    const data = await adapter.createVendor(req.body);
    res.status(201).json({ success: true, data });
  })
);
router.put(
  '/vendors/:id',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'invalid_id' });
    }
    const data = await adapter.updateVendor(req.params.id, req.body);
    res.json({ success: true, data });
  })
);
router.delete(
  '/vendors/:id',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'invalid_id' });
    }
    const data = await adapter.deleteVendor(req.params.id);
    res.json({ success: true, data });
  })
);

router.get(
  '/requests',
  wrap(async (req, res) => {
    const scope = branchFilter(req);
    const data = await adapter.listRequests({
      ...req.query,
      branchId: scope.branchId || req.query.branchId,
    });
    res.json({ success: true, data });
  })
);

router.get(
  '/requests/:id',
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'invalid_id' });
    }
    const data = await adapter.getRequest(req.params.id);
    res.json({ success: true, data });
  })
);

router.post(
  '/requests',
  authorize('admin', 'manager', 'procurement_manager', 'department_head', 'staff'),
  wrap(async (req, res) => {
    const { id } = actor(req);
    const data = await adapter.createRequest({ ...req.body, ...branchFilter(req) }, id);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/requests/:id',
  authorize('admin', 'manager', 'procurement_manager', 'department_head', 'staff'),
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);
    const { id } = actor(req);
    const data = await adapter.updateRequest(
      req.params.id,
      { ...req.body, ...branchFilter(req) },
      id
    );
    res.json({ success: true, data });
  })
);

const REQUEST_APPROVE_ROLES = [
  'admin',
  'manager',
  'procurement_manager',
  'department_head',
  'cfo',
  'ceo',
];

router.patch(
  '/requests/:id/approve',
  authorize(...REQUEST_APPROVE_ROLES),
  wrap(handleApproveRequest)
);
router.post(
  '/requests/:id/approve',
  authorize(...REQUEST_APPROVE_ROLES),
  wrap(handleApproveRequest)
);

router.patch(
  '/requests/:id/reject',
  authorize(...REQUEST_APPROVE_ROLES),
  wrap(handleRejectRequest)
);
router.post('/requests/:id/reject', authorize(...REQUEST_APPROVE_ROLES), wrap(handleRejectRequest));

router.post(
  '/requests/:id/submit',
  authorize('admin', 'manager', 'procurement_manager', 'department_head', 'staff'),
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);
    const { id } = actor(req);
    const data = await adapter.submitRequest(req.params.id, {
      actorId: id,
      notes: req.body.notes,
    });
    res.json({ success: true, data });
  })
);

router.post(
  '/requests/:id/convert-to-po',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);
    const { id } = actor(req);
    const data = await adapter.convertRequestToPo(req.params.id, {
      actorId: id,
      supplierId: req.body.supplierId || req.body.vendorId,
      supplierName: req.body.supplierName || req.body.vendor,
    });
    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/orders',
  wrap(async (req, res) => {
    const scope = branchFilter(req);
    const data = await adapter.listOrders({
      ...req.query,
      branchId: scope.branchId || req.query.branchId,
    });
    res.json({ success: true, data });
  })
);

router.post(
  '/orders',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) => {
    const { id } = actor(req);
    const data = await adapter.createOrder({ ...req.body, ...branchFilter(req) }, id);
    res.status(201).json({ success: true, data });
  })
);

router.patch(
  '/orders/:id/approve',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'invalid_id' });
    }
    const { id } = actor(req);
    const data = await adapter.approveOrder(req.params.id, id);
    res.json({ success: true, data });
  })
);

router.patch(
  '/orders/:id/receive',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'invalid_id' });
    }
    const { id } = actor(req);
    const data = await adapter.receiveOrder(req.params.id, id, req.body);
    res.json({ success: true, data });
  })
);

router.patch(
  '/orders/:id/status',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'invalid_id' });
    }
    const { id } = actor(req);
    const Po = require('../models/inventory/PurchaseOrder');
    const doc = await Po.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { status: req.body.status, updated_by: id },
      {returnDocument: 'after'}
    );
    if (!doc) {
      return res.status(404).json({ success: false, message: 'order_not_found' });
    }
    const data = await adapter.getOrder(req.params.id);
    res.json({ success: true, data });
  })
);

router.get(
  '/orders/:id/receipts',
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'invalid_id' });
    }
    const scope = branchFilter(req);
    const data = await adapter.listReceiptsForOrder(req.params.id, {
      ...req.query,
      branchId: scope.branchId || req.query.branchId,
    });
    res.json({ success: true, data });
  })
);

router.get(
  '/orders/:id',
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'invalid_id' });
    }
    const data = await adapter.getOrder(req.params.id);
    res.json({ success: true, data });
  })
);

router.put(
  '/orders/:id',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'invalid_id' });
    }
    const { id } = actor(req);
    const Po = require('../models/inventory/PurchaseOrder');
    const patch = { updated_by: id };
    if (req.body.vendor != null) patch.supplier_name = req.body.vendor;
    if (req.body.supplierName != null) patch.supplier_name = req.body.supplierName;
    if (req.body.deliveryDate != null) patch.expected_delivery_date = req.body.deliveryDate;
    if (req.body.notes != null) patch.notes = req.body.notes;
    const doc = await Po.findOneAndUpdate({ _id: req.params.id, deleted_at: null }, patch, {returnDocument: 'after',
    });
    if (!doc) {
      return res.status(404).json({ success: false, message: 'order_not_found' });
    }
    const data = await adapter.getOrder(req.params.id);
    res.json({ success: true, data });
  })
);

router.delete(
  '/orders/:id',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'invalid_id' });
    }
    const Po = require('../models/inventory/PurchaseOrder');
    const doc = await Po.findOneAndUpdate(
      { _id: req.params.id, deleted_at: null },
      { deleted_at: new Date() },
      {returnDocument: 'after'}
    );
    if (!doc) {
      return res.status(404).json({ success: false, message: 'order_not_found' });
    }
    res.json({ success: true, data: { deleted: true, _id: doc._id } });
  })
);

router.get(
  '/receipts',
  wrap(async (req, res) => {
    const scope = branchFilter(req);
    const data = await adapter.listReceipts({
      ...req.query,
      branchId: scope.branchId || req.query.branchId,
    });
    res.json({ success: true, data });
  })
);

router.post(
  '/receipts',
  authorize('admin', 'manager', 'procurement_manager', 'warehouse_manager'),
  wrap(async (req, res) => {
    const { id } = actor(req);
    const data = await adapter.createReceipt({ ...req.body, ...branchFilter(req) }, id);
    res.status(201).json({ success: true, data });
  })
);

router.get(
  '/receipts/:id',
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return invalidId(res);
    const data = await adapter.getReceipt(req.params.id);
    res.json({ success: true, data });
  })
);

router.get(
  '/contracts/expiring',
  wrap(async (req, res) => {
    const days = req.query.days ? Number(req.query.days) : 60;
    const data = await adapter.listExpiringContracts(days);
    res.json({ success: true, data });
  })
);

router.get(
  '/contracts',
  wrap(async (req, res) => {
    const scope = branchFilter(req);
    const data = await adapter.listContracts({
      ...req.query,
      branchId: scope.branchId || req.query.branchId,
    });
    res.json({ success: true, data });
  })
);

router.post(
  '/contracts',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) => {
    const data = await adapter.createContract({ ...req.body, ...branchFilter(req) });
    res.status(201).json({ success: true, data });
  })
);

router.use((err, _req, res, _next) => {
  if (err.status === 404 || err.code === 'NOT_FOUND') {
    return res.status(404).json({ success: false, message: err.message || 'not_found' });
  }
  if (err.code === 'ILLEGAL_TRANSITION' || err.code === 'CONFLICT') {
    return res.status(409).json({
      success: false,
      message: err.message,
      code: err.code,
    });
  }
  if (err.code === 'MISSING_FIELD') {
    return res.status(422).json({
      success: false,
      message: err.message,
      fields: err.fields,
    });
  }
  return safeError(res, err, 'purchasing');
});

module.exports = router;
