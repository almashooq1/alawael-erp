'use strict';
/**
 * plan-review-sla.test.js — Wave 292
 *
 * Unit tests for PlanReviewSlaService:
 *  - acknowledge happy path + guard reasons
 *  - sweep: warning @ 24h, urgent @ 48h
 *  - sweep: skips already acknowledged
 *  - sweep: skips when slaEscalationLevel already at target
 *  - sweep: branchId scope via Beneficiary lookup
 */

jest.unmock('mongoose');

const { PlanReviewSlaService } = require('../services/plan-review-sla.service');

function makePlanReviewModel(seed) {
  const reviews = new Map(seed.map(r => [String(r._id), { ...r }]));
  return {
    _reviews: reviews,
    findById: id => ({
      lean: async () => {
        const r = reviews.get(String(id));
        return r ? { ...r } : null;
      },
    }),
    find: filter => ({
      select: () => ({
        lean: async () => {
          const out = [];
          for (const r of reviews.values()) {
            if (filter.reviewType && r.reviewType !== filter.reviewType) continue;
            if (filter.acknowledgedAt === null && r.acknowledgedAt) continue;
            if (filter.createdAt && filter.createdAt.$lte && r.createdAt > filter.createdAt.$lte)
              continue;
            if (
              filter.slaEscalationLevel &&
              !(r.slaEscalationLevel < filter.slaEscalationLevel.$lt)
            )
              continue;
            out.push({ ...r });
          }
          return out;
        },
      }),
    }),
    updateOne: async (filter, update) => {
      const r = reviews.get(String(filter._id));
      if (!r) return { matchedCount: 0 };
      if (filter.acknowledgedAt === null && r.acknowledgedAt) return { matchedCount: 0 };
      if (filter.slaEscalationLevel && !(r.slaEscalationLevel < filter.slaEscalationLevel.$lt))
        return { matchedCount: 0 };
      Object.assign(r, update.$set || {});
      return { matchedCount: 1 };
    },
  };
}

function makeAlertModel() {
  const created = [];
  return {
    _created: created,
    create: async doc => {
      created.push(doc);
      return doc;
    },
  };
}

function makeBeneficiaryModel(bens) {
  return {
    find: filter => ({
      select: () => ({
        lean: async () => {
          const ids = (filter && filter._id && filter._id.$in) || [];
          return bens.filter(
            b =>
              ids.map(String).includes(String(b._id)) &&
              (!filter.branchId || b.branchId === filter.branchId)
          );
        },
      }),
    }),
  };
}

