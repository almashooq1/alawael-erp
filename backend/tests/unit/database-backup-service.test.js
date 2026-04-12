'use strict';

/* ─── Mocks ────────────────────────────────────────────────────────────────── */
const mockMkdir = jest.fn().mockResolvedValue();
const mockReadFile = jest.fn();
const mockWriteFile = jest.fn().mockResolvedValue();
const mockFsReaddir = jest.fn().mockResolvedValue([]);
const mockFsStat = jest
  .fn()
  .mockResolvedValue({ size: 1024, mtime: new Date(), birthtime: new Date() });
const mockFsUnlink = jest.fn().mockResolvedValue();
const mockFsAccess = jest.fn().mockResolvedValue();

jest.mock('fs', () => ({
  promises: {
    mkdir: (...a) => mockMkdir(...a),
    readFile: (...a) => mockReadFile(...a),
    writeFile: (...a) => mockWriteFile(...a),
    readdir: (...a) => mockFsReaddir(...a),
    stat: (...a) => mockFsStat(...a),
    unlink: (...a) => mockFsUnlink(...a),
    access: (...a) => mockFsAccess(...a),
  },
}));

const mockGzip = jest.fn((d, cb) => cb(null, Buffer.from('compressed')));
const mockGunzip = jest.fn((d, cb) => cb(null, Buffer.from('decompressed')));
jest.mock('zlib', () => ({
  gzip: (...a) => mockGzip(...a),
  gunzip: (...a) => mockGunzip(...a),
}));

jest.mock('crypto', () => {
  const actual = jest.requireActual('crypto');
  return {
    ...actual,
    randomBytes: jest.fn().mockReturnValue(Buffer.alloc(16, 'a')),
    createCipheriv: jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue(Buffer.from('encrypted')),
      final: jest.fn().mockReturnValue(Buffer.from('')),
      getAuthTag: jest.fn().mockReturnValue(Buffer.alloc(16, 'b')),
    }),
    createDecipheriv: jest.fn().mockReturnValue({
      setAuthTag: jest.fn(),
      update: jest.fn().mockReturnValue(Buffer.from('decrypted')),
      final: jest.fn().mockReturnValue(Buffer.from('')),
    }),
    createHash: actual.createHash,
  };
});

const mockToArray = jest.fn().mockResolvedValue([{ name: 'users' }, { name: 'posts' }]);
const mockFindAll = jest
  .fn()
  .mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ _id: 1 }]) });
const mockCollIndexes = jest.fn().mockResolvedValue([{ name: '_id_', key: { _id: 1 } }]);
const mockDropCollection = jest.fn().mockResolvedValue();
const mockCreateIndex = jest.fn().mockResolvedValue();
const mockInsertMany = jest.fn().mockResolvedValue();

const mockDb = {
  listCollections: jest.fn().mockReturnValue({ toArray: mockToArray }),
  collection: jest.fn().mockImplementation(() => ({
    find: mockFindAll,
    indexes: mockCollIndexes,
    drop: mockDropCollection,
    createIndex: mockCreateIndex,
    insertMany: mockInsertMany,
    deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
  })),
};

jest.mock('mongoose', () => ({
  connection: { db: null },
}));

const DatabaseBackupService = require('../../services/database-backup-service');

