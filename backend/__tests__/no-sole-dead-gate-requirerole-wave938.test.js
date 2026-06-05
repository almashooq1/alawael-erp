/**
 * no-sole-dead-gate-requirerole-wave938.test.js — H5 (typo-class) safety guard
 *
 * WHY (AUTHZ_REMEDIATION_BACKLOG H5): ~1056 `requireRole([literal])` call sites
 * pass role NAMES as raw strings, so a typo silently mis-gates a route. A
 * 2026-06-05 sweep found the typo class does NOT cause a live bug today: of 243
 * inline-literal requireRole() calls, EVERY one includes at least one assignable
 * role, so no route is bricked. The non-canonical literals that exist
 * (`superadmin` — a defensive duplicate of `super_admin`; `clinician`,
 * `security_officer`, `quality_manager`, … — aspirational domain roles absent
 * from the User.role enum) are harmless dead weight because a valid role always
 * sits beside them.
 *
 * This guard locks the ONE genuinely dangerous slice: a `requireRole([...])` call
 * whose literals are ALL non-assignable (not in the canonical role set) gates the
 * route on roles NO user can ever hold → a silent TOTAL LOCKOUT (accessible to
 * nobody). Baseline = ZERO (verified). It deliberately does NOT flag the harmless
 * dead-weight calls (those include a valid role), so no 13-literal allow-list is
 * needed. The broader requireRole→requirePermission migration (the rest of H5)
 * stays a separate, behavior-changing refactor.
 *
 * "Assignable" = roles.constants ROLES values ∪ ROLE_ALIASES (keys+values) — the
 * set resolveRole understands, identical to the User.role enum (both 65). Pure
 * source scan, no DB/boot.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { ROLES, ROLE_ALIASES } = require('../config/constants/roles.constants');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set([
  '__tests__',
  'tests',
  'node_modules',
  '_archived',
  '_archive',
  '_backups',
  'coverage',
  '.git',
]);

const ASSIGNABLE = new Set([
  ...Object.values(ROLES),
  ...Object.keys(ROLE_ALIASES),
  ...Object.values(ROLE_ALIASES),
]);

/** Extract the balanced-paren argument string starting at the '(' index. */
function extractArgs(src, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < src.length; i++) {
    const c = src[i];
    if (c === '(') depth++;
    else if (c === ')') {
      depth--;
      if (depth === 0) return src.slice(openIdx + 1, i);
    }
  }
  return src.slice(openIdx + 1);
}

/**
 * Find inline-literal requireRole([...]) calls whose every literal is
 * non-assignable (a sole-dead-gate → bricked route). Calls passing a variable
 * (requireRole(WRITE_ROLES)) have no literals and are skipped — they reference a
 * named array, not a raw typo-prone literal.
 */
function findSoleDeadGates(src, assignable) {
  const hits = [];
  const CALL = /\brequireRole\s*\(/g;
  let m;
  while ((m = CALL.exec(src))) {
    const args = extractArgs(src, m.index + m[0].length - 1);
    const lits = [...args.matchAll(/['"]([^'"]+)['"]/g)].map(x => x[1]);
    if (lits.length && !lits.some(l => assignable.has(l))) {
      hits.push({ literals: lits, index: m.index });
    }
  }
  return hits;
}

function walk(dir, out = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name)) walk(path.join(dir, e.name), out);
    } else if (e.isFile() && e.name.endsWith('.js') && !e.name.endsWith('.test.js')) {
      out.push(path.join(dir, e.name));
    }
  }
  return out;
}

describe('H5 — no requireRole() call is gated solely on non-assignable roles (bricked route)', () => {
  const A = new Set(['admin', 'super_admin']); // controlled set for the self-tests

  it('self-test: DETECTS a sole-dead-gate (all literals non-assignable → nobody can access)', () => {
    expect(findSoleDeadGates("requireRole(['clinician'])", A).length).toBe(1);
    expect(findSoleDeadGates("requireRole(['typo_role', 'another_typo'])", A).length).toBe(1);
  });

  it('self-test: IGNORES calls with ≥1 assignable role, and variable (non-literal) calls', () => {
    expect(findSoleDeadGates("requireRole(['admin', 'clinician'])", A).length).toBe(0);
    expect(findSoleDeadGates("requireRole(['super_admin'])", A).length).toBe(0);
    expect(findSoleDeadGates('requireRole(WRITE_ROLES)', A).length).toBe(0); // no literals
    expect(findSoleDeadGates('requireRole(getRoles())', A).length).toBe(0);
  });

  it('the live backend has ZERO sole-dead-gate requireRole calls (baseline)', () => {
    const violations = [];
    for (const file of walk(BACKEND_ROOT)) {
      let src;
      try {
        src = fs.readFileSync(file, 'utf8');
      } catch {
        continue;
      }
      for (const hit of findSoleDeadGates(src, ASSIGNABLE)) {
        const line = src.slice(0, hit.index).split('\n').length;
        violations.push(
          `${path.relative(BACKEND_ROOT, file).split(path.sep).join('/')}:${line}  requireRole([${hit.literals.map(l => `'${l}'`).join(', ')}])`
        );
      }
    }
    expect(violations).toEqual([]);
  });
});

module.exports = { findSoleDeadGates, ASSIGNABLE };
