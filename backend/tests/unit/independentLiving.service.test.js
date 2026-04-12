/**
 * Unit tests for independentLiving.service.js — Independent Living Service
 * Class export with all static methods. 4 Mongoose models.
 */

/* ── chainable query helper ─────────────────────────────────────────── */
global.__ilQ = function (val) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    then: (r, e) => Promise.resolve(val).then(r, e),
  };
};

global.__ilSave = jest.fn().mockImplementation(function () {
  return Promise.resolve(this);
});

global.__mkILModel = function (tag) {
  const M = jest.fn(function (data) {
    Object.assign(this, data);
    this._id = `${tag}-1`;
    this.save = global.__ilSave;
    this.toObject = jest.fn().mockReturnValue({ _id: `${tag}-1`, ...data });
  });
  M.findOne = jest.fn(() => global.__ilQ(null));
  M.find = jest.fn(() => global.__ilQ([]));
  M.findById = jest.fn(() => global.__ilQ(null));
  M.findByIdAndUpdate = jest.fn(() => global.__ilQ(null));
  M.findByIdAndDelete = jest.fn(() => global.__ilQ(null));
  M.countDocuments = jest.fn().mockResolvedValue(0);
  M.aggregate = jest.fn().mockResolvedValue([]);
  return M;
};

jest.mock('../../models/ADLAssessment', () => global.__mkILModel('adl'));
jest.mock('../../models/IndependentLivingPlan', () => global.__mkILModel('plan'));
jest.mock('../../models/IndependentLivingProgress', () => global.__mkILModel('prog'));
jest.mock('../../models/SupportedHousing', () => global.__mkILModel('hous'));
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

/* ── SUT ────────────────────────────────────────────────────────────── */
const ILS = require('../../services/independentLiving.service');
const ADLAssessment = require('../../models/ADLAssessment');
const IndependentLivingPlan = require('../../models/IndependentLivingPlan');
const IndependentLivingProgress = require('../../models/IndependentLivingProgress');
const SupportedHousing = require('../../models/SupportedHousing');
const Q = global.__ilQ;

/* ── Reset ──────────────────────────────────────────────────────────── */
beforeEach(() => {
  jest.clearAllMocks();
  global.__ilSave.mockImplementation(function () {
    return Promise.resolve(this);
  });

  ADLAssessment.find.mockImplementation(() => Q([]));
  ADLAssessment.findById.mockImplementation(() => Q(null));
  ADLAssessment.findByIdAndUpdate.mockImplementation(() => Q(null));
  ADLAssessment.findByIdAndDelete.mockImplementation(() => Q(null));
  ADLAssessment.countDocuments.mockResolvedValue(0);
  ADLAssessment.aggregate.mockResolvedValue([]);

  IndependentLivingPlan.find.mockImplementation(() => Q([]));
  IndependentLivingPlan.findById.mockImplementation(() => Q(null));
  IndependentLivingPlan.findByIdAndUpdate.mockImplementation(() => Q(null));
  IndependentLivingPlan.findByIdAndDelete.mockImplementation(() => Q(null));
  IndependentLivingPlan.countDocuments.mockResolvedValue(0);

  IndependentLivingProgress.findOne.mockImplementation(() => Q(null));
  IndependentLivingProgress.find.mockImplementation(() => Q([]));
  IndependentLivingProgress.findById.mockImplementation(() => Q(null));
  IndependentLivingProgress.findByIdAndDelete.mockImplementation(() => Q(null));
  IndependentLivingProgress.countDocuments.mockResolvedValue(0);

  SupportedHousing.find.mockImplementation(() => Q([]));
  SupportedHousing.findById.mockImplementation(() => Q(null));
  SupportedHousing.findByIdAndUpdate.mockImplementation(() => Q(null));
  SupportedHousing.findByIdAndDelete.mockImplementation(() => Q(null));
  SupportedHousing.countDocuments.mockResolvedValue(0);
});

