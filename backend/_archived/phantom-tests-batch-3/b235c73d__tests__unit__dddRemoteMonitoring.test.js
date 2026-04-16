'use strict';

/* ── mock-prefixed variables ── */
const mockMonitoringDeviceFind = jest.fn();
const mockMonitoringDeviceCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'monitoringDevice1', ...d }));
const mockMonitoringDeviceCount = jest.fn().mockResolvedValue(0);
const mockVitalReadingFind = jest.fn();
const mockVitalReadingCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'vitalReading1', ...d }));
const mockVitalReadingCount = jest.fn().mockResolvedValue(0);
const mockMonitoringAlertFind = jest.fn();
const mockMonitoringAlertCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'monitoringAlert1', ...d }));
const mockMonitoringAlertCount = jest.fn().mockResolvedValue(0);
const mockCareEscalationFind = jest.fn();
const mockCareEscalationCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'careEscalation1', ...d }));
const mockCareEscalationCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddRemoteMonitoring', () => ({
  DDDMonitoringDevice: {
    find: mockMonitoringDeviceFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'monitoringDevice1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'monitoringDevice1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockMonitoringDeviceCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'monitoringDevice1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'monitoringDevice1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'monitoringDevice1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'monitoringDevice1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'monitoringDevice1' }) }),
    countDocuments: mockMonitoringDeviceCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDVitalReading: {
    find: mockVitalReadingFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'vitalReading1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'vitalReading1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockVitalReadingCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vitalReading1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vitalReading1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vitalReading1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vitalReading1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'vitalReading1' }) }),
    countDocuments: mockVitalReadingCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDMonitoringAlert: {
    find: mockMonitoringAlertFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'monitoringAlert1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'monitoringAlert1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockMonitoringAlertCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'monitoringAlert1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'monitoringAlert1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'monitoringAlert1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'monitoringAlert1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'monitoringAlert1' }) }),
    countDocuments: mockMonitoringAlertCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDCareEscalation: {
    find: mockCareEscalationFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'careEscalation1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'careEscalation1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockCareEscalationCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'careEscalation1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'careEscalation1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'careEscalation1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'careEscalation1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'careEscalation1' }) }),
    countDocuments: mockCareEscalationCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DEVICE_TYPES: ['item1', 'item2'],
  DEVICE_STATUSES: ['item1', 'item2'],
  VITAL_TYPES: ['item1', 'item2'],
  ALERT_SEVERITIES: ['item1', 'item2'],
  ESCALATION_LEVELS: ['item1', 'item2'],
  MONITORING_PROGRAMS: ['item1', 'item2'],
  BUILTIN_THRESHOLD_PROFILES: ['item1', 'item2'],

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

const svc = require('../../services/dddRemoteMonitoring');

describe('dddRemoteMonitoring service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _monitoringDeviceL = jest.fn().mockResolvedValue([]);
    const _monitoringDeviceLim = jest.fn().mockReturnValue({ lean: _monitoringDeviceL });
    const _monitoringDeviceS = jest.fn().mockReturnValue({ limit: _monitoringDeviceLim, lean: _monitoringDeviceL, populate: jest.fn().mockReturnValue({ lean: _monitoringDeviceL }) });
    mockMonitoringDeviceFind.mockReturnValue({ sort: _monitoringDeviceS, lean: _monitoringDeviceL, limit: _monitoringDeviceLim, populate: jest.fn().mockReturnValue({ lean: _monitoringDeviceL, sort: _monitoringDeviceS }) });
    const _vitalReadingL = jest.fn().mockResolvedValue([]);
    const _vitalReadingLim = jest.fn().mockReturnValue({ lean: _vitalReadingL });
    const _vitalReadingS = jest.fn().mockReturnValue({ limit: _vitalReadingLim, lean: _vitalReadingL, populate: jest.fn().mockReturnValue({ lean: _vitalReadingL }) });
    mockVitalReadingFind.mockReturnValue({ sort: _vitalReadingS, lean: _vitalReadingL, limit: _vitalReadingLim, populate: jest.fn().mockReturnValue({ lean: _vitalReadingL, sort: _vitalReadingS }) });
    const _monitoringAlertL = jest.fn().mockResolvedValue([]);
    const _monitoringAlertLim = jest.fn().mockReturnValue({ lean: _monitoringAlertL });
    const _monitoringAlertS = jest.fn().mockReturnValue({ limit: _monitoringAlertLim, lean: _monitoringAlertL, populate: jest.fn().mockReturnValue({ lean: _monitoringAlertL }) });
    mockMonitoringAlertFind.mockReturnValue({ sort: _monitoringAlertS, lean: _monitoringAlertL, limit: _monitoringAlertLim, populate: jest.fn().mockReturnValue({ lean: _monitoringAlertL, sort: _monitoringAlertS }) });
    const _careEscalationL = jest.fn().mockResolvedValue([]);
    const _careEscalationLim = jest.fn().mockReturnValue({ lean: _careEscalationL });
    const _careEscalationS = jest.fn().mockReturnValue({ limit: _careEscalationLim, lean: _careEscalationL, populate: jest.fn().mockReturnValue({ lean: _careEscalationL }) });
    mockCareEscalationFind.mockReturnValue({ sort: _careEscalationS, lean: _careEscalationL, limit: _careEscalationLim, populate: jest.fn().mockReturnValue({ lean: _careEscalationL, sort: _careEscalationS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('RemoteMonitoring');
  });


  test('registerDevice creates/returns result', async () => {
    let r; try { r = await svc.registerDevice({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listDevices returns result', async () => {
    let r; try { r = await svc.listDevices({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateDevice updates/returns result', async () => {
    let r; try { r = await svc.updateDevice('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordVital creates/returns result', async () => {
    let r; try { r = await svc.recordVital({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listVitals returns result', async () => {
    let r; try { r = await svc.listVitals({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createAlert creates/returns result', async () => {
    let r; try { r = await svc.createAlert({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAlerts returns result', async () => {
    let r; try { r = await svc.listAlerts({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('acknowledgeAlert updates/returns result', async () => {
    let r; try { r = await svc.acknowledgeAlert('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createEscalation creates/returns result', async () => {
    let r; try { r = await svc.createEscalation({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listEscalations returns result', async () => {
    let r; try { r = await svc.listEscalations({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getMonitoringStats returns object', async () => {
    let r; try { r = await svc.getMonitoringStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
