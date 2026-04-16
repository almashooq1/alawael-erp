'use strict';

/* ── mock-prefixed variables for jest.mock factory ── */
const mockPlanFind = jest
  .fn()
  .mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) });
const mockPlanFindOne = jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
const mockPlanCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'p1', ...d }));
const mockPlanCount = jest.fn().mockResolvedValue(3);

const mockBackupFind = jest
  .fn()
  .mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) });
const mockBackupCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'b1', ...d }));
const mockBackupCount = jest.fn().mockResolvedValue(5);

const mockTestFind = jest
  .fn()
  .mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) });
const mockTestCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 't1', ...d }));
const mockTestUpdate = jest
  .fn()
  .mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 't1', status: 'passed' }) });
const mockTestCount = jest.fn().mockResolvedValue(2);

const mockLogFind = jest
  .fn()
  .mockReturnValue({
    sort: jest
      .fn()
      .mockReturnValue({
        limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
      }),
  });
const mockLogCreate = jest.fn().mockImplementation(d => Promise.resolve({ _id: 'l1', ...d }));
const mockLogUpdate = jest
  .fn()
  .mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'l1', status: 'fully_recovered' }) });
const mockLogCount = jest.fn().mockResolvedValue(7);
const mockLogCountActive = jest.fn().mockResolvedValue(1);

jest.mock('../../models/DddDisasterRecovery', () => ({
  DDDRecoveryPlan: {
    find: mockPlanFind,
    findById: jest.fn().mockResolvedValue({ _id: 'p1' }),
    findOne: mockPlanFindOne,
    create: mockPlanCreate,
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({}) }),
    countDocuments: mockPlanCount,
  },
  DDDBackupSchedule: {
    find: mockBackupFind,
    findOne: jest.fn().mockResolvedValue(null),
    create: mockBackupCreate,
    findByIdAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({}) }),
    countDocuments: mockBackupCount,
  },
  DDDRecoveryTest: {
    find: mockTestFind,
    findOne: jest.fn().mockResolvedValue(null),
    create: mockTestCreate,
    findByIdAndUpdate: mockTestUpdate,
    countDocuments: mockTestCount,
  },
  DDDRecoveryLog: {
    find: mockLogFind,
    findOne: jest.fn().mockResolvedValue(null),
    create: mockLogCreate,
    findByIdAndUpdate: mockLogUpdate,
    countDocuments: mockLogCount,
  },
  DISASTER_TYPES: ['natural', 'technical', 'human'],
  RECOVERY_STATUSES: ['active', 'inactive'],
  BACKUP_TYPES: ['full', 'incremental', 'differential'],
  RTO_LEVELS: ['low', 'medium', 'high'],
  RPO_LEVELS: ['low', 'medium', 'high'],
  RECOVERY_STRATEGIES: ['hot_standby', 'warm_standby', 'cold_standby'],
  BUILTIN_RECOVERY_PLANS: [{ code: 'default', name: 'Default Recovery Plan' }],
}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor(n, m, models) {
      this.name = n;
      this.meta = m;
      this.models = models;
    }
    log() {}
    _list(M, q, o) {
      return M.find(q || {})
        .sort((o && o.sort) || {})
        .lean();
    }
    _getById(M, id) {
      return M.findById(id);
    }
    _create(M, d) {
      return M.create(d);
    }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...(o || {}) }).lean();
    }
  };
});

const svc = require('../../services/dddDisasterRecovery');

describe('dddDisasterRecovery service', () => {
  beforeEach(() => jest.clearAllMocks());

  /* ── Singleton ── */
  test('exports singleton instance', () => {
    expect(typeof svc).toBe('object');
    expect(svc.name).toBe('DisasterRecovery');
  });
  test('initialize seeds plans', async () => {
    await svc.initialize();
    expect(mockPlanFindOne).toHaveBeenCalled();
  });

  /* ── Plans ── */
  test('listPlans returns array', async () => {
    await svc.listPlans({ disasterType: 'natural' });
    expect(mockPlanFind).toHaveBeenCalled();
  });
  test('createPlan creates', async () => {
    const r = await svc.createPlan({ name: 'Flood Plan' });
    expect(mockPlanCreate).toHaveBeenCalled();
  });

  /* ── Backup Schedules ── */
  test('listBackups returns array', async () => {
    await svc.listBackups({ backupType: 'full' });
    expect(mockBackupFind).toHaveBeenCalled();
  });
  test('createBackup generates code', async () => {
    const r = await svc.createBackup({ name: 'Daily Full' });
    expect(r.code).toMatch(/^BKP-/);
  });

  /* ── Recovery Tests ── */
  test('listTests returns array', async () => {
    await svc.listTests({ status: 'passed' });
    expect(mockTestFind).toHaveBeenCalled();
  });
  test('scheduleTest generates testCode', async () => {
    const r = await svc.scheduleTest({ planId: 'p1' });
    expect(r.testCode).toMatch(/^DRTEST-/);
  });
  test('completeTest - passed', async () => {
    await svc.completeTest('t1', { passed: true, notes: 'OK' });
    expect(mockTestUpdate).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ status: 'passed' }),
      { new: true }
    );
  });
  test('completeTest - failed', async () => {
    mockTestUpdate.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue({ status: 'failed' }) });
    const r = await svc.completeTest('t1', { passed: false });
    expect(mockTestUpdate).toHaveBeenCalledWith(
      't1',
      expect.objectContaining({ status: 'failed' }),
      { new: true }
    );
  });

  /* ── Recovery Logs ── */
  test('listLogs returns array', async () => {
    await svc.listLogs();
    expect(mockLogFind).toHaveBeenCalled();
  });
  test('triggerRecovery generates logCode', async () => {
    const r = await svc.triggerRecovery({ disasterType: 'technical' });
    expect(r.logCode).toMatch(/^DRLOG-/);
  });
  test('resolveRecovery sets status fully_recovered', async () => {
    await svc.resolveRecovery('l1', 'Root cause fixed');
    expect(mockLogUpdate).toHaveBeenCalledWith(
      'l1',
      expect.objectContaining({ status: 'fully_recovered', postMortem: 'Root cause fixed' }),
      { new: true }
    );
  });

  /* ── Analytics ── */
  test('getRecoveryAnalytics returns counts', async () => {
    const a = await svc.getRecoveryAnalytics();
    expect(a).toHaveProperty('plans');
    expect(a).toHaveProperty('backups');
    expect(a).toHaveProperty('tests');
    expect(a).toHaveProperty('logs');
    expect(a).toHaveProperty('activeRecoveries');
  });
});
