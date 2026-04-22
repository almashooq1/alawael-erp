/**
 * user-branch-role-window.test.js — Phase-7 Commit 9 pure-logic
 * tests for the secondment/multi-branch window filter.
 *
 * The schema + findActiveForUser/revoke statics are verified
 * end-to-end by scripts/_user-branch-role-smoke.js (standalone —
 * live mongo). In Jest we exercise UserBranchRole.filterActive()
 * directly because it's a pure function that doesn't need the
 * mongoose connection lifecycle (same workaround pattern used by
 * RecordGrant in commit dbab4b91 for the Jest+Mongoose 9 schema-
 * defaults quirk).
 */

'use strict';

// Import the pure helper by name, not the model. Avoids the
// Jest+Mongoose 9 sandbox issue where schema statics sometimes
// don't attach to the model at top-level require time.
const { filterActive } = require('../models/UserBranchRole');
const UserBranchRole = { filterActive };

const now = new Date('2026-04-22T12:00:00Z');

function mk({
  id = 'a1',
  status = 'active',
  validFrom = null,
  validUntil = null,
  branchId = 'br1',
  role = 'therapist',
} = {}) {
  return { _id: id, status, validFrom, validUntil, branchId, role };
}

describe('UserBranchRole.filterActive — status gating', () => {
  it('includes an active row with no window', () => {
    expect(UserBranchRole.filterActive([mk()], now)).toHaveLength(1);
  });

  it('excludes a revoked row even if the window covers now', () => {
    const rows = [mk({ status: 'revoked' })];
    expect(UserBranchRole.filterActive(rows, now)).toHaveLength(0);
  });

  it('excludes an expired row', () => {
    const rows = [mk({ status: 'expired' })];
    expect(UserBranchRole.filterActive(rows, now)).toHaveLength(0);
  });
});

describe('UserBranchRole.filterActive — validFrom', () => {
  it('excludes a row whose validFrom is in the future', () => {
    const future = new Date(now.getTime() + 3600_000).toISOString();
    expect(UserBranchRole.filterActive([mk({ validFrom: future })], now)).toHaveLength(0);
  });

  it('includes a row whose validFrom has already passed', () => {
    const past = new Date(now.getTime() - 3600_000).toISOString();
    expect(UserBranchRole.filterActive([mk({ validFrom: past })], now)).toHaveLength(1);
  });

  it('includes a row with validFrom exactly at now', () => {
    // Boundary: validFrom == now → treated as already started (≤).
    expect(UserBranchRole.filterActive([mk({ validFrom: now })], now)).toHaveLength(1);
  });
});

describe('UserBranchRole.filterActive — validUntil', () => {
  it('includes a row whose validUntil is in the future', () => {
    const future = new Date(now.getTime() + 3600_000).toISOString();
    expect(UserBranchRole.filterActive([mk({ validUntil: future })], now)).toHaveLength(1);
  });

  it('excludes a row whose validUntil has already passed', () => {
    const past = new Date(now.getTime() - 3600_000).toISOString();
    expect(UserBranchRole.filterActive([mk({ validUntil: past })], now)).toHaveLength(0);
  });

  it('excludes a row with validUntil exactly at now (half-open window)', () => {
    // Convention: [validFrom, validUntil). A row whose window ends
    // at T is NOT active at T anymore.
    expect(UserBranchRole.filterActive([mk({ validUntil: now })], now)).toHaveLength(0);
  });
});

describe('UserBranchRole.filterActive — both bounds', () => {
  it('includes a row where now is inside [validFrom, validUntil)', () => {
    const from = new Date(now.getTime() - 3600_000).toISOString();
    const until = new Date(now.getTime() + 3600_000).toISOString();
    const rows = [mk({ validFrom: from, validUntil: until })];
    expect(UserBranchRole.filterActive(rows, now)).toHaveLength(1);
  });

  it('excludes a row starting after now with a valid until', () => {
    const from = new Date(now.getTime() + 1000).toISOString();
    const until = new Date(now.getTime() + 3600_000).toISOString();
    const rows = [mk({ validFrom: from, validUntil: until })];
    expect(UserBranchRole.filterActive(rows, now)).toHaveLength(0);
  });

  it('excludes a row ending before now with a valid from', () => {
    const from = new Date(now.getTime() - 3600_000).toISOString();
    const until = new Date(now.getTime() - 1000).toISOString();
    const rows = [mk({ validFrom: from, validUntil: until })];
    expect(UserBranchRole.filterActive(rows, now)).toHaveLength(0);
  });
});

describe('UserBranchRole.filterActive — mixed batch', () => {
  it('returns only the active+in-window subset', () => {
    const rows = [
      mk({ id: 'active-nowin' }),
      mk({ id: 'revoked', status: 'revoked' }),
      mk({ id: 'future', validFrom: new Date(now.getTime() + 1000).toISOString() }),
      mk({ id: 'past', validUntil: new Date(now.getTime() - 1000).toISOString() }),
      mk({
        id: 'active-in-window',
        validFrom: new Date(now.getTime() - 1000).toISOString(),
        validUntil: new Date(now.getTime() + 3600_000).toISOString(),
      }),
    ];
    const out = UserBranchRole.filterActive(rows, now);
    const ids = out.map(r => r._id).sort();
    expect(ids).toEqual(['active-in-window', 'active-nowin']);
  });

  it('empty input → empty output', () => {
    expect(UserBranchRole.filterActive([], now)).toEqual([]);
  });
});

describe('UserBranchRole.filterActive — default now', () => {
  it('defaults `now` to the current time', () => {
    // Row with validUntil in the far future — should always be active.
    const future = new Date(Date.now() + 86400_000).toISOString();
    expect(UserBranchRole.filterActive([mk({ validUntil: future })])).toHaveLength(1);
  });
});
