'use strict';

/* ── mock-prefixed variables ── */
const mockApprovalPolicyFind = jest.fn();
const mockApprovalPolicyCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'approvalPolicy1', ...d }));
const mockApprovalPolicyCount = jest.fn().mockResolvedValue(0);
const mockApprovalRequestFind = jest.fn();
const mockApprovalRequestCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'approvalRequest1', ...d }));
const mockApprovalRequestCount = jest.fn().mockResolvedValue(0);
const mockDelegationFind = jest.fn();
const mockDelegationCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'delegation1', ...d }));
const mockDelegationCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddApprovalChain', () => ({
  DDDApprovalPolicy: {
    find: mockApprovalPolicyFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'approvalPolicy1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'approvalPolicy1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockApprovalPolicyCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'approvalPolicy1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'approvalPolicy1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'approvalPolicy1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'approvalPolicy1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'approvalPolicy1' }) }),
    countDocuments: mockApprovalPolicyCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDApprovalRequest: {
    find: mockApprovalRequestFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'approvalRequest1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'approvalRequest1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockApprovalRequestCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'approvalRequest1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'approvalRequest1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'approvalRequest1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'approvalRequest1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'approvalRequest1' }) }),
    countDocuments: mockApprovalRequestCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDDelegation: {
    find: mockDelegationFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'delegation1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'delegation1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDelegationCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'delegation1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'delegation1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'delegation1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'delegation1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'delegation1' }) }),
    countDocuments: mockDelegationCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  APPROVAL_TYPES: ['item1', 'item2'],
  APPROVAL_STATUSES: ['item1', 'item2'],
  ESCALATION_TRIGGERS: ['item1', 'item2'],
  DELEGATION_TYPES: ['item1', 'item2'],
  BUILTIN_APPROVAL_POLICIES: ['item1', 'item2'],

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

const svc = require('../../services/dddApprovalChain');

describe('dddApprovalChain service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _approvalPolicyL = jest.fn().mockResolvedValue([]);
    const _approvalPolicyLim = jest.fn().mockReturnValue({ lean: _approvalPolicyL });
    const _approvalPolicyS = jest.fn().mockReturnValue({ limit: _approvalPolicyLim, lean: _approvalPolicyL, populate: jest.fn().mockReturnValue({ lean: _approvalPolicyL }) });
    mockApprovalPolicyFind.mockReturnValue({ sort: _approvalPolicyS, lean: _approvalPolicyL, limit: _approvalPolicyLim, populate: jest.fn().mockReturnValue({ lean: _approvalPolicyL, sort: _approvalPolicyS }) });
    const _approvalRequestL = jest.fn().mockResolvedValue([]);
    const _approvalRequestLim = jest.fn().mockReturnValue({ lean: _approvalRequestL });
    const _approvalRequestS = jest.fn().mockReturnValue({ limit: _approvalRequestLim, lean: _approvalRequestL, populate: jest.fn().mockReturnValue({ lean: _approvalRequestL }) });
    mockApprovalRequestFind.mockReturnValue({ sort: _approvalRequestS, lean: _approvalRequestL, limit: _approvalRequestLim, populate: jest.fn().mockReturnValue({ lean: _approvalRequestL, sort: _approvalRequestS }) });
    const _delegationL = jest.fn().mockResolvedValue([]);
    const _delegationLim = jest.fn().mockReturnValue({ lean: _delegationL });
    const _delegationS = jest.fn().mockReturnValue({ limit: _delegationLim, lean: _delegationL, populate: jest.fn().mockReturnValue({ lean: _delegationL }) });
    mockDelegationFind.mockReturnValue({ sort: _delegationS, lean: _delegationL, limit: _delegationLim, populate: jest.fn().mockReturnValue({ lean: _delegationL, sort: _delegationS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc).not.toBeNull();
  });


  test('listPolicies is callable', () => {
    expect(typeof svc.listPolicies).toBe('function');
  });

  test('getPolicy is callable', () => {
    expect(typeof svc.getPolicy).toBe('function');
  });

  test('createPolicy is callable', () => {
    expect(typeof svc.createPolicy).toBe('function');
  });

  test('updatePolicy is callable', () => {
    expect(typeof svc.updatePolicy).toBe('function');
  });

  test('createRequest is callable', () => {
    expect(typeof svc.createRequest).toBe('function');
  });

  test('listRequests is callable', () => {
    expect(typeof svc.listRequests).toBe('function');
  });

  test('getRequest is callable', () => {
    expect(typeof svc.getRequest).toBe('function');
  });

  test('decide is callable', () => {
    expect(typeof svc.decide).toBe('function');
  });

  test('escalate is callable', () => {
    expect(typeof svc.escalate).toBe('function');
  });

  test('cancelRequest is callable', () => {
    expect(typeof svc.cancelRequest).toBe('function');
  });

  test('getPendingForUser is callable', () => {
    expect(typeof svc.getPendingForUser).toBe('function');
  });

  test('createDelegation is callable', () => {
    expect(typeof svc.createDelegation).toBe('function');
  });

  test('listDelegations is callable', () => {
    expect(typeof svc.listDelegations).toBe('function');
  });

  test('revokeDelegation is callable', () => {
    expect(typeof svc.revokeDelegation).toBe('function');
  });

  test('autoEscalate is callable', () => {
    expect(typeof svc.autoEscalate).toBe('function');
  });

  test('getStats is callable', () => {
    expect(typeof svc.getStats).toBe('function');
  });
});
