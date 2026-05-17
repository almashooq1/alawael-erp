/**
 * 🛒 Purchasing Routes — المشتريات
 * /api/v1/purchasing/*
 */
'use strict';
const express = require('express');
const router = express.Router();
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });

// ── Stats & Dashboard ──────────────────────────────────────────────────────
router.get('/stats', (req, res) =>
  ok(res, {
    totalVendors: 0,
    activeOrders: 0,
    pendingRequests: 0,
    totalSpend: 0,
    monthlyBudget: 0,
    savingsAchieved: 0,
  })
);

router.get('/dashboard', (req, res) =>
  ok(res, {
    overview: { totalOrders: 0, pendingApproval: 0, totalVendors: 0 },
    recentOrders: [],
    topVendors: [],
    budgetSummary: {},
  })
);

// ── Vendors ───────────────────────────────────────────────────────────────
router.get('/vendors', (req, res) => ok(res, []));
router.get('/vendors/:id', (req, res) => ok(res, { _id: req.params.id }));
router.post('/vendors', (req, res) => ok(res, { _id: 'new', ...req.body }, 201));
router.put('/vendors/:id', (req, res) => ok(res, { _id: req.params.id, ...req.body }));
router.delete('/vendors/:id', (req, res) => ok(res, { deleted: true, _id: req.params.id }));

// ── Purchase Requests ─────────────────────────────────────────────────────
router.get('/requests', (req, res) => ok(res, []));
router.get('/requests/:id', (req, res) => ok(res, { _id: req.params.id }));
router.post('/requests', (req, res) =>
  ok(res, { _id: 'new', status: 'pending', ...req.body }, 201)
);
router.put('/requests/:id', (req, res) => ok(res, { _id: req.params.id, ...req.body }));
router.patch('/requests/:id/approve', (req, res) =>
  ok(res, { _id: req.params.id, status: 'approved' })
);
router.patch('/requests/:id/reject', (req, res) =>
  ok(res, { _id: req.params.id, status: 'rejected' })
);

// ── Purchase Orders ───────────────────────────────────────────────────────
router.get('/orders', (req, res) => ok(res, []));
router.get('/orders/:id', (req, res) => ok(res, { _id: req.params.id }));
router.post('/orders', (req, res) => ok(res, { _id: 'new', status: 'draft', ...req.body }, 201));
router.put('/orders/:id', (req, res) => ok(res, { _id: req.params.id, ...req.body }));
router.patch('/orders/:id/status', (req, res) =>
  ok(res, { _id: req.params.id, status: req.body.status })
);
router.patch('/orders/:id/receive', (req, res) =>
  ok(res, { _id: req.params.id, status: 'received', receivedAt: new Date() })
);
router.delete('/orders/:id', (req, res) => ok(res, { deleted: true, _id: req.params.id }));

module.exports = router;
