/**
 * W1491 — WhatsApp beneficiary-context drift guard
 *
 * Static (source-shape) + pure-function guards for the rehab-context sidebar:
 *   - the GET /conversations/:id/context route exists and is branch-scoped,
 *   - the service uses lazy mongoose.model + Promise.allSettled (defensive),
 *   - the pure mappers shape beneficiary / invoices / sessions / therapists
 *     correctly,
 *   - buildContext never throws on a missing/invalid beneficiaryId.
 *
 * Pure + static only — no DB, no boot.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const svc = require('../services/whatsapp/whatsappBeneficiaryContext.service');

const ROUTE_SRC = fs.readFileSync(path.join(__dirname, '../routes/whatsapp.routes.js'), 'utf8');
const SVC_SRC = fs.readFileSync(
  path.join(__dirname, '../services/whatsapp/whatsappBeneficiaryContext.service.js'),
  'utf8'
);

describe('W1491 WhatsApp beneficiary-context — static drift guards', () => {
  test('route declares GET /conversations/:id/context', () => {
    expect(ROUTE_SRC).toMatch(/['"]\/conversations\/:id\/context['"]/);
  });

  test('context route enforces branch isolation (byIdScopedFilter + effectiveBranchScope)', () => {
    const idx = ROUTE_SRC.indexOf("'/conversations/:id/context'");
    expect(idx).toBeGreaterThan(-1);
    const slice = ROUTE_SRC.slice(idx, idx + 700);
    expect(slice).toMatch(/byIdScopedFilter/);
    expect(slice).toMatch(/effectiveBranchScope\(req\)/);
  });

  test('route wires the context service', () => {
    expect(ROUTE_SRC).toMatch(
      /require\(['"]\.\.\/services\/whatsapp\/whatsappBeneficiaryContext\.service['"]\)/
    );
    expect(ROUTE_SRC).toMatch(/whatsappBeneficiaryContext\.buildContext/);
  });

  test('service is defensive: lazy mongoose.model + Promise.allSettled', () => {
    expect(SVC_SRC).toMatch(/mongoose\.model\(/);
    expect(SVC_SRC).toMatch(/Promise\.allSettled/);
  });
});

describe('W1491 WhatsApp beneficiary-context — pure mappers', () => {
  test('mapBeneficiary composes name + disability label', () => {
    const out = svc.mapBeneficiary({
      _id: 'b1',
      personalInfo: { firstName: 'سعد', lastName: 'العمري' },
      fileNumber: 'F-1',
      status: 'active',
      disability: { primaryType: 'توحد', severity: 'moderate' },
    });
    expect(out.name).toBe('سعد العمري');
    expect(out.fileNumber).toBe('F-1');
    expect(out.disability.type).toBe('توحد');
    expect(out.disability.severity).toBe('moderate');
  });

  test('mapBeneficiary returns null for a null doc', () => {
    expect(svc.mapBeneficiary(null)).toBeNull();
  });

  test('summarizeInvoices counts outstanding only (PAID/CANCELLED settle)', () => {
    const s = svc.summarizeInvoices([
      { _id: 'i1', totalAmount: 100, status: 'ISSUED' },
      { _id: 'i2', totalAmount: 50, status: 'PAID' },
      { _id: 'i3', totalAmount: 30, status: 'OVERDUE' },
      { _id: 'i4', totalAmount: 20, status: 'CANCELLED' },
    ]);
    expect(s.items).toHaveLength(4);
    expect(s.outstandingCount).toBe(2);
    expect(s.outstandingTotal).toBe(130);
  });

  test('isOutstanding is case-insensitive on status', () => {
    expect(svc.isOutstanding({ status: 'paid' })).toBe(false);
    expect(svc.isOutstanding({ status: 'issued' })).toBe(true);
    expect(svc.isOutstanding(null)).toBe(false);
  });

  test('distinctTherapists dedupes by id and preserves name', () => {
    const t = svc.distinctTherapists([
      { therapistId: { _id: 't1', name: 'أ. منى' } },
      { therapistId: { _id: 't1', name: 'أ. منى' } },
      { therapistId: { _id: 't2', name: 'أ. خالد' } },
      { therapistId: null },
    ]);
    expect(t).toHaveLength(2);
    expect(t.map(x => x.id).sort()).toEqual(['t1', 't2']);
  });

  test('mapSession surfaces attendance status + therapist name', () => {
    const out = svc.mapSession({
      _id: 's1',
      scheduledDate: '2026-07-01',
      type: 'individual',
      specialty: 'speech_therapy',
      status: 'scheduled',
      attendance: { status: 'present' },
      therapistId: { _id: 't1', name: 'أ. منى' },
    });
    expect(out.attendanceStatus).toBe('present');
    expect(out.therapistName).toBe('أ. منى');
    expect(out.specialty).toBe('speech_therapy');
    expect(out.therapistId).toBe('t1');
  });
});

describe('W1491 WhatsApp beneficiary-context — buildContext is defensive', () => {
  test('returns an empty-but-shaped payload for a missing beneficiaryId (no throw)', async () => {
    const out = await svc.buildContext({ beneficiaryId: null });
    expect(out.beneficiary).toBeNull();
    expect(out.carePlan).toBeNull();
    expect(out.goals).toEqual([]);
    expect(out.upcomingSessions).toEqual([]);
    expect(out.therapists).toEqual([]);
    expect(out.invoices).toEqual({ items: [], outstandingCount: 0, outstandingTotal: 0 });
  });

  test('emptyContext carries a sources map through', () => {
    expect(svc.emptyContext({ beneficiary: 'ok' }).sources).toEqual({ beneficiary: 'ok' });
  });
});
