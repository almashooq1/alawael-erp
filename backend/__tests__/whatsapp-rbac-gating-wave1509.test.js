/**
 * W1509 — WhatsApp clinical-surface RBAC gating drift guard
 *
 * Behavioral (deterministic, real can()/registry — no boot, no DB) + static
 * route-shape guards: the two new whatsapp:* PHI permissions grant clinical
 * staff and explicit-deny reception/finance/HR/HQ-admin, mirroring the existing
 * beneficiary:clinical:read policy; the routes enforce them.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const { can } = require('../authorization/can');
const reg = require('../authorization/permissions.registry');

const ROUTE_SRC = fs.readFileSync(path.join(__dirname, '../routes/whatsapp.routes.js'), 'utf8');

const KEYS = ['whatsapp:beneficiary:context', 'whatsapp:notes:internal'];
const CLINICAL = [
  'therapist',
  'therapist_slp',
  'doctor',
  'supervisor',
  'clinical_director',
  'admin',
  'manager',
  'ceo',
  'internal_auditor',
];
const NON_CLINICAL = [
  'receptionist',
  'data_entry',
  'accountant',
  'finance',
  'finance_supervisor',
  'hr_officer',
  'super_admin',
  'it_admin',
];

describe('W1509 whatsapp:* permissions registered', () => {
  test.each(KEYS)('%s is a known permission (seed → registry in sync)', k => {
    expect(reg.META[k]).toBeDefined();
    expect(reg.ALL).toContain(k);
    expect(reg.META[k].phi).toBe(true);
  });
});

describe('W1509 can() grants clinical staff', () => {
  for (const k of KEYS) {
    test.each(CLINICAL)(`${k} → allow %s`, role => {
      expect(can({ role }, k).allow).toBe(true);
    });
  }
});

describe('W1509 can() explicit-denies non-clinical staff', () => {
  for (const k of KEYS) {
    test.each(NON_CLINICAL)(`${k} → deny %s`, role => {
      const v = can({ role }, k);
      expect(v.allow).toBe(false);
      expect(v.reason).toBe('explicit-deny');
    });
  }
});

describe('W1509 routes enforce the gates', () => {
  test('route wires the can() PDP', () => {
    expect(ROUTE_SRC).toMatch(/require\(['"]\.\.\/authorization\/can['"]\)/);
    expect(ROUTE_SRC).toMatch(/function denyIfNoPerm/);
  });

  test('GET /conversations/:id/context gates whatsapp:beneficiary:context', () => {
    const idx = ROUTE_SRC.indexOf("'/conversations/:id/context'");
    expect(idx).toBeGreaterThan(-1);
    expect(ROUTE_SRC.slice(idx, idx + 320)).toMatch(
      /denyIfNoPerm\(req, res, 'whatsapp:beneficiary:context'\)/
    );
  });

  test('POST /conversations/:id/notes gates whatsapp:notes:internal', () => {
    const idx = ROUTE_SRC.indexOf("'/conversations/:id/notes'");
    expect(idx).toBeGreaterThan(-1);
    expect(ROUTE_SRC.slice(idx, idx + 320)).toMatch(
      /denyIfNoPerm\(req, res, 'whatsapp:notes:internal'\)/
    );
  });

  test('GET /conversations/:id strips internalNotes for non-clinical staff', () => {
    expect(ROUTE_SRC).toMatch(/!can\(req\.user, 'whatsapp:notes:internal'\)\.allow/);
    expect(ROUTE_SRC).toMatch(/conv\.internalNotes = \[\]/);
  });
});
