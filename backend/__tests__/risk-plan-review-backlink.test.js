'use strict';
/**
 * risk-plan-review-backlink.test.js — Wave 294
 *
 * Verifies W294: when the W290 trigger creates (or finds) a CRITICAL
 * PlanReview, it patches the source AiAlert with
 * `data.linkedPlanReviewId` so dashboards (W291) can hop alert→review.
 */

const { RiskPlanReviewService } = require('../services/risk-plan-review.service');

function makeDeps({ activePlan, existingReview, alertUpdateImpl }) {
  const created = [];
  const updates = [];
  const CarePlanModel = {
    findOne: () => ({ select: () => ({ lean: async () => activePlan }) }),
  };
  const PlanReviewModel = {
    findOne: () => ({ select: () => ({ lean: async () => existingReview }) }),
    create: async doc => ({ _id: 'pr-new-' + (created.push(doc) || created.length), ...doc }),
  };
  const AiAlertModel = {
    updateOne:
      alertUpdateImpl ||
      (async (filter, update) => {
        updates.push({ filter, update });
        return { matchedCount: 1, modifiedCount: 1 };
      }),
  };
  return { CarePlanModel, PlanReviewModel, AiAlertModel, updates, created };
}

const ben = { _id: 'b1', branchId: 'br1' };
const profile = { overallScore: 88, overallTier: 'critical', topFactors: [] };

describe('W294 — RiskPlanReviewService alert back-link', () => {
  test('happy path: creates review AND patches AiAlert.data.linkedPlanReviewId', async () => {
    const { CarePlanModel, PlanReviewModel, AiAlertModel, updates } = makeDeps({
      activePlan: { _id: 'cp1' },
    });
    const svc = new RiskPlanReviewService({ CarePlanModel, PlanReviewModel, AiAlertModel });
    const r = await svc.triggerOnEscalation({
      alertId: 'alert-xyz',
      ben,
      profile,
      tierDelta: 'first',
      sweepRunId: 'sweep-1',
    });
    expect(r.created).toBe(true);
    expect(r.alertLinked).toBe(true);
    expect(updates).toHaveLength(1);
    expect(updates[0].filter).toEqual({ _id: 'alert-xyz' });
    expect(updates[0].update).toEqual({
      $set: { 'data.linkedPlanReviewId': r.planReviewId },
    });
  });

  test('idempotent path (already triggered today): still patches alert with existing reviewId', async () => {
    const { CarePlanModel, PlanReviewModel, AiAlertModel, updates } = makeDeps({
      activePlan: { _id: 'cp1' },
      existingReview: { _id: 'pr-existing' },
    });
    const svc = new RiskPlanReviewService({ CarePlanModel, PlanReviewModel, AiAlertModel });
    const r = await svc.triggerOnEscalation({
      alertId: 'alert-2',
      ben,
      profile,
      tierDelta: 'escalated',
      sweepRunId: 'sweep-2',
    });
    expect(r.created).toBe(false);
    expect(r.reason).toBe('ALREADY_TRIGGERED_TODAY');
    expect(r.planReviewId).toBe('pr-existing');
    expect(updates).toHaveLength(1);
    expect(updates[0].update.$set['data.linkedPlanReviewId']).toBe('pr-existing');
  });

  test('no AiAlert dep → still creates review (back-link silently skipped)', async () => {
    const { CarePlanModel, PlanReviewModel } = makeDeps({ activePlan: { _id: 'cp1' } });
    const svc = new RiskPlanReviewService({ CarePlanModel, PlanReviewModel });
    const r = await svc.triggerOnEscalation({
      alertId: 'alert-3',
      ben,
      profile,
      tierDelta: 'first',
      sweepRunId: 'sweep-3',
    });
    expect(r.created).toBe(true);
    expect(r.alertLinked).toBe(false);
  });

  test('AiAlert.updateOne failure does NOT fail the trigger', async () => {
    const { CarePlanModel, PlanReviewModel, AiAlertModel } = makeDeps({
      activePlan: { _id: 'cp1' },
      alertUpdateImpl: async () => {
        throw new Error('mongo unavailable');
      },
    });
    const svc = new RiskPlanReviewService({ CarePlanModel, PlanReviewModel, AiAlertModel });
    const r = await svc.triggerOnEscalation({
      alertId: 'alert-4',
      ben,
      profile,
      tierDelta: 'first',
      sweepRunId: 'sweep-4',
    });
    expect(r.created).toBe(true);
    expect(r.alertLinked).toBe(false);
  });

  test('no alertId in ctx → no update attempted', async () => {
    const { CarePlanModel, PlanReviewModel, AiAlertModel, updates } = makeDeps({
      activePlan: { _id: 'cp1' },
    });
    const svc = new RiskPlanReviewService({ CarePlanModel, PlanReviewModel, AiAlertModel });
    const r = await svc.triggerOnEscalation({
      ben,
      profile,
      tierDelta: 'first',
      sweepRunId: 'sweep-5',
    });
    expect(r.created).toBe(true);
    expect(r.alertLinked).toBe(false);
    expect(updates).toHaveLength(0);
  });
});
