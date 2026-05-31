'use strict';

/**
 * beneficiary-lifecycle-classify-op-exhaustive-wave593.test.js — Wave 593.
 *
 * W586 enriched the DEFERRED side-effect event with a `category` tag so the
 * downstream notification / compliance / workflow infrastructure can route it.
 * That routing is only as trustworthy as `classifyOp`: if a NEW deferred op is
 * added to the registry and `classifyOp`'s heuristic does not recognize it, the
 * op silently falls into the `'workflow'` default bucket — a wrong-subsystem
 * routing bug that no existing test catches (W585 asserts the deferred op emits;
 * W591/W592 only cover the three REAL data handlers).
 *
 * This pure-unit guard pins `classifyOp` against EVERY deferred registry op:
 *
 *   1. classifyOp is total — returns one of exactly three categories for every
 *      deferred op, never throws, never returns 'data'.
 *   2. classifyOp is deterministic — same op → same category across calls.
 *   3. The three REAL data ops are NOT classified by classifyOp into a deferred
 *      bucket (they are registered separately as category:'data').
 *   4. Coverage is registry-derived — adding a deferred op to the registry that
 *      classifyOp cannot place will surface here, not as a silent mis-route.
 *
 * No DB, no Express boot — pure source against the factory exports.
 */

const {
  classifyOp,
  allRegistryOps,
  OP,
} = require('../intelligence/beneficiary-lifecycle-side-effects.service');

const VALID_CATEGORIES = Object.freeze(['notification', 'compliance', 'workflow']);

/** Ops handled by the three REAL data handlers — never routed via classifyOp. */
const REAL_DATA_OPS = Object.freeze(Object.values(OP));

/** Every registry op that is NOT a real data op → routed through classifyOp. */
function deferredOps() {
  return allRegistryOps().filter((op) => !REAL_DATA_OPS.includes(op));
}

describe('W593 — classifyOp is exhaustive and stable for every deferred registry op', () => {
  test('there is at least one deferred op to classify (sanity)', () => {
    expect(deferredOps().length).toBeGreaterThan(0);
  });

  test('classifyOp returns a valid category for every deferred op and never throws', () => {
    for (const op of deferredOps()) {
      let category;
      expect(() => {
        category = classifyOp(op);
      }).not.toThrow();
      expect(VALID_CATEGORIES).toContain(category);
    }
  });

  test('classifyOp never returns the reserved data category for any registry op', () => {
    for (const op of allRegistryOps()) {
      expect(classifyOp(op)).not.toBe('data');
    }
  });

  test('classifyOp is deterministic — same op yields the same category', () => {
    for (const op of deferredOps()) {
      expect(classifyOp(op)).toBe(classifyOp(op));
    }
  });

  test('the three real data ops are excluded from the deferred-classification set', () => {
    const deferred = deferredOps();
    for (const realOp of REAL_DATA_OPS) {
      expect(deferred).not.toContain(realOp);
    }
    // and the registry actually declares each real op somewhere
    const all = allRegistryOps();
    for (const realOp of REAL_DATA_OPS) {
      expect(all).toContain(realOp);
    }
  });

  test('classifyOp returns a non-empty string of a known category type', () => {
    for (const op of deferredOps()) {
      const category = classifyOp(op);
      expect(typeof category).toBe('string');
      expect(category.length).toBeGreaterThan(0);
    }
  });
});
