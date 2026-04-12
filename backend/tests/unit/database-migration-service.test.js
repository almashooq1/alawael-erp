/**
 * Unit tests for services/database-migration-service.js
 * DatabaseMigrationService — class export (new-able)
 */

/* ─── mocks ─────────────────────────────────────────────────────────── */

const mockFsPromises = {
  mkdir: jest.fn().mockResolvedValue(undefined),
  readdir: jest.fn().mockResolvedValue([]),
  access: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue('{}'),
};

jest.mock('fs', () => ({
  promises: mockFsPromises,
  readFileSync: jest.fn().mockReturnValue('file-content'),
}));

const mockMigrationModel = {
  find: jest.fn(),
  findOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  countDocuments: jest.fn(),
};

jest.mock('mongoose', () => ({
  Schema: jest.fn().mockReturnValue({}),
  model: jest.fn().mockReturnValue(mockMigrationModel),
  models: {},
  connection: {
    db: {
      listCollections: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
      collection: jest.fn().mockReturnValue({
        find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
        deleteMany: jest.fn().mockResolvedValue(undefined),
        insertMany: jest.fn().mockResolvedValue(undefined),
      }),
    },
  },
}));

jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnValue({
      digest: jest.fn().mockReturnValue('abcdef1234567890'),
    }),
  }),
}));

const DatabaseMigrationService = require('../../services/database-migration-service');

/* ─── tests ─────────────────────────────────────────────────────────── */

