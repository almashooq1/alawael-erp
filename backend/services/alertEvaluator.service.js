/**
 * alertEvaluator.service.js — pure decision engine for dashboard
 * alerts.
 *
 * Phase 18 Commit 8.
 *
 * Given a KPI snapshot + policy + stored state + clock, decides
 * whether to fire, suppress, or escalate. Never dispatches — the
 * coordinator does that. Keeping the evaluator pure makes it
 * trivially testable and means the same logic works for real-time
 * ticks, replay / back-testing, and admin simulations.
 *
 * Output:
 *
 *   {
 *     action: 'fire' | 'escalate' | 'recover' | 'suppress' | 'noop',
 *     reason: string,              // why — used in logs + admin UI
 *     severity: string,            // copied from policy (null for noop)
 *     headlineAr, headlineEn,      // copied from policy (null for noop)
 *     correlationKey: string,
 *     escalationStep: number,      // 0-indexed ladder index if firing/escalating
 *     nextState: object,           // patch to apply to the state store
 *   }
 *
 * The evaluator is deliberately verbose about `reason` — operators
 * looking at why an alert did *not* fire is the single most common
 * debugging path for an alert platform.
 */

'use strict';

const { ladderFor } = require('../config/alert.registry');
const { makeCorrelationKey } = require('./alertStateStore.service');

function now(clock) {
  return clock && typeof clock.now === 'function' ? clock.now() : Date.now();
}

function isInQuietHours(policy, timestampMs) {
  if (!policy || !policy.quietHours) return false;
  const { start, end } = policy.quietHours;
  const hour = new Date(timestampMs).getUTCHours();
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  // Wraps midnight (e.g. 22 → 6).
  return hour >= start || hour < end;
}

function quietHoursExemptSeverity(severity) {
  return severity === 'critical' || severity === 'emergency';
}

function buildCorrelationKey(policy, snapshot, scope) {
  return makeCorrelationKey({
    policyId: policy.id,
    kpiId: snapshot.id,
    scope,
  });
}

