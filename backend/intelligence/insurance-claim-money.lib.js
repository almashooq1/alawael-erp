'use strict';

/**
 * Insurance-claim header-total reconciliation (W1451).
 *
 * The InsuranceClaim pre('save') hook used to recompute `total_claimed` /
 * `total_approved` from the line items on EVERY save (whenever items were present),
 * and derive `total_rejected` from them. That silently overwrote an explicitly-set
 * total: `FinanceService.processClaimResponse(id, [], totalApproved)` records a
 * lump-sum insurer remittance by setting `claim.total_approved` WITHOUT per-item
 * `approved_amount`s — the hook then reset it to `Σ items.approved_amount` (0),
 * losing the approved revenue and flipping the claim to rejected.
 *
 * Correct invariant (independent of lump-sum-vs-itemized policy): header totals are
 * DERIVED FROM ITEMS ONLY WHEN THE ITEMS CHANGE. An explicit total set without
 * touching items is respected. `total_rejected` is always the difference of the two
 * header totals, so it stays consistent either way.
 *
 * Pure + side-effect-light — unit-testable without a database.
 *
 * @param {object} doc - an InsuranceClaim document or plain object
 * @param {boolean} itemsChanged - true when the line items were added/modified
 *   (the hook passes `this.isNew || this.isModified('items')`)
 * @returns {object} the same doc
 */
function reconcileClaimTotals(doc, itemsChanged) {
  if (!doc) return doc;
  if (itemsChanged && Array.isArray(doc.items) && doc.items.length > 0) {
    doc.total_claimed = doc.items.reduce((s, i) => s + (Number(i.claimed_amount) || 0), 0);
    doc.total_approved = doc.items.reduce((s, i) => s + (Number(i.approved_amount) || 0), 0);
  }
  doc.total_rejected = (Number(doc.total_claimed) || 0) - (Number(doc.total_approved) || 0);
  return doc;
}

module.exports = { reconcileClaimTotals };
