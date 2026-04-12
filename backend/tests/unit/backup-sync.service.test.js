/**
 * Unit tests — backup-sync.service.js
 * Singleton EventEmitter (module.exports = new BackupSyncSystem())
 * Dependencies: fs/promises, path, crypto, logger
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

/* shared mock fns – must be prefixed with mock */
const mockFspReaddir = jest.fn().mockResolvedValue([]);
const mockFspStat = jest.fn().mockResolvedValue({ size: 100, mtime: new Date() });
const mockFspReadFile = jest.fn().mockResolvedValue(Buffer.from('test'));
const mockFspWriteFile = jest.fn().mockResolvedValue(undefined);
const mockFspMkdir = jest.fn().mockResolvedValue(undefined);

jest.mock('fs', () => {
  const EventEmitter = require('events');
  return {
    promises: {
      readdir: mockFspReaddir,
      stat: mockFspStat,
      readFile: mockFspReadFile,
      writeFile: mockFspWriteFile,
      mkdir: mockFspMkdir,
    },
    createWriteStream: jest.fn(() => {
      const ws = new EventEmitter();
      ws.end = jest.fn();
      return ws;
    }),
    createReadStream: jest.fn(() => {
      const rs = new EventEmitter();
      rs.pipe = jest.fn().mockReturnValue(rs);
      return rs;
    }),
  };
});

let service;

beforeEach(() => {
  jest.isolateModules(() => {
    service = require('../../services/backup-sync.service');
  });
});

describe('BackupSyncSystem', () => {
  /* ────────────────────────────────────────────────────────────── */
  describe('constructor', () => {
    it('initializes with empty maps and arrays', () => {
      expect(service.activeSyncs).toBeInstanceOf(Map);
      expect(service.fileHashes).toBeInstanceOf(Map);
      expect(service.syncHistory).toEqual([]);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('generateSyncId', () => {
    it('returns string starting with sync-', () => {
      const id = service.generateSyncId();
      expect(id).toMatch(/^sync-\d+-[a-z0-9]+$/);
    });

    it('generates unique IDs', () => {
      const id1 = service.generateSyncId();
      const id2 = service.generateSyncId();
      expect(id1).not.toBe(id2);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('resolveConflict', () => {
    it('NEWER strategy picks newer modifiedAt', async () => {
      const local = { modifiedAt: '2025-06-02T12:00:00Z', size: 100 };
      const remote = { modifiedAt: '2025-06-01T12:00:00Z', size: 200 };
      const res = await service.resolveConflict('file.txt', local, remote, 'NEWER');
      expect(res.winner).toBe('local');
      expect(res.strategy).toBe('NEWER');
    });

    it('LARGER strategy picks larger size', async () => {
      const local = { modifiedAt: '2025-06-01T12:00:00Z', size: 100 };
      const remote = { modifiedAt: '2025-06-01T12:00:00Z', size: 500 };
      const res = await service.resolveConflict('file.txt', local, remote, 'LARGER');
      expect(res.winner).toBe('remote');
    });

    it('LOCAL strategy always picks local', async () => {
      const res = await service.resolveConflict('f.txt', {}, {}, 'LOCAL');
      expect(res.winner).toBe('local');
    });

    it('REMOTE strategy always picks remote', async () => {
      const res = await service.resolveConflict('f.txt', {}, {}, 'REMOTE');
      expect(res.winner).toBe('remote');
    });

    it('default strategy picks local', async () => {
      const res = await service.resolveConflict('f.txt', {}, {}, 'UNKNOWN');
      expect(res.winner).toBe('local');
    });

    it('emits sync:conflict-resolved event', async () => {
      const spy = jest.fn();
      service.on('sync:conflict-resolved', spy);
      await service.resolveConflict('f.txt', {}, {}, 'LOCAL');
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('getSyncStatus', () => {
    it('returns status with empty history', () => {
      const status = service.getSyncStatus();
      expect(status.activeSyncs).toBe(0);
      expect(status.totalSyncs).toBe(0);
      expect(status.lastSync).toBeNull();
      expect(status.averageSyncTime).toBe(0);
    });

    it('reflects active syncs', () => {
      service.activeSyncs.set('s1', { transferred: 100 });
      service.activeSyncs.set('s2', { transferred: 200 });
      const status = service.getSyncStatus();
      expect(status.activeSyncs).toBe(2);
      expect(status.totalTransferred).toBe(300);
    });

    it('returns lastSync from history', () => {
      service.syncHistory.push({ id: 'sync-1', status: 'COMPLETED' });
      expect(service.getSyncStatus().lastSync.id).toBe('sync-1');
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('calculateAverageSyncTime', () => {
    it('returns 0 when no history', () => {
      expect(service.calculateAverageSyncTime()).toBe(0);
    });

    it('returns 0 when no completed syncs', () => {
      service.syncHistory.push({ status: 'FAILED' });
      expect(service.calculateAverageSyncTime()).toBe(0);
    });

    it('calculates average in seconds', () => {
      service.syncHistory.push({
        status: 'COMPLETED',
        startTime: '2025-06-01T12:00:00Z',
        endTime: '2025-06-01T12:00:10Z', // 10 seconds
      });
      service.syncHistory.push({
        status: 'COMPLETED',
        startTime: '2025-06-01T13:00:00Z',
        endTime: '2025-06-01T13:00:20Z', // 20 seconds
      });
      expect(service.calculateAverageSyncTime()).toBe(15); // avg = 15s
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('startAutomaticSync / shutdown', () => {
    it('starts interval and clears on shutdown', () => {
      service.startAutomaticSync();
      expect(service._syncInterval).toBeDefined();
      service.shutdown();
      expect(service._syncInterval).toBeNull();
    });

    it('shutdown is safe when no interval', () => {
      service._syncInterval = undefined;
      service.shutdown(); // no error
      expect(service._syncInterval).toBeFalsy();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('calculateFileHash', () => {
    it('returns sha256 hex', async () => {
      const hash = await service.calculateFileHash('/some/path');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // sha256 hex
    });

    it('returns null on read error', async () => {
      mockFspReadFile.mockRejectedValueOnce(new Error('ENOENT'));
      const hash = await service.calculateFileHash('/bad/path');
      expect(hash).toBeNull();
    });
  });

  /* ────────────────────────────────────────────────────────────── */
  describe('saveSyncMetadata / loadSyncMetadata', () => {
    it('saveSyncMetadata writes JSON file', async () => {
      service.syncHistory.push({ id: 'S1' });
      await service.saveSyncMetadata();
      expect(mockFspWriteFile).toHaveBeenCalled();
    });

    it('loadSyncMetadata silently fails on missing file', async () => {
      mockFspReadFile.mockRejectedValueOnce(new Error('ENOENT'));
      await service.loadSyncMetadata(); // no throw
    });

    it('loadSyncMetadata restores data', async () => {
      mockFspReadFile.mockResolvedValueOnce(
        JSON.stringify({
          fileHashes: [['a.txt', 'abc123']],
          syncHistory: [{ id: 'S1' }],
        })
      );
      await service.loadSyncMetadata();
      expect(service.fileHashes.get('a.txt')).toBe('abc123');
      expect(service.syncHistory).toHaveLength(1);
    });
  });
});
