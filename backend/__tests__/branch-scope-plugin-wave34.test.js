/**
 * branch-scope-plugin-wave34.test.js — Wave 34.
 *
 * Tests the hook BODIES (applyReadScope / applyWriteScope /
 * applyAggregateScope) directly. We do NOT go through Mongoose's
 * exec() chain because:
 *   • Mongoose pre-hooks run inside exec()
 *   • Mocking exec() bypasses the hooks (catch-22)
 *   • Real Mongo would be heavy and orthogonal to what we're testing
 *
 * The hook bodies are pure functions that operate on a Query-like
 * object — we mint mock Queries that satisfy the interface.
 */

'use strict';

const mongoose = require('mongoose');
const branchScopePlugin = require('../intelligence/branchScopePlugin');

const { applyReadScope, applyWriteScope, applyAggregateScope, SYSTEM_BYPASS } = branchScopePlugin;

// ─── Mock Query / Aggregate factories ──────────────────────────

function mockQuery({ filter = {}, options = {} } = {}) {
  return {
    _filter: { ...filter },
    _opts: { ...options },
    __branchScoped: false,
    getFilter() {
      return this._filter;
    },
    getOptions() {
      return this._opts;
    },
    setQuery(newFilter) {
      this._filter = newFilter;
    },
  };
}

function mockAggregate({ pipeline = [], options = {} } = {}) {
  const p = [...pipeline];
  return {
    options,
    __branchScoped: false,
    pipeline() {
      return p;
    },
  };
}

// ─── 1. applyReadScope ─────────────────────────────────────────

describe('applyReadScope — basic behavior', () => {
  test('throws when no actor + requireActor=true (default)', () => {
    const q = mockQuery({ filter: { status: 'active' } });
    expect(() => applyReadScope(q, { requireActor: true })).toThrow(/query missing \{ actor \}/);
  });

  test('passes through when no actor + requireActor=false', () => {
    const q = mockQuery({ filter: { status: 'active' } });
    applyReadScope(q, { requireActor: false });
    expect(q.getFilter()).toEqual({ status: 'active' });
    expect(q.__branchScoped).toBe(true);
  });

  test('SYSTEM_BYPASS → filter unchanged', () => {
    const q = mockQuery({
      filter: { status: 'active' },
      options: { actor: SYSTEM_BYPASS },
    });
    applyReadScope(q);
    expect(q.getFilter()).toEqual({ status: 'active' });
  });

  test('GLOBAL actor → filter unchanged', () => {
    const q = mockQuery({
      filter: { status: 'active' },
      options: { actor: { userId: 'u-admin', roles: ['super_admin'] } },
    });
    applyReadScope(q);
    expect(q.getFilter()).toEqual({ status: 'active' });
  });

  test('BRANCH actor → branchId injected', () => {
    const branchId = new mongoose.Types.ObjectId();
    const q = mockQuery({
      filter: { status: 'active' },
      options: { actor: { userId: 'u-1', roles: ['manager'], branchId } },
    });
    applyReadScope(q);
    expect(String(q.getFilter().branchId)).toBe(String(branchId));
    expect(q.getFilter().status).toBe('active');
  });

  test('actor with foreign branchId in filter → MATCH_NOTHING', () => {
    const actorBranch = new mongoose.Types.ObjectId();
    const otherBranch = new mongoose.Types.ObjectId();
    const q = mockQuery({
      filter: { branchId: otherBranch },
      options: {
        actor: { userId: 'u-1', roles: ['manager'], branchId: actorBranch },
      },
    });
    applyReadScope(q);
    expect(q.getFilter()).toEqual({ _id: { $exists: false } });
  });

  test('OWN role → owner $or appended', () => {
    const branchId = new mongoose.Types.ObjectId();
    const q = mockQuery({
      filter: {},
      options: {
        actor: { userId: 'u-1', roles: ['therapist'], branchId },
      },
    });
    applyReadScope(q);
    expect(q.getFilter().$or).toEqual([
      { createdBy: 'u-1' },
      { assignedTo: 'u-1' },
      { ownerId: 'u-1' },
    ]);
  });
});

// ─── 2. branchField customization ──────────────────────────────

describe('applyReadScope — branchField', () => {
  test('legacy models with branch_id field', () => {
    const branchId = new mongoose.Types.ObjectId();
    const q = mockQuery({
      filter: {},
      options: { actor: { userId: 'u-1', roles: ['manager'], branchId } },
    });
    applyReadScope(q, { branchField: 'branch_id' });
    expect(String(q.getFilter().branch_id)).toBe(String(branchId));
    expect(q.getFilter().branchId).toBeUndefined();
  });
});

// ─── 3. Re-entrance guard ──────────────────────────────────────

describe('applyReadScope — re-entrance', () => {
  test('second call is a no-op (__branchScoped flag)', () => {
    const branchId = new mongoose.Types.ObjectId();
    const q = mockQuery({
      filter: { status: 'active' },
      options: { actor: { userId: 'u-1', roles: ['manager'], branchId } },
    });
    applyReadScope(q);
    const filterAfterFirst = JSON.stringify(q.getFilter());
    applyReadScope(q); // second call should be no-op
    const filterAfterSecond = JSON.stringify(q.getFilter());
    expect(filterAfterSecond).toBe(filterAfterFirst);
  });
});

// ─── 4. applyWriteScope ────────────────────────────────────────

