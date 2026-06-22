'use strict';

/**
 * Invoice money-field halalas derivation (audit #5, Money-Type Migration —
 * Phase 1 EXPAND step for finance/Invoice.js).
 *
 * Pure, side-effect-light helper used by the FinanceInvoice pre('save') hook to
 * DUAL-WRITE an integer-halalas sibling for each header money field. The float
 * field stays the source of truth during expand+dual-write; reads cut over to
 * the *_halalas fields in a later phase. Kept standalone so it is unit-testable
 * without a database. See docs/architecture/MONEY_TYPE_MIGRATION_PLAN.md.
 */

const { toHalalas } = require('./money.lib');

// Header-level money fields on the invoice (NOT rates: vat_rate /
// discount_percentage are excluded; line-level fields are a later step).
const INVOICE_MONEY_FIELDS = Object.freeze([
  'subtotal',
  'discount_total',
  'taxable_amount',
  'vat_amount',
  'total_amount',
  'paid_amount',
  'balance_due',
  'insurance_coverage_amount',
  'patient_share_amount',
]);

const round2 = n => Math.round((Number(n) || 0) * 100) / 100;

/**
 * Recompute invoice header + line money fields from the line items (W1449).
 *
 * ZATCA Phase-2 requires the document totals to reconcile to the line items:
 * header tax === Σ line tax, header total === Σ line totals. The previous pre-save
 * hook accumulated the UNROUNDED per-line VAT into the header while storing the
 * ROUNDED VAT on each line, so `Σ round(vat) ≠ round(Σ vat)` and the header could
 * differ from the sum of the lines by ±0.01 per rounding boundary — a ZATCA UBL
 * validation breaker (and the wrong total flowed into the QR TLV + journal entry).
 *
 * This rounds each line to halalas FIRST, then sums the rounded line values for the
 * header, so the header always reconciles to the lines and `total === taxable + vat`.
 *
 * Mutates each line (taxable_amount, vat_amount, total_amount, discount_amount) and
 * the doc header (subtotal, discount_total, taxable_amount, vat_amount, total_amount,
 * balance_due). Pure w.r.t. external state — unit-testable without a database.
 *
 * @param {object} doc - a FinanceInvoice document or plain object with a `lines` array
 * @returns {object} the same doc
 */
function computeInvoiceTotals(doc) {
  if (!doc || !Array.isArray(doc.lines) || doc.lines.length === 0) return doc;
  let subtotal = 0;
  let discountTotal = 0;
  for (const line of doc.lines) {
    const lineTotal = (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
    const discountAmt =
      line.discount_amount || lineTotal * ((Number(line.discount_percentage) || 0) / 100);
    const taxable = lineTotal - discountAmt;
    const vat = taxable * ((Number(line.vat_rate) || 0) / 100);
    // Round each line to halalas first; the header sums the rounded line values.
    line.taxable_amount = round2(taxable);
    line.vat_amount = round2(vat);
    line.discount_amount = round2(discountAmt);
    line.total_amount = round2(line.taxable_amount + line.vat_amount);
    subtotal += lineTotal;
    discountTotal += discountAmt;
  }
  doc.subtotal = round2(subtotal);
  doc.discount_total = round2(discountTotal);
  doc.taxable_amount = round2(doc.lines.reduce((s, l) => s + l.taxable_amount, 0));
  doc.vat_amount = round2(doc.lines.reduce((s, l) => s + l.vat_amount, 0));
  doc.total_amount = round2(doc.lines.reduce((s, l) => s + l.total_amount, 0));
  doc.balance_due = round2(doc.total_amount - (Number(doc.paid_amount) || 0));
  return doc;
}

/**
 * Set `<field>_halalas` (integer) from each float money field on the doc.
 * Mutates and returns the doc. Missing/null floats derive to 0.
 * @param {object} doc - a FinanceInvoice document or plain object
 * @returns {object} the same doc
 */
function applyInvoiceHalalas(doc) {
  if (!doc) return doc;
  for (const f of INVOICE_MONEY_FIELDS) {
    const v = doc[f];
    doc[`${f}_halalas`] = v === undefined || v === null ? 0 : toHalalas(v);
  }
  return doc;
}

module.exports = { INVOICE_MONEY_FIELDS, applyInvoiceHalalas, computeInvoiceTotals };
