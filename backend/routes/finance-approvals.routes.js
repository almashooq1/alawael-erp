/**
 * finance-approvals.routes.js — Phase 12 Commit 2.
 *
 * HTTP surface for the expense approval chain.
 * Mount at /api/finance/approvals.
 *
 *   POST  /submit                    → start a chain for an expense
 *   POST  /:expenseId/approve        → approve current level (SoD enforced)
 *   POST  /:expenseId/reject         → reject with reason
 *   POST  /:expenseId/pay            → release payment (two-hands rule)
 *   GET   /:expenseId                → current chain status
 *   GET   /pending                   → list pending chains (branch/role filter)
 *
 * The store defaults to an in-memory Map bootstrapped at module load.
 * Callers that need durability can pass in a DB-backed store through
 * the setStore() hook.
 */

'use strict';

const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../middleware/auth');
const svc = require('../services/finance/expenseApprovalService');
const { createMongoStore } = require('../services/finance/expenseApprovalStore.mongo');
const ExpenseApprovalChain = require('../models/finance/ExpenseApprovalChain');

const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'supervisor',
  'branch_manager',
  'finance_manager',
  'finance',
  'accountant',
  'cashier',
  'cfo',
  'ceo',
];

router.use(authenticateToken);
router.use(requireRole(WRITE_ROLES));

// Default to the Mongo-backed store so chains survive restarts.
// Tests and scripts that want an in-memory store can call setStore(createMemoryStore()).
let store = createMongoStore({ Model: ExpenseApprovalChain });

function setStore(newStore) {
  store = newStore;
}

function actorFromReq(req) {
  const u = req.user || {};
  const roles = Array.isArray(u.roles) ? u.roles : u.role ? [u.role] : [];
  return { userId: String(u.id || u._id || u.userId || 'unknown'), roles };
}

function bad(res, msg, status = 400) {
  return res.status(status).json({ ok: false, error: msg });
}

function mapError(e, res) {
  if (e && e.code === 'SOD_SELF_APPROVAL') return bad(res, e.message, 403);
  if (e && e.code === 'SOD_DUPLICATE_APPROVER') return bad(res, e.message, 403);
  if (e && e.code === 'SOD_APPROVER_PAYS') return bad(res, e.message, 403);
  if (e && e.code === 'SOD_SELF_REJECT') return bad(res, e.message, 403);
  if (e && e.code === 'FORBIDDEN_ROLE') return bad(res, e.message, 403);
  if (e && e.code === 'FORBIDDEN_LEVEL') return bad(res, e.message, 403);
  if (e && e.code === 'FORBIDDEN_PAY_ROLE') return bad(res, e.message, 403);
  return bad(res, e && e.message ? e.message : 'internal error', 400);
}

router.post('/submit', async (req, res) => {
  try {
    const { expenseId, amount, branchId, category, metadata } = req.body || {};
    if (!expenseId) return bad(res, 'expenseId is required');
    if (typeof amount !== 'number') return bad(res, 'amount (number) is required');
    const rec = await svc.submit({
      store,
      expenseId,
      amount,
      branchId,
      category,
      createdBy: actorFromReq(req),
      metadata,
    });
    res.json({ ok: true, data: rec });
  } catch (e) {
    mapError(e, res);
  }
});

router.post('/:expenseId/approve', async (req, res) => {
  try {
    const rec = await svc.approve({
      store,
      expenseId: req.params.expenseId,
      actor: actorFromReq(req),
      note: (req.body && req.body.note) || null,
    });
    res.json({ ok: true, data: rec });
  } catch (e) {
    mapError(e, res);
  }
});

router.post('/:expenseId/reject', async (req, res) => {
  try {
    const reason = req.body && req.body.reason;
    if (!reason) return bad(res, 'reason is required');
    const rec = await svc.reject({
      store,
      expenseId: req.params.expenseId,
      actor: actorFromReq(req),
      reason,
    });
    res.json({ ok: true, data: rec });
  } catch (e) {
    mapError(e, res);
  }
});

router.post('/:expenseId/pay', async (req, res) => {
  try {
    const rec = await svc.releasePayment({
      store,
      expenseId: req.params.expenseId,
      actor: actorFromReq(req),
      note: (req.body && req.body.note) || null,
    });
    res.json({ ok: true, data: rec });
  } catch (e) {
    mapError(e, res);
  }
});

router.get('/pending', async (req, res) => {
  try {
    const data = await svc.listPending({
      store,
      branchId: req.query.branchId || null,
      role: req.query.role || null,
    });
    res.json({ ok: true, data });
  } catch (e) {
    mapError(e, res);
  }
});

router.get('/:expenseId', async (req, res) => {
  try {
    const rec = await svc.getStatus({ store, expenseId: req.params.expenseId });
    if (!rec) return bad(res, 'not found', 404);
    res.json({ ok: true, data: rec });
  } catch (e) {
    mapError(e, res);
  }
});

module.exports = router;
module.exports.setStore = setStore;
