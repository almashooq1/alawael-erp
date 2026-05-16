'use strict';

/**
 * escalation.service.js — Wave 13.
 *
 * Periodic processor that promotes alerts up the escalation ladder
 * (tier 1 → 2 → 3) when they sit without operator action long enough
 * to cross the thresholds declared on each rule.
 *
 * The decision graph for a single tick (per active, non-resolved
 * alert):
 *
 *   skip if:
 *     • resolvedAt set                  — already closed
 *     • mutedUntil > now                — operator chose to silence
 *     • snoozeUntil > now               — deferred deliberately
 *     • ackedAt set                     — acknowledgement stops the
 *                                          escalation clock per design §5.3
 *     • ownership.assignedTo set        — specific user owns it,
 *                                          tier broadcast no longer applies
 *     • severity = 'info'               — no escalation policy
 *
 *   promote to tier 2 when:
 *     currentTier == 1 AND
 *     now - tier1At >= rule.escalation.tier1AfterMin
 *
 *   promote to tier 3 when:
 *     currentTier == 2 AND
 *     now - tier2At >= rule.escalation.tier2AfterMin
 *
 * Channels per tier (notify callback receives the tier number and
 * decides — keeps this service free of notification specifics):
 *     tier 1: in_app + email
 *     tier 2: in_app + email
 *     tier 3: in_app + email + sms (for critical/high)
 *
 * Every promotion appends an entry to `state.transitions` (no state
 * change — `state.current` stays OPEN — but the actor 'engine' is
 * recorded with the new tier in the `reason` field) and writes an
 * AuditLog event (PDPL Art.13).
 *
 * Factory injection mirrors workflow.service.js — keeps the unit
 * tests Mongo-free.
 */

const DefaultAlertModel = require('./alert.model');
const DefaultRules = require('./rules');
const { getEscalation } = require('./rule-introspection');

const MAX_BATCH = 200;

function nowDate() {
  return new Date();
}

/**
 * @param {object} opts
 *   - alertModel:    defaults to canonical model
 *   - rules:         array of rule exports; defaults to bundled set
 *   - notifyTier:    async ({alert, tier, roles}) => void
 *                    Called when an alert is promoted; the integration
 *                    layer resolves roles → users → channels → send.
 *                    Defaults to a no-op so the service is safe to
 *                    run in test/staging without paging anyone.
 *   - auditLogger:   `{log(entry)}` integration
 *   - logger:        console-compatible
 *   - now:           clock injection for tests
 *   - maxBatch:      max alerts evaluated per tick (default 200) —
 *                    bounded so a backlog of stale alerts doesn't
 *                    monopolize the scheduler tick.
 */
