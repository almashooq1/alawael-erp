'use strict';

const chain = () => {
  const c = {};
  [
    'find',
    'findById',
    'findByIdAndUpdate',
    'findOne',
    'sort',
    'skip',
    'limit',
    'lean',
    'populate',
    'countDocuments',
    'create',
  ].forEach(m => {
    c[m] = jest.fn().mockReturnValue(c);
  });
  c.then = undefined;
  return c;
};
const makeModel = () => {
  const c = chain();
  const M = jest.fn(() => c);
  Object.assign(M, c);
  return M;
};

const mockDDDAccreditationCycle = makeModel();
const mockDDDSelfAssessment = makeModel();
const mockDDDSurveyFinding = makeModel();
const mockDDDCorrectiveAction = makeModel();

jest.mock('../../models/DddAccreditationManager', () => ({
  DDDAccreditationCycle: mockDDDAccreditationCycle,
  DDDSelfAssessment: mockDDDSelfAssessment,
  DDDSurveyFinding: mockDDDSurveyFinding,
  DDDCorrectiveAction: mockDDDCorrectiveAction,
  ACCREDITATION_TYPES: ['CBAHI', 'JCI'],
  ACCREDITATION_STATUSES: ['preparing', 'awarded', 'expired'],
  SURVEY_TYPES: ['initial', 'renewal'],
  FINDING_SEVERITIES: ['critical', 'major', 'minor'],
  CORRECTIVE_ACTION_STATUSES: ['open', 'in_progress', 'closed', 'cancelled', 'verified'],
  STANDARD_CHAPTERS: ['leadership', 'safety'],
  BUILTIN_ACCREDITATION_BODIES: [{ code: 'CBAHI' }, { code: 'JCI' }],
}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor() {}
    log() {}
    _create(M, d) {
      return M.create(d);
    }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...o }).lean();
    }
    _list(M, f, o) {
      return M.find(f)
        .sort(o?.sort || {})
        .lean();
    }
    _getById(M, id) {
      return M.findById(id).lean();
    }
  };
});

const service = require('../../services/dddAccreditationManager');

beforeEach(() => {
  [
    mockDDDAccreditationCycle,
    mockDDDSelfAssessment,
    mockDDDSurveyFinding,
    mockDDDCorrectiveAction,
  ].forEach(M => {
    Object.values(M).forEach(v => {
      if (typeof v === 'function' && v.mockClear) v.mockClear();
    });
  });
});

