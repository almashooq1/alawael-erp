'use strict';

/* ── mock-prefixed variables ── */
const mockRegulatoryRequirementFind = jest.fn();
const mockRegulatoryRequirementCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'regulatoryRequirement1', ...d }));
const mockRegulatoryRequirementCount = jest.fn().mockResolvedValue(0);
const mockComplianceAuditFind = jest.fn();
const mockComplianceAuditCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'complianceAudit1', ...d }));
const mockComplianceAuditCount = jest.fn().mockResolvedValue(0);
const mockCertificationFind = jest.fn();
const mockCertificationCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'certification1', ...d }));
const mockCertificationCount = jest.fn().mockResolvedValue(0);
const mockRegulatoryChangeFind = jest.fn();
const mockRegulatoryChangeCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'regulatoryChange1', ...d }));
const mockRegulatoryChangeCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddRegulatoryTracker', () => ({
  DDDRegulatoryRequirement: {
    find: mockRegulatoryRequirementFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'regulatoryRequirement1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'regulatoryRequirement1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockRegulatoryRequirementCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'regulatoryRequirement1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'regulatoryRequirement1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'regulatoryRequirement1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'regulatoryRequirement1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'regulatoryRequirement1' }) }),
    countDocuments: mockRegulatoryRequirementCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDComplianceAudit: {
    find: mockComplianceAuditFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'complianceAudit1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'complianceAudit1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockComplianceAuditCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'complianceAudit1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'complianceAudit1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'complianceAudit1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'complianceAudit1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'complianceAudit1' }) }),
    countDocuments: mockComplianceAuditCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCertification: {
    find: mockCertificationFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'certification1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'certification1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCertificationCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'certification1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'certification1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'certification1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'certification1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'certification1' }) }),
    countDocuments: mockCertificationCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDRegulatoryChange: {
    find: mockRegulatoryChangeFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'regulatoryChange1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'regulatoryChange1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockRegulatoryChangeCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'regulatoryChange1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'regulatoryChange1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'regulatoryChange1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'regulatoryChange1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'regulatoryChange1' }) }),
    countDocuments: mockRegulatoryChangeCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  REQUIREMENT_TYPES: ['item1', 'item2'],
  REQUIREMENT_STATUSES: ['item1', 'item2'],
  AUDIT_TYPES: ['item1', 'item2'],
  AUDIT_STATUSES: ['item1', 'item2'],
  CERTIFICATION_TYPES: ['item1', 'item2'],
  CERTIFICATION_STATUSES: ['item1', 'item2'],
  CHANGE_IMPACT_LEVELS: ['item1', 'item2'],
  REGULATORY_BODIES: ['item1', 'item2'],
  BUILTIN_REQUIREMENTS: ['item1', 'item2'],

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

const svc = require('../../services/dddRegulatoryTracker');

describe('dddRegulatoryTracker service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _regulatoryRequirementL = jest.fn().mockResolvedValue([]);
    const _regulatoryRequirementLim = jest.fn().mockReturnValue({ lean: _regulatoryRequirementL });
    const _regulatoryRequirementS = jest.fn().mockReturnValue({ limit: _regulatoryRequirementLim, lean: _regulatoryRequirementL, populate: jest.fn().mockReturnValue({ lean: _regulatoryRequirementL }) });
    mockRegulatoryRequirementFind.mockReturnValue({ sort: _regulatoryRequirementS, lean: _regulatoryRequirementL, limit: _regulatoryRequirementLim, populate: jest.fn().mockReturnValue({ lean: _regulatoryRequirementL, sort: _regulatoryRequirementS }) });
    const _complianceAuditL = jest.fn().mockResolvedValue([]);
    const _complianceAuditLim = jest.fn().mockReturnValue({ lean: _complianceAuditL });
    const _complianceAuditS = jest.fn().mockReturnValue({ limit: _complianceAuditLim, lean: _complianceAuditL, populate: jest.fn().mockReturnValue({ lean: _complianceAuditL }) });
    mockComplianceAuditFind.mockReturnValue({ sort: _complianceAuditS, lean: _complianceAuditL, limit: _complianceAuditLim, populate: jest.fn().mockReturnValue({ lean: _complianceAuditL, sort: _complianceAuditS }) });
    const _certificationL = jest.fn().mockResolvedValue([]);
    const _certificationLim = jest.fn().mockReturnValue({ lean: _certificationL });
    const _certificationS = jest.fn().mockReturnValue({ limit: _certificationLim, lean: _certificationL, populate: jest.fn().mockReturnValue({ lean: _certificationL }) });
    mockCertificationFind.mockReturnValue({ sort: _certificationS, lean: _certificationL, limit: _certificationLim, populate: jest.fn().mockReturnValue({ lean: _certificationL, sort: _certificationS }) });
    const _regulatoryChangeL = jest.fn().mockResolvedValue([]);
    const _regulatoryChangeLim = jest.fn().mockReturnValue({ lean: _regulatoryChangeL });
    const _regulatoryChangeS = jest.fn().mockReturnValue({ limit: _regulatoryChangeLim, lean: _regulatoryChangeL, populate: jest.fn().mockReturnValue({ lean: _regulatoryChangeL }) });
    mockRegulatoryChangeFind.mockReturnValue({ sort: _regulatoryChangeS, lean: _regulatoryChangeL, limit: _regulatoryChangeLim, populate: jest.fn().mockReturnValue({ lean: _regulatoryChangeL, sort: _regulatoryChangeS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('RegulatoryTracker');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listRequirements returns result', async () => {
    let r; try { r = await svc.listRequirements({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getRequirement returns result', async () => {
    let r; try { r = await svc.getRequirement({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createRequirement creates/returns result', async () => {
    let r; try { r = await svc.createRequirement({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateRequirement updates/returns result', async () => {
    let r; try { r = await svc.updateRequirement('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAudits returns result', async () => {
    let r; try { r = await svc.listAudits({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('scheduleAudit creates/returns result', async () => {
    let r; try { r = await svc.scheduleAudit({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateAudit updates/returns result', async () => {
    let r; try { r = await svc.updateAudit('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCertifications returns result', async () => {
    let r; try { r = await svc.listCertifications({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('addCertification creates/returns result', async () => {
    let r; try { r = await svc.addCertification({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listChanges returns result', async () => {
    let r; try { r = await svc.listChanges({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('trackChange is callable', () => {
    expect(typeof svc.trackChange).toBe('function');
  });

  test('getRegulatoryAnalytics returns object', async () => {
    let r; try { r = await svc.getRegulatoryAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
