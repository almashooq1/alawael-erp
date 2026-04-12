/**
 * Unit tests for auditLog.service.js — Smart Audit Log Service
 * Class export with all static methods. Uses AuditLog model + fieldEncryption.
 */

/* ── chainable query helper ─────────────────────────────────────────── */
global.__alQ = function (val) {
  return {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    then: (r, e) => Promise.resolve(val).then(r, e),
  };
};

global.__alSave = jest.fn().mockResolvedValue(true);

jest.mock('../../models/auditLog.model', () => {
  const ALModel = jest.fn(function (data) {
    Object.assign(this, data);
    this._id = 'al-1';
    this.save = global.__alSave;
  });
  ALModel.create = jest.fn(async data => ({ _id: 'al-1', ...data }));
  ALModel.find = jest.fn(() => global.__alQ([]));
  ALModel.countDocuments = jest.fn().mockResolvedValue(0);
  ALModel.distinct = jest.fn().mockResolvedValue([]);
  ALModel.aggregate = jest.fn().mockResolvedValue([]);
  ALModel.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
  ALModel.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });
  ALModel.getStatistics = jest.fn().mockResolvedValue([]);
  ALModel.analyzeUserPattern = jest.fn().mockResolvedValue([]);
  ALModel.detectAnomalies = jest.fn().mockResolvedValue([]);
  ALModel.getByUser = jest.fn().mockResolvedValue([]);

  return {
    AuditLog: ALModel,
    AuditEventTypes: {
      AUTH_LOGIN: 'auth.login',
      AUTH_LOGIN_FAILED: 'auth.login_failed',
      AUTH_LOGOUT: 'auth.logout',
      DATA_CREATED: 'data.created',
      DATA_READ: 'data.read',
      DATA_UPDATED: 'data.updated',
      DATA_DELETED: 'data.deleted',
      API_REQUEST: 'api.request',
      API_ERROR: 'api.error',
    },
    SeverityLevels: {},
    OperationStatus: {},
  };
});

jest.mock('../../utils/fieldEncryption', () => ({
  encrypt: jest.fn(val => `enc_${val}`),
}));

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

/* ── SUT ────────────────────────────────────────────────────────────── */
const AuditLogService = require('../../services/auditLog.service');
const { AuditLog } = require('../../models/auditLog.model');
const Q = global.__alQ;
const mockAuditLogSave = global.__alSave;

/* ── Helpers ─────────────────────────────────────────────────────────── */
const origEnv = process.env.ENABLE_AUDIT_LOGGING_IN_TESTS;
beforeEach(() => {
  jest.clearAllMocks();
  AuditLog.create.mockImplementation(async data => ({ _id: 'al-1', ...data }));
  AuditLog.find.mockImplementation(() => Q([]));
  AuditLog.countDocuments.mockResolvedValue(0);
  AuditLog.distinct.mockResolvedValue([]);
  AuditLog.updateMany.mockResolvedValue({ modifiedCount: 0 });
  AuditLog.deleteMany.mockResolvedValue({ deletedCount: 0 });
  mockAuditLogSave.mockResolvedValue(true);
  delete process.env.ENABLE_AUDIT_LOGGING_IN_TESTS;
});
afterAll(() => {
  if (origEnv !== undefined) process.env.ENABLE_AUDIT_LOGGING_IN_TESTS = origEnv;
  else delete process.env.ENABLE_AUDIT_LOGGING_IN_TESTS;
});

