/**
 * Unit tests for services/database-replication-service.js
 * DatabaseReplicationService — Replication, failover, sync, health checks (singleton, EventEmitter)
 */

/* ─── mocks ─────────────────────────────────────────────────────────── */

const mockPing = jest.fn().mockResolvedValue({ ok: 1 });
const mockListCollections = jest.fn();
const mockCollectionFind = jest.fn();
const mockCollectionDeleteMany = jest.fn();
const mockCollectionInsertMany = jest.fn();
const mockCollectionCountDocuments = jest.fn();

const mockConnection = {
  db: {
    admin: jest.fn(() => ({ ping: mockPing })),
    listCollections: jest.fn(() => ({ toArray: mockListCollections })),
    collection: jest.fn(() => ({
      find: jest.fn(() => ({ toArray: mockCollectionFind })),
      deleteMany: mockCollectionDeleteMany,
      insertMany: mockCollectionInsertMany,
      countDocuments: mockCollectionCountDocuments,
    })),
  },
  on: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
};

jest.mock('mongoose', () => ({
  createConnection: jest.fn(() => mockConnection),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

/* ─── load service ──────────────────────────────────────────────────── */

let service;

beforeAll(() => {
  jest.useFakeTimers();
  service = require('../../services/database-replication-service');
});

afterAll(() => {
  jest.useRealTimers();
});

/* ─── tests ─────────────────────────────────────────────────────────── */

describe('DatabaseReplicationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset service state
    service.isReplicating = false;
    service.primaryConnection = null;
    service.secondaryConnections = [];
    service.status = {
      primary: null,
      secondaries: [],
      lastSync: null,
      replicationLag: 0,
      health: 'unknown',
    };
    if (service.healthCheckInterval) {
      clearInterval(service.healthCheckInterval);
      service.healthCheckInterval = null;
    }
  });

  // ── constructor ──────────────────────────────────────────────────

  describe('constructor', () => {
    it('has default config', () => {
      expect(service.config.replicationLagThreshold).toBe(5000);
      expect(service.config.autoFailover).toBe(true);
      expect(service.config.retryAttempts).toBe(3);
    });

    it('starts with unknown health', () => {
      expect(service.status.health).toBe('unknown');
      expect(service.isReplicating).toBe(false);
    });
  });

  // ── initialize ───────────────────────────────────────────────────

  describe('initialize', () => {
    it('connects primary and secondaries', async () => {
      const result = await service.initialize('mongodb://primary', ['mongodb://secondary1']);

      expect(result).toBe(true);
      expect(service.isReplicating).toBe(true);
      expect(service.status.health).toBe('healthy');
      expect(service.status.primary.connected).toBe(true);
      expect(service.status.secondaries).toHaveLength(1);
    });

    it('connects primary only when no replicas', async () => {
      const result = await service.initialize('mongodb://primary');

      expect(result).toBe(true);
      expect(service.secondaryConnections).toHaveLength(0);
    });

    it('returns false on connection error', async () => {
      const mongoose = require('mongoose');
      mongoose.createConnection.mockImplementationOnce(() => {
        throw new Error('Connection refused');
      });

      const result = await service.initialize('mongodb://bad');

      expect(result).toBe(false);
      expect(service.status.health).toBe('unhealthy');
    });
  });

  // ── createConnection ─────────────────────────────────────────────

  describe('createConnection', () => {
    it('creates mongoose connection with options', async () => {
      const mongoose = require('mongoose');
      const conn = await service.createConnection('mongodb://test', 'test-node');

      expect(mongoose.createConnection).toHaveBeenCalledWith(
        'mongodb://test',
        expect.objectContaining({ maxPoolSize: 10 })
      );
      expect(conn.on).toHaveBeenCalledWith('connected', expect.any(Function));
      expect(conn.on).toHaveBeenCalledWith('disconnected', expect.any(Function));
      expect(conn.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  // ── performHealthCheck ───────────────────────────────────────────

  describe('performHealthCheck', () => {
    it('returns healthy when all connections respond', async () => {
      service.primaryConnection = mockConnection;
      service.secondaryConnections = [mockConnection];
      service.status.primary = { connected: false, lastPing: null };
      service.status.secondaries = [{ connected: false, lastPing: null }];

      const results = await service.performHealthCheck();

      expect(results.primary.status).toBe('healthy');
      expect(results.secondaries[0].status).toBe('healthy');
      expect(service.status.health).toBe('healthy');
    });

    it('marks degraded when primary fails but secondary ok', async () => {
      const badConn = {
        db: { admin: jest.fn(() => ({ ping: jest.fn().mockRejectedValue(new Error('down')) })) },
      };
      service.primaryConnection = badConn;
      service.secondaryConnections = [mockConnection];
      service.status.primary = { connected: true, lastPing: null };
      service.status.secondaries = [{ connected: false, lastPing: null }];
      service.config.autoFailover = false; // prevent failover side effects

      const results = await service.performHealthCheck();

      expect(results.primary.status).toBe('unhealthy');
      expect(service.status.health).toBe('degraded');
    });

    it('marks critical when all connections fail', async () => {
      const badConn = {
        db: { admin: jest.fn(() => ({ ping: jest.fn().mockRejectedValue(new Error('down')) })) },
      };
      service.primaryConnection = badConn;
      service.secondaryConnections = [badConn];
      service.status.primary = { connected: true };
      service.status.secondaries = [{ connected: true }];
      service.config.autoFailover = false;

      const results = await service.performHealthCheck();

      expect(service.status.health).toBe('critical');
    });

    it('triggers failover when primary fails and autoFailover enabled', async () => {
      const badConn = {
        db: { admin: jest.fn(() => ({ ping: jest.fn().mockRejectedValue(new Error('down')) })) },
      };
      service.primaryConnection = badConn;
      service.secondaryConnections = [mockConnection];
      service.status.primary = { connected: true };
      service.status.secondaries = [{ connected: true, lastPing: null }];
      service.config.autoFailover = true;

      await service.performHealthCheck();

      // After failover, primary becomes the old secondary
      expect(service.primaryConnection).toBe(mockConnection);
    });
  });

  // ── attemptFailover ──────────────────────────────────────────────

  describe('attemptFailover', () => {
    it('promotes first healthy secondary', async () => {
      const oldPrimary = { db: { admin: jest.fn() } };
      service.primaryConnection = oldPrimary;
      service.secondaryConnections = [mockConnection];
      service.status.primary = { uri: 'primary' };
      service.status.secondaries = [{ uri: 'secondary' }];

      const emitted = [];
      service.on('failover', data => emitted.push(data));

      const result = await service.attemptFailover();

      expect(result).toBe(true);
      expect(service.primaryConnection).toBe(mockConnection);
      expect(emitted[0].success).toBe(true);
    });

    it('returns false when no healthy secondaries', async () => {
      const badConn = {
        db: { admin: jest.fn(() => ({ ping: jest.fn().mockRejectedValue(new Error('down')) })) },
      };
      service.primaryConnection = badConn;
      service.secondaryConnections = [badConn];
      service.status.primary = { uri: 'p' };
      service.status.secondaries = [{ uri: 's' }];

      const result = await service.attemptFailover();

      expect(result).toBe(false);
    });
  });

  // ── syncData ─────────────────────────────────────────────────────

  describe('syncData', () => {
    it('syncs specified collections', async () => {
      service.primaryConnection = mockConnection;
      service.secondaryConnections = [mockConnection];
      mockCollectionFind.mockResolvedValue([{ _id: '1' }, { _id: '2' }]);
      mockCollectionDeleteMany.mockResolvedValue(undefined);
      mockCollectionInsertMany.mockResolvedValue(undefined);

      const result = await service.syncData(['users', 'sessions']);

      expect(result.collections).toHaveLength(2);
      expect(result.collections[0].count).toBe(2);
      expect(result.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it('auto-discovers collections when none specified', async () => {
      service.primaryConnection = mockConnection;
      service.secondaryConnections = [mockConnection];
      mockListCollections.mockResolvedValue([{ name: 'col1' }]);
      mockCollectionFind.mockResolvedValue([]);

      const result = await service.syncData();

      expect(result.collections).toHaveLength(1);
      expect(result.collections[0].name).toBe('col1');
    });

    it('throws when no connections', async () => {
      service.primaryConnection = null;
      service.secondaryConnections = [];

      await expect(service.syncData()).rejects.toThrow('لا يوجد اتصالات');
    });

    it('records errors for failed collections', async () => {
      service.primaryConnection = mockConnection;
      service.secondaryConnections = [mockConnection];

      // Make find throw for one collection
      const dbCollection = mockConnection.db.collection;
      dbCollection.mockReturnValueOnce({
        find: jest.fn(() => ({ toArray: jest.fn().mockRejectedValue(new Error('fail')) })),
      });

      const result = await service.syncData(['badCol']);

      expect(result.errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── verifySync ───────────────────────────────────────────────────

  describe('verifySync', () => {
    it('returns consistent when counts match', async () => {
      service.primaryConnection = mockConnection;
      service.secondaryConnections = [mockConnection];
      mockListCollections.mockResolvedValue([{ name: 'users' }]);
      mockCollectionCountDocuments.mockResolvedValue(10);

      const result = await service.verifySync();

      expect(result.consistent).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it('returns consistent with no secondaries', async () => {
      service.primaryConnection = null;
      service.secondaryConnections = [];

      const result = await service.verifySync();

      expect(result.consistent).toBe(true);
    });
  });

  // ── maskUri ──────────────────────────────────────────────────────

  describe('maskUri', () => {
    it('masks password in URI', () => {
      const masked = service.maskUri('mongodb://user:secret@host:27017/db');
      expect(masked).not.toContain('secret');
      expect(masked).toContain('****');
    });

    it('handles URI without credentials', () => {
      const masked = service.maskUri('mongodb://host:27017/db');
      expect(masked).toBe('mongodb://host:27017/db');
    });
  });

  // ── getReplicationStats ──────────────────────────────────────────

  describe('getReplicationStats', () => {
    it('returns current status', () => {
      service.status.health = 'healthy';
      service.isReplicating = true;

      const status = service.getReplicationStats();

      expect(status.health).toBe('healthy');
      expect(status.isReplicating).toBe(true);
    });
  });

  // ── stop ─────────────────────────────────────────────────────────

  describe('stop', () => {
    it('stops health check and closes connections', async () => {
      service.healthCheckInterval = setInterval(() => {}, 1000);
      service.primaryConnection = mockConnection;
      service.secondaryConnections = [mockConnection];

      await service.stop();

      expect(service.isReplicating).toBe(false);
      expect(service.status.health).toBe('stopped');
      expect(mockConnection.close).toHaveBeenCalled();
    });

    it('handles missing connections gracefully', async () => {
      service.primaryConnection = null;
      service.secondaryConnections = [];

      await expect(service.stop()).resolves.toBeUndefined();
    });
  });
});
