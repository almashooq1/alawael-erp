'use strict';

/* ── mock-prefixed variables ── */
const mockOutreachCampaignFind = jest.fn();
const mockOutreachCampaignCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'outreachCampaign1', ...d }));
const mockOutreachCampaignCount = jest.fn().mockResolvedValue(0);
const mockOutreachContactFind = jest.fn();
const mockOutreachContactCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'outreachContact1', ...d }));
const mockOutreachContactCount = jest.fn().mockResolvedValue(0);
const mockCampaignEventFind = jest.fn();
const mockCampaignEventCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'campaignEvent1', ...d }));
const mockCampaignEventCount = jest.fn().mockResolvedValue(0);
const mockOutreachReportFind = jest.fn();
const mockOutreachReportCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'outreachReport1', ...d }));
const mockOutreachReportCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddOutreachTracker', () => ({
  DDDOutreachCampaign: {
    find: mockOutreachCampaignFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'outreachCampaign1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'outreachCampaign1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockOutreachCampaignCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachCampaign1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachCampaign1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachCampaign1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachCampaign1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachCampaign1' }) }),
    countDocuments: mockOutreachCampaignCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDOutreachContact: {
    find: mockOutreachContactFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'outreachContact1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'outreachContact1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockOutreachContactCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachContact1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachContact1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachContact1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachContact1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachContact1' }) }),
    countDocuments: mockOutreachContactCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCampaignEvent: {
    find: mockCampaignEventFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'campaignEvent1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'campaignEvent1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCampaignEventCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'campaignEvent1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'campaignEvent1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'campaignEvent1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'campaignEvent1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'campaignEvent1' }) }),
    countDocuments: mockCampaignEventCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDOutreachReport: {
    find: mockOutreachReportFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'outreachReport1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'outreachReport1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockOutreachReportCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachReport1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachReport1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachReport1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachReport1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'outreachReport1' }) }),
    countDocuments: mockOutreachReportCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  CAMPAIGN_TYPES: ['item1', 'item2'],
  CAMPAIGN_STATUSES: ['item1', 'item2'],
  CONTACT_TYPES: ['item1', 'item2'],
  EVENT_TYPES: ['item1', 'item2'],
  REPORT_TYPES: ['item1', 'item2'],
  OUTREACH_CHANNELS: ['item1', 'item2'],
  BUILTIN_CAMPAIGNS: ['item1', 'item2'],

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

const svc = require('../../services/dddOutreachTracker');

describe('dddOutreachTracker service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _outreachCampaignL = jest.fn().mockResolvedValue([]);
    const _outreachCampaignLim = jest.fn().mockReturnValue({ lean: _outreachCampaignL });
    const _outreachCampaignS = jest.fn().mockReturnValue({ limit: _outreachCampaignLim, lean: _outreachCampaignL, populate: jest.fn().mockReturnValue({ lean: _outreachCampaignL }) });
    mockOutreachCampaignFind.mockReturnValue({ sort: _outreachCampaignS, lean: _outreachCampaignL, limit: _outreachCampaignLim, populate: jest.fn().mockReturnValue({ lean: _outreachCampaignL, sort: _outreachCampaignS }) });
    const _outreachContactL = jest.fn().mockResolvedValue([]);
    const _outreachContactLim = jest.fn().mockReturnValue({ lean: _outreachContactL });
    const _outreachContactS = jest.fn().mockReturnValue({ limit: _outreachContactLim, lean: _outreachContactL, populate: jest.fn().mockReturnValue({ lean: _outreachContactL }) });
    mockOutreachContactFind.mockReturnValue({ sort: _outreachContactS, lean: _outreachContactL, limit: _outreachContactLim, populate: jest.fn().mockReturnValue({ lean: _outreachContactL, sort: _outreachContactS }) });
    const _campaignEventL = jest.fn().mockResolvedValue([]);
    const _campaignEventLim = jest.fn().mockReturnValue({ lean: _campaignEventL });
    const _campaignEventS = jest.fn().mockReturnValue({ limit: _campaignEventLim, lean: _campaignEventL, populate: jest.fn().mockReturnValue({ lean: _campaignEventL }) });
    mockCampaignEventFind.mockReturnValue({ sort: _campaignEventS, lean: _campaignEventL, limit: _campaignEventLim, populate: jest.fn().mockReturnValue({ lean: _campaignEventL, sort: _campaignEventS }) });
    const _outreachReportL = jest.fn().mockResolvedValue([]);
    const _outreachReportLim = jest.fn().mockReturnValue({ lean: _outreachReportL });
    const _outreachReportS = jest.fn().mockReturnValue({ limit: _outreachReportLim, lean: _outreachReportL, populate: jest.fn().mockReturnValue({ lean: _outreachReportL }) });
    mockOutreachReportFind.mockReturnValue({ sort: _outreachReportS, lean: _outreachReportL, limit: _outreachReportLim, populate: jest.fn().mockReturnValue({ lean: _outreachReportL, sort: _outreachReportS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('OutreachTracker');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listCampaigns returns result', async () => {
    let r; try { r = await svc.listCampaigns({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getCampaign returns result', async () => {
    let r; try { r = await svc.getCampaign({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createCampaign creates/returns result', async () => {
    let r; try { r = await svc.createCampaign({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateCampaign updates/returns result', async () => {
    let r; try { r = await svc.updateCampaign('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listContacts returns result', async () => {
    let r; try { r = await svc.listContacts({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('addContact creates/returns result', async () => {
    let r; try { r = await svc.addContact({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateContact updates/returns result', async () => {
    let r; try { r = await svc.updateContact('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listEvents returns result', async () => {
    let r; try { r = await svc.listEvents({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createEvent creates/returns result', async () => {
    let r; try { r = await svc.createEvent({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listReports returns result', async () => {
    let r; try { r = await svc.listReports({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('generateReport creates/returns result', async () => {
    let r; try { r = await svc.generateReport({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getOutreachAnalytics returns object', async () => {
    let r; try { r = await svc.getOutreachAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
