#!/usr/bin/env node
/**
 * check-authz-consolidation.js — Phase-0 drift guard for the authorization
 * modernization (docs/architecture/AUTHZ_MODERNIZATION_PLAN.md).
 *
 * WHY (the incident class):
 *   A 2026-05-30 4-facet inspection of the live authz code found it is not
 *   under-built but OVER-FRAGMENTED:
 *     P1 — 4 incompatible `hasPermission()` implementations
 *          (config/rbac.config.js, intelligence/governance.service.js,
 *           permissions/permission-service.js, services/branchPermission.service.js)
 *     P2 — 3 competing top-level `ROLES` registries, desynchronized
 *          (config/constants/roles.constants.js — canonical,
 *           config/rbac.config.js — Phase-7 superset,
 *           services/branchPermission.service.js — legacy kebab-case)
 *   Every NEW duplicate makes the eventual consolidation (ADR-035 “one
 *   registry, one resolver”) harder and re-introduces the typo-class bug
 *   (`super_admin` vs `superadmin`). This gate freezes the fragmentation at
 *   its current baseline and ratchets it DOWN — exactly the W325c/W340 recipe.
 *
 * WHAT IT DETECTS (definition forms only, not call sites):
 *   - RESOLVER: a module-level DEFINITION of `hasPermission` /
 *     `hasPermissions` / `checkPermission` (function decl, const arrow,
 *     object/class method, or property-function). Calls via `x.hasPermission(`
 *     do NOT match.
 *   - ROLES:   a `const|let|var ROLES = { … }` object-literal definition.
 *     A re-export `const ROLES = require(...)` does NOT match (that is the
 *     CONSOLIDATED form Phase 1 migrates toward).
 *
 * RATCHET-DOWN (W325c pattern, two assertions):
 *   - NEW definition not in the baseline  → exit 1 (blocks new fragmentation).
 *   - STALE baseline entry (file no longer defines it, e.g. it became a
 *     re-export shim) → exit 1 (forces removal from the baseline in the same
 *     commit as the consolidation — the ratchet can only go down).
 *
 * USAGE:
 *   node scripts/check-authz-consolidation.js            # human-readable
 *   node scripts/check-authz-consolidation.js --json     # machine-readable
 *   node scripts/check-authz-consolidation.js --bare     # raw findings, no baseline diff
 *
 * EXIT: 0 = findings == baseline. 1 = NEW or STALE drift.
 *
 * Pure-source, no DB, no boot, <2s. Eligible to wire into .husky/pre-push as a
 * 6th gate once the baseline stops moving (see CLAUDE.md “Adding a 6th gate”).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
const JSON_MODE = ARGS.includes('--json');
const BARE = ARGS.includes('--bare');

const BACKEND_ROOT = path.resolve(__dirname, '..');

const SKIP_DIR_NAMES = new Set([
  '_archived',
  '_backups',
  '__tests__',
  'tests',
  'scripts',
  'node_modules',
  'coverage',
  '.git',
]);

// DEFINITION forms of a permission resolver (not call sites). Each alternative
// is anchored on a keyword / line-start / property colon so `svc.hasPermission(`
// (a call) is excluded.
const RESOLVER_NAMES = '(hasPermission|hasPermissions|checkPermission)';
const RESOLVER_DEF_RE = new RegExp(
  [
    `\\bfunction\\s+${RESOLVER_NAMES}\\b`, // function hasPermission(
    `\\b(?:const|let|var)\\s+${RESOLVER_NAMES}\\s*=`, // const hasPermission =
    `(?:^|\\n)\\s*${RESOLVER_NAMES}\\s*\\([^)]*\\)\\s*\\{`, // method hasPermission(...) {
    `\\b${RESOLVER_NAMES}\\s*:\\s*(?:async\\s+)?(?:function|\\()`, // hasPermission: function | hasPermission: (
  ].join('|'),
  'g'
);

// `const ROLES = { … }` object-literal definition. A `const ROLES = require(…)`
// re-export is deliberately NOT matched — that is the target consolidated form.
const ROLES_DEF_RE = /\b(?:const|let|var)\s+ROLES\s*=\s*(?:Object\.freeze\s*\(\s*)?\{/;

// ── BASELINE (2026-05-30, from running THIS guard against the tree). Paths are
//    relative to backend/, POSIX. The modernization inspection's headline named
//    4 `hasPermission` impls; running the guard surfaced 13 resolver-shaped
//    DEFINITIONS — the fragmentation is WORSE than the manual read found (the
//    classic "static inspection misses what running code catches" lesson).
//    Ratchet DOWN as Phase 1 lands re-export shims (each removal here pairs
//    with the shim commit). ──────────────────────────────────────────────────
const BASELINE = new Set([
  // ── permission-resolver definitions (P1) ──
  // True resolvers (decide allow/deny from role+perm) — collapse to one `can()`:
  'resolver:config/rbac.config.js', // the RBAC engine hasPermission — canonical data home
  'resolver:intelligence/governance.service.js', // Wave-26 hasPermission(role, code)
  'resolver:permissions/permission-service.js', // async service evaluatePermission
  'resolver:services/branchPermission.service.js', // branch-scoped hasPermission(user,branch,module,action)
  'resolver:services/rbacManager.service.js', // another resolver surface
  'resolver:services/security/rbacService.js', // another resolver surface
  'resolver:config/security.config.js', // policy/permission helper
  'resolver:services/backup-security.service.js', // backup-scoped access check
  // Middleware-wrapper `checkPermission` factories (gate, not resolver — related
  // fragmentation; consolidate the GATE stack in Phase 2):
  'resolver:middleware/rbac.js',
  'resolver:middleware/advancedAuth.js',
  'resolver:middleware/sso-auth.middleware.js',
  'resolver:permissions/permission-middleware.js',
  'resolver:rbac.js',
  // ── ROLES registries (P2) ──
  'roles:config/constants/roles.constants.js', // CANONICAL — keep (the one true source)
  'roles:config/rbac.config.js', // Phase-7 superset — collapse to a re-export (Phase 1)
  'roles:services/branchPermission.service.js', // legacy kebab — migrate to constants + aliases
]);

function walk(rootAbs) {
  const out = [];
  (function inner(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!SKIP_DIR_NAMES.has(e.name)) inner(path.join(dir, e.name));
      } else if (e.isFile() && e.name.endsWith('.js') && !e.name.endsWith('.test.js')) {
        out.push(path.join(dir, e.name));
      }
    }
  })(rootAbs);
  return out;
}

const rel = abs => path.relative(BACKEND_ROOT, abs).split(path.sep).join('/');

/** Scan the backend and return the set of `kind:relpath` findings. */
function scan() {
  const found = new Set();
  for (const abs of walk(BACKEND_ROOT)) {
    let src;
    try {
      src = fs.readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    const r = rel(abs);
    RESOLVER_DEF_RE.lastIndex = 0;
    if (RESOLVER_DEF_RE.test(src)) found.add(`resolver:${r}`);
    if (ROLES_DEF_RE.test(src)) found.add(`roles:${r}`);
  }
  return found;
}

/** Pure diff helper — exported for the self-test. */
function diff(found, baseline) {
  const novel = [...found].filter(x => !baseline.has(x)).sort();
  const stale = [...baseline].filter(x => !found.has(x)).sort();
  return { novel, stale, ok: novel.length === 0 && stale.length === 0 };
}

function main() {
  const found = scan();
  if (BARE) {
    const list = [...found].sort();
    if (JSON_MODE) console.log(JSON.stringify({ found: list }, null, 2));
    else list.forEach(x => console.log(x));
    return 0;
  }
  const { novel, stale, ok } = diff(found, BASELINE);
  if (JSON_MODE) {
    console.log(JSON.stringify({ ok, novel, stale, baselineSize: BASELINE.size }, null, 2));
    return ok ? 0 : 1;
  }
  if (ok) {
    console.log(
      `✓ authz consolidation baseline intact (${BASELINE.size} known duplicate definitions).`
    );
    return 0;
  }
  if (novel.length) {
    console.error(`✗ NEW authz duplicate definition(s) — consolidate, don't fork:`);
    novel.forEach(x => console.error(`    + ${x}`));
    console.error(
      `  Use the canonical resolver / ROLES source (see AUTHZ_MODERNIZATION_PLAN.md P1/P2).`
    );
  }
  if (stale.length) {
    console.error(
      `✗ STALE baseline entr(ies) — now consolidated; remove from BASELINE in this commit:`
    );
    stale.forEach(x => console.error(`    - ${x}`));
  }
  return 1;
}

if (require.main === module) process.exit(main());

module.exports = { scan, diff, BASELINE, RESOLVER_DEF_RE, ROLES_DEF_RE };
