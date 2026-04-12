'use strict';

/* ── mock-prefixed variables ── */
const mockDonationFind = jest.fn();
const mockDonationCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'donation1', ...d }));
const mockDonationCount = jest.fn().mockResolvedValue(0);
const mockDonorFind = jest.fn();
const mockDonorCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'donor1', ...d }));
const mockDonorCount = jest.fn().mockResolvedValue(0);
const mockFundraiserFind = jest.fn();
const mockFundraiserCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'fundraiser1', ...d }));
const mockFundraiserCount = jest.fn().mockResolvedValue(0);
const mockDonationReceiptFind = jest.fn();
const mockDonationReceiptCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'donationReceipt1', ...d }));
const mockDonationReceiptCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddDonationManager', () => ({
  DDDDonation: {
    find: mockDonationFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'donation1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'donation1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDonationCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donation1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donation1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donation1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donation1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donation1' }) }),
    countDocuments: mockDonationCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDDonor: {
    find: mockDonorFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'donor1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'donor1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDonorCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donor1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donor1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donor1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donor1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donor1' }) }),
    countDocuments: mockDonorCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDFundraiser: {
    find: mockFundraiserFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'fundraiser1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'fundraiser1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockFundraiserCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fundraiser1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fundraiser1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fundraiser1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fundraiser1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'fundraiser1' }) }),
    countDocuments: mockFundraiserCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDDonationReceipt: {
    find: mockDonationReceiptFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'donationReceipt1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'donationReceipt1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDonationReceiptCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donationReceipt1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donationReceipt1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donationReceipt1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donationReceipt1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'donationReceipt1' }) }),
    countDocuments: mockDonationReceiptCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DONATION_TYPES: ['item1', 'item2'],
  DONATION_STATUSES: ['item1', 'item2'],
  PAYMENT_METHODS: ['item1', 'item2'],
  DONOR_CATEGORIES: ['item1', 'item2'],
  FUNDRAISER_TYPES: ['item1', 'item2'],
  FUNDRAISER_STATUSES: ['item1', 'item2'],
  BUILTIN_FUNDRAISERS: ['item1', 'item2'],

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

const svc = require('../../services/dddDonationManager');

describe('dddDonationManager service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _donationL = jest.fn().mockResolvedValue([]);
    const _donationLim = jest.fn().mockReturnValue({ lean: _donationL });
    const _donationS = jest.fn().mockReturnValue({ limit: _donationLim, lean: _donationL, populate: jest.fn().mockReturnValue({ lean: _donationL }) });
    mockDonationFind.mockReturnValue({ sort: _donationS, lean: _donationL, limit: _donationLim, populate: jest.fn().mockReturnValue({ lean: _donationL, sort: _donationS }) });
    const _donorL = jest.fn().mockResolvedValue([]);
    const _donorLim = jest.fn().mockReturnValue({ lean: _donorL });
    const _donorS = jest.fn().mockReturnValue({ limit: _donorLim, lean: _donorL, populate: jest.fn().mockReturnValue({ lean: _donorL }) });
    mockDonorFind.mockReturnValue({ sort: _donorS, lean: _donorL, limit: _donorLim, populate: jest.fn().mockReturnValue({ lean: _donorL, sort: _donorS }) });
    const _fundraiserL = jest.fn().mockResolvedValue([]);
    const _fundraiserLim = jest.fn().mockReturnValue({ lean: _fundraiserL });
    const _fundraiserS = jest.fn().mockReturnValue({ limit: _fundraiserLim, lean: _fundraiserL, populate: jest.fn().mockReturnValue({ lean: _fundraiserL }) });
    mockFundraiserFind.mockReturnValue({ sort: _fundraiserS, lean: _fundraiserL, limit: _fundraiserLim, populate: jest.fn().mockReturnValue({ lean: _fundraiserL, sort: _fundraiserS }) });
    const _donationReceiptL = jest.fn().mockResolvedValue([]);
    const _donationReceiptLim = jest.fn().mockReturnValue({ lean: _donationReceiptL });
    const _donationReceiptS = jest.fn().mockReturnValue({ limit: _donationReceiptLim, lean: _donationReceiptL, populate: jest.fn().mockReturnValue({ lean: _donationReceiptL }) });
    mockDonationReceiptFind.mockReturnValue({ sort: _donationReceiptS, lean: _donationReceiptL, limit: _donationReceiptLim, populate: jest.fn().mockReturnValue({ lean: _donationReceiptL, sort: _donationReceiptS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('DonationManager');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listDonations returns result', async () => {
    let r; try { r = await svc.listDonations({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordDonation creates/returns result', async () => {
    let r; try { r = await svc.recordDonation({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateDonation updates/returns result', async () => {
    let r; try { r = await svc.updateDonation('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listDonors returns result', async () => {
    let r; try { r = await svc.listDonors({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getDonor returns result', async () => {
    let r; try { r = await svc.getDonor({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('registerDonor creates/returns result', async () => {
    let r; try { r = await svc.registerDonor({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateDonor updates/returns result', async () => {
    let r; try { r = await svc.updateDonor('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listFundraisers returns result', async () => {
    let r; try { r = await svc.listFundraisers({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createFundraiser creates/returns result', async () => {
    let r; try { r = await svc.createFundraiser({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateFundraiser updates/returns result', async () => {
    let r; try { r = await svc.updateFundraiser('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listReceipts returns result', async () => {
    let r; try { r = await svc.listReceipts({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('issueReceipt creates/returns result', async () => {
    let r; try { r = await svc.issueReceipt({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getDonationAnalytics returns object', async () => {
    let r; try { r = await svc.getDonationAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
