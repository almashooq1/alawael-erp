/**
 * Unit Tests — BackupRestore.js
 * Batch 40 · P#79
 *
 * Singleton, heavy deps: mongoose, fs.promises, path, zlib, child_process, @aws-sdk, util.
 * jest.isolateModules + mock everything.
 */

/* ---- fs.promises mock ---- */
const mockMkdir = jest.fn().mockResolvedValue(undefined);
const mockWriteFile = jest.fn().mockResolvedValue(undefined);
const mockReadFile = jest.fn().mockResolvedValue(Buffer.from('{}'));
const mockReaddir = jest.fn().mockResolvedValue([]);
const mockStat = jest
  .fn()
  .mockResolvedValue({ size: 1024, mtime: new Date(), birthtime: new Date(), isFile: () => true });
const mockUnlink = jest.fn().mockResolvedValue(undefined);

jest.mock('fs', () => ({
  promises: {
    mkdir: (...a) => mockMkdir(...a),
    writeFile: (...a) => mockWriteFile(...a),
    readFile: (...a) => mockReadFile(...a),
    readdir: (...a) => mockReaddir(...a),
    stat: (...a) => mockStat(...a),
    unlink: (...a) => mockUnlink(...a),
  },
  constants: { F_OK: 0, R_OK: 4 },
}));

/* ---- mongoose mock ---- */
jest.mock('mongoose', () => ({
  connection: { name: 'testdb', host: 'localhost', port: 27017 },
  Schema: jest.fn().mockImplementation(function () {
    this.index = jest.fn();
    return this;
  }),
  model: jest.fn().mockReturnValue({}),
  models: {},
  Types: { ObjectId: jest.fn(v => v) },
}));

/* ---- zlib mock ---- */
jest.mock('zlib', () => ({
  gzip: jest.fn((buf, cb) => cb(null, Buffer.from('gzipped'))),
  gunzip: jest.fn((buf, cb) => cb(null, Buffer.from('{}'))),
}));

/* ---- child_process mock (promisified via util.promisify) ---- */
const mockExecFile = jest.fn().mockImplementation((_cmd, _args, cb) => {
  if (typeof cb === 'function') cb(null, { stdout: 'ok', stderr: '' });
});
jest.mock('child_process', () => ({ execFile: mockExecFile }));

/* Make util.promisify return an async wrapper that calls execFile as (cmd,args) => Promise */
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: jest
    .fn()
    .mockImplementation(() => jest.fn().mockResolvedValue({ stdout: 'ok', stderr: '' })),
}));

/* ---- AWS S3 mocks ---- */
const mockS3Send = jest.fn().mockResolvedValue({ Contents: [] });
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  ListObjectsV2Command: jest.fn(),
  GetObjectCommand: jest.fn(),
}));

const mockUploadDone = jest
  .fn()
  .mockResolvedValue({
    Key: 'backups/2026/backup.json',
    Location: 's3://bucket/key',
    ETag: '"abc"',
  });
jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation(() => ({ done: mockUploadDone })),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

function loadService() {
  let svc;
  jest.isolateModules(() => {
    svc = require('../../services/BackupRestore');
  });
  return svc;
}

