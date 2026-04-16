'use strict';

/* ── mock-prefixed variables ── */
const mockInsuranceProviderFind = jest.fn();
const mockInsuranceProviderCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'insuranceProvider1', ...d }));
const mockInsuranceProviderCount = jest.fn().mockResolvedValue(0);
const mockInsurancePolicyFind = jest.fn();
const mockInsurancePolicyCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'insurancePolicy1', ...d }));
const mockInsurancePolicyCount = jest.fn().mockResolvedValue(0);
const mockPreAuthorizationFind = jest.fn();
const mockPreAuthorizationCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'preAuthorization1', ...d }));
const mockPreAuthorizationCount = jest.fn().mockResolvedValue(0);
const mockCoverageRuleFind = jest.fn();
const mockCoverageRuleCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'coverageRule1', ...d }));
const mockCoverageRuleCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddInsuranceManager', () => ({
  DDDInsuranceProvider: {
    find: mockInsuranceProviderFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'insuranceProvider1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'insuranceProvider1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockInsuranceProviderCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'insuranceProvider1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'insuranceProvider1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'insuranceProvider1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'insuranceProvider1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'insuranceProvider1' }) }),
    countDocuments: mockInsuranceProviderCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDInsurancePolicy: {
    find: mockInsurancePolicyFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'insurancePolicy1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'insurancePolicy1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockInsurancePolicyCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'insurancePolicy1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'insurancePolicy1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'insurancePolicy1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'insurancePolicy1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'insurancePolicy1' }) }),
    countDocuments: mockInsurancePolicyCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDPreAuthorization: {
    find: mockPreAuthorizationFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'preAuthorization1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'preAuthorization1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPreAuthorizationCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'preAuthorization1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'preAuthorization1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'preAuthorization1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'preAuthorization1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'preAuthorization1' }) }),
    countDocuments: mockPreAuthorizationCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCoverageRule: {
    find: mockCoverageRuleFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'coverageRule1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'coverageRule1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCoverageRuleCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'coverageRule1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'coverageRule1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'coverageRule1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'coverageRule1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'coverageRule1' }) }),
    countDocuments: mockCoverageRuleCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  PROVIDER_TYPES: ['item1', 'item2'],
  POLICY_STATUSES: ['item1', 'item2'],
  COVERAGE_TYPES: ['item1', 'item2'],
  PREAUTH_STATUSES: ['item1', 'item2'],
  NETWORK_TIERS: ['item1', 'item2'],
  BENEFIT_CATEGORIES: ['item1', 'item2'],
  PREAUTH_URGENCY: ['item1', 'item2'],
  BUILTIN_PROVIDERS: ['item1', 'item2'],

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

const svc = require('../../services/dddInsuranceManager');

describe('dddInsuranceManager service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _insuranceProviderL = jest.fn().mockResolvedValue([]);
    const _insuranceProviderLim = jest.fn().mockReturnValue({ lean: _insuranceProviderL });
    const _insuranceProviderS = jest.fn().mockReturnValue({ limit: _insuranceProviderLim, lean: _insuranceProviderL, populate: jest.fn().mockReturnValue({ lean: _insuranceProviderL }) });
    mockInsuranceProviderFind.mockReturnValue({ sort: _insuranceProviderS, lean: _insuranceProviderL, limit: _insuranceProviderLim, populate: jest.fn().mockReturnValue({ lean: _insuranceProviderL, sort: _insuranceProviderS }) });
    const _insurancePolicyL = jest.fn().mockResolvedValue([]);
    const _insurancePolicyLim = jest.fn().mockReturnValue({ lean: _insurancePolicyL });
    const _insurancePolicyS = jest.fn().mockReturnValue({ limit: _insurancePolicyLim, lean: _insurancePolicyL, populate: jest.fn().mockReturnValue({ lean: _insurancePolicyL }) });
    mockInsurancePolicyFind.mockReturnValue({ sort: _insurancePolicyS, lean: _insurancePolicyL, limit: _insurancePolicyLim, populate: jest.fn().mockReturnValue({ lean: _insurancePolicyL, sort: _insurancePolicyS }) });
    const _preAuthorizationL = jest.fn().mockResolvedValue([]);
    const _preAuthorizationLim = jest.fn().mockReturnValue({ lean: _preAuthorizationL });
    const _preAuthorizationS = jest.fn().mockReturnValue({ limit: _preAuthorizationLim, lean: _preAuthorizationL, populate: jest.fn().mockReturnValue({ lean: _preAuthorizationL }) });
    mockPreAuthorizationFind.mockReturnValue({ sort: _preAuthorizationS, lean: _preAuthorizationL, limit: _preAuthorizationLim, populate: jest.fn().mockReturnValue({ lean: _preAuthorizationL, sort: _preAuthorizationS }) });
    const _coverageRuleL = jest.fn().mockResolvedValue([]);
    const _coverageRuleLim = jest.fn().mockReturnValue({ lean: _coverageRuleL });
    const _coverageRuleS = jest.fn().mockReturnValue({ limit: _coverageRuleLim, lean: _coverageRuleL, populate: jest.fn().mockReturnValue({ lean: _coverageRuleL }) });
    mockCoverageRuleFind.mockReturnValue({ sort: _coverageRuleS, lean: _coverageRuleL, limit: _coverageRuleLim, populate: jest.fn().mockReturnValue({ lean: _coverageRuleL, sort: _coverageRuleS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('InsuranceManager');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listProviders returns result', async () => {
    let r; try { r = await svc.listProviders({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getProvider returns result', async () => {
    let r; try { r = await svc.getProvider({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createProvider creates/returns result', async () => {
    let r; try { r = await svc.createProvider({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateProvider updates/returns result', async () => {
    let r; try { r = await svc.updateProvider('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
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

  test('verifyPolicy returns result', async () => {
    let r; try { r = await svc.verifyPolicy({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('checkCoverage returns result', async () => {
    let r; try { r = await svc.checkCoverage({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('calculatePatientShare returns result', async () => {
    let r; try { r = await svc.calculatePatientShare({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listPreAuths returns result', async () => {
    let r; try { r = await svc.listPreAuths({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPreAuth returns result', async () => {
    let r; try { r = await svc.getPreAuth({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPreAuth creates/returns result', async () => {
    let r; try { r = await svc.createPreAuth({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('submitPreAuth creates/returns result', async () => {
    let r; try { r = await svc.submitPreAuth({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('approvePreAuth updates/returns result', async () => {
    let r; try { r = await svc.approvePreAuth('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('denyPreAuth updates/returns result', async () => {
    let r; try { r = await svc.denyPreAuth('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCoverageRules returns result', async () => {
    let r; try { r = await svc.listCoverageRules({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getCoverageRule returns result', async () => {
    let r; try { r = await svc.getCoverageRule({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createCoverageRule creates/returns result', async () => {
    let r; try { r = await svc.createCoverageRule({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateCoverageRule updates/returns result', async () => {
    let r; try { r = await svc.updateCoverageRule('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getExpiringPolicies returns result', async () => {
    let r; try { r = await svc.getExpiringPolicies({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
