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

const mockDDDAdvocacyCampaign = makeModel();
const mockDDDPolicyTracker = makeModel();
const mockDDDSelfAdvocacyTraining = makeModel();
const mockDDDStakeholderEngagement = makeModel();

jest.mock('../../models/DddAdvocacyProgram', () => ({
  DDDAdvocacyCampaign: mockDDDAdvocacyCampaign,
  DDDPolicyTracker: mockDDDPolicyTracker,
  DDDSelfAdvocacyTraining: mockDDDSelfAdvocacyTraining,
  DDDStakeholderEngagement: mockDDDStakeholderEngagement,
  ADVOCACY_AREAS: ['rights', 'education', 'employment'],
  CAMPAIGN_TYPES: ['awareness', 'legislative'],
  POLICY_STATUSES: ['monitoring', 'active', 'closed'],
  STAKEHOLDER_TYPES: ['government', 'ngo', 'media'],
  TRAINING_TOPICS: ['self_advocacy', 'legal_rights'],
  ENGAGEMENT_LEVELS: ['high', 'medium', 'low'],
  BUILTIN_ADVOCACY_CONFIGS: [{ code: 'DEFAULT' }],
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

const service = require('../../services/dddAdvocacyProgram');

beforeEach(() => {
  [
    mockDDDAdvocacyCampaign,
    mockDDDPolicyTracker,
    mockDDDSelfAdvocacyTraining,
    mockDDDStakeholderEngagement,
  ].forEach(M => {
    Object.values(M).forEach(v => {
      if (typeof v === 'function' && v.mockClear) v.mockClear();
    });
  });
});

describe('dddAdvocacyProgram', () => {
  /* ── Campaigns ── */
  describe('createCampaign', () => {
    it('creates via _create', async () => {
      mockDDDAdvocacyCampaign.create.mockResolvedValue({ _id: 'c1' });
      expect(await service.createCampaign({ name: 'Rights' })).toHaveProperty('_id');
    });
  });

  describe('listCampaigns', () => {
    it('returns list sorted by createdAt desc', async () => {
      mockDDDAdvocacyCampaign.find.mockReturnThis();
      mockDDDAdvocacyCampaign.sort.mockReturnThis();
      mockDDDAdvocacyCampaign.lean.mockResolvedValue([{ _id: 'c1' }]);
      const r = await service.listCampaigns({});
      expect(r).toHaveLength(1);
      expect(mockDDDAdvocacyCampaign.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('updateCampaign', () => {
    it('updates via _update', async () => {
      mockDDDAdvocacyCampaign.findByIdAndUpdate.mockReturnThis();
      mockDDDAdvocacyCampaign.lean.mockResolvedValue({ _id: 'c1', status: 'completed' });
      expect((await service.updateCampaign('c1', { status: 'completed' })).status).toBe(
        'completed'
      );
    });
  });

  /* ── Policy Trackers ── */
  describe('createPolicy', () => {
    it('creates via _create', async () => {
      mockDDDPolicyTracker.create.mockResolvedValue({ _id: 'p1' });
      expect(await service.createPolicy({ title: 'Education Act' })).toHaveProperty('_id');
    });
  });

  describe('listPolicies', () => {
    it('returns list sorted by lastActionDate desc', async () => {
      mockDDDPolicyTracker.find.mockReturnThis();
      mockDDDPolicyTracker.sort.mockReturnThis();
      mockDDDPolicyTracker.lean.mockResolvedValue([]);
      await service.listPolicies({});
      expect(mockDDDPolicyTracker.sort).toHaveBeenCalledWith({ lastActionDate: -1 });
    });
  });

  /* ── Training ── */
  describe('scheduleTraining', () => {
    it('creates via _create', async () => {
      mockDDDSelfAdvocacyTraining.create.mockResolvedValue({ _id: 't1' });
      expect(await service.scheduleTraining({ topic: 'self_advocacy' })).toHaveProperty('_id');
    });
  });

  describe('listTraining', () => {
    it('returns list sorted by scheduledDate desc', async () => {
      mockDDDSelfAdvocacyTraining.find.mockReturnThis();
      mockDDDSelfAdvocacyTraining.sort.mockReturnThis();
      mockDDDSelfAdvocacyTraining.lean.mockResolvedValue([{ _id: 't1' }]);
      expect(await service.listTraining({})).toHaveLength(1);
    });
  });

  /* ── Engagements ── */
  describe('logEngagement', () => {
    it('creates via _create', async () => {
      mockDDDStakeholderEngagement.create.mockResolvedValue({ _id: 'e1' });
      expect(await service.logEngagement({ type: 'meeting' })).toHaveProperty('_id');
    });
  });

  describe('listEngagements', () => {
    it('returns list sorted by engagementDate desc', async () => {
      mockDDDStakeholderEngagement.find.mockReturnThis();
      mockDDDStakeholderEngagement.sort.mockReturnThis();
      mockDDDStakeholderEngagement.lean.mockResolvedValue([]);
      await service.listEngagements({});
      expect(mockDDDStakeholderEngagement.sort).toHaveBeenCalledWith({ engagementDate: -1 });
    });
  });

  /* ── Stats ── */
  describe('getAdvocacyStats', () => {
    it('returns all counts', async () => {
      mockDDDAdvocacyCampaign.countDocuments.mockResolvedValue(5);
      mockDDDPolicyTracker.countDocuments.mockResolvedValue(3);
      mockDDDSelfAdvocacyTraining.countDocuments.mockResolvedValue(10);
      mockDDDStakeholderEngagement.countDocuments.mockResolvedValue(20);
      const r = await service.getAdvocacyStats();
      expect(r).toEqual({
        activeCampaigns: 5,
        monitoredPolicies: 3,
        completedTrainings: 10,
        totalEngagements: 20,
      });
    });

    it('returns zeros when empty', async () => {
      mockDDDAdvocacyCampaign.countDocuments.mockResolvedValue(0);
      mockDDDPolicyTracker.countDocuments.mockResolvedValue(0);
      mockDDDSelfAdvocacyTraining.countDocuments.mockResolvedValue(0);
      mockDDDStakeholderEngagement.countDocuments.mockResolvedValue(0);
      const r = await service.getAdvocacyStats();
      expect(r).toEqual({
        activeCampaigns: 0,
        monitoredPolicies: 0,
        completedTrainings: 0,
        totalEngagements: 0,
      });
    });
  });
});
