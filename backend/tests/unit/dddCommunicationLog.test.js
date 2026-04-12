'use strict';

/* ─── Model mock ─── */
const chain = () => ({
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue([]),
});
const makeModel = name => {
  const m = function (d) {
    this.data = d;
  };
  m.modelName = name;
  m.find = jest.fn(chain);
  m.findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
  m.findById = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'id1' }) });
  m.findByIdAndUpdate = jest
    .fn()
    .mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'id1' }) });
  m.countDocuments = jest.fn().mockResolvedValue(5);
  m.create = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'id1', ...d }));
  return m;
};

const mockDDDCommunicationEntry = makeModel('DDDCommunicationEntry');
const mockDDDDeliveryTracking = makeModel('DDDDeliveryTracking');
const mockDDDCommChannel = makeModel('DDDCommChannel');
const mockDDDCommunicationReport = makeModel('DDDCommunicationReport');

jest.mock('../../models/DddCommunicationLog', () => ({
  DDDCommunicationEntry: mockDDDCommunicationEntry,
  DDDDeliveryTracking: mockDDDDeliveryTracking,
  DDDCommChannel: mockDDDCommChannel,
  DDDCommunicationReport: mockDDDCommunicationReport,
  ENTRY_TYPES: [],
  ENTRY_STATUSES: [],
  DELIVERY_METHODS: [],
  TRACKING_STATUSES: [],
  REPORT_TYPES: [],
  COMPLIANCE_FLAGS: [],
  BUILTIN_COMM_CHANNELS: [{ code: 'EMAIL', name: 'Email' }],
}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class {
    constructor() {
      this.models = {};
    }
    _create(M, d) {
      return M.create(d);
    }
    _list(M, f, o) {
      return M.find(f)
        .sort(o?.sort || {})
        .limit(o?.limit || 20)
        .lean();
    }
    _update(M, id, d, opts) {
      return M.findByIdAndUpdate(id, d, { new: true, ...opts }).lean();
    }
    _getById(M, id) {
      return M.findById(id).lean();
    }
    log() {}
  };
});

const service = require('../../services/dddCommunicationLog');

