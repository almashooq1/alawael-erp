/**
 * 🏷️ API Versioning System
 *
 * Support multiple API versions
 * - URL-based versioning (/api/v1, /api/v2)
 * - Header-based versioning (Accept-Version)
 * - Deprecation warnings
 * - Version migration helpers
 */

class APIVersionManager {
  constructor(options = {}) {
    this.options = {
      defaultVersion: options.defaultVersion || '1.0.0',
      currentVersion: options.currentVersion || '2.0.0',
      supportedVersions: options.supportedVersions || ['1.0.0', '1.5.0', '2.0.0'],
      deprecationWarnings: options.deprecationWarnings || true,
      migrationEnabled: options.migrationEnabled || true,
    };

    this.versionRoutes = new Map();
    this.endpointVersions = new Map();
    this.deprecatedEndpoints = new Set();
    this.versionTransformers = new Map();

    this.stats = {
      v1Requests: 0,
      v2Requests: 0,
      deprecatedCalls: 0,
      migrations: 0,
    };

    this.initializeVersions();
  }

  /**
   * Initialize version metadata
   */
  initializeVersions() {
    // V1.0.0 endpoints (deprecated)
    this.addEndpointVersion('GET /api/users', '1.0.0');
    this.addEndpointVersion('POST /api/users', '1.0.0');
    this.addEndpointVersion('GET /api/products', '1.0.0');
    this.addEndpointVersion('GET /api/orders', '1.0.0');

    // V1.5.0 endpoints (deprecated but with enhancements)
    this.addEndpointVersion('GET /api/users/:id', '1.5.0');
    this.addEndpointVersion('PUT /api/users/:id', '1.5.0');
    this.addEndpointVersion('DELETE /api/users/:id', '1.5.0');

    // V2.0.0 endpoints (current)
    this.addEndpointVersion('GET /api/v2/users', '2.0.0');
    this.addEndpointVersion('POST /api/v2/users', '2.0.0');
    this.addEndpointVersion('GET /api/v2/users/:id', '2.0.0');
    this.addEndpointVersion('PUT /api/v2/users/:id', '2.0.0');
    this.addEndpointVersion('DELETE /api/v2/users/:id', '2.0.0');
    this.addEndpointVersion('GET /api/v2/products', '2.0.0');
    this.addEndpointVersion('GET /api/v2/orders', '2.0.0');

    // Mark deprecated endpoints
    this.markDeprecated('GET /api/users');
    this.markDeprecated('POST /api/users');
    this.markDeprecated('GET /api/products');
    this.markDeprecated('GET /api/orders');
  }

  /**
   * Add endpoint version
   */
  addEndpointVersion(endpoint, version) {
    this.endpointVersions.set(endpoint, version);
  }

  /**
   * Mark endpoint as deprecated
   */
  markDeprecated(endpoint, replacementUrl = null, deprecationDate = null) {
    this.deprecatedEndpoints.add({
      endpoint,
      replacementUrl,
      deprecationDate: deprecationDate || new Date(),
      sunsetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
    });
  }

  /**
   * Parse version from request
   */
  parseVersion(req) {
    // Check URL-based versioning first
    const urlMatch = req.path.match(/\/api\/(v\d+\.\d+\.\d+|v\d+)/i);
    if (urlMatch) {
      const version = this.normalizeVersion(urlMatch[1]);
      if (this.isVersionSupported(version)) {
        return version;
      }
    }

    // Check header-based versioning
    const acceptVersion = req.get('Accept-Version');
    if (acceptVersion && this.isVersionSupported(acceptVersion)) {
      return acceptVersion;
    }

    // Check custom header
    const customVersion = req.get('X-API-Version');
    if (customVersion && this.isVersionSupported(customVersion)) {
      return customVersion;
    }

    // Default to current version
    return this.options.currentVersion;
  }

  /**
   * Normalize version string
   */
  normalizeVersion(version) {
    const match = version.match(/v?(\d+)\.?(\d+)?\.?(\d+)?/);
    if (!match) return this.options.currentVersion;

    const major = match[1];
    const minor = match[2] || '0';
    const patch = match[3] || '0';

    return `${major}.${minor}.${patch}`;
  }

  /**
   * Check if version is supported
   */
  isVersionSupported(version) {
    return this.options.supportedVersions.includes(version);
  }

  /**
   * Get nearest supported version
   */
  getNearestSupportedVersion(requestedVersion) {
    if (this.isVersionSupported(requestedVersion)) {
      return requestedVersion;
    }

    // Find closest version
    const parts = requestedVersion.split('.').map(Number);
    const closestVersions = this.options.supportedVersions
      .map(v => ({
        version: v,
        distance: this.versionDistance(parts, v.split('.').map(Number)),
      }))
      .sort((a, b) => a.distance - b.distance);

    return closestVersions[0]?.version || this.options.currentVersion;
  }

  /**
   * Calculate distance between versions
   */
  versionDistance(v1, v2) {
    return Math.abs(v1[0] - v2[0]) * 100 + Math.abs(v1[1] - v2[1]) * 10 + Math.abs(v1[2] - v2[2]);
  }

