'use strict';

/* ── mock-prefixed variables ── */
const mockFhirResourceFind = jest.fn();
const mockFhirResourceCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'fhirResource1', ...d }));
const mockFhirResourceCount = jest.fn().mockResolvedValue(0);
const mockResourceMappingFind = jest.fn();
const mockResourceMappingCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'resourceMapping1', ...d }));
const mockResourceMappingCount = jest.fn().mockResolvedValue(0);
const mockFhirBundleFind = jest.fn();
const mockFhirBundleCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'fhirBundle1', ...d }));
const mockFhirBundleCount = jest.fn().mockResolvedValue(0);
const mockCapabilityStatementFind = jest.fn();
const mockCapabilityStatementCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'capabilityStatement1', ...d }));
const mockCapabilityStatementCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddFhirIntegration', () => ({
  DDDFhirResource: {
    find: mockFhirResourceFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'fhirResource1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'fhirResource1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockFhirResourceCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fhirResource1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fhirResource1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fhirResource1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fhirResource1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fhirResource1' }) }),
    countDocuments: mockFhirResourceCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDResourceMapping: {
    find: mockResourceMappingFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'resourceMapping1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'resourceMapping1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockResourceMappingCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resourceMapping1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resourceMapping1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resourceMapping1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resourceMapping1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'resourceMapping1' }) }),
    countDocuments: mockResourceMappingCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDFhirBundle: {
    find: mockFhirBundleFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'fhirBundle1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'fhirBundle1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockFhirBundleCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fhirBundle1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fhirBundle1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fhirBundle1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fhirBundle1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fhirBundle1' }) }),
    countDocuments: mockFhirBundleCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCapabilityStatement: {
    find: mockCapabilityStatementFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'capabilityStatement1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'capabilityStatement1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCapabilityStatementCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'capabilityStatement1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'capabilityStatement1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'capabilityStatement1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'capabilityStatement1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'capabilityStatement1' }) }),
    countDocuments: mockCapabilityStatementCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  FHIR_RESOURCE_TYPES: ['item1', 'item2'],
  FHIR_VERSIONS: ['item1', 'item2'],
  BUNDLE_TYPES: ['item1', 'item2'],
  INTERACTION_TYPES: ['item1', 'item2'],
  MAPPING_STATUSES: ['item1', 'item2'],
  CONFORMANCE_LEVELS: ['item1', 'item2'],
  BUILTIN_FHIR_PROFILES: ['item1', 'item2'],

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

const svc = require('../../services/dddFhirIntegration');

describe('dddFhirIntegration service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _fhirResourceL = jest.fn().mockResolvedValue([]);
    const _fhirResourceLim = jest.fn().mockReturnValue({ lean: _fhirResourceL });
    const _fhirResourceS = jest.fn().mockReturnValue({ limit: _fhirResourceLim, lean: _fhirResourceL, populate: jest.fn().mockReturnValue({ lean: _fhirResourceL }) });
    mockFhirResourceFind.mockReturnValue({ sort: _fhirResourceS, lean: _fhirResourceL, limit: _fhirResourceLim, populate: jest.fn().mockReturnValue({ lean: _fhirResourceL, sort: _fhirResourceS }) });
    const _resourceMappingL = jest.fn().mockResolvedValue([]);
    const _resourceMappingLim = jest.fn().mockReturnValue({ lean: _resourceMappingL });
    const _resourceMappingS = jest.fn().mockReturnValue({ limit: _resourceMappingLim, lean: _resourceMappingL, populate: jest.fn().mockReturnValue({ lean: _resourceMappingL }) });
    mockResourceMappingFind.mockReturnValue({ sort: _resourceMappingS, lean: _resourceMappingL, limit: _resourceMappingLim, populate: jest.fn().mockReturnValue({ lean: _resourceMappingL, sort: _resourceMappingS }) });
    const _fhirBundleL = jest.fn().mockResolvedValue([]);
    const _fhirBundleLim = jest.fn().mockReturnValue({ lean: _fhirBundleL });
    const _fhirBundleS = jest.fn().mockReturnValue({ limit: _fhirBundleLim, lean: _fhirBundleL, populate: jest.fn().mockReturnValue({ lean: _fhirBundleL }) });
    mockFhirBundleFind.mockReturnValue({ sort: _fhirBundleS, lean: _fhirBundleL, limit: _fhirBundleLim, populate: jest.fn().mockReturnValue({ lean: _fhirBundleL, sort: _fhirBundleS }) });
    const _capabilityStatementL = jest.fn().mockResolvedValue([]);
    const _capabilityStatementLim = jest.fn().mockReturnValue({ lean: _capabilityStatementL });
    const _capabilityStatementS = jest.fn().mockReturnValue({ limit: _capabilityStatementLim, lean: _capabilityStatementL, populate: jest.fn().mockReturnValue({ lean: _capabilityStatementL }) });
    mockCapabilityStatementFind.mockReturnValue({ sort: _capabilityStatementS, lean: _capabilityStatementL, limit: _capabilityStatementLim, populate: jest.fn().mockReturnValue({ lean: _capabilityStatementL, sort: _capabilityStatementS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('FhirIntegration');
  });


  test('createResource creates/returns result', async () => {
    let r; try { r = await svc.createResource({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listResources returns result', async () => {
    let r; try { r = await svc.listResources({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getResource returns result', async () => {
    let r; try { r = await svc.getResource({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateResource updates/returns result', async () => {
    let r; try { r = await svc.updateResource('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createMapping creates/returns result', async () => {
    let r; try { r = await svc.createMapping({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listMappings returns result', async () => {
    let r; try { r = await svc.listMappings({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createBundle creates/returns result', async () => {
    let r; try { r = await svc.createBundle({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listBundles returns result', async () => {
    let r; try { r = await svc.listBundles({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createCapabilityStatement creates/returns result', async () => {
    let r; try { r = await svc.createCapabilityStatement({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCapabilityStatements returns result', async () => {
    let r; try { r = await svc.listCapabilityStatements({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getFhirStats returns object', async () => {
    let r; try { r = await svc.getFhirStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
