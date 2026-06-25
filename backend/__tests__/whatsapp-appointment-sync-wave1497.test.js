/**
 * W1497 — WhatsApp appointment-sync drift guard
 *
 * Static (source-shape) guards + pure-helper tests for the staff-mediated
 * two-way appointment sync. No DB, no boot (consistent with W1491).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const svc = require('../services/whatsapp/whatsappAppointmentSync.service');

const ROUTE_SRC = fs.readFileSync(path.join(__dirname, '../routes/whatsapp.routes.js'), 'utf8');
const SVC_SRC = fs.readFileSync(
  path.join(__dirname, '../services/whatsapp/whatsappAppointmentSync.service.js'),
  'utf8'
);

const ROUTE = '/conversations/:id/appointment-action';

function routeSlice() {
  const idx = ROUTE_SRC.indexOf(`'${ROUTE}'`);
  return idx === -1 ? '' : ROUTE_SRC.slice(idx, idx + 1200);
}

describe('W1497 appointment-action route — declared + branch-scoped', () => {
  test('declares the route', () => {
    expect(ROUTE_SRC).toContain(`'${ROUTE}'`);
  });

  test('branch-isolated (byIdScopedFilter + effectiveBranchScope) + delegates to the service', () => {
    const slice = routeSlice();
    expect(slice).toMatch(/byIdScopedFilter/);
    expect(slice).toMatch(/effectiveBranchScope\(req\)/);
    expect(slice).toMatch(/whatsappAppointmentSync\.applyAppointmentAction/);
  });

  test('route wires the service require', () => {
    expect(ROUTE_SRC).toMatch(
      /require\(['"]\.\.\/services\/whatsapp\/whatsappAppointmentSync\.service['"]\)/
    );
  });
});

describe('W1497 service — delegates to the sessions domain facade (no direct model write)', () => {
  test('uses the sessions facade cancelSession + markNoShow', () => {
    expect(SVC_SRC).toMatch(/require\(['"]\.\.\/\.\.\/domains\/sessions['"]\)/);
    expect(SVC_SRC).toMatch(/cancelSession/);
    expect(SVC_SRC).toMatch(/markNoShow/);
  });

  test('does NOT mutate the session model directly (delegation only)', () => {
    // No direct model handle / no write call — the facade owns the mutation.
    expect(SVC_SRC).not.toMatch(/mongoose\.model\(\s*['"]ClinicalSession/);
    expect(SVC_SRC).not.toMatch(/\.(findOneAndUpdate|findByIdAndUpdate|updateOne|save)\(/);
  });
});

describe('W1497 pure helpers', () => {
  test('isValidAction allows cancel + no_show only', () => {
    expect(svc.isValidAction('cancel')).toBe(true);
    expect(svc.isValidAction('no_show')).toBe(true);
    expect(svc.isValidAction('confirm')).toBe(false);
    expect(svc.isValidAction('delete')).toBe(false);
  });

  test('normalizeReason trims + caps + empty→undefined', () => {
    expect(svc.normalizeReason('  مريض  ')).toBe('مريض');
    expect(svc.normalizeReason('')).toBeUndefined();
    expect(svc.normalizeReason(null)).toBeUndefined();
    expect(svc.normalizeReason('x'.repeat(2000))).toHaveLength(1000);
  });

  test('summarizeSession maps id/status/attendance + null-safe', () => {
    const out = svc.summarizeSession({
      _id: 's1',
      status: 'no_show',
      scheduledDate: '2026-07-01',
      attendance: { status: 'absent' },
    });
    expect(out).toEqual({
      id: 's1',
      status: 'no_show',
      scheduledDate: '2026-07-01',
      attendanceStatus: 'absent',
    });
    expect(svc.summarizeSession(null)).toBeNull();
  });
});
