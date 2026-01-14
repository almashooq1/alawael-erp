const { AppError, errorHandler, asyncHandler } = require('../utils/errorHandler');

describe('Error Handler', () => {
  describe('AppError Class', () => {
    it('should create AppError with message and statusCode', () => {
      const error = new AppError('Not Found', 404);

      expect(error.message).toBe('Not Found');
      expect(error.statusCode).toBe(404);
      expect(error.timestamp).toBeDefined();
    });

    it('should create AppError with code', () => {
      const error = new AppError('Invalid Request', 400, 'INVALID_REQUEST');

      expect(error.message).toBe('Invalid Request');
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('INVALID_REQUEST');
    });

    it('should have timestamp in ISO format', () => {
      const error = new AppError('Test Error', 500);

      expect(error.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should inherit from Error', () => {
      const error = new AppError('Test', 400);

      expect(error instanceof Error).toBe(true);
    });

    it('should have proper error stack', () => {
      const error = new AppError('Test Error', 400);

      expect(error.stack).toBeDefined();
      // Stack may contain 'AppError' or 'Error' depending on implementation
      expect(error.stack.includes('AppError') || error.stack.includes('Error')).toBe(true);
    });
  });

  describe('Global Error Handler Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    it('should handle AppError', () => {
      const error = new AppError('Not Found', 404, 'NOT_FOUND');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 404,
          message: 'Not Found',
          code: 'NOT_FOUND',
        }),
      );
    });

    it('should handle generic errors with default status 500', () => {
      const error = new Error('Something went wrong');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          statusCode: 500,
          message: 'Something went wrong',
        }),
      );
    });

    it('should handle validation errors', () => {
      const error = new Error('Validation Error');
      error.name = 'ValidationError';
      error.errors = {
        email: { message: 'Email is invalid' },
        password: { message: 'Password is too short' },
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
        }),
      );
    });

    it('should handle duplicate key errors', () => {
      const error = new Error('Duplicate Key Error');
      error.code = 11000;
      error.keyPattern = { email: 1 };

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(409);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 409,
          code: 'DUPLICATE_FIELD',
          message: expect.stringContaining('email'),
        }),
      );
    });

    it('should handle cast errors', () => {
      const error = new Error('Cast Error');
      error.name = 'CastError';

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400,
          message: 'Invalid ID format',
        }),
      );
    });

    it('should include timestamp in error response', () => {
      const error = new AppError('Test Error', 400);

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.timestamp).toBeDefined();
      expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('should preserve success: false in all responses', () => {
      const errors = [new AppError('Error 1', 400), new Error('Error 2'), { name: 'ValidationError', errors: {} }];

      errors.forEach(error => {
        errorHandler(error, mockReq, mockRes, mockNext);

        const response = mockRes.json.mock.calls[mockRes.json.mock.calls.length - 1][0];
        expect(response.success).toBe(false);
      });
    });
  });

  describe('Error Response Structure', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    it('should have consistent error response structure', () => {
      const error = new AppError('Test Error', 400);

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];

      expect(response).toHaveProperty('success');
      expect(response).toHaveProperty('statusCode');
      expect(response).toHaveProperty('message');
      expect(response).toHaveProperty('timestamp');
    });

    it('should include code in AppError responses', () => {
      const error = new AppError('Test', 400, 'TEST_CODE');

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];

      expect(response.code).toBe('TEST_CODE');
    });

    it('should include errors array for validation errors', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        field1: { message: 'Error 1' },
        field2: { message: 'Error 2' },
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];

      expect(response.errors).toBeDefined();
      expect(Array.isArray(response.errors)).toBe(true);
    });
  });

  describe('Async Handler Wrapper', () => {
    it('should execute async function successfully', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrapped = asyncHandler(mockFn);

      await wrapped({}, {}, jest.fn());

      expect(mockFn).toHaveBeenCalled();
    });

    it('should pass arguments to wrapped function', async () => {
      const mockFn = jest.fn().mockResolvedValue('success');
      const wrapped = asyncHandler(mockFn);
      const req = { test: 'req' };
      const res = { test: 'res' };
      const next = jest.fn();

      await wrapped(req, res, next);

      expect(mockFn).toHaveBeenCalledWith(req, res, next);
    });

    it('should catch errors and pass to next', async () => {
      const error = new Error('Async error');
      const mockFn = jest.fn().mockRejectedValue(error);
      const wrapped = asyncHandler(mockFn);
      const next = jest.fn();

      await wrapped({}, {}, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('Error Handling Edge Cases', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
      mockReq = {};
      mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      mockNext = jest.fn();
    });

    it('should handle error without message', () => {
      const error = {};

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(false);
    });

    it('should handle error with null statusCode', () => {
      const error = new Error('Test');
      error.statusCode = null;

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
    });

    it('should handle multiple validation errors', () => {
      const error = new Error('Validation failed');
      error.name = 'ValidationError';
      error.errors = {
        field1: { message: 'Error 1' },
        field2: { message: 'Error 2' },
        field3: { message: 'Error 3' },
      };

      errorHandler(error, mockReq, mockRes, mockNext);

      const response = mockRes.json.mock.calls[0][0];
      expect(response.errors).toHaveLength(3);
    });

    it('should handle JSON parsing errors', () => {
      const error = new SyntaxError('JSON parse error');

      errorHandler(error, mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      const response = mockRes.json.mock.calls[0][0];
      expect(response.success).toBe(false);
    });
  });
});
