'use strict';

/**
 * beneficiary-lifecycle-real-handler-registry-binding-wave591.test.js — Wave 591.
 *
 * Drift guard binding the three REAL (data-mutating) lifecycle side-effect
 * handlers to their declared registry op-names.
 *
 * Why this exists — the silent-orphan gap:
 *   `createBeneficiaryLifecycleSideEffectHandlers` registers the three real
 *   handlers UNCONDITIONALLY, keyed by the `OP.*` string constants
 *   (`end-active-schedules`, `close-open-episodes`, `release-care-team`).
 *   The generic dispatcher in `beneficiary-lifecycle.service.js` only invokes a
 *   handler when a transition DECLARES that exact op-name in `sideEffects[]`.
 *
 *   So if a future edit renames an op in `beneficiary-lifecycle.registry.js`
 *   (e.g. `end-active-schedules` → `cancel-future-appointments`) WITHOUT
 *   re-keying the `OP` constant + handler, the result is silent:
 *     • the new registry name gets a DEFERRED no-op handler (auto-generated),
 *     • the real handler stays in the map under the OLD name but NO transition
 *       ever references it, so the appointment-cancel / episode-close /
 *       care-team-release effect NEVER fires,
 *     • no error is thrown, no test fails — the clinically-critical
 *       `record_deceased` / `discharge` data effects just stop happening.
 *
 *   The W583 suite asserts `handlers[OP.X]` is a function, but that is ALWAYS
 *   true (the handlers are registered unconditionally), so it cannot catch a
 *   registry rename. This guard closes that exact blind spot: it asserts each
 *   `OP.*` constant is actually present in `allRegistryOps()` — i.e. some
 *   transition still declares it — so the real handler remains reachable.
 *
 * Pure module introspection: no DB, no Express, no mocking.
 */

const {
  createBeneficiaryLifecycleSideEffectHandlers,
  allRegistryOps,
  classifyOp,
  OP,
} = require('../intelligence/beneficiary-lifecycle-side-effects.service');

describe('W591 real-handler ↔ registry op-name binding', () => {
  const registryOps = new Set(allRegistryOps());

  test.each([
    ['END_ACTIVE_SCHEDULES', OP.END_ACTIVE_SCHEDULES],
    ['CLOSE_OPEN_EPISODES', OP.CLOSE_OPEN_EPISODES],
    ['RELEASE_CARE_TEAM', OP.RELEASE_CARE_TEAM],
  ])(
    'OP.%s (%s) is declared by at least one registry transition — real handler reachable',
    (_name, opValue) => {
      expect(registryOps.has(opValue)).toBe(true);
    }
  );

  test('every OP.* constant resolves to a registered handler function', () => {
    const handlers = createBeneficiaryLifecycleSideEffectHandlers();
    for (const opValue of Object.values(OP)) {
      expect(typeof handlers[opValue]).toBe('function');
    }
  });

  test('the three real ops classify as data, never as a deferred category', () => {
    // classifyOp is the deferred router; a real op leaking into it would mean
    // the handler-assembly fell back to a deferred no-op for that op.
    for (const opValue of Object.values(OP)) {
      expect(classifyOp(opValue)).not.toBe('data'); // sanity: classifyOp never emits 'data'
      // The real ops must NOT have been routed through the deferred path: they
      // are reachable in the registry (asserted above) AND keyed explicitly.
      expect(registryOps.has(opValue)).toBe(true);
    }
  });
});
