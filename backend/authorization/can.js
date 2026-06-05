'use strict';
/**
 * can.js — the ONE live-role-aware permission decision (ADR-035 §4 PDP, ADR-036
 * resolution model). Additive + behavior-preserving: nothing is forced to call
 * this yet; it is the spine the fragmented resolvers (config/rbac.config.js,
 * intelligence/governance.service.js, permissions/permission-service.js,
 * services/branchPermission.service.js — see check-authz-consolidation.js) will
 * collapse onto in later, per-domain waves.
 *
 * Bridge: the seed/registry is authored against the 9 ARCHETYPES (HQA…AUD); the
 * live system has 46 roles. This resolves   live role → archetype (via
 * role-archetype.map.json) → registry grant/deny   and applies the approver gate
 * for *:approve (ADR-036 D3). It is CAPABILITY-only — scope (branch/unit/
 * caseload), lifecycle, threshold, maker≠checker and the SoD engine are still
 * evaluated at the call site against the row (use branchFilter / assertBranchMatch
 * + the existing ABAC PDP). Pure: no I/O, deny-biased.
 */

const reg = require('./permissions.registry');
const archetypeMap = require('./role-archetype.map.json');
const { resolveRole } = require('../config/constants/roles.constants');

// archetype NAME → CODE (invert registry.ARCHETYPES, which is code → name).
const CODE_BY_NAME = Object.freeze(
  Object.entries(reg.ARCHETYPES).reduce((acc, [code, name]) => {
    acc[name] = code;
    return acc;
  }, {})
);

// live role (lowercased) → map entry { live, archetype, scope, seniority, approver }.
const ENTRY_BY_ROLE = Object.freeze(
  (archetypeMap.map || []).reduce((acc, e) => {
    acc[String(e.live).toLowerCase()] = e;
    return acc;
  }, {})
);

// Normalize a raw role to the canonical map key (D4 / ADR-036): resolve legacy
// aliases (kebab `super-admin`, camel `superAdmin`, `hq_admin`, …) to canonical
// snake_case via the shared registry FIRST (its alias keys are case-sensitive,
// so resolve before lowercasing), THEN lowercase for the map lookup. A nullish/
// empty role stays '' so a missing role → 'unmapped-role' rather than
// resolveRole's guest fallback.
const normalizeRole = role => {
  if (role == null) return '';
  const raw = String(role).trim();
  if (!raw) return '';
  return String(resolveRole(raw)).toLowerCase().trim();
};

/**
 * Resolve a live role name to its archetype classification.
 * @returns {{name:string, code:(string|null), scope:string, approver:boolean}|null}
 */
function archetypeOf(role) {
  const e = ENTRY_BY_ROLE[normalizeRole(role)];
  if (!e) return null;
  return {
    name: e.archetype,
    code: CODE_BY_NAME[e.archetype] || null, // NON_MATRIX has no registry code
    scope: e.scope,
    approver: !!e.approver,
  };
}

/**
 * Decide whether an actor holds a permission (capability layer only).
 * @param {{role?:string}|string} actor  the user (or a raw role string)
 * @param {string} permissionKey         e.g. 'beneficiary:clinical:read'
 * @returns {{allow:boolean, reason:string, tier:(number|null), scope?:string, archetype?:string}}
 */
function can(actor, permissionKey /* , ctx = {} */) {
  const role = actor && actor.role != null ? actor.role : actor;
  const m = reg.META[permissionKey];
  if (!m) return { allow: false, tier: null, reason: 'unknown-permission' };

  const a = archetypeOf(role);
  if (!a) return { allow: false, tier: m.tier, reason: 'unmapped-role' };
  if (!a.code) return { allow: false, tier: m.tier, reason: 'non-matrix', archetype: a.name };

  const verdict = reg.can(a.code, permissionKey); // deny-first, then grant
  if (!verdict.allow) return { ...verdict, archetype: a.name };

  // approver gate (ADR-036 D3): *:approve needs approver-capable seniority.
  if (/:approve$/.test(permissionKey) && !a.approver) {
    return { allow: false, tier: m.tier, reason: 'not-approver', archetype: a.name };
  }
  return { ...verdict, archetype: a.name, archetypeScope: a.scope };
}

module.exports = { can, archetypeOf, CODE_BY_NAME, ENTRY_BY_ROLE };
