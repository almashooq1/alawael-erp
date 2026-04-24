/**
 * subsidiaryLedgerService.js — Phase 12 Commit 3.
 *
 * Formal subsidiary ledgers for Accounts Receivable (AR) and Accounts
 * Payable (AP). Earlier the stack inferred AR/AP from invoice/expense
 * statuses alone — this service builds a proper ledger with running
 * balances per counterparty (beneficiary for AR, vendor for AP) and
 * reconciles that balance back to the GL control accounts.
 *
 * Control account codes (from the default chart of accounts):
 *   1200 → الذمم المدينة   (AR control)
 *   2100 → الذمم الدائنة   (AP control)
 *
 * Design notes:
 *   - Pure/injectable (same pattern as financialStatementsService).
 *   - Returns per-counterparty cards + totals + reconciliation to GL.
 *   - Does NOT mutate data. For postings, use FinanceService.createJournalEntry.
 */

'use strict';

const DEFAULT_AR_CONTROL_CODE = '1200';
const DEFAULT_AP_CONTROL_CODE = '2100';

const AR_PAID_STATUSES = new Set(['PAID', 'paid', 'FULLY_PAID']);

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function normalizeId(v) {
  if (v === null || v === undefined) return null;
  return String(v);
}

async function runFind(model, filter) {
  const q = model.find(filter);
  if (q && typeof q.lean === 'function') return q.lean();
  return q;
}

/**
 * Build the AR subsidiary ledger.
 * One card per beneficiary showing: totalBilled, totalPaid, outstanding,
 * invoice count, oldest overdue date.
 *
 * Input:
 *   InvoiceModel — with fields { beneficiary, branchId, totalAmount, amountPaid,
 *                                status, issueDate, dueDate }
 *   JournalEntryModel — optional; if given, reconciles against AR control account
 *   asOfDate, branchId, controlAccountCode
 */
async function buildAccountsReceivableLedger({
  InvoiceModel,
  JournalEntryModel = null,
  asOfDate = new Date(),
  branchId = null,
  controlAccountCode = DEFAULT_AR_CONTROL_CODE,
}) {
  const invoiceFilter = {};
  if (branchId) invoiceFilter.branchId = branchId;

  const invoices = (await runFind(InvoiceModel, invoiceFilter)) || [];
  const byBeneficiary = new Map();

  for (const inv of invoices) {
    const benefId = normalizeId(inv.beneficiary);
    if (!benefId) continue;
    const issue = inv.issueDate ? new Date(inv.issueDate) : null;
    if (issue && issue > new Date(asOfDate)) continue; // issued after the as-of date

    const total = Number(inv.totalAmount) || 0;
    const paid = Number(inv.amountPaid) || 0;
    const outstanding = Math.max(0, total - paid);
    const isFullyPaid = AR_PAID_STATUSES.has(inv.status) || outstanding === 0;

    if (!byBeneficiary.has(benefId)) {
      byBeneficiary.set(benefId, {
        beneficiary: benefId,
        branchId: normalizeId(inv.branchId),
        totalBilled: 0,
        totalPaid: 0,
        outstanding: 0,
        invoiceCount: 0,
        openInvoiceCount: 0,
        oldestOpenInvoice: null,
      });
    }
    const card = byBeneficiary.get(benefId);
    card.totalBilled += total;
    card.totalPaid += paid;
    card.outstanding += outstanding;
    card.invoiceCount += 1;
    if (!isFullyPaid && outstanding > 0) {
      card.openInvoiceCount += 1;
      const due = inv.dueDate ? new Date(inv.dueDate) : issue;
      if (due && (!card.oldestOpenInvoice || due < card.oldestOpenInvoice)) {
        card.oldestOpenInvoice = due;
      }
    }
  }

  const cards = Array.from(byBeneficiary.values())
    .map(c => ({
      ...c,
      totalBilled: round2(c.totalBilled),
      totalPaid: round2(c.totalPaid),
      outstanding: round2(c.outstanding),
      oldestOpenInvoice: c.oldestOpenInvoice ? c.oldestOpenInvoice.toISOString() : null,
    }))
    .sort((a, b) => b.outstanding - a.outstanding);

  const totals = cards.reduce(
    (acc, c) => ({
      billed: acc.billed + c.totalBilled,
      paid: acc.paid + c.totalPaid,
      outstanding: acc.outstanding + c.outstanding,
    }),
    { billed: 0, paid: 0, outstanding: 0 }
  );

  let reconciliation = null;
  if (JournalEntryModel) {
    reconciliation = await reconcileControlAccount({
      JournalEntryModel,
      controlAccountCode,
      asOfDate,
      branchId,
      subsidiaryTotal: totals.outstanding,
      normalSide: 'debit',
    });
  }

  return {
    asOfDate: new Date(asOfDate).toISOString(),
    branchId: normalizeId(branchId),
    controlAccountCode,
    cards,
    totals: {
      billed: round2(totals.billed),
      paid: round2(totals.paid),
      outstanding: round2(totals.outstanding),
      counterparties: cards.length,
    },
    reconciliation,
  };
}

