/**
 * Parent-portal reschedule + care-plan-decide guards (2026-06-30 hunt).
 * Guardian-ownership IDOR is already correctly defended (guardianOwnsBeneficiary
 * on every child-scoped :id route, W410/W411) — verified, not re-touched.
 *
 * P1 — POST /appointments/:id/reschedule-request did `$push` to the String field
 *   `internalNotes` (which holds the SOAP report envelope) → CastError → every
 *   reschedule request 500'd + was never recorded (feature 100% dead), and flagged
 *   via a phantom `rescheduleRequested` key. Now a real rescheduleRequests[] array
 *   + a real boolean.
 * P2 — POST /approvals/:id/decide loaded the CarePlan by id with no
 *   pending-signature precondition → a guardian could REJECT an already-ACTIVE/
 *   signed plan back to DRAFT (halting therapy). Now gated to
 *   requiresSignature:true && signedAt:null (mirrors the /approvals list filter).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROUTE = fs.readFileSync(
  path.join(__dirname, '../routes/parent-portal-v1.routes.js'),
  'utf8'
);
const APPT = fs.readFileSync(path.join(__dirname, '../models/Appointment.js'), 'utf8');

describe('parent-portal — reschedule request stored on a real field', () => {
  test('Appointment declares rescheduleRequests[] + rescheduleRequested', () => {
    expect(APPT).toMatch(/rescheduleRequests:\s*\[/);
    expect(APPT).toMatch(/rescheduleRequested:\s*\{\s*type:\s*Boolean/);
  });
  test('the route $pushes to rescheduleRequests, not the String internalNotes', () => {
    const i = ROUTE.indexOf("/appointments/:appointmentId/reschedule-request'");
    const block = ROUTE.slice(i, i + 2200);
    expect(block).toMatch(/\$push:\s*\{\s*rescheduleRequests:/);
    expect(block).not.toMatch(/\$push:\s*\{\s*internalNotes:/);
  });
});

describe('parent-portal — care-plan decide requires a pending-signature plan', () => {
  test('decide is gated on requiresSignature/signedAt (no REJECT of an active plan)', () => {
    const i = ROUTE.indexOf("/approvals/:id/decide'");
    const block = ROUTE.slice(i, i + 2400);
    expect(block).toMatch(/!plan\.requiresSignature \|\| plan\.signedAt/);
    expect(block).toMatch(/409/);
  });
});
