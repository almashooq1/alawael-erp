/**
 * API Versioning Middleware — نظام إصدارات API احترافي
 *
 * Features:
 *  - Automatic version detection from URL, header, or query param
 *  - Version deprecation warnings
 *  - Backward compatibility layer
 *  - Version-specific rate limiting
 *
 * @module middleware/apiVersion
 */

const logger = require('../utils/logger');

// ─── Supported API Versions ──────────────────────────────────────────────────
const API_VERSIONS = {
  v1: { status: 'stable', since: '2025-01-01', sunset: null },
  v2: { status: 'current', since: '2026-01-01', sunset: null },
};

const DEFAULT_VERSION = 'v2';
const DEPRECATED_VERSIONS = Object.entries(API_VERSIONS)
  .filter(([, meta]) => meta.status === 'deprecated')
  .map(([v]) => v);

// ─── Version Extraction ──────────────────────────────────────────────────────
/**
 * Extract API version from request.
 * Priority: URL path > Accept-Version header > Query param > Default
 */
const extractVersion = req => {
  // 1. URL path: /api/v2/users → v2
  const urlMatch = req.path.match(/^\/api\/(v\d+)\//);
  if (urlMatch) return urlMatch[1];

  // 2. Accept-Version header
  const headerVersion = req.headers['accept-version'] || req.headers['x-api-version'];
  if (headerVersion && API_VERSIONS[headerVersion]) return headerVersion;

  // 3. Query parameter
  if (req.query.api_version && API_VERSIONS[req.query.api_version]) {
    return req.query.api_version;
  }

  return DEFAULT_VERSION;
};

// ─── Version Middleware ──────────────────────────────────────────────────────
const apiVersionMiddleware = (req, res, next) => {
  const version = extractVersion(req);
  const versionMeta = API_VERSIONS[version];

  // Attach version info to request
  req.apiVersion = version;
  req.apiVersionMeta = versionMeta;

  // Set response headers
  res.setHeader('X-API-Version', version);
  res.setHeader('X-API-Versions-Supported', Object.keys(API_VERSIONS).join(', '));

  // Deprecation warning
  if (DEPRECATED_VERSIONS.includes(version)) {
    const warningMsg = `API version ${version} is deprecated. Please migrate to ${DEFAULT_VERSION}.`;
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', versionMeta?.sunset || 'TBD');
    res.setHeader('Link', `</api/${DEFAULT_VERSION}>; rel="successor-version"`);
    res.setHeader('Warning', `299 - "${warningMsg}"`);
    logger.warn(`[API Version] ${warningMsg} — ${req.method} ${req.originalUrl}`);
  }

  next();
};

// ─── Version Gate ────────────────────────────────────────────────────────────
/**
 * Restrict an endpoint to specific API versions.
 * Usage: router.get('/new-feature', versionGate(['v2']), handler)
 */
const versionGate = (allowedVersions = []) => {
  return (req, res, next) => {
    const version = req.apiVersion || DEFAULT_VERSION;
    if (allowedVersions.length > 0 && !allowedVersions.includes(version)) {
      return res.status(406).json({
        success: false,
        error: 'VERSION_NOT_SUPPORTED',
        message: `هذا الإندبوينت غير متوفر في الإصدار ${version}`,
        supportedVersions: allowedVersions,
        currentVersion: version,
      });
    }
    next();
  };
};

// ─── Version Router Helper ───────────────────────────────────────────────────
/**
 * Mount route handlers under both /api and /api/v{n} without duplication.
 * Usage: mountVersionedRoute(app, '/users', usersRouter)
 */
const mountVersionedRoute = (app, path, router) => {
  const prefix = path.startsWith('/') ? path : `/${path}`;
  app.use(`/api${prefix}`, router);
  Object.keys(API_VERSIONS).forEach(version => {
    app.use(`/api/${version}${prefix}`, router);
  });
  logger.debug(`[Router] Mounted versioned route: /api[/v*]${prefix}`);
};

module.exports = {
  apiVersionMiddleware,
  versionGate,
  mountVersionedRoute,
  API_VERSIONS,
  DEFAULT_VERSION,
  extractVersion,
};
