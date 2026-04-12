'use strict';

/* ─── Mocks ────────────────────────────────────────────────────────────────── */
const mockCronSchedule = jest.fn(() => ({ stop: jest.fn(), running: false }));
jest.mock('node-cron', () => ({ schedule: (...a) => mockCronSchedule(...a) }));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const mockReIndex = jest.fn().mockResolvedValue({});
const mockDeleteMany = jest.fn().mockResolvedValue({ deletedCount: 5 });
const mockCollStats = jest
  .fn()
  .mockResolvedValue({
    padding: 1.0,
    storageSize: 100,
    size: 90,
    count: 10,
    avgObjSize: 200,
    nindexes: 2,
    totalIndexSize: 50,
  });
const mockCollIndexes = jest.fn().mockResolvedValue([{ name: '_id_' }]);
const mockInsertOne = jest.fn().mockResolvedValue({});
const mockFindMock = jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) });
const mockDbCommand = jest.fn().mockResolvedValue({});
const mockListCollections = jest.fn().mockReturnValue({
  toArray: jest.fn().mockResolvedValue([{ name: 'users' }, { name: 'sessions' }]),
});

const mockCollection = jest.fn().mockImplementation(() => ({
  reIndex: mockReIndex,
  deleteMany: mockDeleteMany,
  stats: mockCollStats,
  indexes: mockCollIndexes,
  insertOne: mockInsertOne,
  find: mockFindMock,
}));

const mockDb = {
  listCollections: mockListCollections,
  collection: mockCollection,
  command: mockDbCommand,
  admin: jest.fn().mockReturnValue({
    ping: jest.fn().mockResolvedValue({ ok: 1 }),
    serverStatus: jest
      .fn()
      .mockResolvedValue({
        version: '6.0',
        uptime: 9999,
        connections: {},
        network: {},
        opcounters: {},
      }),
    command: jest.fn().mockResolvedValue({ inprog: [] }),
  }),
  stats: jest
    .fn()
    .mockResolvedValue({
      collections: 5,
      objects: 1000,
      dataSize: 50000,
      indexSize: 10000,
      storageSize: 80000,
    }),
};

const mockFsReaddir = jest.fn().mockResolvedValue([]);
const mockFsStat = jest.fn().mockResolvedValue({ mtime: new Date(0) });
const mockFsUnlink = jest.fn().mockResolvedValue();

jest.mock('fs', () => ({
  promises: {
    readdir: (...a) => mockFsReaddir(...a),
    stat: (...a) => mockFsStat(...a),
    unlink: (...a) => mockFsUnlink(...a),
  },
}));

jest.mock('mongoose', () => ({
  connection: { db: null }, // will set in beforeEach
}));

