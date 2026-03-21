/**
 * responseFormatter.test.js — Tests for the standardized API response framework.
 * اختبارات تنسيق الاستجابات الموحّد
 */
const {
  SuccessResponse,
  PaginatedResponse,
  ErrorResponse,
  ErrorTypes,
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendError,
  enhanceResponse,
} = require('../utils/responseFormatter');

/** Helper: create a mock Express res object */
const mockRes = () => {
  const res = {};
  res.json = jest.fn().mockReturnValue(res);
  res.status = jest.fn().mockReturnValue(res);
  return res;
};

/* ====================================================================
 * SuccessResponse
 * ==================================================================== */
describe('SuccessResponse', () => {
  test('creates a success response with defaults', () => {
    const sr = new SuccessResponse();
    expect(sr.success).toBe(true);
    expect(sr.message).toBe('Success');
    expect(sr.data).toBeNull();
    expect(sr.timestamp).toBeDefined();
    expect(sr.meta).toBeUndefined(); // no meta when empty
  });

  test('stores custom data and message', () => {
    const sr = new SuccessResponse({ id: 1 }, 'Created');
    expect(sr.data).toEqual({ id: 1 });
    expect(sr.message).toBe('Created');
  });

  test('includes meta when provided', () => {
    const sr = new SuccessResponse(null, 'OK', { extra: true });
    expect(sr.meta).toEqual({ extra: true });
  });

  test('.send() sends correct status + json', () => {
    const res = mockRes();
    new SuccessResponse({ ok: 1 }).send(res, 201);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { ok: 1 } })
    );
  });

  test('.send() defaults to 200', () => {
    const res = mockRes();
    new SuccessResponse().send(res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

/* ====================================================================
 * PaginatedResponse
 * ==================================================================== */
describe('PaginatedResponse', () => {
  test('calculates pagination metadata', () => {
    const pr = new PaginatedResponse([1, 2, 3], 2, 10, 45);
    expect(pr.meta.pagination).toEqual({
      page: 2,
      limit: 10,
      total: 45,
      pages: 5,
      hasNext: true,
      hasPrev: true,
    });
  });

  test('hasNext is false on last page', () => {
    const pr = new PaginatedResponse([], 5, 10, 50);
    expect(pr.meta.pagination.hasNext).toBe(false);
  });

  test('hasPrev is false on first page', () => {
    const pr = new PaginatedResponse([], 1, 10, 50);
    expect(pr.meta.pagination.hasPrev).toBe(false);
  });

  test('pages rounds up (7 items, limit 3 → 3 pages)', () => {
    const pr = new PaginatedResponse([], 1, 3, 7);
    expect(pr.meta.pagination.pages).toBe(3);
  });

  test('inherits SuccessResponse shape', () => {
    const pr = new PaginatedResponse([], 1, 10, 0, 'Custom');
    expect(pr.success).toBe(true);
    expect(pr.message).toBe('Custom');
    expect(pr.timestamp).toBeDefined();
  });
});

/* ====================================================================
 * ErrorResponse
 * ==================================================================== */
describe('ErrorResponse', () => {
  test('creates an error response with defaults', () => {
    const er = new ErrorResponse('Something failed');
    expect(er.success).toBe(false);
    expect(er.error).toBe('Something failed');
    expect(er.code).toBe('ERROR');
    expect(er.statusCode).toBe(500);
    expect(er.errors).toBeUndefined(); // empty array → not included
    expect(er.timestamp).toBeDefined();
  });

  test('includes errors array when non-empty', () => {
    const er = new ErrorResponse('fail', 'VALIDATION', ['field required']);
    expect(er.errors).toEqual(['field required']);
  });

  test('.send() sends correct statusCode + json', () => {
    const res = mockRes();
    new ErrorResponse('Not found', 'NOT_FOUND', [], 404).send(res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'Not found' })
    );
  });
});

/* ====================================================================
 * ErrorTypes factory
 * ==================================================================== */
describe('ErrorTypes', () => {
  const cases = [
    ['BadRequest', 400, 'BAD_REQUEST'],
    ['Unauthorized', 401, 'UNAUTHORIZED'],
    ['Forbidden', 403, 'FORBIDDEN'],
    ['NotFound', 404, 'NOT_FOUND'],
    ['Conflict', 409, 'CONFLICT'],
    ['ServerError', 500, 'SERVER_ERROR'],
    ['ServiceUnavailable', 503, 'SERVICE_UNAVAILABLE'],
  ];

  test.each(cases)(
    '%s returns statusCode %i and code %s',
    (factory, expectedStatus, expectedCode) => {
      const err = ErrorTypes[factory]();
      expect(err).toBeInstanceOf(ErrorResponse);
      expect(err.statusCode).toBe(expectedStatus);
      expect(err.code).toBe(expectedCode);
      expect(err.success).toBe(false);
    }
  );

  test('BadRequest accepts custom message and errors', () => {
    const err = ErrorTypes.BadRequest('Missing field', ['name is required']);
    expect(err.error).toBe('Missing field');
    expect(err.errors).toEqual(['name is required']);
  });

  test('ValidationError has code VALIDATION_ERROR and status 400', () => {
    const err = ErrorTypes.ValidationError([{ msg: 'invalid' }]);
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.errors).toEqual([{ msg: 'invalid' }]);
  });

  test('RateLimitExceeded defaults to 429 with retryAfter', () => {
    const err = ErrorTypes.RateLimitExceeded(60);
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(err.errors).toEqual([{ retryAfter: '60 seconds' }]);
  });
});

