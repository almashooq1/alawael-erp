'use strict';

/**
 * beneficiary-lifecycle-handler-map-completeness-wave594.test.js — Wave 594.
 *
 * The factory `createBeneficiaryLifecycleSideEffectHandlers` builds its handler
 * map in two passes: (1) register the three REAL data handlers under their OP
 * constants, then (2) for every remaining registry op, install a categorized
 * DEFERRED handler. The W583 docstring's whole promise is **registry-complete
 * coverage** — nothing may fall through to the lifecycle service's
 * `'no handler wired'` silent-skip branch.
 *
 * Existing guards don't prove this end-to-end:
 *   • W591 only checks the three real OP values resolve to functions.
 *   • W592 only pins the mutation shape of those three.
 *   • W593 only checks classifyOp is total for deferred ops.
 *   • W585 is behavioral but routes through executeTransition, not the raw map.
 *
 * This pure-unit guard pins the assembled map itself:
 *   1. EVERY registry op has a callable handler (completeness — no silent skip).
 *   2. The three real ops map to category:'data' handlers (self-skip when their
 *      model is absent, with the canonical *-model-unavailable reason).
 *   3. EVERY other op maps to a deferred handler that returns
 *      { deferred:true, category } with category === classifyOp(op).
 *   4. The real/deferred partition is exact — no op is both, none is neither.
 *
 * No DB, no Express boot — exercises the map with a null eventSink so deferred
 * handlers run without side-effects and the real handlers self-skip.
 */

const {
  createBeneficiaryLifecycleSideEffectHandlers,
  classifyOp,
  allRegistryOps,
  OP,
} = require('../intelligence/beneficiary-lifecycle-side-effects.service');

const REAL_DATA_OPS = Object.freeze(Object.values(OP));
const SELF_SKIP_REASONS = Object.freeze([
  'appointment-model-unavailable',
  'episode-model-unavailable',
]);

/** Build a map with no models + no eventSink → real ops self-skip, deferred run. */
function buildMap() {
  return createBeneficiaryLifecycleSideEffectHandlers({
    appointmentModel: null,
    episodeModel: null,
    eventSink: null,
    now: () => new Date('2026-05-30T00:00:00.000Z'),
    logger: { warn() {} },
  });
}

const CTX = Object.freeze({ beneficiaryId: 'bene-594', toState: 'discharged' });

describe('W594 — handler map is registry-complete and correctly partitioned', () => {
  test('every registry op has a callable handler (no silent skip possible)', () => {
    const handlers = buildMap();
    const ops = allRegistryOps();
    expect(ops.length).toBeGreaterThan(0);
    for (const op of ops) {
      expect(typeof handlers[op]).toBe('function');
    }
  });

  test('the three real ops resolve to category:data self-skipping handlers', async () => {
    const handlers = buildMap();
    for (const op of REAL_DATA_OPS) {
      const result = await handlers[op](CTX);
      expect(result.name).toBe(op);
      expect(result.category).toBe('data');
      expect(result.skipped).toBe(true);
      expect(SELF_SKIP_REASONS).toContain(result.reason);
    }
  });

  test('every non-real op is a deferred handler tagged with classifyOp category', async () => {
    const handlers = buildMap();
    const deferred = allRegistryOps().filter((op) => !REAL_DATA_OPS.includes(op));
    expect(deferred.length).toBeGreaterThan(0);
    for (const op of deferred) {
      const result = await handlers[op](CTX);
      expect(result.name).toBe(op);
      expect(result.deferred).toBe(true);
      expect(result.category).toBe(classifyOp(op));
      // null eventSink → nothing emitted, but the handler still records intent
      expect(result.emitted).toBe(false);
    }
  });

  test('partition is exact — no op is both real and deferred, none is neither', async () => {
    const handlers = buildMap();
    for (const op of allRegistryOps()) {
      const result = await handlers[op](CTX);
      const isReal = result.category === 'data';
      const isDeferred = result.deferred === true;
      // exactly one of the two roles, never both, never neither
      expect(isReal !== isDeferred).toBe(true);
      expect(isReal && isDeferred).toBe(false);
    }
  });

  test('real and deferred op sets are disjoint and together cover the registry', () => {
    const all = allRegistryOps();
    const realInRegistry = all.filter((op) => REAL_DATA_OPS.includes(op));
    const deferred = all.filter((op) => !REAL_DATA_OPS.includes(op));
    expect(realInRegistry.length + deferred.length).toBe(all.length);
    for (const op of realInRegistry) expect(deferred).not.toContain(op);
    // all three real ops are actually declared in the registry
    expect(realInRegistry.sort()).toEqual([...REAL_DATA_OPS].sort());
  });
});
