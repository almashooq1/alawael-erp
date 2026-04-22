/**
 * rbac.aliases.js — catalog-name → canonical rbac.config role mapping.
 *
 * Phase 10 Commit 10.
 *
 * The catalog (config/report.catalog.js) names roles in domain terms:
 * `medical_director`, `quality_manager`, `therapist_lead`. The RBAC
 * registry (config/rbac.config.js) uses organisational terms:
 * `clinical_director`, `quality_coordinator`, `therapy_supervisor`.
 *
 * Both spellings are correct in their own registry — the alias layer
 * keeps them synchronised without forcing either side to rename.
 *
 * `executive` is special: it's not a single role but a GROUP. We keep
 * it as `null` in the scalar map + expose a separate `ROLE_GROUPS`
 * map listing its members.
 */

'use strict';

const { ROLES } = require('./rbac.config');
const CANONICAL_SET = new Set(Object.values(ROLES || {}));

/**
 * One-to-one aliases (catalog id → single rbac role value). `null`
 * means the catalog id is a multi-role group — look it up in
 * ROLE_GROUPS instead.
 */
const ROLE_ALIASES = Object.freeze({
  cfo: 'group_cfo',
  finance_manager: 'finance_supervisor',
  medical_director: 'clinical_director',
  quality_manager: 'quality_coordinator',
  therapist_lead: 'therapy_supervisor',
  executive: null, // group — see ROLE_GROUPS
});

/**
 * Groups expand to lists of canonical rbac role values. Callers that
 * need to resolve a group should use `resolveRole(aliasOrId, {expand:
 * true})` which returns an array; the default single-role form
 * returns the first member.
 */
const ROLE_GROUPS = Object.freeze({
  executive: Object.freeze(['ceo', 'group_gm', 'group_cfo', 'group_chro']),
});

/**
 * Resolve a catalog role token to canonical rbac role(s).
 *
 * @param {string} aliasOrId
 * @param {Object} [opts]
 * @param {boolean} [opts.expand]  true → always return an array
 * @returns {string|string[]|null}
 *   - rbac role value (string) when aliasOrId is a single-role alias
 *     or already a canonical value
 *   - array of role values when aliasOrId is a group (e.g. 'executive')
 *   - null when the alias is unknown
 */
function resolveRole(aliasOrId, opts = {}) {
  if (!aliasOrId || typeof aliasOrId !== 'string') return null;
  // Already canonical?
  if (CANONICAL_SET.has(aliasOrId)) {
    return opts.expand ? [aliasOrId] : aliasOrId;
  }
  // Alias-to-single?
  if (Object.prototype.hasOwnProperty.call(ROLE_ALIASES, aliasOrId)) {
    const target = ROLE_ALIASES[aliasOrId];
    if (target) return opts.expand ? [target] : target;
    // Group alias — look up ROLE_GROUPS
    if (Object.prototype.hasOwnProperty.call(ROLE_GROUPS, aliasOrId)) {
      const list = [...ROLE_GROUPS[aliasOrId]];
      return opts.expand ? list : list[0] || null;
    }
  }
  return null;
}

/**
 * Shortcut: always return an array of canonical rbac roles (1 element
 * for scalar aliases; N elements for groups). Unknown → [].
 */
function resolveRoles(aliasOrId) {
  const out = resolveRole(aliasOrId, { expand: true });
  return Array.isArray(out) ? out : out ? [out] : [];
}

/**
 * True if the alias is a known group (maps to multiple roles).
 */
function isGroup(aliasOrId) {
  return !!(aliasOrId && Object.prototype.hasOwnProperty.call(ROLE_GROUPS, aliasOrId));
}

/**
 * List of alias keys that still need a canonical target (the
 * drift-budget gap — groups don't count as "gaps" since they resolve
 * via ROLE_GROUPS).
 */
function unresolvedAliases() {
  return Object.entries(ROLE_ALIASES)
    .filter(([k, v]) => v == null && !Object.prototype.hasOwnProperty.call(ROLE_GROUPS, k))
    .map(([k]) => k);
}

module.exports = {
  ROLE_ALIASES,
  ROLE_GROUPS,
  resolveRole,
  resolveRoles,
  isGroup,
  unresolvedAliases,
};
