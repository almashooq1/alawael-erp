#!/usr/bin/env node
'use strict';

/**
 * gen-permissions-artifacts.js — deterministic generator for the permissions
 * matrix consumables. Reads role-permissions.seed.json (the source of truth) and
 * emits, side-by-side:
 *   - PERMISSIONS_MATRIX.csv          (printable / Excel — role × permission grid)
 *   - permissions.registry.reference.js (the TARGET shape for a real registry +
 *                                         a pure reference can() — NOT wired into
 *                                         any live app; a design reference only)
 *
 * Pure, no deps, no network. Re-run after editing the seed:
 *   node docs/architecture/gen-permissions-artifacts.js
 */

const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const seed = JSON.parse(fs.readFileSync(path.join(DIR, 'role-permissions.seed.json'), 'utf8'));
const ROLES = seed.roles.map(r => r.code);

// ── grant lookup: permission → role → cell string ─────────────────────────
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

// ── CSV ───────────────────────────────────────────────────────────────────
function csvCell(s) {
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function buildCsv() {
  const header = ['permission', 'tier', 'phi', 'hqOnly', ...ROLES, 'sod', 'lifecycle'];
  const lines = [header.join(',')];
  for (const p of seed.permissions) {
    const states = p.states ? p.states.join('|') : p.lifecycleTo ? '→' + p.lifecycleTo : '';
    const row = [
      p.key,
      p.tier == null ? '—' : 'T' + p.tier,
      p.phi ? 'PHI' : '',
      p.hqOnly ? 'HQ' : '',
      ...ROLES.map(r => cellFor(p, r)),
      p.sod || '',
      states,
    ];
    lines.push(row.map(c => csvCell(String(c))).join(','));
  }
  return lines.join('\r\n') + '\r\n'; // CRLF for Excel friendliness
}

// ── registry reference (target shape, NOT live) ─────────────────────────────
function constName(key) {
  return key.replace(/[:\-]/g, '_').toUpperCase();
}
function buildRegistry() {
  const P = {};
  const meta = {};
  const grants = {};
  for (const r of ROLES) grants[r] = {};
  for (const p of seed.permissions) {
    const c = constName(p.key);
    P[c] = p.key;
    meta[p.key] = { tier: p.tier, phi: !!p.phi, hqOnly: !!p.hqOnly, sod: p.sod || null };
    for (const r of ROLES) {
      const cell = cellFor(p, r);
      if (cell && cell !== 'DENY') grants[r][p.key] = cell;
    }
  }
  const deny = {};
  for (const p of seed.permissions) for (const d of p.deny || []) (deny[d] = deny[d] || []).push(p.key);

  return `'use strict';
/**
 * permissions.registry.reference.js — GENERATED from role-permissions.seed.json
 * by gen-permissions-artifacts.js. Do NOT edit by hand; edit the seed + re-run.
 *
 * This is the TARGET shape for a centralized permission registry + a pure
 * reference can(). It is a DESIGN REFERENCE — it is NOT wired into the live
 * Express app (the live authz is backend/config/rbac.config.js with its own
 * 51-role model; reconciling the two is an explicit, separate step).
 */

/** Canonical permission keys (use P.X, never the raw string). */
const P = Object.freeze(${JSON.stringify(P, null, 2)});

/** Per-permission metadata: assurance tier, PHI flag, HQ-only, SoD ref. */
const META = Object.freeze(${JSON.stringify(meta, null, 2)});

/** role → { permissionKey: scopePredicate } (grants only). */
const ROLE_GRANTS = Object.freeze(${JSON.stringify(grants, null, 2)});

/** role → [explicitly denied permission keys] (hard, overrides inheritance). */
const ROLE_DENY = Object.freeze(${JSON.stringify(deny, null, 2)});

const ALL = Object.freeze(Object.values(P));

/**
 * Pure reference decision. Real enforcement also evaluates scope against the
 * row, lifecycle state, threshold, maker!=checker, and the SoD engine — this
 * returns the static grant/deny + the predicate to evaluate at the call site.
 * @returns {{allow:boolean, scope?:string, tier:(number|null), reason:string}}
 */
function can(roleCode, permissionKey) {
  const m = META[permissionKey];
  if (!m) return { allow: false, tier: null, reason: 'unknown-permission' };
  if ((ROLE_DENY[roleCode] || []).includes(permissionKey))
    return { allow: false, tier: m.tier, reason: 'explicit-deny' };
  const scope = (ROLE_GRANTS[roleCode] || {})[permissionKey];
  if (!scope) return { allow: false, tier: m.tier, reason: 'ungranted' };
  return { allow: true, scope, tier: m.tier, reason: 'granted' };
}

module.exports = { P, META, ROLE_GRANTS, ROLE_DENY, ALL, can };
`;
}

const csv = buildCsv();
const reg = buildRegistry();
fs.writeFileSync(path.join(DIR, 'PERMISSIONS_MATRIX.csv'), csv);
fs.writeFileSync(path.join(DIR, 'permissions.registry.reference.js'), reg);

const denyTotal = seed.permissions.reduce((n, p) => n + (p.deny || []).length, 0);
console.log('✓ generated PERMISSIONS_MATRIX.csv +', 'permissions.registry.reference.js');
console.log(
  `  permissions: ${seed.permissions.length} · roles: ${ROLES.length} · grant cells: ` +
    `${seed.permissions.reduce((n, p) => n + (p.grants || []).reduce((m, g) => m + g.roles.length, 0), 0)} · deny cells: ${denyTotal}`
);
