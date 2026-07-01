/**
 * finance-statements.routes.js — Phase 12 Commit 1.
 *
 * HTTP surface for the new financial statements builders.
 * Mount at /api/finance/statements.
 *
 *   GET /trial-balance?asOfDate&branchId
 *   GET /profit-and-loss?startDate&endDate&branchId
 *   GET /cash-flow?startDate&endDate&branchId
 *   GET /budget-vs-actual?fiscalYear&branchId
 *   GET /aged-receivables?asOfDate&branchId
 *   GET /aged-payables?asOfDate&branchId
 *   GET /consolidated-pl?startDate&endDate&branchIds=comma,list
 *
 * Reads are restricted to finance-facing roles. All responses come
 * back as JSON { ok: true, data: ... } or { ok: false, error } on
 * validation failure. The 500 path is delegated to the parent error
 * middleware via next(err).
 */

'use strict';

const express = require('express');
const router = express.Router();

const { authenticateToken, requireRole } = require('../middleware/auth');
const { requireBranchAccess } = require('../middleware/branchScope.middleware');
const { effectiveBranchScope, assertBranchIdsAllowed } = require('../middleware/assertBranchMatch');

const JournalEntry = require('../models/finance/JournalEntry');
const ChartOfAccount = require('../models/finance/ChartOfAccount');
const Invoice = require('../models/Invoice');
const AccountingExpense = require('../models/AccountingExpense');
const Budget = require('../models/Budget');

const svc = require('../services/finance/financialStatementsService');
const subLedger = require('../services/finance/subsidiaryLedgerService');

const READ_ROLES = [
  'admin',
  'superadmin',
  'super_admin',
  'manager',
  'finance',
  'accountant',
  'finance_manager',
  'cfo',
  'ceo',
  'auditor',
];

router.use(authenticateToken);
router.use(requireRole(READ_ROLES));
// W1595 — populate req.branchScope so effectiveBranchScope() below can pin a
// branch-restricted finance user to their own branch (previously req.branchScope was never
// set on this router → the branch filter was a no-op and restricted users saw all branches).
router.use(requireBranchAccess);

function parseDate(v, fallback) {
  if (!v) return fallback;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : fallback;
}

function ok(res, data) {
  return res.json({ ok: true, data });
}

function bad(res, msg) {
  return res.status(400).json({ ok: false, error: msg });
}

router.get('/trial-balance', async (req, res, next) => {
  try {
    const asOfDate = parseDate(req.query.asOfDate, new Date());
    // W1595 — was `req.query.branchId || null`: a restricted finance/accountant/auditor who
    // simply OMITTED branchId got null → NO branch filter → every branch's financials.
    // effectiveBranchScope pins a restricted user to their own branch (ignoring ?branchId=
    // spoofing) and honours ?branchId= for cross-branch/HQ (null = all, intended).
    const branchId = effectiveBranchScope(req);
    const data = await svc.buildTrialBalance({
      JournalEntryModel: JournalEntry,
      ChartOfAccountModel: ChartOfAccount,
      asOfDate,
      branchId,
    });
    ok(res, data);
  } catch (e) {
    next(e);
  }
});

router.get('/profit-and-loss', async (req, res, next) => {
  try {
    const startDate = parseDate(req.query.startDate);
    const endDate = parseDate(req.query.endDate);
    if (!startDate || !endDate) return bad(res, 'startDate and endDate are required');
    // W1595 — was `req.query.branchId || null`: a restricted finance/accountant/auditor who
    // simply OMITTED branchId got null → NO branch filter → every branch's financials.
    // effectiveBranchScope pins a restricted user to their own branch (ignoring ?branchId=
    // spoofing) and honours ?branchId= for cross-branch/HQ (null = all, intended).
    const branchId = effectiveBranchScope(req);
    const data = await svc.buildProfitAndLoss({
      JournalEntryModel: JournalEntry,
      ChartOfAccountModel: ChartOfAccount,
      startDate,
      endDate,
      branchId,
    });
    ok(res, data);
  } catch (e) {
    next(e);
  }
});

router.get('/cash-flow', async (req, res, next) => {
  try {
    const startDate = parseDate(req.query.startDate);
    const endDate = parseDate(req.query.endDate);
    if (!startDate || !endDate) return bad(res, 'startDate and endDate are required');
    // W1595 — was `req.query.branchId || null`: a restricted finance/accountant/auditor who
    // simply OMITTED branchId got null → NO branch filter → every branch's financials.
    // effectiveBranchScope pins a restricted user to their own branch (ignoring ?branchId=
    // spoofing) and honours ?branchId= for cross-branch/HQ (null = all, intended).
    const branchId = effectiveBranchScope(req);
    const data = await svc.buildCashFlow({
      JournalEntryModel: JournalEntry,
      ChartOfAccountModel: ChartOfAccount,
      startDate,
      endDate,
      branchId,
    });
    ok(res, data);
  } catch (e) {
    next(e);
  }
});

