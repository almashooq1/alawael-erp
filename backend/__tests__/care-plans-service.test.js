'use strict';

const mongoose = require('mongoose');

require('../domains/care-plans/models/UnifiedCarePlan');
const { CarePlansService } = require('../domains/care-plans/services/CarePlansService');

function makeFindChain(result) {
  const chain = {};
  ['sort', 'skip', 'limit', 'lean', 'select', 'populate'].forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  chain.catch = fn => Promise.resolve(result).catch(fn);
  chain.lean = jest.fn().mockResolvedValue(result);
  return chain;
}

function makeLeanChain(result) {
  return { lean: () => Promise.resolve(result) };
}

function makePlan(overrides = {}) {
  return {
    _id: 'plan001',
    beneficiaryId: 'ben001',
    episodeId: 'ep001',
    type: 'comprehensive',
    status: 'draft',
    goals: [],
    ...overrides,
  };
}

describe('CarePlansService', () => {
  let UCP;
  let service;

  beforeEach(() => {
    UCP = mongoose.model('UnifiedCarePlan');
    service = new CarePlansService();
    jest.clearAllMocks();
  });

  describe('createPlan', () => {
    it('creates canonical plan payload + emits careplan.created', async () => {
      UCP.create.mockResolvedValueOnce(makePlan());
      const spy = jest.fn();
      service.on('careplan.created', spy);

      const result = await service.createPlan({
        beneficiaryId: 'ben001',
        episodeId: 'ep001',
        type: 'rehabilitation',
      });

      expect(UCP.create).toHaveBeenCalledWith(
        expect.objectContaining({
          beneficiaryId: 'ben001',
          episodeId: 'ep001',
          type: 'comprehensive',
          status: 'draft',
          globalGoals: [],
          globalInterventions: [],
        })
      );
      expect(result._id).toBe('plan001');
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ planId: 'plan001', beneficiaryId: 'ben001', episodeId: 'ep001' })
      );
    });

    it('throws 400 when beneficiaryId missing', async () => {
      await expect(service.createPlan({})).rejects.toMatchObject({ statusCode: 400 });
    });
  });

  describe('list/get', () => {
    it('lists plans with total', async () => {
      UCP.find.mockReturnValueOnce(makeFindChain([makePlan()]));
      UCP.countDocuments.mockResolvedValueOnce(1);

      const r = await service.listPlans({ beneficiaryId: 'ben001' }, { limit: 5, skip: 0 });
      expect(r.total).toBe(1);
      expect(r.data).toHaveLength(1);
    });

    it('getPlanById throws 404 when missing', async () => {
      UCP.findById.mockReturnValueOnce(makeLeanChain(null));
      await expect(service.getPlanById('missing')).rejects.toMatchObject({ statusCode: 404 });
    });
  });

  describe('update/activate/complete', () => {
    it('update emits careplan.updated', async () => {
      UCP.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(makePlan()));
      const spy = jest.fn();
      service.on('careplan.updated', spy);

      await service.updatePlan('plan001', { title_ar: 'x' });
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ planId: 'plan001' }));
    });

    it('activate emits careplan.activated', async () => {
      UCP.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(makePlan({ status: 'active' })));
      const spy = jest.fn();
      service.on('careplan.activated', spy);

      const out = await service.activatePlan('plan001');
      expect(out.status).toBe('active');
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ planId: 'plan001', beneficiaryId: 'ben001', episodeId: 'ep001' })
      );
    });

    it('complete emits careplan.completed', async () => {
      UCP.findByIdAndUpdate.mockReturnValueOnce(
        makeLeanChain(makePlan({ status: 'completed', outcomeRating: 4 }))
      );
      const spy = jest.fn();
      service.on('careplan.completed', spy);

      const out = await service.completePlan('plan001', { outcomeRating: 4 });
      expect(out.status).toBe('completed');
      expect(spy).toHaveBeenCalledWith(
        expect.objectContaining({ planId: 'plan001', beneficiaryId: 'ben001', episodeId: 'ep001' })
      );
    });
  });
});
