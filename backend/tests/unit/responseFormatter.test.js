/**
 * Unit Tests — responseFormatter.js
 * Pure singleton — NO mocks needed (logger only used in serverError)
 */
'use strict';

jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

const formatter = require('../../services/responseFormatter');

// ═══════════════════════════════════════
//  statusCodes
// ═══════════════════════════════════════
describe('statusCodes', () => {
  it('has all standard codes', () => {
    expect(formatter.statusCodes.OK).toBe(200);
    expect(formatter.statusCodes.CREATED).toBe(201);
    expect(formatter.statusCodes.BAD_REQUEST).toBe(400);
    expect(formatter.statusCodes.NOT_FOUND).toBe(404);
    expect(formatter.statusCodes.INTERNAL_ERROR).toBe(500);
    expect(formatter.statusCodes.SERVICE_UNAVAILABLE).toBe(503);
  });
});

// ═══════════════════════════════════════
//  success
// ═══════════════════════════════════════
describe('success', () => {
  it('returns success structure', () => {
    const r = formatter.success({ id: 1 });
    expect(r.success).toBe(true);
    expect(r.statusCode).toBe(200);
    expect(r.message).toBe('Success');
    expect(r.data).toEqual({ id: 1 });
    expect(r.timestamp).toBeTruthy();
  });

  it('custom message and code', () => {
    const r = formatter.success(null, 'Created', 201);
    expect(r.statusCode).toBe(201);
    expect(r.message).toBe('Created');
  });
});

// ═══════════════════════════════════════
//  error
// ═══════════════════════════════════════
describe('error', () => {
  it('returns error structure', () => {
    const r = formatter.error('Bad input', 'INVALID', 400, { field: 'name' });
    expect(r.success).toBe(false);
    expect(r.statusCode).toBe(400);
    expect(r.message).toBe('Bad input');
    expect(r.errorCode).toBe('INVALID');
    expect(r.details).toEqual({ field: 'name' });
    expect(r.timestamp).toBeTruthy();
  });

  it('defaults', () => {
    const r = formatter.error('msg');
    expect(r.statusCode).toBe(400);
    expect(r.errorCode).toBeNull();
    expect(r.details).toBeNull();
  });
});

// ═══════════════════════════════════════
//  paginated
// ═══════════════════════════════════════
describe('paginated', () => {
  it('returns pagination metadata', () => {
    const r = formatter.paginated([1, 2, 3], 50, 1, 20);
    expect(r.success).toBe(true);
    expect(r.data.items).toEqual([1, 2, 3]);
    expect(r.data.pagination.total).toBe(50);
    expect(r.data.pagination.page).toBe(1);
    expect(r.data.pagination.limit).toBe(20);
    expect(r.data.pagination.totalPages).toBe(3);
    expect(r.data.pagination.hasNextPage).toBe(true);
    expect(r.data.pagination.hasPrevPage).toBe(false);
  });

  it('last page has no next', () => {
    const r = formatter.paginated([], 10, 1, 20);
    expect(r.data.pagination.totalPages).toBe(1);
    expect(r.data.pagination.hasNextPage).toBe(false);
  });

  it('middle page has both prev and next', () => {
    const r = formatter.paginated([], 100, 3, 20);
    expect(r.data.pagination.hasNextPage).toBe(true);
    expect(r.data.pagination.hasPrevPage).toBe(true);
  });
});

// ═══════════════════════════════════════
//  list
// ═══════════════════════════════════════
describe('list', () => {
  it('returns items with count', () => {
    const r = formatter.list([1, 2, 3]);
    expect(r.success).toBe(true);
    expect(r.data.items).toEqual([1, 2, 3]);
    expect(r.data.count).toBe(3);
  });
});

// ═══════════════════════════════════════
//  created / updated / deleted
// ═══════════════════════════════════════
describe('created', () => {
  it('returns 201', () => {
    const r = formatter.created({ id: 5 });
    expect(r.statusCode).toBe(201);
    expect(r.data.id).toBe(5);
  });
});

describe('updated', () => {
  it('returns 200', () => {
    const r = formatter.updated({ id: 5 });
    expect(r.statusCode).toBe(200);
    expect(r.message).toBe('Resource updated');
  });
});

describe('deleted', () => {
  it('returns 200', () => {
    const r = formatter.deleted();
    expect(r.statusCode).toBe(200);
    expect(r.message).toBe('Resource deleted');
    expect(r.data).toBeUndefined();
  });
});

