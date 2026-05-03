/**
 * assessments-service.test.js — Phase: Assessments Domain
 *
 * Unit tests for domains/assessments/services/AssessmentsService.js
 * Uses global mongoose mock (jest.setup.js). No DB connection.
 */

'use strict';

const mongoose = require('mongoose');

// Register ClinicalAssessment model with the mock mongoose before importing the service
require('../models/ClinicalAssessment');

const { AssessmentsService } = require('../domains/assessments/services/AssessmentsService');

/* ─── helpers ──────────────────────────────────────────────────────────── */

/** Build a chainable Mongoose query mock that resolves to `result`. */
function makeFindChain(result) {
  const chain = {};
  ['sort', 'skip', 'limit', 'lean', 'select', 'populate'].forEach(m => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.then = (resolve, reject) => Promise.resolve(result).then(resolve, reject);
  chain.catch = fn => Promise.resolve(result).catch(fn);
  return chain;
}

/** Wrap a result in an object with .lean() — for findByIdAndUpdate chains. */
function makeLeanChain(result) {
  return { lean: () => Promise.resolve(result) };
}

/** Quick fixture for an assessment document. */
function makeAssessment(overrides = {}) {
  return {
    _id: 'asmnt001',
    beneficiary: 'ben001',
    tool: 'CARS2',
    category: 'autism_screening',
    assessmentDate: new Date('2026-06-01T10:00:00Z'),
    status: 'draft',
    therapist: 'th001',
    ...overrides,
  };
}

/* ─── setup ────────────────────────────────────────────────────────────── */

describe('AssessmentsService', () => {
  let service;
  let CA; // ClinicalAssessment mock model

  beforeEach(() => {
    CA = mongoose.model('ClinicalAssessment');
    service = new AssessmentsService();
    jest.clearAllMocks();
  });

  /* ═══════════════════ createAssessment ═══════════════════════ */

  describe('createAssessment()', () => {
    it('creates an assessment and returns it', async () => {
      const assessment = makeAssessment();
      CA.create.mockResolvedValueOnce(assessment);

      const result = await service.createAssessment({
        beneficiary: 'ben001',
        tool: 'CARS2',
      });

      expect(CA.create).toHaveBeenCalledWith(
        expect.objectContaining({ beneficiary: 'ben001', tool: 'CARS2', status: 'draft' })
      );
      expect(result).toBe(assessment);
    });

    it('accepts beneficiaryId alias', async () => {
      const assessment = makeAssessment();
      CA.create.mockResolvedValueOnce(assessment);

      await service.createAssessment({ beneficiaryId: 'ben001', tool: 'M-CHAT' });

      expect(CA.create).toHaveBeenCalledWith(
        expect.objectContaining({ beneficiary: 'ben001', tool: 'M-CHAT' })
      );
    });

    it('accepts type alias for tool', async () => {
      const assessment = makeAssessment({ tool: 'VB-MAPP' });
      CA.create.mockResolvedValueOnce(assessment);

      await service.createAssessment({ beneficiary: 'ben001', type: 'VB-MAPP' });

      expect(CA.create).toHaveBeenCalledWith(expect.objectContaining({ tool: 'VB-MAPP' }));
    });

    it('defaults assessmentDate when not provided', async () => {
      CA.create.mockResolvedValueOnce(makeAssessment());

      await service.createAssessment({ beneficiary: 'ben001', tool: 'CARS2' });

      const payload = CA.create.mock.calls[0][0];
      expect(payload.assessmentDate).toBeInstanceOf(Date);
    });

    it('throws 400 when beneficiary is missing', async () => {
      await expect(service.createAssessment({ tool: 'CARS2' })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('throws 400 when tool is missing', async () => {
      await expect(service.createAssessment({ beneficiary: 'ben001' })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('emits assessment:created event', async () => {
      const assessment = makeAssessment();
      CA.create.mockResolvedValueOnce(assessment);

      const events = [];
      service.on('assessment:created', e => events.push(e));

      await service.createAssessment({ beneficiary: 'ben001', tool: 'CARS2' });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ tool: 'CARS2' });
    });
  });

  /* ═══════════════════ listAssessments ═══════════════════════ */

  describe('listAssessments()', () => {
    it('returns data and total', async () => {
      const items = [makeAssessment(), makeAssessment({ _id: 'asmnt002' })];
      CA.find.mockReturnValueOnce(makeFindChain(items));
      CA.countDocuments.mockResolvedValueOnce(2);

      const result = await service.listAssessments({});

      expect(result.data).toBe(items);
      expect(result.total).toBe(2);
    });

    it('applies beneficiary filter', async () => {
      CA.find.mockReturnValueOnce(makeFindChain([]));
      CA.countDocuments.mockResolvedValueOnce(0);

      await service.listAssessments({ beneficiary: 'ben001' });

      expect(CA.find).toHaveBeenCalledWith(expect.objectContaining({ beneficiary: 'ben001' }));
    });

    it('applies beneficiaryId alias', async () => {
      CA.find.mockReturnValueOnce(makeFindChain([]));
      CA.countDocuments.mockResolvedValueOnce(0);

      await service.listAssessments({ beneficiaryId: 'ben002' });

      expect(CA.find).toHaveBeenCalledWith(expect.objectContaining({ beneficiary: 'ben002' }));
    });

    it('applies status filter', async () => {
      CA.find.mockReturnValueOnce(makeFindChain([]));
      CA.countDocuments.mockResolvedValueOnce(0);

      await service.listAssessments({ status: 'completed' });

      expect(CA.find).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    });

    it('applies date range filter', async () => {
      CA.find.mockReturnValueOnce(makeFindChain([]));
      CA.countDocuments.mockResolvedValueOnce(0);

      await service.listAssessments({ from: '2026-01-01', to: '2026-12-31' });

      expect(CA.find).toHaveBeenCalledWith(
        expect.objectContaining({
          assessmentDate: expect.objectContaining({ $gte: expect.any(Date) }),
        })
      );
    });
  });

  /* ═══════════════════ getAssessmentById ═══════════════════════ */

  describe('getAssessmentById()', () => {
    it('returns the assessment when found', async () => {
      const assessment = makeAssessment();
      CA.findById.mockReturnValueOnce(makeFindChain(assessment));

      const result = await service.getAssessmentById('asmnt001');

      expect(CA.findById).toHaveBeenCalledWith('asmnt001');
      expect(result).toBe(assessment);
    });

    it('throws 404 when not found', async () => {
      CA.findById.mockReturnValueOnce(makeFindChain(null));

      await expect(service.getAssessmentById('missing')).rejects.toMatchObject({
        statusCode: 404,
      });
    });
  });

  /* ═══════════════════ getBeneficiaryAssessments ═══════════════════════ */

  describe('getBeneficiaryAssessments()', () => {
    it('returns assessments for a beneficiary', async () => {
      const items = [makeAssessment()];
      CA.find.mockReturnValueOnce(makeFindChain(items));
      CA.countDocuments.mockResolvedValueOnce(1);

      const result = await service.getBeneficiaryAssessments('ben001');

      expect(CA.find).toHaveBeenCalledWith({ beneficiary: 'ben001' });
      expect(result.data).toBe(items);
      expect(result.total).toBe(1);
    });

    it('respects pagination params', async () => {
      CA.find.mockReturnValueOnce(makeFindChain([]));
      CA.countDocuments.mockResolvedValueOnce(0);

      await service.getBeneficiaryAssessments('ben001', { limit: 5, skip: 10 });

      const chain = CA.find.mock.results[0].value;
      expect(chain.limit).toHaveBeenCalledWith(5);
      expect(chain.skip).toHaveBeenCalledWith(10);
    });
  });

  /* ═══════════════════ updateAssessment ═══════════════════════ */

  describe('updateAssessment()', () => {
    it('updates with correct args and returns updated doc', async () => {
      const updated = makeAssessment({ tool: 'Denver-II' });
      CA.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(updated));

      const result = await service.updateAssessment('asmnt001', { tool: 'Denver-II' });

      expect(CA.findByIdAndUpdate).toHaveBeenCalledWith(
        'asmnt001',
        { $set: { tool: 'Denver-II' } },
        { new: true, runValidators: true }
      );
      expect(result).toBe(updated);
    });

    it('throws 404 when not found', async () => {
      CA.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(null));

      await expect(service.updateAssessment('missing', {})).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('emits assessment:updated event', async () => {
      const updated = makeAssessment();
      CA.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(updated));

      const events = [];
      service.on('assessment:updated', e => events.push(e));

      await service.updateAssessment('asmnt001', { category: 'cognitive' });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ assessmentId: updated._id });
    });
  });

  /* ═══════════════════ completeAssessment ═══════════════════════ */

  describe('completeAssessment()', () => {
    it('sets status to completed with clinical fields', async () => {
      const completed = makeAssessment({ status: 'completed', score: 78 });
      CA.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(completed));

      const result = await service.completeAssessment('asmnt001', {
        score: 78,
        summary: 'Moderate autism indicators',
        results: { domain1: 12 },
        recommendations: ['ABA therapy'],
        interpretation: 'moderate',
        duration: 60,
      });

      expect(CA.findByIdAndUpdate).toHaveBeenCalledWith(
        'asmnt001',
        {
          $set: expect.objectContaining({
            status: 'completed',
            score: 78,
            summary: 'Moderate autism indicators',
            interpretation: 'moderate',
            duration: 60,
          }),
        },
        { new: true, runValidators: true }
      );
      expect(result).toBe(completed);
    });

    it('defaults recommendations and scoreBreakdown to empty arrays', async () => {
      CA.findByIdAndUpdate.mockReturnValueOnce(
        makeLeanChain(makeAssessment({ status: 'completed' }))
      );

      await service.completeAssessment('asmnt001', { summary: 'ok' });

      const setPayload = CA.findByIdAndUpdate.mock.calls[0][1].$set;
      expect(setPayload.recommendations).toEqual([]);
      expect(setPayload.scoreBreakdown).toEqual([]);
    });

    it('throws 404 when not found', async () => {
      CA.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(null));

      await expect(service.completeAssessment('missing', {})).rejects.toMatchObject({
        statusCode: 404,
      });
    });

    it('emits assessment:completed event with score', async () => {
      const completed = makeAssessment({ status: 'completed', score: 82, tool: 'CARS2' });
      CA.findByIdAndUpdate.mockReturnValueOnce(makeLeanChain(completed));

      const events = [];
      service.on('assessment:completed', e => events.push(e));

      await service.completeAssessment('asmnt001', { score: 82 });

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({ tool: 'CARS2', score: 82 });
    });
  });

  /* ═══════════════════ getDashboard ═══════════════════════ */

  describe('getDashboard()', () => {
    it('returns total, byStatus, overdue and byTool', async () => {
      CA.countDocuments
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(5); // overdue
      CA.aggregate
        .mockResolvedValueOnce([
          { _id: 'draft', count: 10 },
          { _id: 'completed', count: 40 },
        ])
        .mockResolvedValueOnce([{ _id: 'CARS2', count: 20 }]);

      const result = await service.getDashboard({});

      expect(result.total).toBe(50);
      expect(result.byStatus).toEqual({ draft: 10, completed: 40 });
      expect(result.overdue).toBe(5);
      expect(result.byTool).toEqual([{ _id: 'CARS2', count: 20 }]);
    });

    it('applies date range to query', async () => {
      CA.countDocuments.mockResolvedValue(0);
      CA.aggregate.mockResolvedValue([]);

      await service.getDashboard({ from: '2026-01-01', to: '2026-06-30' });

      const totalCall = CA.countDocuments.mock.calls[0][0];
      expect(totalCall.assessmentDate).toMatchObject({
        $gte: expect.any(Date),
        $lte: expect.any(Date),
      });
    });

    it('returns zeros when no assessments', async () => {
      CA.countDocuments.mockResolvedValue(0);
      CA.aggregate.mockResolvedValue([]);

      const result = await service.getDashboard({});

      expect(result.total).toBe(0);
      expect(result.byStatus).toEqual({});
      expect(result.overdue).toBe(0);
    });
  });
});
