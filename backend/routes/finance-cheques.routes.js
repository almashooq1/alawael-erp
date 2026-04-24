/**
 * finance-cheques.routes.js — Phase 12 Commit 5.
 *
 * Lifecycle endpoints for cheques on top of the Cheque model.
 * Mount at /api/finance/cheques.
 *
 *   GET    /                     → list (filter: status, type, branchId, payee)
 *   GET    /aging                → pending + deposited aging report
 *   GET    /:id                  → single
 *   POST   /                     → create (pending)
 *   POST   /:id/deposit          → received → deposited (+journal)
 *   POST   /:id/clear            → deposited|pending → cleared (+journal)
 *   POST   /:id/bounce           → * → bounced (reverses deposit if applicable)
 *   POST   /:id/cancel           → * → cancelled (no journal)
 *   POST   /:id/hold             → pending → on_hold
 *   POST   /:id/release          → on_hold → pending
 *   POST   /sweep/expire         → expire all stale cheques (≥180d)
 */

'use strict';

const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../middleware/auth');

const Cheque = require('../models/Cheque');
const JournalEntry = require('../models/finance/JournalEntry');
const svc = require('../services/finance/chequeService');

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'finance',
  'accountant',
  'finance_manager',
  'cashier',
  'cfo',
  'auditor',
];
const WRITE_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'finance',
  'accountant',
  'finance_manager',
  'cashier',
  'cfo',
];

router.use(authenticateToken);

function ok(res, data) {
  return res.json({ ok: true, data });
}

function bad(res, msg, status = 400) {
  return res.status(status).json({ ok: false, error: msg });
}

function mapError(e, res) {
  if (e && e.code === 'NOT_FOUND') return bad(res, e.message, 404);
  if (e && e.code === 'INVALID_TRANSITION') {
    return res.status(409).json({
      ok: false,
      error: e.message,
      allowed: e.allowed,
      code: 'INVALID_TRANSITION',
    });
  }
  return bad(res, (e && e.message) || 'internal error', 400);
}

function actorId(req) {
  const u = req.user || {};
  return u.id || u._id || u.userId || null;
}

// ----- Reads (wider role set) -----

router.get('/', requireRole(READ_ROLES), async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.branchId) filter.branch_id = req.query.branchId;
    if (req.query.payee) filter.payee = new RegExp(String(req.query.payee), 'i');
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const docs = await Cheque.find(filter).limit(limit).lean();
    ok(res, { count: docs.length, items: docs });
  } catch (e) {
    mapError(e, res);
  }
});

router.get('/aging', requireRole(READ_ROLES), async (req, res) => {
  try {
    const data = await svc.getChequeAgingReport({
      ChequeModel: Cheque,
      asOfDate: req.query.asOfDate ? new Date(req.query.asOfDate) : new Date(),
      branchId: req.query.branchId || null,
      type: req.query.type || null,
    });
    ok(res, data);
  } catch (e) {
    mapError(e, res);
  }
});

router.get('/:id', requireRole(READ_ROLES), async (req, res) => {
  try {
    const doc = await Cheque.findById(req.params.id).lean();
    if (!doc) return bad(res, 'not found', 404);
    ok(res, doc);
  } catch (e) {
    mapError(e, res);
  }
});

// ----- Writes -----

router.post('/', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const doc = await svc.createCheque({
      ChequeModel: Cheque,
      data: req.body || {},
      userId: actorId(req),
    });
    ok(res, doc);
  } catch (e) {
    mapError(e, res);
  }
});

router.post('/:id/deposit', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const data = await svc.depositCheque({
      ChequeModel: Cheque,
      JournalEntryModel: JournalEntry,
      id: req.params.id,
      depositDate: req.body && req.body.depositDate ? new Date(req.body.depositDate) : undefined,
      userId: actorId(req),
    });
    ok(res, data);
  } catch (e) {
    mapError(e, res);
  }
});

router.post('/:id/clear', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const data = await svc.clearCheque({
      ChequeModel: Cheque,
      JournalEntryModel: JournalEntry,
      id: req.params.id,
      clearDate: req.body && req.body.clearDate ? new Date(req.body.clearDate) : undefined,
      userId: actorId(req),
    });
    ok(res, data);
  } catch (e) {
    mapError(e, res);
  }
});

router.post('/:id/bounce', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    if (!req.body || !req.body.reason) return bad(res, 'reason is required');
    const data = await svc.bounceCheque({
      ChequeModel: Cheque,
      JournalEntryModel: JournalEntry,
      id: req.params.id,
      reason: req.body.reason,
      bounceDate: req.body.bounceDate ? new Date(req.body.bounceDate) : undefined,
      userId: actorId(req),
    });
    ok(res, data);
  } catch (e) {
    mapError(e, res);
  }
});

router.post('/:id/cancel', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const data = await svc.cancelCheque({
      ChequeModel: Cheque,
      id: req.params.id,
      reason: (req.body && req.body.reason) || null,
      userId: actorId(req),
    });
    ok(res, data);
  } catch (e) {
    mapError(e, res);
  }
});

router.post('/:id/hold', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const data = await svc.holdCheque({
      ChequeModel: Cheque,
      id: req.params.id,
      reason: (req.body && req.body.reason) || null,
    });
    ok(res, data);
  } catch (e) {
    mapError(e, res);
  }
});

router.post('/:id/release', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const data = await svc.releaseHold({ ChequeModel: Cheque, id: req.params.id });
    ok(res, data);
  } catch (e) {
    mapError(e, res);
  }
});

router.post('/sweep/expire', requireRole(WRITE_ROLES), async (req, res) => {
  try {
    const data = await svc.expireStaleCheques({
      ChequeModel: Cheque,
      asOfDate: req.body && req.body.asOfDate ? new Date(req.body.asOfDate) : new Date(),
    });
    ok(res, data);
  } catch (e) {
    mapError(e, res);
  }
});

module.exports = router;