/* ═══════════════════════════════════════════════════════════════════════ */
describe('IndependentLivingService', () => {
  /* ── ADL Assessments ─────────────────────────────────────────────── */
  describe('ADL Assessments', () => {
    test('createAssessment — success', async () => {
      const res = await ILS.createAssessment({ type: 'adl', beneficiary: 'b1' });
      expect(res).toBeDefined();
      expect(global.__ilSave).toHaveBeenCalled();
    });

    test('createAssessment — db error', async () => {
      global.__ilSave.mockRejectedValueOnce(new Error('DB'));
      await expect(ILS.createAssessment({})).rejects.toThrow('DB');
    });

    test('getAssessments — paginated', async () => {
      ADLAssessment.find.mockImplementation(() => Q([{ _id: 'a1' }]));
      ADLAssessment.countDocuments.mockResolvedValue(1);
      const res = await ILS.getAssessments({});
      expect(res.assessments).toHaveLength(1);
      expect(res.total).toBe(1);
    });

    test('getAssessments — with filters', async () => {
      ADLAssessment.find.mockImplementation(() => Q([]));
      ADLAssessment.countDocuments.mockResolvedValue(0);
      const res = await ILS.getAssessments({ beneficiary: 'b1', status: 'active' });
      expect(res.assessments).toEqual([]);
    });

    test('getAssessmentById — found', async () => {
      ADLAssessment.findById.mockImplementation(() => Q({ _id: 'a1' }));
      const res = await ILS.getAssessmentById('a1');
      expect(res._id).toBe('a1');
    });

    test('getAssessmentById — not found returns null', async () => {
      const res = await ILS.getAssessmentById('nope');
      expect(res).toBeNull();
    });

    test('updateAssessment — found', async () => {
      const doc = {
        _id: 'a1',
        save: jest.fn().mockResolvedValue(true),
        toObject: () => ({ _id: 'a1', updated: true }),
      };
      ADLAssessment.findById.mockImplementation(() => Q(doc));
      const res = await ILS.updateAssessment('a1', { score: 5 });
      expect(doc.save).toHaveBeenCalled();
    });

    test('updateAssessment — not found returns null', async () => {
      const res = await ILS.updateAssessment('nope', {});
      expect(res).toBeNull();
    });

    test('deleteAssessment — success', async () => {
      ADLAssessment.findByIdAndDelete.mockImplementation(() => Q({ _id: 'a1' }));
      const res = await ILS.deleteAssessment('a1');
      expect(res._id).toBe('a1');
    });

    test('reviewAssessment — found', async () => {
      const doc = {
        _id: 'a1',
        save: jest.fn().mockResolvedValue(true),
        toObject: () => ({ _id: 'a1', status: 'reviewed' }),
      };
      ADLAssessment.findById.mockImplementation(() => Q(doc));
      const res = await ILS.reviewAssessment('a1', 'rev1', 'looks good');
      expect(doc.save).toHaveBeenCalled();
    });

    test('reviewAssessment — not found', async () => {
      const res = await ILS.reviewAssessment('nope', 'rev1', 'n/a');
      expect(res).toBeNull();
    });

    test('compareAssessments — with multiple assessments', async () => {
      const assessments = [
        {
          _id: 'a1',
          overallScore: 24,
          categoryScores: {
            cooking: 3,
            cleaning: 2,
            shopping: 4,
            transportation: 3,
            personal_care: 5,
            money_management: 2,
            communication: 3,
            safety: 4,
          },
          independenceLevel: 'moderate',
          assessmentDate: '2024-01-01',
        },
        {
          _id: 'a2',
          overallScore: 34,
          categoryScores: {
            cooking: 5,
            cleaning: 4,
            shopping: 4,
            transportation: 5,
            personal_care: 5,
            money_management: 3,
            communication: 4,
            safety: 5,
          },
          independenceLevel: 'independent',
          assessmentDate: '2024-06-01',
        },
      ];
      ADLAssessment.find.mockImplementation(() => Q(assessments));
      const res = await ILS.compareAssessments('b1');
      expect(res.assessments).toHaveLength(2);
      expect(res.comparison.overallChange).toBeDefined();
      expect(Object.keys(res.comparison.categoryChanges)).toHaveLength(8);
      expect(res.comparison.categoryChanges.cooking.change).toBe(2); // 5 - 3 = 2
    });

    test('compareAssessments — single assessment', async () => {
      ADLAssessment.find.mockImplementation(() => Q([{ _id: 'a1' }]));
      const res = await ILS.compareAssessments('b1');
      expect(res.assessments).toHaveLength(1);
      expect(res.comparison).toBeNull();
    });
  });

  /* ── Plans ───────────────────────────────────────────────────────── */
  describe('Plans', () => {
    test('createPlan — success', async () => {
      const res = await ILS.createPlan({ beneficiaryId: 'b1' });
      expect(global.__ilSave).toHaveBeenCalled();
    });

    test('getPlans — paginated', async () => {
      IndependentLivingPlan.find.mockImplementation(() => Q([{ _id: 'p1' }]));
      IndependentLivingPlan.countDocuments.mockResolvedValue(1);
      const res = await ILS.getPlans({});
      expect(res.plans).toHaveLength(1);
    });

    test('getPlanById — found', async () => {
      IndependentLivingPlan.findById.mockImplementation(() => Q({ _id: 'p1' }));
      const res = await ILS.getPlanById('p1');
      expect(res._id).toBe('p1');
    });

    test('getPlanById — not found', async () => {
      expect(await ILS.getPlanById('nope')).toBeNull();
    });

    test('updatePlan — found', async () => {
      const doc = {
        _id: 'p1',
        save: jest.fn().mockResolvedValue(true),
        toObject: () => ({ _id: 'p1' }),
      };
      IndependentLivingPlan.findById.mockImplementation(() => Q(doc));
      const res = await ILS.updatePlan('p1', { goal: 'new' });
      expect(doc.save).toHaveBeenCalled();
    });

    test('updatePlan — not found', async () => {
      expect(await ILS.updatePlan('nope', {})).toBeNull();
    });

    test('deletePlan — success', async () => {
      IndependentLivingPlan.findByIdAndDelete.mockImplementation(() => Q({ _id: 'p1' }));
      expect(await ILS.deletePlan('p1')).toBeDefined();
    });
  });

  /* ── Progress ────────────────────────────────────────────────────── */
  describe('Progress', () => {
    test('recordProgress — success', async () => {
      const res = await ILS.recordProgress({ planId: 'p1', note: 'good' });
      expect(global.__ilSave).toHaveBeenCalled();
    });

    test('getProgressRecords — paginated', async () => {
      IndependentLivingProgress.find.mockImplementation(() => Q([{ _id: 'pr1' }]));
      IndependentLivingProgress.countDocuments.mockResolvedValue(1);
      const res = await ILS.getProgressRecords({});
      expect(res.records).toHaveLength(1);
    });
  });

  /* ── Supported Housing ───────────────────────────────────────────── */
  describe('Supported Housing', () => {
    test('createHousingProgram — success', async () => {
      const res = await ILS.createHousingProgram({ name: 'House1' });
      expect(global.__ilSave).toHaveBeenCalled();
    });

    test('getHousingPrograms — paginated', async () => {
      SupportedHousing.find.mockImplementation(() => Q([{ _id: 'h1' }]));
      SupportedHousing.countDocuments.mockResolvedValue(1);
      const res = await ILS.getHousingPrograms({});
      expect(res.programs).toHaveLength(1);
    });

    test('getHousingProgramById — found', async () => {
      SupportedHousing.findById.mockImplementation(() => Q({ _id: 'h1' }));
      expect(await ILS.getHousingProgramById('h1')).toBeDefined();
    });

    test('getHousingProgramById — not found', async () => {
      expect(await ILS.getHousingProgramById('nope')).toBeNull();
    });

    test('updateHousing — found', async () => {
      const doc = {
        _id: 'h1',
        save: jest.fn().mockResolvedValue(true),
        toObject: () => ({ _id: 'h1' }),
      };
      SupportedHousing.findById.mockImplementation(() => Q(doc));
      const res = await ILS.updateHousingProgram('h1', { capacity: 5 });
      expect(doc.save).toHaveBeenCalled();
    });

    test('updateHousingProgram — not found', async () => {
      expect(await ILS.updateHousingProgram('nope', {})).toBeNull();
    });

    test('deleteHousingProgram — success', async () => {
      SupportedHousing.findByIdAndDelete.mockImplementation(() => Q({ _id: 'h1' }));
      expect(await ILS.deleteHousingProgram('h1')).toBeDefined();
    });
  });

  /* ── Dashboard ───────────────────────────────────────────────────── */
  describe('getDashboardStats', () => {
    test('returns dashboard stats', async () => {
      // getDashboardStats calls: ADL.countDocuments x3, Plan.countDocuments x2, Housing.countDocuments x2
      ADLAssessment.countDocuments
        .mockResolvedValueOnce(10) // totalAssessments
        .mockResolvedValueOnce(7) // completedAssessments
        .mockResolvedValueOnce(2); // independentCount
      IndependentLivingPlan.countDocuments
        .mockResolvedValueOnce(5) // totalPlans
        .mockResolvedValueOnce(3); // activePlans
      SupportedHousing.countDocuments
        .mockResolvedValueOnce(4) // totalHousing
        .mockResolvedValueOnce(2); // activeHousing
      ADLAssessment.aggregate
        .mockResolvedValueOnce([{ _id: null, avgScore: 72 }]) // avgScoreResult
        .mockResolvedValueOnce([{ _id: 'independent', count: 2 }]); // levelDistribution
      SupportedHousing.aggregate.mockResolvedValueOnce([{ _id: 'supported', count: 3 }]); // housingDistribution

      const dashboard = await ILS.getDashboardStats();
      expect(dashboard.assessments.total).toBe(10);
      expect(dashboard.assessments.completed).toBe(7);
      expect(dashboard.plans.total).toBe(5);
      expect(dashboard.plans.active).toBe(3);
      expect(dashboard.housing.total).toBe(4);
      expect(dashboard.housing.active).toBe(2);
      expect(dashboard.averageIndependenceScore).toBe(72);
    });
  });
});
