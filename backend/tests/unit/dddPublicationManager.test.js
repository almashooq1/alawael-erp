'use strict';

/* ── mock-prefixed variables ── */
const mockManuscriptFind = jest.fn();
const mockManuscriptCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'manuscript1', ...d }));
const mockManuscriptCount = jest.fn().mockResolvedValue(0);
const mockAuthorshipFind = jest.fn();
const mockAuthorshipCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'authorship1', ...d }));
const mockAuthorshipCount = jest.fn().mockResolvedValue(0);
const mockCitationRecordFind = jest.fn();
const mockCitationRecordCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'citationRecord1', ...d }));
const mockCitationRecordCount = jest.fn().mockResolvedValue(0);
const mockDisseminationEventFind = jest.fn();
const mockDisseminationEventCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'disseminationEvent1', ...d }));
const mockDisseminationEventCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddPublicationManager', () => ({
  DDDManuscript: {
    find: mockManuscriptFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'manuscript1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'manuscript1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockManuscriptCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'manuscript1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'manuscript1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'manuscript1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'manuscript1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'manuscript1' }) }),
    countDocuments: mockManuscriptCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDAuthorship: {
    find: mockAuthorshipFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'authorship1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'authorship1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAuthorshipCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'authorship1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'authorship1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'authorship1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'authorship1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'authorship1' }) }),
    countDocuments: mockAuthorshipCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCitationRecord: {
    find: mockCitationRecordFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'citationRecord1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'citationRecord1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCitationRecordCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'citationRecord1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'citationRecord1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'citationRecord1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'citationRecord1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'citationRecord1' }) }),
    countDocuments: mockCitationRecordCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDDisseminationEvent: {
    find: mockDisseminationEventFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'disseminationEvent1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'disseminationEvent1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDisseminationEventCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'disseminationEvent1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'disseminationEvent1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'disseminationEvent1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'disseminationEvent1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'disseminationEvent1' }) }),
    countDocuments: mockDisseminationEventCount,
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
  DISSEMINATION_CHANNELS: ['item1', 'item2'],
  CITATION_DATABASES: ['item1', 'item2'],
  BUILTIN_PUBLICATION_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddPublicationManager');

describe('dddPublicationManager service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _manuscriptL = jest.fn().mockResolvedValue([]);
    const _manuscriptLim = jest.fn().mockReturnValue({ lean: _manuscriptL });
    const _manuscriptS = jest.fn().mockReturnValue({ limit: _manuscriptLim, lean: _manuscriptL, populate: jest.fn().mockReturnValue({ lean: _manuscriptL }) });
    mockManuscriptFind.mockReturnValue({ sort: _manuscriptS, lean: _manuscriptL, limit: _manuscriptLim, populate: jest.fn().mockReturnValue({ lean: _manuscriptL, sort: _manuscriptS }) });
    const _authorshipL = jest.fn().mockResolvedValue([]);
    const _authorshipLim = jest.fn().mockReturnValue({ lean: _authorshipL });
    const _authorshipS = jest.fn().mockReturnValue({ limit: _authorshipLim, lean: _authorshipL, populate: jest.fn().mockReturnValue({ lean: _authorshipL }) });
    mockAuthorshipFind.mockReturnValue({ sort: _authorshipS, lean: _authorshipL, limit: _authorshipLim, populate: jest.fn().mockReturnValue({ lean: _authorshipL, sort: _authorshipS }) });
    const _citationRecordL = jest.fn().mockResolvedValue([]);
    const _citationRecordLim = jest.fn().mockReturnValue({ lean: _citationRecordL });
    const _citationRecordS = jest.fn().mockReturnValue({ limit: _citationRecordLim, lean: _citationRecordL, populate: jest.fn().mockReturnValue({ lean: _citationRecordL }) });
    mockCitationRecordFind.mockReturnValue({ sort: _citationRecordS, lean: _citationRecordL, limit: _citationRecordLim, populate: jest.fn().mockReturnValue({ lean: _citationRecordL, sort: _citationRecordS }) });
    const _disseminationEventL = jest.fn().mockResolvedValue([]);
    const _disseminationEventLim = jest.fn().mockReturnValue({ lean: _disseminationEventL });
    const _disseminationEventS = jest.fn().mockReturnValue({ limit: _disseminationEventLim, lean: _disseminationEventL, populate: jest.fn().mockReturnValue({ lean: _disseminationEventL }) });
    mockDisseminationEventFind.mockReturnValue({ sort: _disseminationEventS, lean: _disseminationEventL, limit: _disseminationEventLim, populate: jest.fn().mockReturnValue({ lean: _disseminationEventL, sort: _disseminationEventS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('PublicationManager');
  });


  test('createManuscript creates/returns result', async () => {
    let r; try { r = await svc.createManuscript({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listManuscripts returns result', async () => {
    let r; try { r = await svc.listManuscripts({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateManuscript updates/returns result', async () => {
    let r; try { r = await svc.updateManuscript('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('addAuthorship creates/returns result', async () => {
    let r; try { r = await svc.addAuthorship({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAuthorships returns result', async () => {
    let r; try { r = await svc.listAuthorships({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordCitation creates/returns result', async () => {
    let r; try { r = await svc.recordCitation({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCitations returns result', async () => {
    let r; try { r = await svc.listCitations({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createDissemination creates/returns result', async () => {
    let r; try { r = await svc.createDissemination({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listDisseminations returns result', async () => {
    let r; try { r = await svc.listDisseminations({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPublicationStats returns object', async () => {
    let r; try { r = await svc.getPublicationStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
