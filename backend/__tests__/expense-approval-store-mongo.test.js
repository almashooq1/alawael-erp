/**
 * expense-approval-store-mongo.test.js — Phase 12 Commit 4.
 *
 * Contract tests for the Mongo-backed approval store adapter.
 * We fake the Mongoose Model with an in-memory Map that mirrors the
 * findOne/findOneAndUpdate/find-with-lean surface the adapter uses.
 * This keeps the tests fast and deterministic while proving the
 * adapter honours the service's store contract and faithfully
 * round-trips the record shape.
 */

'use strict';

const svc = require('../services/finance/expenseApprovalService');
const { createMongoStore, _project } = require('../services/finance/expenseApprovalStore.mongo');

/**
 * Minimal stand-in for a Mongoose Model. Supports:
 *   - findOne({ expenseId }).lean()
 *   - findOneAndUpdate({ expenseId }, { $set }, { upsert, new }).lean()
 *   - find(filter).lean()
 */
function fakeModel() {
  const store = new Map();

  function matches(doc, q) {
    for (const [k, v] of Object.entries(q || {})) {
      if (doc[k] !== v) return false;
    }
    return true;
  }

  return {
    _store: store,
    findOne(q) {
      const doc = Array.from(store.values()).find(d => matches(d, q)) || null;
      return { lean: async () => (doc ? { ...doc } : null) };
    },
    findOneAndUpdate(q, update, opts = {}) {
      const current = Array.from(store.values()).find(d => matches(d, q));
      const patch = update.$set || {};
      const next = { ...(current || {}), ...patch };
      if (!current && opts.upsert === false) {
        return { lean: async () => null };
      }
      store.set(next.expenseId, next);
      return { lean: async () => ({ ...next }) };
    },
    find(filter = {}) {
      const docs = Array.from(store.values()).filter(d => matches(d, filter));
      return { lean: async () => docs.map(d => ({ ...d })) };
    },
  };
}

describe('expenseApprovalStore.mongo — _project', () => {
  test('returns null for a null doc', () => {
    expect(_project(null)).toBeNull();
  });

  test('normalises chain, history, payment, rejection', () => {
    const doc = {
      expenseId: 'exp-1',
      amount: 1000,
      branchId: 'br1',
      status: 'approved',
      currentLevel: null,
      createdBy: { userId: 'u1', roles: ['accountant'] },
      chain: [
        {
          level: 1,
          maxAmount: 5000,
          allowedRoles: ['supervisor'],
          dualControl: false,
          status: 'approved',
          approvers: [{ userId: 'u2', roles: ['supervisor'], at: '2026-04-23T00:00:00Z' }],
          decidedAt: '2026-04-23T00:00:00Z',
        },
      ],
      history: [{ at: '2026-04-23T00:00:00Z', action: 'submitted', actorId: 'u1' }],
      payment: null,
      rejection: null,
      metadata: { origin: 'test' },
    };
    const p = _project(doc);
    expect(p.chain[0].approvers[0].userId).toBe('u2');
    expect(p.payment).toBeNull();
    expect(p.metadata.origin).toBe('test');
  });

  test('strips empty/sentinel payment and rejection objects', () => {
    const p = _project({
      expenseId: 'exp-x',
      amount: 1,
      createdBy: { userId: 'u' },
      chain: [],
      history: [],
      payment: { status: null },
      rejection: { by: null },
    });
    expect(p.payment).toBeNull();
    expect(p.rejection).toBeNull();
  });
});

