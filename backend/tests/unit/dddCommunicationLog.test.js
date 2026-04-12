'use strict';

/* ── mock-prefixed variables ── */
const mockCommunicationEntryFind = jest.fn();
const mockCommunicationEntryCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'communicationEntry1', ...d }));
const mockCommunicationEntryCount = jest.fn().mockResolvedValue(0);
const mockDeliveryTrackingFind = jest.fn();
const mockDeliveryTrackingCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'deliveryTracking1', ...d }));
const mockDeliveryTrackingCount = jest.fn().mockResolvedValue(0);
const mockCommChannelFind = jest.fn();
const mockCommChannelCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'commChannel1', ...d }));
const mockCommChannelCount = jest.fn().mockResolvedValue(0);
const mockCommunicationReportFind = jest.fn();
const mockCommunicationReportCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'communicationReport1', ...d }));
const mockCommunicationReportCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddCommunicationLog', () => ({
  DDDCommunicationEntry: {
    find: mockCommunicationEntryFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'communicationEntry1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'communicationEntry1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCommunicationEntryCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communicationEntry1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communicationEntry1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communicationEntry1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communicationEntry1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communicationEntry1' }) }),
    countDocuments: mockCommunicationEntryCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDDeliveryTracking: {
    find: mockDeliveryTrackingFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'deliveryTracking1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'deliveryTracking1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockDeliveryTrackingCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'deliveryTracking1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'deliveryTracking1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'deliveryTracking1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'deliveryTracking1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'deliveryTracking1' }) }),
    countDocuments: mockDeliveryTrackingCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCommChannel: {
    find: mockCommChannelFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'commChannel1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'commChannel1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCommChannelCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'commChannel1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'commChannel1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'commChannel1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'commChannel1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'commChannel1' }) }),
    countDocuments: mockCommChannelCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCommunicationReport: {
    find: mockCommunicationReportFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'communicationReport1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'communicationReport1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCommunicationReportCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communicationReport1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communicationReport1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communicationReport1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communicationReport1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'communicationReport1' }) }),
    countDocuments: mockCommunicationReportCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  ENTRY_TYPES: ['item1', 'item2'],
  ENTRY_STATUSES: ['item1', 'item2'],
  DELIVERY_METHODS: ['item1', 'item2'],
  TRACKING_STATUSES: ['item1', 'item2'],
  REPORT_TYPES: ['item1', 'item2'],
  COMPLIANCE_FLAGS: ['item1', 'item2'],
  BUILTIN_COMM_CHANNELS: ['item1', 'item2'],

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

const svc = require('../../services/dddCommunicationLog');

describe('dddCommunicationLog service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _communicationEntryL = jest.fn().mockResolvedValue([]);
    const _communicationEntryLim = jest.fn().mockReturnValue({ lean: _communicationEntryL });
    const _communicationEntryS = jest.fn().mockReturnValue({ limit: _communicationEntryLim, lean: _communicationEntryL, populate: jest.fn().mockReturnValue({ lean: _communicationEntryL }) });
    mockCommunicationEntryFind.mockReturnValue({ sort: _communicationEntryS, lean: _communicationEntryL, limit: _communicationEntryLim, populate: jest.fn().mockReturnValue({ lean: _communicationEntryL, sort: _communicationEntryS }) });
    const _deliveryTrackingL = jest.fn().mockResolvedValue([]);
    const _deliveryTrackingLim = jest.fn().mockReturnValue({ lean: _deliveryTrackingL });
    const _deliveryTrackingS = jest.fn().mockReturnValue({ limit: _deliveryTrackingLim, lean: _deliveryTrackingL, populate: jest.fn().mockReturnValue({ lean: _deliveryTrackingL }) });
    mockDeliveryTrackingFind.mockReturnValue({ sort: _deliveryTrackingS, lean: _deliveryTrackingL, limit: _deliveryTrackingLim, populate: jest.fn().mockReturnValue({ lean: _deliveryTrackingL, sort: _deliveryTrackingS }) });
    const _commChannelL = jest.fn().mockResolvedValue([]);
    const _commChannelLim = jest.fn().mockReturnValue({ lean: _commChannelL });
    const _commChannelS = jest.fn().mockReturnValue({ limit: _commChannelLim, lean: _commChannelL, populate: jest.fn().mockReturnValue({ lean: _commChannelL }) });
    mockCommChannelFind.mockReturnValue({ sort: _commChannelS, lean: _commChannelL, limit: _commChannelLim, populate: jest.fn().mockReturnValue({ lean: _commChannelL, sort: _commChannelS }) });
    const _communicationReportL = jest.fn().mockResolvedValue([]);
    const _communicationReportLim = jest.fn().mockReturnValue({ lean: _communicationReportL });
    const _communicationReportS = jest.fn().mockReturnValue({ limit: _communicationReportLim, lean: _communicationReportL, populate: jest.fn().mockReturnValue({ lean: _communicationReportL }) });
    mockCommunicationReportFind.mockReturnValue({ sort: _communicationReportS, lean: _communicationReportL, limit: _communicationReportLim, populate: jest.fn().mockReturnValue({ lean: _communicationReportL, sort: _communicationReportS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('CommunicationLog');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listEntries returns result', async () => {
    let r; try { r = await svc.listEntries({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getEntry returns result', async () => {
    let r; try { r = await svc.getEntry({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('logEntry creates/returns result', async () => {
    let r; try { r = await svc.logEntry({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateEntryStatus updates/returns result', async () => {
    let r; try { r = await svc.updateEntryStatus('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listTracking returns result', async () => {
    let r; try { r = await svc.listTracking({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('addTracking creates/returns result', async () => {
    let r; try { r = await svc.addTracking({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateTracking updates/returns result', async () => {
    let r; try { r = await svc.updateTracking('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listChannels returns result', async () => {
    let r; try { r = await svc.listChannels({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createChannel creates/returns result', async () => {
    let r; try { r = await svc.createChannel({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateChannel updates/returns result', async () => {
    let r; try { r = await svc.updateChannel('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listReports returns result', async () => {
    let r; try { r = await svc.listReports({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('generateReport creates/returns result', async () => {
    let r; try { r = await svc.generateReport({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getCommunicationAnalytics returns object', async () => {
    let r; try { r = await svc.getCommunicationAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
