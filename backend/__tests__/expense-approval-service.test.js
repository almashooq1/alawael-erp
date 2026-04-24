/**
 * expense-approval-service.test.js — Phase 12 Commit 2.
 *
 * Covers the multi-level expense approval chain + SoD enforcement.
 */

'use strict';

const svc = require('../services/finance/expenseApprovalService');

function makeContext() {
  return { store: svc.createMemoryStore() };
}

const ALICE = { userId: 'u-alice', roles: ['accountant'] }; // creator
const BOB = { userId: 'u-bob', roles: ['supervisor'] };
const CAROL = { userId: 'u-carol', roles: ['branch_manager'] };
const DAVE = { userId: 'u-dave', roles: ['finance_manager'] };
const ERIN = { userId: 'u-erin', roles: ['cfo'] };
const FAISAL = { userId: 'u-faisal', roles: ['ceo'] };
const GINA = { userId: 'u-gina', roles: ['cashier'] };
const HANI = { userId: 'u-hani', roles: ['nurse'] }; // no finance role

describe('expenseApprovalService — chain resolution', () => {
  test('level 1 only for small expense', () => {
    const chain = svc._internal.resolveChain(1000, svc.DEFAULT_MATRIX);
    expect(chain).toHaveLength(1);
    expect(chain[0].level).toBe(1);
  });

  test('level 1-3 for large expense', () => {
    const chain = svc._internal.resolveChain(50000, svc.DEFAULT_MATRIX);
    expect(chain.map(s => s.level)).toEqual([1, 2, 3]);
  });

  test('full chain 1-4 for jumbo expense with dual control', () => {
    const chain = svc._internal.resolveChain(500000, svc.DEFAULT_MATRIX);
    expect(chain.map(s => s.level)).toEqual([1, 2, 3, 4]);
    expect(chain[3].dualControl).toBe(true);
  });
});

describe('expenseApprovalService — submit', () => {
  test('creates a pending record with the resolved chain', async () => {
    const { store } = makeContext();
    const rec = await svc.submit({
      store,
      expenseId: 'exp-1',
      amount: 3000,
      branchId: 'br1',
      category: 'supplies',
      createdBy: ALICE,
    });
    expect(rec.status).toBe('pending');
    expect(rec.chain).toHaveLength(1);
    expect(rec.currentLevel).toBe(1);
  });

  test('rejects duplicate submission for the same expense', async () => {
    const { store } = makeContext();
    await svc.submit({ store, expenseId: 'exp-2', amount: 1000, createdBy: ALICE });
    await expect(
      svc.submit({ store, expenseId: 'exp-2', amount: 1000, createdBy: ALICE })
    ).rejects.toThrow(/already exists/);
  });
});

describe('expenseApprovalService — SoD on approval', () => {
  test('creator cannot approve their own expense', async () => {
    const { store } = makeContext();
    await svc.submit({ store, expenseId: 'exp-3', amount: 2000, createdBy: ALICE });
    await expect(svc.approve({ store, expenseId: 'exp-3', actor: ALICE })).rejects.toMatchObject({
      code: 'SOD_SELF_APPROVAL',
    });
  });

  test('actor without an authorization role is refused', async () => {
    const { store } = makeContext();
    await svc.submit({ store, expenseId: 'exp-4', amount: 2000, createdBy: ALICE });
    await expect(svc.approve({ store, expenseId: 'exp-4', actor: HANI })).rejects.toMatchObject({
      code: 'FORBIDDEN_ROLE',
    });
  });

  test('same person cannot approve two different levels', async () => {
    const { store } = makeContext();
    await svc.submit({ store, expenseId: 'exp-5', amount: 50000, createdBy: ALICE });
    // Level 1 approved by finance_manager Dave (Dave is in roles for L1)
    await svc.approve({ store, expenseId: 'exp-5', actor: DAVE });
    // Dave tries to also approve L2 — SoD blocks
    await expect(svc.approve({ store, expenseId: 'exp-5', actor: DAVE })).rejects.toMatchObject({
      code: 'SOD_DUPLICATE_APPROVER',
    });
  });
});

describe('expenseApprovalService — happy path', () => {
  test('small expense: one approval finalizes chain', async () => {
    const { store } = makeContext();
    await svc.submit({ store, expenseId: 'exp-6', amount: 1000, createdBy: ALICE });
    const after = await svc.approve({ store, expenseId: 'exp-6', actor: BOB });
    expect(after.status).toBe('approved');
    expect(after.currentLevel).toBeNull();
    expect(after.chain[0].status).toBe('approved');
  });

  test('mid-range expense: walks levels 1→2→3 before final approval', async () => {
    const { store } = makeContext();
    await svc.submit({ store, expenseId: 'exp-7', amount: 50000, createdBy: ALICE });
    let rec = await svc.approve({ store, expenseId: 'exp-7', actor: BOB }); // L1
    expect(rec.status).toBe('pending');
    expect(rec.currentLevel).toBe(2);
    rec = await svc.approve({ store, expenseId: 'exp-7', actor: CAROL }); // L2
    expect(rec.currentLevel).toBe(3);
    rec = await svc.approve({ store, expenseId: 'exp-7', actor: DAVE }); // L3
    expect(rec.status).toBe('approved');
  });

  test('jumbo expense: dual-control at level 4 requires two distinct approvers', async () => {
    const { store } = makeContext();
    await svc.submit({ store, expenseId: 'exp-8', amount: 500000, createdBy: ALICE });
    await svc.approve({ store, expenseId: 'exp-8', actor: BOB }); // L1
    await svc.approve({ store, expenseId: 'exp-8', actor: CAROL }); // L2
    await svc.approve({ store, expenseId: 'exp-8', actor: DAVE }); // L3
    const step4 = (await svc.approve({ store, expenseId: 'exp-8', actor: ERIN })).chain[3];
    expect(step4.status).toBe('pending'); // still needs second approver
    const final = await svc.approve({ store, expenseId: 'exp-8', actor: FAISAL });
    expect(final.status).toBe('approved');
    expect(final.chain[3].approvers).toHaveLength(2);
  });
});

