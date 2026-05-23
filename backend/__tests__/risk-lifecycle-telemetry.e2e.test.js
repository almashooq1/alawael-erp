'use strict';
/**
 * risk-lifecycle-telemetry.e2e.test.js — Wave 304
 *
 * End-to-end integration: walks the full risk-sweep → plan-review →
 * audit lifecycle and asserts the W297 telemetry counters increment
 * with the exact label dimensions consumers (W299 workbook,
 * Prometheus scraper) depend on.
 *
 * Drift guard: if any of the four canonical counters stops firing
 * (or its label key changes), this test fails — preventing silent
 * dashboard breakage when refactoring the underlying services.
 */

const metrics = require('../intelligence/risk-metrics.registry');
const { RiskPlanReviewService } = require('../services/risk-plan-review.service');
const {
  PlanReviewAckAuditService,
} = require('../services/plan-review-ack-audit.service');

// ── In-memory audit model (subset of mongoose API used by the service) ──
function makeInMemoryAckModel() {
  const rows = [];
  let nextId = 1;
  return {
    _rows: rows,
    findOne(filter) {
      return {
        sort: order => ({
          select: () => ({
            lean: async () => {
              const matched = rows.filter(
                r => String(r.planReviewId) === String(filter.planReviewId)
              );
              if (!matched.length) return null;
              matched.sort((a, b) =>
                order && order.occurredAt === -1
                  ? b.occurredAt - a.occurredAt
                  : a.occurredAt - b.occurredAt
              );
              return matched[0];
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

function makeRiskDeps({ alertUpdateImpl } = {}) {
  const updates = [];
  return {
    CarePlanModel: {
      findOne: () => ({ select: () => ({ lean: async () => ({ _id: 'cp1' }) }) }),
    },
    PlanReviewModel: {
      findOne: () => ({ select: () => ({ lean: async () => null }) }),
      create: async doc => ({ _id: 'pr-' + Date.now(), ...doc }),
    },
    AiAlertModel: {
      updateOne:
        alertUpdateImpl ||
        (async (filter, update) => {
          updates.push({ filter, update });
          return { matchedCount: 1, modifiedCount: 1 };
        }),
    },
    _updates: updates,
  };
}

const ben = { _id: 'b1', branchId: 'br1' };
const profile = { overallScore: 91, overallTier: 'critical', topFactors: [] };

describe('W304 — risk lifecycle telemetry (e2e)', () => {
  beforeEach(() => metrics._reset());

  test('happy path: trigger → append(TRIGGERED) → append(ACK) → verify ok', async () => {
    const ackModel = makeInMemoryAckModel();
    const auditService = new PlanReviewAckAuditService({
      PlanReviewAckModel: ackModel,
    });
    const deps = makeRiskDeps();
    const risk = new RiskPlanReviewService({ ...deps, auditService });

    // 1. Trigger creates the review + back-links the alert + appends TRIGGERED.
    const triggered = await risk.triggerOnEscalation({
      alertId: 'alert-1',
      ben,
      profile,
      tierDelta: 'first',
      sweepRunId: 'sweep-2026-05-23',
    });
    expect(triggered.created).toBe(true);

    // 2. Append ACK directly via the audit service (mirrors what
    //    PlanReviewSlaService.acknowledge does in production).
    await auditService.recordAck({
      planReviewId: triggered.planReviewId,
      beneficiaryId: ben._id,
      branchId: ben.branchId,
      actorUserId: 'user-clinician-1',
    });

    // 3. Verify the chain.
    const v = await auditService.verify({ planReviewId: triggered.planReviewId });
    expect(v.ok).toBe(true);
    expect(v.chainLength).toBe(2);

    // ── Telemetry assertions (W297) ──────────────────────────────────
    const snap = metrics.snapshot();
    expect(snap['risk.alert.backlink.attempted|result=ok']).toBe(1);
    expect(snap['risk.plan_review.audit.appended|action=TRIGGERED']).toBe(1);
    expect(snap['risk.plan_review.audit.appended|action=ACK']).toBe(1);
    expect(snap['risk.plan_review.audit.verified|result=ok']).toBe(1);
    // Negative: no failure counters fired.
    expect(snap['risk.alert.backlink.attempted|result=failed']).toBeUndefined();
    expect(
      Object.keys(snap).find(k => k.startsWith('risk.plan_review.audit.failed'))
    ).toBeUndefined();
  });

  test('back-link failure path: alert update throws → result=failed counter', async () => {
    const ackModel = makeInMemoryAckModel();
    const auditService = new PlanReviewAckAuditService({
      PlanReviewAckModel: ackModel,
    });
    const deps = makeRiskDeps({
      alertUpdateImpl: async () => {
        throw new Error('mongo down');
      },
    });
    const risk = new RiskPlanReviewService({ ...deps, auditService });

    const r = await risk.triggerOnEscalation({
      alertId: 'alert-1',
      ben,
      profile,
      tierDelta: 'first',
      sweepRunId: 'sweep-1',
    });
    // The review is still created — back-link failure is best-effort.
    expect(r.created).toBe(true);

    const snap = metrics.snapshot();
    expect(snap['risk.alert.backlink.attempted|result=failed']).toBe(1);
    expect(snap['risk.alert.backlink.attempted|result=ok']).toBeUndefined();
    // TRIGGERED still recorded on the audit side.
    expect(snap['risk.plan_review.audit.appended|action=TRIGGERED']).toBe(1);
  });

  test('skipped back-link: no AiAlertModel → result=skipped counter', async () => {
    const ackModel = makeInMemoryAckModel();
    const auditService = new PlanReviewAckAuditService({
      PlanReviewAckModel: ackModel,
    });
    const deps = makeRiskDeps();
    // Strip AiAlertModel to force the skipped path.
    const risk = new RiskPlanReviewService({
      CarePlanModel: deps.CarePlanModel,
      PlanReviewModel: deps.PlanReviewModel,
      auditService,
    });

    await risk.triggerOnEscalation({
      alertId: 'alert-1',
      ben,
      profile,
      tierDelta: 'first',
      sweepRunId: 'sweep-1',
    });

    const snap = metrics.snapshot();
    expect(snap['risk.alert.backlink.attempted|result=skipped']).toBe(1);
  });

  test('tampered chain → verify increments result=broken counter', async () => {
    const ackModel = makeInMemoryAckModel();
    const auditService = new PlanReviewAckAuditService({
      PlanReviewAckModel: ackModel,
    });
    // Seed two entries the normal way.
    await auditService.recordTriggered({
      planReviewId: 'pr-tamper',
      beneficiaryId: 'b1',
      payload: { sweepRunId: 's1' },
    });
    await auditService.recordAck({
      planReviewId: 'pr-tamper',
      beneficiaryId: 'b1',
      actorUserId: 'u1',
    });

    // Tamper with the middle row's payload after the chain was formed.
    ackModel._rows[0].payload = { sweepRunId: 'EVIL' };

    metrics._reset(); // isolate the verify-only window
    const v = await auditService.verify({ planReviewId: 'pr-tamper' });
    expect(v.ok).toBe(false);

    const snap = metrics.snapshot();
    expect(snap['risk.plan_review.audit.verified|result=broken']).toBe(1);
    expect(snap['risk.plan_review.audit.verified|result=ok']).toBeUndefined();
  });

  test('snapshotGrouped shape matches the format the W299 workbook scraper reads', async () => {
    const ackModel = makeInMemoryAckModel();
    const auditService = new PlanReviewAckAuditService({
      PlanReviewAckModel: ackModel,
    });
    const deps = makeRiskDeps();
    const risk = new RiskPlanReviewService({ ...deps, auditService });

    await risk.triggerOnEscalation({
      alertId: 'a1',
      ben,
      profile,
      tierDelta: 'first',
      sweepRunId: 's1',
    });
    await auditService.recordAck({
      planReviewId: 'pr-x',
      beneficiaryId: ben._id,
      actorUserId: 'u1',
    });

    const grouped = metrics.snapshotGrouped();
    // Every metric name is a top-level key; values are { 'k=v[,k=v]': count }.
    for (const [name, series] of Object.entries(grouped)) {
      expect(typeof name).toBe('string');
      expect(name.includes('|')).toBe(false); // pipe stays in flat snapshot, not grouped
      expect(typeof series).toBe('object');
      for (const [labelKey, count] of Object.entries(series)) {
        expect(typeof count).toBe('number');
        expect(count).toBeGreaterThan(0);
        // labelKey is either '_' (no labels) or 'k=v[,k=v]'.
        if (labelKey !== '_') {
          for (const pair of labelKey.split(',')) {
            expect(pair).toMatch(/^[a-zA-Z_]+=.+$/);
          }
        }
      }
    }
    // Spot-check the canonical names exist.
    expect(grouped['risk.plan_review.audit.appended']).toBeTruthy();
    expect(grouped['risk.alert.backlink.attempted']).toBeTruthy();
  });
});
