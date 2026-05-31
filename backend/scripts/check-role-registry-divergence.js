#!/usr/bin/env node
/**
 * check-role-registry-divergence.js — Phase-0 drift guard #2 for the authz
 * modernization (docs/architecture/AUTHZ_MODERNIZATION_PLAN.md, P2).
 *
 * WHY (the incident class):
 *   The platform has TWO role registries that have diverged in BOTH directions
 *   (measured 2026-05-30):
 *     - config/rbac.config.js          → 46 role values
 *     - config/constants/roles.constants.js (+ ROLE_ALIASES) → 28 role values
 *     - 26 roles exist ONLY in rbac.config (branch_manager, clinical_director,
 *       hr_officer, regional_director, the therapist specialties, …)
 *     - 9 roles exist ONLY in roles.constants (dpo, nurse, head_nurse,
 *       independent_advocate, cultural_officer, …  — incl. the W464 CRPD roles)
 *   Neither is a superset, so a naive "make one re-export the other" would DROP
 *   live roles → mass authorization breakage. Worse, the divergence is a latent
 *   bug TODAY: a role defined in one registry but checked through the other's
 *   resolver simply won't resolve.
 *
 *   This guard does NOT fix the divergence (that is a reconciliation decision —
 *   future ADR). It FREEZES it: the gap may not widen, and as roles are
 *   reconciled into both registries the baseline ratchets DOWN.
 *
 * WHAT IT CHECKS:
 *   only_in_rbac  = rbac.config values not in roles.constants (and not bridged
 *                   by a ROLE_ALIASES entry)
 *   only_in_const = roles.constants values not in rbac.config
 *   Compared against ONLY_IN_RBAC_BASELINE / ONLY_IN_CONST_BASELINE:
 *     - NEW divergence (a role in one registry only, not in the baseline)
 *       → exit 1 (add the role to BOTH registries, or to the baseline with a
 *         tracking comment if the split is intentional-for-now).
 *     - STALE baseline (a role now present in BOTH, i.e. reconciled)
 *       → exit 1 (remove it from the baseline in the same commit — ratchet down).
 *
 * USAGE:
 *   node scripts/check-role-registry-divergence.js          # human-readable
 *   node scripts/check-role-registry-divergence.js --json   # machine-readable
 *   node scripts/check-role-registry-divergence.js --bare   # raw divergence, no baseline diff
 *
 * EXIT: 0 = divergence == baseline. 1 = NEW or STALE drift.
 *
 * Pure require of two config modules (no DB, no boot), <1s.
 */

'use strict';

const ARGS = process.argv.slice(2);
const JSON_MODE = ARGS.includes('--json');
const BARE = ARGS.includes('--bare');

// ── BASELINE (2026-05-30). Roles present in exactly one registry. Ratchet DOWN
//    as the registries are reconciled (a role added to BOTH leaves the gap). ──
const ONLY_IN_RBAC_BASELINE = new Set([
  'branch_manager',
  'bus_assistant',
  'clinical_director',
  'compliance_officer',
  'driver',
  'finance_supervisor',
  'group_cfo',
  'group_chro',
  'group_gm',
  'group_quality_officer',
  'guardian',
  'hr_officer',
  'hr_supervisor',
  'internal_auditor',
  'it_admin',
  'quality_coordinator',
  'regional_director',
  'regional_quality',
  'special_ed_supervisor',
  'special_ed_teacher',
  'therapist_ot',
  'therapist_psych',
  'therapist_pt',
  'therapist_slp',
  'therapy_assistant',
  'therapy_supervisor',
]);
const ONLY_IN_CONST_BASELINE = new Set([
  'crm_supervisor',
  'cultural_officer',
  'dpo',
  'family_counsellor',
  'head_nurse',
  'independent_advocate',
  'nurse',
  'nursing_supervisor',
  'patient_relations_officer',
]);

/** Compute the current divergence by requiring the two config modules. */
function computeDivergence() {
  const rc = require('../config/rbac.config.js');
  const con = require('../config/constants/roles.constants.js');
  const rcVals = new Set(Object.values(rc.ROLES || {}));
  const conVals = new Set(Object.values(con.ROLES || {}));
  // ROLE_ALIASES bridges legacy↔canonical names; an alias-bridged value is NOT
  // a divergence (it resolves through the alias map).
  const aliasVals = new Set();
  if (con.ROLE_ALIASES) {
    for (const [k, v] of Object.entries(con.ROLE_ALIASES)) {
      aliasVals.add(k);
      aliasVals.add(v);
    }
  }
  const onlyInRbac = [...rcVals].filter(r => !conVals.has(r) && !aliasVals.has(r)).sort();
  const onlyInConst = [...conVals].filter(r => !rcVals.has(r) && !aliasVals.has(r)).sort();
  return { onlyInRbac, onlyInConst, rcCount: rcVals.size, conCount: conVals.size };
}

/** Pure diff vs the two baselines — exported for the self-test. */
function diff(div, baseRbac, baseConst) {
  const novelRbac = div.onlyInRbac.filter(r => !baseRbac.has(r));
  const novelConst = div.onlyInConst.filter(r => !baseConst.has(r));
  const staleRbac = [...baseRbac].filter(r => !div.onlyInRbac.includes(r)).sort();
  const staleConst = [...baseConst].filter(r => !div.onlyInConst.includes(r)).sort();
  const ok = !novelRbac.length && !novelConst.length && !staleRbac.length && !staleConst.length;
  return { novelRbac, novelConst, staleRbac, staleConst, ok };
}

function main() {
  const div = computeDivergence();
  if (BARE) {
    if (JSON_MODE) console.log(JSON.stringify(div, null, 2));
    else {
      console.log(`only_in_rbac (${div.onlyInRbac.length}): ${div.onlyInRbac.join(', ')}`);
      console.log(`only_in_const (${div.onlyInConst.length}): ${div.onlyInConst.join(', ')}`);
    }
    return 0;
  }
  const d = diff(div, ONLY_IN_RBAC_BASELINE, ONLY_IN_CONST_BASELINE);
  if (JSON_MODE) {
    console.log(JSON.stringify({ ...d, ...div }, null, 2));
    return d.ok ? 0 : 1;
  }
  if (d.ok) {
    console.log(
      `✓ role-registry divergence intact (${ONLY_IN_RBAC_BASELINE.size} rbac-only + ` +
        `${ONLY_IN_CONST_BASELINE.size} const-only). Gap has not widened.`
    );
    return 0;
  }
  if (d.novelRbac.length || d.novelConst.length) {
    console.error('✗ NEW role-registry divergence — add the role to BOTH registries:');
    d.novelRbac.forEach(r => console.error(`    + only in rbac.config: ${r}`));
    d.novelConst.forEach(r => console.error(`    + only in roles.constants: ${r}`));
  }
  if (d.staleRbac.length || d.staleConst.length) {
    console.error('✗ STALE baseline (now reconciled into both) — prune from baseline this commit:');
    d.staleRbac.forEach(r => console.error(`    - rbac-only baseline: ${r}`));
    d.staleConst.forEach(r => console.error(`    - const-only baseline: ${r}`));
  }
  return 1;
}

if (require.main === module) process.exit(main());

module.exports = { computeDivergence, diff, ONLY_IN_RBAC_BASELINE, ONLY_IN_CONST_BASELINE };