/* ═══════════════════════════════════════════════════════════════════════════ */
describe('database-maintenance-service', () => {
  let svc;
  const mongoose = require('mongoose');

  beforeEach(() => {
    jest.clearAllMocks();
    mongoose.connection.db = mockDb;
    jest.isolateModules(() => {
      svc = require('../../services/database-maintenance-service');
    });
  });

  /* ─── initialize ───────────────────────────────────────────────────────── */
  describe('initialize', () => {
    test('sets isRunning true and schedules tasks', async () => {
      const result = await svc.initialize();
      expect(result).toBe(true);
      expect(svc.isRunning).toBe(true);
      expect(mockCronSchedule).toHaveBeenCalledTimes(4);
    });
  });

  /* ─── scheduleTasks ────────────────────────────────────────────────────── */
  describe('scheduleTasks', () => {
    test('creates 4 cron tasks', () => {
      svc.tasks = [];
      svc.scheduleTasks();
      expect(svc.tasks).toHaveLength(4);
      expect(svc.tasks.map(t => t.name)).toEqual(['indexRebuild', 'cleanup', 'optimize', 'stats']);
    });
  });

  /* ─── rebuildIndexes ───────────────────────────────────────────────────── */
  describe('rebuildIndexes', () => {
    test('reIndexes all collections', async () => {
      const results = await svc.rebuildIndexes();
      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('success');
      expect(mockReIndex).toHaveBeenCalledTimes(2);
    });

    test('handles reIndex error gracefully', async () => {
      mockReIndex.mockRejectedValueOnce(new Error('fail'));
      const results = await svc.rebuildIndexes();
      expect(results[0].status).toBe('error');
      expect(results[1].status).toBe('success');
    });
  });

  /* ─── cleanupOldData ───────────────────────────────────────────────────── */
  describe('cleanupOldData', () => {
    test('deletes old logs, sessions, notifications, temp files', async () => {
      mockFsReaddir.mockResolvedValue(['old.txt']);
      mockFsStat.mockResolvedValue({ mtime: new Date(0) });

      const results = await svc.cleanupOldData();
      expect(results.logs).toBeDefined();
      expect(results.expiredSessions).toBeDefined();
      expect(results.oldNotifications).toBeDefined();
      expect(results.tempFiles).toBe(1);
      expect(mockDeleteMany).toHaveBeenCalledTimes(3);
    });

    test('handles missing temp dir gracefully', async () => {
      mockFsReaddir.mockRejectedValue(new Error('ENOENT'));
      const results = await svc.cleanupOldData();
      expect(results.tempFiles).toBe(0);
    });
  });

  /* ─── optimizeDatabase ─────────────────────────────────────────────────── */
  describe('optimizeDatabase', () => {
    test('runs compact and stats', async () => {
      const results = await svc.optimizeDatabase();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThanOrEqual(1);
    });

    test('handles compact failure gracefully', async () => {
      mockDbCommand.mockRejectedValueOnce(new Error('not supported'));
      const results = await svc.optimizeDatabase();
      expect(results[0].status).toBe('failed');
    });
  });

  /* ─── collectStats ─────────────────────────────────────────────────────── */
  describe('collectStats', () => {
    test('returns stats with server, database, collections', async () => {
      const stats = await svc.collectStats();
      expect(stats.server.version).toBe('6.0');
      expect(stats.database.collections).toBe(5);
      expect(stats.collections).toBeDefined();
      expect(mockInsertOne).toHaveBeenCalled();
    });
  });

  /* ─── checkIntegrity ───────────────────────────────────────────────────── */
  describe('checkIntegrity', () => {
    test('returns healthy when all checks pass', async () => {
      const result = await svc.checkIntegrity();
      expect(result.status).toBe('healthy');
      expect(result.checks.length).toBeGreaterThan(0);
      const connCheck = result.checks.find(c => c.name === 'connection');
      expect(connCheck.status).toBe('ok');
    });

    test('detects low storage space', async () => {
      mockDb.stats.mockResolvedValueOnce({ dataSize: 90000, indexSize: 5000, storageSize: 100000 });
      const result = await svc.checkIntegrity();
      const storageCheck = result.checks.find(c => c.name === 'storage');
      expect(storageCheck.status).toBe('warning');
    });
  });

  /* ─── log ──────────────────────────────────────────────────────────────── */
  describe('log', () => {
    test('adds entry to logs array', () => {
      svc.logs = [];
      svc.log('info', 'test message');
      expect(svc.logs).toHaveLength(1);
      expect(svc.logs[0].level).toBe('info');
      expect(svc.logs[0].message).toBe('test message');
    });

    test('trims logs to 1000', () => {
      svc.logs = new Array(1001).fill({ level: 'info', message: 'x' });
      svc.log('info', 'new');
      expect(svc.logs.length).toBeLessThanOrEqual(1001);
    });
  });

  /* ─── getLogs ──────────────────────────────────────────────────────────── */
  describe('getLogs', () => {
    test('filters by level', () => {
      svc.logs = [
        { level: 'info', message: 'a' },
        { level: 'error', message: 'b' },
        { level: 'info', message: 'c' },
      ];
      expect(svc.getLogs({ level: 'error' })).toHaveLength(1);
    });

    test('respects limit', () => {
      svc.logs = Array.from({ length: 20 }, (_, i) => ({ level: 'info', message: `m${i}` }));
      expect(svc.getLogs({ limit: 5 })).toHaveLength(5);
    });

    test('returns all when no options', () => {
      svc.logs = [{ level: 'info', message: 'x' }];
      expect(svc.getLogs()).toHaveLength(1);
    });
  });

  /* ─── getTasksStatus ───────────────────────────────────────────────────── */
  describe('getTasksStatus', () => {
    test('returns task statuses', () => {
      svc.tasks = [
        { name: 'indexRebuild', task: { running: false } },
        { name: 'cleanup', task: { running: true } },
      ];
      const status = svc.getTasksStatus();
      expect(status).toHaveLength(2);
      expect(status[0]).toEqual({ name: 'indexRebuild', running: false });
      expect(status[1]).toEqual({ name: 'cleanup', running: true });
    });
  });

  /* ─── stop ─────────────────────────────────────────────────────────────── */
  describe('stop', () => {
    test('stops all tasks and clears state', () => {
      const mockStop = jest.fn();
      svc.tasks = [{ name: 'a', task: { stop: mockStop } }];
      svc.isRunning = true;

      svc.stop();
      expect(mockStop).toHaveBeenCalled();
      expect(svc.tasks).toHaveLength(0);
      expect(svc.isRunning).toBe(false);
    });
  });
});
