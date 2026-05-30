'use strict';

/**
 * beneficiary-lifecycle-side-effect-payload-wave586.test.js — Wave 586.
 *
 * Wave 583 wired registry-complete side-effect handlers; the deferred ones
 * (notification / compliance / workflow) emit a structured
 * `beneficiary.lifecycle.side_effect` event so existing infra can pick them up.
 *
 * This wave ENRICHES that event payload with branch + actor attribution so the
 * downstream consumer can:
 *   • route the event by branch (W269 tenant-isolation doctrine) without
 *     re-querying the transition log, and
 *   • attribute the action to a user.
 *
 * The actor is reduced to `{ userId, role }` only — never the full actor object
 * — so no token / PII material leaks onto the event bus.
 *
 * These tests lock the enriched payload shape so a future refactor cannot
 * silently drop the branch/actor fields or start leaking the whole actor.
 */

const {
  createBeneficiaryLifecycleSideEffectHandlers,
  classifyOp,
  allRegistryOps,
} = require('../intelligence/beneficiary-lifecycle-side-effects.service');

const FIXED_NOW = new Date('2026-06-01T00:00:00.000Z');

/** Pick any deferred (non-data) op straight from the registry. */
function firstDeferredOp() {
  const op = allRegistryOps().find((o) => classifyOp(o) !== 'data');
  // classifyOp never returns 'data' (the two real handlers are registered
  // separately), so the first registry op that is NOT one of the three real
  // data ops is deferred.
  const REAL = new Set(['end-active-schedules', 'close-open-episodes', 'release-care-team']);
  return op && !REAL.has(op) ? op : allRegistryOps().find((o) => !REAL.has(o));
}

function buildHandlers() {
  const events = [];
  const handlers = createBeneficiaryLifecycleSideEffectHandlers({
    eventSink: (name, payload) => events.push({ name, payload }),
    now: () => FIXED_NOW,
  });
  return { handlers, events };
}

const FULL_CTX = Object.freeze({
  beneficiaryId: 'ben-586',
  sourceBranchId: 'branch-src',
  destinationBranchId: 'branch-dst',
  transitionId: 'discharge',
  fromState: 'active',
  toState: 'discharged',
  correlationId: 'corr-586',
  actor: { userId: 'clinician-9', role: 'clinical_lead', token: 'SECRET', email: 'x@y.z' },
});

describe('W586 deferred side-effect payload — branch + actor attribution', () => {
  test('payload carries source + destination branch ids', async () => {
    const { handlers, events } = buildHandlers();
    const op = firstDeferredOp();
    await handlers[op](FULL_CTX);
    expect(events).toHaveLength(1);
    expect(events[0].payload.sourceBranchId).toBe('branch-src');
    expect(events[0].payload.destinationBranchId).toBe('branch-dst');
  });

  test('actor is reduced to { userId, role } ONLY — never leaks token/email', async () => {
    const { handlers, events } = buildHandlers();
    const op = firstDeferredOp();
    await handlers[op](FULL_CTX);
    expect(events[0].payload.actor).toEqual({ userId: 'clinician-9', role: 'clinical_lead' });
    expect(Object.keys(events[0].payload.actor).sort()).toEqual(['role', 'userId']);
    expect(events[0].payload.actor).not.toHaveProperty('token');
    expect(events[0].payload.actor).not.toHaveProperty('email');
  });

  test('payload retains the pre-existing context fields', async () => {
    const { handlers, events } = buildHandlers();
    const op = firstDeferredOp();
    await handlers[op](FULL_CTX);
    expect(events[0].payload).toMatchObject({
      op,
      beneficiaryId: 'ben-586',
      transitionId: 'discharge',
      fromState: 'active',
      toState: 'discharged',
      correlationId: 'corr-586',
      at: FIXED_NOW.toISOString(),
    });
  });

  test('missing branch / actor degrade to null (no throw)', async () => {
    const { handlers, events } = buildHandlers();
    const op = firstDeferredOp();
    await handlers[op]({ beneficiaryId: 'ben-586', transitionId: 'discharge' });
    expect(events[0].payload.sourceBranchId).toBeNull();
    expect(events[0].payload.destinationBranchId).toBeNull();
    expect(events[0].payload.actor).toBeNull();
  });

  test('partial actor keeps present field, nulls the absent one', async () => {
    const { handlers, events } = buildHandlers();
    const op = firstDeferredOp();
    await handlers[op]({ beneficiaryId: 'ben-586', actor: { userId: 'u1' } });
    expect(events[0].payload.actor).toEqual({ userId: 'u1', role: null });
  });

  test('branch ids are coerced to strings (ObjectId-safe)', async () => {
    const { handlers, events } = buildHandlers();
    const op = firstDeferredOp();
    const objIdish = { toString: () => 'branch-obj' };
    await handlers[op]({
      beneficiaryId: 'ben-586',
      sourceBranchId: objIdish,
      destinationBranchId: objIdish,
    });
    expect(events[0].payload.sourceBranchId).toBe('branch-obj');
    expect(events[0].payload.destinationBranchId).toBe('branch-obj');
  });
});
