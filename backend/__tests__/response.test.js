/**
 * Tests for utils/response.js
 *
 * Covers:
 *  - successResponse: status, shape, custom message & code
 *  - errorResponse: shape, optional errors field, defaults
 *  - paginatedResponse: pagination math, parseInt parsing
 */

const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

// ── Mock res ─────────────────────────────────────────────────────────────────
const createRes = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
};

// ═════════════════════════════════════════════════════════════════════════════
// successResponse
// ═════════════════════════════════════════════════════════════════════════════

describe('successResponse', () => {
  test('returns 200 with success envelope by default', () => {
    const res = createRes();
    successResponse(res, { id: 1 });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Success',
      data: { id: 1 },
    });
  });

  test('accepts custom message', () => {
    const res = createRes();
    successResponse(res, null, 'Created successfully');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Created successfully' })
    );
  });

  test('accepts custom status code', () => {
    const res = createRes();
    successResponse(res, {}, 'Done', 201);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  test('data can be an array', () => {
    const res = createRes();
    successResponse(res, [1, 2, 3]);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ data: [1, 2, 3] })
    );
  });

  test('data can be null', () => {
    const res = createRes();
    successResponse(res, null);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: null })
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// errorResponse
// ═════════════════════════════════════════════════════════════════════════════

describe('errorResponse', () => {
  test('returns 500 with error envelope by default', () => {
    const res = createRes();
    errorResponse(res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Error',
    });
  });

  test('accepts custom message and code', () => {
    const res = createRes();
    errorResponse(res, 'Not Found', 404);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, message: 'Not Found' })
    );
  });

  test('includes errors field when provided', () => {
    const res = createRes();
    const errors = [{ field: 'email', msg: 'required' }];
    errorResponse(res, 'Validation', 422, errors);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ errors })
    );
  });

  test('omits errors field when null', () => {
    const res = createRes();
    errorResponse(res, 'Fail', 400, null);
    const body = res.json.mock.calls[0][0];
    expect(body).not.toHaveProperty('errors');
  });

  test('omits errors field when not provided', () => {
    const res = createRes();
    errorResponse(res, 'Fail', 400);
    const body = res.json.mock.calls[0][0];
    expect(body).not.toHaveProperty('errors');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// paginatedResponse
// ═════════════════════════════════════════════════════════════════════════════

describe('paginatedResponse', () => {
  test('returns paginated envelope with correct math', () => {
    const res = createRes();
    paginatedResponse(res, [1, 2], 50, 1, 10);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Success',
      data: [1, 2],
      pagination: {
        total: 50,
        page: 1,
        limit: 10,
        pages: 5, // ceil(50/10)
      },
    });
  });

  test('pages rounds up (7 items, limit 3 → 3 pages)', () => {
    const res = createRes();
    paginatedResponse(res, [], 7, 1, 3);
    const body = res.json.mock.calls[0][0];
    expect(body.pagination.pages).toBe(3); // ceil(7/3)
  });

  test('page and limit are parsed as integers', () => {
    const res = createRes();
    paginatedResponse(res, [], 100, '2', '25');
    const body = res.json.mock.calls[0][0];
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.limit).toBe(25);
  });

  test('custom message is included', () => {
    const res = createRes();
    paginatedResponse(res, [], 0, 1, 10, 'No results');
    const body = res.json.mock.calls[0][0];
    expect(body.message).toBe('No results');
  });

  test('zero total yields 0 pages', () => {
    const res = createRes();
    paginatedResponse(res, [], 0, 1, 10);
    const body = res.json.mock.calls[0][0];
    expect(body.pagination.pages).toBe(0);
  });

  test('single item, limit 1 → 1 page', () => {
    const res = createRes();
    paginatedResponse(res, [{ id: 1 }], 1, 1, 1);
    const body = res.json.mock.calls[0][0];
    expect(body.pagination.pages).toBe(1);
    expect(body.pagination.total).toBe(1);
  });
});
