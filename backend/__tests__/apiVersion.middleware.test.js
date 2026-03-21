/**
 * Tests for middleware/apiVersion.middleware.js
 *
 * Covers:
 *  - extractVersion priority chain (URL → header → query → default)
 *  - apiVersionMiddleware sets req.apiVersion + response headers
 *  - versionGate blocks unsupported versions with 406
 *  - mountVersionedRoute registers all version prefixes
 *  - API_VERSIONS / DEFAULT_VERSION constants
 */

const {
  extractVersion,
  apiVersionMiddleware,
  versionGate,
  mountVersionedRoute,
  API_VERSIONS,
  DEFAULT_VERSION,
} = require('../middleware/apiVersion.middleware');

// Mock logger so no console noise
jest.mock('../utils/logger', () => ({
  warn: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  error: jest.fn(),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────
const createReq = (overrides = {}) => ({
  path: '/api/v2/users',
  headers: {},
  query: {},
  method: 'GET',
  originalUrl: '/api/v2/users',
  ...overrides,
});

const createRes = () => {
  const headers = {};
  const res = {
    setHeader: jest.fn((k, v) => { headers[k] = v; }),
    set: jest.fn(),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    _headers: headers,
  };
  return res;
};

const next = jest.fn();

beforeEach(() => jest.clearAllMocks());

// ═════════════════════════════════════════════════════════════════════════════
// 1. Constants
// ═════════════════════════════════════════════════════════════════════════════

describe('API version constants', () => {
  test('API_VERSIONS contains v1 and v2', () => {
    expect(API_VERSIONS).toHaveProperty('v1');
    expect(API_VERSIONS).toHaveProperty('v2');
  });

  test('each version has status and since', () => {
    Object.values(API_VERSIONS).forEach(meta => {
      expect(meta).toHaveProperty('status');
      expect(meta).toHaveProperty('since');
    });
  });

  test('DEFAULT_VERSION is a valid version key', () => {
    expect(API_VERSIONS).toHaveProperty(DEFAULT_VERSION);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. extractVersion
// ═════════════════════════════════════════════════════════════════════════════

describe('extractVersion', () => {
  test('extracts from URL path /api/v1/...', () => {
    expect(extractVersion(createReq({ path: '/api/v1/users' }))).toBe('v1');
  });

  test('extracts from URL path /api/v2/...', () => {
    expect(extractVersion(createReq({ path: '/api/v2/health' }))).toBe('v2');
  });

  test('falls back to accept-version header when no URL match', () => {
    const req = createReq({ path: '/api/users', headers: { 'accept-version': 'v1' } });
    expect(extractVersion(req)).toBe('v1');
  });

  test('falls back to x-api-version header', () => {
    const req = createReq({ path: '/api/users', headers: { 'x-api-version': 'v1' } });
    expect(extractVersion(req)).toBe('v1');
  });

  test('falls back to query param api_version', () => {
    const req = createReq({ path: '/api/users', query: { api_version: 'v1' } });
    expect(extractVersion(req)).toBe('v1');
  });

  test('falls back to DEFAULT_VERSION when nothing matches', () => {
    const req = createReq({ path: '/api/users' });
    expect(extractVersion(req)).toBe(DEFAULT_VERSION);
  });

  test('URL path takes precedence over header', () => {
    const req = createReq({
      path: '/api/v2/users',
      headers: { 'accept-version': 'v1' },
    });
    expect(extractVersion(req)).toBe('v2');
  });

  test('header takes precedence over query param', () => {
    const req = createReq({
      path: '/api/users',
      headers: { 'accept-version': 'v2' },
      query: { api_version: 'v1' },
    });
    expect(extractVersion(req)).toBe('v2');
  });

  test('ignores invalid header version', () => {
    const req = createReq({ path: '/api/users', headers: { 'accept-version': 'v99' } });
    expect(extractVersion(req)).toBe(DEFAULT_VERSION);
  });

  test('ignores invalid query version', () => {
    const req = createReq({ path: '/api/users', query: { api_version: 'v99' } });
    expect(extractVersion(req)).toBe(DEFAULT_VERSION);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. apiVersionMiddleware
// ═════════════════════════════════════════════════════════════════════════════

describe('apiVersionMiddleware', () => {
  test('sets req.apiVersion', () => {
    const req = createReq({ path: '/api/v1/data' });
    const res = createRes();
    apiVersionMiddleware(req, res, next);
    expect(req.apiVersion).toBe('v1');
  });

  test('sets req.apiVersionMeta from lookup', () => {
    const req = createReq({ path: '/api/v2/data' });
    const res = createRes();
    apiVersionMiddleware(req, res, next);
    expect(req.apiVersionMeta).toEqual(API_VERSIONS.v2);
  });

  test('sets X-API-Version response header', () => {
    const req = createReq({ path: '/api/v2/data' });
    const res = createRes();
    apiVersionMiddleware(req, res, next);
    expect(res.setHeader).toHaveBeenCalledWith('X-API-Version', 'v2');
  });

  test('sets X-API-Versions-Supported header', () => {
    const req = createReq();
    const res = createRes();
    apiVersionMiddleware(req, res, next);
    const supported = Object.keys(API_VERSIONS).join(', ');
    expect(res.setHeader).toHaveBeenCalledWith('X-API-Versions-Supported', supported);
  });

  test('calls next()', () => {
    const req = createReq();
    const res = createRes();
    apiVersionMiddleware(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. versionGate
// ═════════════════════════════════════════════════════════════════════════════

describe('versionGate', () => {
  test('allows request when version is in allowedVersions', () => {
    const gate = versionGate(['v2']);
    const req = createReq();
    req.apiVersion = 'v2';
    const res = createRes();
    gate(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('blocks request with 406 when version not allowed', () => {
    const gate = versionGate(['v2']);
    const req = createReq();
    req.apiVersion = 'v1';
    const res = createRes();
    gate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(406);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'VERSION_NOT_SUPPORTED',
        supportedVersions: ['v2'],
        currentVersion: 'v1',
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('allows everything when allowedVersions is empty', () => {
    const gate = versionGate([]);
    const req = createReq();
    req.apiVersion = 'v1';
    const res = createRes();
    gate(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('uses DEFAULT_VERSION when req.apiVersion is undefined', () => {
    const gate = versionGate([DEFAULT_VERSION]);
    const req = createReq();
    delete req.apiVersion;
    const res = createRes();
    gate(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. mountVersionedRoute
// ═════════════════════════════════════════════════════════════════════════════

describe('mountVersionedRoute', () => {
  test('mounts base /api prefix + one per version', () => {
    const app = { use: jest.fn() };
    const router = {};
    mountVersionedRoute(app, '/users', router);

    // /api/users + /api/v1/users + /api/v2/users
    const versionCount = Object.keys(API_VERSIONS).length;
    expect(app.use).toHaveBeenCalledTimes(1 + versionCount);
    expect(app.use).toHaveBeenCalledWith('/api/users', router);
    Object.keys(API_VERSIONS).forEach(v => {
      expect(app.use).toHaveBeenCalledWith(`/api/${v}/users`, router);
    });
  });

  test('handles path without leading slash', () => {
    const app = { use: jest.fn() };
    mountVersionedRoute(app, 'items', {});
    expect(app.use).toHaveBeenCalledWith('/api/items', expect.anything());
  });
});
