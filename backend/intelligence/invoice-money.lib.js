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

module.exports = { INVOICE_MONEY_FIELDS, applyInvoiceHalalas };
