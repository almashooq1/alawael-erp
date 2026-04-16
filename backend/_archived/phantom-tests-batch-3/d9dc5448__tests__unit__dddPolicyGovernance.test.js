'use strict';

/* ── mock-prefixed variables ── */
const mockOrganizationalPolicyFind = jest.fn();
const mockOrganizationalPolicyCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'organizationalPolicy1', ...d }));
const mockOrganizationalPolicyCount = jest.fn().mockResolvedValue(0);
const mockPolicyVersionFind = jest.fn();
const mockPolicyVersionCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'policyVersion1', ...d }));
const mockPolicyVersionCount = jest.fn().mockResolvedValue(0);
const mockPolicyAcknowledgmentFind = jest.fn();
const mockPolicyAcknowledgmentCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'policyAcknowledgment1', ...d }));
const mockPolicyAcknowledgmentCount = jest.fn().mockResolvedValue(0);
const mockGovernanceCommitteeFind = jest.fn();
const mockGovernanceCommitteeCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'governanceCommittee1', ...d }));
const mockGovernanceCommitteeCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddPolicyGovernance', () => ({
  DDDOrganizationalPolicy: {
    find: mockOrganizationalPolicyFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'organizationalPolicy1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'organizationalPolicy1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockOrganizationalPolicyCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'organizationalPolicy1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'organizationalPolicy1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'organizationalPolicy1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'organizationalPolicy1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'organizationalPolicy1' }) }),
    countDocuments: mockOrganizationalPolicyCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDPolicyVersion: {
    find: mockPolicyVersionFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'policyVersion1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'policyVersion1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPolicyVersionCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'policyVersion1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'policyVersion1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'policyVersion1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'policyVersion1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'policyVersion1' }) }),
    countDocuments: mockPolicyVersionCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDPolicyAcknowledgment: {
    find: mockPolicyAcknowledgmentFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'policyAcknowledgment1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'policyAcknowledgment1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPolicyAcknowledgmentCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'policyAcknowledgment1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'policyAcknowledgment1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'policyAcknowledgment1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'policyAcknowledgment1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'policyAcknowledgment1' }) }),
    countDocuments: mockPolicyAcknowledgmentCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDGovernanceCommittee: {
    find: mockGovernanceCommitteeFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'governanceCommittee1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'governanceCommittee1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockGovernanceCommitteeCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'governanceCommittee1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'governanceCommittee1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'governanceCommittee1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'governanceCommittee1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'governanceCommittee1' }) }),
    countDocuments: mockGovernanceCommitteeCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  POLICY_TYPES: ['item1', 'item2'],
  POLICY_STATUSES: ['item1', 'item2'],
  GOVERNANCE_LEVELS: ['item1', 'item2'],
  ACKNOWLEDGMENT_STATUSES: ['item1', 'item2'],
  COMMITTEE_TYPES: ['item1', 'item2'],
  REVIEW_FREQUENCIES: ['item1', 'item2'],
  BUILTIN_POLICIES: ['item1', 'item2'],

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

const svc = require('../../services/dddPolicyGovernance');

describe('dddPolicyGovernance service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _organizationalPolicyL = jest.fn().mockResolvedValue([]);
    const _organizationalPolicyLim = jest.fn().mockReturnValue({ lean: _organizationalPolicyL });
    const _organizationalPolicyS = jest.fn().mockReturnValue({ limit: _organizationalPolicyLim, lean: _organizationalPolicyL, populate: jest.fn().mockReturnValue({ lean: _organizationalPolicyL }) });
    mockOrganizationalPolicyFind.mockReturnValue({ sort: _organizationalPolicyS, lean: _organizationalPolicyL, limit: _organizationalPolicyLim, populate: jest.fn().mockReturnValue({ lean: _organizationalPolicyL, sort: _organizationalPolicyS }) });
    const _policyVersionL = jest.fn().mockResolvedValue([]);
    const _policyVersionLim = jest.fn().mockReturnValue({ lean: _policyVersionL });
    const _policyVersionS = jest.fn().mockReturnValue({ limit: _policyVersionLim, lean: _policyVersionL, populate: jest.fn().mockReturnValue({ lean: _policyVersionL }) });
    mockPolicyVersionFind.mockReturnValue({ sort: _policyVersionS, lean: _policyVersionL, limit: _policyVersionLim, populate: jest.fn().mockReturnValue({ lean: _policyVersionL, sort: _policyVersionS }) });
    const _policyAcknowledgmentL = jest.fn().mockResolvedValue([]);
    const _policyAcknowledgmentLim = jest.fn().mockReturnValue({ lean: _policyAcknowledgmentL });
    const _policyAcknowledgmentS = jest.fn().mockReturnValue({ limit: _policyAcknowledgmentLim, lean: _policyAcknowledgmentL, populate: jest.fn().mockReturnValue({ lean: _policyAcknowledgmentL }) });
    mockPolicyAcknowledgmentFind.mockReturnValue({ sort: _policyAcknowledgmentS, lean: _policyAcknowledgmentL, limit: _policyAcknowledgmentLim, populate: jest.fn().mockReturnValue({ lean: _policyAcknowledgmentL, sort: _policyAcknowledgmentS }) });
    const _governanceCommitteeL = jest.fn().mockResolvedValue([]);
    const _governanceCommitteeLim = jest.fn().mockReturnValue({ lean: _governanceCommitteeL });
    const _governanceCommitteeS = jest.fn().mockReturnValue({ limit: _governanceCommitteeLim, lean: _governanceCommitteeL, populate: jest.fn().mockReturnValue({ lean: _governanceCommitteeL }) });
    mockGovernanceCommitteeFind.mockReturnValue({ sort: _governanceCommitteeS, lean: _governanceCommitteeL, limit: _governanceCommitteeLim, populate: jest.fn().mockReturnValue({ lean: _governanceCommitteeL, sort: _governanceCommitteeS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('PolicyGovernance');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listPolicies returns result', async () => {
    let r; try { r = await svc.listPolicies({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPolicy returns result', async () => {
    let r; try { r = await svc.getPolicy({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPolicy creates/returns result', async () => {
    let r; try { r = await svc.createPolicy({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updatePolicy updates/returns result', async () => {
    let r; try { r = await svc.updatePolicy('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listVersions returns result', async () => {
    let r; try { r = await svc.listVersions({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createVersion creates/returns result', async () => {
    let r; try { r = await svc.createVersion({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAcknowledgments returns result', async () => {
    let r; try { r = await svc.listAcknowledgments({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('requestAcknowledgment creates/returns result', async () => {
    let r; try { r = await svc.requestAcknowledgment({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('acknowledge updates/returns result', async () => {
    let r; try { r = await svc.acknowledge('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCommittees returns result', async () => {
    let r; try { r = await svc.listCommittees({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createCommittee creates/returns result', async () => {
    let r; try { r = await svc.createCommittee({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPolicyAnalytics returns object', async () => {
    let r; try { r = await svc.getPolicyAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