describe('expenseApprovalStore.mongo — store contract', () => {
  test('put then get round-trips a record', async () => {
    const Model = fakeModel();
    const store = createMongoStore({ Model });
    const rec = {
      expenseId: 'exp-1',
      amount: 1000,
      branchId: 'br1',
      status: 'pending',
      currentLevel: 1,
      createdBy: { userId: 'u1', roles: ['accountant'] },
      chain: [
        {
          level: 1,
          maxAmount: 5000,
          allowedRoles: ['supervisor'],
          dualControl: false,
          status: 'pending',
          approvers: [],
        },
      ],
      history: [{ at: '2026-04-23T00:00:00Z', action: 'submitted', actorId: 'u1' }],
      metadata: {},
    };
    await store.put('exp-1', rec);
    const got = await store.get('exp-1');
    expect(got.expenseId).toBe('exp-1');
    expect(got.amount).toBe(1000);
    expect(got.chain).toHaveLength(1);
  });

  test('get returns null for an unknown id', async () => {
    const store = createMongoStore({ Model: fakeModel() });
    expect(await store.get('missing')).toBeNull();
  });

  test('list filters by status and branchId', async () => {
    const Model = fakeModel();
    const store = createMongoStore({ Model });
    await store.put('exp-1', {
      expenseId: 'exp-1',
      amount: 100,
      branchId: 'br1',
      status: 'pending',
      createdBy: { userId: 'u' },
      chain: [],
      history: [],
    });
    await store.put('exp-2', {
      expenseId: 'exp-2',
      amount: 200,
      branchId: 'br2',
      status: 'pending',
      createdBy: { userId: 'u' },
      chain: [],
      history: [],
    });
    await store.put('exp-3', {
      expenseId: 'exp-3',
      amount: 300,
      branchId: 'br1',
      status: 'approved',
      createdBy: { userId: 'u' },
      chain: [],
      history: [],
    });

    const pendingBr1 = await store.list({ status: 'pending', branchId: 'br1' });
    expect(pendingBr1).toHaveLength(1);
    expect(pendingBr1[0].expenseId).toBe('exp-1');

    const allPending = await store.list({ status: 'pending' });
    expect(allPending).toHaveLength(2);
  });

  test('throws when Model is missing', () => {
    expect(() => createMongoStore({})).toThrow(/Model is required/);
  });
});

describe('expenseApprovalService — end-to-end with Mongo store', () => {
  test('full approval flow works identically against the Mongo adapter', async () => {
    const Model = fakeModel();
    const store = createMongoStore({ Model });

    await svc.submit({
      store,
      expenseId: 'exp-42',
      amount: 50000,
      branchId: 'br1',
      createdBy: { userId: 'u-alice', roles: ['accountant'] },
    });

    await svc.approve({
      store,
      expenseId: 'exp-42',
      actor: { userId: 'u-bob', roles: ['supervisor'] },
    });
    await svc.approve({
      store,
      expenseId: 'exp-42',
      actor: { userId: 'u-carol', roles: ['branch_manager'] },
    });
    const final = await svc.approve({
      store,
      expenseId: 'exp-42',
      actor: { userId: 'u-dave', roles: ['finance_manager'] },
    });

    expect(final.status).toBe('approved');

    // Re-fetch from store (proves it was persisted to the "DB")
    const refetched = await store.get('exp-42');
    expect(refetched.status).toBe('approved');
    expect(refetched.chain).toHaveLength(3);
    expect(refetched.chain.every(s => s.status === 'approved')).toBe(true);
  });

  test('SoD enforcement still fires when backed by Mongo adapter', async () => {
    const Model = fakeModel();
    const store = createMongoStore({ Model });
    await svc.submit({
      store,
      expenseId: 'exp-43',
      amount: 1000,
      createdBy: { userId: 'u-alice', roles: ['accountant'] },
    });
    await expect(
      svc.approve({
        store,
        expenseId: 'exp-43',
        actor: { userId: 'u-alice', roles: ['accountant', 'supervisor'] },
      })
    ).rejects.toMatchObject({ code: 'SOD_SELF_APPROVAL' });
  });

  test('payment release persists through the adapter', async () => {
    const Model = fakeModel();
    const store = createMongoStore({ Model });
    await svc.submit({
      store,
      expenseId: 'exp-44',
      amount: 2000,
      createdBy: { userId: 'u-alice', roles: ['accountant'] },
    });
    await svc.approve({
      store,
      expenseId: 'exp-44',
      actor: { userId: 'u-bob', roles: ['supervisor'] },
    });
    await svc.releasePayment({
      store,
      expenseId: 'exp-44',
      actor: { userId: 'u-gina', roles: ['cashier'] },
    });
    const refetched = await store.get('exp-44');
    expect(refetched.payment.status).toBe('released');
    expect(refetched.payment.by).toBe('u-gina');
  });
});
