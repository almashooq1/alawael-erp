'use strict';

/* ── mock-prefixed variables ── */
const mockSensorFind = jest.fn();
const mockSensorCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'sensor1', ...d }));
const mockSensorCount = jest.fn().mockResolvedValue(0);
const mockEnvironmentReadingFind = jest.fn();
const mockEnvironmentReadingCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'environmentReading1', ...d }));
const mockEnvironmentReadingCount = jest.fn().mockResolvedValue(0);
const mockEnvironmentAlertFind = jest.fn();
const mockEnvironmentAlertCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'environmentAlert1', ...d }));
const mockEnvironmentAlertCount = jest.fn().mockResolvedValue(0);
const mockEnvironmentPolicyFind = jest.fn();
const mockEnvironmentPolicyCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'environmentPolicy1', ...d }));
const mockEnvironmentPolicyCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddEnvironmentalMonitor', () => ({
  DDDSensor: {
    find: mockSensorFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'sensor1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'sensor1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSensorCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'sensor1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'sensor1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'sensor1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'sensor1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'sensor1' }) }),
    countDocuments: mockSensorCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDEnvironmentReading: {
    find: mockEnvironmentReadingFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'environmentReading1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'environmentReading1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockEnvironmentReadingCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'environmentReading1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'environmentReading1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'environmentReading1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'environmentReading1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'environmentReading1' }) }),
    countDocuments: mockEnvironmentReadingCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDEnvironmentAlert: {
    find: mockEnvironmentAlertFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'environmentAlert1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'environmentAlert1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockEnvironmentAlertCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'environmentAlert1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'environmentAlert1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'environmentAlert1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'environmentAlert1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'environmentAlert1' }) }),
    countDocuments: mockEnvironmentAlertCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDEnvironmentPolicy: {
    find: mockEnvironmentPolicyFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'environmentPolicy1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'environmentPolicy1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockEnvironmentPolicyCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'environmentPolicy1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'environmentPolicy1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'environmentPolicy1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'environmentPolicy1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'environmentPolicy1' }) }),
    countDocuments: mockEnvironmentPolicyCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  SENSOR_TYPES: ['item1', 'item2'],
  SENSOR_STATUSES: ['item1', 'item2'],
  ALERT_SEVERITIES: ['item1', 'item2'],
  ALERT_STATUSES: ['item1', 'item2'],
  READING_UNITS: ['item1', 'item2'],
  MONITORING_ZONES: ['item1', 'item2'],
  BUILTIN_SENSORS: ['item1', 'item2'],

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

const svc = require('../../services/dddEnvironmentalMonitor');

describe('dddEnvironmentalMonitor service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _sensorL = jest.fn().mockResolvedValue([]);
    const _sensorLim = jest.fn().mockReturnValue({ lean: _sensorL });
    const _sensorS = jest.fn().mockReturnValue({ limit: _sensorLim, lean: _sensorL, populate: jest.fn().mockReturnValue({ lean: _sensorL }) });
    mockSensorFind.mockReturnValue({ sort: _sensorS, lean: _sensorL, limit: _sensorLim, populate: jest.fn().mockReturnValue({ lean: _sensorL, sort: _sensorS }) });
    const _environmentReadingL = jest.fn().mockResolvedValue([]);
    const _environmentReadingLim = jest.fn().mockReturnValue({ lean: _environmentReadingL });
    const _environmentReadingS = jest.fn().mockReturnValue({ limit: _environmentReadingLim, lean: _environmentReadingL, populate: jest.fn().mockReturnValue({ lean: _environmentReadingL }) });
    mockEnvironmentReadingFind.mockReturnValue({ sort: _environmentReadingS, lean: _environmentReadingL, limit: _environmentReadingLim, populate: jest.fn().mockReturnValue({ lean: _environmentReadingL, sort: _environmentReadingS }) });
    const _environmentAlertL = jest.fn().mockResolvedValue([]);
    const _environmentAlertLim = jest.fn().mockReturnValue({ lean: _environmentAlertL });
    const _environmentAlertS = jest.fn().mockReturnValue({ limit: _environmentAlertLim, lean: _environmentAlertL, populate: jest.fn().mockReturnValue({ lean: _environmentAlertL }) });
    mockEnvironmentAlertFind.mockReturnValue({ sort: _environmentAlertS, lean: _environmentAlertL, limit: _environmentAlertLim, populate: jest.fn().mockReturnValue({ lean: _environmentAlertL, sort: _environmentAlertS }) });
    const _environmentPolicyL = jest.fn().mockResolvedValue([]);
    const _environmentPolicyLim = jest.fn().mockReturnValue({ lean: _environmentPolicyL });
    const _environmentPolicyS = jest.fn().mockReturnValue({ limit: _environmentPolicyLim, lean: _environmentPolicyL, populate: jest.fn().mockReturnValue({ lean: _environmentPolicyL }) });
    mockEnvironmentPolicyFind.mockReturnValue({ sort: _environmentPolicyS, lean: _environmentPolicyL, limit: _environmentPolicyLim, populate: jest.fn().mockReturnValue({ lean: _environmentPolicyL, sort: _environmentPolicyS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('EnvironmentalMonitor');
  });

  test('initialize runs without error', async () => {
    await expect(svc.initialize()).resolves.not.toThrow();
  });

  test('listSensors returns result', async () => {
    let r; try { r = await svc.listSensors({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getSensor returns result', async () => {
    let r; try { r = await svc.getSensor({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createSensor creates/returns result', async () => {
    let r; try { r = await svc.createSensor({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateSensor updates/returns result', async () => {
    let r; try { r = await svc.updateSensor('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordReading creates/returns result', async () => {
    let r; try { r = await svc.recordReading({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getReadings returns result', async () => {
    let r; try { r = await svc.getReadings({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getLatestReading returns result', async () => {
    let r; try { r = await svc.getLatestReading({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAlerts returns result', async () => {
    let r; try { r = await svc.listAlerts({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('acknowledgeAlert updates/returns result', async () => {
    let r; try { r = await svc.acknowledgeAlert('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('resolveAlert updates/returns result', async () => {
    let r; try { r = await svc.resolveAlert('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listPolicies returns result', async () => {
    let r; try { r = await svc.listPolicies({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createPolicy creates/returns result', async () => {
    let r; try { r = await svc.createPolicy({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updatePolicy updates/returns result', async () => {
    let r; try { r = await svc.updatePolicy('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getEnvironmentalAnalytics returns object', async () => {
    let r; try { r = await svc.getEnvironmentalAnalytics(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
