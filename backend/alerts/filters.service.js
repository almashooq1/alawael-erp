'use strict';

/**
 * filters.service.js — Wave 14.
 *
 * Pure query builders that turn an authenticated user + scope into a
 * MongoDB `find` filter for the Alert collection. One builder per
 * dashboard surface; every builder returns `{ filter, projection }`
 * so callers can plug straight into `AlertModel.find(filter, projection)`.
 *
 * Design principles enforced here:
 *
 *   1. **Role-aware**, not blanket. Each dashboard sees a different
 *      slice — executive views aggregate platform issues without raw
 *      PII; branch managers see their branch with full context;
 *      clinical/HR/Finance/Quality see their domain with full context;
 *      the DPO sees compliance with subject_type only.
 *
 *   2. **State-aware**. Resolved + muted alerts disappear from the
 *      live inbox; the only way to see them is via the history /
 *      audit endpoint.
 *
 *   3. **Tenant-safe**. Cross-branch roles (super_admin, head_office_
 *      admin, dpo, etc.) see all branches; region-scoped roles see
 *      branches in `user.regionIds[]`; everyone else is hard-pinned
 *      to `user.activeBranchId || user.branchId`.
 *
 *   4. **PII-safe by default**. Projection excludes `subject.id` for
 *      viewers whose role doesn't have a legitimate need (executive
 *      summary screens, DPO inboxes that need only the request type).
 *      The full document is available via the entity-bound deep-link
 *      where viewer→entity authz is re-checked.
 *
 *   5. **Stateless**. No DB calls in this file — builders are
 *      synchronous and easy to unit-test. The HTTP route runs the
 *      resulting `find()` itself.
 */

const { CROSS_BRANCH_ROLES, REGION_SCOPED_ROLES } = require('../config/constants/roles.constants');

// ─── Projection presets ──────────────────────────────────────────
// "wide" — full document the responsible role can act on.
// "exec" — strip subject.id (executive doesn't need entity-level PII).
// "dpo"  — preserve subject.type, strip subject.id (compliance overview).

const WIDE_PROJECTION = {
  // Empty projection = return everything. We're explicit rather than
  // implicit so a future schema addition doesn't accidentally leak
  // into a view that shouldn't have it.
  ruleId: 1,
  key: 1,
  severity: 1,
  category: 1,
  archetype: 1,
  timePressure: 1,
  scope: 1,
  message: 1,
  description: 1,
  subject: 1,
  branchId: 1,
  firstSeenAt: 1,
  lastSeenAt: 1,
  resolvedAt: 1,
  ackedAt: 1,
  snoozeUntil: 1,
  mutedUntil: 1,
  state: 1,
  ownership: 1,
  escalation: 1,
  comments: 1,
  reopens: 1,
  notificationsSent: 1,
  metadata: 1,
  createdAt: 1,
  updatedAt: 1,
};

const EXEC_PROJECTION = {
  ruleId: 1,
  severity: 1,
  category: 1,
  archetype: 1,
  timePressure: 1,
  scope: 1,
  message: 1,
  description: 1,
  branchId: 1,
  firstSeenAt: 1,
  lastSeenAt: 1,
  'state.current': 1,
  'escalation.currentTier': 1,
  'escalation.tier3At': 1,
  // ✗ subject.id removed — executive sees the *count* and the *kind*
  //   of entity, not which individual it concerns.
  'subject.type.type': 1,
};

const DPO_PROJECTION = {
  ruleId: 1,
  severity: 1,
  message: 1,
  description: 1,
  firstSeenAt: 1,
  lastSeenAt: 1,
  resolvedAt: 1,
  'state.current': 1,
  'escalation.currentTier': 1,
  'subject.type.type': 1,
  metadata: 1,
};

// ─── Helpers ─────────────────────────────────────────────────────

/**
 * Translate user identity into a branch-scope filter clause.
 * Returns null when the user has cross-branch visibility (no
 * scope clause needed).
 */
function branchScope(user) {
  if (!user) return { branchId: null }; // unauthenticated → see nothing
  const role = user.role || user.roleCode || '';
  if (CROSS_BRANCH_ROLES.includes(role)) return null;
  if (REGION_SCOPED_ROLES.includes(role)) {
    const regionBranches = Array.isArray(user.regionBranchIds) ? user.regionBranchIds : [];
    return { branchId: { $in: regionBranches } };
  }
  const branchId = user.activeBranchId || user.branchId || null;
  return { branchId };
}

/**
 * Live-inbox baseline: not resolved, not muted, not snoozed.
 * Every dashboard layer adds its own clauses on top of this.
 */
function liveInboxBase(now = new Date()) {
  return {
    resolvedAt: null,
    $and: [
      { $or: [{ mutedUntil: null }, { mutedUntil: { $lt: now } }] },
      { $or: [{ snoozeUntil: null }, { snoozeUntil: { $lt: now } }] },
    ],
  };
}

/**
 * Merge a scope clause into a filter. Mongo's $and doesn't accept
 * `null` so we short-circuit when scope returns null.
 */
function withScope(filter, scope) {
  if (!scope) return filter;
  return { ...filter, ...scope };
}

// ─── Per-dashboard builders ──────────────────────────────────────

/**
 * Executive Command Center.
 * - Tier 3 escalations across all branches the user can see
 * - PLUS critical platform-scope alerts even if still at tier 1/2
 * - Projection: EXEC (no subject.id)
 */
