/**
 * @file apiKey.middleware.test.js
 * @description Tests for API key authentication middleware
 */

jest.mock('../models/ApiKey', () => {
  const mockModel = {
    findOne: jest.fn(),
  };
  return mockModel;
});

const ApiKey = require('../models/ApiKey');
const apiKeyAuth = require('../middleware/apiKey.middleware');

// ── Helpers ──────────────────────────────────────────────────────────────────
const buildReq = (overrides = {}) => ({
  header: jest.fn().mockReturnValue(undefined),
  isPhase2933Public: false,
  ...overrides,
});

const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const buildNext = () => jest.fn();

const buildApiKeyDoc = (overrides = {}) => ({
  _id: 'apikey123',
  key: 'test-api-key-abc',
  isActive: true,
  expiresAt: new Date(Date.now() + 3600000), // 1 hr future
  lastUsed: null,
  permissions: ['read', 'write'],
  save: jest.fn().mockResolvedValue(true),
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

// ── Tests ────────────────────────────────────────────────────────────────────
describe('apiKeyAuth middleware', () => {
  it('should be an async function', () => {
    expect(typeof apiKeyAuth).toBe('function');
  });

  it('should skip and call next() when req.isPhase2933Public is true', async () => {
    const req = buildReq({ isPhase2933Public: true });
    const res = buildRes();
    const next = buildNext();

    await apiKeyAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(ApiKey.findOne).not.toHaveBeenCalled();
  });

  it('should call next() with no action when X-API-KEY header is absent', async () => {
    const req = buildReq();
    const res = buildRes();
    const next = buildNext();

    await apiKeyAuth(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(ApiKey.findOne).not.toHaveBeenCalled();
  });

  it('should authenticate and set req.user when API key is valid', async () => {
    const apiKeyDoc = buildApiKeyDoc();
    ApiKey.findOne.mockResolvedValue(apiKeyDoc);

    const req = buildReq({
      header: jest.fn().mockReturnValue('test-api-key-abc'),
    });
    const res = buildRes();
    const next = buildNext();

    await apiKeyAuth(req, res, next);

    expect(ApiKey.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'test-api-key-abc', isActive: true })
    );
    expect(req.apiKey).toBeDefined();
    expect(req.user).toBeDefined();
    expect(req.user.role).toBe('API_CLIENT');
    expect(apiKeyDoc.save).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('should return 401 when API key is not found in DB', async () => {
    ApiKey.findOne.mockResolvedValue(null);

    const req = buildReq({
      header: jest.fn().mockReturnValue('invalid-key'),
    });
    const res = buildRes();
    const next = buildNext();

    await apiKeyAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 when API key is expired', async () => {
    const expired = buildApiKeyDoc({
      expiresAt: new Date(Date.now() - 3600000), // 1 hr past
    });
    ApiKey.findOne.mockResolvedValue(expired);

    const req = buildReq({
      header: jest.fn().mockReturnValue('test-api-key-abc'),
    });
    const res = buildRes();
    const next = buildNext();

    await apiKeyAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should set correct permissions from the API key doc', async () => {
    const doc = buildApiKeyDoc({ permissions: ['admin', 'billing'] });
    ApiKey.findOne.mockResolvedValue(doc);

    const req = buildReq({
      header: jest.fn().mockReturnValue('test-api-key-abc'),
    });
    const res = buildRes();
    const next = buildNext();

    await apiKeyAuth(req, res, next);

    expect(req.user.permissions).toEqual(['admin', 'billing']);
  });

  it('should update lastUsed timestamp on successful auth', async () => {
    const doc = buildApiKeyDoc();
    ApiKey.findOne.mockResolvedValue(doc);

    const before = Date.now();
    const req = buildReq({
      header: jest.fn().mockReturnValue('test-api-key-abc'),
    });
    const res = buildRes();
    const next = buildNext();

    await apiKeyAuth(req, res, next);

    expect(doc.lastUsed).toBeDefined();
    expect(doc.lastUsed.getTime()).toBeGreaterThanOrEqual(before);
    expect(doc.save).toHaveBeenCalled();
  });

  it('should return 500 when DB throws an error', async () => {
    ApiKey.findOne.mockRejectedValue(new Error('DB connection lost'));

    const req = buildReq({
      header: jest.fn().mockReturnValue('test-api-key-abc'),
    });
    const res = buildRes();
    const next = buildNext();

    await apiKeyAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.any(String) })
    );
  });
});
