/**
 * financialStatementsService.js — Phase 12 Commit 1.
 *
 * Core finance reports that were missing from the stack:
 *   - Trial Balance
 *   - Profit & Loss (P&L)
 *   - Cash Flow (indirect, from cash-account movements)
 *   - Budget vs Actual (per branch + consolidated)
 *   - Aged Receivables / Aged Payables
 *   - Branch consolidation (roll-up of per-branch P&L into a group view)
 *
 * Designed as pure, injectable builders. Models are passed in so the
 * service is unit-testable without a live Mongo instance — matching
 * the pattern in services/reporting/builders/financeReportBuilder.js.
 *
 * All amounts are in SAR. All dates are UTC. Status filter on journal
 * lines is always 'posted' (drafts and reversed entries never hit a
 * financial statement).
 */

'use strict';

const DEFAULT_AGING_BUCKETS = [
  { label: '0-30', min: 0, max: 30 },
  { label: '31-60', min: 31, max: 60 },
  { label: '61-90', min: 61, max: 90 },
  { label: '91-120', min: 91, max: 120 },
  { label: '120+', min: 121, max: Infinity },
];

const CASH_ACCOUNT_SUBTYPES = new Set(['cash', 'bank', 'current_asset_cash']);
const CASH_ACCOUNT_CODES = new Set(['1100', '1110', '1120', '1130']);

function toDate(d) {
  return d instanceof Date ? d : new Date(d);
}

function round2(n) {
  return Math.round((Number(n) || 0) * 100) / 100;
}

function normalizeBranchId(branchId) {
  if (branchId === null || branchId === undefined) return null;
  return String(branchId);
}

/**
 * Filter posted journal entry lines within a window and branch scope.
 * Returns a flat list of { account_code, debit, credit, branch_id, date }.
 */
async function collectPostedLines({ JournalEntryModel, startDate, endDate, branchId, asOfDate }) {
  const filter = { status: 'posted', deleted_at: null };
  if (asOfDate) {
    filter.entry_date = { $lte: toDate(asOfDate) };
  } else if (startDate || endDate) {
    filter.entry_date = {};
    if (startDate) filter.entry_date.$gte = toDate(startDate);
    if (endDate) filter.entry_date.$lte = toDate(endDate);
  }
  if (branchId) filter.branch_id = branchId;

  const entries = (await JournalEntryModel.find(filter).lean)
    ? await JournalEntryModel.find(filter).lean()
    : await JournalEntryModel.find(filter);

  const lines = [];
  for (const e of entries || []) {
    for (const l of e.lines || []) {
      lines.push({
        account_code: l.account_code,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        branch_id: normalizeBranchId(e.branch_id),
        entry_date: e.entry_date,
        entry_type: e.entry_type,
        cost_center: l.cost_center || null,
      });
    }
  }
  return lines;
}

/**
 * Trial Balance — account-by-account net debit/credit as of a date.
 * Output: { asOfDate, branchId, rows: [{code, name, type, debit, credit, balance}], totals }.
 * Invariant: sum(debit) == sum(credit).
 */