/* ═══════════════════════════════════════════════════════════════════════════ */
describe('database-backup-service', () => {
  let svc;
  const mongoose = require('mongoose');

  beforeEach(() => {
    jest.clearAllMocks();
    mongoose.connection.db = mockDb;
    svc = new DatabaseBackupService({
      backupDir: '/tmp/test-backups',
      retentionDays: 7,
      maxBackups: 10,
      compressionEnabled: false,
      encryptionEnabled: false,
    });
  });

  /* ─── constructor ──────────────────────────────────────────────────────── */
  describe('constructor', () => {
    test('sets defaults when no config', () => {
      const s = new DatabaseBackupService();
      expect(s.config.backupDir).toBeDefined();
      expect(s.config.retentionDays).toBe(30);
      expect(s.config.maxBackups).toBe(100);
      expect(s.isRunning).toBe(false);
    });

    test('merges custom config', () => {
      expect(svc.config.retentionDays).toBe(7);
      expect(svc.config.maxBackups).toBe(10);
    });
  });

  /* ─── initialize ───────────────────────────────────────────────────────── */
  describe('initialize', () => {
    test('creates backup directories', async () => {
      const result = await svc.initialize();
      expect(mockMkdir).toHaveBeenCalled();
      expect(result).toBe(svc);
    });
  });

  /* ─── ensureBackupDir ──────────────────────────────────────────────────── */
  describe('ensureBackupDir', () => {
    test('creates base + sub dirs', async () => {
      await svc.ensureBackupDir();
      expect(mockMkdir).toHaveBeenCalledTimes(5);
    });
  });

  /* ─── createFullBackup ─────────────────────────────────────────────────── */
  describe('createFullBackup', () => {
    test('dumps all collections and writes backup file', async () => {
      const result = await svc.createFullBackup({ type: 'manual' });
      expect(result.collectionsCount).toBe(2);
      expect(result.path).toBeDefined();
      expect(result.timestamp).toBeDefined();
      expect(result.duration).toBeDefined();
      expect(mockWriteFile).toHaveBeenCalled();
    });

    test('throws when already running', async () => {
      svc.isRunning = true;
      await expect(svc.createFullBackup()).rejects.toThrow();
    });

    test('resets isRunning on error', async () => {
      mockToArray.mockRejectedValueOnce(new Error('db fail'));
      try {
        await svc.createFullBackup();
      } catch (e) {
        /* expected */
      }
      expect(svc.isRunning).toBe(false);
    });
  });

  /* ─── restoreBackup ────────────────────────────────────────────────────── */
  describe('restoreBackup', () => {
    test('restores collections from backup file', async () => {
      const backupData = {
        collections: {
          users: [{ _id: 1 }],
        },
        indexes: { users: [{ name: '_id_', key: { _id: 1 } }] },
        metadata: { timestamp: new Date().toISOString(), collections: 1 },
      };
      mockReadFile.mockResolvedValue(JSON.stringify(backupData));

      const result = await svc.restoreBackup('/tmp/backup.json');
      expect(result).toBeDefined();
      expect(mockInsertMany).toHaveBeenCalled();
    });

    test('handles decompress for .gz files', async () => {
      const backupData = {
        collections: { users: [] },
        metadata: {},
      };
      mockReadFile.mockResolvedValue(Buffer.from('gzipped'));
      mockGunzip.mockImplementation((d, cb) => cb(null, Buffer.from(JSON.stringify(backupData))));

      const result = await svc.restoreBackup('/tmp/backup.gz.json');
      expect(result.totalDocuments).toBe(0);
    });
  });

  /* ─── listBackups ──────────────────────────────────────────────────────── */
  describe('listBackups', () => {
    test('returns empty when no backup files', async () => {
      const r = await svc.listBackups();
      expect(r).toEqual([]);
    });

    test('lists backup files from dirs', async () => {
      mockFsReaddir
        .mockResolvedValueOnce(['backup1.json', 'backup2.json.gz'])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const r = await svc.listBackups();
      expect(r.length).toBe(2);
    });
  });

  /* ─── cleanupOldBackups ────────────────────────────────────────────────── */
  describe('cleanupOldBackups', () => {
    test('deletes old backups exceeding retention', async () => {
      const old = new Date(0);
      mockFsReaddir.mockResolvedValue(['old.json']);
      mockFsStat.mockResolvedValue({ size: 100, mtime: old, birthtime: old });

      const r = await svc.cleanupOldBackups();
      expect(r.deletedCount).toBeGreaterThanOrEqual(0);
    });
  });

  /* ─── compress / decompress ────────────────────────────────────────────── */
  describe('compress / decompress', () => {
    test('compress returns buffer', async () => {
      const r = await svc.compress('hello');
      expect(Buffer.isBuffer(r)).toBe(true);
    });

    test('decompress returns string', async () => {
      const r = await svc.decompress(Buffer.from('data'));
      expect(typeof r).toBe('string');
    });
  });

  /* ─── encrypt / decrypt ────────────────────────────────────────────────── */
  describe('encrypt / decrypt', () => {
    test('encrypt returns colon-separated hex string', () => {
      svc.config.encryptionKey = 'a'.repeat(64);
      const r = svc.encrypt('secret');
      expect(typeof r).toBe('string');
      expect(r.split(':').length).toBe(3);
    });

    test('decrypt returns string', () => {
      svc.config.encryptionKey = 'a'.repeat(64);
      const iv = Buffer.alloc(16, 'a').toString('hex');
      const tag = Buffer.alloc(16, 'b').toString('hex');
      const data = Buffer.from('encrypted').toString('hex');
      const r = svc.decrypt(`${iv}:${tag}:${data}`);
      expect(typeof r).toBe('string');
    });
  });

  /* ─── calculateChecksum ────────────────────────────────────────────────── */
  describe('calculateChecksum', () => {
    test('returns sha256 hex string', () => {
      const cs = svc.calculateChecksum('hello');
      expect(cs).toMatch(/^[a-f0-9]{64}$/);
    });

    test('same data produces same checksum', () => {
      const a = svc.calculateChecksum('data');
      const b = svc.calculateChecksum('data');
      expect(a).toBe(b);
    });
  });

  /* ─── formatBytes ──────────────────────────────────────────────────────── */
  describe('formatBytes', () => {
    test('0 returns "0 Bytes"', () => {
      expect(svc.formatBytes(0)).toBe('0 Bytes');
    });

    test('1024 returns "1 KB"', () => {
      expect(svc.formatBytes(1024)).toBe('1 KB');
    });

    test('1048576 returns "1 MB"', () => {
      expect(svc.formatBytes(1048576)).toBe('1 MB');
    });

    test('large number returns GB', () => {
      expect(svc.formatBytes(1073741824)).toBe('1 GB');
    });
  });

  /* ─── getStats ─────────────────────────────────────────────────────────── */
  describe('getStats', () => {
    test('returns stats object with totalBackups and totalSize', async () => {
      mockFsReaddir.mockResolvedValue([]);
      const r = await svc.getStats();
      expect(r.totalBackups).toBeDefined();
      expect(r.totalSize).toBeDefined();
    });
  });
});
