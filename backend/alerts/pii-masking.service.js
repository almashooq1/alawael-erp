'use strict';

/**
 * pii-masking.service.js — Wave 14.
 *
 * Applies viewer-role-aware redaction to alert payloads BEFORE they
 * leave the API boundary. Complements `utils/piiRedactor.js` (which
 * scrubs payloads heading to the LLM) — this one shapes responses
 * heading to the dashboard.
 *
 * Why a second layer: the LLM redactor strips identifiers because
 * the model shouldn't see them; the dashboard redactor strips them
 * because the *viewer* shouldn't see them for THIS alert. Executive
 * count screens don't need ObjectIds; DPO compliance counters don't
 * need the underlying beneficiary identity. Each layer enforces its
 * own contract.
 *
 * Output is a *new* object — never mutates the input. Safe to call
 * on Mongoose `.lean()` results or plain JSON.
 */

const VIEWER_LEVELS = Object.freeze({
  // Higher number = more permission. The mask runs at the viewer's
  // level; fields with `minLevel > viewer.level` get redacted.
  executive: 0,
  dpo: 1,
  branch_manager: 3,
  domain_specialist: 5, // clinical_director, hr_manager, etc.
  super_admin: 9,
});

// HIDDEN_VALUE is implicit via `delete parent[key]` — no constant
// needed. MASKED_VALUE is the placeholder for `mask` actions where
// the field exists but its content is redacted.
const MASKED_VALUE = '[REDACTED]';

/**
 * Map a user role onto a viewer level. Defaults to `domain_specialist`
 * — most roles in the system can see their domain's full alert
 * payload. Executive and DPO get tighter scopes; super_admin gets
 * everything.
 */
function levelForRole(role) {
  if (!role) return 0;
  // Executive viewer (count-only screens)
  if (['ceo', 'group_gm', 'group_cfo', 'group_chro'].includes(role)) {
    return VIEWER_LEVELS.executive;
  }
  if (['dpo'].includes(role)) {
    return VIEWER_LEVELS.dpo;
  }
  if (['super_admin'].includes(role)) {
    return VIEWER_LEVELS.super_admin;
  }
  if (
    ['admin', 'manager', 'branch_manager', 'head_office_admin', 'regional_director'].includes(role)
  ) {
    return VIEWER_LEVELS.branch_manager;
  }
  return VIEWER_LEVELS.domain_specialist;
}

/**
 * Field-level redaction rules. `minLevel` declares the lowest viewer
 * level that can see the unredacted value. Lower-level viewers get
 * either HIDDEN (field omitted) or MASKED (`[REDACTED]` placeholder).
 *
 * The rules are ordered from most-sensitive to least-sensitive so a
 * reader can scan them quickly.
 */
const RULES = Object.freeze({
  // Subject identifier — the single most leak-prone field. Executive
  // and DPO see `subject.type` but not `subject.id`.
  'subject.id': { minLevel: VIEWER_LEVELS.branch_manager, action: 'hide' },

  // Assignment + audit user IDs — visible to branch managers and
  // above. A clinician seeing "assigned to user X" leaks staff PII
  // they don't need.
  'ownership.assignedTo': { minLevel: VIEWER_LEVELS.branch_manager, action: 'hide' },
  'ownership.assignedBy': { minLevel: VIEWER_LEVELS.branch_manager, action: 'hide' },
  ackedBy: { minLevel: VIEWER_LEVELS.branch_manager, action: 'hide' },
  resolvedBy: { minLevel: VIEWER_LEVELS.branch_manager, action: 'hide' },

  // Comment authors — author user IDs hide for executive but the
  // *content* stays so the timeline reads naturally.
  'comments.byUserId': { minLevel: VIEWER_LEVELS.branch_manager, action: 'hide' },

  // muteReason can contain operator narrative including names — DPO
  // sees only that an alert was muted, not who explained why.
  muteReason: { minLevel: VIEWER_LEVELS.branch_manager, action: 'mask' },
});

/**
 * Walk a dotted path and return the parent object + final key, so
 * the caller can `delete parent[finalKey]` in place. Returns null
 * when the path doesn't exist.
 */
function resolveDottedPath(target, dottedPath) {
  const segments = dottedPath.split('.');
  let cursor = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const seg = segments[i];
    if (cursor == null || typeof cursor !== 'object') return null;
    cursor = cursor[seg];
    // If we hit an array, recurse into each element. Useful for
    // `comments.byUserId` where `comments` is an array.
    if (Array.isArray(cursor)) {
      const remaining = segments.slice(i + 1).join('.');
      return { isArray: true, items: cursor, remaining };
    }
  }
  return { parent: cursor, key: segments[segments.length - 1] };
}

/**
 * Apply a single rule against a (cloned) alert.
 */
function applyRule(alert, dottedPath, rule) {
  const resolved = resolveDottedPath(alert, dottedPath);
  if (!resolved) return;
  if (resolved.isArray) {
    for (const item of resolved.items) {
      if (!item || typeof item !== 'object') continue;
      applyRule(item, resolved.remaining, rule);
    }
    return;
  }
  const { parent, key } = resolved;
  if (parent && Object.prototype.hasOwnProperty.call(parent, key)) {
    if (rule.action === 'hide') delete parent[key];
    else if (rule.action === 'mask') parent[key] = MASKED_VALUE;
  }
}

/**
 * Mask a single alert for the given viewer.
 *
 * @param {object} alert plain object from `.lean()` or `.toObject()`
 * @param {{role: string}} viewer
 * @returns {object} cloned + masked copy
 */
function maskAlertForViewer(alert, viewer = {}) {
  if (!alert || typeof alert !== 'object') return alert;
  const level = levelForRole(viewer.role || viewer.roleCode);

  // Structured clone via JSON round-trip. Sufficient for alerts which
  // are pure data (no Dates that need preservation beyond ISO string
  // form on the wire). Mongoose docs should be `.toObject({ flattenMaps: true })`
  // or `.lean()` before reaching this function.
  const cloned = JSON.parse(JSON.stringify(alert));

  for (const [dottedPath, rule] of Object.entries(RULES)) {
    if (level < rule.minLevel) {
      applyRule(cloned, dottedPath, rule);
    }
  }
  return cloned;
}

/**
 * Mask an array of alerts in one go. Common path for dashboard
 * inbox responses.
 */
function maskAlertsForViewer(alerts, viewer = {}) {
  if (!Array.isArray(alerts)) return [];
  return alerts.map(a => maskAlertForViewer(a, viewer));
}

module.exports = {
  maskAlertForViewer,
  maskAlertsForViewer,
  levelForRole,
  VIEWER_LEVELS,
  RULES,
};
