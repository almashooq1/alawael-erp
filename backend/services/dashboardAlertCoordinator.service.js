/**
 * dashboardAlertCoordinator.service.js — orchestrates the dashboard
 * alert pipeline: (heroKpis) → evaluator → state store → dispatcher.
 *
 * Phase 18 Commit 8.
 *
 * The coordinator is the single place where policy lookup, state
 * read/write, and dispatcher callouts come together. The evaluator
 * stays pure; this module owns the side effects.
 *
 * Usage (in a scheduler or route):
 *
 *   const coord = buildAlertCoordinator({
 *     stateStore,       // createInMemoryStore() or a Redis-backed equivalent
 *     dispatcher,       // async ({ decision, policy, snapshot, scope }) → void
 *     logger,
 *     clock,
 *   });
 *
 *   const decisions = await coord.evaluateSnapshot({ heroKpis, scope });
 *
 * The coordinator returns the full array of decisions (including
 * noops) so admin UIs can show "why was I *not* alerted?" instead
 * of a silent black box.
 */

'use strict';

const { POLICIES, forKpi } = require('../config/alert.registry');
const { evaluateSinglePolicy } = require('./alertEvaluator.service');

function noopDispatcher() {
  return Promise.resolve({ skipped: true });
}

function buildAlertCoordinator({
  stateStore,
  policies = POLICIES,
  dispatcher = noopDispatcher,
  logger = console,
  clock = { now: () => Date.now() },
} = {}) {
  if (!stateStore || typeof stateStore.get !== 'function') {
    throw new Error('alertCoordinator: stateStore is required');
  }

  async function evaluateSnapshot({ heroKpis = [], scope = null } = {}) {
    const results = [];
    for (const snapshot of heroKpis) {
      const relevantPolicies = policies.filter(p => p.kpiId === snapshot.id || p.kpiId === '*');
      if (relevantPolicies.length === 0) continue;
      for (const policy of relevantPolicies) {
        const correlationKey = `${policy.id}|${snapshot.id}|${scope ? JSON.stringify(scope) : ''}`;
        const state = stateStore.get(correlationKey);
        const decision = evaluateSinglePolicy({
          policy,
          snapshot,
          state,
          clock,
          scope,
        });
        // Always persist the next state — we want the streak counter
        // to advance even on noops.
        if (decision.nextState) stateStore.upsert(correlationKey, decision.nextState);

        if (decision.action === 'fire' || decision.action === 'escalate') {
          try {
            await dispatcher({ decision, policy, snapshot, scope });
          } catch (err) {
            if (logger && logger.warn) {
              logger.warn(
                `[alertCoordinator] dispatcher error on ${decision.correlationKey}: ${err.message}`
              );
            }
          }
        }
        results.push({ ...decision, policyId: policy.id, kpiId: snapshot.id });
      }
    }
    return results;
  }

  // ─── Operator actions ──────────────────────────────────────────

  function ack(correlationKey, { userId = null } = {}) {
    const existing = stateStore.get(correlationKey);
    if (!existing) return null;
    return stateStore.upsert(correlationKey, {
      ackedAt: clock.now(),
      ackedBy: userId,
    });
  }

  function snooze(correlationKey, { minutes = 60 } = {}) {
    const existing = stateStore.get(correlationKey);
    if (!existing) return null;
    const until = clock.now() + Math.max(1, Math.floor(minutes)) * 60 * 1000;
    return stateStore.upsert(correlationKey, { snoozeUntil: until });
  }

  function mute(correlationKey, { reason = null, hours = 24 } = {}) {
    const existing = stateStore.get(correlationKey);
    if (!existing) return null;
    const until = clock.now() + Math.max(1, Math.floor(hours)) * 60 * 60 * 1000;
    return stateStore.upsert(correlationKey, {
      mutedUntil: until,
      muteReason: reason,
    });
  }

  function listActive({ includeSuppressed = false } = {}) {
    const now = clock.now();
    return stateStore
      .list()
      .filter(entry => {
        if (!entry.firstFiredAt) return false;
        if (entry.ackedAt) return false;
        if (!includeSuppressed && entry.mutedUntil && entry.mutedUntil > now) return false;
        if (!includeSuppressed && entry.snoozeUntil && entry.snoozeUntil > now) return false;
        return true;
      })
      .map(entry => ({
        correlationKey: entry.key,
        policyId: entry.policyId,
        kpiId: entry.kpiId,
        classification: entry.classification,
        firstFiredAt: entry.firstFiredAt,
        lastFiredAt: entry.lastFiredAt,
        escalationStep: entry.escalationStep,
        ackedAt: entry.ackedAt || null,
        snoozeUntil: entry.snoozeUntil || null,
        mutedUntil: entry.mutedUntil || null,
      }));
  }

  return { evaluateSnapshot, ack, snooze, mute, listActive, _internals: { forKpi } };
}

module.exports = { buildAlertCoordinator, noopDispatcher };
