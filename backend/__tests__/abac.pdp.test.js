/**
 * ABAC PDP + policy smoke tests.
 */
const { pdp, PERMIT, DENY } = require('../authorization/abac');

function subjectWith(roles, overrides = {}) {
  return {
    userId: 'u-1',
    roles,
    defaultBranchId: 'br-1',
    accessibleBranches: ['br-1'],
    mfaVerified: false,
    linkedBeneficiaries: [],
    ...overrides,
  };
}

describe('ABAC PDP — caseload-access', () => {
  test('therapist can read a beneficiary on their case team', () => {
    const d = pdp.evaluate({
      subject: subjectWith(['therapist']),
      action: 'read',
      resource: { type: 'Beneficiary', id: 'b-1', branchId: 'br-1', caseTeam: ['u-1'] },
    });
    expect(d.effect).toBe(PERMIT);
  });

  test('therapist cannot read a beneficiary outside their case team', () => {
    const d = pdp.evaluate({
      subject: subjectWith(['therapist']),
      action: 'read',
      resource: { type: 'Beneficiary', id: 'b-2', branchId: 'br-1', caseTeam: ['u-other'] },
    });
    expect(d.effect).toBe(DENY);
    expect(d.denyingPolicy).toBe('caseload-access');
  });
});

describe('ABAC PDP — cross-branch-access', () => {
  test('regular user in branch A cannot read resource in branch B', () => {
    const d = pdp.evaluate({
      subject: subjectWith(['accountant'], {
        defaultBranchId: 'br-1',
        accessibleBranches: ['br-1'],
      }),
      action: 'read',
      resource: { type: 'Invoice', id: 'i-1', branchId: 'br-2' },
    });
    expect(d.effect).toBe(DENY);
    expect(d.denyingPolicy).toBe('cross-branch-access');
  });

  test('head_office_admin can read across branches (audited)', () => {
    const d = pdp.evaluate({
      subject: subjectWith(['head_office_admin']),
      action: 'read',
      resource: { type: 'Invoice', id: 'i-1', branchId: 'br-2' },
    });
    expect(d.effect).toBe(PERMIT);
  });
});

describe('ABAC PDP — guardian-own-child', () => {
  test('parent reads own child', () => {
    const d = pdp.evaluate({
      subject: subjectWith(['parent'], { linkedBeneficiaries: ['b-1'] }),
      action: 'read',
      resource: { type: 'Beneficiary', id: 'b-1', branchId: 'br-1' },
    });
    expect(d.effect).toBe(PERMIT);
  });

  test('parent cannot read unrelated beneficiary', () => {
    const d = pdp.evaluate({
      subject: subjectWith(['parent'], { linkedBeneficiaries: ['b-1'] }),
      action: 'read',
      resource: { type: 'Beneficiary', id: 'b-9', branchId: 'br-1' },
    });
    expect(d.effect).toBe(DENY);
    expect(d.denyingPolicy).toBe('guardian-own-child');
  });
});

describe('ABAC PDP — sensitive-clinical-access', () => {
  test('sensitive resource blocked without MFA', () => {
    const d = pdp.evaluate({
      subject: subjectWith(['therapist'], { mfaVerified: false, linkedBeneficiaries: [] }),
      action: 'read',
      resource: {
        type: 'Beneficiary',
        id: 'b-1',
        branchId: 'br-1',
        caseTeam: ['u-1'],
        confidentialityLevel: 'sensitive',
      },
      env: { deviceTrust: 'corp-managed', time: new Date() },
    });
    expect(d.effect).toBe(DENY);
    expect(d.denyingPolicy).toBe('sensitive-clinical-access');
  });

  test('sensitive resource permitted with MFA + corp device', () => {
    const d = pdp.evaluate({
      subject: subjectWith(['therapist'], { mfaVerified: true }),
      action: 'read',
      resource: {
        type: 'Beneficiary',
        id: 'b-1',
        branchId: 'br-1',
        caseTeam: ['u-1'],
        confidentialityLevel: 'sensitive',
      },
      env: { deviceTrust: 'corp-managed', time: new Date() },
    });
    expect(d.effect).toBe(PERMIT);
  });
});

describe('ABAC PDP — session-amendment-window', () => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

  const baseSessionNote = {
    type: 'SessionNote',
    id: 'sn-1',
    branchId: 'br-1',
    status: 'finalized',
    caseTeam: ['u-1'], // therapist u-1 is on the case team (satisfies caseload-access)
  };

  test('original signer within 24h can amend', () => {
    const d = pdp.evaluate({
      subject: subjectWith(['therapist']),
      action: 'update',
      resource: { ...baseSessionNote, signedAt: oneHourAgo, signedBy: 'u-1' },
      env: { time: new Date() },
    });
    expect(d.effect).toBe(PERMIT);
  });

  test('different signer is denied', () => {
    const d = pdp.evaluate({
      subject: subjectWith(['therapist']),
      action: 'update',
      resource: { ...baseSessionNote, signedAt: oneHourAgo, signedBy: 'u-other' },
      env: { time: new Date() },
    });
    expect(d.effect).toBe(DENY);
    expect(d.denyingPolicy).toBe('session-amendment-window');
  });

  test('beyond 24h window is denied (approval needed)', () => {
    const d = pdp.evaluate({
      subject: subjectWith(['therapist']),
      action: 'update',
      resource: { ...baseSessionNote, signedAt: twoDaysAgo, signedBy: 'u-1' },
      env: { time: new Date() },
    });
    expect(d.effect).toBe(DENY);
    expect(d.reason).toBe('outside_amendment_window_approval_required');
  });
});
