/**
 * financeReportBuilder.js — real builders for the 4 finance reports:
 *   - finance.claims.weekly          → buildClaimsPack
 *   - finance.collections.monthly    → buildCollectionsPack
 *   - finance.revenue.quarterly      → buildRevenueReview
 *   - finance.invoices.aging.weekly  → buildAgingReport
 *
 * Phase 10 Commit 7f.
 *
 * One primary data source: Invoice (models/Invoice.js). Its enums:
 *   status            : DRAFT | ISSUED | PARTIALLY_PAID | PAID |
 *                        CANCELLED | OVERDUE
 *   insurance.status  : PENDING | APPROVED | REJECTED
 *   paymentMethod     : CASH | CARD | TRANSFER | INSURANCE
 *   zatca.zatcaStatus : NOT_SUBMITTED | SUBMITTED | ACCEPTED | REJECTED
 *
 * All four builders share the branch-scope + periodKey grammar and
 * emit the standard `{ summary: {items, headlineMetric} }` contract.
 * Collections + revenue are catalog-flagged confidential — the engine
 * enforces the approval gate; these builders just produce JSON.
 */

'use strict';

const { parsePeriodKey, parseScopeKey } = require('./periodKey');

const PAID_STATUSES = ['PAID', 'PARTIALLY_PAID'];
const REVENUE_STATUSES = ['ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE']; // booked, not cancelled
const UNPAID_STATUSES = ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'];
const AGING_BUCKETS = ['0-30', '31-60', '61-90', '91+'];

// ─── Shared helpers ──────────────────────────────────────────────

async function listInvoices(Model, { start, end, branchId, dateField = 'issueDate', extra } = {}) {
  if (!Model) return [];
  const filter = {};
  if (start || end) {
    filter[dateField] = {};
    if (start) filter[dateField].$gte = start;
    if (end) filter[dateField].$lt = end;
  }
  if (branchId) filter.branchId = branchId;
  if (extra) Object.assign(filter, extra);
  try {
    return (await Model.find(filter)) || [];
  } catch (_) {
    return [];
  }
}

async function loadBranch(ctx, scope) {
  if (!scope || scope.type !== 'branch') return null;
  if (typeof ctx.loadBranch === 'function') {
    try {
      return (await ctx.loadBranch(scope.id)) || { id: scope.id };
    } catch (_) {
      return { id: scope.id };
    }
  }
  const Branch = ctx.models && (ctx.models.Branch?.model || ctx.models.Branch);
  if (!Branch || typeof Branch.findById !== 'function') return { id: scope.id };
  try {
    const b = await Branch.findById(scope.id);
    return b ? { id: String(b._id || b.id || scope.id), name: b.name || null } : { id: scope.id };
  } catch (_) {
    return { id: scope.id };
  }
}

function toSar(n) {
  if (!Number.isFinite(Number(n))) return 0;
  return Math.round(Number(n) * 100) / 100;
}

function formatSar(n) {
  if (!Number.isFinite(Number(n))) return '—';
  const v = toSar(n);
  return `${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SAR`;
}

function pct(num, den) {
  if (!Number.isFinite(num) || !Number.isFinite(den) || den <= 0) return null;
  return num / den;
}

function formatPct(x) {
  if (x == null || !Number.isFinite(x)) return '—';
  return `${Math.round(x * 1000) / 10}%`;
}

function daysBetween(a, b) {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms)) return null;
  return ms / (24 * 3600 * 1000);
}

function baseResult(report, fallbackId, periodKey, scopeKey, range) {
  return {
    reportType: (report && report.id) || fallbackId,
    periodKey,
    scopeKey: scopeKey || null,
    generatedAt: new Date().toISOString(),
    range: range ? { start: range.start.toISOString(), end: range.end.toISOString() } : null,
    branch: null,
    summary: { items: [], headlineMetric: null },
  };
}

function degradeOnBadPeriod(result, periodKey) {
  result.summary.items.push(`Unrecognised periodKey '${periodKey}' — report built empty.`);
  return result;
}

// ─── Rollups (pure) ──────────────────────────────────────────────

/**
 * Extract invoices that carry an insurance block — for claims reports.
 */
