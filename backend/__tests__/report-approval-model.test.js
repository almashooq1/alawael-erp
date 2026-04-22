/**
 * report-approval-model.test.js — Phase 10 Commit 1.
 *
 * Exercises the ReportApprovalRequest state machine in-memory. Uses the
 * jest.unmock('mongoose') pattern (see plan-review-model.test.js)
 * because the global mock strips schema metadata & method prototypes.
 */

'use strict';

jest.unmock('mongoose');
jest.resetModules();

const mongoose = require('mongoose');
if (mongoose.models && mongoose.models.ReportApprovalRequest) {
  delete mongoose.models.ReportApprovalRequest;
  if (mongoose.modelSchemas) delete mongoose.modelSchemas.ReportApprovalRequest;
}

const RA = require('../models/ReportApprovalRequest');

function newApproval(overrides = {}) {
  const Model = RA.model;
  return new Model({
    reportId: 'exec.kpi.board.quarterly',
    instanceKey: 'exec.kpi.board.quarterly:2026-Q2:global',
    periodKey: '2026-Q2',
    requestedBy: new mongoose.Types.ObjectId(),
    approverRoles: ['ceo'],
    expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
    confidentiality: 'confidential',
    payloadHash: 'deadbeef'.repeat(8),
    ...overrides,
  });
}

describe('ReportApprovalRequest — constants', () => {
  test('VALID_TRANSITIONS terminates terminal states', () => {
    expect(RA.VALID_TRANSITIONS.PENDING).toContain('APPROVED');
    expect(RA.VALID_TRANSITIONS.PENDING).toContain('REJECTED');
    expect(RA.VALID_TRANSITIONS.REJECTED).toEqual([]);
    expect(RA.VALID_TRANSITIONS.DISPATCHED).toEqual([]);
    expect(RA.VALID_TRANSITIONS.EXPIRED).toEqual([]);
  });
});

describe('ReportApprovalRequest — transitions', () => {
  test('approve: PENDING → APPROVED, appends history', () => {
    const a = newApproval();
    const actor = new mongoose.Types.ObjectId();
    a.approve(actor, 'looks good');
    expect(a.state).toBe('APPROVED');
    expect(String(a.approvedBy)).toBe(String(actor));
    expect(a.approvedAt).toBeInstanceOf(Date);
    expect(a.stateHistory.length).toBe(1);
    expect(a.stateHistory[0].state).toBe('APPROVED');
  });

  test('reject: requires a reason', () => {
    const a = newApproval();
    expect(() => a.reject(new mongoose.Types.ObjectId())).toThrow(/rejection reason/);
    a.reject(new mongoose.Types.ObjectId(), 'missing signoff');
    expect(a.state).toBe('REJECTED');
    expect(a.rejectionReason).toBe('missing signoff');
  });

  test('cannot approve a REJECTED request', () => {
    const a = newApproval();
    a.reject(new mongoose.Types.ObjectId(), 'nope');
    expect(() => a.approve(new mongoose.Types.ObjectId())).toThrow(/invalid transition/);
  });

  test('markDispatched requires APPROVED source state', () => {
    const a = newApproval();
    expect(() => a.markDispatched()).toThrow(/invalid transition/);
    a.approve(new mongoose.Types.ObjectId(), 'ok');
    a.markDispatched(new mongoose.Types.ObjectId());
    expect(a.state).toBe('DISPATCHED');
    expect(a.dispatchedAt).toBeInstanceOf(Date);
  });

  test('canTransitionTo returns false for illegal targets', () => {
    const a = newApproval();
    expect(a.canTransitionTo('DISPATCHED')).toBe(false);
    expect(a.canTransitionTo('APPROVED')).toBe(true);
    a.approve(new mongoose.Types.ObjectId(), 'ok');
    expect(a.canTransitionTo('REJECTED')).toBe(false);
    expect(a.canTransitionTo('DISPATCHED')).toBe(true);
  });

  test('expire only fires from PENDING/APPROVED', () => {
    const a = newApproval();
    a.expire();
    expect(a.state).toBe('EXPIRED');
    const b = newApproval();
    b.reject(new mongoose.Types.ObjectId(), 'no');
    expect(() => b.expire()).toThrow(/invalid transition/);
  });

  test('isExpired is date-driven, and false when terminal', () => {
    const past = new Date(Date.now() - 10_000);
    const a = newApproval({ expiresAt: past });
    expect(a.isExpired()).toBe(true);
    a.cancel(new mongoose.Types.ObjectId(), 'abort');
    expect(a.isExpired()).toBe(false); // terminal overrides
  });

  test('verifyPayload compares sha256 hashes', () => {
    const a = newApproval();
    expect(a.verifyPayload('deadbeef'.repeat(8))).toBe(true);
    expect(a.verifyPayload('beefdead'.repeat(8))).toBe(false);
    expect(a.verifyPayload(null)).toBe(false);
  });

  test('isTerminal reflects the closed set', () => {
    expect(newApproval().isTerminal()).toBe(false);
    const r = newApproval();
    r.reject(new mongoose.Types.ObjectId(), 'x');
    expect(r.isTerminal()).toBe(true);
  });
});
