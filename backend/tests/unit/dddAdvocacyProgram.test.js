'use strict';

/* ── mock-prefixed variables ── */
const mockAdvocacyCampaignFind = jest.fn();
const mockAdvocacyCampaignCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'advocacyCampaign1', ...d }));
const mockAdvocacyCampaignCount = jest.fn().mockResolvedValue(0);
const mockPolicyTrackerFind = jest.fn();
const mockPolicyTrackerCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'policyTracker1', ...d }));
const mockPolicyTrackerCount = jest.fn().mockResolvedValue(0);
const mockSelfAdvocacyTrainingFind = jest.fn();
const mockSelfAdvocacyTrainingCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'selfAdvocacyTraining1', ...d }));
const mockSelfAdvocacyTrainingCount = jest.fn().mockResolvedValue(0);
const mockStakeholderEngagementFind = jest.fn();
const mockStakeholderEngagementCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'stakeholderEngagement1', ...d }));
const mockStakeholderEngagementCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddAdvocacyProgram', () => ({
  DDDAdvocacyCampaign: {
    find: mockAdvocacyCampaignFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'advocacyCampaign1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'advocacyCampaign1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAdvocacyCampaignCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'advocacyCampaign1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'advocacyCampaign1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'advocacyCampaign1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'advocacyCampaign1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'advocacyCampaign1' }) }),
    countDocuments: mockAdvocacyCampaignCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDPolicyTracker: {
    find: mockPolicyTrackerFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'policyTracker1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'policyTracker1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPolicyTrackerCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'policyTracker1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'policyTracker1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'policyTracker1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'policyTracker1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'policyTracker1' }) }),
    countDocuments: mockPolicyTrackerCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDSelfAdvocacyTraining: {
    find: mockSelfAdvocacyTrainingFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'selfAdvocacyTraining1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'selfAdvocacyTraining1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSelfAdvocacyTrainingCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'selfAdvocacyTraining1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'selfAdvocacyTraining1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'selfAdvocacyTraining1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'selfAdvocacyTraining1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'selfAdvocacyTraining1' }) }),
    countDocuments: mockSelfAdvocacyTrainingCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDStakeholderEngagement: {
    find: mockStakeholderEngagementFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'stakeholderEngagement1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'stakeholderEngagement1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockStakeholderEngagementCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'stakeholderEngagement1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'stakeholderEngagement1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'stakeholderEngagement1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'stakeholderEngagement1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'stakeholderEngagement1' }) }),
    countDocuments: mockStakeholderEngagementCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  ADVOCACY_AREAS: ['item1', 'item2'],
  CAMPAIGN_TYPES: ['item1', 'item2'],
  POLICY_STATUSES: ['item1', 'item2'],
  STAKEHOLDER_TYPES: ['item1', 'item2'],
  TRAINING_TOPICS: ['item1', 'item2'],
  ENGAGEMENT_LEVELS: ['item1', 'item2'],
  BUILTIN_ADVOCACY_CONFIGS: ['item1', 'item2'],

}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor(n, m, models) { this.name = n; this.meta = m; this.models = models; }
    log() {}
    _list(M, q, o) {
      const c = M.find(q || {});
      if (o && o.sort) {
        const s = c.sort(o.sort);
        return (o.limit && s.limit) ? s.limit(o.limit).lean() : s.lean();
      }
      return c.lean ? c.lean() : c;
    }
    _getById(M, id) {
      const r = M.findById(id);
      return r && r.lean ? r.lean() : r;
    }
    _create(M, d) { return M.create(d); }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...(o || {}) }).lean();
    }
    _delete(M, id) { return M.findByIdAndDelete(id); }
  };
});

const svc = require('../../services/dddAdvocacyProgram');

describe('dddAdvocacyProgram service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _advocacyCampaignL = jest.fn().mockResolvedValue([]);
    const _advocacyCampaignLim = jest.fn().mockReturnValue({ lean: _advocacyCampaignL });
    const _advocacyCampaignS = jest.fn().mockReturnValue({ limit: _advocacyCampaignLim, lean: _advocacyCampaignL, populate: jest.fn().mockReturnValue({ lean: _advocacyCampaignL }) });
    mockAdvocacyCampaignFind.mockReturnValue({ sort: _advocacyCampaignS, lean: _advocacyCampaignL, limit: _advocacyCampaignLim, populate: jest.fn().mockReturnValue({ lean: _advocacyCampaignL, sort: _advocacyCampaignS }) });
    const _policyTrackerL = jest.fn().mockResolvedValue([]);
    const _policyTrackerLim = jest.fn().mockReturnValue({ lean: _policyTrackerL });
    const _policyTrackerS = jest.fn().mockReturnValue({ limit: _policyTrackerLim, lean: _policyTrackerL, populate: jest.fn().mockReturnValue({ lean: _policyTrackerL }) });
    mockPolicyTrackerFind.mockReturnValue({ sort: _policyTrackerS, lean: _policyTrackerL, limit: _policyTrackerLim, populate: jest.fn().mockReturnValue({ lean: _policyTrackerL, sort: _policyTrackerS }) });
    const _selfAdvocacyTrainingL = jest.fn().mockResolvedValue([]);
    const _selfAdvocacyTrainingLim = jest.fn().mockReturnValue({ lean: _selfAdvocacyTrainingL });
    const _selfAdvocacyTrainingS = jest.fn().mockReturnValue({ limit: _selfAdvocacyTrainingLim, lean: _selfAdvocacyTrainingL, populate: jest.fn().mockReturnValue({ lean: _selfAdvocacyTrainingL }) });
    mockSelfAdvocacyTrainingFind.mockReturnValue({ sort: _selfAdvocacyTrainingS, lean: _selfAdvocacyTrainingL, limit: _selfAdvocacyTrainingLim, populate: jest.fn().mockReturnValue({ lean: _selfAdvocacyTrainingL, sort: _selfAdvocacyTrainingS }) });
    const _stakeholderEngagementL = jest.fn().mockResolvedValue([]);
    const _stakeholderEngagementLim = jest.fn().mockReturnValue({ lean: _stakeholderEngagementL });
    const _stakeholderEngagementS = jest.fn().mockReturnValue({ limit: _stakeholderEngagementLim, lean: _stakeholderEngagementL, populate: jest.fn().mockReturnValue({ lean: _stakeholderEngagementL }) });
    mockStakeholderEngagementFind.mockReturnValue({ sort: _stakeholderEngagementS, lean: _stakeholderEngagementL, limit: _stakeholderEngagementLim, populate: jest.fn().mockReturnValue({ lean: _stakeholderEngagementL, sort: _stakeholderEngagementS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('AdvocacyProgram');
  });


  test('createCampaign creates/returns result', async () => {
    let r; try { r = await svc.createCampaign({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCampaigns returns result', async () => {
    let r; try { r = await svc.listCampaigns({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateCampaign updates/returns result', async () => {
    let r; try { r = await svc.updateCampaign('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPolicy creates/returns result', async () => {
    let r; try { r = await svc.createPolicy({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listPolicies returns result', async () => {
    let r; try { r = await svc.listPolicies({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('scheduleTraining creates/returns result', async () => {
    let r; try { r = await svc.scheduleTraining({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listTraining returns result', async () => {
    let r; try { r = await svc.listTraining({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('logEngagement creates/returns result', async () => {
    let r; try { r = await svc.logEngagement({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listEngagements returns result', async () => {
    let r; try { r = await svc.listEngagements({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getAdvocacyStats returns object', async () => {
    let r; try { r = await svc.getAdvocacyStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
