#!/usr/bin/env node
'use strict';

/**
 * gen-permissions-registry.js — emit the LIVE permission registry consumed by
 * backend/authorization/can.js, generated from the canonical seed
 * (docs/architecture/role-permissions.seed.json — the enforceable source of
 * truth, companion to PERMISSIONS_MATRIX.md / ADR-035).
 *
 * This is the backend twin of docs/architecture/gen-permissions-artifacts.js.
 * That script emits the DESIGN REFERENCE (docs/.../permissions.registry.reference.js,
 * explicitly "NOT wired"). THIS script emits the wired live module
 * backend/authorization/permissions.registry.js with the same deterministic
 * shape PLUS an ARCHETYPES (code → name) table so the live-role-aware resolver
 * (can.js, via role-archetype.map.json) can bridge the 46 live roles to the 9
 * archetypes the seed is authored against (ADR-036 D2).
 *
 * Pure, no deps, no network, no DB. Re-run after editing the seed:
 *   node scripts/gen-permissions-registry.js            (or: npm run gen:permissions-registry)
 * NEVER hand-edit permissions.registry.js — edit the seed and re-run.
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ROOT = path.resolve(__dirname, '..');
const SEED_PATH = path.resolve(
  BACKEND_ROOT,
  '..',
  'docs',
  'architecture',
  'role-permissions.seed.json'
);
const OUT_PATH = path.resolve(BACKEND_ROOT, 'authorization', 'permissions.registry.js');

const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
const ROLE_CODES = seed.roles.map(r => r.code);

// ── grant lookup: permission → role-code → cell string ─────────────────────
// (identical semantics to docs/architecture/gen-permissions-artifacts.js)
function cellFor(perm, role) {
  if ((perm.deny || []).includes(role)) return 'DENY';
  const tokens = [];
  for (const g of perm.grants || []) {
    if (!g.roles.includes(role)) continue;
    let t = g.scope || 'own';
    const cond = g.condition || (g.states ? '[' + g.states.join(',') + ']' : '');
    if (cond) t += '·' + cond;
    if (g.tier && g.tier !== perm.tier) t += '·T' + g.tier;
    tokens.push(t);
  }
  return tokens.join(' ');
}

function constName(key) {
  return key.replace(/[:-]/g, '_').toUpperCase();
}

function build() {
  const P = {};
  const meta = {};
  const grants = {};
  for (const r of ROLE_CODES) grants[r] = {};
  for (const p of seed.permissions) {
    P[constName(p.key)] = p.key;
    meta[p.key] = { tier: p.tier, phi: !!p.phi, hqOnly: !!p.hqOnly, sod: p.sod || null };
    for (const r of ROLE_CODES) {
      const cell = cellFor(p, r);
      if (cell && cell !== 'DENY') grants[r][p.key] = cell;
    }
  }
  const deny = {};
  for (const p of seed.permissions)
    for (const d of p.deny || []) (deny[d] = deny[d] || []).push(p.key);

  // archetype code → canonical name (drives can.js's live-role → archetype bridge)
  const archetypes = {};
  for (const r of seed.roles) archetypes[r.code] = r.name;

  return `'use strict';
/**
 * permissions.registry.js — GENERATED (LIVE) from
 * docs/architecture/role-permissions.seed.json by
 * backend/scripts/gen-permissions-registry.js. Do NOT edit by hand; edit the
 * seed and re-run \`npm run gen:permissions-registry\`.
 *
 * This is the WIRED registry (the design twin docs/.../permissions.registry.reference.js
 * is reference-only). Keys are ARCHETYPE codes (HQA/EXD/BRM/UNS/THR/REC/HRO/FIN/AUD);
 * the 46 live roles map onto them via role-archetype.map.json (ADR-036). Consumed
 * by backend/authorization/can.js. Capability only — scope (branch/unit/caseload),
 * lifecycle, threshold, maker≠checker and the SoD engine are still evaluated at the
 * call site against the row (ADR-035 §4).
 */

/** Canonical permission keys — use P.X, never a raw string literal. */
const P = Object.freeze(${JSON.stringify(P, null, 2)});

/** Per-permission metadata: assurance tier (ADR-019), PHI flag, HQ-only, SoD ref. */
const META = Object.freeze(${JSON.stringify(meta, null, 2)});

/** archetype-code → { permissionKey: scopePredicate } (grants only). */
const ROLE_GRANTS = Object.freeze(${JSON.stringify(grants, null, 2)});

/** archetype-code → [explicitly denied permission keys] (hard, overrides inheritance). */
const ROLE_DENY = Object.freeze(${JSON.stringify(deny, null, 2)});

/** archetype-code → canonical archetype name (for the live-role bridge). */
const ARCHETYPES = Object.freeze(${JSON.stringify(archetypes, null, 2)});

const ALL = Object.freeze(Object.values(P));

/**
 * Pure archetype-level decision. Real enforcement also evaluates scope against
 * the row, lifecycle state, threshold, maker≠checker and the SoD engine — this
 * returns the static grant/deny + the scope predicate to evaluate at the call
 * site. For LIVE ROLE names use backend/authorization/can.js (it bridges role →
 * archetype first).
 * @returns {{allow:boolean, scope?:string, tier:(number|null), reason:string}}
 */
function can(archetypeCode, permissionKey) {
  const m = META[permissionKey];
  if (!m) return { allow: false, tier: null, reason: 'unknown-permission' };
  if ((ROLE_DENY[archetypeCode] || []).includes(permissionKey))
    return { allow: false, tier: m.tier, reason: 'explicit-deny' };
  const scope = (ROLE_GRANTS[archetypeCode] || {})[permissionKey];
  if (!scope) return { allow: false, tier: m.tier, reason: 'ungranted' };
  return { allow: true, scope, tier: m.tier, reason: 'granted' };
}

module.exports = { P, META, ROLE_GRANTS, ROLE_DENY, ARCHETYPES, ALL, can };
`;
}

(async () => {
  const raw = build();
  // Format through the project's prettier config so regen output is identical to
  // what lint-staged writes at commit time — i.e. re-running the generator
  // produces ZERO diff against the committed registry (enables a future
  // "registry is stale" CI guard). Falls back to the raw string if prettier is
  // unavailable for any reason.
  let out = raw;
  try {
    const prettier = require('prettier');
    const cfg = (await prettier.resolveConfig(OUT_PATH)) || {};
    out = await prettier.format(raw, { ...cfg, parser: 'babel', filepath: OUT_PATH });
  } catch (e) {
    console.warn('  (prettier unavailable — wrote raw output:', e.message, ')');
  }
  fs.writeFileSync(OUT_PATH, out);
  const denyTotal = seed.permissions.reduce((n, p) => n + (p.deny || []).length, 0);
  console.log('✓ generated backend/authorization/permissions.registry.js');
  console.log(
    `  permissions: ${seed.permissions.length} · archetypes: ${ROLE_CODES.length} · grant cells: ` +
      `${seed.permissions.reduce((n, p) => n + (p.grants || []).reduce((m, g) => m + g.roles.length, 0), 0)} · deny cells: ${denyTotal}`
  );
})();
