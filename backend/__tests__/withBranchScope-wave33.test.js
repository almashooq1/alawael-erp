/**
 * withBranchScope-wave33.test.js — Wave 33.
 *
 *   Scope injection per actor type:
 *     1. GLOBAL actor → filter unchanged
 *     2. BRANCH actor → branchId injected
 *     3. Multi-branch (REGION or elevation) → $in injected
 *     4. OWN scope → branch filter + owner $or
 *     5. ASSIGNED scope → branch filter + owner $or
 *
 *   Caller-supplied branchId:
 *     6. Caller's branchId in scope → respected
 *     7. Caller's branchId NOT in scope → MATCH_NOTHING returned
 *     8. Caller's branchId is $in array — intersected with scope
 *
 *   Filter composition:
 *     9. Caller filter is preserved (status, $or, $and, etc.)
 *    10. Caller's $or wrapped in $and with scope $or (no clobber)
 *    11. Existing $and is extended (not replaced)
 *
 *   Sentinels:
 *    12. SYSTEM_BYPASS → filter unchanged + onSystemBypass fired
 *    13. Missing actor → throws (default-deny is explicit)
 *
 *   Edge cases:
 *    14. No actor.branchId on BRANCH-scoped role → MATCH_NOTHING
 *    15. Custom branchField (legacy models) supported
 *    16. Input filter NEVER mutated
 *    17. Expired elevation is ignored (defense-in-depth — service handles this too)
 */

'use strict';

const withBranchScope = require('../intelligence/withBranchScope');
const { SYSTEM_BYPASS, MATCH_NOTHING } = withBranchScope;

// ─── 1-3. Scope injection ───────────────────────────────────────

