'use strict';

/**
 * notification-policies.registry.js — Phase 15 Commit 1 (4.0.64).
 *
 * Maps `quality.*` and `compliance.*` event patterns to the
 * recipients + channels + priority that should be notified when
 * the event fires. Pure data, no I/O. The notification router
 * consumes this at runtime to decide who hears what.
 *
 * Policy shape:
 *
 *   {
 *     id,              // stable id for logging/dedup
 *     pattern,         // event-name pattern (same syntax as bus.on)
 *     recipients: {
 *       roles: [...],  // org roles to notify (looked up to users at fire time)
 *       users: [...],  // optional explicit user ids
 *     },
 *     channels: ['email','console', …],
 *     priority: 'critical' | 'high' | 'normal' | 'low',
 *     template: 'key', // lookup key in templates.js
 *     dedupWindowMs?,  // swallow the same (eventKey, recipient) within this window
 *   }
 *
 * Default recipient resolver in the router handles the `roles`
 * list by querying the `User`/`HrEmployee` collection for active
 * members with that role on the event's branch. Missing roles
 * fall through silently — the router never throws for empty
 * recipient sets.
 */

const FIFTEEN_MIN = 15 * 60 * 1000;
const ONE_HOUR = 60 * 60 * 1000;
const ONE_DAY = 24 * 60 * 60 * 1000;

