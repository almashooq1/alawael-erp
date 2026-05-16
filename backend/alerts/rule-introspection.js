'use strict';

/**
 * rule-introspection.js — Wave 11.
 *
 * The Alert & Priority Engine design adds optional `ownership`,
 * `nextAction`, `escalation`, and `cooldownMin` fields to rule
 * exports. Most legacy rules don't carry them — they shipped before
 * the design existed. This helper centralizes the "give me X for
 * this rule" logic with safe fallbacks, so callers (dispatcher,
 * coordinator, briefing service, dashboard routes) don't each
 * re-implement the fallback chain.
 *
 * Three principles:
 *
 *   1. **Never throw**. Every helper returns a usable value (or
 *      null) regardless of the input rule's shape.
 *
 *   2. **Severity-driven defaults**. When a rule omits escalation
 *      timing, we synthesize from a severity → timing table that
 *      mirrors the Alert & Priority Engine design.
 *
 *   3. **Recipient resolution is downstream**. We hand back role
 *      strings; `recipients.js` is still responsible for turning a
 *      role into a user list. This keeps the helper testable without
 *      Mongo.
 */

const { DEFAULT_ROUTES } = require('./recipients');

// Severity → (tier1AfterMin, tier2AfterMin) defaults. Mirrors the
// Alert & Priority Engine design §5.2.
const ESCALATION_DEFAULTS = Object.freeze({
  critical: { tier1AfterMin: 15, tier2AfterMin: 60 },
  high: { tier1AfterMin: 240, tier2AfterMin: 480 },
  warning: { tier1AfterMin: 1440, tier2AfterMin: 4320 },
  info: { tier1AfterMin: null, tier2AfterMin: null }, // no escalation for info
});

// Severity-aware cooldown defaults. Critical: no cooldown (every
// lapse must be captured). Lower severities: cooldown ≥ 1 day so a
// chatty rule doesn't spam the inbox each tick.
const COOLDOWN_DEFAULTS = Object.freeze({
  critical: 0,
  high: 60, // 1 hour
  warning: 1440, // 24 hours
  info: 4320, // 3 days
});

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Resolve a value that the rule may have provided as either a static
 * value or a function of the finding (e.g. `ownership.primary` can
 * be a role string OR a function returning a role string based on
 * which therapist owns the case).
 *
 * @template T
 * @param {T | ((finding: object) => T)} valueOrFn
 * @param {object} finding
 * @returns {T | null}
 */
function resolveDynamic(valueOrFn, finding) {
  if (valueOrFn == null) return null;
  if (typeof valueOrFn === 'function') {
    try {
      return valueOrFn(finding);
    } catch {
      return null;
    }
  }
  return valueOrFn;
}

/**
 * Extract the ownership descriptor for a rule.
 *
 * @returns {{primary, fallback, notifyCC: string[]}} guaranteed shape;
 *          fields may be null but the object always exists.
 */
function getOwnership(rule, finding = {}) {
  const declared = isPlainObject(rule && rule.ownership) ? rule.ownership : null;
  if (declared) {
    return {
      primary: resolveDynamic(declared.primary, finding),
      fallback: resolveDynamic(declared.fallback, finding),
      notifyCC: Array.isArray(declared.notifyCC) ? declared.notifyCC.slice() : [],
      deadline: declared.deadline || 'business-hours',
    };
  }
  // Fallback: derive from category+severity through DEFAULT_ROUTES.
  // The route table stores roles as a flat array — `[primary, fallback,
  // ...notifyCC]` — keeping `recipients.js` and this helper in lockstep.
  const roles = (DEFAULT_ROUTES?.[rule?.category] || {})[rule?.severity];
  if (Array.isArray(roles) && roles.length > 0) {
    return {
      primary: roles[0],
      fallback: roles[1] || null,
      notifyCC: roles.slice(2),
      deadline: 'business-hours',
    };
  }
  return { primary: null, fallback: null, notifyCC: [], deadline: 'business-hours' };
}

/**
 * Extract the next-best-action descriptor.
 */
