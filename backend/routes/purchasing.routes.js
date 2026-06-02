/**
 * Purchasing Routes — /api/v1/purchasing/*
 * W773 — adapter to Phase-16 purchaseRequest.service (ops/purchase-requests).
 */
'use strict';

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { authorize } = require('../middleware/auth');
const { branchFilter } = require('../middleware/branchScope.middleware');
const safeError = require('../utils/safeError');
const adapter = require('../services/purchasingAdapter.service');

function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function actor(req) {
  const u = req.user || {};
  return { id: u.id || u._id, name: u.name || u.fullName };
}

router.get(
  '/stats',
  wrap(async (req, res) => {
    const data = await adapter.getStats();
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
  wrap(async (_req, res) => res.json({ success: true, data: [] }))
);
router.get(
  '/vendors/:id',
  wrap(async (req, res) => res.json({ success: true, data: { _id: req.params.id } }))
);
router.post(
  '/vendors',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) =>
    res.status(201).json({ success: true, data: { _id: 'new', ...req.body } })
  )
);
router.put(
  '/vendors/:id',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) => res.json({ success: true, data: { _id: req.params.id, ...req.body } }))
);
router.delete(
  '/vendors/:id',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) => res.json({ success: true, data: { deleted: true, _id: req.params.id } }))
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
    const { id, name } = actor(req);
    const data = await adapter.createRequest({ ...req.body, ...branchFilter(req) }, id);
    res.status(201).json({ success: true, data });
  })
);

router.put(
  '/requests/:id',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) => res.json({ success: true, data: { _id: req.params.id, ...req.body } }))
);

router.patch(
  '/requests/:id/approve',
  authorize('admin', 'manager', 'procurement_manager', 'department_head', 'cfo', 'ceo'),
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'invalid_id' });
    }
    const { id, name } = actor(req);
    const roles = (req.user && req.user.roles) || [];
    const data = await adapter.approveRequest(req.params.id, {
      approverId: id,
      approverName: name,
      role: req.body.role || roles[0] || 'procurement_manager',
    });
    res.json({ success: true, data });
  })
);

router.patch(
  '/requests/:id/reject',
  authorize('admin', 'manager', 'procurement_manager', 'department_head', 'cfo', 'ceo'),
  wrap(async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'invalid_id' });
    }
    const { id } = actor(req);
    const data = await adapter.rejectRequest(req.params.id, {
      approverId: id,
      reason: req.body.reason || 'rejected',
    });
    res.json({ success: true, data });
  })
);

router.get(
  '/orders',
  wrap(async (_req, res) => {
    const data = await adapter.listOrders();
    res.json({ success: true, data });
  })
);

router.get(
  '/orders/:id',
  wrap(async (req, res) => res.json({ success: true, data: { _id: req.params.id } }))
);
router.post(
  '/orders',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) =>
    res.status(201).json({ success: true, data: { _id: 'new', status: 'draft', ...req.body } })
  )
);
router.put(
  '/orders/:id',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) => res.json({ success: true, data: { _id: req.params.id, ...req.body } }))
);
router.patch(
  '/orders/:id/status',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) =>
    res.json({ success: true, data: { _id: req.params.id, status: req.body.status } })
  )
);
router.patch(
  '/orders/:id/receive',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) =>
    res.json({
      success: true,
      data: { _id: req.params.id, status: 'received', receivedAt: new Date() },
    })
  )
);
router.delete(
  '/orders/:id',
  authorize('admin', 'manager', 'procurement_manager'),
  wrap(async (req, res) => res.json({ success: true, data: { deleted: true, _id: req.params.id } }))
);

router.use((err, _req, res, _next) => {
  if (err.status === 404) {
    return res.status(404).json({ success: false, message: err.message || 'not_found' });
  }
  return safeError(res, err, 'purchasing');
});

module.exports = router;
