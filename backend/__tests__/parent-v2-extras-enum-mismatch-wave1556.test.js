/**
 * W1556 — parent-portal-v2-extras: appointment + invoice status-enum mismatches
 * (2026-06-30 hunt).
 *
 * Guardian-ownership IDOR is CLEAN across parent-portal-v2 + v2-extras (every
 * child/resource handler uses assertChildAccess / myChildIds scope). The live bugs
 * were status-enum-value mismatches against the REAL schemas:
 *   - POST /appointments/request wrote status:'requested' (Appointment enum is
 *     UPPERCASE PENDING|CONFIRMED|...) → ValidationError 500 on every request.
 *   - PUT /appointments/:id/cancel compared lowercase + set status:'cancelled'
 *     → dead terminal-guard + 500 (cancel never persisted).
 *   - the invoice summary counted 'PENDING'/'PARTIAL' (Invoice enum is
 *     DRAFT|ISSUED|PARTIALLY_PAID|PAID|CANCELLED|OVERDUE) → understated balance.
 *
 * These static guards assert the route uses values that exist in the real enums.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '../routes/parent-portal-v2-extras.routes.js'),
  'utf8'
);
const APPT = fs.readFileSync(path.join(__dirname, '../models/Appointment.js'), 'utf8');
const INV = fs.readFileSync(path.join(__dirname, '../models/Invoice.js'), 'utf8');

describe('W1556 — appointment status uses real enum values', () => {
  test('request creates a PENDING appointment (not lowercase requested)', () => {
    expect(SRC).toMatch(/status: 'PENDING'/);
    expect(SRC).not.toMatch(/status: 'requested'/);
  });
  test('cancel uses CANCELLED + an UPPERCASE terminal guard', () => {
    expect(SRC).toMatch(/appt\.status = 'CANCELLED'/);
    expect(SRC).toMatch(/\['CANCELLED', 'COMPLETED', 'NO_SHOW'\]\.includes\(appt\.status\)/);
    expect(SRC).not.toMatch(/appt\.status = 'cancelled'/);
  });
  test('PENDING + CANCELLED + NO_SHOW are actually declared in the Appointment model', () => {
    expect(APPT).toMatch(/'PENDING'/);
    expect(APPT).toMatch(/'CANCELLED'/);
    expect(APPT).toMatch(/'NO_SHOW'/);
  });
});

describe('W1556 — invoice outstanding summary uses real enum values', () => {
  test('outstanding counts ISSUED/PARTIALLY_PAID/OVERDUE (not PENDING/PARTIAL)', () => {
    expect(SRC).toMatch(/\['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'\]\.includes\(inv\.status\)/);
    expect(SRC).not.toMatch(/\['PENDING', 'PARTIAL', 'OVERDUE'\]/);
  });
  test('ISSUED + PARTIALLY_PAID are actually in the Invoice enum', () => {
    expect(INV).toMatch(/'DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED', 'OVERDUE'/);
  });
});
