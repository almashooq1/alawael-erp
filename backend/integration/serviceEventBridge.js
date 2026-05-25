'use strict';

/**
 * serviceEventBridge.js — W387 (2026-05-25).
 *
 * Bridges service-local EventEmitter emits (from W379-W386 wires) to the
 * integrationBus.publish() pipeline. Without this, subscribers in
 * dddCrossModuleSubscribers.js — which use `integrationBus.subscribe(
 * 'episodes.episode.created', handler)` and similar namespaced patterns —
 * never receive events fired via `service.emit('episode.created', payload)`.
 *
 * THE ROOT-CAUSE BUG (discovered 2026-05-25 while attempting an integration
 * test):
 *
 *   - integrationBus.publish('episodes', 'episode.created', payload)
 *     → dispatches with fullEventName = 'episodes.episode.created'
 *     → reaches subscribers listening for that pattern
 *
 *   - service.emit('episode.created', payload)  ← W379-W386 wires
 *     → local EventEmitter only (BaseService extends EventEmitter)
 *     → NEVER reaches integrationBus subscribers
 *
 * Two separate buses, no link. The W375/W382 drift guards passed because the
 * eventType STRING appeared in source (producer's emit call + subscriber's
 * pattern). The W384-W386 behavioral tests passed because they subscribed to
 * the SAME service-local emitter the producer fires on. But neither caught
 * the bus-mismatch — that's a producer↔subscriber integration concern.
 *
 * THE FIX (this module):
 *
 *   For each wired domain service, install a listener that catches the local
 *   emit and republishes via integrationBus.publish(domain, eventType, payload).
 *   The integrationBus then handles delivery per contract (persist/broadcast/
 *   realtime/local) AND dispatches to pattern subscribers.
 *
 *   - One source of truth for envelope shape (still the W379-W386 wire)
 *   - One destination (integrationBus)
 *   - Failure-isolated (try/catch wraps each forward)
 *   - Idempotent registration (sets a flag on each service so re-init doesn't
 *     double-bind)
 *
 * Per-service mappings encode the W379-W386 producer surface:
 *
 *   episodes.service → episode.{created, phase_transitioned, closed}
 *   core.beneficiaryService → beneficiary.{status_changed, profile_updated}
 *   care-plans.service → careplan.{activated, completed}
 *   goals.goalService → goal.achieved
 *   behavior.behaviorService → behavior.{incident_recorded, plan_updated}
 *   assessments.assessmentService → assessment.completed
 *   aiRecommendation.bus → ai.recommendation_generated
 *   quality (via qualityEventBus) → quality.{audit_completed, corrective_action_required}
 *
 * episodes.created comes via afterCreate hook — fires on every successful
 * EpisodeService.create. The bridge sees this LOCAL event and re-publishes
 * it to integrationBus, which dispatches to the timeline/dashboards/workflow/
 * notification subscribers per the contract's consumers array.
 *
 * Wired into startup/integrationBus.js AFTER initializeDDDSubscribers so
 * subscribers are registered first, then forwarders attach.
 */

const logger = require('../utils/logger');

const BRIDGE_FLAG = Symbol.for('w387.serviceEventBridge.attached');
// W388 refinement: per-event tracking instead of per-service flag. Needed for
// buses like qualityEventBus where multiple distinct events (with different
// canonical domains) flow through the SAME instance.
const ATTACHED_EVENTS = Symbol.for('w387.serviceEventBridge.attachedEvents');

/**
 * Wire service-local events to integrationBus.publish.
 *
 * @param {Object} integrationBus  - The systemIntegrationBus singleton
 * @returns {{wiredCount: number, skippedDomains: string[]}}
 */
