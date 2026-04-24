/**
 * redFlagEngine.js — Beneficiary-360 Foundation Commit 3a.
 *
 * Orchestrates the pure evaluator over the full registry. Given a
 * beneficiary id, it walks every red-flag (or a filtered subset),
 * resolves the declared service method via the injected locator,
 * invokes it, passes the response to `evaluateFlag`, and aggregates
 * verdicts.
 *
 * Design decisions:
 *
 *   1. Stateless. The engine holds no raised-flag history, no
 *      cooldown timers, no edge-detection memory. Repeat calls with
 *      the same observations yield identical verdicts. State +
 *      dedup live in Commit 3b's store.
 *
 *   2. Dependency-injected. `createEngine({ locator, registry,
 *      evaluator })` takes its three collaborators explicitly so
 *      tests can stand up a fake locator with in-memory services
 *      and avoid touching disk, DB, or the wider module graph.
 *
 *   3. Error-isolating. A single service method throwing or
 *      returning something evaluator-incompatible produces an
 *      `error`-kind verdict for that flag — the rest of the run
 *      continues. A digest over 26 flags must not be one-bad-service
 *      away from going dark.
 *
 *   4. Concurrency. Flag invocations run with `Promise.all`, so
 *      slow services (or a deliberate mix of sync + async) don't
 *      serialize the run. Services are pure observation getters —
 *      ordering does not matter.
 *
 *   5. Filter options mirror registry lookup helpers: `domains`,
 *      `severities`, `flagIds`. Anything else is ignored so the
 *      surface stays small and future-compatible.
 *
 *   6. Service method contract: `method(beneficiaryId)` returns the
 *      raw observation (a value or a Promise resolving to one).
 *      The engine forwards that value verbatim to `evaluateFlag`;
 *      `flag.trigger.source.path` does the extraction.
 */

'use strict';

const DEFAULT_EVALUATOR = require('./redFlagEvaluator');
const DEFAULT_REGISTRY = require('../config/red-flags.registry');

function toArray(maybe) {
  if (maybe == null) return null;
  if (Array.isArray(maybe)) return maybe;
  return [maybe];
}

function applyFilter(flags, filter = {}) {
  const domains = toArray(filter.domains);
  const severities = toArray(filter.severities);
  const ids = toArray(filter.flagIds);
  return flags.filter(f => {
    if (domains && !domains.includes(f.domain)) return false;
    if (severities && !severities.includes(f.severity)) return false;
    if (ids && !ids.includes(f.id)) return false;
    return true;
  });
}

function nowIso(now) {
  if (now instanceof Date) return now.toISOString();
  if (typeof now === 'string') return now;
  return new Date().toISOString();
}

function createEngine(deps = {}) {
  const locator = deps.locator;
  const registry = deps.registry || DEFAULT_REGISTRY;
  const evaluator = deps.evaluator || DEFAULT_EVALUATOR;

  if (locator == null || typeof locator.resolve !== 'function') {
    throw new Error('redFlagEngine: a locator with `resolve(service, method)` is required');
  }
  if (!Array.isArray(registry.RED_FLAGS)) {
    throw new Error('redFlagEngine: registry must expose RED_FLAGS array');
  }
  if (typeof evaluator.evaluateFlag !== 'function') {
    throw new Error('redFlagEngine: evaluator must expose evaluateFlag()');
  }

  /**
   * Evaluate one flag for one beneficiary. Returns a verdict
   * extended with a `kind` field:
   *   'raised'  — condition tripped
   *   'clear'   — condition did not trip
   *   'error'   — service threw, returned junk, or locator failed
   * Never rethrows.
   */
  async function evaluateOneFlag(flag, beneficiaryId, nowDate) {
    const baseIso = nowIso(nowDate);
    let invoke;
    try {
      invoke = locator.resolve(flag.trigger.source.service, flag.trigger.source.method, {
        forFlagId: flag.id,
      });
    } catch (err) {
      return {
        flagId: flag.id,
        raised: false,
        kind: 'error',
        observedValue: undefined,
        evaluatedAt: baseIso,
        reason: `locator-error: ${err.message}`,
      };
    }

    let serviceResponse;
    try {
      // Pass observation context to the adapter — currently `{ now }`
      // so time-windowed queries (incidents in last 48h, attendance
      // over last 30d, etc.) honor the evaluator's injected clock.
      // Adapters written before this was wired still work: JS
      // silently drops the second arg if the function ignores it.
      serviceResponse = await invoke(beneficiaryId, { now: nowDate });
    } catch (err) {
      return {
        flagId: flag.id,
        raised: false,
        kind: 'error',
        observedValue: undefined,
        evaluatedAt: baseIso,
        reason: `service-error: ${err.message}`,
      };
    }

    try {
      const verdict = evaluator.evaluateFlag(flag, serviceResponse, { now: nowDate });
      return {
        ...verdict,
        kind: verdict.raised ? 'raised' : 'clear',
      };
    } catch (err) {
      // Composite operator or registry corruption — flag it, don't
      // silently swallow. The surrounding run continues.
      return {
        flagId: flag.id,
        raised: false,
        kind: 'error',
        observedValue: undefined,
        evaluatedAt: baseIso,
        reason: `evaluator-error: ${err.message}`,
      };
    }
  }

  /**
   * Evaluate (a subset of) the registry for one beneficiary.
   * Returns a summary plus an array of per-flag verdicts.
   */
  async function evaluateBeneficiary(beneficiaryId, options = {}) {
    if (beneficiaryId == null || beneficiaryId === '') {
      throw new Error('redFlagEngine: beneficiaryId is required');
    }
    const flags = applyFilter(registry.RED_FLAGS, options);
    const now = options.now instanceof Date ? options.now : new Date();
    const verdicts = await Promise.all(
      flags.map(flag => evaluateOneFlag(flag, beneficiaryId, now))
    );

    const raised = verdicts.filter(v => v.kind === 'raised');
    const errored = verdicts.filter(v => v.kind === 'error');
    const blockingRaised = raised.filter(v => {
      const f = registry.byId(v.flagId);
      return f && f.response && f.response.blocking === true;
    });

    return {
      beneficiaryId,
      evaluatedAt: nowIso(now),
      flagsEvaluated: verdicts.length,
      raisedCount: raised.length,
      erroredCount: errored.length,
      blockingRaisedCount: blockingRaised.length,
      verdicts,
      raised,
      blockingRaised,
    };
  }

  return Object.freeze({ evaluateBeneficiary, _evaluateOneFlag: evaluateOneFlag });
}

module.exports = { createEngine };