describe('dddCommunicationLog service', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ── Singleton ── */
  test('exports singleton', () => {
    expect(service).toBeDefined();
    expect(typeof service.listEntries).toBe('function');
  });

  /* ── Initialize / Seed ── */
  test('initialize seeds channels and logs', async () => {
    mockDDDCommChannel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
    const r = await service.initialize();
    expect(r).toBe(true);
    expect(mockDDDCommChannel.create).toHaveBeenCalled();
  });

  test('initialize skips existing channels', async () => {
    mockDDDCommChannel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'x' }) });
    await service.initialize();
    expect(mockDDDCommChannel.create).not.toHaveBeenCalled();
  });

  /* ── Entries ── */
  test('listEntries no filter', async () => {
    await service.listEntries();
    expect(mockDDDCommunicationEntry.find).toHaveBeenCalledWith({});
  });

  test('listEntries with filters', async () => {
    await service.listEntries({
      type: 'sms',
      status: 'sent',
      method: 'email',
      direction: 'outbound',
      recipientId: 'r1',
    });
    expect(mockDDDCommunicationEntry.find).toHaveBeenCalledWith({
      type: 'sms',
      status: 'sent',
      method: 'email',
      direction: 'outbound',
      recipientId: 'r1',
    });
  });

  test('getEntry', async () => {
    const r = await service.getEntry('id1');
    expect(mockDDDCommunicationEntry.findById).toHaveBeenCalledWith('id1');
    expect(r).toHaveProperty('_id');
  });

  test('logEntry auto-generates entryCode', async () => {
    const r = await service.logEntry({ body: 'hi' });
    expect(r.entryCode).toMatch(/^COM-/);
    expect(mockDDDCommunicationEntry.create).toHaveBeenCalled();
  });

  test('logEntry keeps entryCode when provided', async () => {
    await service.logEntry({ entryCode: 'CUSTOM-1', body: 'hi' });
    expect(mockDDDCommunicationEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({ entryCode: 'CUSTOM-1' })
    );
  });

  test('updateEntryStatus', async () => {
    mockDDDCommunicationEntry.findByIdAndUpdate.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ _id: 'id1', status: 'sent' }),
    });
    const r = await service.updateEntryStatus('id1', 'sent', { sentAt: new Date() });
    expect(mockDDDCommunicationEntry.findByIdAndUpdate).toHaveBeenCalled();
    expect(r.status).toBe('sent');
  });

  /* ── Delivery Tracking ── */
  test('listTracking', async () => {
    await service.listTracking('e1');
    expect(mockDDDDeliveryTracking.find).toHaveBeenCalledWith({ entryId: 'e1' });
  });

  test('addTracking', async () => {
    const r = await service.addTracking({ entryId: 'e1' });
    expect(mockDDDDeliveryTracking.create).toHaveBeenCalledWith({ entryId: 'e1' });
    expect(r).toHaveProperty('_id');
  });

  test('updateTracking', async () => {
    await service.updateTracking('id1', { status: 'delivered' });
    expect(mockDDDDeliveryTracking.findByIdAndUpdate).toHaveBeenCalled();
  });

  /* ── Channels ── */
  test('listChannels no filter', async () => {
    await service.listChannels();
    expect(mockDDDCommChannel.find).toHaveBeenCalledWith({});
  });

  test('listChannels with filters', async () => {
    await service.listChannels({ method: 'sms', isActive: true });
    expect(mockDDDCommChannel.find).toHaveBeenCalledWith({ method: 'sms', isActive: true });
  });

  test('createChannel', async () => {
    await service.createChannel({ code: 'PUSH' });
    expect(mockDDDCommChannel.create).toHaveBeenCalledWith({ code: 'PUSH' });
  });

  test('updateChannel', async () => {
    await service.updateChannel('id1', { isActive: false });
    expect(mockDDDCommChannel.findByIdAndUpdate).toHaveBeenCalled();
  });

  /* ── Reports ── */
  test('listReports no filter', async () => {
    await service.listReports();
    expect(mockDDDCommunicationReport.find).toHaveBeenCalledWith({});
  });

  test('listReports with type', async () => {
    await service.listReports({ type: 'monthly' });
    expect(mockDDDCommunicationReport.find).toHaveBeenCalledWith({ type: 'monthly' });
  });

  test('generateReport auto-generates reportCode', async () => {
    const r = await service.generateReport({ type: 'monthly' });
    expect(r.reportCode).toMatch(/^RPT-/);
    expect(mockDDDCommunicationReport.create).toHaveBeenCalled();
  });

  test('generateReport keeps reportCode when provided', async () => {
    await service.generateReport({ reportCode: 'RPT-CUSTOM', type: 'daily' });
    expect(mockDDDCommunicationReport.create).toHaveBeenCalledWith(
      expect.objectContaining({ reportCode: 'RPT-CUSTOM' })
    );
  });

  /* ── Analytics ── */
  test('getCommunicationAnalytics aggregates counts', async () => {
    mockDDDCommunicationEntry.countDocuments
      .mockResolvedValueOnce(100) // entries
      .mockResolvedValueOnce(5) // failed
      .mockResolvedValueOnce(2); // bounced
    mockDDDDeliveryTracking.countDocuments.mockResolvedValueOnce(80);
    mockDDDCommChannel.countDocuments.mockResolvedValueOnce(4);
    mockDDDCommunicationReport.countDocuments.mockResolvedValueOnce(10);

    const a = await service.getCommunicationAnalytics();
    expect(a).toEqual({
      entries: 100,
      failedEntries: 5,
      bouncedEntries: 2,
      tracking: 80,
      channels: 4,
      reports: 10,
    });
  });
});
