/**
 * redFlagStateStore.js — Beneficiary-360 Foundation Commit 3b.
 *
 * The stateful partner of the pure engine: maps a stream of
 * per-evaluation verdicts into durable, debounced transitions —
 * newlyRaised, stillRaised, newlyResolved, suppressedByCooldown.
 * Those transitions are what notifications, tasks, and the
 * session-start guard ultimately consume; the raw verdict stream
 * would double-fire every evaluation.
 *
 * Design decisions:
 *
 *   1. Transition-diffing lives here, NOT in the engine. The engine
 *      is deterministic over observations; the store is what makes
 *      "newly" mean anything. Separating the two keeps the engine
 *      unit-testable without a clock.
 *
 *   2. Edge detection for the `crossed` operator falls out of the
 *      state machine naturally: once a flag is active, repeated
 *      raised-verdicts are `stillRaised` (no re-notify); the only
 *      `newlyRaised` per incident is the first transition from
 *      clear → raised. No explicit "crossed" code path needed.
 *
 *   3. autoResolve policy is honored from the registry per-flag:
 *        - null                    → manual-only; clear verdicts
 *                                    update lastObservedAt but keep
 *                                    the flag active (supervisor
 *                                    must close it)
 *        - condition_cleared       → auto-close as soon as a clear
 *                                    verdict arrives; open cooldown
 *        - timer                   → auto-close once raisedAt + N
 *                                    hours has elapsed; any clear
 *                                    before that is stillRaised
 *
 *   4. Cooldown suppression prevents re-raise storms. Once a flag
 *      auto/manually resolves, a `cooldownUntil` timestamp is
 *      recorded (based on `flag.cooldownHours`). A subsequent
 *      raise before that timestamp is reported as
 *      `suppressedByCooldown` instead of `newlyRaised`. Critical
 *      flags with `cooldownHours: 0` are effectively never
 *      suppressed — by design, they must be seen every time.
 *
 *   5. In-memory only for Commit 3b. The returned object is a
 *      narrow interface (`getActiveState`, `getAllActive`,
 *      `applyVerdicts`, `manualResolve`, `clear`) so a persistent
 *      adapter (Prisma/Mongo) in a later commit can satisfy the
 *      same contract without touching callers.
 *
 *   6. The store needs the registry only for `byId(flagId)`
 *      lookups (severity, autoResolve, cooldownHours, blocking).
 *      The registry is injected so tests can feed a fixture-only
 *      registry without touching the canonical one.
 */

'use strict';

const DEFAULT_REGISTRY = require('../config/red-flags.registry');

const MS_PER_HOUR = 3600 * 1000;

function toMs(dateOrString) {
  if (dateOrString instanceof Date) return dateOrString.getTime();
  if (typeof dateOrString === 'string') return new Date(dateOrString).getTime();
  if (typeof dateOrString === 'number') return dateOrString;
  return Date.now();
}

function toIso(dateOrString) {
  if (dateOrString instanceof Date) return dateOrString.toISOString();
  if (typeof dateOrString === 'string') return new Date(dateOrString).toISOString();
  if (typeof dateOrString === 'number') return new Date(dateOrString).toISOString();
  return new Date().toISOString();
}

function buildKey(beneficiaryId, flagId) {
  return `${beneficiaryId}::${flagId}`;
}