  /**
   * Transform request for version
   */
  transformRequest(req, version) {
    // Apply version-specific transformations
    if (version === '1.0.0') {
      // V1 uses different response format
      req.responseFormat = 'v1';
    } else if (version === '1.5.0') {
      req.responseFormat = 'v1.5';
    } else if (version === '2.0.0') {
      req.responseFormat = 'v2';
    }

    return req;
  }

  /**
   * Transform response for version
   */
  transformResponse(data, version) {
    if (version === '1.0.0') {
      // V1 response format
      return {
        status: data.success ? 'success' : 'error',
        data: data.data || null,
        error: data.error || null,
      };
    } else if (version === '1.5.0') {
      // V1.5 response format
      return {
        success: data.success,
        data: data.data,
        meta: {
          timestamp: new Date(),
          version: version,
        },
      };
    }

    // V2 response format (default)
    return {
      success: data.success,
      data: data.data,
      metadata: {
        timestamp: new Date().toISOString(),
        version: version,
        requestId: data.requestId,
      },
    };
  }

  /**
   * Get deprecation warnings
   */
  getDeprecationWarnings(endpoint) {
    const warnings = [];

    for (const deprecated of this.deprecatedEndpoints) {
      if (this.endpointMatch(endpoint, deprecated.endpoint)) {
        warnings.push({
          message: `Endpoint ${deprecated.endpoint} is deprecated`,
          replacement: deprecated.replacementUrl,
          sunsetDate: deprecated.sunsetDate,
          deprecationDate: deprecated.deprecationDate,
        });
      }
    }

    return warnings;
  }

  /**
   * Check if endpoints match
   */
  endpointMatch(endpoint1, endpoint2) {
    const normalize = e => e.replace(/\/:[^/]+/g, '/:id');
    return normalize(endpoint1) === normalize(endpoint2);
  }

  /**
   * Add version transformer
   */
  addTransformer(version, transformer) {
    this.versionTransformers.set(version, transformer);
  }

  /**
   * Migrate data to new version
   */
  migrateData(data, fromVersion, toVersion) {
    if (!this.options.migrationEnabled) {
      return data;
    }

    // Example migrations
    if (fromVersion === '1.0.0' && toVersion === '2.0.0') {
      // V1 to V2 migration
      return this.migrateV1ToV2(data);
    }

    return data;
  }

  /**
   * V1 to V2 migration
   */
  migrateV1ToV2(data) {
    if (Array.isArray(data)) {
      return data.map(item => ({
        ...item,
        id: item._id || item.id, // Ensure id field
        createdAt: item.created_at || item.createdAt, // camelCase
        updatedAt: item.updated_at || item.updatedAt,
      }));
    }

    return {
      ...data,
      id: data._id || data.id,
      createdAt: data.created_at || data.createdAt,
      updatedAt: data.updated_at || data.updatedAt,
    };
  }

  /**
   * Get API documentation for version
   */
  getVersionDocumentation(version) {
    return {
      version,
      status: this.getVersionStatus(version),
      supportedEndpoints: Array.from(this.endpointVersions.entries())
        .filter(([_, v]) => v === version)
        .map(([endpoint, _]) => endpoint),
      deprecations: Array.from(this.deprecatedEndpoints).map(d => d.endpoint),
      baseUrl: `/api/${version.replace(/\./g, '')}`,
    };
  }

  /**
   * Get version status
   */
  getVersionStatus(version) {
    if (version === this.options.currentVersion) {
      return 'active';
    } else if (this.options.supportedVersions.includes(version)) {
      return 'maintained';
    }
    return 'deprecated';
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      supportedVersions: this.options.supportedVersions,
      currentVersion: this.options.currentVersion,
      deprecatedEndpoints: this.deprecatedEndpoints.size,
    };
  }
}

/**
 * Express middleware for API versioning
 */
function apiVersioningMiddleware(manager) {
  return (req, res, next) => {
    // Parse version from request
    const requestedVersion = manager.parseVersion(req);
    const supportedVersion = manager.getNearestSupportedVersion(requestedVersion);

    // Attach version info to request
    req.apiVersion = {
      requested: requestedVersion,
      resolved: supportedVersion,
      isSupported: manager.isVersionSupported(requestedVersion),
      isDeprecated: supportedVersion !== manager.options.currentVersion,
    };

    // Get deprecation warnings
    const warnings = manager.getDeprecationWarnings(req.path);
    if (warnings.length > 0 && manager.options.deprecationWarnings) {
      res.set('Deprecation', 'true');
      res.set('Sunset', warnings[0].sunsetDate.toUTCString());
      res.set('Link', `<${warnings[0].replacement}>; rel="deprecation"`);

      manager.stats.deprecatedCalls++;
    }

    // Transform request for version
    manager.transformRequest(req, supportedVersion);

    // Store version manager for later use
    req.apiVersionManager = manager;

    next();
  };
}

/**
 * Response formatter middleware
 */
function responseFormatterMiddleware(manager) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);

    res.json = function (data) {
      const version = req.apiVersion?.resolved || manager.options.currentVersion;
      const transformed = manager.transformResponse(data, version);

      return originalJson(transformed);
    };

    next();
  };
}

module.exports = {
  APIVersionManager,
  apiVersioningMiddleware,
  responseFormatterMiddleware,
};
