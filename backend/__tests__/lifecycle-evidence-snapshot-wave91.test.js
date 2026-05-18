/**
 * lifecycle-evidence-snapshot-wave91.test.js — Wave 91.
 *
 * Integration tests proving that HIGH/CRITICAL lifecycle transitions
 * capture a tamper-evident subject snapshot at request time, while
 * LOW/MEDIUM transitions skip the snapshot (no overhead, no PHI in
 * audit trail for routine actions).
 *
 * Closes U6 from the Wave-87 canonical unification analysis.
 */

'use strict';

const reg = require('../intelligence/beneficiary-lifecycle.registry');
const {
  createBeneficiaryLifecycleService,
} = require('../intelligence/beneficiary-lifecycle.service');
const evidenceSnapshot = require('../intelligence/evidence-snapshot.lib');
const sensitivityGrade = require('../intelligence/sensitivity-grade.lib');

function buildMockLog() {
  const created = [];
  return {
    _created: created,
    async create(doc) {
      const rec = { _id: `rec-${created.length}`, ...doc };
      created.push(rec);
      return rec;
    },
  };
}

function buildBeneficiaryMock(overrides = {}) {
  return {
    _projectionUsed: null,
    findById(_id) {
      return {
        select: projection => {
          this._projectionUsed = projection;
          return {
            lean: async () => ({
              _id,
              status: 'active',
              branchId: 'br-1',
              name: 'مستفيد تجريبي',
              primaryGuardianId: 'g-1',
              dateOfBirth: new Date('2018-06-15T00:00:00.000Z'),
              updatedAt: new Date('2026-05-15T08:00:00.000Z'),
              ...overrides,
            }),
          };
        },
      };
    },
  };
}

function makeService(beneficiaryMock = null) {
  return createBeneficiaryLifecycleService({
    transitionLog: buildMockLog(),
    beneficiaryModel: beneficiaryMock || buildBeneficiaryMock(),
    sideEffectHandlers: {},
    auditLogger: { log: jest.fn(async () => {}) },
    logger: { warn: () => {}, info: () => {} },
  });
}

const actor = { userId: 'user-1', role: 'branch_manager' };

