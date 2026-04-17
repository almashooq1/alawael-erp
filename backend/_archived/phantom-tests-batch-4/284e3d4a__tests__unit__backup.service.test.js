/**
 * Unit tests — backup.service.js
 * Static class with fs + child_process + AuditService + logger
 */
'use strict';

const path = require('path');

/* ── mocks ──────────────────────────────────────────────────────── */
const mockMkdirSync = jest.fn();
const mockExistsSync = jest.fn();
const mockReaddirSync = jest.fn();
const mockStatSync = jest.fn();
const mockUnlinkSync = jest.fn();

jest.mock('fs', () => ({
  mkdirSync: (...a) => mockMkdirSync(...a),
  existsSync: (...a) => mockExistsSync(...a),
  readdirSync: (...a) => mockReaddirSync(...a),
  statSync: (...a) => mockStatSync(...a),
  unlinkSync: (...a) => mockUnlinkSync(...a),
}));

let mockSpawnCloseCode = 0;
let mockSpawnError = null;

jest.mock('child_process', () => ({
  spawn: jest.fn(() => {
    const EventEmitter = require('events');
    const proc = new EventEmitter();
    proc.stderr = new EventEmitter();
    process.nextTick(() => {
      if (mockSpawnError) {
        proc.emit('error', mockSpawnError);
      } else {
        proc.emit('close', mockSpawnCloseCode);
      }
    });
    return proc;
  }),
}));

jest.mock('../../services/audit.service', () => ({
  log: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

let BackupService;

beforeEach(() => {
  jest.clearAllMocks();
  mockSpawnCloseCode = 0;
  mockSpawnError = null;
  mockMkdirSync.mockReturnValue(undefined);
  jest.isolateModules(() => {
    BackupService = require('../../services/backup.service');
  });
});

describe('BackupService', () => {
  /* ────────────────────────────────────────────────────────────── */
  describe('createBackup', () => {
    it('resolves with fileName and filePath', async () => {
      mockStatSync.mockReturnValue({ size: 1024 });
      const res = await BackupService.createBackup('admin');
      expect(res.fileName).toMatch(/^backup-.*\.gz$/);
      expect(res.filePath).toContain('backup-');
      expect(res.size).toBe(1024);
    });

    it('rejects when mongodump fails', async () => {
      mockSpawnCloseCode = 1;
      // Re-import with the updated code
      jest.isolateModules(() => {
        BackupService = require('../../services/backup.service');
      });
      await expect(BackupService.createBackup()).rejects.toThrow('exited with code 1');
    });

    it('rejects when spawn fails', async () => {
      mockSpawnError = new Error('not found');
      jest.isolateModules(() => {
        BackupService = require('../../services/backup.service');
      });
      await expect(BackupService.createBackup()).rejects.toThrow('not found');
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('listBackups', () => {
    it('returns files sorted newest first', async () => {
      mockExistsSync.mockReturnValue(true);
      mockReaddirSync.mockReturnValue(['a.gz', 'b.gz', 'c.txt']);
      mockStatSync
        .mockReturnValueOnce({ size: 100, birthtime: new Date('2025-01-01') })
        .mockReturnValueOnce({ size: 200, birthtime: new Date('2025-06-01') });
      const list = await BackupService.listBackups();
      expect(list).toHaveLength(2); // only .gz files
      expect(list[0].name).toBe('b.gz'); // newest first
    });

    it('returns empty when dir does not exist', async () => {
      mockExistsSync.mockReturnValue(false);
      const list = await BackupService.listBackups();
      expect(list).toEqual([]);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('deleteBackup', () => {
    it('deletes file and returns true', async () => {
      mockExistsSync.mockReturnValue(true);
      const res = await BackupService.deleteBackup('file.gz');
      expect(res).toBe(true);
      expect(mockUnlinkSync).toHaveBeenCalled();
    });

    it('returns false when file not found', async () => {
      mockExistsSync.mockReturnValue(false);
      const res = await BackupService.deleteBackup('nope.gz');
      expect(res).toBe(false);
    });
  });
});
