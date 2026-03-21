/**
 * Tests for responseHandler middleware
 * @module responseHandler.test
 *
 * Covers:
 * - res.success() — default + custom statusCode
 * - res.created() — 201 + data + requestId
 * - res.error() — default 500, custom code, data
 * - res.validationError() — array errors, single error string
 * - res.paginated() — pagination math, hasMore, pages
 * - res.noContent() — 204 + end()
 * - requestId forwarding from req.id
 * - middleware calls next()
 */

const responseHandler = require('../middleware/responseHandler');

/** Create mock req/res/next */
function createMocks(overrides = {}) {
  const jsonFn = jest.fn();
  const endFn = jest.fn();
  const statusFn = jest.fn(() => ({ json: jsonFn, end: endFn }));

  const req = { id: 'req-abc-123', ...overrides };
  const res = { status: statusFn, json: jsonFn, end: endFn, setHeader: jest.fn() };
  const next = jest.fn();

  // Attach helpers by calling middleware
  responseHandler(req, res, next);

  return { req, res, next, statusFn, jsonFn, endFn };
}

describe('responseHandler middleware', () => {
  // ─── next() call ────────────────────────────────────
  it('calls next() to continue the chain', () => {
    const { next } = createMocks();
    expect(next).toHaveBeenCalledTimes(1);
  });

  // ─── res.success ────────────────────────────────────
  describe('res.success()', () => {
    it('returns 200 with default message', () => {
      const { res, statusFn, jsonFn } = createMocks();
      res.success({ id: 1 });
      expect(statusFn).toHaveBeenCalledWith(200);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Success',
          data: { id: 1 },
          requestId: 'req-abc-123',
        })
      );
    });

    it('accepts custom message and statusCode', () => {
      const { res, statusFn, jsonFn } = createMocks();
      res.success(null, 'Done', 202);
      expect(statusFn).toHaveBeenCalledWith(202);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Done', data: null })
      );
    });

    it('omits requestId when req.id is undefined', () => {
      const { res, jsonFn } = createMocks({ id: undefined });
      res.success('data');
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ requestId: undefined }));
    });
  });

  // ─── res.created ────────────────────────────────────
  describe('res.created()', () => {
    it('returns 201 with default message', () => {
      const { res, statusFn, jsonFn } = createMocks();
      res.created({ id: 99 });
      expect(statusFn).toHaveBeenCalledWith(201);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Created successfully',
          data: { id: 99 },
        })
      );
    });

    it('accepts custom message', () => {
      const { res, jsonFn } = createMocks();
      res.created(null, 'تم الإنشاء');
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ message: 'تم الإنشاء' }));
    });
  });

  // ─── res.error ──────────────────────────────────────
  describe('res.error()', () => {
    it('returns 500 with default message', () => {
      const { res, statusFn, jsonFn } = createMocks();
      res.error();
      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({ success: false, message: 'Error', data: null })
      );
    });

    it('accepts custom statusCode and data', () => {
      const { res, statusFn, jsonFn } = createMocks();
      res.error('Not found', 404, { hint: 'check ID' });
      expect(statusFn).toHaveBeenCalledWith(404);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Not found',
          data: { hint: 'check ID' },
        })
      );
    });
  });

  // ─── res.validationError ────────────────────────────
  describe('res.validationError()', () => {
    it('returns 400 with array of errors', () => {
      const errs = ['field required', 'too short'];
      const { res, statusFn, jsonFn } = createMocks();
      res.validationError(errs);
      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
          errors: errs,
        })
      );
    });

    it('wraps single error string into array', () => {
      const { res, jsonFn } = createMocks();
      res.validationError('email invalid');
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ errors: ['email invalid'] }));
    });

    it('accepts custom message', () => {
      const { res, jsonFn } = createMocks();
      res.validationError([], 'Custom validation msg');
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Custom validation msg' })
      );
    });
  });

  // ─── res.paginated ─────────────────────────────────
  describe('res.paginated()', () => {
    it('calculates pagination correctly', () => {
      const data = [1, 2, 3];
      const { res, statusFn, jsonFn } = createMocks();
      res.paginated(data, 100, 20, 0);
      expect(statusFn).toHaveBeenCalledWith(200);
      const body = jsonFn.mock.calls[0][0];
      expect(body.success).toBe(true);
      expect(body.data).toEqual([1, 2, 3]);
      expect(body.pagination).toEqual({
        total: 100,
        limit: 20,
        offset: 0,
        pages: 5,
        hasMore: true,
      });
    });

    it('hasMore is false when offset + limit >= total', () => {
      const { res, jsonFn } = createMocks();
      res.paginated([], 50, 20, 40);
      const body = jsonFn.mock.calls[0][0];
      expect(body.pagination.hasMore).toBe(false);
    });

    it('parses string limit/offset to integers', () => {
      const { res, jsonFn } = createMocks();
      res.paginated([], 30, '10', '5');
      const body = jsonFn.mock.calls[0][0];
      expect(body.pagination.limit).toBe(10);
      expect(body.pagination.offset).toBe(5);
      expect(body.pagination.pages).toBe(3);
    });

    it('defaults to limit=20 offset=0 for invalid inputs', () => {
      const { res, jsonFn } = createMocks();
      res.paginated([], 100, 'abc', null);
      const body = jsonFn.mock.calls[0][0];
      expect(body.pagination.limit).toBe(20);
      expect(body.pagination.offset).toBe(0);
    });

    it('includes requestId', () => {
      const { res, jsonFn } = createMocks();
      res.paginated([], 0, 10, 0);
      expect(jsonFn.mock.calls[0][0].requestId).toBe('req-abc-123');
    });
  });

  // ─── res.noContent ─────────────────────────────────
  describe('res.noContent()', () => {
    it('returns 204 and calls end()', () => {
      const { res, statusFn, endFn } = createMocks();
      res.noContent();
      expect(statusFn).toHaveBeenCalledWith(204);
      expect(endFn).toHaveBeenCalled();
    });
  });
});