describe('Wave 91 — subject snapshot capture per sensitivity grade', () => {
  test('HIGH transition (initiate_transfer) captures snapshot at request time', async () => {
    const t = reg.findTransition('initiate_transfer');
    const grade = sensitivityGrade.gradeForLifecycleTransition(t);
    expect(['HIGH', 'CRITICAL']).toContain(grade.level); // sanity

    const beneficiary = buildBeneficiaryMock();
    const svc = makeService(beneficiary);

    const r = await svc.requestTransition({
      beneficiaryId: 'b-1',
      branchId: 'br-1',
      destinationBranchId: 'br-2',
      transitionId: 'initiate_transfer',
      actor,
      reason: 'family relocation',
      reasonCode: 'family-relocation',
    });

    expect(r.ok).toBe(true);
    const rec = r.transitionRecord;

    expect(rec.subjectSnapshot).not.toBeNull();
    expect(rec.subjectSnapshot.payloadHash).toMatch(/^[a-f0-9]{64}$/);
    expect(rec.subjectSnapshot.takenAt).toBeInstanceOf(Date);
    expect(rec.subjectSnapshot.dataKinds).toEqual(['beneficiary-identity', 'beneficiary-admin']);
    expect(rec.subjectSnapshot.hashEncodingVersion).toBe('epoch-ms');

    expect(rec.subjectSnapshot.payload).toEqual({
      status: 'active',
      branchId: 'br-1',
      name: 'مستفيد تجريبي',
      primaryGuardianId: 'g-1',
      dateOfBirth: '2018-06-15T00:00:00.000Z',
      updatedAt: '2026-05-15T08:00:00.000Z',
    });
  });

  test('CRITICAL transition (approve_deletion) captures snapshot', async () => {
    const t = reg.findTransition('approve_deletion');
    const grade = sensitivityGrade.gradeForLifecycleTransition(t);
    expect(grade.level).toBe('CRITICAL');

    const svc = makeService(buildBeneficiaryMock({ status: 'deletion-pending' }));
    const r = await svc.requestTransition({
      beneficiaryId: 'b-1',
      branchId: 'br-1',
      transitionId: 'approve_deletion',
      actor: { userId: 'dpo-1', role: 'dpo' },
      reason: 'PDPL erasure approved',
    });

    expect(r.ok).toBe(true);
    expect(r.transitionRecord.subjectSnapshot).not.toBeNull();
    expect(r.transitionRecord.subjectSnapshot.payload.status).toBe('deletion-pending');
  });

  test('LOW/MEDIUM transition (suspend = medium) does NOT capture snapshot', async () => {
    const t = reg.findTransition('suspend');
    const grade = sensitivityGrade.gradeForLifecycleTransition(t);
    expect(['LOW', 'MEDIUM']).toContain(grade.level);
    expect(grade.requiresLedgerAnchor).toBe(false); // gate condition

    const svc = makeService();
    const r = await svc.requestTransition({
      beneficiaryId: 'b-1',
      branchId: 'br-1',
      transitionId: 'suspend',
      actor,
      reason: 'family request',
      reasonCode: 'family',
    });

    expect(r.ok).toBe(true);
    expect(r.transitionRecord.subjectSnapshot).toBeNull();
  });

  test('snapshot is verifiable via evidence-snapshot.lib (round-trip)', async () => {
    const svc = makeService(buildBeneficiaryMock());
    const r = await svc.requestTransition({
      beneficiaryId: 'b-1',
      branchId: 'br-1',
      destinationBranchId: 'br-2',
      transitionId: 'initiate_transfer',
      actor,
      reason: 'family relocation',
      reasonCode: 'family-relocation',
    });

    const snap = r.transitionRecord.subjectSnapshot;
    const verdict = evidenceSnapshot.verifySnapshot(snap);
    expect(verdict.ok).toBe(true);
  });

  test('tampered snapshot is caught by verifySnapshot', async () => {
    const svc = makeService(buildBeneficiaryMock());
    const r = await svc.requestTransition({
      beneficiaryId: 'b-1',
      branchId: 'br-1',
      destinationBranchId: 'br-2',
      transitionId: 'initiate_transfer',
      actor,
      reason: 'family relocation',
      reasonCode: 'family-relocation',
    });

    // Simulate post-storage tamper (changing the branch id on the
    // snapshot payload but keeping the original hash).
    const snap = r.transitionRecord.subjectSnapshot;
    const tampered = {
      takenAt: snap.takenAt,
      dataKinds: [...snap.dataKinds],
      payload: { ...snap.payload, branchId: 'br-EVIL' },
      payloadHash: snap.payloadHash,
      hashEncodingVersion: snap.hashEncodingVersion,
    };
    const verdict = evidenceSnapshot.verifySnapshot(tampered);
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toBe('HASH_MISMATCH');
  });

  test('graceful skip when no beneficiaryModel + HIGH transition (test contexts)', async () => {
    const svc = createBeneficiaryLifecycleService({
      transitionLog: buildMockLog(),
      // no beneficiaryModel
      auditLogger: { log: jest.fn(async () => {}) },
      logger: { warn: () => {}, info: () => {} },
    });
    const r = await svc.requestTransition({
      beneficiaryId: 'b-1',
      branchId: 'br-1',
      destinationBranchId: 'br-2',
      transitionId: 'initiate_transfer',
      actor,
      reason: 'family relocation',
      reasonCode: 'family-relocation',
      metadata: { currentState: 'active' }, // caller supplies state
    });

    expect(r.ok).toBe(true);
    // No model → no snapshot source → snapshot omitted gracefully
    expect(r.transitionRecord.subjectSnapshot).toBeNull();
  });

  test('caller-supplied subjectForSnapshot bypasses model fetch', async () => {
    const svc = createBeneficiaryLifecycleService({
      transitionLog: buildMockLog(),
      auditLogger: { log: jest.fn(async () => {}) },
      logger: { warn: () => {}, info: () => {} },
    });

    const r = await svc.requestTransition({
      beneficiaryId: 'b-1',
      branchId: 'br-1',
      destinationBranchId: 'br-2',
      transitionId: 'initiate_transfer',
      actor,
      reason: 'family relocation',
      reasonCode: 'family-relocation',
      metadata: {
        currentState: 'active',
        subjectForSnapshot: {
          status: 'active',
          branchId: 'br-1',
          name: 'بديل',
        },
      },
    });

    expect(r.ok).toBe(true);
    expect(r.transitionRecord.subjectSnapshot).not.toBeNull();
    expect(r.transitionRecord.subjectSnapshot.payload.name).toBe('بديل');
  });
});
