/**
 * Finance money-correctness guards (2026-06-29 finance bug-hunt follow-up).
 * Companion to the IDOR fix (#690). Static source guards.
 *
 *  #6 field-drift — finance-module used `vat_total` / `remaining_amount`, but the
 *     Invoice schema has `vat_amount` / `balance_due` → VAT reports were always 0
 *     and the balance was never persisted (strict mode dropped the phantom path).
 *  #2 payment — `new Payment({ ...req.body })` mass-assign + no amount min/ceiling
 *     + non-atomic `paid_amount +=` → forged status/branch + negative/over payment
 *     + concurrent loss.
 *  #5 refund — recomputed paid_amount by blind subtraction; now re-sums payments.
 *  #3 journal — unbalanced entries could be created AND posted (model only
 *     computes is_balanced).
 *  #4 invoices-admin — pay/cancel had no status guard (re-pay / pay-cancelled).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const FIN = fs.readFileSync(path.join(__dirname, '../routes/finance-module.routes.js'), 'utf8');
const ADMIN = fs.readFileSync(path.join(__dirname, '../routes/invoices-admin.routes.js'), 'utf8');

describe('finance #6 — schema field drift fixed', () => {
  test('no vat_total / remaining_amount phantom paths remain', () => {
    expect(FIN).not.toMatch(/vat_total/);
    expect(FIN).not.toMatch(/remaining_amount/);
  });
  test('uses the real schema fields vat_amount + balance_due', () => {
    expect(FIN).toMatch(/balance_due/);
    expect(FIN).toMatch(/\$sum: '\$vat_amount'/);
  });
  test('no invalid invoice status values (partial/pending) assigned', () => {
    expect(FIN).not.toMatch(/status = [^;]*'partial'/);
    expect(FIN).not.toMatch(/status = [^;]*'pending'/);
    expect(FIN).toMatch(/partially_paid/);
  });
});

describe('finance #2/#5 — payment + refund hardening', () => {
  test('payment validates a finite, positive amount', () => {
    expect(FIN).toMatch(/Number\.isFinite\(amt\)\s*\|\|\s*amt <= 0/);
    expect(FIN).toMatch(/مبلغ الدفعة غير صالح/);
  });
  test('payment caps at the invoice balance (no over-payment)', () => {
    expect(FIN).toMatch(/المبلغ يتجاوز الرصيد المستحق/);
  });
  test('payment applies an atomic $inc to the invoice (no read-modify-write race)', () => {
    expect(FIN).toMatch(/\$inc: \{ paid_amount: amt \}/);
  });
  test('payment no longer spreads req.body straight into new Payment', () => {
    expect(FIN).not.toMatch(/new Payment\(\{\s*\.\.\.req\.body/);
  });
  test('refund recomputes paid_amount from completed payments (not blind subtraction)', () => {
    expect(FIN).toMatch(/Payment\.aggregate/);
    expect(FIN).not.toMatch(/paid_amount\s*\|\|\s*0\)\s*-\s*payment\.amount/);
  });
});

describe('finance #3 — journal double-entry integrity', () => {
  test('create rejects an unbalanced entry', () => {
    expect(FIN).toMatch(/القيد غير متوازن/);
  });
  test('approve only posts a balanced entry', () => {
    expect(FIN).toMatch(/status: 'draft', is_balanced: true/);
  });
});

describe('finance #4 — invoices-admin pay/cancel status guard', () => {
  test('pay + cancel guard status with $nin PAID/CANCELLED', () => {
    const guards = (ADMIN.match(/\$nin: \['PAID', 'CANCELLED'\]/g) || []).length;
    expect(guards).toBeGreaterThanOrEqual(3); // issue (pre-existing) + pay + cancel
  });
});
