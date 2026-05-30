#!/usr/bin/env node
/**
 * check-risk-rule-keys.js — drift guard for the authorization risk-rule catalog.
 * Closes the F10 regression door (governance adversarial review).
 *
 * WHY (the incident class):
 *   docs/architecture/authz-risk-rules.json declares dangerous-combination rules
 *   (SoD / escalation) whose `match.grantingAny` / `conflictsWith` / `heldRoleAny`
 *   reference permission keys + role codes. F10 found the two flagship SoD rules
 *   keyed to a NON-EXISTENT namespace (`invoice:*` while the seed uses
 *   `beneficiary:billing:*`) — so the engine would silently NEVER fire them. This
 *   is the W324 phantom-ref bug applied to risk rules: a rule that looks right but
 *   matches a key nothing grants is dead on arrival.
 *
 * WHAT IT CHECKS:
 *   every non-wildcard token in grantingAny / conflictsWith / heldRoleAny of
 *   authz-risk-rules.json MUST resolve to either a permission key in
 *   role-permissions.seed.json OR a role code. Wildcards (`*:create`, `billing:*`)
 *   are intentional class-matchers and skipped.
 *
 * USAGE:
 *   node scripts/check-risk-rule-keys.js            # human-readable
 *   node scripts/check-risk-rule-keys.js --json     # machine-readable
 *
 * EXIT: 0 = all tokens resolve. 1 = unresolved token(s) OR a JSON parse error.
 * Pure file read, no DB, <1s.
 */

'use strict';

const path = require('path');

const ARGS = process.argv.slice(2);
const JSON_MODE = ARGS.includes('--json');

const DOCS = path.resolve(__dirname, '..', '..', 'docs', 'architecture');
const RULES_PATH = path.join(DOCS, 'authz-risk-rules.json');
const SEED_PATH = path.join(DOCS, 'role-permissions.seed.json');

const TOKEN_FIELDS = ['grantingAny', 'conflictsWith', 'heldRoleAny'];

/** Pure: returns { unresolved:[{code,field,token}], total, parseError } */
function evaluate(rules, seed) {
  const seedKeys = new Set((seed.permissions || []).map(p => p.key));
  const roleCodes = new Set((seed.roles || []).map(r => r.code));
  const unresolved = [];
  let total = 0;
  for (const r of rules.rules || []) {
    const m = r.match || {};
    for (const field of TOKEN_FIELDS) {
      for (const t of m[field] || []) {
        if (String(t).includes('*')) continue; // intentional class wildcard
        total++;
        if (!(seedKeys.has(t) || roleCodes.has(t))) {
          unresolved.push({ code: r.code, field, token: t });
        }
      }
    }
  }
  return { unresolved, total };
}

function main() {
  let rules, seed;
  try {
    rules = require(RULES_PATH);
    seed = require(SEED_PATH);
  } catch (e) {
    if (JSON_MODE) console.log(JSON.stringify({ ok: false, parseError: e.message }));
    else console.error(`✗ cannot load risk-rules/seed: ${e.message}`);
    return 1;
  }
  const { unresolved, total } = evaluate(rules, seed);
  const ok = unresolved.length === 0;
  if (JSON_MODE) {
    console.log(JSON.stringify({ ok, total, unresolved }, null, 2));
    return ok ? 0 : 1;
  }
  if (ok) {
    console.log(
      `✓ risk-rule keys intact — all ${total} non-wildcard token(s) resolve to a seed key/role.`
    );
    return 0;
  }
  console.error(
    '✗ risk-rule token(s) do NOT resolve to any seed permission key or role (F10 class):'
  );
  unresolved.forEach(u => console.error(`    ${u.code}.${u.field} = "${u.token}"`));
  console.error(
    '  Reconcile to a real key in role-permissions.seed.json (or use a `*` class wildcard).'
  );
  return 1;
}

if (require.main === module) process.exit(main());

module.exports = { evaluate, RULES_PATH, SEED_PATH, TOKEN_FIELDS };
