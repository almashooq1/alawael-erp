/**
 * ApprovalChainEngine tests.
 */

const { ApprovalChainEngine, CHAINS, selectChain } = require('../authorization/approvals');

function actor(userId, roles) {
  return { userId, roles };
}

describe('selectChain()', () => {
  test('picks small/mid/large for A-07', () => {
    expect(selectChain('A-07', { total: 500 })).toBe('A-07-small');
    expect(selectChain('A-07', { total: 5000 })).toBe('A-07-mid');
    expect(selectChain('A-07', { total: 50000 })).toBe('A-07-large');
  });
  test('picks based on leave days for A-06', () => {
    expect(selectChain('A-06', { days: 3 })).toBe('A-06-short');
    expect(selectChain('A-06', { days: 10 })).toBe('A-06-mid');
    expect(selectChain('A-06', { days: 30 })).toBe('A-06-long');
  });
  test('returns null for unknown family', () => {
    expect(selectChain('X', {})).toBeNull();
  });
});

describe('ApprovalChainEngine — lifecycle', () => {
  const fixedNow = new Date('2026-04-17T00:00:00Z');
  let eng;
  beforeEach(() => {
    eng = new ApprovalChainEngine({ now: () => fixedNow });
  });

  test('start creates pending request with first step SLA', () => {
    const req = eng.start({
      chainId: 'A-01',
      resourceType: 'IRP',
      resourceId: 'irp-1',
      initiatorId: 'therapist-1',
      branchId: 'br-1',
    });
    expect(req.status).toBe('pending_approval');
    expect(req.currentStep).toBe(0);
    expect(req.steps.length).toBe(CHAINS['A-01'].steps.length);
    expect(req.slaDeadline).toBeInstanceOf(Date);
    expect(req.slaDeadline.getTime() - fixedNow.getTime()).toBe(48 * 3600 * 1000);
  });

  test('throws if chain unknown', () => {
    expect(() => eng.start({ chainId: 'NOPE', resourceId: 'r' })).toThrow('unknown chain');
  });

  test('throws on resourceType mismatch', () => {
    expect(() => eng.start({ chainId: 'A-01', resourceType: 'Invoice', resourceId: 'x' })).toThrow(
      'expects resourceType=IRP'
    );
  });

  test('approve moves to next step + updates SLA', () => {
    const req = eng.start({
      chainId: 'A-01',
      resourceType: 'IRP',
      resourceId: 'r',
      initiatorId: 't-1',
    });
    const updated = eng.approve(req, actor('sup-1', ['clinical_supervisor']), 'ok');
    expect(updated.currentStep).toBe(1);
    expect(updated.decisions.length).toBe(1);
    expect(updated.decisions[0].decision).toBe('approve');
    expect(updated.status).toBe('pending_approval');
  });

  test('initiator cannot approve own request', () => {
    const req = eng.start({ chainId: 'A-01', resourceId: 'r', initiatorId: 'u-1' });
    expect(() => eng.approve(req, actor('u-1', ['clinical_supervisor']), '')).toThrow(
      'approval_sod_initiator_cannot_approve'
    );
  });

  test('wrong role rejected with helpful error', () => {
    const req = eng.start({ chainId: 'A-01', resourceId: 'r', initiatorId: 't-1' });
    expect(() => eng.approve(req, actor('u-2', ['therapist']), '')).toThrow('approval_wrong_role');
  });

  test('same user cannot approve twice in same chain', () => {
    const req = eng.start({ chainId: 'A-01', resourceId: 'r', initiatorId: 't-1' });
    eng.approve(req, actor('sup-1', ['clinical_supervisor']), '');
    // sup-1 happens to also have manager — still disallowed to approve twice.
    expect(() => eng.approve(req, actor('sup-1', ['manager']), '')).toThrow(
      'approval_sod_user_already_approved'
    );
  });

  test('final approval finalises chain', () => {
    const req = eng.start({ chainId: 'A-06-short', resourceId: 'l-1', initiatorId: 'emp-1' });
    const out = eng.approve(req, actor('hr-1', ['hr_supervisor']), '');
    expect(out.status).toBe('approved');
    expect(out.finalizedAt).toBeInstanceOf(Date);
    expect(out.slaDeadline).toBeNull();
  });

  test('reject finalises the chain', () => {
    const req = eng.start({ chainId: 'A-06-short', resourceId: 'l-1', initiatorId: 'emp-1' });
    const out = eng.reject(req, actor('hr-1', ['hr_supervisor']), 'incomplete form');
    expect(out.status).toBe('rejected');
    expect(out.decisions[0].decision).toBe('reject');
  });

  test('cancel only allowed to initiator', () => {
    const req = eng.start({ chainId: 'A-01', resourceId: 'r', initiatorId: 't-1' });
    expect(() => eng.cancel(req, actor('other', []), '')).toThrow(
      'approval_cancel_requires_initiator'
    );
    const out = eng.cancel(req, actor('t-1', []), 'changed mind');
    expect(out.status).toBe('cancelled');
  });
});

describe('isBreached + escalate', () => {
  test('isBreached detects overdue pending request', () => {
    const eng = new ApprovalChainEngine({ now: () => new Date('2026-04-17T00:00:00Z') });
    const req = eng.start({ chainId: 'A-06-short', resourceId: 'l-1', initiatorId: 'e-1' });
    // Fast-forward time past the 48h SLA.
    expect(eng.isBreached(req, new Date('2026-04-20T00:00:00Z'))).toBe(true);
    expect(eng.isBreached(req, new Date('2026-04-18T00:00:00Z'))).toBe(false);
  });

  test('escalate records decision + status', () => {
    const eng = new ApprovalChainEngine();
    const req = eng.start({ chainId: 'A-01', resourceId: 'r', initiatorId: 't-1' });
    const out = eng.escalate(req, actor('oncall', []), 'SLA breach');
    expect(out.status).toBe('escalated');
    expect(out.decisions[0].decision).toBe('escalate');
  });
});

describe('currentApproverRole()', () => {
  test('returns the step role when pending', () => {
    const eng = new ApprovalChainEngine();
    const req = eng.start({ chainId: 'A-08-mid', resourceId: 'po-1', initiatorId: 'p-1' });
    expect(eng.currentApproverRole(req)).toBe('finance_supervisor');
    eng.approve(req, actor('fs-1', ['finance_supervisor']), '');
    expect(eng.currentApproverRole(req)).toBe('manager');
  });
  test('returns null when not pending', () => {
    const eng = new ApprovalChainEngine();
    const req = eng.start({ chainId: 'A-06-short', resourceId: 'l-1', initiatorId: 'e-1' });
    eng.reject(req, actor('hr-1', ['hr_supervisor']), '');
    expect(eng.currentApproverRole(req)).toBeNull();
  });
});
