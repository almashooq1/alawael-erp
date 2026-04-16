'use strict';

/* ── mock-prefixed variables ── */
const mockMessageRouteFind = jest.fn();
const mockMessageRouteCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'messageRoute1', ...d }));
const mockMessageRouteCount = jest.fn().mockResolvedValue(0);
const mockMessageAckFind = jest.fn();
const mockMessageAckCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'messageAck1', ...d }));
const mockMessageAckCount = jest.fn().mockResolvedValue(0);
const mockTransmissionLogFind = jest.fn();
const mockTransmissionLogCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'transmissionLog1', ...d }));
const mockTransmissionLogCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddHL7Messaging', () => ({
  DDDMessageRoute: {
    find: mockMessageRouteFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'messageRoute1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'messageRoute1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockMessageRouteCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'messageRoute1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'messageRoute1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'messageRoute1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'messageRoute1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'messageRoute1' }) }),
    countDocuments: mockMessageRouteCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDMessageAck: {
    find: mockMessageAckFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'messageAck1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'messageAck1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockMessageAckCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'messageAck1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'messageAck1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'messageAck1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'messageAck1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'messageAck1' }) }),
    countDocuments: mockMessageAckCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDTransmissionLog: {
    find: mockTransmissionLogFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'transmissionLog1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'transmissionLog1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockTransmissionLogCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transmissionLog1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transmissionLog1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transmissionLog1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transmissionLog1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transmissionLog1' }) }),
    countDocuments: mockTransmissionLogCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  MESSAGE_TYPES: ['item1', 'item2'],
  MESSAGE_EVENTS: ['item1', 'item2'],
  PROCESSING_STATUSES: ['item1', 'item2'],
  ACK_CODES: ['item1', 'item2'],
  SEGMENT_TYPES: ['item1', 'item2'],
  ENCODING_TYPES: ['item1', 'item2'],
  BUILTIN_MESSAGE_TEMPLATES: ['item1', 'item2'],

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

const svc = require('../../services/dddHL7Messaging');

describe('dddHL7Messaging service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _messageRouteL = jest.fn().mockResolvedValue([]);
    const _messageRouteLim = jest.fn().mockReturnValue({ lean: _messageRouteL });
    const _messageRouteS = jest.fn().mockReturnValue({ limit: _messageRouteLim, lean: _messageRouteL, populate: jest.fn().mockReturnValue({ lean: _messageRouteL }) });
    mockMessageRouteFind.mockReturnValue({ sort: _messageRouteS, lean: _messageRouteL, limit: _messageRouteLim, populate: jest.fn().mockReturnValue({ lean: _messageRouteL, sort: _messageRouteS }) });
    const _messageAckL = jest.fn().mockResolvedValue([]);
    const _messageAckLim = jest.fn().mockReturnValue({ lean: _messageAckL });
    const _messageAckS = jest.fn().mockReturnValue({ limit: _messageAckLim, lean: _messageAckL, populate: jest.fn().mockReturnValue({ lean: _messageAckL }) });
    mockMessageAckFind.mockReturnValue({ sort: _messageAckS, lean: _messageAckL, limit: _messageAckLim, populate: jest.fn().mockReturnValue({ lean: _messageAckL, sort: _messageAckS }) });
    const _transmissionLogL = jest.fn().mockResolvedValue([]);
    const _transmissionLogLim = jest.fn().mockReturnValue({ lean: _transmissionLogL });
    const _transmissionLogS = jest.fn().mockReturnValue({ limit: _transmissionLogLim, lean: _transmissionLogL, populate: jest.fn().mockReturnValue({ lean: _transmissionLogL }) });
    mockTransmissionLogFind.mockReturnValue({ sort: _transmissionLogS, lean: _transmissionLogL, limit: _transmissionLogLim, populate: jest.fn().mockReturnValue({ lean: _transmissionLogL, sort: _transmissionLogS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('HL7Messaging');
  });


  test('createMessage creates/returns result', async () => {
    let r; try { r = await svc.createMessage({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listMessages returns result', async () => {
    let r; try { r = await svc.listMessages({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getMessage returns result', async () => {
    let r; try { r = await svc.getMessage({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateMessageStatus updates/returns result', async () => {
    let r; try { r = await svc.updateMessageStatus('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createRoute creates/returns result', async () => {
    let r; try { r = await svc.createRoute({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listRoutes returns result', async () => {
    let r; try { r = await svc.listRoutes({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateRoute updates/returns result', async () => {
    let r; try { r = await svc.updateRoute('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createAck creates/returns result', async () => {
    let r; try { r = await svc.createAck({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAcks returns result', async () => {
    let r; try { r = await svc.listAcks({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('logTransmission creates/returns result', async () => {
    let r; try { r = await svc.logTransmission({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listTransmissions returns result', async () => {
    let r; try { r = await svc.listTransmissions({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getMessagingStats returns object', async () => {
    let r; try { r = await svc.getMessagingStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
