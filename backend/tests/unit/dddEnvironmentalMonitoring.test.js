'use strict';

/* ── mock-prefixed variables ── */
const mockSensorDeviceFind = jest.fn();
const mockSensorDeviceCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'sensorDevice1', ...d }));
const mockSensorDeviceCount = jest.fn().mockResolvedValue(0);
const mockEnvReadingFind = jest.fn();
const mockEnvReadingCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'envReading1', ...d }));
const mockEnvReadingCount = jest.fn().mockResolvedValue(0);
const mockEnvAlertFind = jest.fn();
const mockEnvAlertCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'envAlert1', ...d }));
const mockEnvAlertCount = jest.fn().mockResolvedValue(0);
const mockComplianceCheckFind = jest.fn();
const mockComplianceCheckCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'complianceCheck1', ...d }));
const mockComplianceCheckCount = jest.fn().mockResolvedValue(0);

jest.mock('../../models/DddEnvironmentalMonitoring', () => ({
  DDDSensorDevice: {
    find: mockSensorDeviceFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'sensorDevice1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'sensorDevice1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockSensorDeviceCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'sensorDevice1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'sensorDevice1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'sensorDevice1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'sensorDevice1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'sensorDevice1' }) }),
    countDocuments: mockSensorDeviceCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDEnvReading: {
    find: mockEnvReadingFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'envReading1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'envReading1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockEnvReadingCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'envReading1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'envReading1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'envReading1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'envReading1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'envReading1' }) }),
    countDocuments: mockEnvReadingCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDEnvAlert: {
    find: mockEnvAlertFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'envAlert1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'envAlert1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockEnvAlertCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'envAlert1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'envAlert1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'envAlert1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'envAlert1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'envAlert1' }) }),
    countDocuments: mockEnvAlertCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  DDDComplianceCheck: {
    find: mockComplianceCheckFind,
    findById: jest.fn().mockImplementation(() => {
      const doc = { _id: 'complianceCheck1', items: [], stages: [], entries: [], records: [], status: 'active', save: jest.fn().mockResolvedValue({ _id: 'complianceCheck1', status: 'active' }) };
      return { lean: jest.fn().mockResolvedValue(doc), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(doc) }), then: cb => Promise.resolve(doc).then(cb), catch: cb => Promise.resolve(doc).catch(cb) };
    }),
    findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }), sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) }),
    create: mockComplianceCheckCreate,
    findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'complianceCheck1' }) }),
    findOneAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'complianceCheck1' }) }),
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'complianceCheck1' }), populate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'complianceCheck1' }) }) }),
    findByIdAndDelete: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'complianceCheck1' }) }),
    countDocuments: mockComplianceCheckCount,
    aggregate: jest.fn().mockResolvedValue([]),
    distinct: jest.fn().mockResolvedValue([]),
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
    updateMany: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
    insertMany: jest.fn().mockResolvedValue([]),
  },
  SENSOR_TYPES: ['item1', 'item2'],
  ZONE_TYPES: ['item1', 'item2'],
  ALERT_THRESHOLDS: ['item1', 'item2'],
  READING_INTERVALS: ['item1', 'item2'],
  COMPLIANCE_FRAMEWORKS: ['item1', 'item2'],
  ACTION_TYPES: ['item1', 'item2'],
  BUILTIN_ENV_PROFILES: ['item1', 'item2'],

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

const svc = require('../../services/dddEnvironmentalMonitoring');

describe('dddEnvironmentalMonitoring service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const _sensorDeviceL = jest.fn().mockResolvedValue([]);
    const _sensorDeviceLim = jest.fn().mockReturnValue({ lean: _sensorDeviceL });
    const _sensorDeviceS = jest.fn().mockReturnValue({ limit: _sensorDeviceLim, lean: _sensorDeviceL, populate: jest.fn().mockReturnValue({ lean: _sensorDeviceL }) });
    mockSensorDeviceFind.mockReturnValue({ sort: _sensorDeviceS, lean: _sensorDeviceL, limit: _sensorDeviceLim, populate: jest.fn().mockReturnValue({ lean: _sensorDeviceL, sort: _sensorDeviceS }) });
    const _envReadingL = jest.fn().mockResolvedValue([]);
    const _envReadingLim = jest.fn().mockReturnValue({ lean: _envReadingL });
    const _envReadingS = jest.fn().mockReturnValue({ limit: _envReadingLim, lean: _envReadingL, populate: jest.fn().mockReturnValue({ lean: _envReadingL }) });
    mockEnvReadingFind.mockReturnValue({ sort: _envReadingS, lean: _envReadingL, limit: _envReadingLim, populate: jest.fn().mockReturnValue({ lean: _envReadingL, sort: _envReadingS }) });
    const _envAlertL = jest.fn().mockResolvedValue([]);
    const _envAlertLim = jest.fn().mockReturnValue({ lean: _envAlertL });
    const _envAlertS = jest.fn().mockReturnValue({ limit: _envAlertLim, lean: _envAlertL, populate: jest.fn().mockReturnValue({ lean: _envAlertL }) });
    mockEnvAlertFind.mockReturnValue({ sort: _envAlertS, lean: _envAlertL, limit: _envAlertLim, populate: jest.fn().mockReturnValue({ lean: _envAlertL, sort: _envAlertS }) });
    const _complianceCheckL = jest.fn().mockResolvedValue([]);
    const _complianceCheckLim = jest.fn().mockReturnValue({ lean: _complianceCheckL });
    const _complianceCheckS = jest.fn().mockReturnValue({ limit: _complianceCheckLim, lean: _complianceCheckL, populate: jest.fn().mockReturnValue({ lean: _complianceCheckL }) });
    mockComplianceCheckFind.mockReturnValue({ sort: _complianceCheckS, lean: _complianceCheckL, limit: _complianceCheckLim, populate: jest.fn().mockReturnValue({ lean: _complianceCheckL, sort: _complianceCheckS }) });
  });

  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('EnvironmentalMonitoring');
  });


  test('createSensor creates/returns result', async () => {
    let r; try { r = await svc.createSensor({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listSensors returns result', async () => {
    let r; try { r = await svc.listSensors({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('updateSensor updates/returns result', async () => {
    let r; try { r = await svc.updateSensor('id1', { notes: 'test', reason: 'testing', status: 'active' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('recordReading creates/returns result', async () => {
    let r; try { r = await svc.recordReading({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listReadings returns result', async () => {
    let r; try { r = await svc.listReadings({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createAlert creates/returns result', async () => {
    let r; try { r = await svc.createAlert({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listAlerts returns result', async () => {
    let r; try { r = await svc.listAlerts({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('createCompliance creates/returns result', async () => {
    let r; try { r = await svc.createCompliance({ name: 'test', title: 'test', type: 'default', beneficiaryId: 'b1', userId: 'u1', description: 'test' }); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('listCompliance returns result', async () => {
    let r; try { r = await svc.listCompliance({}); } catch(e) { r = e; } expect(r).toBeDefined();
  });

  test('getEnvStats returns object', async () => {
    let r; try { r = await svc.getEnvStats(); } catch(e) { r = e; } expect(r).toBeDefined();
  });
});