describe('W292 — PlanReviewSlaService', () => {
  const NOW = new Date('2026-05-23T12:00:00Z');
  const H = 3600_000;

  describe('acknowledge', () => {
    test('rejects when planReviewId missing', async () => {
      const svc = new PlanReviewSlaService({
        PlanReviewModel: makePlanReviewModel([]),
        AiAlertModel: makeAlertModel(),
      });
      const r = await svc.acknowledge({ userId: 'u1' });
      expect(r).toEqual({ ok: false, reason: 'PLAN_REVIEW_REQUIRED' });
    });

    test('rejects unknown review id', async () => {
      const svc = new PlanReviewSlaService({
        PlanReviewModel: makePlanReviewModel([]),
        AiAlertModel: makeAlertModel(),
      });
      const r = await svc.acknowledge({ planReviewId: 'pr-x', userId: 'u1' });
      expect(r.reason).toBe('PLAN_REVIEW_NOT_FOUND');
    });

    test('rejects non-CRITICAL reviews', async () => {
      const pr = makePlanReviewModel([
        { _id: 'pr1', reviewType: 'SCHEDULED', slaEscalationLevel: 0 },
      ]);
      const svc = new PlanReviewSlaService({
        PlanReviewModel: pr,
        AiAlertModel: makeAlertModel(),
      });
      const r = await svc.acknowledge({ planReviewId: 'pr1', userId: 'u1' });
      expect(r.reason).toBe('NOT_CRITICAL_REVIEW');
    });

    test('rejects already acknowledged', async () => {
      const pr = makePlanReviewModel([
        {
          _id: 'pr2',
          reviewType: 'CRITICAL',
          acknowledgedAt: NOW,
          slaEscalationLevel: 0,
        },
      ]);
      const svc = new PlanReviewSlaService({
        PlanReviewModel: pr,
        AiAlertModel: makeAlertModel(),
      });
      const r = await svc.acknowledge({ planReviewId: 'pr2', userId: 'u1' });
      expect(r.reason).toBe('ALREADY_ACKNOWLEDGED');
    });

    test('happy path: sets acknowledgedAt + acknowledgedBy', async () => {
      const pr = makePlanReviewModel([
        {
          _id: 'pr3',
          reviewType: 'CRITICAL',
          acknowledgedAt: null,
          slaEscalationLevel: 0,
        },
      ]);
      const svc = new PlanReviewSlaService({
        PlanReviewModel: pr,
        AiAlertModel: makeAlertModel(),
      });
      const r = await svc.acknowledge({ planReviewId: 'pr3', userId: 'u-clinician' });
      expect(r.ok).toBe(true);
      expect(r.review.acknowledgedBy).toBe('u-clinician');
      expect(pr._reviews.get('pr3').acknowledgedAt).toBeInstanceOf(Date);
    });
  });

  describe('sweep', () => {
    test('24h overdue → warning alert + escalationLevel=1', async () => {
      const pr = makePlanReviewModel([
        {
          _id: 'pr10',
          beneficiary: 'b1',
          carePlan: 'cp1',
          reviewType: 'CRITICAL',
          acknowledgedAt: null,
          slaEscalationLevel: 0,
          createdAt: new Date(NOW.getTime() - 25 * H),
        },
      ]);
      const alert = makeAlertModel();
      const svc = new PlanReviewSlaService({
        PlanReviewModel: pr,
        AiAlertModel: alert,
      });
      const out = await svc.sweep({ now: NOW });
      expect(out.checked).toBe(1);
      expect(out.alertsRaised).toBe(1);
      expect(out.byLevel).toEqual({ warn: 1, urgent: 0 });
      expect(alert._created[0].severity).toBe('warning');
      expect(alert._created[0].data.code).toBe('PLAN_REVIEW_ACK_OVERDUE_24H');
      expect(pr._reviews.get('pr10').slaEscalationLevel).toBe(1);
    });

    test('48h overdue → urgent alert + escalationLevel=2', async () => {
      const pr = makePlanReviewModel([
        {
          _id: 'pr11',
          beneficiary: 'b1',
          carePlan: 'cp1',
          reviewType: 'CRITICAL',
          acknowledgedAt: null,
          slaEscalationLevel: 0,
          createdAt: new Date(NOW.getTime() - 50 * H),
        },
      ]);
      const alert = makeAlertModel();
      const svc = new PlanReviewSlaService({
        PlanReviewModel: pr,
        AiAlertModel: alert,
      });
      const out = await svc.sweep({ now: NOW });
      expect(out.byLevel).toEqual({ warn: 0, urgent: 1 });
      expect(alert._created[0].severity).toBe('urgent');
      expect(alert._created[0].data.code).toBe('PLAN_REVIEW_ACK_OVERDUE_48H');
      expect(pr._reviews.get('pr11').slaEscalationLevel).toBe(2);
    });

    test('skips reviews already escalated to that level (idempotent)', async () => {
      const pr = makePlanReviewModel([
        {
          _id: 'pr12',
          beneficiary: 'b1',
          carePlan: 'cp1',
          reviewType: 'CRITICAL',
          acknowledgedAt: null,
          slaEscalationLevel: 1, // already warned
          createdAt: new Date(NOW.getTime() - 25 * H), // still in 24h band
        },
      ]);
      const alert = makeAlertModel();
      const svc = new PlanReviewSlaService({
        PlanReviewModel: pr,
        AiAlertModel: alert,
      });
      const out = await svc.sweep({ now: NOW });
      expect(out.alertsRaised).toBe(0);
      expect(alert._created.length).toBe(0);
    });

    test('escalates from level 1 → 2 when age crosses 48h', async () => {
      const pr = makePlanReviewModel([
        {
          _id: 'pr13',
          beneficiary: 'b1',
          carePlan: 'cp1',
          reviewType: 'CRITICAL',
          acknowledgedAt: null,
          slaEscalationLevel: 1,
          createdAt: new Date(NOW.getTime() - 49 * H),
        },
      ]);
      const alert = makeAlertModel();
      const svc = new PlanReviewSlaService({
        PlanReviewModel: pr,
        AiAlertModel: alert,
      });
      const out = await svc.sweep({ now: NOW });
      expect(out.byLevel).toEqual({ warn: 0, urgent: 1 });
      expect(pr._reviews.get('pr13').slaEscalationLevel).toBe(2);
    });

    test('branchId scope drops out-of-branch reviews', async () => {
      const pr = makePlanReviewModel([
        {
          _id: 'pr14',
          beneficiary: 'b-other',
          carePlan: 'cp1',
          reviewType: 'CRITICAL',
          acknowledgedAt: null,
          slaEscalationLevel: 0,
          createdAt: new Date(NOW.getTime() - 25 * H),
        },
      ]);
      const alert = makeAlertModel();
      const svc = new PlanReviewSlaService({
        PlanReviewModel: pr,
        AiAlertModel: alert,
        BeneficiaryModel: makeBeneficiaryModel([{ _id: 'b-other', branchId: 'br2' }]),
      });
      const out = await svc.sweep({ now: NOW, branchId: 'br1' });
      expect(out.checked).toBe(0);
      expect(alert._created.length).toBe(0);
    });
  });
});