describe('dddAccreditationManager', () => {
  /* ── Cycles ── */
  describe('createCycle', () => {
    it('creates via _create', async () => {
      mockDDDAccreditationCycle.create.mockResolvedValue({ _id: 'c1' });
      expect(await service.createCycle({ type: 'CBAHI' })).toHaveProperty('_id');
    });
  });

  describe('listCycles', () => {
    it('returns list sorted by cycleStartDate desc', async () => {
      mockDDDAccreditationCycle.find.mockReturnThis();
      mockDDDAccreditationCycle.sort.mockReturnThis();
      mockDDDAccreditationCycle.lean.mockResolvedValue([{ _id: 'c1' }]);
      const r = await service.listCycles({});
      expect(r).toHaveLength(1);
      expect(mockDDDAccreditationCycle.sort).toHaveBeenCalledWith({ cycleStartDate: -1 });
    });
  });

  describe('getCycleById', () => {
    it('returns cycle via _getById', async () => {
      mockDDDAccreditationCycle.findById.mockReturnThis();
      mockDDDAccreditationCycle.lean.mockResolvedValue({ _id: 'c1' });
      expect(await service.getCycleById('c1')).toEqual({ _id: 'c1' });
    });
  });

  describe('updateCycle', () => {
    it('updates via _update', async () => {
      mockDDDAccreditationCycle.findByIdAndUpdate.mockReturnThis();
      mockDDDAccreditationCycle.lean.mockResolvedValue({ _id: 'c1', status: 'awarded' });
      const r = await service.updateCycle('c1', { status: 'awarded' });
      expect(r.status).toBe('awarded');
    });
  });

  /* ── Self Assessments ── */
  describe('createSelfAssessment', () => {
    it('creates via _create', async () => {
      mockDDDSelfAssessment.create.mockResolvedValue({ _id: 'sa1' });
      expect(await service.createSelfAssessment({ chapter: 'leadership' })).toHaveProperty('_id');
    });
  });

  describe('listSelfAssessments', () => {
    it('returns list sorted by assessmentDate desc', async () => {
      mockDDDSelfAssessment.find.mockReturnThis();
      mockDDDSelfAssessment.sort.mockReturnThis();
      mockDDDSelfAssessment.lean.mockResolvedValue([]);
      const r = await service.listSelfAssessments({});
      expect(mockDDDSelfAssessment.sort).toHaveBeenCalledWith({ assessmentDate: -1 });
      expect(r).toEqual([]);
    });
  });

  /* ── Survey Findings ── */
  describe('createFinding', () => {
    it('creates via _create', async () => {
      mockDDDSurveyFinding.create.mockResolvedValue({ _id: 'f1' });
      expect(await service.createFinding({ severity: 'critical' })).toHaveProperty('_id');
    });
  });

  describe('listFindings', () => {
    it('returns list sorted by createdAt desc', async () => {
      mockDDDSurveyFinding.find.mockReturnThis();
      mockDDDSurveyFinding.sort.mockReturnThis();
      mockDDDSurveyFinding.lean.mockResolvedValue([{ _id: 'f1' }]);
      expect(await service.listFindings({})).toHaveLength(1);
    });
  });

  /* ── Corrective Actions ── */
  describe('createCorrectiveAction', () => {
    it('creates via _create', async () => {
      mockDDDCorrectiveAction.create.mockResolvedValue({ _id: 'ca1' });
      expect(await service.createCorrectiveAction({ description: 'Fix' })).toHaveProperty('_id');
    });
  });

  describe('listCorrectiveActions', () => {
    it('returns list sorted by targetDate asc', async () => {
      mockDDDCorrectiveAction.find.mockReturnThis();
      mockDDDCorrectiveAction.sort.mockReturnThis();
      mockDDDCorrectiveAction.lean.mockResolvedValue([]);
      await service.listCorrectiveActions({});
      expect(mockDDDCorrectiveAction.sort).toHaveBeenCalledWith({ targetDate: 1 });
    });
  });

  describe('updateCorrectiveAction', () => {
    it('updates via _update', async () => {
      mockDDDCorrectiveAction.findByIdAndUpdate.mockReturnThis();
      mockDDDCorrectiveAction.lean.mockResolvedValue({ _id: 'ca1', status: 'closed' });
      expect((await service.updateCorrectiveAction('ca1', { status: 'closed' })).status).toBe(
        'closed'
      );
    });
  });

  /* ── Analytics ── */
  describe('getAccreditationSummary', () => {
    it('returns all counts', async () => {
      mockDDDAccreditationCycle.countDocuments
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5) // awarded
        .mockResolvedValueOnce(3) // preparing
        .mockResolvedValueOnce(2); // expired
      expect(await service.getAccreditationSummary()).toEqual({
        total: 10,
        awarded: 5,
        preparing: 3,
        expired: 2,
      });
    });
  });

  describe('getOverdueActions', () => {
    it('returns overdue corrective actions', async () => {
      mockDDDCorrectiveAction.find.mockReturnThis();
      mockDDDCorrectiveAction.sort.mockReturnThis();
      mockDDDCorrectiveAction.lean.mockResolvedValue([{ _id: 'ca1' }]);
      const r = await service.getOverdueActions();
      expect(r).toHaveLength(1);
      expect(mockDDDCorrectiveAction.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: { $nin: ['closed', 'cancelled', 'verified'] },
        })
      );
    });
  });
});
