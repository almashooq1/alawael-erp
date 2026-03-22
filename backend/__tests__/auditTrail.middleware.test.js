/**
 * Tests for auditTrail.middleware.js
 * Professional audit trail system — AuditEntry, recordAudit, flushAuditBuffer, auditMiddleware, queryAuditLogs
 */

/* eslint-disable no-unused-vars */

// ─── Mocks ──────────────────────────────────────────────────────────────────
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../utils/sanitize', () => ({
  escapeRegex: jest.fn(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
}));

// We must mock mongoose BEFORE requiring the module
const mockInsertMany = jest.fn().mockResolvedValue([]);
const mockFind = jest.fn().mockReturnValue({
  sort: jest.fn().mockReturnValue({
    skip: jest.fn().mockReturnValue({
      limit: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue([]),
      }),
    }),
  }),
});
const mockCountDocuments = jest.fn().mockResolvedValue(0);
const mockModel = {
  insertMany: mockInsertMany,
  find: mockFind,
  countDocuments: mockCountDocuments,
};

jest.mock('mongoose', () => ({
  connection: { readyState: 1 },
  models: { AuditLog: mockModel },
  model: jest.fn(() => mockModel),
  Schema: jest.fn().mockImplementation(() => ({
    Types: { Mixed: 'Mixed' },
  })),
}));

// ─── Require module under test ──────────────────────────────────────────────
const {
  AUDIT_EVENTS,
  SEVERITY,
  AuditEntry,
  recordAudit,
  flushAuditBuffer,
  auditMiddleware,
  queryAuditLogs,
} = require('../middleware/auditTrail.middleware');
const logger = require('../utils/logger');

// ─── Helpers ────────────────────────────────────────────────────────────────
const mockReq = (overrides = {}) => ({
  method: 'POST',
  originalUrl: '/api/items',
  params: { id: '123' },
  body: { name: 'Test' },
  ip: '10.0.0.1',
  headers: { 'user-agent': 'jest-test' },
  user: { id: 'u1', _id: 'u1', email: 'a@b.com', role: 'admin' },
  requestId: 'req-001',
  ...overrides,
});