describe('DatabaseMigrationService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DatabaseMigrationService({ migrationsDir: './mig', backupDir: './bak' });
  });

  // ── constructor ──────────────────────────────────────────────────

  describe('constructor', () => {
    it('uses default config', () => {
      const s = new DatabaseMigrationService();
      expect(s.config.migrationsDir).toBe('./migrations');
      expect(s.config.migrationsCollection).toBe('migrations');
    });

    it('accepts custom config', () => {
      expect(service.config.migrationsDir).toBe('./mig');
      expect(service.config.backupDir).toBe('./bak');
    });
  });

  // ── initialize ───────────────────────────────────────────────────

  describe('initialize', () => {
    it('sets connection and creates Migration model', async () => {
      const mockConn = { db: {} };
      const result = await service.initialize(mockConn);

      expect(service.connection).toBe(mockConn);
      expect(service.Migration).toBeDefined();
      expect(result).toBe(service);
    });

    it('uses mongoose.connection as default', async () => {
      await service.initialize();
      expect(service.connection).toBeDefined();
    });
  });

  // ── ensureMigrationsDir ──────────────────────────────────────────

  describe('ensureMigrationsDir', () => {
    it('creates both directories', async () => {
      await service.ensureMigrationsDir();
      expect(mockFsPromises.mkdir).toHaveBeenCalledTimes(2);
    });

    it('ignores EEXIST errors', async () => {
      const err = new Error('exists');
      err.code = 'EEXIST';
      mockFsPromises.mkdir.mockRejectedValueOnce(err);
      await expect(service.ensureMigrationsDir()).resolves.not.toThrow();
    });
  });

  // ── createMigration ──────────────────────────────────────────────

  describe('createMigration', () => {
    it('creates migration file with timestamp prefix', async () => {
      const result = await service.createMigration('add users index');

      expect(mockFsPromises.writeFile).toHaveBeenCalled();
      expect(result.filename).toMatch(/^\d+_add_users_index\.js$/);
      expect(result.filepath).toContain('mig');
    });

    it('includes description in options', async () => {
      const result = await service.createMigration('test', { description: 'My test' });
      const content = mockFsPromises.writeFile.mock.calls[0][1];
      expect(content).toContain('My test');
    });
  });

  // ── getMigrations ────────────────────────────────────────────────

  describe('getMigrations', () => {
    beforeEach(() => {
      service.Migration = mockMigrationModel;
    });

    it('returns migrations with executed status', async () => {
      mockFsPromises.readdir.mockResolvedValue(['001_init.js', '002_add_field.js']);
      mockMigrationModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ name: '001_init' }]),
        }),
      });

      const result = await service.getMigrations();

      expect(result).toHaveLength(2);
      expect(result[0].executed).toBe(true);
      expect(result[1].executed).toBe(false);
    });

    it('filters non-js files', async () => {
      mockFsPromises.readdir.mockResolvedValue(['readme.txt', '001_init.js']);
      mockMigrationModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.getMigrations();
      expect(result).toHaveLength(1);
    });
  });

  // ── getPendingMigrations ─────────────────────────────────────────

  describe('getPendingMigrations', () => {
    it('returns only non-executed migrations', async () => {
      service.Migration = mockMigrationModel;
      mockFsPromises.readdir.mockResolvedValue(['001_a.js', '002_b.js']);
      mockMigrationModel.find.mockReturnValue({
        select: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue([{ name: '001_a' }]),
        }),
      });

      const result = await service.getPendingMigrations();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('002_b');
    });
  });

  // ── runMigration ─────────────────────────────────────────────────

  describe('runMigration', () => {
    beforeEach(() => {
      service.Migration = mockMigrationModel;
      service.connection = {
        db: {
          listCollections: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
        },
      };
      service.createBackup = jest.fn().mockResolvedValue('/bak/backup.json');
      service.generateHash = jest.fn().mockReturnValue('hash123');
    });

    it('skips already-executed migration', async () => {
      mockMigrationModel.findOne.mockResolvedValue({ status: 'success' });

      const result = await service.runMigration('001_test');

      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('already_executed');
    });

    it('throws when file not found', async () => {
      mockFsPromises.access.mockRejectedValueOnce(new Error('ENOENT'));

      await expect(service.runMigration('no_exist')).rejects.toThrow('الترحيل غير موجود');
    });

    it('runs migration up() and records success', async () => {
      mockMigrationModel.findOne.mockResolvedValue(null);
      mockMigrationModel.findOneAndUpdate.mockResolvedValue({});

      // Mock require for migration file
      const mockMig = { up: jest.fn().mockResolvedValue(undefined), down: jest.fn() };
      jest.doMock(require('path').join('./mig', '001_test.js'), () => mockMig, { virtual: true });

      const result = await service.runMigration('001_test');

      expect(result.success).toBe(true);
      expect(result.backupPath).toBe('/bak/backup.json');
      expect(mockMigrationModel.findOneAndUpdate).toHaveBeenCalled();
    });

    it('records failure and re-throws on up() error', async () => {
      mockMigrationModel.findOne.mockResolvedValue(null);
      mockMigrationModel.findOneAndUpdate.mockResolvedValue({});

      jest.doMock(
        require('path').join('./mig', '002_fail.js'),
        () => ({
          up: jest.fn().mockRejectedValue(new Error('migration error')),
        }),
        { virtual: true }
      );

      await expect(service.runMigration('002_fail')).rejects.toThrow('migration error');
      expect(mockMigrationModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: 'failed' }),
        expect.anything()
      );
    });

    it('auto-rollbacks backup on failure when option set', async () => {
      mockMigrationModel.findOne.mockResolvedValue(null);
      mockMigrationModel.findOneAndUpdate.mockResolvedValue({});
      service.restoreBackup = jest.fn().mockResolvedValue({});

      jest.doMock(
        require('path').join('./mig', '003_auto.js'),
        () => ({
          up: jest.fn().mockRejectedValue(new Error('boom')),
        }),
        { virtual: true }
      );

      await expect(service.runMigration('003_auto', { autoRollback: true })).rejects.toThrow(
        'boom'
      );
      expect(service.restoreBackup).toHaveBeenCalledWith('/bak/backup.json');
    });
  });

  // ── runPendingMigrations ─────────────────────────────────────────

  describe('runPendingMigrations', () => {
    it('runs all pending and returns results', async () => {
      service.getPendingMigrations = jest.fn().mockResolvedValue([{ name: 'a' }, { name: 'b' }]);
      service.runMigration = jest
        .fn()
        .mockResolvedValueOnce({ success: true, name: 'a' })
        .mockResolvedValueOnce({ success: true, name: 'b' });

      const results = await service.runPendingMigrations();

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
    });

    it('stops on error by default', async () => {
      service.getPendingMigrations = jest.fn().mockResolvedValue([{ name: 'a' }, { name: 'b' }]);
      service.runMigration = jest.fn().mockRejectedValue(new Error('fail'));

      const results = await service.runPendingMigrations();

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  // ── rollback ─────────────────────────────────────────────────────

  describe('rollback', () => {
    beforeEach(() => {
      service.Migration = mockMigrationModel;
      service.createBackup = jest.fn().mockResolvedValue('/bak/rb.json');
    });

    it('throws when migration not found/not executed', async () => {
      mockMigrationModel.findOne.mockResolvedValue(null);
      await expect(service.rollback('noexist')).rejects.toThrow('غير موجود أو لم يتم تنفيذه');
    });

    it('throws when no down script', async () => {
      mockMigrationModel.findOne.mockResolvedValue({ _id: 'id1', status: 'success' });
      jest.doMock(require('path').join('./mig', 'no_down.js'), () => ({}), { virtual: true });

      await expect(service.rollback('no_down')).rejects.toThrow('لا يوجد سكربت تراجع');
    });

    it('executes down() and updates status', async () => {
      mockMigrationModel.findOne.mockResolvedValue({ _id: 'id1', status: 'success' });
      mockMigrationModel.findByIdAndUpdate.mockResolvedValue({});

      jest.doMock(
        require('path').join('./mig', 'ok_rb.js'),
        () => ({
          down: jest.fn().mockResolvedValue(undefined),
        }),
        { virtual: true }
      );

      service.connection = { db: {} };
      const result = await service.rollback('ok_rb');

      expect(result.success).toBe(true);
      expect(mockMigrationModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'id1',
        expect.objectContaining({ status: 'rolled_back' })
      );
    });
  });

  // ── rollbackLast ─────────────────────────────────────────────────

  describe('rollbackLast', () => {
    it('rolls back last N migrations', async () => {
      service.Migration = mockMigrationModel;
      mockMigrationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([{ name: 'last1' }]),
          }),
        }),
      });
      service.rollback = jest.fn().mockResolvedValue({ success: true, name: 'last1' });

      const results = await service.rollbackLast(1);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('stops on rollback failure', async () => {
      service.Migration = mockMigrationModel;
      mockMigrationModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([{ name: 'a' }, { name: 'b' }]),
          }),
        }),
      });
      service.rollback = jest.fn().mockRejectedValue(new Error('fail'));

      const results = await service.rollbackLast(2);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(false);
    });
  });

  // ── createBackup ─────────────────────────────────────────────────

  describe('createBackup', () => {
    it('writes backup file with all collections', async () => {
      const mongoose = require('mongoose');
      service.connection = {
        db: {
          listCollections: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([{ name: 'users' }]),
          }),
          collection: jest.fn().mockReturnValue({
            find: jest.fn().mockReturnValue({
              toArray: jest.fn().mockResolvedValue([{ _id: '1' }]),
            }),
          }),
        },
      };

      const result = await service.createBackup('test_backup');

      expect(result).toContain('bak');
      expect(mockFsPromises.writeFile).toHaveBeenCalled();
    });
  });

  // ── restoreBackup ────────────────────────────────────────────────

  describe('restoreBackup', () => {
    it('restores collections from backup file', async () => {
      const mockCollection = {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        insertMany: jest.fn().mockResolvedValue(undefined),
      };
      service.connection = {
        db: { collection: jest.fn().mockReturnValue(mockCollection) },
      };
      mockFsPromises.readFile.mockResolvedValue(
        JSON.stringify({ collections: { users: [{ _id: '1' }] } })
      );

      const result = await service.restoreBackup('/bak/test.json');

      expect(result.success).toBe(true);
      expect(result.collections).toContain('users');
      expect(mockCollection.deleteMany).toHaveBeenCalled();
      expect(mockCollection.insertMany).toHaveBeenCalled();
    });

    it('skips insertMany for empty collection', async () => {
      const mockCollection = {
        deleteMany: jest.fn().mockResolvedValue(undefined),
        insertMany: jest.fn(),
      };
      service.connection = {
        db: { collection: jest.fn().mockReturnValue(mockCollection) },
      };
      mockFsPromises.readFile.mockResolvedValue(JSON.stringify({ collections: { empty: [] } }));

      await service.restoreBackup('/bak/empty.json');
      expect(mockCollection.insertMany).not.toHaveBeenCalled();
    });

    it('throws on invalid JSON', async () => {
      mockFsPromises.readFile.mockResolvedValue('not json');
      await expect(service.restoreBackup('/bad')).rejects.toThrow('Failed to parse');
    });
  });

  // ── generateHash ─────────────────────────────────────────────────

  describe('generateHash', () => {
    it('returns truncated sha256 hash', () => {
      const hash = service.generateHash('some/file.js');
      expect(typeof hash).toBe('string');
    });
  });

  // ── verifyMigrations ─────────────────────────────────────────────

  describe('verifyMigrations', () => {
    it('returns valid when no issues', async () => {
      service.getMigrations = jest.fn().mockResolvedValue([{ name: 'a', executed: false }]);

      const result = await service.verifyMigrations();
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('detects missing records', async () => {
      service.Migration = mockMigrationModel;
      service.getMigrations = jest
        .fn()
        .mockResolvedValue([{ name: 'x', executed: true, filepath: '/mig/x.js' }]);
      mockMigrationModel.findOne.mockResolvedValue(null);

      const result = await service.verifyMigrations();
      expect(result.valid).toBe(false);
      expect(result.issues[0].issue).toBe('no_record');
    });

    it('detects hash mismatch', async () => {
      service.Migration = mockMigrationModel;
      service.getMigrations = jest
        .fn()
        .mockResolvedValue([{ name: 'y', executed: true, filepath: '/mig/y.js' }]);
      mockMigrationModel.findOne.mockResolvedValue({ hash: 'oldhash' });
      service.generateHash = jest.fn().mockReturnValue('newhash');

      const result = await service.verifyMigrations();
      expect(result.valid).toBe(false);
      expect(result.issues[0].issue).toBe('hash_mismatch');
    });
  });

  // ── getStats ─────────────────────────────────────────────────────

  describe('getStats', () => {
    beforeEach(() => {
      service.Migration = mockMigrationModel;
    });

    it('returns migration statistics', async () => {
      mockMigrationModel.countDocuments
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(7)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1);
      service.getPendingMigrations = jest.fn().mockResolvedValue([{ name: 'a' }]);
      mockMigrationModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest
            .fn()
            .mockResolvedValue({ name: 'last', executedAt: new Date(), duration: 500 }),
        }),
      });

      const stats = await service.getStats();

      expect(stats.total).toBe(10);
      expect(stats.successful).toBe(7);
      expect(stats.failed).toBe(2);
      expect(stats.rolledBack).toBe(1);
      expect(stats.pending).toBe(1);
      expect(stats.lastMigration.name).toBe('last');
    });

    it('returns null lastMigration when none exists', async () => {
      mockMigrationModel.countDocuments.mockResolvedValue(0);
      service.getPendingMigrations = jest.fn().mockResolvedValue([]);
      mockMigrationModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });

      const stats = await service.getStats();
      expect(stats.lastMigration).toBeNull();
    });
  });
});
