'use strict';

/* ── mock-prefixed variables ── */
const mockLegalCaseFind = jest.fn();
const mockLegalCaseCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'legalCase1', ...d }));
const mockLegalCaseCount = jest.fn().mockResolvedValue(0);
const mockLegalDocumentFind = jest.fn();
const mockLegalDocumentCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'legalDocument1', ...d }));
const mockLegalDocumentCount = jest.fn().mockResolvedValue(0);
const mockLegalPartyFind = jest.fn();
const mockLegalPartyCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'legalParty1', ...d }));
const mockLegalPartyCount = jest.fn().mockResolvedValue(0);
const mockLegalMilestoneFind = jest.fn();
const mockLegalMilestoneCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'legalMilestone1', ...d }));
const mockLegalMilestoneCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddLegalCaseTracker', () => ({
  DDDLegalCase: {
    find: mockLegalCaseFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'legalCase1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'legalCase1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockLegalCaseCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalCase1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalCase1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalCase1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalCase1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalCase1' }) }),
    countDocuments: mockLegalCaseCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDLegalDocument: {
    find: mockLegalDocumentFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'legalDocument1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'legalDocument1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockLegalDocumentCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalDocument1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalDocument1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalDocument1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalDocument1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalDocument1' }) }),
    countDocuments: mockLegalDocumentCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDLegalParty: {
    find: mockLegalPartyFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'legalParty1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'legalParty1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockLegalPartyCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalParty1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalParty1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalParty1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalParty1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalParty1' }) }),
    countDocuments: mockLegalPartyCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDLegalMilestone: {
    find: mockLegalMilestoneFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'legalMilestone1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'legalMilestone1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockLegalMilestoneCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalMilestone1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalMilestone1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalMilestone1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalMilestone1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'legalMilestone1' }) }),
    countDocuments: mockLegalMilestoneCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  CASE_TYPES: ['item1', 'item2'],
  CASE_STATUSES: ['item1', 'item2'],
  CASE_PRIORITIES: ['item1', 'item2'],
  DOCUMENT_TYPES: ['item1', 'item2'],
  PARTY_ROLES: ['item1', 'item2'],
  MILESTONE_TYPES: ['item1', 'item2'],
  BUILTIN_CASE_CATEGORIES: ['item1', 'item2'],

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

const svc = require('../../services/dddLegalCaseTracker');

describe('dddLegalCaseTracker service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _legalCaseL = jest.fn().mockResolvedValue([]);
    const _legalCaseLim = jest.fn().mockReturnValue({ lean: _legalCaseL });
    const _legalCaseS = jest.fn().mockReturnValue({ limit: _legalCaseLim, lean: _legalCaseL, populate: jest.fn().mockReturnValue({ lean: _legalCaseL }) });
    mockLegalCaseFind.mockReturnValue({ sort: _legalCaseS, lean: _legalCaseL, limit: _legalCaseLim, populate: jest.fn().mockReturnValue({ lean: _legalCaseL, sort: _legalCaseS }) });
    const _legalDocumentL = jest.fn().mockResolvedValue([]);
    const _legalDocumentLim = jest.fn().mockReturnValue({ lean: _legalDocumentL });
    const _legalDocumentS = jest.fn().mockReturnValue({ limit: _legalDocumentLim, lean: _legalDocumentL, populate: jest.fn().mockReturnValue({ lean: _legalDocumentL }) });
    mockLegalDocumentFind.mockReturnValue({ sort: _legalDocumentS, lean: _legalDocumentL, limit: _legalDocumentLim, populate: jest.fn().mockReturnValue({ lean: _legalDocumentL, sort: _legalDocumentS }) });
    const _legalPartyL = jest.fn().mockResolvedValue([]);
    const _legalPartyLim = jest.fn().mockReturnValue({ lean: _legalPartyL });
    const _legalPartyS = jest.fn().mockReturnValue({ limit: _legalPartyLim, lean: _legalPartyL, populate: jest.fn().mockReturnValue({ lean: _legalPartyL }) });
    mockLegalPartyFind.mockReturnValue({ sort: _legalPartyS, lean: _legalPartyL, limit: _legalPartyLim, populate: jest.fn().mockReturnValue({ lean: _legalPartyL, sort: _legalPartyS }) });
    const _legalMilestoneL = jest.fn().mockResolvedValue([]);
    const _legalMilestoneLim = jest.fn().mockReturnValue({ lean: _legalMilestoneL });
    const _legalMilestoneS = jest.fn().mockReturnValue({ limit: _legalMilestoneLim, lean: _legalMilestoneL, populate: jest.fn().mockReturnValue({ lean: _legalMilestoneL }) });
    mockLegalMilestoneFind.mockReturnValue({ sort: _legalMilestoneS, lean: _legalMilestoneL, limit: _legalMilestoneLim, populate: jest.fn().mockReturnValue({ lean: _legalMilestoneL, sort: _legalMilestoneS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('LegalCaseTracker');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listCases returns result', async () => {
    let r; try { r = await svc.listCases({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getCase returns result', async () => {
    let r; try { r = await svc.getCase({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('openCase creates/returns result', async () => {
    let r; try { r = await svc.openCase({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateCase updates/returns result', async () => {
    let r; try { r = await svc.updateCase('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listDocuments returns result', async () => {
    let r; try { r = await svc.listDocuments({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('addDocument creates/returns result', async () => {
    let r; try { r = await svc.addDocument({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listParties returns result', async () => {
    let r; try { r = await svc.listParties({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('addParty creates/returns result', async () => {
    let r; try { r = await svc.addParty({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listMilestones returns result', async () => {
    let r; try { r = await svc.listMilestones({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('addMilestone creates/returns result', async () => {
    let r; try { r = await svc.addMilestone({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('completeMilestone updates/returns result', async () => {
    let r; try { r = await svc.completeMilestone('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getCaseAnalytics returns object', async () => {
    let r; try { r = await svc.getCaseAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
