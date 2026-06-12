'use strict';

/**
 * W1257 — audit trail serves UnifiedCarePlan (ADR-040 (b)).
 *
 * The W45 aggregator is pure; W1252/W1254 lifted signatureChain /
 * evidenceHash / familyNotifications with identical shapes, so the adapter
 * is a field-name normalization. This guard proves:
 *   1. A UI plan with real W1252 signatures + W1254 family attempts yields a
 *      chronological, integrity-verified trail (source:'unified').
 *   2. Tampered chains are flagged in integrity.
 *   3. Family redaction hides actor identities + internal events.
 *   4. Absent legacy-only structures emit NO fabricated events.
 */

jest.unmock('mongoose');
jest.setTimeout(60000);

const mongoose = require('mongoose');
const {
  buildUnifiedAuditTrail,
  EVENT_KIND,
} = require('../intelligence/care-plan-audit-trail.service');
const { UnifiedCarePlan } = require('../domains/care-plans/models/UnifiedCarePlan');

function makePlan() {
  // In-memory doc — pure-function tests need no DB connection.
  const plan = new UnifiedCarePlan({
    beneficiaryId: new mongoose.Types.ObjectId(),
    episodeId: new mongoose.Types.ObjectId(),
    startDate: new Date('2026-01-01'),
    status: 'active',
    planNumber: 'CP-20260601-TEST',
    version: 2,
    createdAt: new Date('2026-06-01T07:00:00Z'), // in-memory doc: timestamps only fire on save
    createdBy: new mongoose.Types.ObjectId(),
    approvedBy: new mongoose.Types.ObjectId(),
    approvedAt: new Date('2026-06-02T09:00:00Z'),
    familyNotifications: [
      {
        attemptId: 'AT-1',
        channel: 'sms',
        attemptedAt: new Date('2026-06-03T10:00:00Z'),
        status: 'sent',
        retries: 0,
      },
    ],
  });
  plan.appendSignature({
    userId: new mongoose.Types.ObjectId(),
    role: 'therapist',
    action: 'submit',
    signedAt: new Date('2026-06-01T08:00:00Z'),
  });
  plan.appendSignature({
    userId: new mongoose.Types.ObjectId(),
    role: 'clinical_lead',
    action: 'activate',
    signedAt: new Date('2026-06-02T09:00:00Z'),
  });
  plan.sealEvidence();
  return plan;
}

describe('W1257 unified audit trail', () => {
  test('full trail: lifecycle + signatures + family attempts, sorted, integrity ok', () => {
    const trail = buildUnifiedAuditTrail(makePlan());
    expect(trail.ok).toBe(true);
    expect(trail.source).toBe('unified');
    expect(trail.planId).toBe('CP-20260601-TEST');
    expect(trail.versionNumber).toBe(2);

    const kinds = trail.events.map(e => e.kind);
    expect(kinds).toContain(EVENT_KIND.CREATED);
    expect(kinds).toContain(EVENT_KIND.APPROVED);
    expect(kinds.filter(k => k === EVENT_KIND.SIGNATURE)).toHaveLength(2);
    expect(kinds).toContain(EVENT_KIND.FAMILY_SEND_ATTEMPT);

    // chronological order
    const times = trail.events.map(e => e.at);
    expect([...times].sort()).toEqual(times);

    expect(trail.integrity.signatureChainOk).toBe(true);
    expect(trail.integrity.evidenceHash).toMatch(/^[a-f0-9]{64}$/);
    expect(trail.counts.signatures).toBe(2);
    expect(trail.counts.familySends).toBe(1);
  });

  test('tampered signature chain is flagged in integrity', () => {
    const plan = makePlan();
    plan.signatureChain[0].action = 'forged';
    const trail = buildUnifiedAuditTrail(plan, {
      computeSignatureHash: UnifiedCarePlan.computeSignatureHash,
    });
    expect(trail.integrity.signatureChainOk).toBe(false);
    expect(trail.integrity.brokenAt).toBe(0);
  });

  test('family redaction hides actor identities and internal events', () => {
    const trail = buildUnifiedAuditTrail(makePlan(), { redactFor: 'family' });
    expect(trail.events.length).toBeGreaterThan(0);
    for (const ev of trail.events) {
      expect(ev.actorUserId).toBeNull();
      expect([
        EVENT_KIND.APPROVED,
        EVENT_KIND.SAVED_TO_RECORD,
        EVENT_KIND.FAMILY_NOTIFIED,
      ]).toContain(ev.kind);
    }
  });

  test('no fabricated events for legacy-only structures (validation/rejection/amendments)', () => {
    const trail = buildUnifiedAuditTrail(makePlan());
    const kinds = new Set(trail.events.map(e => e.kind));
    expect(kinds.has(EVENT_KIND.VALIDATED)).toBe(false);
    expect(kinds.has(EVENT_KIND.REJECTED)).toBe(false);
    expect(kinds.has(EVENT_KIND.AMENDMENT)).toBe(false);
    expect(trail.counts.amendments).toBe(0);
  });

  test('invalid input degrades exactly like the legacy builder', () => {
    const trail = buildUnifiedAuditTrail(null);
    expect(trail.ok).toBe(false);
    expect(trail.reason).toBe('INVALID_PLAN_VERSION');
  });
});