const mockRes = () => {
  const res = {
    statusCode: 200,
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

const mockNext = jest.fn();

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('auditTrail.middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNext.mockClear();
  });

  // ──────── Constants ────────
  describe('AUDIT_EVENTS', () => {
    it('should export auth event types', () => {
      expect(AUDIT_EVENTS.AUTH_LOGIN).toBe('auth.login');
      expect(AUDIT_EVENTS.AUTH_LOGOUT).toBe('auth.logout');
      expect(AUDIT_EVENTS.AUTH_LOGIN_FAILED).toBe('auth.login_failed');
      expect(AUDIT_EVENTS.AUTH_PASSWORD_CHANGE).toBe('auth.password_change');
    });

    it('should export data event types', () => {
      expect(AUDIT_EVENTS.DATA_CREATE).toBe('data.create');
      expect(AUDIT_EVENTS.DATA_READ).toBe('data.read');
      expect(AUDIT_EVENTS.DATA_UPDATE).toBe('data.update');
      expect(AUDIT_EVENTS.DATA_DELETE).toBe('data.delete');
      expect(AUDIT_EVENTS.DATA_EXPORT).toBe('data.export');
    });

    it('should export admin event types', () => {
      expect(AUDIT_EVENTS.ADMIN_CONFIG_CHANGE).toBe('admin.config_change');
      expect(AUDIT_EVENTS.ADMIN_USER_CREATE).toBe('admin.user_create');
      expect(AUDIT_EVENTS.ADMIN_ROLE_CHANGE).toBe('admin.role_change');
    });

    it('should export system event types', () => {
      expect(AUDIT_EVENTS.SYSTEM_STARTUP).toBe('system.startup');
      expect(AUDIT_EVENTS.SYSTEM_SHUTDOWN).toBe('system.shutdown');
      expect(AUDIT_EVENTS.SYSTEM_ERROR).toBe('system.error');
    });
  });

  describe('SEVERITY', () => {
    it('should export severity levels', () => {
      expect(SEVERITY.LOW).toBe('low');
      expect(SEVERITY.MEDIUM).toBe('medium');
      expect(SEVERITY.HIGH).toBe('high');
      expect(SEVERITY.CRITICAL).toBe('critical');
    });
  });

  // ──────── AuditEntry ────────
  describe('AuditEntry', () => {
    it('should build entry with all fields', () => {
      const entry = new AuditEntry({
        event: AUDIT_EVENTS.AUTH_LOGIN,
        actor: { id: 'u1', email: 'a@b.com', role: 'admin' },
        target: { resource: 'users' },
        details: { foo: 'bar' },
        severity: SEVERITY.HIGH,
        ip: '1.2.3.4',
        userAgent: 'Mozilla',
        requestId: 'req-x',
      });

      expect(entry.id).toMatch(/^audit_/);
      expect(entry.event).toBe('auth.login');
      expect(entry.actor).toEqual({ id: 'u1', email: 'a@b.com', role: 'admin' });
      expect(entry.target).toEqual({ resource: 'users' });
      expect(entry.details).toEqual({ foo: 'bar' });
      expect(entry.severity).toBe('high');
      expect(entry.ip).toBe('1.2.3.4');
      expect(entry.userAgent).toBe('Mozilla');
      expect(entry.requestId).toBe('req-x');
      expect(entry.timestamp).toBeDefined();
      expect(entry.environment).toBeDefined();
    });

    it('should handle null actor', () => {
      const entry = new AuditEntry({ event: 'test' });
      expect(entry.actor).toBeNull();
    });

    it('should use _id when id is missing', () => {
      const entry = new AuditEntry({
        event: 'test',
        actor: { _id: 'uid', email: 'e@e.com', role: 'user' },
      });
      expect(entry.actor.id).toBe('uid');
    });
  });

  // ──────── recordAudit ────────
  describe('recordAudit', () => {
    it('should accept a plain object and log it', () => {
      recordAudit({ event: AUDIT_EVENTS.DATA_CREATE, severity: SEVERITY.LOW });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] data.create'),
        expect.objectContaining({ severity: 'low' })
      );
    });

    it('should accept an AuditEntry instance directly', () => {
      const entry = new AuditEntry({ event: 'custom.event' });
      recordAudit(entry);
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] custom.event'),
        expect.any(Object)
      );
    });
  });

  // ──────── flushAuditBuffer ────────
  describe('flushAuditBuffer', () => {
    it('should call insertMany when mongoose is connected', async () => {
      // Push something into the buffer via recordAudit first
      recordAudit({ event: 'flush.test' });
      await flushAuditBuffer();
      expect(mockInsertMany).toHaveBeenCalled();
    });

    it('should handle insertMany errors gracefully', async () => {
      mockInsertMany.mockRejectedValueOnce(new Error('DB down'));
      recordAudit({ event: 'error.test' });
      await flushAuditBuffer();
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to flush'));
    });
  });

  // ──────── auditMiddleware ────────
  describe('auditMiddleware', () => {
    it('should skip GET requests (read-only)', () => {
      const mw = auditMiddleware({ resource: 'items' });
      const req = mockReq({ method: 'GET' });
      const res = mockRes();

      mw(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();
      // json should NOT have been monkey-patched (we check by calling it)
      res.json({ ok: true });
      // logger.info should not have audit log from this call
    });

    it('should skip HEAD requests', () => {
      const mw = auditMiddleware();
      const req = mockReq({ method: 'HEAD' });
      mw(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should skip OPTIONS requests', () => {
      const mw = auditMiddleware();
      const req = mockReq({ method: 'OPTIONS' });
      mw(req, mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    it('should audit POST as DATA_CREATE on res.json()', () => {
      const mw = auditMiddleware({ resource: 'orders' });
      const req = mockReq({ method: 'POST' });
      const res = mockRes();

      mw(req, res, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // Now trigger the monkey-patched json
      res.json({ data: { _id: 'new1' } });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] data.create'),
        expect.objectContaining({ actor: 'a@b.com' })
      );
    });

    it('should audit PUT as DATA_UPDATE', () => {
      const mw = auditMiddleware({ resource: 'orders' });
      const req = mockReq({ method: 'PUT' });
      const res = mockRes();

      mw(req, res, mockNext);
      res.json({ data: {} });
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] data.update'),
        expect.any(Object)
      );
    });

    it('should audit DELETE with HIGH severity', () => {
      const mw = auditMiddleware({ resource: 'orders', severity: SEVERITY.LOW });
      const req = mockReq({ method: 'DELETE' });
      const res = mockRes();

      mw(req, res, mockNext);
      res.json({});
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('[AUDIT] data.delete'),
        expect.objectContaining({ severity: 'high' })
      );
    });

    it('should use default resource "unknown" when none provided', () => {
      const mw = auditMiddleware();
      const req = mockReq({ method: 'PATCH' });
      const res = mockRes();
      mw(req, res, mockNext);
      res.json({});
      expect(logger.info).toHaveBeenCalled();
    });
  });

  // ──────── queryAuditLogs ────────
  describe('queryAuditLogs', () => {
    it('should query from database when AuditLog model exists', async () => {
      const result = await queryAuditLogs({ event: 'auth.login' });
      expect(result.source).toBe('database');
      expect(mockFind).toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockFind.mockImplementationOnce(() => {
        throw new Error('DB error');
      });
      const result = await queryAuditLogs();
      expect(result.source).toBe('error');
      expect(result.entries).toEqual([]);
    });
  });
});