// ═══════════════════════════════════════
//  validationError
// ═══════════════════════════════════════
describe('validationError', () => {
  it('wraps single error in array', () => {
    const r = formatter.validationError('Name required');
    expect(r.errors).toEqual(['Name required']);
    expect(r.errorCode).toBe('VALIDATION_ERROR');
    expect(r.statusCode).toBe(400);
  });

  it('keeps array as-is', () => {
    const r = formatter.validationError(['e1', 'e2']);
    expect(r.errors).toEqual(['e1', 'e2']);
  });
});

// ═══════════════════════════════════════
//  notFound / unauthorized / forbidden / conflict
// ═══════════════════════════════════════
describe('notFound', () => {
  it('default message', () => {
    const r = formatter.notFound();
    expect(r.statusCode).toBe(404);
    expect(r.message).toBe('Resource not found');
    expect(r.errorCode).toBe('NOT_FOUND');
  });

  it('custom resource', () => {
    const r = formatter.notFound('Document');
    expect(r.message).toBe('Document not found');
  });

  it('custom message overrides', () => {
    const r = formatter.notFound('X', 'Custom msg');
    expect(r.message).toBe('Custom msg');
  });
});

describe('unauthorized', () => {
  it('returns 401', () => {
    const r = formatter.unauthorized();
    expect(r.statusCode).toBe(401);
    expect(r.errorCode).toBe('UNAUTHORIZED');
  });
});

describe('forbidden', () => {
  it('returns 403', () => {
    const r = formatter.forbidden();
    expect(r.statusCode).toBe(403);
    expect(r.errorCode).toBe('FORBIDDEN');
  });
});

describe('conflict', () => {
  it('returns 409', () => {
    const r = formatter.conflict();
    expect(r.statusCode).toBe(409);
    expect(r.errorCode).toBe('CONFLICT');
  });
});

// ═══════════════════════════════════════
//  serverError / serviceUnavailable
// ═══════════════════════════════════════
describe('serverError', () => {
  it('returns 500', () => {
    const r = formatter.serverError();
    expect(r.statusCode).toBe(500);
    expect(r.errorCode).toBe('INTERNAL_ERROR');
  });

  it('logs error when provided', () => {
    const logger = require('../../utils/logger');
    formatter.serverError('boom', new Error('fail'));
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('serviceUnavailable', () => {
  it('returns 503', () => {
    const r = formatter.serviceUnavailable();
    expect(r.statusCode).toBe(503);
    expect(r.errorCode).toBe('SERVICE_UNAVAILABLE');
  });
});

// ═══════════════════════════════════════
//  batchOperation
// ═══════════════════════════════════════
describe('batchOperation', () => {
  it('200 when no failures', () => {
    const r = formatter.batchOperation([1, 2, 3], 0);
    expect(r.success).toBe(true);
    expect(r.statusCode).toBe(200);
    expect(r.data.successful).toBe(3);
    expect(r.data.failed).toBe(0);
    expect(r.data.total).toBe(3);
  });

  it('207 when some fail', () => {
    const r = formatter.batchOperation([1, 2, 3], 1);
    expect(r.success).toBe(false);
    expect(r.statusCode).toBe(207);
    expect(r.data.successful).toBe(2);
    expect(r.data.failed).toBe(1);
  });
});

// ═══════════════════════════════════════
//  searchResults / analytics
// ═══════════════════════════════════════
describe('searchResults', () => {
  it('returns query + results + count', () => {
    const r = formatter.searchResults([{ id: 1 }], 'test', 100);
    expect(r.data.query).toBe('test');
    expect(r.data.results).toEqual([{ id: 1 }]);
    expect(r.data.count).toBe(1);
    expect(r.data.total).toBe(100);
  });
});

describe('analytics', () => {
  it('includes period', () => {
    const r = formatter.analytics({ kpi: 50 }, 'monthly');
    expect(r.data.period).toBe('monthly');
    expect(r.data.kpi).toBe(50);
  });

  it('defaults period to unknown', () => {
    const r = formatter.analytics({});
    expect(r.data.period).toBe('unknown');
  });
});

// ═══════════════════════════════════════
//  getStreamHeaders / formatErrorLog
// ═══════════════════════════════════════
describe('getStreamHeaders', () => {
  it('returns attachment headers', () => {
    const h = formatter.getStreamHeaders('report.xlsx');
    expect(h['Content-Type']).toBe('application/octet-stream');
    expect(h['Content-Disposition']).toContain('report.xlsx');
    expect(h['Cache-Control']).toContain('no-cache');
  });
});

describe('formatErrorLog', () => {
  it('returns error context', () => {
    const r = formatter.formatErrorLog({ code: 'E001' }, { route: '/api' });
    expect(r.message).toBe('خطأ داخلي');
    expect(r.code).toBe('E001');
    expect(r.context.route).toBe('/api');
    expect(r.timestamp).toBeTruthy();
  });
});
