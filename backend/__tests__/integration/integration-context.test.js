/**
 * Integration Context Middleware — Tests
 *
 * Tests request context enrichment, correlation ID propagation,
 * module extraction, and cleanup.
 */

'use strict';

const {
  createIntegrationContextMiddleware,
  extractModuleFromPath,
  MODULE_PATH_MAP,
  getContext,
  clearContext: _clearContext,
} = require('../../middleware/integrationContext.middleware');

// ─── Mock request/response factory ──────────────────────────────────────────

function createMockReq(overrides = {}) {
  return {
    headers: {},
    method: 'GET',
    path: '/api/v1/employees',
    ip: '127.0.0.1',
    user: null,
    sessionID: null,
    connection: { remoteAddress: '127.0.0.1' },
    ...overrides,
  };
}

function createMockRes() {
  const listeners = {};
  return {
    setHeader: jest.fn(),
    on: jest.fn((event, handler) => {
      listeners[event] = handler;
    }),
    statusCode: 200,
    _trigger: event => listeners[event]?.(),
  };
}

describe('IntegrationContext Middleware', () => {
  let middleware;

  beforeEach(() => {
    middleware = createIntegrationContextMiddleware({
      integrationBus: null,
      serviceName: 'test-service',
    });
  });

  // ─── Context Generation ───────────────────────────────────────────────

  describe('context generation', () => {
    it('should attach integrationContext to request', () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      middleware(req, res, next);

      expect(req.integrationContext).toBeDefined();
      expect(req.correlationId).toBeDefined();
      expect(req.requestId).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('should generate unique correlationId when not provided', () => {
      const req = createMockReq();
      const res = createMockRes();
      middleware(req, res, jest.fn());

      expect(req.correlationId).toBeDefined();
      expect(req.correlationId.length).toBeGreaterThan(10);
    });

    it('should use incoming x-correlation-id header', () => {
      const req = createMockReq({
        headers: { 'x-correlation-id': 'external-corr-123' },
      });
      const res = createMockRes();
      middleware(req, res, jest.fn());

      expect(req.correlationId).toBe('external-corr-123');
    });

    it('should use incoming x-request-id as fallback', () => {
      const req = createMockReq({
        headers: { 'x-request-id': 'req-456' },
      });
      const res = createMockRes();
      middleware(req, res, jest.fn());

      expect(req.correlationId).toBe('req-456');
    });

    it('should include causationId from header', () => {
      const req = createMockReq({
        headers: { 'x-causation-id': 'cause-789' },
      });
      const res = createMockRes();
      middleware(req, res, jest.fn());

      expect(req.integrationContext.causationId).toBe('cause-789');
    });
  });

  // ─── Response Headers ────────────────────────────────────────────────

  describe('response headers', () => {
    it('should propagate correlation headers to response', () => {
      const req = createMockReq();
      const res = createMockRes();
      middleware(req, res, jest.fn());

      expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-Id', expect.any(String));
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-Id', expect.any(String));
    });

    it('should skip response headers when propagateHeaders is false', () => {
      const noHeaderMiddleware = createIntegrationContextMiddleware({
        propagateHeaders: false,
      });
      const req = createMockReq();
      const res = createMockRes();
      noHeaderMiddleware(req, res, jest.fn());

      expect(res.setHeader).not.toHaveBeenCalled();
    });
  });

  // ─── publishEvent shorthand ──────────────────────────────────────────

  describe('req.publishEvent', () => {
    it('should attach publishEvent to request', () => {
      const req = createMockReq();
      const res = createMockRes();
      middleware(req, res, jest.fn());

      expect(typeof req.publishEvent).toBe('function');
    });

    it('should return null when no integrationBus provided', async () => {
      const req = createMockReq();
      const res = createMockRes();
      middleware(req, res, jest.fn());

      const result = await req.publishEvent('hr', 'employee.hired', { name: 'X' });
      expect(result).toBeNull();
    });

    it('should call integrationBus.publish with context metadata', async () => {
      const mockBus = {
        publish: jest.fn().mockResolvedValue({ id: 'evt-1' }),
      };
      const busMiddleware = createIntegrationContextMiddleware({
        integrationBus: mockBus,
      });

      const req = createMockReq();
      const res = createMockRes();
      busMiddleware(req, res, jest.fn());

      await req.publishEvent('hr', 'employee.hired', { name: 'John' });

      expect(mockBus.publish).toHaveBeenCalledWith(
        'hr',
        'employee.hired',
        { name: 'John' },
        expect.objectContaining({
          metadata: expect.objectContaining({
            correlationId: expect.any(String),
            requestId: expect.any(String),
          }),
        })
      );
    });
  });

  // ─── Cleanup ──────────────────────────────────────────────────────────

  describe('cleanup', () => {
    it('should clear context on response finish', () => {
      const req = createMockReq();
      const res = createMockRes();
      middleware(req, res, jest.fn());

      const requestId = req.requestId;
      // Context should exist while request is active
      expect(getContext(requestId)).toBeDefined();

      // Simulate response finish
      res._trigger('finish');

      // Context should be cleared
      expect(getContext(requestId)).toBeNull();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  Module Extraction
// ═══════════════════════════════════════════════════════════════════════════════

describe('extractModuleFromPath', () => {
  it('should extract module from /api/v1/employees', () => {
    expect(extractModuleFromPath('/api/v1/employees')).toBe('hr');
  });

  it('should extract module from /api/finance/invoices', () => {
    expect(extractModuleFromPath('/api/finance/invoices')).toBe('finance');
  });

  it('should extract module from /api/v1/beneficiary/123', () => {
    expect(extractModuleFromPath('/api/v1/beneficiary/123')).toBe('beneficiary');
  });

  it('should extract module from /api/v1/medical/records', () => {
    expect(extractModuleFromPath('/api/v1/medical/records')).toBe('medical');
  });

  it('should extract module from /api/v1/attendance/check-in', () => {
    expect(extractModuleFromPath('/api/v1/attendance/check-in')).toBe('attendance');
  });

  it('should extract module from /api/v1/notification/send', () => {
    expect(extractModuleFromPath('/api/v1/notification/send')).toBe('notification');
  });

  it('should extract module from /api/v1/auth/login', () => {
    expect(extractModuleFromPath('/api/v1/auth/login')).toBe('system');
  });

  it('should extract module from /api/v1/dashboard/kpi', () => {
    expect(extractModuleFromPath('/api/v1/dashboard/kpi')).toBe('dashboard');
  });

  it('should extract module from /api/v1/warehouse/items', () => {
    expect(extractModuleFromPath('/api/v1/warehouse/items')).toBe('supply-chain');
  });

  it('should return segment for unmapped paths', () => {
    expect(extractModuleFromPath('/api/v1/custom/endpoint')).toBe('custom');
  });

  it('should return "unknown" for empty path', () => {
    expect(extractModuleFromPath('')).toBe('unknown');
    expect(extractModuleFromPath(null)).toBe('unknown');
  });
});

describe('MODULE_PATH_MAP', () => {
  it('should contain at least 20 mappings', () => {
    expect(Object.keys(MODULE_PATH_MAP).length).toBeGreaterThanOrEqual(20);
  });
});
