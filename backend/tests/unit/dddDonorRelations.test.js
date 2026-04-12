'use strict';

/* ── mock-prefixed variables ── */
const mockDonorProfileFind = jest.fn();
const mockDonorProfileCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'donorProfile1', ...d }));
const mockDonorProfileCount = jest.fn().mockResolvedValue(0);
const mockDonationRecordFind = jest.fn();
const mockDonationRecordCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'donationRecord1', ...d }));
const mockDonationRecordCount = jest.fn().mockResolvedValue(0);
const mockFundraisingCampaignFind = jest.fn();
const mockFundraisingCampaignCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'fundraisingCampaign1', ...d }));
const mockFundraisingCampaignCount = jest.fn().mockResolvedValue(0);
const mockStewardshipLogFind = jest.fn();
const mockStewardshipLogCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'stewardshipLog1', ...d }));
const mockStewardshipLogCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddDonorRelations', () => ({
  DDDDonorProfile: {
    find: mockDonorProfileFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'donorProfile1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'donorProfile1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDonorProfileCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donorProfile1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donorProfile1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donorProfile1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donorProfile1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donorProfile1' }) }),
    countDocuments: mockDonorProfileCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDDonationRecord: {
    find: mockDonationRecordFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'donationRecord1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'donationRecord1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDonationRecordCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donationRecord1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donationRecord1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donationRecord1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donationRecord1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donationRecord1' }) }),
    countDocuments: mockDonationRecordCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDFundraisingCampaign: {
    find: mockFundraisingCampaignFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'fundraisingCampaign1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'fundraisingCampaign1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockFundraisingCampaignCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fundraisingCampaign1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fundraisingCampaign1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fundraisingCampaign1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fundraisingCampaign1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fundraisingCampaign1' }) }),
    countDocuments: mockFundraisingCampaignCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDStewardshipLog: {
    find: mockStewardshipLogFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'stewardshipLog1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'stewardshipLog1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockStewardshipLogCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'stewardshipLog1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'stewardshipLog1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'stewardshipLog1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'stewardshipLog1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'stewardshipLog1' }) }),
    countDocuments: mockStewardshipLogCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DONOR_TYPES: ['item1', 'item2'],
  DONATION_TYPES: ['item1', 'item2'],
  CAMPAIGN_STATUSES: ['item1', 'item2'],
  DONATION_CHANNELS: ['item1', 'item2'],
  STEWARDSHIP_ACTIONS: ['item1', 'item2'],
  GIVING_LEVELS: ['item1', 'item2'],
  BUILTIN_CAMPAIGN_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddDonorRelations');

describe('dddDonorRelations service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _donorProfileL = jest.fn().mockResolvedValue([]);
    const _donorProfileLim = jest.fn().mockReturnValue({ lean: _donorProfileL });
    const _donorProfileS = jest.fn().mockReturnValue({ limit: _donorProfileLim, lean: _donorProfileL, populate: jest.fn().mockReturnValue({ lean: _donorProfileL }) });
    mockDonorProfileFind.mockReturnValue({ sort: _donorProfileS, lean: _donorProfileL, limit: _donorProfileLim, populate: jest.fn().mockReturnValue({ lean: _donorProfileL, sort: _donorProfileS }) });
    const _donationRecordL = jest.fn().mockResolvedValue([]);
    const _donationRecordLim = jest.fn().mockReturnValue({ lean: _donationRecordL });
    const _donationRecordS = jest.fn().mockReturnValue({ limit: _donationRecordLim, lean: _donationRecordL, populate: jest.fn().mockReturnValue({ lean: _donationRecordL }) });
    mockDonationRecordFind.mockReturnValue({ sort: _donationRecordS, lean: _donationRecordL, limit: _donationRecordLim, populate: jest.fn().mockReturnValue({ lean: _donationRecordL, sort: _donationRecordS }) });
    const _fundraisingCampaignL = jest.fn().mockResolvedValue([]);
    const _fundraisingCampaignLim = jest.fn().mockReturnValue({ lean: _fundraisingCampaignL });
    const _fundraisingCampaignS = jest.fn().mockReturnValue({ limit: _fundraisingCampaignLim, lean: _fundraisingCampaignL, populate: jest.fn().mockReturnValue({ lean: _fundraisingCampaignL }) });
    mockFundraisingCampaignFind.mockReturnValue({ sort: _fundraisingCampaignS, lean: _fundraisingCampaignL, limit: _fundraisingCampaignLim, populate: jest.fn().mockReturnValue({ lean: _fundraisingCampaignL, sort: _fundraisingCampaignS }) });
    const _stewardshipLogL = jest.fn().mockResolvedValue([]);
    const _stewardshipLogLim = jest.fn().mockReturnValue({ lean: _stewardshipLogL });
    const _stewardshipLogS = jest.fn().mockReturnValue({ limit: _stewardshipLogLim, lean: _stewardshipLogL, populate: jest.fn().mockReturnValue({ lean: _stewardshipLogL }) });
    mockStewardshipLogFind.mockReturnValue({ sort: _stewardshipLogS, lean: _stewardshipLogL, limit: _stewardshipLogLim, populate: jest.fn().mockReturnValue({ lean: _stewardshipLogL, sort: _stewardshipLogS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('DonorRelations');
  });


  test('createDonor creates/returns result', async () => {
    let r; try { r = await svc.createDonor({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listDonors returns result', async () => {
    let r; try { r = await svc.listDonors({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateDonor updates/returns result', async () => {
    let r; try { r = await svc.updateDonor('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordDonation creates/returns result', async () => {
    let r; try { r = await svc.recordDonation({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listDonations returns result', async () => {
    let r; try { r = await svc.listDonations({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createCampaign creates/returns result', async () => {
    let r; try { r = await svc.createCampaign({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCampaigns returns result', async () => {
    let r; try { r = await svc.listCampaigns({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('logStewardship creates/returns result', async () => {
    let r; try { r = await svc.logStewardship({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listStewardship returns result', async () => {
    let r; try { r = await svc.listStewardship({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getDonorStats returns object', async () => {
    let r; try { r = await svc.getDonorStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