const NOTIFICATION_POLICIES = Object.freeze([
  // ── Management Review ─────────────────────────────────────────
  {
    id: 'mr.scheduled',
    pattern: 'quality.review.scheduled',
    recipients: { roles: ['ceo', 'quality_manager', 'medical_director'] },
    channels: ['email'],
    priority: 'normal',
    template: 'review.scheduled',
    dedupWindowMs: ONE_HOUR,
  },
  {
    id: 'mr.closed',
    pattern: 'quality.review.closed',
    recipients: { roles: ['ceo', 'quality_manager', 'compliance_officer'] },
    channels: ['email'],
    priority: 'normal',
    template: 'review.closed',
    dedupWindowMs: ONE_HOUR,
  },
  {
    id: 'mr.cancelled',
    pattern: 'quality.review.cancelled',
    recipients: { roles: ['ceo', 'quality_manager'] },
    channels: ['email'],
    priority: 'high',
    template: 'review.cancelled',
    dedupWindowMs: ONE_HOUR,
  },
  {
    id: 'mr.action_assigned',
    pattern: 'quality.review.action_assigned',
    recipients: { roles: [] }, // router resolves to ownerUserId from payload
    channels: ['email'],
    priority: 'normal',
    template: 'review.action_assigned',
    dedupWindowMs: ONE_HOUR,
  },

  // ── Evidence ──────────────────────────────────────────────────
  {
    id: 'ev.expired',
    pattern: 'compliance.evidence.expired',
    recipients: { roles: ['quality_manager', 'compliance_officer'] },
    channels: ['email'],
    priority: 'critical',
    template: 'evidence.expired',
    dedupWindowMs: ONE_DAY,
  },
  {
    id: 'ev.expiring',
    pattern: 'compliance.evidence.expiring',
    recipients: { roles: ['quality_manager', 'compliance_officer'] },
    channels: ['email'],
    priority: 'high',
    template: 'evidence.expiring',
    dedupWindowMs: ONE_DAY,
  },
  {
    id: 'ev.revoked',
    pattern: 'compliance.evidence.revoked',
    recipients: { roles: ['compliance_officer', 'admin'] },
    channels: ['email'],
    priority: 'high',
    template: 'evidence.revoked',
    dedupWindowMs: ONE_HOUR,
  },
  {
    id: 'ev.legal_hold_set',
    pattern: 'compliance.evidence.legal_hold_set',
    recipients: { roles: ['compliance_officer', 'legal', 'admin'] },
    channels: ['email'],
    priority: 'high',
    template: 'evidence.legal_hold_set',
    dedupWindowMs: ONE_HOUR,
  },

  // ── Compliance Calendar ───────────────────────────────────────
  {
    id: 'cal.alert',
    pattern: 'compliance.calendar.alert',
    recipients: { roles: ['quality_manager', 'compliance_officer'] },
    channels: ['email'],
    priority: 'high',
    template: 'calendar.alert',
    dedupWindowMs: ONE_HOUR,
  },
  {
    id: 'cal.event_created',
    pattern: 'compliance.calendar.event_created',
    recipients: { roles: ['compliance_officer'] },
    channels: ['email'],
    priority: 'low',
    template: 'calendar.event_created',
    dedupWindowMs: ONE_HOUR,
  },

  // ── Controls ──────────────────────────────────────────────────
  {
    id: 'ctrl.tested_fail',
    pattern: 'compliance.control.tested',
    // router filters: only fire when outcome is 'fail'
    recipients: { roles: ['quality_manager', 'compliance_officer'] },
    channels: ['email'],
    priority: 'high',
    template: 'control.tested_fail',
    dedupWindowMs: FIFTEEN_MIN,
    outcomeFilter: ['fail', 'partial'],
  },
  {
    id: 'ctrl.deprecated',
    pattern: 'compliance.control.deprecated',
    recipients: { roles: ['quality_manager', 'admin'] },
    channels: ['email'],
    priority: 'normal',
    template: 'control.deprecated',
    dedupWindowMs: ONE_HOUR,
  },

  // ── CAPA ──────────────────────────────────────────────────────
  {
    id: 'capa.overdue',
    pattern: 'quality.capa.overdue',
    // recipients.roles left empty → router tries ownerUserId from payload,
    // falls back to quality_manager.
    recipients: { roles: ['quality_manager'], fallbackFromPayload: 'ownerUserId' },
    channels: ['email'],
    priority: 'critical',
    template: 'capa.overdue',
    dedupWindowMs: ONE_DAY,
  },
  {
    id: 'capa.effectiveness',
    pattern: 'quality.capa.effectiveness_check_due',
    recipients: { roles: ['quality_manager'] },
    channels: ['email'],
    priority: 'normal',
    template: 'capa.effectiveness_check_due',
    dedupWindowMs: ONE_DAY,
  },

  // ── Risk ──────────────────────────────────────────────────────
  {
    id: 'risk.reassessment',
    pattern: 'quality.risk.reassessment_due',
    recipients: { roles: ['quality_manager'], fallbackFromPayload: 'ownerId' },
    channels: ['email'],
    priority: 'high',
    template: 'risk.reassessment_due',
    dedupWindowMs: ONE_DAY,
  },

  // ── NCR pipeline ──────────────────────────────────────────────
  {
    id: 'ncr.auto_linked',
    pattern: 'quality.ncr.auto_linked',
    recipients: { roles: ['quality_manager', 'medical_director'] },
    channels: ['email'],
    priority: 'critical',
    template: 'ncr.auto_linked',
    dedupWindowMs: ONE_HOUR,
  },

  // ── Catch-all for observability ───────────────────────────────
  {
    id: 'audit.all',
    pattern: '*',
    recipients: { roles: [] }, // no recipients — just logs to console channel
    channels: ['console'],
    priority: 'low',
    template: 'generic',
    dedupWindowMs: 0, // never dedup console audit
  },
]);

const PRIORITIES = Object.freeze(['critical', 'high', 'normal', 'low']);

function priorityRank(p) {
  switch (p) {
    case 'critical':
      return 3;
    case 'high':
      return 2;
    case 'normal':
      return 1;
    default:
      return 0;
  }
}

/**
 * Pattern matcher — same semantics as QualityEventBus:
 *   exact:       "a.b.c"  → only a.b.c
 *   star suffix: "a.b.*"  → a.b.c, a.b.c.d
 *   wildcard:    "*"      → everything
 */
function matches(pattern, name) {
  if (pattern === '*') return true;
  if (pattern === name) return true;
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return name === prefix || name.startsWith(prefix + '.');
  }
  return false;
}

/**
 * Return policies that match the event name, ranked by priority
 * descending.
 */
function resolvePolicies(eventName) {
  return NOTIFICATION_POLICIES.filter(p => matches(p.pattern, eventName)).sort(
    (a, b) => priorityRank(b.priority) - priorityRank(a.priority)
  );
}

module.exports = {
  NOTIFICATION_POLICIES,
  PRIORITIES,
  priorityRank,
  matches,
  resolvePolicies,
};
