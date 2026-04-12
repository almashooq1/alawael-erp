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

const mockDDDResearchStudy = makeModel();
const mockDDDIrbSubmission = makeModel();
const mockDDDEthicsReview = makeModel();
const mockDDDResearchFunding = makeModel();

jest.mock('../../models/DddClinicalResearch', () => ({
  DDDResearchStudy: mockDDDResearchStudy,
  DDDIrbSubmission: mockDDDIrbSubmission,
  DDDEthicsReview: mockDDDEthicsReview,
  DDDResearchFunding: mockDDDResearchFunding,
  RESEARCH_DOMAINS: ['rehabilitation', 'behavioral'],
  STUDY_STATUSES: ['draft', 'active', 'completed'],
  STUDY_DESIGNS: ['rct', 'cohort', 'case_control'],
  IRB_REVIEW_TYPES: ['full', 'expedited', 'exempt'],
  ETHICS_CATEGORIES: ['human_subjects', 'data_privacy'],
  FUNDING_SOURCES: ['government', 'private', 'internal'],
  BUILTIN_RESEARCH_CONFIGS: [{ code: 'DEFAULT' }],
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

const service = require('../../services/dddClinicalResearch');

beforeEach(() => {
  [mockDDDResearchStudy, mockDDDIrbSubmission, mockDDDEthicsReview, mockDDDResearchFunding].forEach(
    M => {
      Object.values(M).forEach(v => {
        if (typeof v === 'function' && v.mockClear) v.mockClear();
      });
    }
  );
});

describe('dddClinicalResearch', () => {
  /* ── Studies ── */
  describe('createStudy', () => {
    it('creates via _create', async () => {
      mockDDDResearchStudy.create.mockResolvedValue({ _id: 's1' });
      expect(await service.createStudy({ title: 'RCT' })).toHaveProperty('_id');
    });
  });

  describe('listStudies', () => {
    it('returns sorted by createdAt desc', async () => {
      mockDDDResearchStudy.find.mockReturnThis();
      mockDDDResearchStudy.sort.mockReturnThis();
      mockDDDResearchStudy.lean.mockResolvedValue([{ _id: 's1' }]);
      expect(await service.listStudies({})).toHaveLength(1);
      expect(mockDDDResearchStudy.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('updateStudy', () => {
    it('updates via _update', async () => {
      mockDDDResearchStudy.findByIdAndUpdate.mockReturnThis();
      mockDDDResearchStudy.lean.mockResolvedValue({ _id: 's1', status: 'active' });
      expect((await service.updateStudy('s1', { status: 'active' })).status).toBe('active');
    });
  });

  /* ── IRB Submissions ── */
  describe('submitIrb', () => {
    it('creates via _create', async () => {
      mockDDDIrbSubmission.create.mockResolvedValue({ _id: 'irb1' });
      expect(await service.submitIrb({ studyId: 's1' })).toHaveProperty('_id');
    });
  });

  describe('listIrbSubmissions', () => {
    it('returns sorted by submittedAt desc', async () => {
      mockDDDIrbSubmission.find.mockReturnThis();
      mockDDDIrbSubmission.sort.mockReturnThis();
      mockDDDIrbSubmission.lean.mockResolvedValue([]);
      expect(await service.listIrbSubmissions({})).toEqual([]);
      expect(mockDDDIrbSubmission.sort).toHaveBeenCalledWith({ submittedAt: -1 });
    });
  });

  /* ── Ethics Reviews ── */
  describe('createEthicsReview', () => {
    it('creates via _create', async () => {
      mockDDDEthicsReview.create.mockResolvedValue({ _id: 'er1' });
      expect(await service.createEthicsReview({ studyId: 's1' })).toHaveProperty('_id');
    });
  });

  describe('listEthicsReviews', () => {
    it('returns sorted by reviewDate desc', async () => {
      mockDDDEthicsReview.find.mockReturnThis();
      mockDDDEthicsReview.sort.mockReturnThis();
      mockDDDEthicsReview.lean.mockResolvedValue([]);
      expect(await service.listEthicsReviews({})).toEqual([]);
      expect(mockDDDEthicsReview.sort).toHaveBeenCalledWith({ reviewDate: -1 });
    });
  });

  /* ── Funding ── */
  describe('createFunding', () => {
    it('creates via _create', async () => {
      mockDDDResearchFunding.create.mockResolvedValue({ _id: 'f1' });
      expect(await service.createFunding({ source: 'government' })).toHaveProperty('_id');
    });
  });

  describe('listFunding', () => {
    it('returns sorted by startDate desc', async () => {
      mockDDDResearchFunding.find.mockReturnThis();
      mockDDDResearchFunding.sort.mockReturnThis();
      mockDDDResearchFunding.lean.mockResolvedValue([]);
      expect(await service.listFunding({})).toEqual([]);
      expect(mockDDDResearchFunding.sort).toHaveBeenCalledWith({ startDate: -1 });
    });
  });

  /* ── Stats ── */
  describe('getResearchStats', () => {
    it('returns totalStudies, activeStudies, pendingIrb, activeFunding', async () => {
      mockDDDResearchStudy.countDocuments
        .mockResolvedValueOnce(20) // total
        .mockResolvedValueOnce(8); // active
      mockDDDIrbSubmission.countDocuments.mockResolvedValue(3);
      mockDDDResearchFunding.countDocuments.mockResolvedValue(5);
      const r = await service.getResearchStats();
      expect(r).toEqual({
        totalStudies: 20,
        activeStudies: 8,
        pendingIrb: 3,
        activeFunding: 5,
      });
    });
  });
});
