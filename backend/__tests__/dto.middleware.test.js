/**
 * @file dto.middleware.test.js
 * @description Tests for Professional DTO (Data Transfer Object) layer
 *
 * Source: backend/middleware/dto.middleware.js (290 lines)
 * Batch 8 — ApiResponse class, validate middleware, commonValidators, requestContext
 */

'use strict';

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const {
  ApiResponse,
  validate,
  commonValidators,
  requestContext,
} = require('../middleware/dto.middleware');

// ── helpers ──────────────────────────────────────────────────────────────
const mockRes = () => {
  const res = {
    _status: null,
    _json: null,
    _headers: {},
    status(code) {
      res._status = code;
      return res;
    },
    json(data) {
      res._json = data;
      return res;
    },
    getHeader(key) {
      return res._headers[key];
    },
    setHeader(key, value) {
      res._headers[key] = value;
    },
  };
  return res;
};

// ═══════════════════════════════════════════════════════════════════════════
// ApiResponse
// ═══════════════════════════════════════════════════════════════════════════
describe('ApiResponse', () => {
  describe('success', () => {
    it('should return 200 with default envelope', () => {
      const res = mockRes();
      ApiResponse.success(res, { data: { id: 1 } });
      expect(res._status).toBe(200);
      expect(res._json.success).toBe(true);
      expect(res._json.data).toEqual({ id: 1 });
      expect(res._json.meta.timestamp).toBeDefined();
    });

    it('should include message when provided', () => {
      const res = mockRes();
      ApiResponse.success(res, { data: null, message: 'تم بنجاح' });
      expect(res._json.message).toBe('تم بنجاح');
    });

    it('should use custom status code', () => {
      const res = mockRes();
      ApiResponse.success(res, { statusCode: 202 });
      expect(res._status).toBe(202);
    });

    it('should merge meta data', () => {
      const res = mockRes();
      ApiResponse.success(res, { meta: { extra: 'info' } });
      expect(res._json.meta.extra).toBe('info');
      expect(res._json.meta.timestamp).toBeDefined();
    });

    it('should fallback version to v2 when no header set', () => {
      const res = mockRes();
      ApiResponse.success(res);
      expect(res._json.meta.version).toBe('v2');
    });

    it('should use version from header when set', () => {
      const res = mockRes();
      res._headers['X-API-Version'] = 'v1';
      ApiResponse.success(res, { data: [] });
      expect(res._json.meta.version).toBe('v1');
    });
  });

  describe('created', () => {
    it('should return 201 with default message', () => {
      const res = mockRes();
      ApiResponse.created(res, { data: { id: 42 } });
      expect(res._status).toBe(201);
      expect(res._json.message).toBe('تم الإنشاء بنجاح');
      expect(res._json.data).toEqual({ id: 42 });
    });

    it('should allow custom message', () => {
      const res = mockRes();
      ApiResponse.created(res, { message: 'Custom create' });
      expect(res._json.message).toBe('Custom create');
    });
  });

  describe('paginated', () => {
    it('should calculate pagination correctly', () => {
      const res = mockRes();
      ApiResponse.paginated(res, {
        data: [1, 2, 3],
        page: 2,
        limit: 10,
        total: 50,
      });
      expect(res._status).toBe(200);
      const p = res._json.meta.pagination;
      expect(p.page).toBe(2);
      expect(p.limit).toBe(10);
      expect(p.total).toBe(50);
      expect(p.totalPages).toBe(5);
      expect(p.hasNextPage).toBe(true);
      expect(p.hasPrevPage).toBe(true);
    });

    it('should handle first page (no prev)', () => {
      const res = mockRes();
      ApiResponse.paginated(res, { data: [], page: 1, limit: 10, total: 30 });
      const p = res._json.meta.pagination;
      expect(p.hasPrevPage).toBe(false);
      expect(p.hasNextPage).toBe(true);
    });

    it('should handle last page (no next)', () => {
      const res = mockRes();
      ApiResponse.paginated(res, { data: [], page: 3, limit: 10, total: 30 });
      const p = res._json.meta.pagination;
      expect(p.hasNextPage).toBe(false);
      expect(p.hasPrevPage).toBe(true);
    });

    it('should handle 0 total', () => {
      const res = mockRes();
      ApiResponse.paginated(res, { data: [], page: 1, limit: 10, total: 0 });
      const p = res._json.meta.pagination;
      expect(p.totalPages).toBe(0);
      expect(p.hasNextPage).toBe(false);
    });

    it('should ceil totalPages for non-exact divisions', () => {
      const res = mockRes();
      ApiResponse.paginated(res, { data: [], page: 1, limit: 3, total: 7 });
      expect(res._json.meta.pagination.totalPages).toBe(3);
    });
  });

  describe('error', () => {
    it('should return 500 with default values', () => {
      const res = mockRes();
      ApiResponse.error(res);
      expect(res._status).toBe(500);
      expect(res._json.success).toBe(false);
      expect(res._json.error.code).toBe('INTERNAL_ERROR');
      expect(res._json.error.message).toBe('حدث خطأ');
    });

    it('should use custom status and message', () => {
      const res = mockRes();
      ApiResponse.error(res, {
        message: 'Custom error',
        statusCode: 400,
        code: 'BAD_REQUEST',
      });
      expect(res._status).toBe(400);
      expect(res._json.error.code).toBe('BAD_REQUEST');
      expect(res._json.error.message).toBe('Custom error');
    });

    it('should include details when provided', () => {
      const res = mockRes();
      ApiResponse.error(res, { details: [{ field: 'name' }] });
      expect(res._json.error.details).toEqual([{ field: 'name' }]);
    });

    it('should exclude stack in production', () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const res = mockRes();
      ApiResponse.error(res, { stack: 'Error stack trace' });
      expect(res._json.error.stack).toBeUndefined();
      process.env.NODE_ENV = origEnv;
    });

    it('should include stack in non-production', () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const res = mockRes();
      ApiResponse.error(res, { stack: 'Error at line 1' });
      expect(res._json.error.stack).toBe('Error at line 1');
      process.env.NODE_ENV = origEnv;
    });

    it('should include timestamp in meta', () => {
      const res = mockRes();
      ApiResponse.error(res);
      expect(res._json.meta.timestamp).toBeDefined();
    });
  });

  describe('validationError', () => {
    it('should return 422 with formatted errors', () => {
      const res = mockRes();
      const errors = [
        { path: 'email', msg: 'Invalid email', value: 'bad' },
        { param: 'name', msg: 'Required', value: '' },
      ];
      ApiResponse.validationError(res, errors);
      expect(res._status).toBe(422);
      expect(res._json.error.code).toBe('VALIDATION_ERROR');
      expect(res._json.error.details).toHaveLength(2);
      expect(res._json.error.details[0].field).toBe('email');
      expect(res._json.error.details[1].field).toBe('name');
    });
  });

  describe('notFound', () => {
    it('should return 404 with resource name', () => {
      const res = mockRes();
      ApiResponse.notFound(res, 'المستخدم');
      expect(res._status).toBe(404);
      expect(res._json.error.code).toBe('NOT_FOUND');
      expect(res._json.error.message).toContain('المستخدم');
    });

    it('should use default resource name', () => {
      const res = mockRes();
      ApiResponse.notFound(res);
      expect(res._json.error.message).toContain('المورد');
    });
  });

  describe('unauthorized', () => {
    it('should return 401', () => {
      const res = mockRes();
      ApiResponse.unauthorized(res);
      expect(res._status).toBe(401);
      expect(res._json.error.code).toBe('UNAUTHORIZED');
    });

    it('should allow custom message', () => {
      const res = mockRes();
      ApiResponse.unauthorized(res, 'Token expired');
      expect(res._json.error.message).toBe('Token expired');
    });
  });

  describe('forbidden', () => {
    it('should return 403', () => {
      const res = mockRes();
      ApiResponse.forbidden(res);
      expect(res._status).toBe(403);
      expect(res._json.error.code).toBe('FORBIDDEN');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// requestContext middleware
// ═══════════════════════════════════════════════════════════════════════════
describe('requestContext', () => {
  it('should set requestId on req and response header', () => {
    const req = {
      headers: {},
      method: 'GET',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
    };
    const res = mockRes();
    res.json = jest.fn().mockReturnValue(res);
    const next = jest.fn();

    requestContext(req, res, next);

    expect(req.requestId).toBeDefined();
    expect(req.requestId).toMatch(/^req_/);
    expect(res._headers['X-Request-Id']).toBe(req.requestId);
    expect(req.startTime).toBeDefined();
    expect(next).toHaveBeenCalled();
  });

  it('should use existing X-Request-Id header if provided', () => {
    const req = {
      headers: { 'x-request-id': 'custom-id-123' },
      method: 'GET',
      originalUrl: '/api/test',
      ip: '127.0.0.1',
    };
    const res = mockRes();
    res.json = jest.fn().mockReturnValue(res);
    const next = jest.fn();

    requestContext(req, res, next);
    expect(req.requestId).toBe('custom-id-123');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// commonValidators (structure tests)
// ═══════════════════════════════════════════════════════════════════════════
describe('commonValidators', () => {
  it('should have all expected validator keys', () => {
    const expected = [
      'mongoId',
      'pagination',
      'requiredString',
      'optionalString',
      'requiredEmail',
      'phone',
      'dateRange',
    ];
    for (const key of expected) {
      expect(commonValidators).toHaveProperty(key);
    }
  });

  it('mongoId should return a validator chain', () => {
    const chain = commonValidators.mongoId('id', 'params');
    expect(chain).toBeDefined();
    expect(typeof chain.run).toBe('function');
  });

  it('pagination should return an array of validators', () => {
    const result = commonValidators.pagination();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(4); // page, limit, sort, order
  });

  it('requiredString should return a validator chain', () => {
    const chain = commonValidators.requiredString('name');
    expect(chain).toBeDefined();
    expect(typeof chain.run).toBe('function');
  });

  it('requiredEmail should return a validator chain', () => {
    const chain = commonValidators.requiredEmail();
    expect(typeof chain.run).toBe('function');
  });

  it('dateRange should return array of 2 validators', () => {
    const result = commonValidators.dateRange();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(2);
  });
});
