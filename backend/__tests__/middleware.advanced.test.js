/**
 * Middleware Utilities Tests
 * Tests for middleware and utility functions
 */

const responseHandler = require('../middleware/responseHandler');
const sanitizeInput = require('../middleware/sanitize');
const securityHeaders = require('../middleware/securityHeaders');

describe('Response Handler Middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      method: 'GET',
      path: '/api/test',
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    next = jest.fn();
  });

  test('should attach success method to response', () => {
    responseHandler(req, res, next);
    expect(typeof res.success).toBe('function');
    expect(next).toHaveBeenCalled();
  });

  test('should attach error method to response', () => {
    responseHandler(req, res, next);
    expect(typeof res.error).toBe('function');
  });

  test('should attach paginated method to response', () => {
    responseHandler(req, res, next);
    expect(typeof res.paginated).toBe('function');
  });

  test('should call next middleware', () => {
    responseHandler(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  describe('success method', () => {
    beforeEach(() => {
      responseHandler(req, res, next);
    });

    test('should return 200 status by default', () => {
      res.success({ id: 1 }, 'Test message');
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should return custom status code', () => {
      res.success({ id: 1 }, 'Created', 201);
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('should include success flag in response', () => {
      res.success({ id: 1 }, 'Test');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('should include message in response', () => {
      res.success({ id: 1 }, 'Test message');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Test message' }));
    });

    test('should include data in response', () => {
      const data = { id: 1, name: 'Test' };
      res.success(data, 'Success');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data }));
    });

    test('should use default message if not provided', () => {
      res.success({ id: 1 });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Success' }));
    });
  });

  describe('error method', () => {
    beforeEach(() => {
      responseHandler(req, res, next);
    });

    test('should return 500 status by default', () => {
      res.error('Error message');
      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('should return custom status code', () => {
      res.error('Not found', 404);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('should include success: false in response', () => {
      res.error('Error');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test('should include error message in response', () => {
      res.error('Custom error message');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Custom error message' }));
    });

    test('should use default message if not provided', () => {
      res.error();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Error' }));
    });

    test('should include optional data in response', () => {
      const data = { details: 'error details' };
      res.error('Error', 400, data);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data }));
    });

    test('should allow null data', () => {
      res.error('Error', 500, null);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: null }));
    });
  });

  describe('paginated method', () => {
    beforeEach(() => {
      responseHandler(req, res, next);
    });

    test('should return 200 status', () => {
      const data = [{ id: 1 }];
      res.paginated(data, 100, 10, 0);
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('should include pagination info', () => {
      const data = [{ id: 1 }];
      res.paginated(data, 100, 10, 0);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: {
            total: 100,
            limit: 10,
            offset: 0,
            pages: 10,
          },
        }),
      );
    });

    test('should calculate correct page count', () => {
      const data = [{ id: 1 }];
      res.paginated(data, 55, 10, 0);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({ pages: 6 }),
        }),
      );
    });

    test('should include success flag in response', () => {
      res.paginated([], 0, 10, 0);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('should include data in response', () => {
      const data = [{ id: 1 }, { id: 2 }];
      res.paginated(data, 2, 10, 0);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data }));
    });

    test('should use custom message', () => {
      res.paginated([], 0, 10, 0, 'Custom message');
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Custom message' }));
    });

    test('should handle string limit and offset', () => {
      res.paginated([], 50, '10', '20');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: expect.objectContaining({
            limit: 10,
            offset: 20,
          }),
        }),
      );
    });
  });
});

describe('Sanitize Input Middleware', () => {
  test('should export array of middleware', () => {
    expect(Array.isArray(sanitizeInput)).toBe(true);
    expect(sanitizeInput.length).toBeGreaterThan(0);
  });

  test('should contain mongo sanitize middleware', () => {
    expect(sanitizeInput.length).toBeGreaterThanOrEqual(1);
  });

  test('should be functional middleware', () => {
    sanitizeInput.forEach(middleware => {
      expect(typeof middleware).toBe('function');
    });
  });
});

describe('Security Headers Middleware', () => {
  test('should export helmet middleware function', () => {
    expect(typeof securityHeaders).toBe('function');
  });

  test('should be defined', () => {
    expect(securityHeaders).toBeDefined();
  });
});

describe('Middleware Integration', () => {
  test('response handler with express req/res pattern', () => {
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    responseHandler(req, res, next);

    expect(res.success).toBeDefined();
    expect(res.error).toBeDefined();
    expect(res.paginated).toBeDefined();
    expect(next).toHaveBeenCalled();
  });

  test('middleware chain should work together', () => {
    const req = {};
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    const next = jest.fn();

    responseHandler(req, res, next);

    // After response handler, res has new methods
    res.success({ test: true }, 'Success', 200);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Success',
      data: { test: true },
    });
  });
});

describe('Response Handler Edge Cases', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  test('should handle null data in success', () => {
    responseHandler(req, res, next);
    res.success(null, 'No data');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: null }));
  });

  test('should handle empty object data in success', () => {
    responseHandler(req, res, next);
    res.success({}, 'Empty');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: {} }));
  });

  test('should handle array data in success', () => {
    responseHandler(req, res, next);
    const data = [1, 2, 3];
    res.success(data, 'Array');
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data }));
  });

  test('should handle large pagination offset', () => {
    responseHandler(req, res, next);
    res.paginated([], 1000, 10, 9999);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        pagination: expect.objectContaining({
          offset: 9999,
        }),
      }),
    );
  });

  test('should handle zero limit (edge case)', () => {
    responseHandler(req, res, next);
    // Should not crash, even with edge case
    res.paginated([], 100, 0, 0);
    expect(res.json).toHaveBeenCalled();
  });
});
