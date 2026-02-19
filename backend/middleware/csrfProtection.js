const crypto = require('crypto');

const CSRF_COOKIE = 'csrf_token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const parseCookies = cookieHeader => {
  if (!cookieHeader) return {};
  return cookieHeader.split(';').reduce((acc, part) => {
    const [key, ...rest] = part.trim().split('=');
    if (!key) return acc;
    acc[key] = decodeURIComponent(rest.join('='));
    return acc;
  }, {});
};

const generateToken = () => crypto.randomBytes(32).toString('base64url');

const DEFAULT_EXCLUDE_PATHS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/v1/auth/login',
  '/api/v1/auth/register',
  '/api/test',
  '/test-first',
  '/health',
];

const csrfProtection = (req, res, next) => {
  if (process.env.CSRF_PROTECTION_ENABLED === 'false') {
    return next();
  }

  const extraExcludes = (process.env.CSRF_EXCLUDE_PATHS || '')
    .split(',')
    .map(path => path.trim())
    .filter(Boolean);
  const excludePaths = new Set([...DEFAULT_EXCLUDE_PATHS, ...extraExcludes]);

  if (excludePaths.has(req.path)) {
    return next();
  }

  const cookies = parseCookies(req.headers.cookie);
  const existingToken = cookies[CSRF_COOKIE];

  if (SAFE_METHODS.has(req.method)) {
    const token = existingToken || generateToken();
    if (!existingToken) {
      res.cookie(CSRF_COOKIE, token, {
        httpOnly: false,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/',
      });
    }
    res.setHeader('X-CSRF-Token', token);
    return next();
  }

  const headerToken = req.headers['x-csrf-token'];
  const hasAuthHeader = Boolean(req.headers.authorization || req.headers['x-api-key']);

  if (hasAuthHeader && (!existingToken || !headerToken)) {
    return next();
  }

  if (!existingToken || !headerToken || headerToken !== existingToken) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or missing CSRF token',
    });
  }

  return next();
};

module.exports = csrfProtection;