/* ═══════════════════════════════════════════════════════════════════════ */
describe('AuditLogService', () => {
  /* ── logEvent ────────────────────────────────────────────────────── */
  describe('logEvent', () => {
    test('returns null in test mode by default', async () => {
      const result = await AuditLogService.logEvent({ eventType: 'test.event' });
      expect(result).toBeNull();
      expect(AuditLog.create).not.toHaveBeenCalled();
    });

    test('logs when ENABLE_AUDIT_LOGGING_IN_TESTS is true', async () => {
      process.env.ENABLE_AUDIT_LOGGING_IN_TESTS = 'true';
      const result = await AuditLogService.logEvent({
        eventType: 'test.event',
        severity: 'info',
        message: 'Test message',
      });
      expect(AuditLog.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    test('handles critical severity notification', async () => {
      process.env.ENABLE_AUDIT_LOGGING_IN_TESTS = 'true';
      await AuditLogService.logEvent({
        eventType: 'security.breach',
        severity: 'critical',
        message: 'Critical event',
      });
      expect(AuditLog.create).toHaveBeenCalled();
    });

    test('handles req object with IP extraction', async () => {
      process.env.ENABLE_AUDIT_LOGGING_IN_TESTS = 'true';
      const req = {
        ip: '10.0.0.1',
        method: 'POST',
        originalUrl: '/api/test',
        route: { path: '/test' },
        query: {},
        headers: { 'user-agent': 'TestBot/1.0', authorization: 'Bearer xxx' },
        body: { name: 'test' },
      };
      await AuditLogService.logEvent({ eventType: 'test', req });
      expect(AuditLog.create).toHaveBeenCalled();
    });

    test('handles string userId 24 chars', async () => {
      process.env.ENABLE_AUDIT_LOGGING_IN_TESTS = 'true';
      await AuditLogService.logEvent({
        eventType: 'test',
        userId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
      });
      expect(AuditLog.create).toHaveBeenCalled();
    });

    test('handles object userId with _id', async () => {
      process.env.ENABLE_AUDIT_LOGGING_IN_TESTS = 'true';
      await AuditLogService.logEvent({
        eventType: 'test',
        userId: { _id: 'uid1' },
      });
      expect(AuditLog.create).toHaveBeenCalled();
    });

    test('handles resource as object', async () => {
      process.env.ENABLE_AUDIT_LOGGING_IN_TESTS = 'true';
      await AuditLogService.logEvent({
        eventType: 'test',
        resource: { type: 'user', id: '123' },
      });
      expect(AuditLog.create).toHaveBeenCalled();
    });

    test('returns null on DB error without throwing', async () => {
      process.env.ENABLE_AUDIT_LOGGING_IN_TESTS = 'true';
      AuditLog.create.mockRejectedValueOnce(new Error('DB'));
      const result = await AuditLogService.logEvent({ eventType: 'test' });
      expect(result).toBeNull();
    });
  });

  /* ── logAuthEvent ────────────────────────────────────────────────── */
  describe('logAuthEvent', () => {
    test('successful login', async () => {
      process.env.ENABLE_AUDIT_LOGGING_IN_TESTS = 'true';
      const user = { _id: 'u1', username: 'admin', email: 'a@b.com', role: 'admin' };
      await AuditLogService.logAuthEvent('login', user, null, true);
      expect(AuditLog.create).toHaveBeenCalled();
    });

    test('failed login', async () => {
      process.env.ENABLE_AUDIT_LOGGING_IN_TESTS = 'true';
      await AuditLogService.logAuthEvent(
        'login',
        { username: 'hacker' },
        null,
        false,
        new Error('wrong pw')
      );
      expect(AuditLog.create).toHaveBeenCalled();
    });
  });

  /* ── logDataOperation ────────────────────────────────────────────── */
  describe('logDataOperation', () => {
    test('create operation', async () => {
      process.env.ENABLE_AUDIT_LOGGING_IN_TESTS = 'true';
      const resource = { type: 'user', id: '123', name: 'User1' };
      const user = { _id: 'u1', username: 'admin', role: 'admin' };
      await AuditLogService.logDataOperation('create', resource, user, null);
      expect(AuditLog.create).toHaveBeenCalled();
    });

    test('update with changes', async () => {
      process.env.ENABLE_AUDIT_LOGGING_IN_TESTS = 'true';
      const resource = { type: 'user', id: '123' };
      const user = { _id: 'u1', username: 'admin', role: 'admin' };
      await AuditLogService.logDataOperation(
        'update',
        resource,
        user,
        null,
        { name: 'old' },
        { name: 'new' }
      );
      expect(AuditLog.create).toHaveBeenCalled();
    });
  });

  /* ── search ──────────────────────────────────────────────────────── */
  describe('search', () => {
    test('returns logs with pagination', async () => {
      const logs = [{ _id: 'l1' }, { _id: 'l2' }];
      AuditLog.find.mockImplementation(() => Q(logs));
      AuditLog.countDocuments.mockResolvedValue(2);

      const result = await AuditLogService.search({}, { limit: 10, skip: 0 });
      expect(result.logs).toEqual(logs);
      expect(result.pagination.total).toBe(2);
    });

    test('applies filters', async () => {
      AuditLog.find.mockImplementation(() => Q([]));
      AuditLog.countDocuments.mockResolvedValue(0);

      await AuditLogService.search({
        eventType: 'auth.login',
        severity: 'high',
        userId: 'u1',
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        tags: ['security'],
        isAnomaly: true,
        requiresReview: true,
        searchText: 'breach',
      });
      expect(AuditLog.find).toHaveBeenCalled();
    });
  });

  /* ── getStatistics ───────────────────────────────────────────────── */
  describe('getStatistics', () => {
    test('returns overview stats', async () => {
      AuditLog.getStatistics.mockResolvedValue([{ _id: 'auth.login', count: 10 }]);
      AuditLog.countDocuments
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(5) // critical
        .mockResolvedValueOnce(8) // failed
        .mockResolvedValueOnce(2); // anomalies
      AuditLog.distinct
        .mockResolvedValueOnce(['u1', 'u2']) // unique users
        .mockResolvedValueOnce(['1.1.1.1']); // unique IPs

      const result = await AuditLogService.getStatistics('2024-01-01', '2024-12-31');
      expect(result.overview.totalEvents).toBe(100);
      expect(result.overview.criticalEvents).toBe(5);
      expect(result.overview.uniqueUsers).toBe(2);
      expect(result.byEventType).toBeDefined();
    });
  });

  /* ── analyzeUserBehavior ─────────────────────────────────────────── */
  describe('analyzeUserBehavior', () => {
    test('returns behavior analysis', async () => {
      AuditLog.analyzeUserPattern.mockResolvedValue([{ count: 5 }]);
      AuditLog.detectAnomalies.mockResolvedValue([]);
      AuditLog.getByUser.mockResolvedValue([{ _id: 'l1' }]);

      const result = await AuditLogService.analyzeUserBehavior('u1', 7);
      expect(result).toHaveProperty('pattern');
      expect(result).toHaveProperty('anomalies');
      expect(result).toHaveProperty('recentActivity');
      expect(result).toHaveProperty('riskScore');
    });
  });

  /* ── exportLogs ──────────────────────────────────────────────────── */
  describe('exportLogs', () => {
    test('exports as JSON', async () => {
      AuditLog.find.mockImplementation(() => Q([{ _id: 'l1', eventType: 'test' }]));
      AuditLog.countDocuments.mockResolvedValue(1);

      const result = await AuditLogService.exportLogs({}, 'json');
      expect(typeof result).toBe('string');
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1);
    });

    test('exports as CSV', async () => {
      AuditLog.find.mockImplementation(() =>
        Q([
          {
            timestamp: '2024-01-01',
            eventType: 'auth.login',
            severity: 'info',
            status: 'success',
            username: 'admin',
            ipAddress: '1.1.1.1',
            message: 'Login',
          },
        ])
      );
      AuditLog.countDocuments.mockResolvedValue(1);

      const result = await AuditLogService.exportLogs({}, 'csv');
      expect(result).toContain('Timestamp');
      expect(result).toContain('auth.login');
    });
  });

  /* ── archiveOldLogs / deleteArchivedLogs ─────────────────────────── */
  describe('Archive operations', () => {
    test('archiveOldLogs — calls updateMany', async () => {
      AuditLog.updateMany.mockResolvedValue({ modifiedCount: 5 });
      const result = await AuditLogService.archiveOldLogs(90);
      expect(AuditLog.updateMany).toHaveBeenCalled();
      expect(result.modifiedCount).toBe(5);
    });

    test('deleteArchivedLogs — calls deleteMany', async () => {
      AuditLog.deleteMany.mockResolvedValue({ deletedCount: 3 });
      const result = await AuditLogService.deleteArchivedLogs(180);
      expect(AuditLog.deleteMany).toHaveBeenCalled();
      expect(result.deletedCount).toBe(3);
    });
  });

  /* ── createAuditLog ──────────────────────────────────────────────── */
  describe('createAuditLog', () => {
    test('saves audit log entry', async () => {
      const data = { action: 'CUSTOM', message: 'test', user: 'admin' };
      const result = await AuditLogService.createAuditLog(data);
      expect(mockAuditLogSave).toHaveBeenCalled();
    });

    test('returns error object on failure', async () => {
      mockAuditLogSave.mockRejectedValueOnce(new Error('DB'));
      const result = await AuditLogService.createAuditLog({ action: 'test' });
      expect(result.success).toBe(false);
    });
  });

  /* ── Pure static helpers ─────────────────────────────────────────── */
  describe('Static helpers', () => {
    test('extractIpAddress — from req.ip', () => {
      expect(AuditLogService.extractIpAddress({ ip: '1.2.3.4', headers: {} })).toBe('1.2.3.4');
    });

    test('extractIpAddress — from x-forwarded-for', () => {
      expect(
        AuditLogService.extractIpAddress({
          headers: { 'x-forwarded-for': '5.6.7.8, 1.2.3.4' },
        })
      ).toBe('5.6.7.8');
    });

    test('sanitizeHeaders — removes sensitive', () => {
      const h = {
        'content-type': 'json',
        authorization: 'Bearer x',
        cookie: 'abc',
        'x-api-key': 'k',
      };
      const sanitized = AuditLogService.sanitizeHeaders(h);
      expect(sanitized['content-type']).toBe('json');
      expect(sanitized.authorization).toBeUndefined();
      expect(sanitized.cookie).toBeUndefined();
      expect(sanitized['x-api-key']).toBeUndefined();
    });

    test('sanitizeBody — redacts sensitive fields', () => {
      const body = { name: 'test', password: 'secret123', email: 'a@b.com' };
      const sanitized = AuditLogService.sanitizeBody(body);
      expect(sanitized.name).toBe('test');
      expect(sanitized.password).not.toBe('secret123');
    });

    test('sanitizeBody — null input', () => {
      expect(AuditLogService.sanitizeBody(null)).toBeNull();
    });

    test('calculateChanges — detects differences', () => {
      const old = { name: 'A', age: 10 };
      const newD = { name: 'B', age: 10 };
      const changes = AuditLogService.calculateChanges(old, newD);
      expect(changes.fields).toContain('name');
      expect(changes.fields).not.toContain('age');
      expect(changes.before.name).toBe('A');
      expect(changes.after.name).toBe('B');
    });

    test('calculateRiskScore — critical level', () => {
      const anomalies = Array.from({ length: 10 }, () => ({}));
      const pattern = [{ count: 200 }];
      const score = AuditLogService.calculateRiskScore(anomalies, pattern);
      expect(score.level).toBe('critical');
    });

    test('calculateRiskScore — low level', () => {
      const score = AuditLogService.calculateRiskScore([], []);
      expect(score.level).toBe('low');
    });

    test('convertToCSV — with data', () => {
      const logs = [
        {
          timestamp: 't1',
          eventType: 'e1',
          severity: 's1',
          status: 'ok',
          username: 'u',
          ipAddress: '1.1.1.1',
          message: 'm',
        },
      ];
      const csv = AuditLogService.convertToCSV(logs);
      expect(csv).toContain('Timestamp');
      expect(csv).toContain('e1');
    });

    test('convertToCSV — empty', () => {
      expect(AuditLogService.convertToCSV([])).toBe('');
    });

    test('parseUserAgent — null returns empty', () => {
      expect(AuditLogService.parseUserAgent(null)).toEqual({});
    });

    test('getLocation — localhost returns empty', () => {
      expect(AuditLogService.getLocation('127.0.0.1')).toEqual({});
      expect(AuditLogService.getLocation('::1')).toEqual({});
    });

    test('getLocation — null returns empty', () => {
      expect(AuditLogService.getLocation(null)).toEqual({});
    });
  });

  /* ── Constructor binds instance methods ──────────────────────────── */
  describe('Instance binding', () => {
    test('constructor binds static methods to instance', () => {
      const instance = new AuditLogService();
      expect(typeof instance.logEvent).toBe('function');
      expect(typeof instance.search).toBe('function');
      expect(typeof instance.getStatistics).toBe('function');
      expect(typeof instance.exportLogs).toBe('function');
    });
  });
});
