'use strict';
/**
 * plan-review-ack-audit.test.js — Wave 295
 *
 * Unit tests for the hash-chained audit log: append + verify + tamper
 * detection. Uses an in-memory model stub so tests are deterministic
 * and isolated from mongoose.
 */

const {
  PlanReviewAckAuditService,
  canonicalize,
  stableStringify,
} = require('../services/plan-review-ack-audit.service');

function makeInMemoryModel() {
  const rows = [];
  let nextId = 1;
  return {
    _rows: rows,
    findOne(filter) {
      let result = null;
      // sort/select/lean chain mimicking mongoose
      return {
        sort: order => ({
          select: () => ({
            lean: async () => {
              const matched = rows.filter(
                r => String(r.planReviewId) === String(filter.planReviewId)
              );
              if (!matched.length) return null;
              if (order && order.occurredAt === -1) {
                matched.sort((a, b) => b.occurredAt - a.occurredAt);
              } else {
                matched.sort((a, b) => a.occurredAt - b.occurredAt);
              }
              result = matched[0];
              return result;
            },
          }),
        }),
      };
    },
    find(filter) {
      return {
        sort: order => ({
          select: () => ({
            lean: async () => {
              const matched = rows.filter(
                r => String(r.planReviewId) === String(filter.planReviewId)
              );
              matched.sort((a, b) =>
                order && order.occurredAt === -1
                  ? b.occurredAt - a.occurredAt
                  : a.occurredAt - b.occurredAt
              );
              return matched;
            },
          }),
        }),
      };
    },
    create: async doc => {
      const out = { _id: 'ack-' + nextId++, ...doc };
      rows.push(out);
      return out;
    },
  };
}

describe('W295 — stableStringify / canonicalize', () => {
  test('stableStringify is key-order independent', () => {
    expect(stableStringify({ b: 2, a: 1 })).toBe(stableStringify({ a: 1, b: 2 }));
  });
  test('canonicalize produces stable string for same logical entry', () => {
    const at = new Date('2026-05-23T12:00:00Z');
    const a = canonicalize({
      action: 'ACK',
      level: null,
      planReviewId: 'pr1',
      beneficiaryId: 'b1',
      actorUserId: 'u1',
      occurredAt: at,
      payload: { x: 1, y: 2 },
    });
    const b = canonicalize({
      action: 'ACK',
      level: null,
      planReviewId: 'pr1',
      beneficiaryId: 'b1',
      actorUserId: 'u1',
      occurredAt: at,
      payload: { y: 2, x: 1 },
    });
    expect(a).toBe(b);
  });
});