function createEscalationCoordinator({
  alertModel = DefaultAlertModel,
  rules = DefaultRules,
  notifyTier = async () => {},
  auditLogger = null,
  logger = console,
  now = nowDate,
  maxBatch = MAX_BATCH,
} = {}) {
  // Build a quick (ruleId → ruleDescriptor) index. Keeps escalation
  // metadata resolution O(1) per alert instead of array.find().
  const ruleIndex = new Map();
  for (const r of rules) {
    if (r && r.id) ruleIndex.set(r.id, r);
  }

  function getRuleForAlert(alert) {
    if (!alert || !alert.ruleId) return null;
    return ruleIndex.get(alert.ruleId) || null;
  }

  async function audit(action, alert, metadata) {
    if (!auditLogger || typeof auditLogger.log !== 'function') return;
    try {
      await auditLogger.log({
        action,
        actorUserId: null,
        actorRole: 'engine',
        entityType: 'Alert',
        entityId: alert?._id || null,
        metadata: { ruleId: alert?.ruleId, ...metadata },
      });
    } catch (err) {
      logger.warn && logger.warn(`[escalation] audit ${action}: ${err.message}`);
    }
  }

  /**
   * Returns the channel list appropriate for the tier + severity. The
   * notifyTier integration uses this hint when fanning out.
   */
  function channelsForTier(tier, severity) {
    if (tier === 3 && (severity === 'critical' || severity === 'high')) {
      return ['in_app', 'email', 'sms'];
    }
    return ['in_app', 'email'];
  }

  /**
   * Decide whether the alert should be skipped (and why) for
   * observability + tests. Returns null when the alert is a
   * candidate for promotion.
   */
  function skipReason(alert, currentNow) {
    if (!alert) return 'NO_ALERT';
    if (alert.resolvedAt) return 'RESOLVED';
    if (alert.mutedUntil && alert.mutedUntil > currentNow) return 'MUTED';
    if (alert.snoozeUntil && alert.snoozeUntil > currentNow) return 'SNOOZED';
    if (alert.ackedAt) return 'ACKED';
    if (alert.ownership && alert.ownership.assignedTo) return 'ASSIGNED';
    if (alert.severity === 'info') return 'INFO_NO_ESCALATION';
    return null;
  }

  /**
   * Evaluate one alert; promote in-place if thresholds crossed.
   * Returns the promotion outcome for the caller's audit summary.
   */
  async function evaluateOne(alert, currentNow) {
    const skip = skipReason(alert, currentNow);
    if (skip) return { skipped: true, reason: skip };

    const rule = getRuleForAlert(alert);
    if (!rule) {
      // Unknown ruleId means the rule was removed at some point.
      // Don't try to escalate something we don't know how to bound.
      return { skipped: true, reason: 'UNKNOWN_RULE' };
    }

    const escalation = getEscalation(rule);
    if (!escalation) return { skipped: true, reason: 'NO_ESCALATION_POLICY' };

    const tier = (alert.escalation && alert.escalation.currentTier) || 1;
    const tier1At = (alert.escalation && alert.escalation.tier1At) || alert.firstSeenAt;
    const tier2At = alert.escalation && alert.escalation.tier2At;

    if (tier === 1) {
      const elapsedMin = (currentNow - new Date(tier1At)) / 60000;
      if (elapsedMin < escalation.tier1AfterMin) {
        return { skipped: true, reason: 'TIER1_NOT_DUE', elapsedMin };
      }
      // Promote 1 → 2
      alert.escalation.currentTier = 2;
      alert.escalation.tier2At = currentNow;
      const promotedRoles = (escalation.chain || []).slice(0, 2); // tier1+tier2 roles
      alert.escalation.tier2NotifiedRoles = promotedRoles;
      alert.state.transitions.push({
        from: alert.state.current || 'OPEN',
        to: alert.state.current || 'OPEN',
        at: currentNow,
        byUserId: null,
        byRole: 'engine',
        reason: 'escalation:tier1→tier2',
      });
      await alert.save();
      await notifyTier({
        alert,
        tier: 2,
        roles: promotedRoles,
        channels: channelsForTier(2, alert.severity),
      });
      await audit('alert.escalation.promote', alert, {
        from: 1,
        to: 2,
        roles: promotedRoles,
      });
      return { promotedTo: 2, roles: promotedRoles };
    }

    if (tier === 2) {
      if (!tier2At) {
        // Defensive: missing tier2At means the doc was authored
        // before Wave 11 and never promoted; treat as just-promoted.
        alert.escalation.tier2At = currentNow;
        await alert.save();
        return { skipped: true, reason: 'BACKFILLED_TIER2_AT' };
      }
      const elapsedMin = (currentNow - new Date(tier2At)) / 60000;
      if (elapsedMin < escalation.tier2AfterMin) {
        return { skipped: true, reason: 'TIER2_NOT_DUE', elapsedMin };
      }
      // Promote 2 → 3
      alert.escalation.currentTier = 3;
      alert.escalation.tier3At = currentNow;
      const promotedRoles = (escalation.chain || []).slice(0, 3);
      alert.escalation.tier3NotifiedRoles = promotedRoles;
      alert.state.transitions.push({
        from: alert.state.current || 'OPEN',
        to: alert.state.current || 'OPEN',
        at: currentNow,
        byUserId: null,
        byRole: 'engine',
        reason: 'escalation:tier2→tier3',
      });
      await alert.save();
      await notifyTier({
        alert,
        tier: 3,
        roles: promotedRoles,
        channels: channelsForTier(3, alert.severity),
      });
      await audit('alert.escalation.promote', alert, {
        from: 2,
        to: 3,
        roles: promotedRoles,
      });
      return { promotedTo: 3, roles: promotedRoles };
    }

    return { skipped: true, reason: 'TIER3_TERMINAL' };
  }

  /**
   * Single-tick processor. Loads up-to maxBatch active alerts and
   * evaluates each against its rule's thresholds. Returns a summary
   * the scheduler can log + emit metrics from.
   */
  async function processEscalations() {
    const currentNow = now();
    const Model = alertModel.model || alertModel;

    // Active = unresolved + not muted/snoozed. The DB does the heavy
    // lifting so a backlog of resolved alerts doesn't slow ticks.
    const candidates = await Model.find({
      resolvedAt: null,
      ackedAt: null,
      'ownership.assignedTo': null,
      severity: { $ne: 'info' },
      $or: [{ mutedUntil: null }, { mutedUntil: { $lt: currentNow } }],
    })
      .limit(maxBatch)
      .lean(false); // we need full Mongoose docs to call .save()

    const summary = {
      tickAt: currentNow,
      checked: candidates.length,
      promotedTo2: 0,
      promotedTo3: 0,
      skippedByReason: {},
      errors: [],
    };

    for (const alert of candidates) {
      try {
        const outcome = await evaluateOne(alert, currentNow);
        if (outcome.promotedTo === 2) summary.promotedTo2 += 1;
        else if (outcome.promotedTo === 3) summary.promotedTo3 += 1;
        else if (outcome.reason) {
          summary.skippedByReason[outcome.reason] =
            (summary.skippedByReason[outcome.reason] || 0) + 1;
        }
      } catch (err) {
        summary.errors.push({
          alertId: String(alert._id),
          message: err.message,
        });
        logger.warn && logger.warn(`[escalation] alert ${alert._id}: ${err.message}`);
      }
    }

    return summary;
  }

  return {
    processEscalations,
    // Exposed for testing + composition.
    evaluateOne,
    skipReason,
    channelsForTier,
    getRuleForAlert,
  };
}

module.exports = {
  createEscalationCoordinator,
  MAX_BATCH,
};
