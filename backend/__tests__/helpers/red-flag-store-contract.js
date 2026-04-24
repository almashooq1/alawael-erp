/**
 * red-flag-store-contract.js — shared test suite for any object
 * implementing the redFlagStateStore contract.
 *
 * The in-memory store (Commit 3b) and the Mongoose-backed store
 * (Commit 6) BOTH satisfy the same contract: the same method
 * signatures, the same transition semantics, the same cooldown and
 * autoResolve policies. Instead of duplicating 25 Jest assertions
 * across two files, they share this one.
 *
 * Usage:
 *
 *   // inside a test file
 *   const { describeStoreContract } = require('./helpers/red-flag-store-contract');
 *
 *   describeStoreContract({
 *     name: 'in-memory',
 *     createStore: async (registry) => createStateStore({ registry }),
 *     beforeEachHook: () => {},
 *     afterEachHook: () => {},
 *   });
 *
 * The `createStore` factory receives a fixture registry (built by
 * `makeRegistry`) and must return a ready-to-use store instance.
 * Async is supported so a Mongo-backed factory can `await` a
 * connection handshake if needed.
 *
 * `beforeEachHook` / `afterEachHook` are optional — the Mongo
 * adapter uses them to wipe its collections between cases. The
 * in-memory adapter calls `store.clear()` internally, so it needs
 * no hooks.
 */

'use strict';

// ─── Fixture registry builder ───────────────────────────────────

function makeRegistry(entries) {
  const byIdMap = new Map();
  for (const e of entries) byIdMap.set(e.id, e);
  return {
    byId: id => byIdMap.get(id) || null,
    RED_FLAGS: entries,
  };
}

function flag(overrides = {}) {
  return {
    id: overrides.id || 'test.basic',
    domain: overrides.domain || 'clinical',
    severity: overrides.severity || 'warning',
    autoResolve:
      overrides.autoResolve === undefined
        ? { type: 'condition_cleared', afterHours: null }
        : overrides.autoResolve,
    cooldownHours: overrides.cooldownHours ?? 24,
    response: {
      blocking: overrides.blocking || false,
      ...overrides.response,
    },
  };
}

function verdict(flagId, kind, observedValue = 1, evaluatedAt = '2026-04-22T10:00:00.000Z') {
  return { flagId, kind, observedValue, evaluatedAt, raised: kind === 'raised' };
}

// ─── The contract suite ─────────────────────────────────────────