/* ====================================================================
 * Helper functions: sendSuccess, sendCreated, sendPaginated, sendError
 * ==================================================================== */
describe('sendSuccess', () => {
  test('sends 200 with data', () => {
    const res = mockRes();
    sendSuccess(res, { id: 1 }, 'OK');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { id: 1 } })
    );
  });

  test('supports custom statusCode', () => {
    const res = mockRes();
    sendSuccess(res, null, 'OK', {}, 204);
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('sendCreated', () => {
  test('sends 201 with data', () => {
    const res = mockRes();
    sendCreated(res, { id: 2 });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: { id: 2 } })
    );
  });
});

describe('sendPaginated', () => {
  test('sends paginated response', () => {
    const res = mockRes();
    sendPaginated(res, [1, 2], 1, 10, 50);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: [1, 2],
        meta: expect.objectContaining({
          pagination: expect.objectContaining({ page: 1, total: 50 }),
        }),
      })
    );
  });
});

describe('sendError', () => {
  test('sends error with status 500 default', () => {
    const res = mockRes();
    sendError(res, 'bad');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: 'bad' })
    );
  });

  test('sends error with custom status', () => {
    const res = mockRes();
    sendError(res, 'nope', 'NOPE', [], 422);
    expect(res.status).toHaveBeenCalledWith(422);
  });
});

/* ====================================================================
 * enhanceResponse middleware
 * ==================================================================== */
describe('enhanceResponse middleware', () => {
  test('attaches helper methods to res', () => {
    const res = mockRes();
    const next = jest.fn();
    enhanceResponse({}, res, next);

    expect(typeof res.success).toBe('function');
    expect(typeof res.created).toBe('function');
    expect(typeof res.paginated).toBe('function');
    expect(typeof res.badRequest).toBe('function');
    expect(typeof res.unauthorized).toBe('function');
    expect(typeof res.forbidden).toBe('function');
    expect(typeof res.notFound).toBe('function');
    expect(typeof res.conflict).toBe('function');
    expect(typeof res.validationError).toBe('function');
    expect(typeof res.serverError).toBe('function');
    expect(next).toHaveBeenCalled();
  });

  test('res.success() sends 200', () => {
    const res = mockRes();
    enhanceResponse({}, res, jest.fn());
    res.success({ a: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  test('res.created() sends 201', () => {
    const res = mockRes();
    enhanceResponse({}, res, jest.fn());
    res.created({ a: 1 });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('res.notFound() sends 404', () => {
    const res = mockRes();
    enhanceResponse({}, res, jest.fn());
    res.notFound();
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('res.badRequest() sends 400', () => {
    const res = mockRes();
    enhanceResponse({}, res, jest.fn());
    res.badRequest('invalid input');
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('res.unauthorized() sends 401', () => {
    const res = mockRes();
    enhanceResponse({}, res, jest.fn());
    res.unauthorized();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('res.serverError() sends 500', () => {
    const res = mockRes();
    enhanceResponse({}, res, jest.fn());
    res.serverError();
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
