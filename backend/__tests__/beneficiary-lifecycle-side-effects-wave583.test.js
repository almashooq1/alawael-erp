'use strict';

/**
 * beneficiary-lifecycle-side-effects-wave583.test.js
 *
 * Drift guard + behavioural test for the Wave-583 lifecycle side-effect
 * handler factory. Closes the silent-no-op gap where the production bootstrap
 * injected `sideEffectHandlers: {}`.
 *
 * Guarantees:
 *   1. Registry-completeness — every op declared in any registry transition's
 *      `sideEffects` has a wired handler (no 'no handler wired' skips possible).
 *   2. The two real data handlers mutate the right collection with the right
 *      filter, normalize Mongoose write results, and self-skip when their
 *      model is unavailable.
 *   3. Deferred handlers emit a categorized event and return `{ deferred:true }`.
 *   4. `classifyOp` routes notification / compliance / workflow ops correctly.
 */

const reg = require('../intelligence/beneficiary-lifecycle.registry');
const {
  createBeneficiaryLifecycleSideEffectHandlers,
  classifyOp,
  allRegistryOps,
  OP,
} = require('../intelligence/beneficiary-lifecycle-side-effects.service');

/** Collect every distinct side-effect or compensating op straight from the registry. */
function registryOpSet() {
  const set = new Set();
  for (const t of reg.TRANSITIONS) {
    for (const op of t.sideEffects || []) set.add(op);
    for (const op of t.compensatingOps || []) set.add(op);
  }
  return set;
}

describe('W583 beneficiary lifecycle side-effects — registry completeness', () => {
  test('every registry side-effect op has a wired handler', () => {
    const handlers = createBeneficiaryLifecycleSideEffectHandlers();
    const ops = registryOpSet();
    expect(ops.size).toBeGreaterThan(0);
    for (const op of ops) {
      expect(typeof handlers[op]).toBe('function');
    }
  });

  test('allRegistryOps() matches the registry exactly', () => {
    const fromHelper = new Set(allRegistryOps());
    const fromRegistry = registryOpSet();
    expect(fromHelper).toEqual(fromRegistry);
  });

  test('the three critical discharge/record_deceased data ops are covered', () => {
    const handlers = createBeneficiaryLifecycleSideEffectHandlers();
    expect(typeof handlers[OP.END_ACTIVE_SCHEDULES]).toBe('function');
    expect(typeof handlers[OP.CLOSE_OPEN_EPISODES]).toBe('function');
    expect(typeof handlers[OP.RELEASE_CARE_TEAM]).toBe('function');
  });
});

describe('W583 classifyOp', () => {
  test('notification ops', () => {
    expect(classifyOp('notify-family-condolence')).toBe('notification');
    expect(classifyOp('notify-team')).toBe('notification');
    expect(classifyOp('family-receipt-of-erasure')).toBe('notification');
  });
  test('compliance ops', () => {
    expect(classifyOp('anchor-deletion-certificate')).toBe('compliance');
    expect(classifyOp('notify-nphies-void')).toBe('notification'); // notify- wins first
    expect(classifyOp('soft-delete-30d')).toBe('compliance');
    expect(classifyOp('run-retention-check')).toBe('compliance');
    expect(classifyOp('queue-dpo-review')).toBe('compliance');
  });
  test('workflow ops', () => {
    expect(classifyOp('create-care-team')).toBe('workflow');
    expect(classifyOp('freeze-record')).toBe('workflow');
    expect(classifyOp('cut-over-atomic')).toBe('workflow');
  });
});

describe('W583 end-active-schedules handler', () => {
  test('cancels future appointments with the right filter', async () => {
    const calls = [];
    const appointmentModel = {
      updateMany: jest.fn(async (filter, update) => {
        calls.push({ filter, update });
        return { modifiedCount: 3 };
      }),
    };
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({
      appointmentModel,
      now: () => new Date('2026-01-01T00:00:00.000Z'),
    });
    const res = await handlers[OP.END_ACTIVE_SCHEDULES]({
      beneficiaryId: 'b1',
      toState: 'deceased',
    });
    expect(res).toEqual({
      name: 'end-active-schedules',
      category: 'data',
      cancelledAppointments: 3,
    });
    const { filter, update } = calls[0];
    expect(filter.beneficiary).toBe('b1');
    expect(filter.status.$in).toEqual(
      expect.arrayContaining(['PENDING', 'CONFIRMED', 'CHECKED_IN', 'RESCHEDULED'])
    );
    expect(filter.date.$gte).toEqual(new Date('2026-01-01T00:00:00.000Z'));
    expect(update[0].$set.status).toBe('CANCELLED');
  });

  test('normalizes legacy nModified write result', async () => {
    const appointmentModel = { updateMany: async () => ({ nModified: 2 }) };
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({ appointmentModel });
    const res = await handlers[OP.END_ACTIVE_SCHEDULES]({ beneficiaryId: 'b1' });
    expect(res.cancelledAppointments).toBe(2);
  });

  test('self-skips when appointment model unavailable', async () => {
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({ appointmentModel: null });
    const res = await handlers[OP.END_ACTIVE_SCHEDULES]({ beneficiaryId: 'b1' });
    expect(res.skipped).toBe(true);
    expect(res.reason).toBe('appointment-model-unavailable');
  });
});

