/**
 * Tests for the 6 advanced ABAC policies.
 */
const { pdp, PERMIT, DENY } = require('../authorization/abac');
const sodPolicy = require('../authorization/abac/policies/sod-conflict');

function subject(roles, overrides = {}) {
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

describe('record-ownership', () => {
  test('draft owner can edit within grace', () => {
    const d = pdp.evaluate({
      subject: subject(['therapist']),
      action: 'update',
      resource: {
        type: 'IRP',
        id: 'i1',
        branchId: 'br-1',
        caseTeam: ['u-1'],
        status: 'draft',
        createdBy: 'u-1',
        createdAt: new Date(Date.now() - 2 * 3600 * 1000),
      },
    });
    expect(d.effect).toBe(PERMIT);
  });

  test('non-owner cannot edit draft', () => {
    const d = pdp.evaluate({
      subject: subject(['therapist']),
      action: 'update',
      resource: {
        type: 'IRP',
        id: 'i1',
        branchId: 'br-1',
        caseTeam: ['u-1'],
        status: 'draft',
        createdBy: 'u-other',
        createdAt: new Date(),
      },
    });
    expect(d.effect).toBe(DENY);
    expect(d.denyingPolicy).toBe('record-ownership');
  });

  test('grace expired', () => {
    const d = pdp.evaluate({
      subject: subject(['therapist']),
      action: 'update',
      resource: {
        type: 'IRP',
        id: 'i1',
        branchId: 'br-1',
        caseTeam: ['u-1'],
        status: 'draft',
        createdBy: 'u-1',
        createdAt: new Date(Date.now() - 48 * 3600 * 1000),
      },
    });
    expect(d.effect).toBe(DENY);
    expect(d.reason).toBe('ownership_grace_expired');
  });
});

describe('regional-scope', () => {
  test('L3 accountant cannot read resource in another branch', () => {
    const d = pdp.evaluate({
      subject: subject(['accountant'], { defaultBranchId: 'br-1', accessibleBranches: ['br-1'] }),
      action: 'read',
      resource: { type: 'Invoice', id: 'i1', branchId: 'br-2' },
    });
    expect(d.effect).toBe(DENY);
  });

  test('L3 manager with branch in accessibleBranches is permitted', () => {
    const d = pdp.evaluate({
      subject: subject(['manager'], { accessibleBranches: ['br-1', 'br-2'] }),
      action: 'read',
      resource: { type: 'Invoice', id: 'i1', branchId: 'br-2' },
    });
    expect(d.effect).toBe(PERMIT);
  });

  test('active delegation grants cross-branch read', () => {
    const d = pdp.evaluate({
      subject: subject(['manager'], { activeDelegations: [{ branchId: 'br-3' }] }),
      action: 'read',
      resource: { type: 'Invoice', id: 'i1', branchId: 'br-3' },
    });
    expect(d.effect).toBe(PERMIT);
  });

  test('L2 head_office_admin is exempt (other policy permits)', () => {
    const d = pdp.evaluate({
      subject: subject(['head_office_admin']),
      action: 'read',
      resource: { type: 'Invoice', id: 'i1', branchId: 'br-9' },
    });
    expect(d.effect).toBe(PERMIT);
  });
});

describe('confidentiality-level', () => {
  test('restricted write without DPO override is denied', () => {
    const d = pdp.evaluate({
      subject: subject(['clinical_supervisor'], { mfaVerified: true }),
      action: 'update',
      resource: {
        type: 'ClinicalNote',
        id: 'n1',
        branchId: 'br-1',
        caseTeam: ['u-1'],
        confidentialityLevel: 'restricted',
      },
      env: { deviceTrust: 'corp-managed', time: new Date() },
    });
    expect(d.effect).toBe(DENY);
    expect(d.denyingPolicy).toBe('confidentiality-level');
  });

  test('restricted write with DPO override is permitted', () => {
    const d = pdp.evaluate({
      subject: subject(['clinical_supervisor'], { mfaVerified: true }),
      action: 'update',
      resource: {
        type: 'ClinicalNote',
        id: 'n1',
        branchId: 'br-1',
        caseTeam: ['u-1'],
        confidentialityLevel: 'restricted',
        status: 'active',
        createdBy: 'u-1',
      },
      env: { deviceTrust: 'corp-managed', time: new Date(), dpoOverride: true },
    });
    expect(d.effect).toBe(PERMIT);
  });
});

describe('approval-authority', () => {
  test('denies when subject is not current approver', () => {
    const d = pdp.evaluate({
      subject: subject(['therapist']),
      action: 'approve',
      resource: {
        type: 'IRP',
        id: 'i1',
        branchId: 'br-1',
        caseTeam: ['u-1'],
        status: 'pending_approval',
        currentApproverRole: 'clinical_supervisor',
      },
    });
    expect(d.effect).toBe(DENY);
    expect(d.reason).toContain('clinical_supervisor');
  });

  test('permits when subject has the required approver role', () => {
    const d = pdp.evaluate({
      subject: subject(['clinical_supervisor']),
      action: 'approve',
      resource: {
        type: 'IRP',
        id: 'i1',
        branchId: 'br-1',
        caseTeam: ['u-1'],
        status: 'pending_approval',
        currentApproverRole: 'clinical_supervisor',
      },
    });
    expect(d.effect).toBe(PERMIT);
  });
});

describe('break-glass-active', () => {
  test('permits elevated read with valid break-glass session', () => {
    const d = pdp.evaluate({
      subject: subject(['therapist']),
      action: 'read',
      resource: { type: 'Beneficiary', id: 'b-9', branchId: 'br-1', caseTeam: ['u-1'] },
      env: {
        time: new Date(),
        breakGlass: {
          purpose: 'medical_emergency',
          approvedBy: 'u-mgr',
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      },
    });
    expect(d.effect).toBe(PERMIT);
  });

  test('rejects expired break-glass', () => {
    const d = pdp.evaluate({
      subject: subject(['therapist']),
      action: 'read',
      resource: { type: 'Beneficiary', id: 'b-9', branchId: 'br-1', caseTeam: ['u-1'] },
      env: {
        time: new Date(),
        breakGlass: {
          purpose: 'x',
          approvedBy: 'm',
          expiresAt: new Date(Date.now() - 1000),
        },
      },
    });
    expect(d.effect).toBe(DENY);
    expect(d.reason).toBe('break_glass_expired');
  });
});

describe('sod-conflict', () => {
  test('denies when user did a conflicting prior action', () => {
    const d = pdp.evaluate({
      subject: subject(['accountant']),
      action: 'invoice.approve',
      resource: { type: 'Invoice', id: 'i1', branchId: 'br-1' },
      env: { time: new Date(), sod: { priorActions: ['invoice.create'] } },
    });
    expect(d.effect).toBe(DENY);
    expect(d.reason).toContain('sod_conflict_with:invoice.create');
  });

  test('allows when no conflict', () => {
    const d = pdp.evaluate({
      subject: subject(['accountant']),
      action: 'invoice.approve',
      resource: { type: 'Invoice', id: 'i1', branchId: 'br-1' },
      env: { time: new Date(), sod: { priorActions: ['invoice.read'] } },
    });
    // cross-branch-access may still weigh in, but SoD itself is not_applicable.
    expect([PERMIT, 'not_applicable']).toContain(d.effect);
  });

  test('conflictsWith helper detects pair in either order', () => {
    const { conflictsWith } = sodPolicy.__test__;
    expect(conflictsWith('invoice.approve', ['invoice.create'])).toBe('invoice.create');
    expect(conflictsWith('po.approve', ['po.draft'])).toBe('po.draft');
    expect(conflictsWith('invoice.approve', ['invoice.read'])).toBeNull();
  });
});
