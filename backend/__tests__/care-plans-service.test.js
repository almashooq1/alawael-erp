'use strict';

/**
 * @file care-plans-service.test.js
 * Unit tests for CarePlansService
 */

const mongoose = require('mongoose');

// Register the UnifiedCarePlan model in the global mock
require('../domains/care-plans/models/UnifiedCarePlan');
const { CarePlansService } = require('../domains/care-plans/services/CarePlansService');

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Chainable query mock (for .find / .findById chains) */
function makeFindChain(result) {
  const chain = {};
  ['sort', 'skip', 'limit', 'lean', 'select', 'populate'].forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  chain.catch = fn => Promise.resolve(result).catch(fn);
  return chain;
}

/** findByIdAndUpdate / findById — returns { lean: () => Promise } */
function makeLeanChain(result) {
  return { lean: () => Promise.resolve(result) };
}

/** Build a minimal care plan fixture */
function makePlan(overrides = {}) {
  return {
    _id: 'plan001',
    beneficiaryId: 'ben001',
    episodeId: 'ep001',
    type: 'rehabilitation',
    status: 'draft',
    goals: [],
    interventions: [],
    primaryTherapistId: 'th001',
    createdAt: new Date('2026-05-01T10:00:00Z'),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('CarePlansService', () => {
  let UCP; // UnifiedCarePlan mock
  let service;

  beforeEach(() => {
    UCP = mongoose.model('UnifiedCarePlan');
    service = new CarePlansService();
    jest.clearAllMocks();
  });

  /* ─── createPlan ──────────────────────────────────────────────────────── */
  describe('createPlan', () => {
    it('creates a plan with full data', async () => {
      const plan = makePlan();
      UCP.create.mockResolvedValueOnce(plan);

      const result = await service.createPlan({
        beneficiaryId: 'ben001',
        episodeId: 'ep001',
        type: 'rehabilitation',
        primaryTherapistId: 'th001',
      });

      expect(UCP.create).toHaveBeenCalledWith(
        expect.objectContaining({
          beneficiaryId: 'ben001',
          episodeId: 'ep001',
          type: 'rehabilitation',
          status: 'draft',
          goals: [],
          interventions: [],
        })
      );
      expect(result._id).toBe('plan001');
    });

    it('defaults type to rehabilitation when not provided', async () => {
      UCP.create.mockResolvedValueOnce(makePlan());
      await service.createPlan({ beneficiaryId: 'ben001' });
      expect(UCP.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'rehabilitation' }));
    });

    it('passes goals and interventions arrays', async () => {
      const goals = [{ title: 'Goal A' }];
      const interventions = [{ title: 'Intervention B' }];
      UCP.create.mockResolvedValueOnce(makePlan({ goals, interventions }));

      await service.createPlan({ beneficiaryId: 'ben001', goals, interventions });

      expect(UCP.create).toHaveBeenCalledWith(expect.objectContaining({ goals, interventions }));
    });

    it('throws 400 when beneficiaryId is missing', async () => {
      await expect(service.createPlan({})).rejects.toMatchObject({ statusCode: 400 });
      expect(UCP.create).not.toHaveBeenCalled();
    });

    it('emits care-plan:created on success', async () => {
      UCP.create.mockResolvedValueOnce(makePlan());
      const spy = jest.fn();
      service.on('care-plan:created', spy);

      await service.createPlan({ beneficiaryId: 'ben001', episodeId: 'ep001' });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ planId: 'plan001', beneficiaryId: 'ben001' })
      );
    });
  });

  /* ─── listPlans ──────────────────────────────────────────────────────── */
  describe('listPlans', () => {
    it('returns data and total', async () => {
      const plans = [makePlan(), makePlan({ _id: 'plan002' })];
      UCP.find.mockReturnValueOnce(makeFindChain(plans));
      UCP.countDocuments.mockResolvedValueOnce(2);

      const result = await service.listPlans({});
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('filters by beneficiaryId', async () => {
      UCP.find.mockReturnValueOnce(makeFindChain([makePlan()]));
      UCP.countDocuments.mockResolvedValueOnce(1);

      await service.listPlans({ beneficiaryId: 'ben001' });

      expect(UCP.find).toHaveBeenCalledWith(expect.objectContaining({ beneficiaryId: 'ben001' }));
    });

    it('filters by episodeId and status', async () => {
      UCP.find.mockReturnValueOnce(makeFindChain([]));
      UCP.countDocuments.mockResolvedValueOnce(0);

      await service.listPlans({ episodeId: 'ep001', status: 'active' });

      expect(UCP.find).toHaveBeenCalledWith(
        expect.objectContaining({ episodeId: 'ep001', status: 'active' })
      );
    });

    it('respects pagination limit and skip', async () => {
      UCP.find.mockReturnValueOnce(makeFindChain([]));
      UCP.countDocuments.mockResolvedValueOnce(0);

      await service.listPlans({}, { limit: 5, skip: 10 });

      const chain = UCP.find.mock.results[0].value;
      expect(chain.skip).toHaveBeenCalledWith(10);
      expect(chain.limit).toHaveBeenCalledWith(5);
    });
  });

  /* ─── getPlanById ────────────────────────────────────────────────────── */
  describe('getPlanById', () => {
    it('returns the plan when found', async () => {
      UCP.findById.mockReturnValueOnce(makeLeanChain(makePlan()));
      const result = await service.getPlanById('plan001');
      expect(result._id).toBe('plan001');
    });

    it('throws 404 when plan not found', async () => {
      UCP.findById.mockReturnValueOnce(makeLeanChain(null));
      await expect(service.getPlanById('nonexistent')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  /* ─── getBeneficiaryPlans ────────────────────────────────────────────── */
  describe('getBeneficiaryPlans', () => {
    it('returns data and total count', async () => {
      const plans = [makePlan(), makePlan({ _id: 'plan002' })];
      UCP.find.mockReturnValueOnce(makeFindChain(plans));

      const result = await service.getBeneficiaryPlans('ben001');

      expect(UCP.find).toHaveBeenCalledWith({ beneficiaryId: 'ben001' });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('returns empty when beneficiary has no plans', async () => {
      UCP.find.mockReturnValueOnce(makeFindChain([]));

      const result = await service.getBeneficiaryPlans('ben999');
      expect(result.data).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  /* ─── updatePlan ─────────────────────────────────────────────────────── */
  describe('updatePlan', () => {
    it('updates and returns the plan', async () => {
      const updated = makePlan({ status: 'active' });
      UCP.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(updated));

      const result = await service.updatePlan('plan001', { status: 'active' });

      expect(UCP.findByIdAndUpdate).toHaveBeenCalledWith(
        'plan001',
        { $set: { status: 'active' } },
        { new: true, runValidators: true }
      );
      expect(result.status).toBe('active');
    });

    it('throws 404 when plan not found', async () => {
      UCP.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(null));
      await expect(service.updatePlan('missing', {})).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('emits care-plan:updated on success', async () => {
      UCP.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(makePlan()));
      const spy = jest.fn();
      service.on('care-plan:updated', spy);

      await service.updatePlan('plan001', { title: 'New Title' });

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ planId: 'plan001' }));
    });
  });

  /* ─── activatePlan ───────────────────────────────────────────────────── */
  describe('activatePlan', () => {
    it('sets status to active with activatedDate', async () => {
      const activated = makePlan({ status: 'active', activatedDate: new Date() });
      UCP.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(activated));

      const result = await service.activatePlan('plan001');

      expect(UCP.findByIdAndUpdate).toHaveBeenCalledWith(
        'plan001',
        expect.objectContaining({ $set: expect.objectContaining({ status: 'active' }) }),
        { new: true }
      );
      expect(result.status).toBe('active');
    });

    it('throws 404 when plan not found', async () => {
      UCP.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(null));
      await expect(service.activatePlan('missing')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('emits care-plan:activated on success', async () => {
      UCP.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(makePlan({ status: 'active' })));
      const spy = jest.fn();
      service.on('care-plan:activated', spy);

      await service.activatePlan('plan001');

      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ planId: 'plan001' }));
    });
  });

  /* ─── completePlan ───────────────────────────────────────────────────── */
  describe('completePlan', () => {
    it('sets status to completed with summary and outcomeRating', async () => {
      const completed = makePlan({
        status: 'completed',
        summary: 'Great progress',
        outcomeRating: 5,
      });
      UCP.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(completed));

      const result = await service.completePlan('plan001', {
        summary: 'Great progress',
        outcomeRating: 5,
      });

      expect(UCP.findByIdAndUpdate).toHaveBeenCalledWith(
        'plan001',
        expect.objectContaining({
          $set: expect.objectContaining({
            status: 'completed',
            summary: 'Great progress',
            outcomeRating: 5,
          }),
        }),
        { new: true }
      );
      expect(result.status).toBe('completed');
    });

    it('works with no completion data provided', async () => {
      UCP.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(makePlan({ status: 'completed' })));
      const result = await service.completePlan('plan001');
      expect(result.status).toBe('completed');
    });

    it('throws 404 when plan not found', async () => {
      UCP.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(null));
      await expect(service.completePlan('missing')).rejects.toMatchObject({ statusCode: 404 });
    });

    it('emits care-plan:completed with outcomeRating', async () => {
      UCP.findByIdAndUpdate.mockReturnValueOnce(
        makeLeanChain(makePlan({ status: 'completed', outcomeRating: 4 }))
      );
      const spy = jest.fn();
      service.on('care-plan:completed', spy);

      await service.completePlan('plan001', { outcomeRating: 4 });

      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ planId: 'plan001', outcomeRating: 4 })
      );
    });
  });

  /* ─── addGoal ────────────────────────────────────────────────────────── */
  describe('addGoal', () => {
    it('pushes goal to plan goals array', async () => {
      const goal = { title: 'Improve communication', type: 'communication' };
      const updated = makePlan({ goals: [goal] });
      UCP.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(updated));

      const result = await service.addGoal('plan001', goal);

      expect(UCP.findByIdAndUpdate).toHaveBeenCalledWith(
        'plan001',
        { $push: { goals: goal } },
        { new: true }
      );
      expect(result.goals).toHaveLength(1);
    });

    it('throws 404 when plan not found', async () => {
      UCP.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(null));
      await expect(service.addGoal('missing', {})).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  /* ─── getDashboard ───────────────────────────────────────────────────── */
  describe('getDashboard', () => {
    it('returns total, active, and byStatus map', async () => {
      UCP.countDocuments
        .mockResolvedValueOnce(15) // total
        .mockResolvedValueOnce(8); // active
      UCP.aggregate.mockResolvedValueOnce([
        { _id: 'draft', count: 4 },
        { _id: 'active', count: 8 },
        { _id: 'completed', count: 3 },
      ]);

      const result = await service.getDashboard();

      expect(result.total).toBe(15);
      expect(result.active).toBe(8);
      expect(result.byStatus).toEqual({ draft: 4, active: 8, completed: 3 });
    });

    it('returns zeros when no plans exist', async () => {
      UCP.countDocuments.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      UCP.aggregate.mockResolvedValueOnce([]);

      const result = await service.getDashboard();

      expect(result.total).toBe(0);
      expect(result.active).toBe(0);
      expect(result.byStatus).toEqual({});
    });
  });
});
