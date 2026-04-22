/**
 * rbac-export-matrix.test.js — Phase-7 Commit 10.
 *
 * Pure-logic tests for the matrix-export helpers:
 *   • resolvePermissions — walks the ROLE_HIERARCHY inheritance
 *   • expandWildcards — flattens `*` across resources + actions
 *   • buildMatrix — emits the flat row set used by CSV export
 *   • toCSV — CSV encoding
 *
 * No DB, no I/O. The CLI's main() path is a 5-line wrapper over
 * buildMatrix() + toCSV()/JSON.stringify, covered by standalone run.
 */

'use strict';

const {
  resolvePermissions,
  expandWildcards,
  buildMatrix,
  toCSV,
} = require('../scripts/rbac-export-matrix');

describe('resolvePermissions — inheritance', () => {
  it('super_admin resolves to the wildcard grant', () => {
    const eff = resolvePermissions('super_admin');
    expect(eff.has('*')).toBe(true);
    expect([...eff.get('*')]).toEqual(['*']);
  });

  it('unknown role resolves to empty map', () => {
    const eff = resolvePermissions('made_up_role_xyz');
    expect(eff.size).toBe(0);
  });

  it('hr inherits viewer — picks up viewer perms via chain', () => {
    const eff = resolvePermissions('hr');
    // hr + viewer; we don't care which exact resources appear —
    // just that the map has SOME entries (viewer provides baseline).
    expect(eff.size).toBeGreaterThan(0);
  });
});

describe('expandWildcards', () => {
  it('flattens a role/resource wildcard into per-resource entries', () => {
    const input = new Map([['*', new Set(['read'])]]);
    const out = expandWildcards(input);
    // Every known resource gets a "read" entry.
    expect(out.size).toBeGreaterThan(10);
    for (const set of out.values()) expect(set.has('read')).toBe(true);
  });

  it('flattens an action wildcard for a specific resource', () => {
    const input = new Map([['invoices', new Set(['*'])]]);
    const out = expandWildcards(input);
    expect(out.has('invoices')).toBe(true);
    expect(out.get('invoices').size).toBeGreaterThanOrEqual(3);
    expect(out.get('invoices').has('read')).toBe(true);
    expect(out.get('invoices').has('create')).toBe(true);
  });

  it('leaves a concrete (resource, [action]) pair unchanged', () => {
    const input = new Map([['employees', new Set(['read', 'update'])]]);
    const out = expandWildcards(input);
    expect([...out.get('employees')].sort()).toEqual(['read', 'update']);
    expect(out.size).toBe(1);
  });
});

describe('buildMatrix — overall shape', () => {
  it('produces rows for every role + applies role filter', () => {
    const all = buildMatrix();
    const hrOnly = buildMatrix({ roleFilter: 'hr' });
    expect(hrOnly.length).toBeGreaterThan(0);
    expect(hrOnly.every(r => r.role === 'hr')).toBe(true);
    expect(all.length).toBeGreaterThan(hrOnly.length);
  });

  it('applies resource filter across all roles', () => {
    const invoices = buildMatrix({ resourceFilter: 'invoices' });
    expect(invoices.length).toBeGreaterThan(0);
    expect(invoices.every(r => r.resource === 'invoices')).toBe(true);
  });

  it('every row carries a hierarchy level in [0, 100]', () => {
    const rows = buildMatrix();
    for (const r of rows) {
      expect(typeof r.level).toBe('number');
      expect(r.level).toBeGreaterThanOrEqual(0);
      expect(r.level).toBeLessThanOrEqual(100);
    }
  });

  it('every row has role + resource + action as non-empty strings', () => {
    const rows = buildMatrix();
    for (const r of rows) {
      expect(typeof r.role).toBe('string');
      expect(r.role.length).toBeGreaterThan(0);
      expect(typeof r.resource).toBe('string');
      expect(r.resource.length).toBeGreaterThan(0);
      expect(typeof r.action).toBe('string');
      expect(r.action.length).toBeGreaterThan(0);
    }
  });

  it('empty filter match returns empty array (CLI exits 1 on this)', () => {
    const rows = buildMatrix({ roleFilter: 'nonexistent' });
    expect(rows).toEqual([]);
  });
});

describe('buildMatrix — specific expectations', () => {
  it('super_admin has access to invoices:create after wildcard expansion', () => {
    const rows = buildMatrix({ roleFilter: 'super_admin' });
    const hit = rows.find(r => r.resource === 'invoices' && r.action === 'create');
    expect(hit).toBeDefined();
  });

  it('accountant does NOT have care_plans:read via RBAC (SoD at ABAC layer)', () => {
    // RBAC doesn't grant this specifically. The SoD layer blocks it
    // at request time even if hierarchy ever drifted. Here we just
    // verify the RBAC map doesn't list accountant ← care_plans:read.
    const rows = buildMatrix({ roleFilter: 'accountant' });
    const hit = rows.find(r => r.resource === 'care_plans' && r.action === 'read');
    expect(hit).toBeUndefined();
  });

  it('guardian has beneficiaries:read via the guardian grant', () => {
    const rows = buildMatrix({ roleFilter: 'guardian' });
    const hit = rows.find(r => r.resource === 'beneficiaries' && r.action === 'read');
    expect(hit).toBeDefined();
  });
});

describe('toCSV', () => {
  it('produces a header + one line per row + trailing newline', () => {
    const csv = toCSV([
      { role: 'hr', resource: 'employees', action: 'read', level: 60 },
      { role: 'hr', resource: 'employees', action: 'create', level: 60 },
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('role,resource,action,hierarchy_level');
    expect(lines[1]).toBe('hr,employees,read,60');
    expect(lines[2]).toBe('hr,employees,create,60');
    expect(lines[3]).toBe('');
  });

  it('empty input → header only', () => {
    const csv = toCSV([]);
    expect(csv).toBe('role,resource,action,hierarchy_level\n');
  });
});
