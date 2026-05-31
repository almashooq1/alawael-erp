#!/usr/bin/env node
/**
 * check-can-scope-contract.js — Phase-0 drift guard #3 for the authz
 * modernization. Closes backlog item D1 (W666 live-code review).
 *
 * WHY (the incident class):
 *   backend/authorization/can.js is a CAPABILITY-only decision — it returns the
 *   scope predicate ('S'|'U'|'B'|'G') but does NOT enforce it (ADR-035 §4: scope
 *   is evaluated at the call site against the row). A consumer that writes
 *       if (can(req.user, P.BENEFICIARY_CLINICAL_READ).allow) return Model.find()
 *   gets capability-true and reads EVERY branch — the 'S'/caseload predicate was
 *   returned and silently dropped. That is a cross-branch PHI leak.
 *
 *   `can()` is currently DORMANT (no production consumer). This guard makes the
 *   consumption CONTRACT enforceable BEFORE the first wire-up: any non-test,
 *   non-internal file that imports the `can` resolver MUST also import a branch
 *   scope helper (branchFilter / effectiveBranchScope / assertBranchMatch /
 *   requireBranchAccess) — i.e. it cannot resolve capability without also
 *   pulling in the scope enforcement. Empty baseline today; fires on the first
 *   unsafe consumer.
 *
 * WHAT IT CHECKS (consumer layers: routes / services / controllers / middleware):
 *   importsCan    = require(... 'authorization/can' | './can' resolving to it)
 *   importsScope  = require(... 'branchScope.middleware' | 'assertBranchMatch')
 *   VIOLATION     = importsCan AND NOT importsScope.
 *   The authorization/ internals (can.js, permissions.registry.js) and tests are
 *   EXEMPT — they are the capability layer / its tests, not consumers.
 *
 * RATCHET (W325c): baseline of KNOWN (allow-listed) exemptions; a NEW unscoped
 * consumer → exit 1; a STALE baseline entry (now scoped or gone) → exit 1.
 *
 * USAGE:
 *   node scripts/check-can-scope-contract.js            # human-readable
 *   node scripts/check-can-scope-contract.js --json      # machine-readable
 *   node scripts/check-can-scope-contract.js --bare      # raw importer list
 *
 * EXIT: 0 = no unscoped consumer outside baseline. 1 = NEW or STALE drift.
 * Pure-source, no DB, <2s.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ARGS = process.argv.slice(2);
const JSON_MODE = ARGS.includes('--json');
const BARE = ARGS.includes('--bare');

const BACKEND_ROOT = path.resolve(__dirname, '..');

// Only the CONSUMER layers — where a real authz decision is made + a query run.
const CONSUMER_DIRS = ['routes', 'services', 'controllers', 'middleware'];
const SKIP_DIR_NAMES = new Set([
  '_archived',
  '_backups',
  '__tests__',
  'tests',
  'node_modules',
  'coverage',
  '.git',
]);

// importing the can resolver (any relative depth ending at authorization/can).
const IMPORTS_CAN_RE =
  /require\(\s*['"][^'"]*authorization\/can['"]\s*\)|require\(\s*['"]\.{1,2}\/can['"]\s*\)/;
// importing a branch-scope enforcement helper (the canonical pair from CLAUDE.md).
const IMPORTS_SCOPE_RE =
  /require\(\s*['"][^'"]*(?:branchScope\.middleware|assertBranchMatch)['"]\s*\)/;

// Allow-listed exemptions (file imports can but legitimately needs no scope —
// e.g. a pure capability-reporting endpoint). EMPTY today. Add with a comment.
const BASELINE = new Set([]);

function walk(absRoot) {
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
  })(absRoot);
  return out;
}

const rel = abs => path.relative(BACKEND_ROOT, abs).split(path.sep).join('/');

/** Return { consumers:[rel], unscoped:[rel] } — exported for the self-test. */
function scan() {
  const consumers = [];
  const unscoped = [];
  for (const dir of CONSUMER_DIRS) {
    for (const abs of walk(path.join(BACKEND_ROOT, dir))) {
      let src;
      try {
        src = fs.readFileSync(abs, 'utf8');
      } catch {
        continue;
      }
      if (!IMPORTS_CAN_RE.test(src)) continue;
      const r = rel(abs);
      consumers.push(r);
      if (!IMPORTS_SCOPE_RE.test(src)) unscoped.push(r);
    }
  }
  return { consumers: consumers.sort(), unscoped: unscoped.sort() };
}

/** Pure diff vs baseline — exported for the self-test. */
function diff(unscoped, baseline) {
  const novel = unscoped.filter(x => !baseline.has(x)).sort();
  const stale = [...baseline].filter(x => !unscoped.includes(x)).sort();
  return { novel, stale, ok: novel.length === 0 && stale.length === 0 };
}

function main() {
  const { consumers, unscoped } = scan();
  if (BARE) {
    const payload = { consumers, unscoped };
    if (JSON_MODE) console.log(JSON.stringify(payload, null, 2));
    else {
      console.log(`can() consumers (${consumers.length}): ${consumers.join(', ') || '—'}`);
      console.log(`  unscoped (${unscoped.length}): ${unscoped.join(', ') || '—'}`);
    }
    return 0;
  }
  const { novel, stale, ok } = diff(unscoped, BASELINE);
  if (JSON_MODE) {
    console.log(JSON.stringify({ ok, novel, stale, consumers }, null, 2));
    return ok ? 0 : 1;
  }
  if (ok) {
    console.log(
      `✓ can() scope contract intact — ${consumers.length} consumer(s), all pair a scope helper.`
    );
    return 0;
  }
  if (novel.length) {
    console.error('✗ can() imported WITHOUT a branch-scope helper (D1 leak class):');
    novel.forEach(x => console.error(`    + ${x}`));
    console.error('  Add branchFilter/assertBranchMatch (or wrap in requirePermission + scoped).');
  }
  if (stale.length) {
    console.error('✗ STALE baseline (now scoped or removed) — prune in this commit:');
    stale.forEach(x => console.error(`    - ${x}`));
  }
  return 1;
}

if (require.main === module) process.exit(main());

module.exports = { scan, diff, BASELINE, IMPORTS_CAN_RE, IMPORTS_SCOPE_RE };