function describeStoreContract({ name, createStore, beforeEachHook, afterEachHook }) {
  describe(`Red-flag state store contract — ${name}`, () => {
    let currentStore;

    beforeEach(async () => {
      if (beforeEachHook) await beforeEachHook();
    });

    afterEach(async () => {
      if (currentStore && typeof currentStore.clear === 'function') {
        await currentStore.clear();
      }
      currentStore = null;
      if (afterEachHook) await afterEachHook();
    });

    async function build(entries) {
      const registry = makeRegistry(entries);
      currentStore = await createStore(registry);
      return currentStore;
    }

    // ─── Primary transitions ─────────────────────────────────────

    describe('primary transitions', () => {
      it('first raised verdict produces newlyRaised + stores active state', async () => {
        const store = await build([flag({ id: 'clinical.test' })]);
        const t = await store.applyVerdicts('BEN-1', [verdict('clinical.test', 'raised', 55)], {
          now: '2026-04-22T10:00:00.000Z',
        });
        expect(t.newlyRaised).toHaveLength(1);
        expect(t.newlyRaised[0]).toMatchObject({
          beneficiaryId: 'BEN-1',
          flagId: 'clinical.test',
          severity: 'warning',
          domain: 'clinical',
          raisedAt: '2026-04-22T10:00:00.000Z',
          observedValue: 55,
        });
        const active = await store.getActiveState('BEN-1', 'clinical.test');
        expect(active).toBeTruthy();
      });

      it('second raised verdict on active flag is stillRaised (dedup)', async () => {
        const store = await build([flag({ id: 'clinical.test' })]);
        await store.applyVerdicts('BEN-1', [verdict('clinical.test', 'raised', 55)], {
          now: '2026-04-22T10:00:00.000Z',
        });
        const t = await store.applyVerdicts('BEN-1', [verdict('clinical.test', 'raised', 42)], {
          now: '2026-04-22T11:00:00.000Z',
        });
        expect(t.newlyRaised).toHaveLength(0);
        expect(t.stillRaised).toHaveLength(1);
        expect(t.stillRaised[0].lastObservedAt).toBe('2026-04-22T11:00:00.000Z');
        expect(t.stillRaised[0].observedValue).toBe(42);
        expect(t.stillRaised[0].raisedAt).toBe('2026-04-22T10:00:00.000Z');
      });

      it('clear verdict on active flag with condition_cleared autoResolve produces newlyResolved + opens cooldown', async () => {
        const store = await build([
          flag({
            id: 'clinical.test',
            autoResolve: { type: 'condition_cleared', afterHours: null },
            cooldownHours: 48,
          }),
        ]);
        await store.applyVerdicts('BEN-1', [verdict('clinical.test', 'raised', 55)], {
          now: '2026-04-22T10:00:00.000Z',
        });
        const t = await store.applyVerdicts('BEN-1', [verdict('clinical.test', 'clear', 80)], {
          now: '2026-04-23T10:00:00.000Z',
        });
        expect(t.newlyResolved).toHaveLength(1);
        expect(t.newlyResolved[0]).toMatchObject({
          resolvedAt: '2026-04-23T10:00:00.000Z',
          resolvedBy: 'auto',
          cooldownUntil: '2026-04-25T10:00:00.000Z',
        });
        expect(await store.getActiveState('BEN-1', 'clinical.test')).toBeNull();
        const cd = await store.getCooldown('BEN-1', 'clinical.test');
        expect(cd.cooldownUntil).toBe('2026-04-25T10:00:00.000Z');
      });

      it('clear verdict with no prior active is stillClear (no noise)', async () => {
        const store = await build([flag({ id: 'clinical.test' })]);
        const t = await store.applyVerdicts('BEN-1', [verdict('clinical.test', 'clear', 92)], {
          now: '2026-04-22T10:00:00.000Z',
        });
        expect(t.stillClear).toHaveLength(1);
        expect(t.newlyResolved).toHaveLength(0);
      });
    });

    // ─── autoResolve: null (manual only) ─────────────────────────

    describe('autoResolve: null (manual-only)', () => {
      it('clear verdict on active flag keeps it active (manual close required)', async () => {
        const store = await build([
          flag({ id: 'safety.test', autoResolve: null, cooldownHours: 0 }),
        ]);
        await store.applyVerdicts('BEN-1', [verdict('safety.test', 'raised', 1)], {
          now: '2026-04-22T10:00:00.000Z',
        });
        const t = await store.applyVerdicts('BEN-1', [verdict('safety.test', 'clear', 0)], {
          now: '2026-04-22T11:00:00.000Z',
        });
        expect(t.newlyResolved).toHaveLength(0);
        expect(t.stillRaised).toHaveLength(1);
        expect(await store.getActiveState('BEN-1', 'safety.test')).toBeTruthy();
      });
    });

    // ─── autoResolve: timer ──────────────────────────────────────

    describe('autoResolve: timer', () => {
      const policy = { type: 'timer', afterHours: 24 };

      it('clear before elapsed interval keeps flag active', async () => {
        const store = await build([
          flag({ id: 'test.timer', autoResolve: policy, cooldownHours: 12 }),
        ]);
        await store.applyVerdicts('BEN-1', [verdict('test.timer', 'raised')], {
          now: '2026-04-22T10:00:00.000Z',
        });
        const t = await store.applyVerdicts('BEN-1', [verdict('test.timer', 'clear')], {
          now: '2026-04-22T15:00:00.000Z',
        });
        expect(t.newlyResolved).toHaveLength(0);
        expect(t.stillRaised).toHaveLength(1);
      });

      it('clear after elapsed interval closes the flag with resolvedBy timer', async () => {
        const store = await build([
          flag({ id: 'test.timer', autoResolve: policy, cooldownHours: 12 }),
        ]);
        await store.applyVerdicts('BEN-1', [verdict('test.timer', 'raised')], {
          now: '2026-04-22T10:00:00.000Z',
        });
        const t = await store.applyVerdicts('BEN-1', [verdict('test.timer', 'clear')], {
          now: '2026-04-23T10:00:00.000Z',
        });
        expect(t.newlyResolved).toHaveLength(1);
        expect(t.newlyResolved[0].resolvedBy).toBe('timer');
      });
    });

    // ─── Cooldown suppression ────────────────────────────────────

    describe('cooldown suppression', () => {
      it('re-raise within cooldown window is suppressedByCooldown, not newlyRaised', async () => {
        const store = await build([
          flag({
            id: 'family.inactive',
            autoResolve: { type: 'condition_cleared', afterHours: null },
            cooldownHours: 72,
          }),
        ]);
        await store.applyVerdicts('BEN-1', [verdict('family.inactive', 'raised')], {
          now: '2026-04-22T10:00:00.000Z',
        });
        await store.applyVerdicts('BEN-1', [verdict('family.inactive', 'clear')], {
          now: '2026-04-22T12:00:00.000Z',
        });
        const t = await store.applyVerdicts('BEN-1', [verdict('family.inactive', 'raised')], {
          now: '2026-04-23T12:00:00.000Z',
        });
        expect(t.newlyRaised).toHaveLength(0);
        expect(t.suppressedByCooldown).toHaveLength(1);
        expect(t.suppressedByCooldown[0]).toMatchObject({
          flagId: 'family.inactive',
          beneficiaryId: 'BEN-1',
          cooldownUntil: '2026-04-25T12:00:00.000Z',
        });
        expect(await store.getActiveState('BEN-1', 'family.inactive')).toBeNull();
      });

      it('re-raise after cooldown window is newlyRaised again', async () => {
        const store = await build([
          flag({
            id: 'family.inactive',
            autoResolve: { type: 'condition_cleared', afterHours: null },
            cooldownHours: 24,
          }),
        ]);
        await store.applyVerdicts('BEN-1', [verdict('family.inactive', 'raised')], {
          now: '2026-04-22T10:00:00.000Z',
        });
        await store.applyVerdicts('BEN-1', [verdict('family.inactive', 'clear')], {
          now: '2026-04-22T12:00:00.000Z',
        });
        const t = await store.applyVerdicts('BEN-1', [verdict('family.inactive', 'raised')], {
          now: '2026-04-23T13:00:00.000Z',
        });
        expect(t.newlyRaised).toHaveLength(1);
        expect(t.suppressedByCooldown).toHaveLength(0);
      });

      it('cooldownHours: 0 (critical safety flags) never suppresses', async () => {
        const store = await build([
          flag({
            id: 'safety.critical',
            severity: 'critical',
            autoResolve: { type: 'condition_cleared', afterHours: null },
            cooldownHours: 0,
          }),
        ]);
        await store.applyVerdicts('BEN-1', [verdict('safety.critical', 'raised')], {
          now: '2026-04-22T10:00:00.000Z',
        });
        await store.applyVerdicts('BEN-1', [verdict('safety.critical', 'clear')], {
          now: '2026-04-22T10:00:01.000Z',
        });
        const t = await store.applyVerdicts('BEN-1', [verdict('safety.critical', 'raised')], {
          now: '2026-04-22T10:00:02.000Z',
        });
        expect(t.newlyRaised).toHaveLength(1);
        expect(t.suppressedByCooldown).toHaveLength(0);
      });
    });

    // ─── Error passthrough ───────────────────────────────────────

    describe('error verdicts', () => {
      it('passes error verdicts through to errored without touching state', async () => {
        const store = await build([flag({ id: 'clinical.broken' })]);
        const t = await store.applyVerdicts('BEN-1', [
          {
            flagId: 'clinical.broken',
            kind: 'error',
            reason: 'service-error: boom',
            raised: false,
            observedValue: undefined,
            evaluatedAt: '2026-04-22T10:00:00.000Z',
          },
        ]);
        expect(t.errored).toHaveLength(1);
        expect(t.errored[0].reason).toMatch(/service-error/);
        expect(await store.getActiveState('BEN-1', 'clinical.broken')).toBeNull();
      });

      it('records errored with unknown-flag reason when registry has no match', async () => {
        const store = await build([]);
        const t = await store.applyVerdicts('BEN-1', [verdict('ghost.flag', 'raised')]);
        expect(t.errored).toHaveLength(1);
        expect(t.errored[0].reason).toBe('unknown-flag');
      });
    });

    // ─── manualResolve ───────────────────────────────────────────

    describe('manualResolve', () => {
      it('closes an active flag and records resolvedBy + cooldown', async () => {
        const store = await build([flag({ id: 'clinical.test', cooldownHours: 48 })]);
        await store.applyVerdicts('BEN-1', [verdict('clinical.test', 'raised')], {
          now: '2026-04-22T10:00:00.000Z',
        });
        const resolved = await store.manualResolve('BEN-1', 'clinical.test', {
          now: '2026-04-23T10:00:00.000Z',
          resolvedBy: 'dr.ahmed',
          resolution: 'reviewed and cleared in MDT',
        });
        expect(resolved).toMatchObject({
          resolvedAt: '2026-04-23T10:00:00.000Z',
          resolvedBy: 'dr.ahmed',
          resolution: 'reviewed and cleared in MDT',
          cooldownUntil: '2026-04-25T10:00:00.000Z',
        });
        expect(await store.getActiveState('BEN-1', 'clinical.test')).toBeNull();
      });

      it('returns null when no active flag to resolve', async () => {
        const store = await build([flag({ id: 'clinical.test' })]);
        expect(
          await store.manualResolve('BEN-1', 'clinical.test', {
            now: '2026-04-22T10:00:00.000Z',
          })
        ).toBeNull();
      });

      it('default resolvedBy is "manual"', async () => {
        const store = await build([flag({ id: 'clinical.test' })]);
        await store.applyVerdicts('BEN-1', [verdict('clinical.test', 'raised')], {
          now: '2026-04-22T10:00:00.000Z',
        });
        const resolved = await store.manualResolve('BEN-1', 'clinical.test', {
          now: '2026-04-22T11:00:00.000Z',
        });
        expect(resolved.resolvedBy).toBe('manual');
      });

      it('subsequent raise after manualResolve respects the cooldown from the manual close', async () => {
        const store = await build([flag({ id: 'clinical.test', cooldownHours: 12 })]);
        await store.applyVerdicts('BEN-1', [verdict('clinical.test', 'raised')], {
          now: '2026-04-22T10:00:00.000Z',
        });
        await store.manualResolve('BEN-1', 'clinical.test', {
          now: '2026-04-22T11:00:00.000Z',
        });
        const t = await store.applyVerdicts('BEN-1', [verdict('clinical.test', 'raised')], {
          now: '2026-04-22T15:00:00.000Z',
        });
        expect(t.suppressedByCooldown).toHaveLength(1);
        expect(t.newlyRaised).toHaveLength(0);
      });
    });

    // ─── Beneficiary isolation ───────────────────────────────────

    describe('getAllActive — beneficiary isolation', () => {
      it('lists only active flags for the requested beneficiary', async () => {
        const store = await build([flag({ id: 'clinical.a' }), flag({ id: 'clinical.b' })]);
        await store.applyVerdicts(
          'BEN-1',
          [verdict('clinical.a', 'raised'), verdict('clinical.b', 'raised')],
          { now: '2026-04-22T10:00:00.000Z' }
        );
        await store.applyVerdicts('BEN-2', [verdict('clinical.a', 'raised')], {
          now: '2026-04-22T10:00:00.000Z',
        });

        const one = (await store.getAllActive('BEN-1')).map(r => r.flagId).sort();
        const two = (await store.getAllActive('BEN-2')).map(r => r.flagId).sort();
        expect(one).toEqual(['clinical.a', 'clinical.b']);
        expect(two).toEqual(['clinical.a']);
      });
    });

    // ─── Input guardrails ────────────────────────────────────────

    describe('applyVerdicts — input guardrails', () => {
      // Works for both sync-throwing (in-memory) and async-rejecting
      // (Mongo) stores: Promise.resolve().then(thunk) turns a sync
      // throw into a rejected promise.
      const expectRejects = async (thunk, match) => {
        await expect(Promise.resolve().then(thunk)).rejects.toThrow(match);
      };

      it('throws when beneficiaryId is missing', async () => {
        const store = await build([]);
        await expectRejects(() => store.applyVerdicts('', []), /beneficiaryId/);
        await expectRejects(() => store.applyVerdicts(null, []), /beneficiaryId/);
      });

      it('throws when verdicts is not an array', async () => {
        const store = await build([]);
        await expectRejects(() => store.applyVerdicts('BEN-1', null), /array/);
        await expectRejects(() => store.applyVerdicts('BEN-1', 'nope'), /array/);
      });

      it('skips malformed verdict entries silently (safety under partial data)', async () => {
        const store = await build([flag({ id: 'clinical.test' })]);
        const t = await store.applyVerdicts(
          'BEN-1',
          [null, undefined, { no: 'flagId' }, verdict('clinical.test', 'raised')],
          { now: '2026-04-22T10:00:00.000Z' }
        );
        expect(t.newlyRaised).toHaveLength(1);
        expect(t.errored).toHaveLength(0);
      });
    });
  });
}

module.exports = { describeStoreContract, makeRegistry, flag, verdict };