function rollupClaims(rows) {
  const bucket = { PENDING: 0, APPROVED: 0, REJECTED: 0, unknown: 0 };
  let claimedAmount = 0;
  let approvedAmount = 0;
  let rejectedAmount = 0;
  let withInsurance = 0;
  const byProvider = new Map();
  for (const r of rows || []) {
    if (!r || !r.insurance || !r.insurance.provider) continue;
    withInsurance += 1;
    const s = r.insurance.status || 'unknown';
    bucket[s] = (bucket[s] || 0) + 1;
    const coverage = Number(r.insurance.coverageAmount) || 0;
    claimedAmount += coverage;
    if (s === 'APPROVED') approvedAmount += coverage;
    if (s === 'REJECTED') rejectedAmount += coverage;
    const p = String(r.insurance.provider);
    const node = byProvider.get(p) || {
      providerId: p,
      claims: 0,
      approved: 0,
      rejected: 0,
      amount: 0,
    };
    node.claims += 1;
    if (s === 'APPROVED') node.approved += 1;
    if (s === 'REJECTED') node.rejected += 1;
    node.amount += coverage;
    byProvider.set(p, node);
  }
  const decided = bucket.APPROVED + bucket.REJECTED;
  return {
    withInsurance,
    byStatus: bucket,
    claimedAmount: toSar(claimedAmount),
    approvedAmount: toSar(approvedAmount),
    rejectedAmount: toSar(rejectedAmount),
    approvalRate: pct(bucket.APPROVED, decided),
    denialRate: pct(bucket.REJECTED, decided),
    byProvider: [...byProvider.values()]
      .map(p => ({ ...p, amount: toSar(p.amount) }))
      .sort((a, b) => b.amount - a.amount),
  };
}

/**
 * Sum paid-equivalent amounts for collections. PAID = full totalAmount;
 * PARTIALLY_PAID = we don't have a paid-to-date field, so we use
 * insurance.coverageAmount when present as a lower-bound estimate.
 * When the operator migrates in a `paidToDate` field, swap this.
 */
function rollupCollections(rows) {
  let collected = 0;
  let outstanding = 0;
  let invoicesPaid = 0;
  let invoicesOutstanding = 0;
  const dsoDays = [];
  for (const r of rows || []) {
    if (!r) continue;
    const total = Number(r.totalAmount) || 0;
    if (r.status === 'PAID') {
      collected += total;
      invoicesPaid += 1;
      const paidAt = r.updatedAt || r.closedAt;
      const d = daysBetween(r.issueDate, paidAt);
      if (d != null && d >= 0) dsoDays.push(d);
    } else if (r.status === 'PARTIALLY_PAID') {
      const covered = Number(r.insurance && r.insurance.coverageAmount) || 0;
      collected += covered;
      outstanding += Math.max(0, total - covered);
      invoicesPaid += 1;
    } else if (['ISSUED', 'OVERDUE'].includes(r.status)) {
      outstanding += total;
      invoicesOutstanding += 1;
    }
  }
  return {
    collected: toSar(collected),
    outstanding: toSar(outstanding),
    invoicesPaid,
    invoicesOutstanding,
    avgDsoDays: dsoDays.length
      ? Math.round((dsoDays.reduce((a, b) => a + b, 0) / dsoDays.length) * 10) / 10
      : null,
  };
}

function rollupRevenue(rows) {
  let booked = 0;
  let tax = 0;
  let discount = 0;
  let invoices = 0;
  const byMethod = {};
  for (const r of rows || []) {
    if (!r || !REVENUE_STATUSES.includes(r.status)) continue;
    invoices += 1;
    booked += Number(r.totalAmount) || 0;
    tax += Number(r.taxAmount) || 0;
    discount += Number(r.discount) || 0;
    const m = r.paymentMethod || 'unknown';
    byMethod[m] = (byMethod[m] || 0) + (Number(r.totalAmount) || 0);
  }
  return {
    invoices,
    booked: toSar(booked),
    tax: toSar(tax),
    discount: toSar(discount),
    avgInvoice: invoices > 0 ? toSar(booked / invoices) : 0,
    byPaymentMethod: Object.fromEntries(Object.entries(byMethod).map(([k, v]) => [k, toSar(v)])),
  };
}

function bucketAge(days) {
  if (!Number.isFinite(days) || days < 0) return null;
  if (days <= 30) return '0-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '91+';
}

function rollupAging(rows, now = new Date()) {
  const buckets = { '0-30': 0, '31-60': 0, '61-90': 0, '91+': 0 };
  const amounts = { '0-30': 0, '31-60': 0, '61-90': 0, '91+': 0 };
  let totalUnpaid = 0;
  let totalAmount = 0;
  for (const r of rows || []) {
    if (!r || !UNPAID_STATUSES.includes(r.status)) continue;
    if (!r.dueDate) continue;
    const days = daysBetween(r.dueDate, now);
    if (days == null || days < 0) continue; // not yet due
    const b = bucketAge(days);
    if (!b) continue;
    buckets[b] += 1;
    amounts[b] += Number(r.totalAmount) || 0;
    totalUnpaid += 1;
    totalAmount += Number(r.totalAmount) || 0;
  }
  return {
    totalUnpaid,
    totalAmount: toSar(totalAmount),
    buckets,
    amounts: Object.fromEntries(Object.entries(amounts).map(([k, v]) => [k, toSar(v)])),
  };
}

