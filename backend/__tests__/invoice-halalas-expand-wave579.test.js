'use strict';

/**
 * W579 — Invoice halalas EXPAND reconciliation (audit #5 Phase 1).
 *
 * Verifies the pure derivation (applyInvoiceHalalas) that the FinanceInvoice
 * pre('save') hook uses to dual-write integer-halalas siblings, PLUS static
 * assertions that the model actually declares the sibling fields and wires the
 * derive into its hook. Pure (no DB / no mongoose) so it needs no sprint
 * enumeration; integration through a real save is covered by the hook calling
 * the same function (asserted statically here).
 */

const fs = require('fs');
const path = require('path');
const { INVOICE_MONEY_FIELDS, applyInvoiceHalalas } = require('../intelligence/invoice-money.lib');
const { toHalalas } = require('../intelligence/money.lib');

describe('invoice halalas expand — W579', () => {
  describe('applyInvoiceHalalas (derivation)', () => {
    it('derives an integer-halalas sibling for every money field', () => {
      const doc = {
        subtotal: 100,
        discount_total: 10,
        taxable_amount: 90,
        vat_amount: 13.5,
        total_amount: 103.5,
        paid_amount: 50,
        balance_due: 53.5,
        insurance_coverage_amount: 40,
        patient_share_amount: 13.5,
      };
      applyInvoiceHalalas(doc);
      for (const f of INVOICE_MONEY_FIELDS) {
        expect(doc[`${f}_halalas`]).toBe(toHalalas(doc[f]));
        expect(Number.isInteger(doc[`${f}_halalas`])).toBe(true);
      }
      expect(doc.total_amount_halalas).toBe(10350);
      expect(doc.vat_amount_halalas).toBe(1350);
    });

    it('handles a VAT/float-trap invoice exactly', () => {
      // 19.99 taxable @ 15% → 2.9985 → 3.00; total 22.99
      const doc = { taxable_amount: 19.99, vat_amount: 3.0, total_amount: 22.99 };
      applyInvoiceHalalas(doc);
      expect(doc.taxable_amount_halalas).toBe(1999);
      expect(doc.vat_amount_halalas).toBe(300);
      expect(doc.total_amount_halalas).toBe(2299);
    });

    it('treats missing/null money fields as 0 halalas', () => {
      const doc = { total_amount: 100 };
      applyInvoiceHalalas(doc);
      expect(doc.total_amount_halalas).toBe(10000);
      expect(doc.paid_amount_halalas).toBe(0);
      expect(doc.balance_due_halalas).toBe(0);
    });

    it('reconciles: sibling always equals toHalalas(float)', () => {
      const doc = { subtotal: 12345.67, vat_amount: 1851.85, total_amount: 14197.52 };
      applyInvoiceHalalas(doc);
      expect(doc.subtotal_halalas).toBe(1234567);
      expect(doc.total_amount_halalas).toBe(1419752);
    });
  });

  describe('model wiring (static)', () => {
    const src = fs.readFileSync(
      path.join(__dirname, '..', 'models', 'finance', 'Invoice.js'),
      'utf8'
    );

    it('declares an integer-halalas sibling field for each money field', () => {
      for (const f of INVOICE_MONEY_FIELDS) {
        expect(src).toMatch(new RegExp(`${f}_halalas\\s*:\\s*\\{[^}]*type:\\s*Number`));
      }
    });

    it('calls applyInvoiceHalalas inside the pre-save hook', () => {
      expect(src).toMatch(/applyInvoiceHalalas\(this\)/);
      expect(src).toMatch(/invoice-money\.lib/);
    });
  });
});
