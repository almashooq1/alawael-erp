const csrfProtection = require('../../middleware/csrfProtection');

describe('csrfProtection middleware', () => {
  const originalEnv = process.env.CSRF_PROTECTION_ENABLED;

  beforeEach(() => {
    process.env.CSRF_PROTECTION_ENABLED = 'true';
  });

  afterEach(() => {
    process.env.CSRF_PROTECTION_ENABLED = originalEnv;
  });

  const createRes = () => {
    const res = {
      headers: {},
      cookies: {},
      statusCode: 200,
      cookie(name, value) {
        this.cookies[name] = value;
      },
      setHeader(key, value) {
        this.headers[key] = value;
      },
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.payload = payload;
        return this;
      },
    };
    return res;
  };

  it('sets CSRF token on safe requests', () => {
    const req = { method: 'GET', headers: {}, path: '/api/custom' };
    const res = createRes();
    const next = jest.fn();

    csrfProtection(req, res, next);

    expect(next).toHaveBeenCalled();
    // Middleware should set X-CSRF-Token header via setHeader
    expect(res.headers['X-CSRF-Token']).toBeDefined();
    if (res.headers['X-CSRF-Token']) {
      expect(res.headers['X-CSRF-Token'].length).toBeGreaterThan(0);
    }
  });

  it('rejects unsafe requests without token', () => {
    const req = { method: 'POST', headers: {}, path: '/api/secure' };
    const res = createRes();
    const next = jest.fn();

    csrfProtection(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(403);
  });
});