async function buildTrialBalance({
  JournalEntryModel,
  ChartOfAccountModel,
  asOfDate,
  branchId = null,
}) {
  const lines = await collectPostedLines({ JournalEntryModel, asOfDate, branchId });
  const coa =
    (await (ChartOfAccountModel.find({ is_active: true }).lean
      ? ChartOfAccountModel.find({ is_active: true }).lean()
      : ChartOfAccountModel.find({ is_active: true }))) || [];

  const accountMap = new Map();
  for (const a of coa) {
    accountMap.set(a.code, {
      code: a.code,
      name_ar: a.name_ar,
      name_en: a.name_en,
      account_type: a.account_type,
      normal_balance: a.normal_balance,
      debit: 0,
      credit: 0,
    });
  }

  for (const l of lines) {
    if (!accountMap.has(l.account_code)) {
      accountMap.set(l.account_code, {
        code: l.account_code,
        name_ar: `(account ${l.account_code})`,
        name_en: null,
        account_type: 'unknown',
        normal_balance: 'debit',
        debit: 0,
        credit: 0,
      });
    }
    const row = accountMap.get(l.account_code);
    row.debit += l.debit;
    row.credit += l.credit;
  }

  const rows = Array.from(accountMap.values())
    .filter(r => r.debit > 0 || r.credit > 0)
    .map(r => ({
      ...r,
      debit: round2(r.debit),
      credit: round2(r.credit),
      balance:
        r.normal_balance === 'credit' ? round2(r.credit - r.debit) : round2(r.debit - r.credit),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));

  const totals = rows.reduce(
    (acc, r) => ({ debit: acc.debit + r.debit, credit: acc.credit + r.credit }),
    { debit: 0, credit: 0 }
  );

  return {
    asOfDate: asOfDate ? toDate(asOfDate).toISOString() : null,
    branchId: normalizeBranchId(branchId),
    rows,
    totals: {
      debit: round2(totals.debit),
      credit: round2(totals.credit),
      isBalanced: Math.abs(totals.debit - totals.credit) < 0.01,
    },
  };
}

/**
 * Profit & Loss — revenue / expense aggregation for a period.
 * Output: { period, branchId, revenue:{byAccount,total}, expenses:{byAccount,total,byCategory}, grossProfit, netIncome }.
 */
async function buildProfitAndLoss({
  JournalEntryModel,
  ChartOfAccountModel,
  startDate,
  endDate,
  branchId = null,
}) {
  const lines = await collectPostedLines({ JournalEntryModel, startDate, endDate, branchId });
  const coa =
    (await (ChartOfAccountModel.find({ is_active: true }).lean
      ? ChartOfAccountModel.find({ is_active: true }).lean()
      : ChartOfAccountModel.find({ is_active: true }))) || [];

  const byCode = new Map();
  for (const a of coa) byCode.set(a.code, a);

  const revenue = new Map();
  const expenses = new Map();

  for (const l of lines) {
    const acc = byCode.get(l.account_code);
    if (!acc) continue;
    if (acc.account_type === 'revenue') {
      const amt = l.credit - l.debit;
      const cur = revenue.get(acc.code) || { code: acc.code, name_ar: acc.name_ar, amount: 0 };
      cur.amount += amt;
      revenue.set(acc.code, cur);
    } else if (acc.account_type === 'expense') {
      const amt = l.debit - l.credit;
      const cur = expenses.get(acc.code) || {
        code: acc.code,
        name_ar: acc.name_ar,
        subtype: acc.account_subtype || 'general',
        amount: 0,
      };
      cur.amount += amt;
      expenses.set(acc.code, cur);
    }
  }

  const revenueRows = Array.from(revenue.values()).map(r => ({ ...r, amount: round2(r.amount) }));
  const expenseRows = Array.from(expenses.values()).map(r => ({ ...r, amount: round2(r.amount) }));

  const totalRevenue = round2(revenueRows.reduce((s, r) => s + r.amount, 0));
  const totalExpenses = round2(expenseRows.reduce((s, r) => s + r.amount, 0));

  const byCategory = {};
  for (const e of expenseRows) {
    byCategory[e.subtype] = round2((byCategory[e.subtype] || 0) + e.amount);
  }

  return {
    period: {
      startDate: startDate ? toDate(startDate).toISOString() : null,
      endDate: endDate ? toDate(endDate).toISOString() : null,
    },
    branchId: normalizeBranchId(branchId),
    revenue: {
      byAccount: revenueRows.sort((a, b) => b.amount - a.amount),
      total: totalRevenue,
    },
    expenses: {
      byAccount: expenseRows.sort((a, b) => b.amount - a.amount),
      byCategory,
      total: totalExpenses,
    },
    grossProfit: round2(totalRevenue - totalExpenses),
    netIncome: round2(totalRevenue - totalExpenses),
  };
}

/**
 * Cash Flow — movements on cash/bank accounts over the period, grouped by entry_type.
 * This is a simplified direct method: inflows/outflows per source category.
 */
async function buildCashFlow({
  JournalEntryModel,
  ChartOfAccountModel,
  startDate,
  endDate,
  branchId = null,
}) {
  const lines = await collectPostedLines({ JournalEntryModel, startDate, endDate, branchId });
  const coa =
    (await (ChartOfAccountModel.find({ is_active: true }).lean
      ? ChartOfAccountModel.find({ is_active: true }).lean()
      : ChartOfAccountModel.find({ is_active: true }))) || [];

  const cashCodes = new Set();
  for (const a of coa) {
    if (
      CASH_ACCOUNT_SUBTYPES.has(String(a.account_subtype || '').toLowerCase()) ||
      CASH_ACCOUNT_CODES.has(a.code)
    ) {
      cashCodes.add(a.code);
    }
  }
  for (const code of CASH_ACCOUNT_CODES) cashCodes.add(code);

  const byType = new Map();
  let inflow = 0;
  let outflow = 0;

  for (const l of lines) {
    if (!cashCodes.has(l.account_code)) continue;
    const net = l.debit - l.credit;
    const bucket = byType.get(l.entry_type) || { entry_type: l.entry_type, inflow: 0, outflow: 0 };
    if (net >= 0) {
      bucket.inflow += net;
      inflow += net;
    } else {
      bucket.outflow += Math.abs(net);
      outflow += Math.abs(net);
    }
    byType.set(l.entry_type, bucket);
  }

  const rows = Array.from(byType.values()).map(r => ({
    entry_type: r.entry_type,
    inflow: round2(r.inflow),
    outflow: round2(r.outflow),
    net: round2(r.inflow - r.outflow),
  }));

  return {
    period: {
      startDate: startDate ? toDate(startDate).toISOString() : null,
      endDate: endDate ? toDate(endDate).toISOString() : null,
    },
    branchId: normalizeBranchId(branchId),
    byType: rows,
    totals: {
      inflow: round2(inflow),
      outflow: round2(outflow),
      net: round2(inflow - outflow),
    },
  };
}

/**
 * Budget vs Actual — compares Budget.lines.amount to posted journal entry activity
 * for the same accounts in the same fiscal year.
 */
async function buildBudgetVsActual({
  BudgetModel,
  JournalEntryModel,
  ChartOfAccountModel,
  fiscalYear,
  branchId = null,
}) {
  const budgetFilter = { fiscalYear, isDeleted: { $ne: true } };
  if (branchId) budgetFilter.branch_id = branchId;

  const budgets =
    (await (BudgetModel.find(budgetFilter).lean
      ? BudgetModel.find(budgetFilter).lean()
      : BudgetModel.find(budgetFilter))) || [];

  if (budgets.length === 0) {
    return {
      fiscalYear,
      branchId: normalizeBranchId(branchId),
      lines: [],
      totals: { budgeted: 0, actual: 0, variance: 0, variancePct: 0 },
    };
  }

  const windowStart = new Date(Date.UTC(fiscalYear, 0, 1));
  const windowEnd = new Date(Date.UTC(fiscalYear, 11, 31, 23, 59, 59, 999));

  const lines = await collectPostedLines({
    JournalEntryModel,
    startDate: windowStart,
    endDate: windowEnd,
    branchId,
  });
  const coa =
    (await (ChartOfAccountModel.find({}).lean
      ? ChartOfAccountModel.find({}).lean()
      : ChartOfAccountModel.find({}))) || [];

  const codeOfAccountId = new Map();
  const accountByCode = new Map();
  for (const a of coa) {
    accountByCode.set(a.code, a);
    if (a._id) codeOfAccountId.set(String(a._id), a.code);
  }

  const actualByCode = new Map();
  for (const l of lines) {
    const acc = accountByCode.get(l.account_code);
    if (!acc) continue;
    const amt = acc.account_type === 'revenue' ? l.credit - l.debit : l.debit - l.credit;
    actualByCode.set(l.account_code, (actualByCode.get(l.account_code) || 0) + amt);
  }

  const result = [];
  for (const b of budgets) {
    for (const line of b.lines || []) {
      const code = codeOfAccountId.get(String(line.accountId)) || line.account_code;
      const budgeted = Number(line.amount) || 0;
      const actual = round2(actualByCode.get(code) || 0);
      const variance = round2(budgeted - actual);
      const variancePct = budgeted > 0 ? round2((variance / budgeted) * 100) : 0;
      result.push({
        budgetName: b.name,
        accountCode: code,
        accountName: accountByCode.get(code)?.name_ar || null,
        budgeted: round2(budgeted),
        actual,
        variance,
        variancePct,
        status: variance < 0 ? 'over' : variance > 0 ? 'under' : 'on-target',
      });
    }
  }

  const totals = result.reduce(
    (acc, r) => ({
      budgeted: acc.budgeted + r.budgeted,
      actual: acc.actual + r.actual,
    }),
    { budgeted: 0, actual: 0 }
  );
  totals.variance = round2(totals.budgeted - totals.actual);
  totals.variancePct = totals.budgeted > 0 ? round2((totals.variance / totals.budgeted) * 100) : 0;
  totals.budgeted = round2(totals.budgeted);
  totals.actual = round2(totals.actual);

  return { fiscalYear, branchId: normalizeBranchId(branchId), lines: result, totals };
}

/**
 * Age an invoice-like record. Uses dueDate; falls back to issueDate + 30d.
 */
function ageInDays(record, asOfDate) {
  const due = record.dueDate
    ? toDate(record.dueDate)
    : record.issueDate
      ? new Date(toDate(record.issueDate).getTime() + 30 * 24 * 3600 * 1000)
      : record.date
        ? new Date(toDate(record.date).getTime() + 30 * 24 * 3600 * 1000)
        : null;
  if (!due) return 0;
  const ms = toDate(asOfDate).getTime() - due.getTime();
  return Math.max(0, Math.floor(ms / (24 * 3600 * 1000)));
}

function bucketize(days, buckets) {
  for (const b of buckets) {
    if (days >= b.min && days <= b.max) return b.label;
  }
  return buckets[buckets.length - 1].label;
}

/**
 * Aged Receivables — groups unpaid invoices into aging buckets.
 * Expects InvoiceModel documents with { totalAmount, amountPaid, status, issueDate, dueDate, branchId, beneficiary }.
 */
async function buildAgedReceivables({
  InvoiceModel,
  asOfDate = new Date(),
  branchId = null,
  buckets = DEFAULT_AGING_BUCKETS,
  unpaidStatuses = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'],
}) {
  const filter = { status: { $in: unpaidStatuses } };
  if (branchId) filter.branchId = branchId;

  const invoices =
    (await (InvoiceModel.find(filter).lean
      ? InvoiceModel.find(filter).lean()
      : InvoiceModel.find(filter))) || [];

  const bucketMap = new Map(
    buckets.map(b => [b.label, { label: b.label, count: 0, outstanding: 0 }])
  );
  const rows = [];
  let total = 0;

  for (const inv of invoices) {
    const paid = Number(inv.amountPaid) || 0;
    const outstanding = Math.max(0, (Number(inv.totalAmount) || 0) - paid);
    if (outstanding <= 0) continue;
    const days = ageInDays(inv, asOfDate);
    const label = bucketize(days, buckets);
    rows.push({
      invoiceId: inv._id ? String(inv._id) : null,
      invoiceNumber: inv.invoiceNumber || inv.invoice_number,
      branchId: normalizeBranchId(inv.branchId || inv.branch_id),
      beneficiary: inv.beneficiary ? String(inv.beneficiary) : null,
      outstanding: round2(outstanding),
      daysOverdue: days,
      bucket: label,
    });
    total += outstanding;
    const b = bucketMap.get(label);
    b.count += 1;
    b.outstanding = round2(b.outstanding + outstanding);
  }

  return {
    asOfDate: toDate(asOfDate).toISOString(),
    branchId: normalizeBranchId(branchId),
    buckets: Array.from(bucketMap.values()),
    rows,
    totalOutstanding: round2(total),
  };
}

/**
 * Aged Payables — groups unpaid expenses (approved but not yet paid) into aging buckets.
 * Uses AccountingExpense status==='approved' and a paid flag if present.
 */
async function buildAgedPayables({
  ExpenseModel,
  asOfDate = new Date(),
  branchId = null,
  buckets = DEFAULT_AGING_BUCKETS,
}) {
  const filter = { status: 'approved' };
  if (branchId) filter.branch_id = branchId;

  const expenses =
    (await (ExpenseModel.find(filter).lean
      ? ExpenseModel.find(filter).lean()
      : ExpenseModel.find(filter))) || [];

  const bucketMap = new Map(
    buckets.map(b => [b.label, { label: b.label, count: 0, outstanding: 0 }])
  );
  const rows = [];
  let total = 0;

  for (const e of expenses) {
    if (e.paid === true || e.paidAt) continue;
    const outstanding = Number(e.amount) || 0;
    if (outstanding <= 0) continue;
    const days = ageInDays({ date: e.date, dueDate: e.dueDate }, asOfDate);
    const label = bucketize(days, buckets);
    rows.push({
      expenseId: e._id ? String(e._id) : null,
      vendor: e.vendor || null,
      category: e.category,
      branchId: normalizeBranchId(e.branch_id),
      outstanding: round2(outstanding),
      daysOverdue: days,
      bucket: label,
    });
    total += outstanding;
    const b = bucketMap.get(label);
    b.count += 1;
    b.outstanding = round2(b.outstanding + outstanding);
  }

  return {
    asOfDate: toDate(asOfDate).toISOString(),
    branchId: normalizeBranchId(branchId),
    buckets: Array.from(bucketMap.values()),
    rows,
    totalOutstanding: round2(total),
  };
}

/**
 * Branch Consolidation — roll up an array of per-branch P&L outputs into a group view.
 * Input is the raw output shape of buildProfitAndLoss. Inter-branch eliminations are
 * caller-provided (eliminate: [{accountCode, amount}]).
 */
function consolidateBranchStatements({ branchStatements = [], eliminations = [] }) {
  const revenueByAccount = new Map();
  const expenseByAccount = new Map();
  const byCategory = {};
  const branches = [];

  for (const s of branchStatements) {
    branches.push({
      branchId: s.branchId,
      revenue: s.revenue.total,
      expenses: s.expenses.total,
      netIncome: s.netIncome,
    });
    for (const r of s.revenue.byAccount || []) {
      const cur = revenueByAccount.get(r.code) || { code: r.code, name_ar: r.name_ar, amount: 0 };
      cur.amount += r.amount;
      revenueByAccount.set(r.code, cur);
    }
    for (const e of s.expenses.byAccount || []) {
      const cur = expenseByAccount.get(e.code) || {
        code: e.code,
        name_ar: e.name_ar,
        subtype: e.subtype,
        amount: 0,
      };
      cur.amount += e.amount;
      expenseByAccount.set(e.code, cur);
      byCategory[e.subtype] = (byCategory[e.subtype] || 0) + e.amount;
    }
  }

  for (const elim of eliminations) {
    if (revenueByAccount.has(elim.accountCode)) {
      const r = revenueByAccount.get(elim.accountCode);
      r.amount -= elim.amount;
    }
    if (expenseByAccount.has(elim.accountCode)) {
      const e = expenseByAccount.get(elim.accountCode);
      e.amount -= elim.amount;
      byCategory[e.subtype] = (byCategory[e.subtype] || 0) - elim.amount;
    }
  }

  const revenueRows = Array.from(revenueByAccount.values())
    .map(r => ({ ...r, amount: round2(r.amount) }))
    .sort((a, b) => b.amount - a.amount);
  const expenseRows = Array.from(expenseByAccount.values())
    .map(r => ({ ...r, amount: round2(r.amount) }))
    .sort((a, b) => b.amount - a.amount);

  const totalRevenue = round2(revenueRows.reduce((s, r) => s + r.amount, 0));
  const totalExpenses = round2(expenseRows.reduce((s, r) => s + r.amount, 0));
  const roundedByCategory = Object.fromEntries(
    Object.entries(byCategory).map(([k, v]) => [k, round2(v)])
  );

  return {
    scope: 'consolidated',
    branches,
    revenue: { byAccount: revenueRows, total: totalRevenue },
    expenses: { byAccount: expenseRows, byCategory: roundedByCategory, total: totalExpenses },
    eliminations,
    grossProfit: round2(totalRevenue - totalExpenses),
    netIncome: round2(totalRevenue - totalExpenses),
  };
}

module.exports = {
  buildTrialBalance,
  buildProfitAndLoss,
  buildCashFlow,
  buildBudgetVsActual,
  buildAgedReceivables,
  buildAgedPayables,
  consolidateBranchStatements,
  // exposed for testing
  _internal: {
    collectPostedLines,
    ageInDays,
    bucketize,
    DEFAULT_AGING_BUCKETS,
    CASH_ACCOUNT_CODES,
  },
};
