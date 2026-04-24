/**
 * redFlagEvaluator.js — Beneficiary-360 Foundation Commit 2.
 *
 * Pure evaluator over a (flag, serviceResponse) tuple — returns
 * whether the flag's condition is currently tripped. No I/O, no
 * service resolution, no eval, no dynamic require. Deterministic.
 *
 * Design decisions:
 *
 *   1. Three layered functions, each independently testable:
 *        extractPath(obj, path)        — pluck the observation
 *        evaluateCondition(cond, val)  — apply the operator
 *        evaluateFlag(flag, raw)       — pipe the two together
 *
 *   2. Path language is a strict subset of JMESPath, covering only
 *      what the red-flag and KPI registries actually use today:
 *        a.b.c                         — nested property access
 *        arr.length                    — array length
 *        [?field=='value']             — equality filter on an array
 *        [?field=='value'].fieldName   — filter then pick (singular)
 *        [?field=='value'].length      — filter then count
 *      Anything fancier is rejected so the grammar stays auditable.
 *
 *   3. `crossed` is treated as `>=` at the pure layer. Edge-detection
 *      (raise only on transition below→above) is a stateful concern
 *      that belongs to the orchestrator (Commit 3) — not the
 *      evaluator. Same flag re-evaluating with the same observation
 *      always yields the same result.
 *
 *   4. Numeric coercion is conservative: `==` is strict-first then
 *      numeric if both sides coerce without NaN; relational operators
 *      (`<`, `>=`, ...) coerce both sides, and return `false` when
 *      either side is non-finite. This keeps `undefined`/`null` from
 *      accidentally tripping a threshold.
 *
 *   5. `exists` / `missing` check for `null` and `undefined` only —
 *      empty strings, empty arrays, and `0` count as "present".
 *
 *   6. Composite operators (`and`, `or`) are declared in the registry
 *      taxonomy but are NOT evaluated here — the orchestrator will
 *      compose child flag results. Calling `evaluateCondition` with
 *      a composite operator throws, surfacing the mis-wiring.
 */

'use strict';

// ─── Path extraction ────────────────────────────────────────────

const FILTER_TOKEN = /^\[\?([a-zA-Z_][a-zA-Z0-9_]*)==(?:'([^']*)'|"([^"]*)"|([^\]]+))\]$/;
const PROPERTY_TOKEN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function tokenize(path) {
  // Split on '.' but preserve '[?...]' chunks as single tokens.
  // Filter tokens may appear at start (path begins with '[?...]'),
  // mid-path after a '.', or chained. The registries only use them
  // at the head, but supporting mid-chain costs nothing.
  const raw = path.split(/\.(?![^\[]*\])/);
  return raw
    .filter(s => s.length > 0)
    .map(seg => {
      const f = FILTER_TOKEN.exec(seg);
      if (f) {
        return {
          type: 'filter',
          field: f[1],
          value: f[2] !== undefined ? f[2] : f[3] !== undefined ? f[3] : f[4],
        };
      }
      if (PROPERTY_TOKEN.test(seg)) {
        return { type: 'property', name: seg };
      }
      throw new Error(`red-flag path: unsupported token '${seg}' in '${path}'`);
    });
}

function extractPath(obj, path) {
  if (obj == null) return undefined;
  if (path == null || path === '') return obj;
  const tokens = tokenize(path);
  let cur = obj;
  for (const tok of tokens) {
    if (cur == null) return undefined;
    if (tok.type === 'filter') {
      if (!Array.isArray(cur)) return undefined;
      cur = cur.filter(item => item != null && String(item[tok.field]) === String(tok.value));
    } else if (tok.type === 'property') {
      if (tok.name === 'length' && Array.isArray(cur)) {
        cur = cur.length;
      } else if (Array.isArray(cur)) {
        // Post-filter projection: registries rely on filters that
        // yield a singular match (severity buckets, etc). Pick head.
        cur = cur.length > 0 ? cur[0]?.[tok.name] : undefined;
      } else if (typeof cur === 'object') {
        cur = cur[tok.name];
      } else {
        return undefined;
      }
    }
  }
  return cur;
}

