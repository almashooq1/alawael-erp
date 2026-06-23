'use strict';

/**
 * W1458 — finance update mass-assignment / missing-RBAC guard.
 *
 * BUG: routes/finance.routes.unified.js PUT /invoices/:id, /accounts/:id,
 * /cost-centers/:id, /fixed-assets/:id were gated only by authenticateToken +
 * requireBranchAccess (branch-only, no role) and spread raw `req.body` into
 * findByIdAndUpdate. Any authenticated user could PUT {status:"paid", paidAmount:0,...}
 * to mark an invoice paid (financial fraud) or overwrite an account balance.
 *
 * FIX: add createRBACMiddleware(['finance:update']) to the 4 PUTs (admin-tier, matching
 * the sibling create/read gates) + strip financial-state fields on the invoice PUT.
 */

const fs = require('fs');
const path = require('path');
const { stripProtectedFinanceFields, FINANCE_PROTECTED_FIELDS } = require('../utils/sanitize');

describe('W1458 stripProtectedFinanceFields', () => {
  test('strips financial-state fields (status / amounts / balance)', () => {
    const out = stripProtectedFinanceFields({
      customerName: 'X',
      status: 'paid',
      paidAmount: 9999,
      totalAmount: 0,
      remainingAmount: 0,
      subtotal: 0,
      vatAmount: 0,
      balance: 5,
      notes: 'ok',
    });
    expect(out).toEqual({ customerName: 'X', notes: 'ok' });
  });

  test('keeps non-protected fields (legitimate edits)', () => {
    expect(
      stripProtectedFinanceFields({ customerName: 'A', dueDate: 'd', items: [1], notes: 'n' })
    ).toEqual({ customerName: 'A', dueDate: 'd', items: [1], notes: 'n' });
  });

  test('protected set covers the AccountingInvoice money/state fields', () => {
    [
      'status',
      'paidAmount',
      'remainingAmount',
      'totalAmount',
      'subtotal',
      'vatAmount',
      'balance',
    ].forEach(f => expect(FINANCE_PROTECTED_FIELDS.has(f)).toBe(true));
  });
});

describe('W1458 finance PUT routes are RBAC-gated', () => {
  const src = fs.readFileSync(
    path.join(__dirname, '..', 'routes', 'finance.routes.unified.js'),
    'utf8'
  );

  test.each(['/invoices/:id', '/accounts/:id', '/cost-centers/:id', '/fixed-assets/:id'])(
    'PUT %s carries createRBACMiddleware([finance:update])',
    route => {
      const re = new RegExp(
        "'" +
          route.replace(/[/:]/g, '\\$&') +
          "'[\\s\\S]{0,90}createRBACMiddleware\\(\\['finance:update'\\]\\)"
      );
      expect(src).toMatch(re);
    }
  );

  test('invoice PUT strips protected finance fields (not a bare ...req.body)', () => {
    expect(src).toMatch(/const updateData = \{ \.\.\.stripProtectedFinanceFields\(req\.body\) \}/);
  });
});