function wireServiceEventBridge(integrationBus) {
  if (!integrationBus || typeof integrationBus.publish !== 'function') {
    logger.warn('[ServiceEventBridge] integrationBus not available — skipping');
    return { wiredCount: 0, skippedDomains: ['ALL'] };
  }

  const skipped = [];
  let wired = 0;

  // Helper: attach a forwarder to a service for a list of eventTypes.
  // W388 refinement: per-(bus, eventType) tracking so buses shared across
  // domains (e.g., qualityEventBus carrying both quality.* AND
  // assessments.assessment.overdue) can be wired by multiple attachBridge
  // calls with different domain prefixes without conflict.
  function attachBridge(domain, service, eventTypes) {
    if (!service || typeof service.on !== 'function') {
      skipped.push(domain);
      return;
    }
    if (!service[ATTACHED_EVENTS]) {
      service[ATTACHED_EVENTS] = new Set();
      service[BRIDGE_FLAG] = true; // preserved for backward-compat
    }
    const attached = service[ATTACHED_EVENTS];
    for (const eventType of eventTypes) {
      if (attached.has(eventType)) continue; // already wired on this bus
      service.on(eventType, payload => {
        // Fire-and-forget: integrationBus.publish is async but we don't await
        // — the producing service shouldn't pay the latency cost of all
        // subscribers + persistence + broadcast. Errors logged + swallowed.
        Promise.resolve()
          .then(() => integrationBus.publish(domain, eventType, payload))
          .catch(err => {
            logger.error(
              `[ServiceEventBridge] forward failed for ${domain}.${eventType}: ${err.message}`
            );
          });
      });
      attached.add(eventType);
      wired++;
    }
  }

  // ─── episodes: episode.created / phase_transitioned / closed ────────────
  try {
    const episodesDomain = require('../domains/episodes');
    if (episodesDomain.service) {
      attachBridge('episodes', episodesDomain.service, [
        'episode.created',
        'episode.phase_transitioned',
        'episode.closed',
      ]);
    } else {
      skipped.push('episodes (service not initialized)');
    }
  } catch (err) {
    skipped.push(`episodes (${err.message})`);
  }

  // ─── core: beneficiary.{registered, status_changed, profile_updated} ──
  try {
    const coreDomain = require('../domains/core');
    if (coreDomain.beneficiaryService) {
      attachBridge('core', coreDomain.beneficiaryService, [
        'beneficiary.registered', // W395 — wired from afterCreate
        'beneficiary.status_changed',
        'beneficiary.profile_updated',
      ]);
    } else {
      skipped.push('core (beneficiaryService not initialized)');
    }
  } catch (err) {
    skipped.push(`core (${err.message})`);
  }

  // ─── care-plans: careplan.{activated, completed} ────────────────────────
  try {
    const cpModule = require('../domains/care-plans/services/CarePlansService');
    const svc = cpModule.carePlansService;
    if (svc) {
      attachBridge('care-plans', svc, ['careplan.activated', 'careplan.completed']);
    } else {
      skipped.push('care-plans (singleton not exported)');
    }
  } catch (err) {
    skipped.push(`care-plans (${err.message})`);
  }

  // ─── goals: goal.achieved ───────────────────────────────────────────────
  try {
    const goalsDomain = require('../domains/goals');
    if (goalsDomain.goalService) {
      attachBridge('goals', goalsDomain.goalService, ['goal.achieved']);
    } else {
      skipped.push('goals (goalService not initialized)');
    }
  } catch (err) {
    skipped.push(`goals (${err.message})`);
  }

  // ─── behavior: behavior.{incident_recorded, plan_updated} ───────────────
  try {
    const { behaviorService } = require('../domains/behavior/services/BehaviorService');
    if (behaviorService) {
      attachBridge('behavior', behaviorService, [
        'behavior.incident_recorded',
        'behavior.plan_updated',
      ]);
    } else {
      skipped.push('behavior (singleton not found)');
    }
  } catch (err) {
    skipped.push(`behavior (${err.message})`);
  }

  // ─── assessments: assessment.completed ──────────────────────────────────
  try {
    const assessmentsDomain = require('../domains/assessments');
    if (assessmentsDomain.assessmentService) {
      attachBridge('assessments', assessmentsDomain.assessmentService, ['assessment.completed']);
    } else {
      skipped.push('assessments (assessmentService not initialized)');
    }
  } catch (err) {
    skipped.push(`assessments (${err.message})`);
  }

  // ─── sessions: session.completed (W391 wire) ────────────────────────────
  try {
    const sessionsDomain = require('../domains/sessions');
    // sessions domain exports the service singleton via initialize() — fallback to
    // direct module require if not present.
    let sessionSvc = sessionsDomain.service || sessionsDomain.sessionService;
    if (!sessionSvc) {
      try {
        const mod = require('../domains/sessions/services/SessionsService');
        sessionSvc = mod.sessionsService || mod.SessionsService;
        if (typeof sessionSvc === 'function') sessionSvc = new sessionSvc();
      } catch {
        /* fallback failed */
      }
    }
    if (sessionSvc) {
      attachBridge('sessions', sessionSvc, ['session.completed']);
    } else {
      skipped.push('sessions (service not initialized)');
    }
  } catch (err) {
    skipped.push(`sessions (${err.message})`);
  }

  // ─── ai-recommendations: ai.recommendation_generated (module-level bus) ─
  // The aiRecommendation.service.js exports a module-level `bus` instead of
  // a class instance. Bridge it the same way.
  try {
    const aiRec = require('../services/aiRecommendation.service');
    if (aiRec.bus) {
      // W391: ai.risk_elevated added — createDraft emits this when confidence ≥0.95
      // (closes the orphan-subscriber gap that W390 surfaced).
      attachBridge('ai-recommendations', aiRec.bus, [
        'ai.recommendation_generated',
        'ai.risk_elevated',
      ]);
    } else {
      skipped.push('ai-recommendations (bus not exported)');
    }
  } catch (err) {
    skipped.push(`ai-recommendations (${err.message})`);
  }

  // ─── quality: audit_completed / corrective_action_required (via qualityEventBus) ─
  // These W381 emits use qualityEventBus.getDefault() directly. The
  // integration-bus-published subscribers expect 'quality.audit_completed'
  // (namespaced) — so we still need to bridge from qualityEventBus to
  // integrationBus.
  try {
    const qBusModule = require('../services/quality/qualityEventBus.service');
    const qBus = typeof qBusModule.getDefault === 'function' ? qBusModule.getDefault() : null;
    if (qBus) {
      attachBridge('quality', qBus, [
        'quality.audit_completed',
        'quality.corrective_action_required',
      ]);
      // W388: the W383 sweeper emits `assessment.overdue` on this SAME bus
      // (it lazy-loaded qualityEventBus as the most-available cross-cutting
      // emitter). The event belongs to the 'assessments' canonical domain,
      // so we attach a separate forwarder with that domain prefix. Per-event
      // tracking in attachBridge() prevents listener conflict with the
      // 'quality' forwarders above.
      attachBridge('assessments', qBus, ['assessment.overdue']);
    } else {
      skipped.push('quality (qualityEventBus.getDefault missing)');
    }
  } catch (err) {
    skipped.push(`quality (${err.message})`);
  }

  logger.info(
    `[ServiceEventBridge] wired ${wired} event forwarders` +
      (skipped.length ? ` (skipped: ${skipped.join(', ')})` : '')
  );

  return { wiredCount: wired, skippedDomains: skipped };
}

module.exports = { wireServiceEventBridge, BRIDGE_FLAG };