/**
 * Build the AP subsidiary ledger. One card per vendor.
 *
 * Input:
 *   ExpenseModel — AccountingExpense with { vendor, branch_id, amount, status,
 *                                           paid, paidAt, date, dueDate }
 */
async function buildAccountsPayableLedger({
  ExpenseModel,
  JournalEntryModel = null,
  asOfDate = new Date(),
  branchId = null,
  controlAccountCode = DEFAULT_AP_CONTROL_CODE,
}) {
  const filter = { status: { $in: ['approved', 'pending'] } };
  if (branchId) filter.branch_id = branchId;

  const expenses = (await runFind(ExpenseModel, filter)) || [];
  const byVendor = new Map();

  for (const e of expenses) {
    const vendor = (e.vendor && String(e.vendor).trim()) || '(no-vendor)';
    const d = e.date ? new Date(e.date) : null;
    if (d && d > new Date(asOfDate)) continue;
    const amount = Number(e.amount) || 0;
    const isPaid = e.paid === true || !!e.paidAt;
    const outstanding = isPaid ? 0 : amount;

    if (!byVendor.has(vendor)) {
      byVendor.set(vendor, {
        vendor,
        branchId: normalizeId(e.branch_id),
        totalInvoiced: 0,
        totalPaid: 0,
        outstanding: 0,
        invoiceCount: 0,
        openInvoiceCount: 0,
        oldestOpenInvoice: null,
      });
    }
    const card = byVendor.get(vendor);
    card.totalInvoiced += amount;
    card.totalPaid += isPaid ? amount : 0;
    card.outstanding += outstanding;
    card.invoiceCount += 1;
    if (!isPaid) {
      card.openInvoiceCount += 1;
      const due = e.dueDate ? new Date(e.dueDate) : d;
      if (due && (!card.oldestOpenInvoice || due < card.oldestOpenInvoice)) {
        card.oldestOpenInvoice = due;
      }
    }
  }

  const cards = Array.from(byVendor.values())
    .map(c => ({
      ...c,
      totalInvoiced: round2(c.totalInvoiced),
      totalPaid: round2(c.totalPaid),
      outstanding: round2(c.outstanding),
      oldestOpenInvoice: c.oldestOpenInvoice ? c.oldestOpenInvoice.toISOString() : null,
    }))
    .sort((a, b) => b.outstanding - a.outstanding);

  const totals = cards.reduce(
    (acc, c) => ({
      invoiced: acc.invoiced + c.totalInvoiced,
      paid: acc.paid + c.totalPaid,
      outstanding: acc.outstanding + c.outstanding,
    }),
    { invoiced: 0, paid: 0, outstanding: 0 }
  );

  let reconciliation = null;
  if (JournalEntryModel) {
    reconciliation = await reconcileControlAccount({
      JournalEntryModel,
      controlAccountCode,
      asOfDate,
      branchId,
      subsidiaryTotal: totals.outstanding,
      normalSide: 'credit',
    });
  }

  return {
    asOfDate: new Date(asOfDate).toISOString(),
    branchId: normalizeId(branchId),
    controlAccountCode,
    cards,
    totals: {
      invoiced: round2(totals.invoiced),
      paid: round2(totals.paid),
      outstanding: round2(totals.outstanding),
      counterparties: cards.length,
    },
    reconciliation,
  };
}

/**
 * Sum posted journal entry lines for a control account and compare to
 * the subsidiary total. Returns { controlBalance, subsidiaryTotal,
 * difference, isReconciled }.
 *
 * normalSide: 'debit' for AR (asset), 'credit' for AP (liability).
 */
async function reconcileControlAccount({
  JournalEntryModel,
  controlAccountCode,
  asOfDate,
  branchId = null,
  subsidiaryTotal,
  normalSide = 'debit',
}) {
  const filter = { status: 'posted', deleted_at: null };
  if (asOfDate) filter.entry_date = { $lte: new Date(asOfDate) };
  if (branchId) filter.branch_id = branchId;
  const entries = (await runFind(JournalEntryModel, filter)) || [];

  let debit = 0;
  let credit = 0;
  for (const e of entries) {
    for (const l of e.lines || []) {
      if (l.account_code !== controlAccountCode) continue;
      debit += Number(l.debit) || 0;
      credit += Number(l.credit) || 0;
    }
  }
  const controlBalance = normalSide === 'credit' ? credit - debit : debit - credit;
  const difference = round2(controlBalance - subsidiaryTotal);

  return {
    controlAccountCode,
    normalSide,
    totals: { debit: round2(debit), credit: round2(credit) },
    controlBalance: round2(controlBalance),
    subsidiaryTotal: round2(subsidiaryTotal),
    difference,
    isReconciled: Math.abs(difference) < 0.01,
  };
}

module.exports = {
  buildAccountsReceivableLedger,
  buildAccountsPayableLedger,
  reconcileControlAccount,
  DEFAULT_AR_CONTROL_CODE,
  DEFAULT_AP_CONTROL_CODE,
};
