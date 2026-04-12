'use strict';

const chain = () => {
  const c = {};
  [
    'find',
    'findById',
    'findByIdAndUpdate',
    'findOne',
    'sort',
    'skip',
    'limit',
    'lean',
    'populate',
    'countDocuments',
    'create',
  ].forEach(m => {
    c[m] = jest.fn().mockReturnValue(c);
  });
  c.then = undefined;
  return c;
};
const makeModel = () => {
  const c = chain();
  const M = jest.fn(() => c);
  Object.assign(M, c);
  return M;
};

const mockDDDBackupJob = makeModel();
const mockDDDRestoreOperation = makeModel();
const mockDDDBackupPolicy = makeModel();
const mockDDDBackupVerification = makeModel();

jest.mock('../../models/DddBackupManager', () => ({
  DDDBackupJob: mockDDDBackupJob,
  DDDRestoreOperation: mockDDDRestoreOperation,
  DDDBackupPolicy: mockDDDBackupPolicy,
  DDDBackupVerification: mockDDDBackupVerification,
  BACKUP_TYPES: ['full', 'incremental', 'differential'],
  BACKUP_STATUSES: ['pending', 'running', 'completed', 'failed'],
  STORAGE_TARGETS: ['local', 's3', 'azure_blob'],
  RETENTION_POLICIES: ['7d', '30d', '90d', '365d'],
  DATA_SOURCES: ['mongodb', 'postgres', 'files'],
  ENCRYPTION_METHODS: ['aes256', 'rsa'],
  BUILTIN_BACKUP_SCHEDULES: [{ code: 'DAILY_FULL' }, { code: 'WEEKLY_INCR' }],
}));

jest.mock('../../services/base/BaseCrudService', () => {
  return class BaseCrudService {
    constructor() {}
    log() {}
    _create(M, d) {
      return M.create(d);
    }
    _update(M, id, d, o) {
      return M.findByIdAndUpdate(id, d, { new: true, ...o }).lean();
    }
    _list(M, f, o) {
      return M.find(f)
        .sort(o?.sort || {})
        .lean();
    }
    _getById(M, id) {
      return M.findById(id).lean();
    }
  };
});

const service = require('../../services/dddBackupManager');

beforeEach(() => {
  [
    mockDDDBackupJob,
    mockDDDRestoreOperation,
    mockDDDBackupPolicy,
    mockDDDBackupVerification,
  ].forEach(M => {
    Object.values(M).forEach(v => {
      if (typeof v === 'function' && v.mockClear) v.mockClear();
    });
  });
});

describe('dddBackupManager', () => {
  /* ── Jobs ── */
  describe('createJob', () => {
    it('creates via _create', async () => {
      mockDDDBackupJob.create.mockResolvedValue({ _id: 'j1' });
      expect(await service.createJob({ type: 'full' })).toHaveProperty('_id');
    });
  });

  describe('listJobs', () => {
    it('returns list sorted by createdAt desc', async () => {
      mockDDDBackupJob.find.mockReturnThis();
      mockDDDBackupJob.sort.mockReturnThis();
      mockDDDBackupJob.lean.mockResolvedValue([{ _id: 'j1' }]);
      expect(await service.listJobs({})).toHaveLength(1);
      expect(mockDDDBackupJob.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('updateJobStatus', () => {
    it('updates job status with findByIdAndUpdate', async () => {
      mockDDDBackupJob.findByIdAndUpdate.mockReturnThis();
      mockDDDBackupJob.lean.mockResolvedValue({ _id: 'j1', status: 'completed' });
      const r = await service.updateJobStatus('j1', 'completed');
      expect(r.status).toBe('completed');
      expect(mockDDDBackupJob.findByIdAndUpdate).toHaveBeenCalledWith(
        'j1',
        { status: 'completed' },
        { new: true }
      );
    });

    it('passes extra fields', async () => {
      mockDDDBackupJob.findByIdAndUpdate.mockReturnThis();
      mockDDDBackupJob.lean.mockResolvedValue({ _id: 'j1', status: 'failed', errorMsg: 'disk' });
      await service.updateJobStatus('j1', 'failed', { errorMsg: 'disk' });
      expect(mockDDDBackupJob.findByIdAndUpdate).toHaveBeenCalledWith(
        'j1',
        { status: 'failed', errorMsg: 'disk' },
        { new: true }
      );
    });
  });

  /* ── Restores ── */
  describe('createRestore', () => {
    it('creates via _create', async () => {
      mockDDDRestoreOperation.create.mockResolvedValue({ _id: 'r1' });
      expect(await service.createRestore({ jobId: 'j1' })).toHaveProperty('_id');
    });
  });

  describe('listRestores', () => {
    it('returns list sorted by createdAt desc', async () => {
      mockDDDRestoreOperation.find.mockReturnThis();
      mockDDDRestoreOperation.sort.mockReturnThis();
      mockDDDRestoreOperation.lean.mockResolvedValue([{ _id: 'r1' }]);
      expect(await service.listRestores({})).toHaveLength(1);
      expect(mockDDDRestoreOperation.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  /* ── Policies ── */
  describe('createPolicy', () => {
    it('creates via _create', async () => {
      mockDDDBackupPolicy.create.mockResolvedValue({ _id: 'p1' });
      expect(await service.createPolicy({ retention: '30d' })).toHaveProperty('_id');
    });
  });

  describe('listPolicies', () => {
    it('returns list sorted by createdAt desc', async () => {
      mockDDDBackupPolicy.find.mockReturnThis();
      mockDDDBackupPolicy.sort.mockReturnThis();
      mockDDDBackupPolicy.lean.mockResolvedValue([]);
      expect(await service.listPolicies({})).toEqual([]);
      expect(mockDDDBackupPolicy.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  describe('updatePolicy', () => {
    it('updates via _update', async () => {
      mockDDDBackupPolicy.findByIdAndUpdate.mockReturnThis();
      mockDDDBackupPolicy.lean.mockResolvedValue({ _id: 'p1', retention: '90d' });
      expect((await service.updatePolicy('p1', { retention: '90d' })).retention).toBe('90d');
    });
  });

  /* ── Verifications ── */
  describe('createVerification', () => {
    it('creates via _create', async () => {
      mockDDDBackupVerification.create.mockResolvedValue({ _id: 'v1' });
      expect(await service.createVerification({ jobId: 'j1' })).toHaveProperty('_id');
    });
  });

  describe('listVerifications', () => {
    it('returns list sorted by createdAt desc', async () => {
      mockDDDBackupVerification.find.mockReturnThis();
      mockDDDBackupVerification.sort.mockReturnThis();
      mockDDDBackupVerification.lean.mockResolvedValue([{ _id: 'v1' }]);
      expect(await service.listVerifications({})).toHaveLength(1);
      expect(mockDDDBackupVerification.sort).toHaveBeenCalledWith({ createdAt: -1 });
    });
  });

  /* ── Stats ── */
  describe('getBackupStats', () => {
    it('returns completedBackups, totalRestores, activePolicies, passedVerifications', async () => {
      mockDDDBackupJob.countDocuments.mockResolvedValue(50);
      mockDDDRestoreOperation.countDocuments.mockResolvedValue(12);
      mockDDDBackupPolicy.countDocuments.mockResolvedValue(3);
      mockDDDBackupVerification.countDocuments.mockResolvedValue(40);
      const r = await service.getBackupStats();
      expect(r).toEqual({
        completedBackups: 50,
        totalRestores: 12,
        activePolicies: 3,
        passedVerifications: 40,
      });
    });
  });
});