// ─── 1. buildClaimsPack (weekly) ─────────────────────────────────

async function buildClaimsPack({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'finance.claims.weekly', periodKey, scopeKey, range);
  Object.assign(result, {
    totals: { invoicesWithInsurance: 0, claimedAmount: 0, approvedAmount: 0, rejectedAmount: 0 },
    byStatus: { PENDING: 0, APPROVED: 0, REJECTED: 0 },
    approvalRate: null,
    denialRate: null,
    byProvider: [],
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  const branchId = scope && scope.type === 'branch' ? scope.id : null;
  const Invoice = ctx.models && (ctx.models.Invoice?.model || ctx.models.Invoice);
  const rows = await listInvoices(Invoice, {
    start: range.start,
    end: range.end,
    branchId,
  });
  const roll = rollupClaims(rows);
  result.totals = {
    invoicesWithInsurance: roll.withInsurance,
    claimedAmount: roll.claimedAmount,
    approvedAmount: roll.approvedAmount,
    rejectedAmount: roll.rejectedAmount,
  };
  result.byStatus = roll.byStatus;
  result.approvalRate = roll.approvalRate;
  result.denialRate = roll.denialRate;
  result.byProvider = roll.byProvider;
  result.branch = await loadBranch(ctx, scope);

  result.summary.items = [
    `Insurance-bearing invoices: ${roll.withInsurance}`,
    `Pending ${roll.byStatus.PENDING}; Approved ${roll.byStatus.APPROVED}; Rejected ${roll.byStatus.REJECTED}`,
    `Claimed: ${formatSar(roll.claimedAmount)} (approved ${formatSar(roll.approvedAmount)})`,
    roll.approvalRate != null ? `Approval rate: ${formatPct(roll.approvalRate)}` : null,
    roll.byProvider.length
      ? `Top provider: ${roll.byProvider[0].providerId} (${roll.byProvider[0].claims} claims)`
      : null,
  ].filter(Boolean);
  result.summary.headlineMetric = roll.withInsurance
    ? { label: 'denial rate', value: formatPct(roll.denialRate) }
    : null;
  return result;
}

// ─── 2. buildCollectionsPack (monthly, confidential) ─────────────

async function buildCollectionsPack({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'finance.collections.monthly', periodKey, scopeKey, range);
  Object.assign(result, {
    totals: { collected: 0, outstanding: 0, invoicesPaid: 0, invoicesOutstanding: 0 },
    avgDsoDays: null,
    collectionRate: null,
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  const branchId = scope && scope.type === 'branch' ? scope.id : null;
  const Invoice = ctx.models && (ctx.models.Invoice?.model || ctx.models.Invoice);
  const rows = await listInvoices(Invoice, {
    start: range.start,
    end: range.end,
    branchId,
  });
  const roll = rollupCollections(rows);
  result.totals = {
    collected: roll.collected,
    outstanding: roll.outstanding,
    invoicesPaid: roll.invoicesPaid,
    invoicesOutstanding: roll.invoicesOutstanding,
  };
  result.avgDsoDays = roll.avgDsoDays;
  result.collectionRate = pct(roll.collected, roll.collected + roll.outstanding);
  result.branch = await loadBranch(ctx, scope);

  result.summary.items = [
    `Collected: ${formatSar(roll.collected)} across ${roll.invoicesPaid} invoices`,
    `Outstanding: ${formatSar(roll.outstanding)} across ${roll.invoicesOutstanding} invoices`,
    result.avgDsoDays != null ? `Avg DSO: ${result.avgDsoDays} days` : null,
    result.collectionRate != null ? `Collection rate: ${formatPct(result.collectionRate)}` : null,
  ].filter(Boolean);
  result.summary.headlineMetric = {
    label: 'collected',
    value: formatSar(roll.collected),
  };
  return result;
}

// ─── 3. buildRevenueReview (quarterly, confidential) ─────────────

async function buildRevenueReview({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'finance.revenue.quarterly', periodKey, scopeKey, range);
  Object.assign(result, {
    totals: { invoices: 0, booked: 0, tax: 0, discount: 0, avgInvoice: 0 },
    byPaymentMethod: {},
    priorPeriod: null,
    growthRate: null,
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  const branchId = scope && scope.type === 'branch' ? scope.id : null;
  const Invoice = ctx.models && (ctx.models.Invoice?.model || ctx.models.Invoice);
  const rows = await listInvoices(Invoice, {
    start: range.start,
    end: range.end,
    branchId,
  });
  const current = rollupRevenue(rows);
  result.totals = {
    invoices: current.invoices,
    booked: current.booked,
    tax: current.tax,
    discount: current.discount,
    avgInvoice: current.avgInvoice,
  };
  result.byPaymentMethod = current.byPaymentMethod;

  // Prior-period growth: same-length window shifted back.
  const priorStart = new Date(
    range.start.getTime() - (range.end.getTime() - range.start.getTime())
  );
  const priorRows = await listInvoices(Invoice, {
    start: priorStart,
    end: range.start,
    branchId,
  });
  const prior = rollupRevenue(priorRows);
  result.priorPeriod = { booked: prior.booked, invoices: prior.invoices };
  result.growthRate = prior.booked > 0 ? (current.booked - prior.booked) / prior.booked : null;

  result.branch = await loadBranch(ctx, scope);

  result.summary.items = [
    `Booked revenue: ${formatSar(current.booked)} across ${current.invoices} invoices`,
    `Avg invoice: ${formatSar(current.avgInvoice)}; Tax: ${formatSar(current.tax)}; Discounts: ${formatSar(current.discount)}`,
    result.growthRate != null
      ? `Growth vs prior period: ${formatPct(result.growthRate)}`
      : 'Growth vs prior period: —',
  ];
  result.summary.headlineMetric = {
    label: 'booked revenue',
    value: formatSar(current.booked),
  };
  return result;
}

// ─── 4. buildAgingReport (weekly) ─────────────────────────────────

async function buildAgingReport({ report, periodKey, scopeKey, ctx = {} }) {
  const range = parsePeriodKey(periodKey);
  const scope = parseScopeKey(scopeKey);
  const result = baseResult(report, 'finance.invoices.aging.weekly', periodKey, scopeKey, range);
  Object.assign(result, {
    totals: { unpaidInvoices: 0, unpaidAmount: 0 },
    buckets: { '0-30': 0, '31-60': 0, '61-90': 0, '91+': 0 },
    amounts: { '0-30': 0, '31-60': 0, '61-90': 0, '91+': 0 },
    agingRatio: null,
  });
  if (!range) return degradeOnBadPeriod(result, periodKey);

  const branchId = scope && scope.type === 'branch' ? scope.id : null;
  const Invoice = ctx.models && (ctx.models.Invoice?.model || ctx.models.Invoice);
  // Aging is a point-in-time snapshot — we want every unpaid invoice,
  // not just those issued in the period. Query by status only.
  const filter = { status: { $in: UNPAID_STATUSES } };
  if (branchId) filter.branchId = branchId;
  let rows = [];
  try {
    const Model = Invoice && (Invoice.model || Invoice);
    rows = Model ? (await Model.find(filter)) || [] : [];
  } catch (_) {
    rows = [];
  }
  const roll = rollupAging(rows, (ctx.clock && ctx.clock.now && ctx.clock.now()) || range.end);
  result.totals = { unpaidInvoices: roll.totalUnpaid, unpaidAmount: roll.totalAmount };
  result.buckets = roll.buckets;
  result.amounts = roll.amounts;
  // Ratio of 90+ bucket over total unpaid (risk concentration).
  result.agingRatio = pct(roll.amounts['91+'], roll.totalAmount);
  result.branch = await loadBranch(ctx, scope);

  result.summary.items = [
    `Unpaid invoices: ${roll.totalUnpaid} (${formatSar(roll.totalAmount)})`,
    ...AGING_BUCKETS.map(
      b => `${b} days: ${roll.buckets[b]} invoices (${formatSar(roll.amounts[b])})`
    ),
    result.agingRatio != null ? `91+ concentration: ${formatPct(result.agingRatio)}` : null,
  ].filter(Boolean);
  result.summary.headlineMetric = roll.totalUnpaid
    ? { label: 'outstanding', value: formatSar(roll.totalAmount) }
    : null;
  return result;
}

module.exports = {
  buildClaimsPack,
  buildCollectionsPack,
  buildRevenueReview,
  buildAgingReport,
  // Exposed for tests:
  rollupClaims,
  rollupCollections,
  rollupRevenue,
  rollupAging,
  bucketAge,
  daysBetween,
  PAID_STATUSES,
  REVENUE_STATUSES,
  UNPAID_STATUSES,
  AGING_BUCKETS,
};