describe('applyWriteScope — strict-mode write enforcement', () => {
  test('throws when no actor (strict mode default)', () => {
    const q = mockQuery({ filter: { status: 'old' } });
    expect(() => applyWriteScope(q)).toThrow(/write query missing \{ actor \}/);
  });

  test('actor present → branch scope applied to write filter', () => {
    const branchId = new mongoose.Types.ObjectId();
    const q = mockQuery({
      filter: { status: 'old' },
      options: { actor: { userId: 'u-1', roles: ['manager'], branchId } },
    });
    applyWriteScope(q);
    expect(String(q.getFilter().branchId)).toBe(String(branchId));
    expect(q.getFilter().status).toBe('old');
  });

  test('foreign branchId in write filter → MATCH_NOTHING (no rows touched)', () => {
    const q = mockQuery({
      filter: { branchId: new mongoose.Types.ObjectId() },
      options: {
        actor: {
          userId: 'u-1',
          roles: ['manager'],
          branchId: new mongoose.Types.ObjectId(),
        },
      },
    });
    applyWriteScope(q);
    expect(q.getFilter()).toEqual({ _id: { $exists: false } });
  });
});

// ─── 5. applyAggregateScope ────────────────────────────────────

describe('applyAggregateScope — pipeline scope injection', () => {
  test('throws when no actor', () => {
    const a = mockAggregate({ pipeline: [{ $match: { status: 'active' } }] });
    expect(() => applyAggregateScope(a)).toThrow(/aggregate missing \{ actor \}/);
  });

  test('BRANCH actor → $match prepended', () => {
    const branchId = new mongoose.Types.ObjectId();
    const a = mockAggregate({
      pipeline: [{ $match: { status: 'active' } }],
      options: { actor: { userId: 'u-1', roles: ['manager'], branchId } },
    });
    applyAggregateScope(a);
    expect(a.pipeline()).toHaveLength(2);
    expect(a.pipeline()[0]).toHaveProperty('$match');
    expect(String(a.pipeline()[0].$match.branchId)).toBe(String(branchId));
    // Caller's stage preserved as stage 2
    expect(a.pipeline()[1]).toEqual({ $match: { status: 'active' } });
  });

  test('GLOBAL actor → no extra stage prepended', () => {
    const a = mockAggregate({
      pipeline: [{ $match: { status: 'active' } }],
      options: { actor: { userId: 'u-admin', roles: ['super_admin'] } },
    });
    applyAggregateScope(a);
    expect(a.pipeline()).toEqual([{ $match: { status: 'active' } }]);
  });

  test('SYSTEM_BYPASS → no extra stage prepended', () => {
    const a = mockAggregate({
      pipeline: [{ $match: { status: 'active' } }],
      options: { actor: SYSTEM_BYPASS },
    });
    applyAggregateScope(a);
    expect(a.pipeline()).toEqual([{ $match: { status: 'active' } }]);
  });

  test('OWN actor → $match with branch + $or appended', () => {
    const branchId = new mongoose.Types.ObjectId();
    const a = mockAggregate({
      pipeline: [],
      options: { actor: { userId: 'u-1', roles: ['therapist'], branchId } },
    });
    applyAggregateScope(a);
    expect(a.pipeline()).toHaveLength(1);
    expect(a.pipeline()[0].$match.$or).toEqual([
      { createdBy: 'u-1' },
      { assignedTo: 'u-1' },
      { ownerId: 'u-1' },
    ]);
  });

  test('re-entrance guard prevents double-prepend', () => {
    const branchId = new mongoose.Types.ObjectId();
    const a = mockAggregate({
      pipeline: [{ $match: { status: 'active' } }],
      options: { actor: { userId: 'u-1', roles: ['manager'], branchId } },
    });
    applyAggregateScope(a);
    const firstLen = a.pipeline().length;
    applyAggregateScope(a); // second call — no-op
    expect(a.pipeline().length).toBe(firstLen);
  });
});

// ─── 6. Module exports ─────────────────────────────────────────

describe('branchScopePlugin — exports', () => {
  test('SYSTEM_BYPASS is a symbol', () => {
    expect(typeof branchScopePlugin.SYSTEM_BYPASS).toBe('symbol');
  });

  test('hook bodies exported as named functions', () => {
    expect(typeof branchScopePlugin.applyReadScope).toBe('function');
    expect(typeof branchScopePlugin.applyWriteScope).toBe('function');
    expect(typeof branchScopePlugin.applyAggregateScope).toBe('function');
  });
});

// ─── 7. Plugin registers hooks on schema ──────────────────────

describe('branchScopePlugin — schema integration', () => {
  test('schema.plugin() does not throw', () => {
    const schema = new mongoose.Schema({ branchId: mongoose.Schema.Types.ObjectId });
    expect(() => schema.plugin(branchScopePlugin)).not.toThrow();
  });

  test('schema.plugin() with strict:true does not throw', () => {
    const schema = new mongoose.Schema({ branchId: mongoose.Schema.Types.ObjectId });
    expect(() => schema.plugin(branchScopePlugin, { strict: true })).not.toThrow();
  });

  test('schema.plugin() with custom branchField does not throw', () => {
    const schema = new mongoose.Schema({ branch_id: mongoose.Schema.Types.ObjectId });
    expect(() => schema.plugin(branchScopePlugin, { branchField: 'branch_id' })).not.toThrow();
  });
});