describe('withBranchScope — scope injection', () => {
  test('GLOBAL actor → filter passes through unchanged', () => {
    const filter = withBranchScope({ userId: 'u-1', roles: ['super_admin'] }, { status: 'active' });
    expect(filter).toEqual({ status: 'active' });
    expect(filter.branchId).toBeUndefined();
  });

  test('BRANCH actor → branchId injected as single value', () => {
    const filter = withBranchScope(
      { userId: 'u-1', roles: ['manager'], branchId: 'B-1' },
      { status: 'active' }
    );
    expect(filter.branchId).toBe('B-1');
    expect(filter.status).toBe('active');
  });

  test('multi-branch (elevation) → $in injected', () => {
    const filter = withBranchScope(
      {
        userId: 'u-1',
        roles: ['manager'],
        branchId: 'B-1',
        elevation: {
          toScope: 'BRANCH',
          branchId: 'B-2',
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      },
      {}
    );
    expect(filter.branchId).toEqual({ $in: expect.arrayContaining(['B-1', 'B-2']) });
  });

  test('GLOBAL via elevation → no branchId filter', () => {
    const filter = withBranchScope(
      {
        userId: 'u-1',
        roles: ['manager'],
        branchId: 'B-1',
        elevation: {
          toScope: 'GLOBAL',
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      },
      { status: 'active' }
    );
    expect(filter.branchId).toBeUndefined();
  });
});

// ─── 4-5. OWN / ASSIGNED scope ──────────────────────────────────

describe('withBranchScope — OWN / ASSIGNED scope', () => {
  test('OWN scope → branch filter + owner $or', () => {
    const filter = withBranchScope(
      { userId: 'u-1', roles: ['therapist'], branchId: 'B-1' },
      { status: 'active' }
    );
    expect(filter.branchId).toBe('B-1');
    expect(filter.status).toBe('active');
    expect(filter.$or).toEqual([{ createdBy: 'u-1' }, { assignedTo: 'u-1' }, { ownerId: 'u-1' }]);
  });

  test('OWN scope without userId → no owner $or', () => {
    // Edge case — service account with OWN somehow.
    const filter = withBranchScope(
      { userId: null, isServiceAccount: true, roles: ['therapist'], branchId: 'B-1' },
      {}
    );
    expect(filter.$or).toBeUndefined();
  });
});

// ─── 6-8. Caller's branchId validation ─────────────────────────

describe('withBranchScope — caller-supplied branchId', () => {
  test('caller branchId in scope → respected', () => {
    const filter = withBranchScope(
      { userId: 'u-1', roles: ['manager'], branchId: 'B-1' },
      { branchId: 'B-1', status: 'active' }
    );
    expect(filter.branchId).toBe('B-1');
    expect(filter.status).toBe('active');
  });

  test('caller branchId NOT in scope → MATCH_NOTHING', () => {
    // Branch user trying to read B-999 → return filter that matches nothing
    const filter = withBranchScope(
      { userId: 'u-1', roles: ['manager'], branchId: 'B-1' },
      { branchId: 'B-999' }
    );
    expect(filter).toEqual({ _id: { $exists: false } });
  });

  test('caller branchId as $in → intersected with scope', () => {
    const filter = withBranchScope(
      {
        userId: 'u-1',
        roles: ['manager'],
        branchId: 'B-1',
        elevation: {
          toScope: 'BRANCH',
          branchId: 'B-2',
          expiresAt: new Date(Date.now() + 3600 * 1000),
        },
      },
      { branchId: { $in: ['B-1', 'B-2', 'B-999'] } }
    );
    // B-999 not in scope → dropped; B-1, B-2 kept
    expect(filter.branchId).toEqual({ $in: ['B-1', 'B-2'] });
  });

  test('caller branchId $in with NO overlap → MATCH_NOTHING', () => {
    const filter = withBranchScope(
      { userId: 'u-1', roles: ['manager'], branchId: 'B-1' },
      { branchId: { $in: ['B-998', 'B-999'] } }
    );
    expect(filter).toEqual({ _id: { $exists: false } });
  });

  test('GLOBAL actor with explicit branchId → passes through unchanged', () => {
    const filter = withBranchScope(
      { userId: 'admin', roles: ['super_admin'] },
      { branchId: 'B-7' }
    );
    expect(filter.branchId).toBe('B-7');
  });
});

// ─── 9-11. Filter composition ──────────────────────────────────

describe('withBranchScope — filter composition', () => {
  test('caller status filter preserved', () => {
    const filter = withBranchScope(
      { userId: 'u-1', roles: ['manager'], branchId: 'B-1' },
      { status: 'active', category: 'clinical' }
    );
    expect(filter.status).toBe('active');
    expect(filter.category).toBe('clinical');
  });

  test('caller $or wrapped in $and with scope $or (OWN scope)', () => {
    const filter = withBranchScope(
      { userId: 'u-1', roles: ['therapist'], branchId: 'B-1' },
      { $or: [{ status: 'open' }, { status: 'pending' }] }
    );
    // Caller's $or NOT clobbered; wrapped in $and along with scope's
    expect(filter.$and).toEqual([
      { $or: [{ status: 'open' }, { status: 'pending' }] },
      { $or: [{ createdBy: 'u-1' }, { assignedTo: 'u-1' }, { ownerId: 'u-1' }] },
    ]);
    // The top-level $or is removed
    expect(filter.$or).toBeUndefined();
  });

  test('existing $and is extended, not replaced', () => {
    const filter = withBranchScope(
      { userId: 'u-1', roles: ['therapist'], branchId: 'B-1' },
      {
        $and: [{ priority: 'high' }],
        $or: [{ status: 'open' }, { status: 'pending' }],
      }
    );
    expect(filter.$and).toHaveLength(3);
    expect(filter.$and[0]).toEqual({ priority: 'high' });
  });
});

// ─── 12-13. Sentinels ─────────────────────────────────────────

describe('withBranchScope — sentinels', () => {
  test('SYSTEM_BYPASS → filter passes through + onSystemBypass fires', () => {
    let captured = null;
    const filter = withBranchScope(
      SYSTEM_BYPASS,
      { status: 'active' },
      {
        onSystemBypass: args => {
          captured = args;
        },
      }
    );
    expect(filter).toEqual({ status: 'active' });
    expect(captured).toEqual({ filter: { status: 'active' } });
  });

  test('SYSTEM_BYPASS without onSystemBypass callback is fine', () => {
    expect(() => withBranchScope(SYSTEM_BYPASS, { status: 'active' })).not.toThrow();
  });

  test('SYSTEM_BYPASS handler that throws does NOT bubble', () => {
    expect(() =>
      withBranchScope(
        SYSTEM_BYPASS,
        { status: 'active' },
        {
          onSystemBypass: () => {
            throw new Error('logger borked');
          },
        }
      )
    ).not.toThrow();
  });

  test('missing actor → throws explicit error', () => {
    expect(() => withBranchScope(null, {})).toThrow(/actor is required/);
    expect(() => withBranchScope(undefined, {})).toThrow(/actor is required/);
    expect(() => withBranchScope('not-an-object', {})).toThrow(/actor is required/);
  });

  test('error message mentions both options (actor + SYSTEM_BYPASS)', () => {
    try {
      withBranchScope(null, {});
      throw new Error('expected throw');
    } catch (e) {
      expect(e.message).toMatch(/req\.actor/);
      expect(e.message).toMatch(/SYSTEM_BYPASS/);
    }
  });
});

// ─── 14-17. Edge cases ────────────────────────────────────────

describe('withBranchScope — edge cases', () => {
  test('BRANCH role without branchId → MATCH_NOTHING (cannot scope)', () => {
    const filter = withBranchScope(
      { userId: 'u-1', roles: ['manager'], branchId: null },
      { status: 'active' }
    );
    expect(filter).toEqual({ _id: { $exists: false } });
  });

  test('unknown role → MATCH_NOTHING (cannot resolve scope)', () => {
    const filter = withBranchScope({ userId: 'u-1', roles: ['not_a_role'], branchId: 'B-1' }, {});
    expect(filter).toEqual({ _id: { $exists: false } });
  });

  test('custom branchField for legacy models', () => {
    const filter = withBranchScope(
      { userId: 'u-1', roles: ['manager'], branchId: 'B-1' },
      { status: 'active' },
      { branchField: 'branch_id' }
    );
    expect(filter.branch_id).toBe('B-1');
    expect(filter.branchId).toBeUndefined();
  });

  test('input filter object is NEVER mutated', () => {
    const original = { status: 'active', category: 'clinical' };
    const originalCopy = { ...original };
    withBranchScope({ userId: 'u-1', roles: ['manager'], branchId: 'B-1' }, original);
    expect(original).toEqual(originalCopy);
  });

  test('input filter object with $or is NEVER mutated', () => {
    const original = { $or: [{ a: 1 }, { b: 2 }], status: 'x' };
    const originalCopy = JSON.parse(JSON.stringify(original));
    withBranchScope({ userId: 'u-1', roles: ['therapist'], branchId: 'B-1' }, original);
    expect(original).toEqual(originalCopy);
  });

  test('expired elevation is ignored', () => {
    const filter = withBranchScope(
      {
        userId: 'u-1',
        roles: ['manager'],
        branchId: 'B-1',
        elevation: {
          toScope: 'GLOBAL',
          expiresAt: new Date(Date.now() - 1000), // expired
        },
      },
      { status: 'active' }
    );
    // Should fall back to branch scope, not GLOBAL
    expect(filter.branchId).toBe('B-1');
  });

  test('caller filter without any fields → returns just scope filter', () => {
    const filter = withBranchScope({ userId: 'u-1', roles: ['manager'], branchId: 'B-1' }, {});
    expect(filter).toEqual({ branchId: 'B-1' });
  });

  test('caller filter with branchId: $eq operator → respected', () => {
    const filter = withBranchScope(
      { userId: 'u-1', roles: ['manager'], branchId: 'B-1' },
      { branchId: { $eq: 'B-1' }, status: 'active' }
    );
    // Helper unpacks $eq and narrows to the valid intersection
    expect(filter.branchId).toBe('B-1');
  });
});

// ─── Symbol identity ──────────────────────────────────────────

describe('withBranchScope — module exports', () => {
  test('SYSTEM_BYPASS accessible via both default + named export', () => {
    expect(withBranchScope.SYSTEM_BYPASS).toBe(SYSTEM_BYPASS);
    expect(typeof withBranchScope.SYSTEM_BYPASS).toBe('symbol');
  });

  test('MATCH_NOTHING is the right shape', () => {
    expect(MATCH_NOTHING).toEqual({ _id: { $exists: false } });
  });
});