router.get('/budget-vs-actual', async (req, res, next) => {
  try {
    const fiscalYear = Number(req.query.fiscalYear);
    if (!Number.isInteger(fiscalYear) || fiscalYear < 2000) {
      return bad(res, 'fiscalYear (integer) is required');
    }
    // W1595 — was `req.query.branchId || null`: a restricted finance/accountant/auditor who
    // simply OMITTED branchId got null → NO branch filter → every branch's financials.
    // effectiveBranchScope pins a restricted user to their own branch (ignoring ?branchId=
    // spoofing) and honours ?branchId= for cross-branch/HQ (null = all, intended).
    const branchId = effectiveBranchScope(req);
    const data = await svc.buildBudgetVsActual({
      BudgetModel: Budget,
      JournalEntryModel: JournalEntry,
      ChartOfAccountModel: ChartOfAccount,
      fiscalYear,
      branchId,
    });
    ok(res, data);
  } catch (e) {
    next(e);
  }
});

router.get('/aged-receivables', async (req, res, next) => {
  try {
    const asOfDate = parseDate(req.query.asOfDate, new Date());
    // W1595 — was `req.query.branchId || null`: a restricted finance/accountant/auditor who
    // simply OMITTED branchId got null → NO branch filter → every branch's financials.
    // effectiveBranchScope pins a restricted user to their own branch (ignoring ?branchId=
    // spoofing) and honours ?branchId= for cross-branch/HQ (null = all, intended).
    const branchId = effectiveBranchScope(req);
    const data = await svc.buildAgedReceivables({
      InvoiceModel: Invoice,
      asOfDate,
      branchId,
    });
    ok(res, data);
  } catch (e) {
    next(e);
  }
});

router.get('/aged-payables', async (req, res, next) => {
  try {
    const asOfDate = parseDate(req.query.asOfDate, new Date());
    // W1595 — was `req.query.branchId || null`: a restricted finance/accountant/auditor who
    // simply OMITTED branchId got null → NO branch filter → every branch's financials.
    // effectiveBranchScope pins a restricted user to their own branch (ignoring ?branchId=
    // spoofing) and honours ?branchId= for cross-branch/HQ (null = all, intended).
    const branchId = effectiveBranchScope(req);
    const data = await svc.buildAgedPayables({
      ExpenseModel: AccountingExpense,
      asOfDate,
      branchId,
    });
    ok(res, data);
  } catch (e) {
    next(e);
  }
});

router.get('/ar-ledger', async (req, res, next) => {
  try {
    const asOfDate = parseDate(req.query.asOfDate, new Date());
    // W1595 — was `req.query.branchId || null`: a restricted finance/accountant/auditor who
    // simply OMITTED branchId got null → NO branch filter → every branch's financials.
    // effectiveBranchScope pins a restricted user to their own branch (ignoring ?branchId=
    // spoofing) and honours ?branchId= for cross-branch/HQ (null = all, intended).
    const branchId = effectiveBranchScope(req);
    const reconcile = String(req.query.reconcile || 'true') !== 'false';
    const data = await subLedger.buildAccountsReceivableLedger({
      InvoiceModel: Invoice,
      JournalEntryModel: reconcile ? JournalEntry : null,
      asOfDate,
      branchId,
    });
    ok(res, data);
  } catch (e) {
    next(e);
  }
});

router.get('/ap-ledger', async (req, res, next) => {
  try {
    const asOfDate = parseDate(req.query.asOfDate, new Date());
    // W1595 — was `req.query.branchId || null`: a restricted finance/accountant/auditor who
    // simply OMITTED branchId got null → NO branch filter → every branch's financials.
    // effectiveBranchScope pins a restricted user to their own branch (ignoring ?branchId=
    // spoofing) and honours ?branchId= for cross-branch/HQ (null = all, intended).
    const branchId = effectiveBranchScope(req);
    const reconcile = String(req.query.reconcile || 'true') !== 'false';
    const data = await subLedger.buildAccountsPayableLedger({
      ExpenseModel: AccountingExpense,
      JournalEntryModel: reconcile ? JournalEntry : null,
      asOfDate,
      branchId,
    });
    ok(res, data);
  } catch (e) {
    next(e);
  }
});

router.get('/consolidated-pl', async (req, res, next) => {
  try {
    const startDate = parseDate(req.query.startDate);
    const endDate = parseDate(req.query.endDate);
    if (!startDate || !endDate) return bad(res, 'startDate and endDate are required');
    const branchIds = String(req.query.branchIds || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);
    if (branchIds.length === 0) return bad(res, 'branchIds (comma list) is required');
    // W1595 — a restricted user may only consolidate branches within their own scope
    // (throws 403 on any foreign branchId; no-op for cross-branch/HQ roles).
    assertBranchIdsAllowed(req, branchIds);

    const perBranch = [];
    for (const bid of branchIds) {
      const pl = await svc.buildProfitAndLoss({
        JournalEntryModel: JournalEntry,
        ChartOfAccountModel: ChartOfAccount,
        startDate,
        endDate,
        branchId: bid,
      });
      perBranch.push(pl);
    }
    const consolidated = svc.consolidateBranchStatements({ branchStatements: perBranch });
    ok(res, { perBranch, consolidated });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