function executiveAlertFilter(user, opts = {}) {
  const now = opts.now || new Date();
  const base = liveInboxBase(now);
  const filter = withScope(
    {
      ...base,
      $or: [{ 'escalation.currentTier': 3 }, { severity: 'critical', scope: 'platform' }],
    },
    branchScope(user)
  );
  return { filter, projection: EXEC_PROJECTION, sort: { severity: -1, lastSeenAt: -1 } };
}

/**
 * Branch Control Tower.
 * - Everything (tier 1+) for the user's branch, ordered by severity
 *   then by tier, then by recency
 * - Projection: WIDE (manager needs full context to act)
 */
function branchAlertFilter(user, opts = {}) {
  const now = opts.now || new Date();
  const base = liveInboxBase(now);
  return {
    filter: withScope(base, branchScope(user)),
    projection: WIDE_PROJECTION,
    sort: { severity: -1, 'escalation.currentTier': -1, lastSeenAt: -1 },
  };
}

/**
 * Clinical Command View.
 * - category: clinical OR quality (safety umbrella)
 * - Ordered by time-pressure first so 'immediate' bubbles to top
 */
function clinicalAlertFilter(user, opts = {}) {
  const now = opts.now || new Date();
  const base = liveInboxBase(now);
  return {
    filter: withScope(
      {
        ...base,
        category: { $in: ['clinical', 'quality'] },
      },
      branchScope(user)
    ),
    projection: WIDE_PROJECTION,
    // timePressure 'immediate' lexicographically sorts before 'hours',
    // 'days', 'watching' — convenient default for the inbox view.
    sort: { timePressure: 1, severity: -1, lastSeenAt: -1 },
  };
}

/**
 * HR Dashboard.
 * - category: hr
 * - Ordered by severity + lastSeen
 */
function hrAlertFilter(user, opts = {}) {
  const now = opts.now || new Date();
  const base = liveInboxBase(now);
  return {
    filter: withScope({ ...base, category: 'hr' }, branchScope(user)),
    projection: WIDE_PROJECTION,
    sort: { severity: -1, lastSeenAt: -1 },
  };
}

/**
 * Finance Dashboard.
 * - category: financial
 */
function financeAlertFilter(user, opts = {}) {
  const now = opts.now || new Date();
  const base = liveInboxBase(now);
  return {
    filter: withScope({ ...base, category: 'financial' }, branchScope(user)),
    projection: WIDE_PROJECTION,
    sort: { severity: -1, lastSeenAt: -1 },
  };
}

/**
 * Quality Dashboard.
 * - category: quality (incidents, CAPA, etc.) — distinct from
 *   the Clinical view which folds quality in for safety reasons.
 */
function qualityAlertFilter(user, opts = {}) {
  const now = opts.now || new Date();
  const base = liveInboxBase(now);
  return {
    filter: withScope({ ...base, category: 'quality' }, branchScope(user)),
    projection: WIDE_PROJECTION,
    sort: { severity: -1, lastSeenAt: -1 },
  };
}

/**
 * DPO Inbox.
 * - category: compliance (PDPL especially)
 * - Cross-branch by definition (DPO role lives in CROSS_BRANCH_ROLES)
 * - Projection: DPO (subject.type but not subject.id — DPO doesn't
 *   need to see WHO; they need to see HOW MANY and WHAT KIND).
 */
function dpoAlertFilter(_user, opts = {}) {
  const now = opts.now || new Date();
  const base = liveInboxBase(now);
  // We intentionally don't apply branchScope — PDPL Art.30 oversight
  // is org-wide. The role check at the route layer guarantees only
  // `dpo` / `compliance_officer` reach this filter.
  return {
    filter: { ...base, category: 'compliance' },
    projection: DPO_PROJECTION,
    sort: { severity: -1, firstSeenAt: 1 }, // oldest unresolved first (SLA risk)
  };
}

/**
 * "Assigned to me" — independent of category. Used by every
 * dashboard's personal inbox widget + Wave-4 Next-Best-Action
 * generation. Returns the user's owned alerts at tier 1+2
 * (escalated past tier 2 means the responsibility shifted).
 */
function assignedToMeFilter(user, opts = {}) {
  const now = opts.now || new Date();
  if (!user || !user.id) {
    return {
      filter: { _id: null }, // matches nothing
      projection: WIDE_PROJECTION,
      sort: {},
    };
  }
  const base = liveInboxBase(now);
  return {
    filter: {
      ...base,
      'ownership.assignedTo': user.id,
      // Tier 3 means leadership took over — don't keep showing the
      // alert in the assignee's NBA list once it escalated past them.
      ...(opts.includeTier3 ? {} : { 'escalation.currentTier': { $lt: 3 } }),
    },
    projection: WIDE_PROJECTION,
    sort: { severity: -1, firstSeenAt: 1 },
  };
}

module.exports = {
  // Per-dashboard
  executiveAlertFilter,
  branchAlertFilter,
  clinicalAlertFilter,
  hrAlertFilter,
  financeAlertFilter,
  qualityAlertFilter,
  dpoAlertFilter,
  assignedToMeFilter,
  // Helpers exposed for callers building bespoke filters
  branchScope,
  liveInboxBase,
  // Projection presets exposed for testing + composition
  WIDE_PROJECTION,
  EXEC_PROJECTION,
  DPO_PROJECTION,
};
