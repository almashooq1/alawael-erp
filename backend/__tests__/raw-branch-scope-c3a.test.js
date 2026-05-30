'use strict';

/**
 * raw-branch-scope-c3a.test.js — C3a fix: raw-collection aggregates in
 * reports-analytics-module must FORCE a restricted caller to their own branch
 * (closing the omit + spoof cross-branch leak), while letting HQ optionally
 * filter. Unit-tests the reusable helper utils/rawBranchScope.js.
 */

jest.unmock('mongoose');
const mongoose = require('mongoose');
const { applyRawBranchScope } = require('../utils/rawBranchScope');

const OWN = '5f9d88b9c2a4e10017a1b111'; // caller's branch ObjectId
const OTHER = '5f9d88b9c2a4e10017a1b222'; // a foreign branch ObjectId

const restricted = branchId => ({ branchScope: { restricted: true, branchId } });
const hq = () => ({ branchScope: { restricted: false, branchId: null } });

describe('applyRawBranchScope — restricted caller is forced to own branch', () => {
  it('forces own branch and IGNORES a spoofed ?branch_id (no cross-branch read)', () => {
    const out = applyRawBranchScope({ deleted_at: null }, restricted(OWN), OTHER);
    expect(out.branch_id).toBeInstanceOf(mongoose.Types.ObjectId);
    expect(String(out.branch_id)).toBe(OWN); // NOT OTHER — spoof ignored
  });

  it('forces own branch even when the caller OMITS the param (no all-branch read)', () => {
    const out = applyRawBranchScope({ deleted_at: null }, restricted(OWN), undefined);
    expect(String(out.branch_id)).toBe(OWN);
  });

  it('fail-closed (no throw) when the branch id is a non-ObjectId code', () => {
    let out;
    expect(() => {
      out = applyRawBranchScope({ deleted_at: null }, restricted('RYD-01'), OTHER);
    }).not.toThrow();
    expect(out.branch_id).toBe('RYD-01'); // raw value → won't match ObjectId column → empty
    expect(String(out.branch_id)).not.toBe(OTHER);
  });
});

describe('applyRawBranchScope — HQ / cross-branch caller', () => {
  it('MAY optionally filter to a valid ?branch_id', () => {
    const out = applyRawBranchScope({ deleted_at: null }, hq(), OTHER);
    expect(String(out.branch_id)).toBe(OTHER);
  });

  it('omitting the param = all branches (no branch_id predicate) — legitimate for HQ', () => {
    const out = applyRawBranchScope({ deleted_at: null }, hq(), undefined);
    expect(out.branch_id).toBeUndefined();
  });

  it('ignores an invalid ?branch_id (no predicate, not a throw)', () => {
    const out = applyRawBranchScope({ deleted_at: null }, hq(), 'not-an-objectid');
    expect(out.branch_id).toBeUndefined();
  });
});

describe('applyRawBranchScope — shape', () => {
  it('preserves the rest of the matchBase + returns the same object', () => {
    const base = { deleted_at: null, status: 'active' };
    const out = applyRawBranchScope(base, restricted(OWN), undefined);
    expect(out).toBe(base);
    expect(out.deleted_at).toBeNull();
    expect(out.status).toBe('active');
  });
});
