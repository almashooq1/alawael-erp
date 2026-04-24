/**
 * red-flag-state-store.test.js — Beneficiary-360 Commit 3b + 6.
 *
 * Runs the shared state-store contract suite against the in-memory
 * implementation. The Mongo-backed implementation (Commit 6) runs
 * the exact same suite from its own file — proving the two adapters
 * honor identical transition semantics.
 *
 * Tests exclusive to the in-memory implementation (construction
 * guardrails, frozen-return shape, copy-on-read guarantees) live
 * below the contract block.
 */

'use strict';

const { createStateStore } = require('../services/redFlagStateStore');
const {
  describeStoreContract,
  makeRegistry,
  flag,
  verdict,
} = require('./helpers/red-flag-store-contract');

// ─── Shared contract ────────────────────────────────────────────

describeStoreContract({
  name: 'in-memory',
  // Synchronous factory — the contract suite's await tolerates both
  // promise and plain return values.
  createStore: registry => createStateStore({ registry }),
});

// ─── In-memory-specific invariants ──────────────────────────────

describe('createStateStore — in-memory specifics', () => {
  describe('construction', () => {
    it('throws when registry has no byId()', () => {
      expect(() => createStateStore({ registry: {} })).toThrow(/byId/);
    });

    it('returns a frozen instance', () => {
      const store = createStateStore({ registry: makeRegistry([]) });
      expect(Object.isFrozen(store)).toBe(true);
    });

    it('keeps state per-instance (no global leak)', () => {
      const reg = makeRegistry([flag({ id: 'test.a' })]);
      const a = createStateStore({ registry: reg });
      const b = createStateStore({ registry: reg });
      a.applyVerdicts('BEN-1', [verdict('test.a', 'raised')]);
      expect(a.getActiveState('BEN-1', 'test.a')).toBeTruthy();
      expect(b.getActiveState('BEN-1', 'test.a')).toBeNull();
    });
  });

  describe('copy-on-read', () => {
    it('getAllActive returns copies — callers cannot mutate internal state', () => {
      const reg = makeRegistry([flag({ id: 'clinical.a' })]);
      const store = createStateStore({ registry: reg });
      store.applyVerdicts('BEN-1', [verdict('clinical.a', 'raised')], {
        now: '2026-04-22T10:00:00.000Z',
      });
      const snapshot = store.getAllActive('BEN-1');
      snapshot[0].observedValue = 999;
      expect(store.getActiveState('BEN-1', 'clinical.a').observedValue).not.toBe(999);
    });
  });

  describe('clear', () => {
    it('empties both active and cooldown state', () => {
      const reg = makeRegistry([flag({ id: 'clinical.test' })]);
      const store = createStateStore({ registry: reg });
      store.applyVerdicts('BEN-1', [verdict('clinical.test', 'raised')], {
        now: '2026-04-22T10:00:00.000Z',
      });
      store.applyVerdicts('BEN-1', [verdict('clinical.test', 'clear')], {
        now: '2026-04-22T11:00:00.000Z',
      });
      store.clear();
      expect(store.getActiveState('BEN-1', 'clinical.test')).toBeNull();
      expect(store.getCooldown('BEN-1', 'clinical.test')).toBeNull();
    });
  });
});
