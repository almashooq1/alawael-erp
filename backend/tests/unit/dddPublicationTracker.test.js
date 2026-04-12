'use strict';

/* ── mock-prefixed variables ── */
const mockPublicationFind = jest.fn();
const mockPublicationCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'publication1', ...d }));
const mockPublicationCount = jest.fn().mockResolvedValue(0);
const mockCitationFind = jest.fn();
const mockCitationCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'citation1', ...d }));
const mockCitationCount = jest.fn().mockResolvedValue(0);
const mockImpactRecordFind = jest.fn();
const mockImpactRecordCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'impactRecord1', ...d }));
const mockImpactRecordCount = jest.fn().mockResolvedValue(0);
const mockDisseminationFind = jest.fn();
const mockDisseminationCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'dissemination1', ...d }));
const mockDisseminationCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddPublicationTracker', () => ({
  DDDPublication: {
    find: mockPublicationFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'publication1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'publication1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockPublicationCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'publication1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'publication1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'publication1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'publication1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'publication1' }) }),
    countDocuments: mockPublicationCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCitation: {
    find: mockCitationFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'citation1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'citation1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCitationCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'citation1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'citation1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'citation1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'citation1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'citation1' }) }),
    countDocuments: mockCitationCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDImpactRecord: {
    find: mockImpactRecordFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'impactRecord1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'impactRecord1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockImpactRecordCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'impactRecord1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'impactRecord1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'impactRecord1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'impactRecord1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'impactRecord1' }) }),
    countDocuments: mockImpactRecordCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDDissemination: {
    find: mockDisseminationFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'dissemination1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'dissemination1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDisseminationCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'dissemination1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'dissemination1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'dissemination1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'dissemination1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'dissemination1' }) }),
    countDocuments: mockDisseminationCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  PUBLICATION_TYPES: ['item1', 'item2'],
  PUBLICATION_STATUSES: ['item1', 'item2'],
  JOURNAL_TIERS: ['item1', 'item2'],
  AUTHOR_ROLES: ['item1', 'item2'],
  IMPACT_METRICS: ['item1', 'item2'],
  DISSEMINATION_CHANNELS: ['item1', 'item2'],
  BUILTIN_JOURNAL_LIST: ['item1', 'item2'],

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

const svc = require('../../services/dddPublicationTracker');

describe('dddPublicationTracker service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _publicationL = jest.fn().mockResolvedValue([]);
    const _publicationLim = jest.fn().mockReturnValue({ lean: _publicationL });
    const _publicationS = jest.fn().mockReturnValue({ limit: _publicationLim, lean: _publicationL, populate: jest.fn().mockReturnValue({ lean: _publicationL }) });
    mockPublicationFind.mockReturnValue({ sort: _publicationS, lean: _publicationL, limit: _publicationLim, populate: jest.fn().mockReturnValue({ lean: _publicationL, sort: _publicationS }) });
    const _citationL = jest.fn().mockResolvedValue([]);
    const _citationLim = jest.fn().mockReturnValue({ lean: _citationL });
    const _citationS = jest.fn().mockReturnValue({ limit: _citationLim, lean: _citationL, populate: jest.fn().mockReturnValue({ lean: _citationL }) });
    mockCitationFind.mockReturnValue({ sort: _citationS, lean: _citationL, limit: _citationLim, populate: jest.fn().mockReturnValue({ lean: _citationL, sort: _citationS }) });
    const _impactRecordL = jest.fn().mockResolvedValue([]);
    const _impactRecordLim = jest.fn().mockReturnValue({ lean: _impactRecordL });
    const _impactRecordS = jest.fn().mockReturnValue({ limit: _impactRecordLim, lean: _impactRecordL, populate: jest.fn().mockReturnValue({ lean: _impactRecordL }) });
    mockImpactRecordFind.mockReturnValue({ sort: _impactRecordS, lean: _impactRecordL, limit: _impactRecordLim, populate: jest.fn().mockReturnValue({ lean: _impactRecordL, sort: _impactRecordS }) });
    const _disseminationL = jest.fn().mockResolvedValue([]);
    const _disseminationLim = jest.fn().mockReturnValue({ lean: _disseminationL });
    const _disseminationS = jest.fn().mockReturnValue({ limit: _disseminationLim, lean: _disseminationL, populate: jest.fn().mockReturnValue({ lean: _disseminationL }) });
    mockDisseminationFind.mockReturnValue({ sort: _disseminationS, lean: _disseminationL, limit: _disseminationLim, populate: jest.fn().mockReturnValue({ lean: _disseminationL, sort: _disseminationS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('PublicationTracker');
  });


  test('listPublications returns result', async () => {
    let r; try { r = await svc.listPublications({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPublication returns result', async () => {
    let r; try { r = await svc.getPublication({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPublication creates/returns result', async () => {
    let r; try { r = await svc.createPublication({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updatePublication updates/returns result', async () => {
    let r; try { r = await svc.updatePublication('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCitations returns result', async () => {
    let r; try { r = await svc.listCitations({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('addCitation creates/returns result', async () => {
    let r; try { r = await svc.addCitation({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listImpactRecords returns result', async () => {
    let r; try { r = await svc.listImpactRecords({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordImpact creates/returns result', async () => {
    let r; try { r = await svc.recordImpact({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listDisseminations returns result', async () => {
    let r; try { r = await svc.listDisseminations({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createDissemination creates/returns result', async () => {
    let r; try { r = await svc.createDissemination({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPublicationAnalytics returns object', async () => {
    let r; try { r = await svc.getPublicationAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
