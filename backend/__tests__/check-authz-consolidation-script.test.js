'use strict';

/**
 * check-authz-consolidation-script.test.js — self-test for the Phase-0 authz
 * consolidation drift guard (scripts/check-authz-consolidation.js).
 *
 * Covers the pure helpers (diff + the definition-vs-call regexes) and the CLI
 * exit contract. No DB, no boot. Reference: check-mongoose-hook-style-script.test.js.
 */

const { execFileSync } = require('child_process');
const path = require('path');

const SCRIPT = path.join(__dirname, '..', 'scripts', 'check-authz-consolidation.js');
const {
  diff,
  RESOLVER_DEF_RE,
  ROLES_DEF_RE,
  BASELINE,
  scan,
} = require('../scripts/check-authz-consolidation');

const matches = (re, s) => {
  re.lastIndex = 0; // RESOLVER_DEF_RE is /g — reset stateful lastIndex
  return re.test(s);
};

describe('check-authz-consolidation — diff() ratchet logic', () => {
  const base = new Set(['resolver:a.js', 'roles:b.js']);

  it('ok when found === baseline', () => {
    const r = diff(new Set(['resolver:a.js', 'roles:b.js']), base);
    expect(r.ok).toBe(true);
    expect(r.novel).toEqual([]);
    expect(r.stale).toEqual([]);
  });

  it('flags a NEW definition not in the baseline', () => {
    const r = diff(new Set(['resolver:a.js', 'roles:b.js', 'resolver:c.js']), base);
    expect(r.ok).toBe(false);
    expect(r.novel).toEqual(['resolver:c.js']);
    expect(r.stale).toEqual([]);
  });

  it('flags a STALE baseline entry (consolidated away) to force ratchet-down', () => {
    const r = diff(new Set(['resolver:a.js']), base);
    expect(r.ok).toBe(false);
    expect(r.stale).toEqual(['roles:b.js']);
    expect(r.novel).toEqual([]);
  });

  it('reports novel + stale together, sorted', () => {
    const r = diff(new Set(['resolver:z.js', 'resolver:a.js']), base);
    expect(r.novel).toEqual(['resolver:z.js']);
    expect(r.stale).toEqual(['roles:b.js']);
  });
});

describe('check-authz-consolidation — RESOLVER_DEF_RE matches DEFINITIONS not calls', () => {
  it('matches a function declaration', () => {
    expect(matches(RESOLVER_DEF_RE, 'function hasPermission(role, res, act) {')).toBe(true);
  });
  it('matches a const arrow definition', () => {
    expect(matches(RESOLVER_DEF_RE, 'const checkPermission = (perm) => {')).toBe(true);
  });
  it('matches an object/class method definition', () => {
    expect(matches(RESOLVER_DEF_RE, '  hasPermission(user, branch) {\n    return true;')).toBe(
      true
    );
  });
  it('matches a property-function definition', () => {
    expect(matches(RESOLVER_DEF_RE, '  hasPermissions: async function (codes) {')).toBe(true);
  });
  it('does NOT match a method CALL on another object', () => {
    expect(matches(RESOLVER_DEF_RE, 'if (rbac.hasPermission(role, "users", "read")) {')).toBe(
      false
    );
  });
  it('does NOT match a bare call without a body brace', () => {
    expect(matches(RESOLVER_DEF_RE, 'const ok = hasPermission(role, r, a);')).toBe(false);
  });
});

describe('check-authz-consolidation — ROLES_DEF_RE matches object literals not re-exports', () => {
  it('matches a plain object-literal definition', () => {
    expect(ROLES_DEF_RE.test('const ROLES = {\n  ADMIN: "admin",')).toBe(true);
  });
  it('matches an Object.freeze object literal', () => {
    expect(ROLES_DEF_RE.test('const ROLES = Object.freeze({ ADMIN: "admin" });')).toBe(true);
  });
  it('does NOT match a re-export (the target consolidated form)', () => {
    expect(ROLES_DEF_RE.test("const ROLES = require('./constants/roles.constants').ROLES;")).toBe(
      false
    );
  });
});

describe('check-authz-consolidation — integration against the real tree', () => {
  it('scan() finds at least the canonical sources', () => {
    const found = scan();
    expect(found.has('resolver:config/rbac.config.js')).toBe(true);
    expect(found.has('roles:config/constants/roles.constants.js')).toBe(true);
  });

  it('every BASELINE entry is currently present in the tree (no pre-existing stale)', () => {
    const found = scan();
    const stale = [...BASELINE].filter(x => !found.has(x));
    expect(stale).toEqual([]);
  });

  it('CLI exits 0 when the baseline is intact', () => {
    // throws (non-zero exit) if the guard fails — so a clean run is the assertion
    const out = execFileSync(process.execPath, [SCRIPT], { encoding: 'utf8' });
    expect(out).toMatch(/baseline intact/);
  });
});