describe('W583 close-open-episodes handler', () => {
  test('closes open episodes and maps deceased → medical_reason', async () => {
    const calls = [];
    const episodeModel = {
      updateMany: jest.fn(async (filter, update) => {
        calls.push({ filter, update });
        return { modifiedCount: 1 };
      }),
    };
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({
      episodeModel,
      now: () => new Date('2026-02-02T00:00:00.000Z'),
    });
    const res = await handlers[OP.CLOSE_OPEN_EPISODES]({
      beneficiaryId: 'b9',
      toState: reg.LIFECYCLE_STATES.DECEASED,
    });
    expect(res).toEqual({
      name: 'close-open-episodes',
      category: 'data',
      closedEpisodes: 1,
    });
    const { filter, update } = calls[0];
    expect(filter.beneficiaryId).toBe('b9');
    expect(filter.status.$in).toEqual(
      expect.arrayContaining(['planned', 'active', 'on_hold', 'suspended'])
    );
    expect(update[0].$set.status).toBe('completed');
    expect(update[0].$set.actualEndDate).toEqual(new Date('2026-02-02T00:00:00.000Z'));
    expect(update[0].$set.dischargeReason).toBe('medical_reason');
  });

  test('non-deceased close maps to a valid enum reason (other)', async () => {
    const calls = [];
    const episodeModel = {
      updateMany: async (filter, update) => {
        calls.push({ update });
        return { modifiedCount: 0 };
      },
    };
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({ episodeModel });
    await handlers[OP.CLOSE_OPEN_EPISODES]({ beneficiaryId: 'b9', toState: 'discharged' });
    expect(calls[0].update[0].$set.dischargeReason).toBe('other');
  });

  test('self-skips when episode model unavailable', async () => {
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({ episodeModel: null });
    const res = await handlers[OP.CLOSE_OPEN_EPISODES]({ beneficiaryId: 'b1' });
    expect(res.skipped).toBe(true);
    expect(res.reason).toBe('episode-model-unavailable');
  });
});

describe('W584 release-care-team handler', () => {
  test('deactivates active team members via positional arrayFilter', async () => {
    const calls = [];
    const episodeModel = {
      updateMany: jest.fn(async (filter, update, opts) => {
        calls.push({ filter, update, opts });
        return { modifiedCount: 2 };
      }),
    };
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({
      episodeModel,
      now: () => new Date('2026-03-03T00:00:00.000Z'),
    });
    const res = await handlers[OP.RELEASE_CARE_TEAM]({
      beneficiaryId: 'b7',
      toState: 'discharged',
    });
    expect(res).toEqual({
      name: 'release-care-team',
      category: 'data',
      releasedFromEpisodes: 2,
    });
    const { filter, update, opts } = calls[0];
    expect(filter.beneficiaryId).toBe('b7');
    expect(filter['careTeam.isActive']).toBe(true);
    expect(update.$set['careTeam.$[m].isActive']).toBe(false);
    expect(update.$set['careTeam.$[m].removedAt']).toEqual(new Date('2026-03-03T00:00:00.000Z'));
    expect(opts.arrayFilters).toEqual([{ 'm.isActive': true }]);
  });

  test('release-care-team is a REAL data handler, not deferred', async () => {
    const episodeModel = { updateMany: async () => ({ nModified: 0 }) };
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({ episodeModel });
    const res = await handlers[OP.RELEASE_CARE_TEAM]({ beneficiaryId: 'b1' });
    expect(res.deferred).toBeUndefined();
    expect(res.category).toBe('data');
    expect(res.releasedFromEpisodes).toBe(0);
  });

  test('self-skips when episode model unavailable', async () => {
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({ episodeModel: null });
    const res = await handlers[OP.RELEASE_CARE_TEAM]({ beneficiaryId: 'b1' });
    expect(res.skipped).toBe(true);
    expect(res.reason).toBe('episode-model-unavailable');
  });
});

describe('W583 deferred handlers', () => {
  test('emit a categorized event and return deferred:true', async () => {
    const events = [];
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({
      eventSink: (name, payload) => events.push({ name, payload }),
    });
    const res = await handlers['generate-closure-report']({
      beneficiaryId: 'b1',
      transitionId: 'record_deceased',
      fromState: 'active',
      toState: 'deceased',
      correlationId: 'corr-1',
    });
    expect(res.deferred).toBe(true);
    expect(res.category).toBe('compliance');
    expect(res.emitted).toBe(true);
    expect(events).toHaveLength(1);
    expect(events[0].name).toBe('beneficiary.lifecycle.side_effect');
    expect(events[0].payload).toMatchObject({
      op: 'generate-closure-report',
      category: 'compliance',
      beneficiaryId: 'b1',
      transitionId: 'record_deceased',
      toState: 'deceased',
    });
  });

  test('deferred handler reports emitted:false when no sink wired', async () => {
    const handlers = createBeneficiaryLifecycleSideEffectHandlers();
    const res = await handlers['queue-dpo-review']({ beneficiaryId: 'b1' });
    expect(res.deferred).toBe(true);
    expect(res.emitted).toBe(false);
    expect(res.category).toBe('compliance');
  });

  test('emit failure is swallowed (handler never throws)', async () => {
    const handlers = createBeneficiaryLifecycleSideEffectHandlers({
      eventSink: () => {
        throw new Error('sink down');
      },
      logger: { warn: () => {}, info: () => {} },
    });
    const res = await handlers['freeze-record']({ beneficiaryId: 'b1' });
    expect(res.deferred).toBe(true);
    expect(res.emitted).toBe(false);
  });
});