describe('W295 — PlanReviewAckAuditService.append + verify', () => {
  test('genesis entry: priorHash null, currentHash present', async () => {
    const Model = makeInMemoryModel();
    const svc = new PlanReviewAckAuditService({ PlanReviewAckModel: Model });
    const r = await svc.recordTriggered({
      planReviewId: 'pr1',
      beneficiaryId: 'b1',
      payload: { sweepRunId: 'sweep-1' },
    });
    expect(r.ok).toBe(true);
    expect(Model._rows).toHaveLength(1);
    expect(Model._rows[0].priorHash).toBeNull();
    expect(typeof Model._rows[0].currentHash).toBe('string');
    expect(Model._rows[0].currentHash).toMatch(/^[0-9a-f]{64}$/);
  });

  test('second entry chains: priorHash = first.currentHash', async () => {
    const Model = makeInMemoryModel();
    const svc = new PlanReviewAckAuditService({ PlanReviewAckModel: Model });
    const t0 = new Date('2026-05-23T10:00:00Z');
    const t1 = new Date('2026-05-23T11:00:00Z');
    await svc.recordTriggered({
      planReviewId: 'pr1',
      beneficiaryId: 'b1',
      now: t0,
      payload: {},
    });
    await svc.recordAck({
      planReviewId: 'pr1',
      beneficiaryId: 'b1',
      actorUserId: 'u9',
      now: t1,
    });
    expect(Model._rows).toHaveLength(2);
    expect(Model._rows[1].priorHash).toBe(Model._rows[0].currentHash);
  });

  test('verify returns ok on intact chain', async () => {
    const Model = makeInMemoryModel();
    const svc = new PlanReviewAckAuditService({ PlanReviewAckModel: Model });
    await svc.recordTriggered({
      planReviewId: 'pr1',
      beneficiaryId: 'b1',
      now: new Date(1000),
      payload: {},
    });
    await svc.recordSlaEscalation({
      planReviewId: 'pr1',
      beneficiaryId: 'b1',
      level: 1,
      now: new Date(2000),
      payload: {},
    });
    await svc.recordSlaEscalation({
      planReviewId: 'pr1',
      beneficiaryId: 'b1',
      level: 2,
      now: new Date(3000),
      payload: {},
    });
    await svc.recordAck({
      planReviewId: 'pr1',
      beneficiaryId: 'b1',
      actorUserId: 'u1',
      now: new Date(4000),
    });
    const v = await svc.verify({ planReviewId: 'pr1' });
    expect(v.ok).toBe(true);
    expect(v.chainLength).toBe(4);
  });

  test('verify detects payload tampering (currentHash mismatch)', async () => {
    const Model = makeInMemoryModel();
    const svc = new PlanReviewAckAuditService({ PlanReviewAckModel: Model });
    await svc.recordTriggered({
      planReviewId: 'pr1',
      beneficiaryId: 'b1',
      now: new Date(1000),
      payload: { sweepRunId: 'a' },
    });
    await svc.recordAck({
      planReviewId: 'pr1',
      beneficiaryId: 'b1',
      actorUserId: 'u1',
      now: new Date(2000),
    });
    // Tamper: change payload on entry 0 without recomputing hash.
    Model._rows[0].payload = { sweepRunId: 'TAMPERED' };
    const v = await svc.verify({ planReviewId: 'pr1' });
    expect(v.ok).toBe(false);
    expect(v.brokenAt).toBe(0);
    expect(v.reason).toBe('CURRENT_HASH_MISMATCH');
  });

  test('verify detects prior-hash break (entry deleted in the middle)', async () => {
    const Model = makeInMemoryModel();
    const svc = new PlanReviewAckAuditService({ PlanReviewAckModel: Model });
    await svc.recordTriggered({
      planReviewId: 'pr1',
      beneficiaryId: 'b1',
      now: new Date(1000),
      payload: {},
    });
    await svc.recordSlaEscalation({
      planReviewId: 'pr1',
      beneficiaryId: 'b1',
      level: 1,
      now: new Date(2000),
      payload: {},
    });
    await svc.recordAck({
      planReviewId: 'pr1',
      beneficiaryId: 'b1',
      actorUserId: 'u1',
      now: new Date(3000),
    });
    // Remove the middle entry.
    Model._rows.splice(1, 1);
    const v = await svc.verify({ planReviewId: 'pr1' });
    expect(v.ok).toBe(false);
    expect(v.brokenAt).toBe(1);
    expect(v.reason).toBe('PRIOR_HASH_MISMATCH');
  });

  test('append rejects missing args', async () => {
    const Model = makeInMemoryModel();
    const svc = new PlanReviewAckAuditService({ PlanReviewAckModel: Model });
    expect((await svc.recordAck({ beneficiaryId: 'b1', actorUserId: 'u1' })).reason).toBe(
      'PLAN_REVIEW_REQUIRED'
    );
    expect((await svc.recordAck({ planReviewId: 'pr1', actorUserId: 'u1' })).reason).toBe(
      'BENEFICIARY_REQUIRED'
    );
  });

  test('constructor throws without Model', () => {
    expect(() => new PlanReviewAckAuditService({})).toThrow(/PlanReviewAckModel required/);
  });

  test('verify of unknown review → ok with chainLength 0', async () => {
    const Model = makeInMemoryModel();
    const svc = new PlanReviewAckAuditService({ PlanReviewAckModel: Model });
    const v = await svc.verify({ planReviewId: 'missing' });
    expect(v.ok).toBe(true);
    expect(v.chainLength).toBe(0);
  });
});