// ─── Condition evaluation ───────────────────────────────────────

function isPresent(v) {
  return v !== null && v !== undefined;
}

function toFiniteNumber(v) {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof v === 'boolean') return v ? 1 : 0;
  return null;
}

function evaluateCondition(condition, observedValue) {
  if (condition == null || typeof condition.operator !== 'string') {
    throw new Error('red-flag condition: operator missing');
  }
  const { operator, value: expected } = condition;

  switch (operator) {
    case 'exists':
      return isPresent(observedValue);
    case 'missing':
      return !isPresent(observedValue);
    case '==': {
      if (observedValue === expected) return true;
      if (!isPresent(observedValue) || !isPresent(expected)) return false;
      const a = toFiniteNumber(observedValue);
      const b = toFiniteNumber(expected);
      return a !== null && b !== null && a === b;
    }
    case '!=': {
      if (observedValue === expected) return false;
      if (!isPresent(observedValue) || !isPresent(expected)) {
        // null/undefined are !== each other's counterparts only when
        // one side is present — keep behavior symmetric with '=='.
        return isPresent(observedValue) !== isPresent(expected);
      }
      const a = toFiniteNumber(observedValue);
      const b = toFiniteNumber(expected);
      if (a !== null && b !== null) return a !== b;
      return true;
    }
    case '<':
    case '<=':
    case '>':
    case '>=':
    case 'crossed': {
      const a = toFiniteNumber(observedValue);
      const b = toFiniteNumber(expected);
      if (a === null || b === null) return false;
      if (operator === '<') return a < b;
      if (operator === '<=') return a <= b;
      if (operator === '>') return a > b;
      return a >= b; // '>=' and 'crossed' (edge detection lives in orchestrator)
    }
    case 'and':
    case 'or':
      throw new Error(
        `red-flag condition: composite operator '${operator}' is not handled by the pure evaluator — the orchestrator must compose child results`
      );
    default:
      throw new Error(`red-flag condition: unknown operator '${operator}'`);
  }
}

// ─── Flag-level evaluation ──────────────────────────────────────

/**
 * Evaluate a single red-flag entry against a raw service response.
 * Returns a verdict object describing the outcome. Never throws for
 * data shape issues — returns `raised: false` with an `error` reason
 * instead, so a single malformed observation can't crash the whole
 * digest run. Throws only for registry-level misconfiguration.
 */
function evaluateFlag(flag, serviceResponse, { now = new Date() } = {}) {
  if (flag == null || flag.trigger == null) {
    throw new Error('red-flag: flag or flag.trigger is missing');
  }

  const path = flag.trigger.source && flag.trigger.source.path;
  let observedValue;
  try {
    observedValue = extractPath(serviceResponse, path || '');
  } catch (err) {
    return {
      flagId: flag.id,
      raised: false,
      observedValue: undefined,
      evaluatedAt: now instanceof Date ? now.toISOString() : new Date().toISOString(),
      reason: `path-error: ${err.message}`,
    };
  }

  let raised;
  try {
    raised = evaluateCondition(flag.trigger.condition, observedValue);
  } catch (err) {
    // Composite operators + registry corruption surface as errors —
    // rethrow so the orchestrator can alert ops, don't silently
    // suppress.
    throw err;
  }

  return {
    flagId: flag.id,
    raised,
    observedValue,
    evaluatedAt: now instanceof Date ? now.toISOString() : new Date().toISOString(),
    reason: raised ? 'condition-tripped' : 'condition-clear',
  };
}

module.exports = {
  extractPath,
  evaluateCondition,
  evaluateFlag,
  // internal-ish, exported for tests — not part of the public contract
  _tokenize: tokenize,
};
