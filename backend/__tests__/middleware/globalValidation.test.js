/**
 * Tests for Global Validation Middleware
 * اختبارات ميدلوير التحقق العام
 */

'use strict';

const {
  globalValidation,
  isValidObjectId,
  scanObject,
} = require('../../middleware/globalValidation');

// ─── Helper: create mock req/res/next ────────────────────────────────────────

const mockReq = (overrides = {}) => ({
  params: {},
  query: {},
  body: {},
  ...overrides,
});

const mockRes = () => {
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(data) {
      res.jsonData = data;
      return res;
    },
  };
  return res;
};

// ─── isValidObjectId ─────────────────────────────────────────────────────────

describe('isValidObjectId', () => {
  it('accepts a valid 24-char hex string', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true);
  });

  it('rejects a short string', () => {
    expect(isValidObjectId('123')).toBe(false);
  });

  it('rejects non-hex characters', () => {
    expect(isValidObjectId('zzzzzzzzzzzzzzzzzzzzzzzz')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidObjectId('')).toBe(false);
  });

  it('rejects numeric-only 12-char string that Mongoose might accept', () => {
    // Mongoose ObjectId.isValid('123456789012') returns true (12 bytes),
    // but our regex requires 24-char hex
    expect(isValidObjectId('123456789012')).toBe(false);
  });
});

// ─── scanObject ──────────────────────────────────────────────────────────────

describe('scanObject', () => {
  it('returns null for a clean flat object', () => {
    expect(scanObject({ name: 'test', age: 25 })).toBeNull();
  });

  it('returns null for an empty object', () => {
    expect(scanObject({})).toBeNull();
  });

  it('detects __proto__ key', () => {
    // JSON.parse creates __proto__ as a real own property (like Express body-parser does)
    const obj = JSON.parse('{"__proto__": {"admin": true}}');
    expect(scanObject(obj)).toMatch(/Forbidden key/);
  });

  it('detects constructor key', () => {
    const obj = { nested: { constructor: 'evil' } };
    expect(scanObject(obj)).toMatch(/Forbidden key/);
  });

  it('detects excessive nesting', () => {
    let obj = { value: 'leaf' };
    for (let i = 0; i < 15; i++) {
      obj = { child: obj };
    }
    expect(scanObject(obj)).toMatch(/nesting depth/);
  });

  it('detects too many keys', () => {
    const obj = {};
    for (let i = 0; i < 250; i++) {
      obj[`key${i}`] = i;
    }
    expect(scanObject(obj)).toMatch(/too many keys/);
  });

  it('returns null for arrays within limits', () => {
    expect(scanObject([1, 2, { a: 'b' }])).toBeNull();
  });

  it('returns null for null/undefined', () => {
    expect(scanObject(null)).toBeNull();
    expect(scanObject(undefined)).toBeNull();
  });
});

// ─── globalValidation middleware ─────────────────────────────────────────────

describe('globalValidation middleware', () => {
  const middleware = globalValidation();

  describe('URL param validation', () => {
    it('passes valid ObjectId in :id param', () => {
      const req = mockReq({ params: { id: '507f1f77bcf86cd799439011' } });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects invalid ObjectId in :id param', () => {
      const req = mockReq({ params: { id: 'not-a-valid-id' } });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.success).toBe(false);
      expect(res.jsonData.field).toBe('id');
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects invalid ObjectId in :studentId param', () => {
      const req = mockReq({ params: { studentId: 'abc' } });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.field).toBe('studentId');
    });

    it('rejects invalid ObjectId in :employeeId param', () => {
      const req = mockReq({ params: { employeeId: 'xyz123' } });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.field).toBe('employeeId');
    });

    it('passes valid integer :year param', () => {
      const req = mockReq({ params: { year: '2025' } });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects negative :year param', () => {
      const req = mockReq({ params: { year: '-1' } });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.field).toBe('year');
    });

    it('rejects non-numeric :month param', () => {
      const req = mockReq({ params: { month: 'abc' } });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.field).toBe('month');
    });

    it('skips empty param values', () => {
      const req = mockReq({ params: { id: '' } });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('does not validate non-id params that do not match pattern', () => {
      const req = mockReq({ params: { name: 'some-slug', action: 'export' } });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('query string validation', () => {
    it('passes normal query parameters', () => {
      const req = mockReq({ query: { search: 'test', status: 'active' } });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects __proto__ in query keys', () => {
      // Simulate how Express parses query strings (creates real own property)
      const query = JSON.parse('{"__proto__": "evil"}');
      const req = mockReq({ query });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.message).toMatch(/Forbidden/);
    });

    it('rejects oversized query values', () => {
      const req = mockReq({ query: { search: 'x'.repeat(600) } });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.message).toMatch(/exceeds maximum length/);
    });

    it('rejects non-integer page query param', () => {
      const req = mockReq({ query: { page: 'abc' } });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.field).toBe('page');
    });

    it('accepts valid page and limit query params', () => {
      const req = mockReq({ query: { page: '2', limit: '50' } });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('passes empty query', () => {
      const req = mockReq({ query: {} });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('body validation', () => {
    it('passes a clean body', () => {
      const req = mockReq({ body: { name: 'Ali', email: 'ali@test.com' } });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('rejects body with prototype pollution keys', () => {
      const req = mockReq({ body: { nested: { constructor: 'evil' } } });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.message).toMatch(/Forbidden key/);
    });

    it('rejects deeply nested body', () => {
      let obj = { value: 'leaf' };
      for (let i = 0; i < 15; i++) {
        obj = { child: obj };
      }
      const req = mockReq({ body: obj });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.statusCode).toBe(400);
      expect(res.jsonData.message).toMatch(/nesting depth/);
    });

    it('passes when body is not an object', () => {
      const req = mockReq({ body: 'just a string' });
      const res = mockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  describe('options', () => {
    it('respects strictObjectIds=false option', () => {
      const relaxed = globalValidation({ strictObjectIds: false });
      const req = mockReq({ params: { id: 'not-an-objectid' } });
      const res = mockRes();
      const next = jest.fn();

      relaxed(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('respects scanBody=false option', () => {
      const noBodyScan = globalValidation({ scanBody: false });
      let obj = { value: 'leaf' };
      for (let i = 0; i < 15; i++) {
        obj = { child: obj };
      }
      const req = mockReq({ body: obj });
      const res = mockRes();
      const next = jest.fn();

      noBodyScan(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('respects custom maxQueryValueLength', () => {
      const tight = globalValidation({ maxQueryValueLength: 10 });
      const req = mockReq({ query: { search: 'this is more than 10 chars' } });
      const res = mockRes();
      const next = jest.fn();

      tight(req, res, next);
      expect(res.statusCode).toBe(400);
    });
  });
});