describe('expenseApprovalService — reject', () => {
  test('any legitimate approver at the current level can reject with a reason', async () => {
    const { store } = makeContext();
    await svc.submit({ store, expenseId: 'exp-9', amount: 2000, createdBy: ALICE });
    const rec = await svc.reject({
      store,
      expenseId: 'exp-9',
      actor: BOB,
      reason: 'missing invoice',
    });
    expect(rec.status).toBe('rejected');
    expect(rec.rejection.reason).toBe('missing invoice');
  });

  test('creator cannot reject their own request', async () => {
    const { store } = makeContext();
    await svc.submit({ store, expenseId: 'exp-10', amount: 2000, createdBy: ALICE });
    await expect(
      svc.reject({ store, expenseId: 'exp-10', actor: ALICE, reason: 'oops' })
    ).rejects.toMatchObject({ code: 'SOD_SELF_REJECT' });
  });

  test('rejection requires a reason', async () => {
    const { store } = makeContext();
    await svc.submit({ store, expenseId: 'exp-11', amount: 2000, createdBy: ALICE });
    await expect(svc.reject({ store, expenseId: 'exp-11', actor: BOB })).rejects.toThrow(
      /reason is required/
    );
  });
});

describe('expenseApprovalService — payment release (two-hands rule)', () => {
  test('cashier can release payment on an approved expense', async () => {
    const { store } = makeContext();
    await svc.submit({ store, expenseId: 'exp-12', amount: 1000, createdBy: ALICE });
    await svc.approve({ store, expenseId: 'exp-12', actor: BOB });
    const rec = await svc.releasePayment({ store, expenseId: 'exp-12', actor: GINA });
    expect(rec.payment.status).toBe('released');
    expect(rec.payment.by).toBe('u-gina');
  });

  test('approver cannot also be the one releasing payment', async () => {
    const { store } = makeContext();
    await svc.submit({ store, expenseId: 'exp-13', amount: 1000, createdBy: ALICE });
    await svc.approve({ store, expenseId: 'exp-13', actor: DAVE }); // finance_manager approves
    // DAVE has finance_manager role (in PAYMENT_RELEASE_ROLES too) — must still be blocked
    await expect(
      svc.releasePayment({ store, expenseId: 'exp-13', actor: DAVE })
    ).rejects.toMatchObject({ code: 'SOD_APPROVER_PAYS' });
  });

  test('cannot release payment on pending or rejected expense', async () => {
    const { store } = makeContext();
    await svc.submit({ store, expenseId: 'exp-14', amount: 1000, createdBy: ALICE });
    await expect(svc.releasePayment({ store, expenseId: 'exp-14', actor: GINA })).rejects.toThrow(
      /must be approved/
    );
  });

  test('non-payment role cannot release payment', async () => {
    const { store } = makeContext();
    await svc.submit({ store, expenseId: 'exp-15', amount: 1000, createdBy: ALICE });
    await svc.approve({ store, expenseId: 'exp-15', actor: BOB });
    await expect(
      svc.releasePayment({ store, expenseId: 'exp-15', actor: HANI })
    ).rejects.toMatchObject({ code: 'FORBIDDEN_PAY_ROLE' });
  });
});

describe('expenseApprovalService — listPending', () => {
  test('returns pending expenses filterable by branch and role', async () => {
    const { store } = makeContext();
    await svc.submit({
      store,
      expenseId: 'exp-16',
      amount: 2000,
      branchId: 'br1',
      createdBy: ALICE,
    });
    await svc.submit({
      store,
      expenseId: 'exp-17',
      amount: 50000,
      branchId: 'br2',
      createdBy: ALICE,
    });

    const forBr1 = await svc.listPending({ store, branchId: 'br1' });
    expect(forBr1).toHaveLength(1);

    const forSupervisor = await svc.listPending({ store, role: 'supervisor' });
    // both have L1 pending, and supervisor can approve L1
    expect(forSupervisor).toHaveLength(2);

    const forCfo = await svc.listPending({ store, role: 'cfo' });
    // cfo can approve L1 through L4 — all pending items qualify at their current level
    expect(forCfo.length).toBeGreaterThanOrEqual(1);
  });
});
