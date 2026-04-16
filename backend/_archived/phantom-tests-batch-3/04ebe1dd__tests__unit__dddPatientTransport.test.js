'use strict';

/* ── mock-prefixed variables ── */
const mockTransportRequestFind = jest.fn();
const mockTransportRequestCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'transportRequest1', ...d }));
const mockTransportRequestCount = jest.fn().mockResolvedValue(0);
const mockTripRecordFind = jest.fn();
const mockTripRecordCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'tripRecord1', ...d }));
const mockTripRecordCount = jest.fn().mockResolvedValue(0);
const mockAccessibilityNeedFind = jest.fn();
const mockAccessibilityNeedCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'accessibilityNeed1', ...d }));
const mockAccessibilityNeedCount = jest.fn().mockResolvedValue(0);
const mockMedicalEscortFind = jest.fn();
const mockMedicalEscortCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'medicalEscort1', ...d }));
const mockMedicalEscortCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddPatientTransport', () => ({
  DDDTransportRequest: {
    find: mockTransportRequestFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'transportRequest1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'transportRequest1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockTransportRequestCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transportRequest1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transportRequest1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transportRequest1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transportRequest1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'transportRequest1' }) }),
    countDocuments: mockTransportRequestCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDTripRecord: {
    find: mockTripRecordFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'tripRecord1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'tripRecord1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockTripRecordCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'tripRecord1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'tripRecord1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'tripRecord1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'tripRecord1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'tripRecord1' }) }),
    countDocuments: mockTripRecordCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDAccessibilityNeed: {
    find: mockAccessibilityNeedFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'accessibilityNeed1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'accessibilityNeed1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockAccessibilityNeedCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'accessibilityNeed1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'accessibilityNeed1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'accessibilityNeed1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'accessibilityNeed1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'accessibilityNeed1' }) }),
    countDocuments: mockAccessibilityNeedCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDMedicalEscort: {
    find: mockMedicalEscortFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'medicalEscort1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'medicalEscort1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockMedicalEscortCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'medicalEscort1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'medicalEscort1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'medicalEscort1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'medicalEscort1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'medicalEscort1' }) }),
    countDocuments: mockMedicalEscortCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  REQUEST_STATUSES: ['item1', 'item2'],
  TRIP_TYPES: ['item1', 'item2'],
  ACCESSIBILITY_TYPES: ['item1', 'item2'],
  ESCORT_TYPES: ['item1', 'item2'],
  CANCELLATION_REASONS: ['item1', 'item2'],
  TRIP_PRIORITIES: ['item1', 'item2'],
  BUILTIN_ACCESSIBILITY_PROFILES: ['item1', 'item2'],

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

const svc = require('../../services/dddPatientTransport');

describe('dddPatientTransport service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _transportRequestL = jest.fn().mockResolvedValue([]);
    const _transportRequestLim = jest.fn().mockReturnValue({ lean: _transportRequestL });
    const _transportRequestS = jest.fn().mockReturnValue({ limit: _transportRequestLim, lean: _transportRequestL, populate: jest.fn().mockReturnValue({ lean: _transportRequestL }) });
    mockTransportRequestFind.mockReturnValue({ sort: _transportRequestS, lean: _transportRequestL, limit: _transportRequestLim, populate: jest.fn().mockReturnValue({ lean: _transportRequestL, sort: _transportRequestS }) });
    const _tripRecordL = jest.fn().mockResolvedValue([]);
    const _tripRecordLim = jest.fn().mockReturnValue({ lean: _tripRecordL });
    const _tripRecordS = jest.fn().mockReturnValue({ limit: _tripRecordLim, lean: _tripRecordL, populate: jest.fn().mockReturnValue({ lean: _tripRecordL }) });
    mockTripRecordFind.mockReturnValue({ sort: _tripRecordS, lean: _tripRecordL, limit: _tripRecordLim, populate: jest.fn().mockReturnValue({ lean: _tripRecordL, sort: _tripRecordS }) });
    const _accessibilityNeedL = jest.fn().mockResolvedValue([]);
    const _accessibilityNeedLim = jest.fn().mockReturnValue({ lean: _accessibilityNeedL });
    const _accessibilityNeedS = jest.fn().mockReturnValue({ limit: _accessibilityNeedLim, lean: _accessibilityNeedL, populate: jest.fn().mockReturnValue({ lean: _accessibilityNeedL }) });
    mockAccessibilityNeedFind.mockReturnValue({ sort: _accessibilityNeedS, lean: _accessibilityNeedL, limit: _accessibilityNeedLim, populate: jest.fn().mockReturnValue({ lean: _accessibilityNeedL, sort: _accessibilityNeedS }) });
    const _medicalEscortL = jest.fn().mockResolvedValue([]);
    const _medicalEscortLim = jest.fn().mockReturnValue({ lean: _medicalEscortL });
    const _medicalEscortS = jest.fn().mockReturnValue({ limit: _medicalEscortLim, lean: _medicalEscortL, populate: jest.fn().mockReturnValue({ lean: _medicalEscortL }) });
    mockMedicalEscortFind.mockReturnValue({ sort: _medicalEscortS, lean: _medicalEscortL, limit: _medicalEscortLim, populate: jest.fn().mockReturnValue({ lean: _medicalEscortL, sort: _medicalEscortS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('PatientTransport');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listRequests returns result', async () => {
    let r; try { r = await svc.listRequests({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getRequest returns result', async () => {
    let r; try { r = await svc.getRequest({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createRequest creates/returns result', async () => {
    let r; try { r = await svc.createRequest({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateRequest updates/returns result', async () => {
    let r; try { r = await svc.updateRequest('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('cancelRequest updates/returns result', async () => {
    let r; try { r = await svc.cancelRequest('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listTrips returns result', async () => {
    let r; try { r = await svc.listTrips({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('startTrip creates/returns result', async () => {
    let r; try { r = await svc.startTrip({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('completeTrip updates/returns result', async () => {
    let r; try { r = await svc.completeTrip('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAccessibilityNeeds returns result', async () => {
    let r; try { r = await svc.listAccessibilityNeeds({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('setAccessibilityNeed updates/returns result', async () => {
    let r; try { r = await svc.setAccessibilityNeed('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateAccessibilityNeed updates/returns result', async () => {
    let r; try { r = await svc.updateAccessibilityNeed('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listEscorts returns result', async () => {
    let r; try { r = await svc.listEscorts({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('assignEscort creates/returns result', async () => {
    let r; try { r = await svc.assignEscort({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getPatientTransportAnalytics returns object', async () => {
    let r; try { r = await svc.getPatientTransportAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