describe('BackupRestoreService', () => {
  let svc;
  beforeEach(() => {
    jest.clearAllMocks();
    svc = loadService();
    mockReaddir.mockResolvedValue([]);
    mockStat.mockResolvedValue({
      size: 1024,
      mtime: new Date(),
      birthtime: new Date(),
      isFile: () => true,
    });
    mockS3Send.mockResolvedValue({ Contents: [] });
    mockUploadDone.mockResolvedValue({
      Key: 'backups/2026/b.json',
      Location: 's3://bucket/k',
      ETag: '"e"',
    });
  });

  // ═══════════════════════════════
  // createLocalBackup
  // ═══════════════════════════════
  describe('createLocalBackup', () => {
    test('creates backup and returns result with success', async () => {
      const r = await svc.createLocalBackup();
      expect(r.success).toBe(true);
      expect(r).toHaveProperty('backupPath');
      expect(r).toHaveProperty('fileName');
      expect(r).toHaveProperty('fileSize');
      expect(r.location).toBe('LOCAL');
      expect(mockMkdir).toHaveBeenCalled();
    });

    test('throws on mkdir error', async () => {
      mockMkdir.mockRejectedValueOnce(new Error('EPERM'));
      await expect(svc.createLocalBackup()).rejects.toThrow();
    });
  });

  // ═══════════════════════════════
  // compressBackup
  // ═══════════════════════════════
  describe('compressBackup', () => {
    test('compresses file and returns .gz path string', async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from('data'));
      const r = await svc.compressBackup('/tmp/backup.json');
      expect(typeof r).toBe('string');
      expect(r).toContain('.gz');
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockUnlink).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════
  // listLocalBackups
  // ═══════════════════════════════
  describe('listLocalBackups', () => {
    test('returns empty array when no backups', async () => {
      mockReaddir.mockResolvedValueOnce([]);
      const r = await svc.listLocalBackups();
      expect(Array.isArray(r)).toBe(true);
      expect(r.length).toBe(0);
    });

    test('returns backup entries with fileName and size', async () => {
      mockReaddir.mockResolvedValueOnce(['backup-2026.json']);
      mockStat.mockResolvedValueOnce({
        size: 2048,
        mtime: new Date('2026-01-01'),
        birthtime: new Date('2026-01-01'),
      });
      const r = await svc.listLocalBackups();
      expect(r.length).toBe(1);
      expect(r[0]).toHaveProperty('fileName', 'backup-2026.json');
      expect(r[0]).toHaveProperty('size');
      expect(r[0]).toHaveProperty('created');
      expect(r[0]).toHaveProperty('modified');
    });
  });

  // ═══════════════════════════════
  // cleanupOldBackups
  // ═══════════════════════════════
  describe('cleanupOldBackups', () => {
    test('deletes old backups and returns success message', async () => {
      const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      mockReaddir.mockResolvedValueOnce(['old-backup.json']);
      mockStat.mockResolvedValueOnce({ size: 1024, mtime: oldDate, birthtime: oldDate });
      const r = await svc.cleanupOldBackups(30);
      expect(r.success).toBe(true);
      expect(r).toHaveProperty('message');
      expect(mockUnlink).toHaveBeenCalled();
    });

    test('does not delete recent backups', async () => {
      mockReaddir.mockResolvedValueOnce(['recent.json']);
      mockStat.mockResolvedValueOnce({ size: 1024, mtime: new Date(), birthtime: new Date() });
      const r = await svc.cleanupOldBackups(30);
      expect(r.success).toBe(true);
      expect(mockUnlink).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════
  // verifyBackupIntegrity
  // ═══════════════════════════════
  describe('verifyBackupIntegrity', () => {
    test('returns success for valid backup within backupDir', async () => {
      const r = await svc.verifyBackupIntegrity('./backups/backup.json');
      expect(r).toHaveProperty('success');
      expect(r).toHaveProperty('message');
    });

    test('rejects path outside backupDir', async () => {
      const r = await svc.verifyBackupIntegrity('/etc/passwd');
      expect(r.success).toBe(false);
    });
  });

  // ═══════════════════════════════
  // getBackupReport
  // ═══════════════════════════════
  describe('getBackupReport', () => {
    test('returns report with local and cloud sections', async () => {
      mockReaddir.mockResolvedValueOnce([]);
      mockS3Send.mockResolvedValueOnce({ Contents: [] });
      const r = await svc.getBackupReport();
      expect(r).toHaveProperty('timestamp');
      expect(r).toHaveProperty('local');
      expect(r.local).toHaveProperty('count');
      expect(r.local).toHaveProperty('totalSize');
      expect(r).toHaveProperty('cloud');
      expect(r).toHaveProperty('backup_schedule');
    });
  });

  // ═══════════════════════════════
  // uploadBackupToS3
  // ═══════════════════════════════
  describe('uploadBackupToS3', () => {
    test('returns upload result with s3Key', async () => {
      mockReadFile.mockResolvedValueOnce(Buffer.from('data'));
      const r = await svc.uploadBackupToS3('/tmp/backup.json', 'backup.json');
      expect(r.success).toBe(true);
      expect(r).toHaveProperty('s3Key');
      expect(r).toHaveProperty('s3Url');
      expect(r).toHaveProperty('etag');
    });
  });

  // ═══════════════════════════════
  // listS3Backups
  // ═══════════════════════════════
  describe('listS3Backups', () => {
    test('returns object with backups array', async () => {
      mockS3Send.mockResolvedValueOnce({ Contents: [] });
      const r = await svc.listS3Backups('backups/');
      expect(r.success).toBe(true);
      expect(Array.isArray(r.backups)).toBe(true);
      expect(r.total).toBe(0);
    });

    test('maps S3 contents to backup entries', async () => {
      mockS3Send.mockResolvedValueOnce({
        Contents: [
          {
            Key: 'backups/2026/b.json',
            Size: 1048576,
            LastModified: new Date(),
            StorageClass: 'STANDARD',
          },
        ],
      });
      const r = await svc.listS3Backups('backups/');
      expect(r.total).toBe(1);
      expect(r.backups[0]).toHaveProperty('key');
      expect(r.backups[0]).toHaveProperty('size');
    });
  });
});
