/**
 * invoiceObservations.js — Beneficiary-360 Commit 11b.
 *
 * Real observation adapter for:
 *
 *   financial.invoice.overdue.60d
 *     → overdueForBeneficiary(beneficiaryId) →
 *       { maxDaysOverdue: <number> }
 *
 * Registered under `invoiceService` in the locator. Reads directly
 * from the Invoice model.
 *
 * Design decisions:
 *
 *   1. "Overdue" means the invoice has a `dueDate` in the past AND
 *      its `status` is not one of the terminal-resolved values
 *      (`PAID`, `CANCELLED`). Status `OVERDUE` obviously counts;
 *      `ISSUED` and `PARTIALLY_PAID` count if the due date has
 *      passed. `DRAFT` never counts — it's not owed yet.
 *
 *   2. We return the MAX days-overdue across the beneficiary's
 *      unpaid invoices. A single very-old invoice is what
 *      triggers the flag, not the count.
 *
 *   3. No history → 0 days overdue → flag clear. Clean slate, no
 *      noise.
 *
 *   4. Clock injection for deterministic tests — `options.now`.
 */

'use strict';

const DEFAULT_MODEL = requireOptional('../../models/Invoice');

const MS_PER_DAY = 24 * 3600 * 1000;

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

// Statuses we consider "open" for overdue calculation. An invoice
// in any OTHER status (PAID / CANCELLED) is settled and cannot be
// overdue, regardless of dueDate.
const OPEN_STATUSES = Object.freeze(['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'OVERDUE']);

function createInvoiceObservations(deps = {}) {
  const Model = deps.model || DEFAULT_MODEL;
  if (Model == null) {
    throw new Error('invoiceObservations: Invoice model is required');
  }

  async function overdueForBeneficiary(beneficiaryId, options = {}) {
    const now = options.now instanceof Date ? options.now : new Date();
    const rows = await Model.find(
      {
        beneficiary: beneficiaryId,
        status: { $in: OPEN_STATUSES },
        dueDate: { $lt: now },
      },
      'dueDate status'
    )
      .sort({ dueDate: 1 })
      .limit(50)
      .lean();

    if (rows.length === 0) return { maxDaysOverdue: 0 };

    // DRAFT doesn't count as owed — skip even if dueDate somehow set
    const billable = rows.filter(r => r.status !== 'DRAFT');
    if (billable.length === 0) return { maxDaysOverdue: 0 };

    // Oldest (smallest dueDate) is the most overdue after the sort+filter
    const oldest = billable[0];
    const days = Math.floor((now.getTime() - new Date(oldest.dueDate).getTime()) / MS_PER_DAY);
    return { maxDaysOverdue: Math.max(0, days) };
  }

  return Object.freeze({ overdueForBeneficiary });
}

module.exports = { createInvoiceObservations };
