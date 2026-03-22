/**
 * Tests for errorHandler.enhanced.js
 * AppError, asyncHandler, errorHandler, notFoundHandler, handlers for specific error types
 */

/* eslint-disable no-unused-vars */

jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
}));

const {
  AppError,
  asyncHandler,
  errorHandler,
  notFoundHandler,
  unhandledRejectionHandler,
  uncaughtExceptionHandler,
} = require('../middleware/errorHandler.enhanced');
const logger = require('../utils/logger');

// ─── Helpers ────────────────────────────────────────────────────────────────
const mockReq = (overrides = {}) => ({
  method: 'GET',
  url: '/api/test',
  path: '/api/test',
  id: 'req-123',
  ...overrides,
});

const mockRes = () => {
  const res = {
    statusCode: 200,
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

const mockNext = jest.fn();

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('errorHandler.enhanced', () => {
  const ORIGINAL_ENV = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
    mockNext.mockClear();
  });

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_ENV;
  });

  // ──────── AppError ────────
  describe('AppError', () => {
    it('should create error with message, statusCode, and code', () => {
      const err = new AppError('Not found', 404, 'NOT_FOUND');
      expect(err.message).toBe('Not found');
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.isOperational).toBe(true);
      expect(err).toBeInstanceOf(Error);
    });

    it('should default code to APP_ERROR', () => {
      const err = new AppError('fail', 500);
      expect(err.code).toBe('APP_ERROR');
    });

    it('should capture stack trace', () => {
      const err = new AppError('test', 400);
      expect(err.stack).toBeDefined();
    });
  });

  // ──────── asyncHandler ────────
  describe('asyncHandler', () => {
    it('should call the wrapped function', async () => {
      const fn = jest.fn().mockResolvedValue(undefined);
      const wrapped = asyncHandler(fn);
      const req = mockReq();
      const res = mockRes();

      await wrapped(req, res, mockNext);
      expect(fn).toHaveBeenCalledWith(req, res, mockNext);
    });

    it('should pass rejected promise to next()', async () => {
      const error = new Error('async fail');
      const fn = jest.fn().mockRejectedValue(error);
      const wrapped = asyncHandler(fn);

      await wrapped(mockReq(), mockRes(), mockNext);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should return a function (middleware)', () => {
      const fn = jest.fn();
      const wrapped = asyncHandler(fn);
      expect(typeof wrapped).toBe('function');
    });
  });

  // ──────── errorHandler — development ────────
  describe('errorHandler (development)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should send full error details in dev mode', () => {
      const err = new AppError('Dev error', 400, 'BAD_REQ');
      const req = mockReq();
      const res = mockRes();

      errorHandler(err, req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 400,
          code: 'BAD_REQ',
          stack: expect.any(String),
        })
      );
    });

    it('should default to 500 if no statusCode', () => {
      const err = new Error('plain error');
      const req = mockReq();
      const res = mockRes();

      errorHandler(err, req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ──────── errorHandler — production ────────
  describe('errorHandler (production)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
    });

    it('should send operational error details in prod', () => {
      const err = new AppError('Not authorized', 401, 'UNAUTHORIZED');
      const req = mockReq();
      const res = mockRes();

      errorHandler(err, req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 401,
          message: 'Not authorized',
        })
      );
    });

    it('should hide details for non-operational 500 errors', () => {
      const err = new Error('secret db failure');
      // Not operational, no statusCode set
      const req = mockReq();
      const res = mockRes();

      errorHandler(err, req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 500,
          message: 'Something went wrong',
        })
      );
    });

    it('should handle CastError (invalid ObjectId)', () => {
      const err = new Error('Cast to ObjectId failed');
      err.name = 'CastError';
      err.path = '_id';
      err.value = 'bad-id';
      const req = mockReq();
      const res = mockRes();

      errorHandler(err, req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_ID' }));
    });

    it('should handle duplicate key error (code 11000)', () => {
      const err = new Error('dup');
      err.code = 11000;
      err.keyValue = { email: 'a@b.com' };
      const req = mockReq();
      const res = mockRes();

      errorHandler(err, req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'DUPLICATE_KEY' }));
    });

    it('should handle ValidationError', () => {
      const err = new Error('validation');
      err.name = 'ValidationError';
      err.errors = {
        name: { message: 'Name required' },
        email: { message: 'Email invalid' },
      };
      const req = mockReq();
      const res = mockRes();

      errorHandler(err, req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'VALIDATION_ERROR' }));
    });

    it('should handle JsonWebTokenError', () => {
      const err = new Error('jwt malformed');
      err.name = 'JsonWebTokenError';
      const req = mockReq();
      const res = mockRes();

      errorHandler(err, req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'INVALID_TOKEN' }));
    });

    it('should handle TokenExpiredError', () => {
      const err = new Error('jwt expired');
      err.name = 'TokenExpiredError';
      const req = mockReq();
      const res = mockRes();

      errorHandler(err, req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_EXPIRED' }));
    });
  });

  // ──────── notFoundHandler ────────
  describe('notFoundHandler', () => {
    it('should return 404 with method and url', () => {
      const req = mockReq({ method: 'POST', url: '/api/unknown' });
      const res = mockRes();

      notFoundHandler(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'NOT_FOUND',
          message: 'Cannot POST /api/unknown',
        })
      );
    });
  });

  // ──────── Process handlers ────────
  describe('unhandledRejectionHandler', () => {
    it('should be a function', () => {
      expect(typeof unhandledRejectionHandler).toBe('function');
    });
  });

  describe('uncaughtExceptionHandler', () => {
    it('should be a function', () => {
      expect(typeof uncaughtExceptionHandler).toBe('function');
    });
  });
});