function getNextAction(rule, finding = {}) {
  const declared = isPlainObject(rule && rule.nextAction) ? rule.nextAction : null;
  if (!declared) {
    return {
      titleAr: 'افتح التنبيه وراجع التفاصيل',
      titleEn: 'Open the alert and review details',
      deepLink: null,
      estimatedMin: 15,
    };
  }
  return {
    titleAr: declared.titleAr || 'افتح التنبيه وراجع التفاصيل',
    titleEn: declared.titleEn || 'Open the alert and review details',
    deepLink: resolveDynamic(declared.deepLink, finding),
    estimatedMin:
      typeof declared.estimatedMin === 'number' && declared.estimatedMin > 0
        ? declared.estimatedMin
        : 15,
  };
}

/**
 * Extract the escalation descriptor with severity-aware defaults.
 *
 * Returns null when severity is 'info' (no escalation policy for
 * informational alerts — they live in the digest, not in the inbox).
 */
function getEscalation(rule, finding = {}) {
  const declared = isPlainObject(rule && rule.escalation) ? rule.escalation : null;
  const severity = (rule && rule.severity) || 'info';

  if (severity === 'info') {
    return null;
  }

  const defaults = ESCALATION_DEFAULTS[severity] || ESCALATION_DEFAULTS.warning;

  if (!declared) {
    // Synthesize chain from category+severity DEFAULT_ROUTES.
    const roles = (DEFAULT_ROUTES?.[rule?.category] || {})[severity];
    return {
      tier1AfterMin: defaults.tier1AfterMin,
      tier2AfterMin: defaults.tier2AfterMin,
      chain: Array.isArray(roles) ? roles.slice() : [],
    };
  }

  const chain = Array.isArray(declared.chain)
    ? declared.chain.map(c => resolveDynamic(c, finding)).filter(Boolean)
    : [];

  return {
    tier1AfterMin:
      typeof declared.tier1AfterMin === 'number' && declared.tier1AfterMin > 0
        ? declared.tier1AfterMin
        : defaults.tier1AfterMin,
    tier2AfterMin:
      typeof declared.tier2AfterMin === 'number' && declared.tier2AfterMin > 0
        ? declared.tier2AfterMin
        : defaults.tier2AfterMin,
    chain,
  };
}

/**
 * Cooldown (minutes between successive re-raises after resolve)
 * for a rule. Severity-aware default; rule may override via
 * `cooldownMin` field.
 */
function getCooldownMin(rule) {
  const declared = rule && rule.cooldownMin;
  if (typeof declared === 'number' && declared >= 0) return declared;
  const severity = (rule && rule.severity) || 'warning';
  return COOLDOWN_DEFAULTS[severity] ?? COOLDOWN_DEFAULTS.warning;
}

/**
 * Returns the list of OTHER rule IDs whose active state should
 * suppress this rule. Used by the engine to avoid "two alerts for
 * one underlying problem" (e.g. care-plan-review-overdue suppresses
 * goal-stalled because reviewing the plan implicitly covers the goal).
 */
function getSuppressedBy(rule) {
  if (!rule || !Array.isArray(rule.suppressIf)) return [];
  return rule.suppressIf.filter(id => typeof id === 'string' && id.length > 0);
}

/**
 * Returns the orthogonal classification axes (archetype, timePressure,
 * scope). All optional — null when the rule doesn't declare them.
 */
function getClassification(rule) {
  if (!rule) return { archetype: null, timePressure: null, scope: null };
  return {
    archetype: rule.archetype || null,
    timePressure: rule.timePressure || null,
    scope: rule.scope || null,
  };
}

/**
 * Build the *full* alert descriptor a rule emits for a finding. The
 * dispatcher uses this to populate the new Wave 11 Alert fields when
 * creating a document.
 */
function describeFindingFromRule(rule, finding) {
  return {
    ruleId: rule.id,
    classification: getClassification(rule),
    ownership: getOwnership(rule, finding),
    nextAction: getNextAction(rule, finding),
    escalation: getEscalation(rule, finding),
    cooldownMin: getCooldownMin(rule),
    suppressedBy: getSuppressedBy(rule),
  };
}

module.exports = {
  getOwnership,
  getNextAction,
  getEscalation,
  getCooldownMin,
  getSuppressedBy,
  getClassification,
  describeFindingFromRule,
  // Exposed for callers / tests that want to query / override the
  // baseline tables.
  ESCALATION_DEFAULTS,
  COOLDOWN_DEFAULTS,
};