function createStateStore(deps = {}) {
  const registry = deps.registry || DEFAULT_REGISTRY;
  if (typeof registry.byId !== 'function') {
    throw new Error('redFlagStateStore: registry must expose byId()');
  }

  // Active raised-flags: key → state record
  const active = new Map();
  // Cooldown ledger: key → { resolvedAt, cooldownUntil }
  const cooldowns = new Map();

  function getActiveState(beneficiaryId, flagId) {
    return active.get(buildKey(beneficiaryId, flagId)) || null;
  }

  function getAllActive(beneficiaryId) {
    const prefix = `${beneficiaryId}::`;
    const out = [];
    for (const [k, v] of active) {
      if (k.startsWith(prefix)) out.push({ ...v });
    }
    return out;
  }

  function getCooldown(beneficiaryId, flagId) {
    return cooldowns.get(buildKey(beneficiaryId, flagId)) || null;
  }

  /**
   * Reconcile a batch of verdicts against persisted state. Returns
   * an object enumerating every transition; callers (notifier,
   * task-creator, UI) pick the bucket they care about.
   */
  function applyVerdicts(beneficiaryId, verdicts, options = {}) {
    if (beneficiaryId == null || beneficiaryId === '') {
      throw new Error('redFlagStateStore: beneficiaryId is required');
    }
    if (!Array.isArray(verdicts)) {
      throw new Error('redFlagStateStore: verdicts must be an array');
    }

    const nowMs = toMs(options.now);
    const nowIso = toIso(nowMs);

    const out = {
      beneficiaryId,
      evaluatedAt: nowIso,
      newlyRaised: [],
      stillRaised: [],
      newlyResolved: [],
      stillClear: [],
      suppressedByCooldown: [],
      errored: [],
    };

    for (const verdict of verdicts) {
      if (verdict == null || typeof verdict.flagId !== 'string') {
        continue;
      }

      if (verdict.kind === 'error') {
        out.errored.push({ ...verdict });
        continue;
      }

      const flag = registry.byId(verdict.flagId);
      if (!flag) {
        out.errored.push({ ...verdict, reason: 'unknown-flag' });
        continue;
      }

      const stateKey = buildKey(beneficiaryId, verdict.flagId);
      const prior = active.get(stateKey);
      const cooldown = cooldowns.get(stateKey);

      if (verdict.kind === 'raised') {
        if (prior) {
          // stillRaised — update observation, no new notification
          prior.lastObservedAt = nowIso;
          prior.observedValue = verdict.observedValue;
          out.stillRaised.push({ ...prior });
          continue;
        }

        if (cooldown && toMs(cooldown.cooldownUntil) > nowMs) {
          out.suppressedByCooldown.push({
            beneficiaryId,
            flagId: verdict.flagId,
            observedValue: verdict.observedValue,
            evaluatedAt: verdict.evaluatedAt,
            cooldownUntil: cooldown.cooldownUntil,
          });
          continue;
        }

        const record = {
          beneficiaryId,
          flagId: verdict.flagId,
          severity: flag.severity,
          domain: flag.domain,
          blocking: flag.response && flag.response.blocking === true,
          raisedAt: nowIso,
          lastObservedAt: nowIso,
          observedValue: verdict.observedValue,
        };
        active.set(stateKey, record);
        out.newlyRaised.push({ ...record });
        continue;
      }

      // verdict.kind === 'clear'
      if (!prior) {
        out.stillClear.push({
          beneficiaryId,
          flagId: verdict.flagId,
          observedValue: verdict.observedValue,
          evaluatedAt: verdict.evaluatedAt,
        });
        continue;
      }

      const policy = flag.autoResolve;

      if (policy === null || (policy && policy.type === 'manual')) {
        // Keep the flag active — supervisor must close it. Track
        // the latest observation so the UI shows the condition is
        // currently clear while the record is still open.
        prior.lastObservedAt = nowIso;
        prior.observedValue = verdict.observedValue;
        out.stillRaised.push({ ...prior });
        continue;
      }

      if (policy.type === 'condition_cleared') {
        active.delete(stateKey);
        const cooldownUntilMs = nowMs + (flag.cooldownHours || 0) * MS_PER_HOUR;
        const cooldownUntil = toIso(cooldownUntilMs);
        cooldowns.set(stateKey, {
          beneficiaryId,
          flagId: verdict.flagId,
          resolvedAt: nowIso,
          cooldownUntil,
        });
        out.newlyResolved.push({
          ...prior,
          resolvedAt: nowIso,
          resolvedBy: 'auto',
          cooldownUntil,
        });
        continue;
      }

      if (policy.type === 'timer') {
        const elapsedMs = nowMs - toMs(prior.raisedAt);
        const thresholdMs = (policy.afterHours || 0) * MS_PER_HOUR;
        if (elapsedMs >= thresholdMs) {
          active.delete(stateKey);
          const cooldownUntilMs = nowMs + (flag.cooldownHours || 0) * MS_PER_HOUR;
          const cooldownUntil = toIso(cooldownUntilMs);
          cooldowns.set(stateKey, {
            beneficiaryId,
            flagId: verdict.flagId,
            resolvedAt: nowIso,
            cooldownUntil,
          });
          out.newlyResolved.push({
            ...prior,
            resolvedAt: nowIso,
            resolvedBy: 'timer',
            cooldownUntil,
          });
        } else {
          prior.lastObservedAt = nowIso;
          prior.observedValue = verdict.observedValue;
          out.stillRaised.push({ ...prior });
        }
        continue;
      }

      // Unknown policy shape — treat as manual to fail safe.
      out.stillRaised.push({ ...prior });
    }

    return out;
  }

  /**
   * Close an active flag by operator action (supervisor review,
   * multidisciplinary sign-off, etc.). Returns the resolved
   * record, or `null` if no active flag matched.
   */
  function manualResolve(beneficiaryId, flagId, options = {}) {
    const stateKey = buildKey(beneficiaryId, flagId);
    const prior = active.get(stateKey);
    if (!prior) return null;

    const nowMs = toMs(options.now);
    const nowIso = toIso(nowMs);
    const flag = registry.byId(flagId);

    active.delete(stateKey);
    const cooldownUntilMs =
      nowMs + (flag && flag.cooldownHours ? flag.cooldownHours : 0) * MS_PER_HOUR;
    const cooldownUntil = toIso(cooldownUntilMs);
    cooldowns.set(stateKey, {
      beneficiaryId,
      flagId,
      resolvedAt: nowIso,
      cooldownUntil,
    });

    return {
      ...prior,
      resolvedAt: nowIso,
      resolvedBy: options.resolvedBy || 'manual',
      resolution: options.resolution || null,
      cooldownUntil,
    };
  }

  function clear() {
    active.clear();
    cooldowns.clear();
  }

  return Object.freeze({
    getActiveState,
    getAllActive,
    getCooldown,
    applyVerdicts,
    manualResolve,
    clear,
  });
}

module.exports = { createStateStore };
