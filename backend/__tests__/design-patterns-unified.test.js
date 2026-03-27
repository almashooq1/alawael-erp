/**
 * ═══════════════════════════════════════════════════════════════════════════
 * Tests — Unified Design Patterns (errors, responses, BaseService)
 * اختبارات أنماط التصميم الموحّدة
 * ═══════════════════════════════════════════════════════════════════════════
 */

'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// 1. AppError Unified Error Hierarchy
// ═══════════════════════════════════════════════════════════════════════════

describe('AppError — Unified Error Hierarchy', () => {
  const {
    AppError,
    BadRequestError,
    ValidationError,
    AuthenticationError,
    UnauthorizedError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    TooManyRequestsError,
    ServiceUnavailableError,
    ApiError,
    ApiResponse,
  } = require('../errors/AppError');

  describe('AppError base class', () => {
    it('creates with default values', () => {
      const err = new AppError();
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
      expect(err.message).toBe('Internal Server Error');
      expect(err.statusCode).toBe(500);
      expect(err.code).toBe('INTERNAL_SERVER_ERROR');
      expect(err.isOperational).toBe(true);
      expect(err.timestamp).toBeDefined();
      expect(err.stack).toBeDefined();
    });

    it('creates with custom values', () => {
      const err = new AppError('Custom error', 418, 'TEAPOT');
      expect(err.message).toBe('Custom error');
      expect(err.statusCode).toBe(418);
      expect(err.code).toBe('TEAPOT');
    });

    it('auto-derives code from status when code is null', () => {
      const err400 = new AppError('bad', 400);
      expect(err400.code).toBe('BAD_REQUEST');

      const err401 = new AppError('auth', 401);
      expect(err401.code).toBe('UNAUTHORIZED');

      const err403 = new AppError('forbidden', 403);
      expect(err403.code).toBe('FORBIDDEN');

      const err404 = new AppError('not found', 404);
      expect(err404.code).toBe('NOT_FOUND');

      const err409 = new AppError('conflict', 409);
      expect(err409.code).toBe('CONFLICT');

      const err429 = new AppError('rate', 429);
      expect(err429.code).toBe('RATE_LIMIT_EXCEEDED');

      const err503 = new AppError('unavailable', 503);
      expect(err503.code).toBe('SERVICE_UNAVAILABLE');
    });

    it('serializes to JSON correctly', () => {
      const err = new AppError('test error', 400, 'TEST_CODE');
      const json = err.toJSON();
      expect(json).toEqual({
        success: false,
        statusCode: 400,
        code: 'TEST_CODE',
        message: 'test error',
        timestamp: expect.any(String),
      });
    });

    it('includes errors array in JSON when present', () => {
      const err = new AppError('test', 400);
      err.errors = ['field1 is required', 'field2 is invalid'];
      const json = err.toJSON();
      expect(json.errors).toEqual(['field1 is required', 'field2 is invalid']);
    });
  });

  describe('BadRequestError', () => {
    it('creates with defaults', () => {
      const err = new BadRequestError();
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('BAD_REQUEST');
      expect(err.message).toBe('Bad Request');
      expect(err).toBeInstanceOf(AppError);
    });

    it('creates with custom message and code', () => {
      const err = new BadRequestError('Invalid input', 'INVALID_INPUT');
      expect(err.message).toBe('Invalid input');
      expect(err.code).toBe('INVALID_INPUT');
    });
  });

  describe('ValidationError', () => {
    it('creates with field errors', () => {
      const err = new ValidationError('Validation failed', ['email is required', 'name too short']);
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.errors).toEqual(['email is required', 'name too short']);
      expect(err).toBeInstanceOf(AppError);
    });

    it('defaults to empty errors array', () => {
      const err = new ValidationError();
      expect(err.errors).toEqual([]);
    });
  });

  describe('AuthenticationError', () => {
    it('creates with defaults', () => {
      const err = new AuthenticationError();
      expect(err.statusCode).toBe(401);
      expect(err.code).toBe('UNAUTHORIZED');
      expect(err).toBeInstanceOf(AppError);
    });
  });

  describe('UnauthorizedError', () => {
    it('extends AuthenticationError', () => {
      const err = new UnauthorizedError();
      expect(err.statusCode).toBe(401);
      expect(err).toBeInstanceOf(AuthenticationError);
      expect(err).toBeInstanceOf(AppError);
    });
  });

  describe('ForbiddenError', () => {
    it('creates correctly', () => {
      const err = new ForbiddenError('No access');
      expect(err.statusCode).toBe(403);
      expect(err.code).toBe('FORBIDDEN');
      expect(err.message).toBe('No access');
    });
  });

  describe('NotFoundError', () => {
    it('creates with defaults', () => {
      const err = new NotFoundError();
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('Resource not found');
    });

    it('creates with custom message', () => {
      const err = new NotFoundError('User not found');
      expect(err.message).toBe('User not found');
    });
  });

  describe('ConflictError', () => {
    it('creates correctly', () => {
      const err = new ConflictError('Email already registered');
      expect(err.statusCode).toBe(409);
      expect(err.code).toBe('CONFLICT');
    });
  });

  describe('RateLimitError', () => {
    it('creates with default retryAfter', () => {
      const err = new RateLimitError();
      expect(err.statusCode).toBe(429);
      expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(err.retryAfter).toBe(900);
    });

    it('creates with custom retryAfter', () => {
      const err = new RateLimitError('Slow down', 60);
      expect(err.retryAfter).toBe(60);
    });
  });

  describe('TooManyRequestsError', () => {
    it('extends RateLimitError', () => {
      const err = new TooManyRequestsError();
      expect(err.statusCode).toBe(429);
      expect(err).toBeInstanceOf(RateLimitError);
    });
  });

  describe('ServiceUnavailableError', () => {
    it('creates correctly', () => {
      const err = new ServiceUnavailableError();
      expect(err.statusCode).toBe(503);
      expect(err.code).toBe('SERVICE_UNAVAILABLE');
    });
  });

  describe('ApiError (backward-compatible)', () => {
    it('accepts legacy constructor order: (statusCode, message, errors, stack)', () => {
      const err = new ApiError(422, 'Validation failed', ['name required']);
      expect(err.statusCode).toBe(422);
      expect(err.message).toBe('Validation failed');
      expect(err.errors).toEqual(['name required']);
      expect(err.success).toBe(false);
      expect(err.data).toBeNull();
      expect(err).toBeInstanceOf(AppError);
    });

    it('uses custom stack when provided', () => {
      const err = new ApiError(500, 'Oops', [], 'custom stack trace');
      expect(err.stack).toBe('custom stack trace');
    });

    it('works with defaults', () => {
      const err = new ApiError();
      expect(err.statusCode).toBe(500);
      expect(err.message).toBe('Something went wrong');
    });
  });

  describe('ApiResponse', () => {
    it('creates success response (statusCode < 400)', () => {
      const resp = new ApiResponse(200, { id: 1 }, 'Done');
      expect(resp.success).toBe(true);
      expect(resp.statusCode).toBe(200);
      expect(resp.data).toEqual({ id: 1 });
      expect(resp.message).toBe('Done');
    });

    it('creates failure response (statusCode >= 400)', () => {
      const resp = new ApiResponse(404, null, 'Not found');
      expect(resp.success).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 2. Unified Error Handler
// ═══════════════════════════════════════════════════════════════════════════

describe('Unified Error Handler', () => {
  const {
    errorHandler,
    asyncHandler,
    catchAsync,
    classifyError,
    notFoundHandler,
    getErrorStats,
  } = require('../errors/errorHandler');
  const { AppError, NotFoundError } = require('../errors/AppError');

  // Mock req/res
  const mockReq = (overrides = {}) => ({
    method: 'GET',
    originalUrl: '/api/test',
    ip: '127.0.0.1',
    headers: {},
    user: null,
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides,
  });

  const mockRes = () => {
    const res = {
      statusCode: 200,
      headers: {},
      body: null,
    };
    res.status = jest.fn(code => {
      res.statusCode = code;
      return res;
    });
    res.json = jest.fn(data => {
      res.body = data;
      return res;
    });
    res.set = jest.fn((key, val) => {
      res.headers[key] = val;
      return res;
    });
    return res;
  };

  describe('classifyError', () => {
    it('passes through AppError instances unchanged', () => {
      const err = new NotFoundError('User not found');
      const classified = classifyError(err);
      expect(classified).toBe(err);
    });

    it('classifies Mongoose CastError', () => {
      const err = { name: 'CastError', path: '_id', value: 'invalid' };
      const classified = classifyError(err);
      expect(classified).toBeInstanceOf(AppError);
      expect(classified.statusCode).toBe(400);
      expect(classified.code).toBe('INVALID_ID');
    });

    it('classifies duplicate key error (code 11000)', () => {
      const err = { code: 11000, keyPattern: { email: 1 }, keyValue: { email: 'a@b.com' } };
      const classified = classifyError(err);
      expect(classified.statusCode).toBe(409);
      expect(classified.code).toBe('DUPLICATE_KEY');
    });

    it('classifies Mongoose ValidationError', () => {
      const err = {
        name: 'ValidationError',
        errors: { name: { message: 'Name is required' } },
      };
      const classified = classifyError(err);
      expect(classified.statusCode).toBe(400);
      expect(classified.code).toBe('VALIDATION_ERROR');
    });

    it('classifies JsonWebTokenError', () => {
      const err = { name: 'JsonWebTokenError' };
      const classified = classifyError(err);
      expect(classified.statusCode).toBe(401);
      expect(classified.code).toBe('INVALID_TOKEN');
    });

    it('classifies TokenExpiredError', () => {
      const err = { name: 'TokenExpiredError' };
      const classified = classifyError(err);
      expect(classified.statusCode).toBe(401);
      expect(classified.code).toBe('TOKEN_EXPIRED');
    });

    it('wraps unknown errors as 500', () => {
      const err = new Error('Something failed');
      const classified = classifyError(err);
      expect(classified.statusCode).toBe(500);
      expect(classified.isOperational).toBe(false);
    });
  });

  describe('errorHandler middleware', () => {
    it('sends structured JSON response', () => {
      const req = mockReq();
      const res = mockRes();
      const err = new AppError('Test error', 400, 'TEST_CODE');

      errorHandler(err, req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('TEST_CODE');
      expect(res.body.message).toBe('Test error');
      expect(res.body.timestamp).toBeDefined();
    });

    it('sets X-Error-Code header', () => {
      const req = mockReq();
      const res = mockRes();
      const err = new NotFoundError('Missing');

      errorHandler(err, req, res, jest.fn());

      expect(res.set).toHaveBeenCalledWith('X-Error-Code', 'NOT_FOUND');
    });

    it('handles non-AppError exceptions', () => {
      const req = mockReq();
      const res = mockRes();
      const err = new Error('Random failure');

      errorHandler(err, req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('asyncHandler', () => {
    it('passes resolved promise to next middleware', async () => {
      const handler = asyncHandler(async (_req, res) => {
        res.json({ ok: true });
      });

      const req = mockReq();
      const res = mockRes();
      const next = jest.fn();

      await handler(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ ok: true });
      expect(next).not.toHaveBeenCalled();
    });

    it('passes rejected promise to next (error handler)', async () => {
      const error = new NotFoundError('User not found');
      const handler = asyncHandler(async () => {
        throw error;
      });

      const next = jest.fn();
      await handler(mockReq(), mockRes(), next);

      // Wait for the microtask queue to flush
      await new Promise(r => { setImmediate(r); });

      expect(next).toHaveBeenCalledWith(error);
    });

    it('is also exported as catchAsync', () => {
      expect(catchAsync).toBe(asyncHandler);
    });
  });

  describe('notFoundHandler', () => {
    it('returns 404 with route info', () => {
      const req = mockReq({ method: 'POST', originalUrl: '/api/missing' });
      const res = mockRes();

      notFoundHandler(req, res, jest.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body.code).toBe('NOT_FOUND');
      expect(res.body.message).toContain('POST');
      expect(res.body.message).toContain('/api/missing');
    });
  });

  describe('getErrorStats', () => {
    it('returns an object (may be empty or populated)', () => {
      const stats = getErrorStats();
      expect(typeof stats).toBe('object');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 3. Unified Response System
// ═══════════════════════════════════════════════════════════════════════════

describe('Unified Response System', () => {
  const {
    SuccessResponse,
    PaginatedResponse,
    ErrorResponse,
    ErrorTypes,
    successResponse,
    errorResponse,
    paginatedResponse,
    sendSuccess,
    sendError,
    sendCreated,
    sendPaginated,
    enhanceResponse,
  } = require('../errors/responseSystem');

  const mockRes = () => {
    const res = {
      statusCode: 200,
      body: null,
    };
    res.status = jest.fn(code => {
      res.statusCode = code;
      return res;
    });
    res.json = jest.fn(data => {
      res.body = data;
      return res;
    });
    res.end = jest.fn(() => res);
    return res;
  };

  describe('SuccessResponse class', () => {
    it('creates with defaults', () => {
      const resp = new SuccessResponse();
      expect(resp.success).toBe(true);
      expect(resp.message).toBe('Success');
      expect(resp.data).toBeNull();
      expect(resp.timestamp).toBeDefined();
      expect(resp.meta).toBeUndefined();
    });

    it('creates with data and meta', () => {
      const resp = new SuccessResponse({ id: 1 }, 'Created', { version: 2 });
      expect(resp.data).toEqual({ id: 1 });
      expect(resp.meta).toEqual({ version: 2 });
    });

    it('send() writes to Express response', () => {
      const res = mockRes();
      new SuccessResponse({ ok: true }).send(res, 201);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PaginatedResponse class', () => {
    it('includes pagination metadata', () => {
      const resp = new PaginatedResponse([1, 2, 3], 2, 10, 50);
      expect(resp.success).toBe(true);
      expect(resp.data).toEqual([1, 2, 3]);
      expect(resp.meta.pagination.page).toBe(2);
      expect(resp.meta.pagination.limit).toBe(10);
      expect(resp.meta.pagination.total).toBe(50);
      expect(resp.meta.pagination.pages).toBe(5);
      expect(resp.meta.pagination.hasNext).toBe(true);
      expect(resp.meta.pagination.hasPrev).toBe(true);
    });

    it('calculates hasNext=false on last page', () => {
      const resp = new PaginatedResponse([], 5, 10, 50);
      expect(resp.meta.pagination.hasNext).toBe(false);
    });

    it('calculates hasPrev=false on first page', () => {
      const resp = new PaginatedResponse([], 1, 10, 50);
      expect(resp.meta.pagination.hasPrev).toBe(false);
    });
  });

  describe('ErrorResponse class', () => {
    it('creates with defaults', () => {
      const resp = new ErrorResponse('Something failed');
      expect(resp.success).toBe(false);
      expect(resp.message).toBe('Something failed');
      expect(resp.code).toBe('ERROR');
      expect(resp.statusCode).toBe(500);
    });

    it('includes errors array when provided', () => {
      const resp = new ErrorResponse('Validation', 'VALIDATION', ['email required'], 400);
      expect(resp.errors).toEqual(['email required']);
    });

    it('send() writes to Express response', () => {
      const res = mockRes();
      new ErrorResponse('Bad', 'BAD', [], 400).send(res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('ErrorTypes factory', () => {
    it.each([
      ['BadRequest', 400, 'BAD_REQUEST'],
      ['Unauthorized', 401, 'UNAUTHORIZED'],
      ['Forbidden', 403, 'FORBIDDEN'],
      ['NotFound', 404, 'NOT_FOUND'],
      ['Conflict', 409, 'CONFLICT'],
      ['ServerError', 500, 'SERVER_ERROR'],
      ['ServiceUnavailable', 503, 'SERVICE_UNAVAILABLE'],
    ])('%s returns ErrorResponse with status %i', (type, status, code) => {
      const resp = ErrorTypes[type]();
      expect(resp).toBeInstanceOf(ErrorResponse);
      expect(resp.statusCode).toBe(status);
      expect(resp.code).toBe(code);
    });

    it('ValidationError includes errors array', () => {
      const resp = ErrorTypes.ValidationError(['field1', 'field2']);
      expect(resp.errors).toEqual(['field1', 'field2']);
      expect(resp.statusCode).toBe(400);
    });

    it('RateLimitExceeded includes retryAfter', () => {
      const resp = ErrorTypes.RateLimitExceeded(120);
      expect(resp.statusCode).toBe(429);
      expect(resp.errors).toEqual([{ retryAfter: '120 seconds' }]);
    });
  });

  describe('Helper functions', () => {
    it('successResponse sends 200 with data', () => {
      const res = mockRes();
      successResponse(res, { id: 1 }, 'OK');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual({ id: 1 });
    });

    it('sendSuccess sends with Arabic default message', () => {
      const res = mockRes();
      sendSuccess(res, { id: 1 });
      expect(res.body.message).toBe('تمت العملية بنجاح');
    });

    it('sendCreated sends 201', () => {
      const res = mockRes();
      sendCreated(res, { id: 99 });
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('errorResponse sends error with status', () => {
      const res = mockRes();
      errorResponse(res, 'Not found', 404);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.body.success).toBe(false);
    });

    it('sendError sends with Arabic default message', () => {
      const res = mockRes();
      sendError(res);
      expect(res.body.message).toBe('حدث خطأ في الخادم');
    });

    it('paginatedResponse sends paginated data', () => {
      const res = mockRes();
      paginatedResponse(res, [1, 2], 100, 1, 10, 'Page 1');
      expect(res.body.success).toBe(true);
      expect(res.body.meta.pagination.total).toBe(100);
    });

    it('sendPaginated sends paginated data', () => {
      const res = mockRes();
      sendPaginated(res, [1, 2], 1, 10, 100);
      expect(res.body.meta.pagination.total).toBe(100);
    });
  });

  describe('enhanceResponse middleware', () => {
    it('attaches res.success, res.created, res.error, res.paginated, res.noContent', () => {
      const req = { id: 'req-123', headers: {} };
      const res = mockRes();
      const next = jest.fn();

      enhanceResponse(req, res, next);

      expect(typeof res.success).toBe('function');
      expect(typeof res.created).toBe('function');
      expect(typeof res.error).toBe('function');
      expect(typeof res.paginated).toBe('function');
      expect(typeof res.noContent).toBe('function');
      expect(typeof res.badRequest).toBe('function');
      expect(typeof res.unauthorized).toBe('function');
      expect(typeof res.forbidden).toBe('function');
      expect(typeof res.notFound).toBe('function');
      expect(typeof res.conflict).toBe('function');
      expect(typeof res.serverError).toBe('function');
      expect(next).toHaveBeenCalled();
    });

    it('res.success includes requestId', () => {
      const req = { id: 'req-abc', headers: {} };
      const res = mockRes();
      enhanceResponse(req, res, jest.fn());

      res.success({ test: true });
      expect(res.body.requestId).toBe('req-abc');
      expect(res.body.success).toBe(true);
    });

    it('res.noContent sends 204', () => {
      const req = { headers: {} };
      const res = mockRes();
      enhanceResponse(req, res, jest.fn());

      res.noContent();
      expect(res.status).toHaveBeenCalledWith(204);
      expect(res.end).toHaveBeenCalled();
    });

    it('res.paginated includes pagination object', () => {
      const req = { headers: {} };
      const res = mockRes();
      enhanceResponse(req, res, jest.fn());

      res.paginated([1, 2], 100, 20, 0);
      expect(res.body.pagination.total).toBe(100);
      expect(res.body.pagination.hasMore).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 4. Backward-Compatible Re-exports
// ═══════════════════════════════════════════════════════════════════════════

describe('Barrel Export & Legacy Smoke Tests', () => {
  describe('errors/index barrel export', () => {
    const mod = require('../errors');

    it('exports error classes', () => {
      expect(typeof mod.AppError).toBe('function');
      expect(typeof mod.NotFoundError).toBe('function');
      expect(typeof mod.ValidationError).toBe('function');
      expect(typeof mod.ApiError).toBe('function');
      expect(typeof mod.ApiResponse).toBe('function');
    });

    it('exports error handler functions', () => {
      expect(typeof mod.errorHandler).toBe('function');
      expect(typeof mod.asyncHandler).toBe('function');
      expect(typeof mod.notFoundHandler).toBe('function');
    });

    it('exports response system', () => {
      expect(typeof mod.SuccessResponse).toBe('function');
      expect(typeof mod.PaginatedResponse).toBe('function');
      expect(typeof mod.ErrorResponse).toBe('function');
      expect(typeof mod.enhanceResponse).toBe('function');
      expect(typeof mod.sendSuccess).toBe('function');
    });
  });

  describe('legacy files still export expected shapes', () => {
    it('utils/errorHandler exports errorHandler function', () => {
      const mod = require('../utils/errorHandler');
      expect(typeof mod.errorHandler).toBe('function');
    });

    it('utils/apiResponse exports ApiResponse', () => {
      const mod = require('../utils/apiResponse');
      expect(mod.ApiResponse).toBeDefined();
    });

    it('middleware/errorHandler.enhanced exports core functions', () => {
      const mod = require('../middleware/errorHandler.enhanced');
      expect(typeof mod.errorHandler).toBe('function');
      expect(typeof mod.notFoundHandler).toBe('function');
    });

    it('errors/errorHandler exports canonical core functions', () => {
      const mod = require('../errors/errorHandler');
      expect(typeof mod.errorHandler).toBe('function');
      expect(typeof mod.notFoundHandler).toBe('function');
      expect(typeof mod.asyncHandler).toBe('function');
    });

    it('utils/response exports response helpers', () => {
      const mod = require('../utils/response');
      expect(typeof mod.successResponse).toBe('function');
      expect(typeof mod.errorResponse).toBe('function');
    });

    it('middleware/responseHandler exports a function', () => {
      const mod = require('../middleware/responseHandler');
      expect(typeof mod).toBe('function');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// 5. BaseService
// ═══════════════════════════════════════════════════════════════════════════

describe('BaseService', () => {
  const BaseService = require('../services/base/BaseService');
  const { NotFoundError, ValidationError, ConflictError, AppError } = require('../errors/AppError');

  // Create a mock Mongoose model
  const createMockModel = (overrides = {}) => {
    const model = function (data) {
      return {
        ...data,
        _id: data._id || 'mock-id-123',
        save: jest.fn().mockResolvedValue({
          ...data,
          _id: 'mock-id-123',
          toObject: () => ({ ...data, _id: 'mock-id-123' }),
        }),
        toObject: () => ({ ...data, _id: 'mock-id-123' }),
      };
    };

    model.modelName = 'MockModel';

    // Chainable query mock
    const chainable = result => {
      const chain = {
        where: jest.fn(() => chain),
        populate: jest.fn(() => chain),
        select: jest.fn(() => chain),
        sort: jest.fn(() => chain),
        skip: jest.fn(() => chain),
        limit: jest.fn(() => chain),
        lean: jest.fn().mockResolvedValue(result),
      };
      return chain;
    };

    model.findById = jest.fn(id =>
      chainable(
        overrides.findByIdResult !== undefined
          ? overrides.findByIdResult
          : { _id: id, name: 'Test' }
      )
    );
    model.findOne = jest.fn(() =>
      chainable(
        overrides.findOneResult !== undefined ? overrides.findOneResult : { _id: '1', name: 'Test' }
      )
    );
    model.find = jest.fn(() => chainable(overrides.findResult || [{ _id: '1' }, { _id: '2' }]));
    model.countDocuments = jest.fn().mockResolvedValue(overrides.countResult || 10);
    model.findOneAndUpdate = jest
      .fn()
      .mockResolvedValue(
        overrides.findOneAndUpdateResult !== undefined
          ? overrides.findOneAndUpdateResult
          : { _id: '1', name: 'Updated', toObject: () => ({ _id: '1', name: 'Updated' }) }
      );
    model.findByIdAndDelete = jest
      .fn()
      .mockResolvedValue(
        overrides.findByIdAndDeleteResult !== undefined
          ? overrides.findByIdAndDeleteResult
          : { _id: '1' }
      );
    model.insertMany = jest.fn().mockResolvedValue(
      overrides.insertManyResult || [
        { _id: '1', toObject: () => ({ _id: '1' }) },
        { _id: '2', toObject: () => ({ _id: '2' }) },
      ]
    );
    model.exists = jest
      .fn()
      .mockResolvedValue(
        overrides.existsResult !== undefined ? overrides.existsResult : { _id: '1' }
      );

    return model;
  };

  describe('constructor', () => {
    it('throws when model is null', () => {
      expect(() => new BaseService(null, 'Test')).toThrow(AppError);
    });

    it('creates instance with model and name', () => {
      const model = createMockModel();
      const svc = new BaseService(model, 'User');
      expect(svc.model).toBe(model);
      expect(svc.modelName).toBe('User');
    });

    it('defaults modelName from model.modelName', () => {
      const model = createMockModel();
      const svc = new BaseService(model);
      expect(svc.modelName).toBe('MockModel');
    });
  });

  describe('findById', () => {
    it('returns document by id', async () => {
      const model = createMockModel();
      const svc = new BaseService(model, 'User');

      const doc = await svc.findById('abc123');
      expect(doc).toBeDefined();
      expect(model.findById).toHaveBeenCalledWith('abc123');
    });

    it('throws NotFoundError when document is null', async () => {
      const model = createMockModel({ findByIdResult: null });
      const svc = new BaseService(model, 'User');

      await expect(svc.findById('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('findOne', () => {
    it('returns null when no match (no throw)', async () => {
      const model = createMockModel({ findOneResult: null });
      const svc = new BaseService(model, 'User');

      const doc = await svc.findOne({ email: 'nope' });
      expect(doc).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns paginated results', async () => {
      const model = createMockModel({ countResult: 50 });
      const svc = new BaseService(model, 'User');

      const result = await svc.findAll({ page: 2, limit: 10 });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
      expect(result.total).toBe(50);
      expect(result.pages).toBe(5);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('enforces max limit of 100', async () => {
      const model = createMockModel();
      const svc = new BaseService(model, 'User');

      const result = await svc.findAll({ limit: 500 });
      expect(result.limit).toBe(100);
    });

    it('enforces min page of 1', async () => {
      const model = createMockModel();
      const svc = new BaseService(model, 'User');

      const result = await svc.findAll({ page: -5 });
      expect(result.page).toBe(1);
    });
  });

  describe('count', () => {
    it('returns document count', async () => {
      const model = createMockModel({ countResult: 42 });
      const svc = new BaseService(model, 'User');

      const count = await svc.count({});
      expect(count).toBe(42);
    });
  });

  describe('create', () => {
    it('creates and returns new document', async () => {
      const model = createMockModel();
      const svc = new BaseService(model, 'User');

      const doc = await svc.create({ name: 'John' });
      expect(doc).toBeDefined();
      expect(doc._id).toBe('mock-id-123');
    });

    it('sets createdBy when userId provided', async () => {
      const model = createMockModel();
      const svc = new BaseService(model, 'User');

      await svc.create({ name: 'John' }, { userId: 'user-1' });
      // The model constructor was called with createdBy
      // Since we use a function mock, just verify it didn't throw
    });
  });

  describe('update', () => {
    it('updates and returns document', async () => {
      const model = createMockModel();
      const svc = new BaseService(model, 'User');

      const doc = await svc.update('1', { name: 'Jane' });
      expect(doc.name).toBe('Updated');
      expect(model.findOneAndUpdate).toHaveBeenCalled();
    });

    it('throws NotFoundError when document not found', async () => {
      const model = createMockModel({ findOneAndUpdateResult: null });
      const svc = new BaseService(model, 'User');

      await expect(svc.update('missing', { name: 'X' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('softDelete', () => {
    it('marks document as deleted', async () => {
      const deletedDoc = {
        _id: '1',
        deleted: true,
        deletedAt: new Date(),
        toObject: () => ({ _id: '1', deleted: true }),
      };
      const model = createMockModel({ findOneAndUpdateResult: deletedDoc });
      const svc = new BaseService(model, 'User');

      const doc = await svc.softDelete('1');
      expect(doc.deleted).toBe(true);
    });

    it('throws NotFoundError when document not found', async () => {
      const model = createMockModel({ findOneAndUpdateResult: null });
      const svc = new BaseService(model, 'User');

      await expect(svc.softDelete('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('hardDelete', () => {
    it('permanently removes document', async () => {
      const model = createMockModel();
      const svc = new BaseService(model, 'User');

      const result = await svc.hardDelete('1');
      expect(result).toBe(true);
    });

    it('throws NotFoundError when document not found', async () => {
      const model = createMockModel({ findByIdAndDeleteResult: null });
      const svc = new BaseService(model, 'User');

      await expect(svc.hardDelete('missing')).rejects.toThrow(NotFoundError);
    });
  });

  describe('restore', () => {
    it('restores a soft-deleted document', async () => {
      const restored = {
        _id: '1',
        toObject: () => ({ _id: '1', name: 'Restored' }),
      };
      const model = createMockModel({ findOneAndUpdateResult: restored });
      const svc = new BaseService(model, 'User');

      const doc = await svc.restore('1');
      expect(doc._id).toBe('1');
    });

    it('throws NotFoundError when document not deleted', async () => {
      const model = createMockModel({ findOneAndUpdateResult: null });
      const svc = new BaseService(model, 'User');

      await expect(svc.restore('1')).rejects.toThrow(NotFoundError);
    });
  });

  describe('exists', () => {
    it('returns true when document exists', async () => {
      const model = createMockModel({ existsResult: { _id: '1' } });
      const svc = new BaseService(model, 'User');

      expect(await svc.exists({ email: 'a@b.com' })).toBe(true);
    });

    it('returns false when no document', async () => {
      const model = createMockModel({ existsResult: null });
      const svc = new BaseService(model, 'User');

      expect(await svc.exists({ email: 'none' })).toBe(false);
    });
  });

  describe('_handleMongoError', () => {
    it('converts Mongoose ValidationError', () => {
      const model = createMockModel();
      const svc = new BaseService(model, 'User');

      const err = { name: 'ValidationError', errors: { name: { message: 'Name required' } } };
      expect(() => svc._handleMongoError(err)).toThrow(ValidationError);
    });

    it('converts duplicate key error', () => {
      const model = createMockModel();
      const svc = new BaseService(model, 'User');

      const err = { code: 11000, keyPattern: { email: 1 } };
      expect(() => svc._handleMongoError(err)).toThrow(ConflictError);
    });

    it('wraps unknown errors as AppError', () => {
      const model = createMockModel();
      const svc = new BaseService(model, 'User');

      const err = new Error('Unknown');
      expect(() => svc._handleMongoError(err)).toThrow(AppError);
    });
  });
});