function evaluateSinglePolicy({ policy, snapshot, state, clock, scope = null } = {}) {
  const ts = now(clock);
  const correlationKey = buildCorrelationKey(policy, snapshot, scope);

  const baseReturn = {
    correlationKey,
    severity: policy.severity,
    headlineAr: policy.headlineAr || null,
    headlineEn: policy.headlineEn || null,
    escalationStep: state ? state.escalationStep : -1,
    nextState: {
      policyId: policy.id,
      kpiId: snapshot.id,
      scope,
      classification: snapshot.classification,
    },
  };

  // Ack / snooze / mute guards — we still record the evaluation so
  // the admin UI can show last-seen, but we don't dispatch.
  if (state && state.mutedUntil && state.mutedUntil > ts) {
    return {
      ...baseReturn,
      action: 'suppress',
      reason: 'muted',
      nextState: { ...baseReturn.nextState },
    };
  }
  if (state && state.snoozeUntil && state.snoozeUntil > ts) {
    return {
      ...baseReturn,
      action: 'suppress',
      reason: 'snoozed',
      nextState: { ...baseReturn.nextState },
    };
  }

  // Classification eligibility.
  const targetCls = policy.trigger && policy.trigger.on;
  if (!targetCls) {
    return { ...baseReturn, action: 'noop', reason: 'policy.trigger.on missing' };
  }

  // Track consecutive ticks of the eligible classification.
  let consecutiveTicks = 0;
  if (snapshot.classification === targetCls) {
    consecutiveTicks =
      state && state.classification === targetCls ? (state.consecutiveTicks || 0) + 1 : 1;
  }

  // Recovery — was firing, now green / unknown → emit recover once.
  const wasFiring = state && state.classification === targetCls && state.firstFiredAt;
  if (wasFiring && snapshot.classification !== targetCls && snapshot.classification === 'green') {
    return {
      ...baseReturn,
      action: 'recover',
      reason: 'classification returned to green',
      nextState: {
        ...baseReturn.nextState,
        consecutiveTicks: 0,
        classification: snapshot.classification,
        firstFiredAt: null,
        lastFiredAt: state.lastFiredAt,
        escalationStep: -1,
        ackedAt: null,
        ackedBy: null,
      },
    };
  }

  // Not the eligible classification → noop.
  if (snapshot.classification !== targetCls) {
    return {
      ...baseReturn,
      action: 'noop',
      reason: `classification=${snapshot.classification} != target=${targetCls}`,
      nextState: {
        ...baseReturn.nextState,
        consecutiveTicks: 0,
        classification: snapshot.classification,
      },
    };
  }

  // Flapping guard.
  const minTicks = (policy.trigger && policy.trigger.minConsecutiveTicks) || 1;
  if (consecutiveTicks < minTicks) {
    return {
      ...baseReturn,
      action: 'noop',
      reason: `flapping guard: ${consecutiveTicks}/${minTicks} ticks`,
      nextState: {
        ...baseReturn.nextState,
        consecutiveTicks,
        classification: snapshot.classification,
      },
    };
  }

  // Quiet hours (except for critical/emergency).
  if (!quietHoursExemptSeverity(policy.severity) && isInQuietHours(policy, ts)) {
    return {
      ...baseReturn,
      action: 'suppress',
      reason: 'quiet_hours',
      nextState: {
        ...baseReturn.nextState,
        consecutiveTicks,
        classification: snapshot.classification,
      },
    };
  }

  // Dedup window — has the last fire been too recent?
  const dedupWindowMs = policy.dedupWindowMs || 0;
  const ladder = ladderFor(policy) || [];
  const currentStep = state ? state.escalationStep : -1;

  // First fire.
  if (!wasFiring) {
    return {
      ...baseReturn,
      action: 'fire',
      reason: 'first fire',
      escalationStep: 0,
      nextState: {
        ...baseReturn.nextState,
        consecutiveTicks,
        classification: snapshot.classification,
        firstFiredAt: ts,
        lastFiredAt: ts,
        escalationStep: 0,
      },
    };
  }

  // Already firing. Check for escalation — next ladder step's
  // `afterMs` has elapsed since firstFiredAt, ack is absent.
  const ackPresent = Boolean(state && state.ackedAt);
  if (!ackPresent && ladder.length > 0) {
    for (let step = ladder.length - 1; step > currentStep; step -= 1) {
      const stepMs = ladder[step].afterMs || 0;
      if (ts - (state.firstFiredAt || ts) >= stepMs) {
        return {
          ...baseReturn,
          action: 'escalate',
          reason: `escalate to step ${step}`,
          escalationStep: step,
          nextState: {
            ...baseReturn.nextState,
            consecutiveTicks,
            classification: snapshot.classification,
            firstFiredAt: state.firstFiredAt,
            lastFiredAt: ts,
            escalationStep: step,
          },
        };
      }
    }
  }

  // Already firing, not yet time to escalate. Suppress via dedup.
  const elapsedSinceLast = ts - (state.lastFiredAt || 0);
  if (elapsedSinceLast < dedupWindowMs) {
    return {
      ...baseReturn,
      action: 'suppress',
      reason: `dedup_window: ${elapsedSinceLast}ms < ${dedupWindowMs}ms`,
      escalationStep: currentStep,
      nextState: {
        ...baseReturn.nextState,
        consecutiveTicks,
        classification: snapshot.classification,
        firstFiredAt: state.firstFiredAt,
        lastFiredAt: state.lastFiredAt,
        escalationStep: currentStep,
      },
    };
  }

  // Dedup window has elapsed → re-fire at the current step.
  return {
    ...baseReturn,
    action: 'fire',
    reason: 'refire after dedup window',
    escalationStep: Math.max(0, currentStep),
    nextState: {
      ...baseReturn.nextState,
      consecutiveTicks,
      classification: snapshot.classification,
      firstFiredAt: state.firstFiredAt,
      lastFiredAt: ts,
      escalationStep: Math.max(0, currentStep),
    },
  };
}

module.exports = {
  evaluateSinglePolicy,
  _internals: { isInQuietHours, quietHoursExemptSeverity, buildCorrelationKey },
};
