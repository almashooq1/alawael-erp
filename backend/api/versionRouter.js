/**
 * API Version Router — نظام توجيه الإصدارات المتقدم
 *
 * Provides a clean, organized API versioning system:
 *  - /api/v1/* — Stable (backward-compatible)
 *  - /api/v2/* — Current (latest features)
 *  - /api/v3/* — Beta (experimental)
 *
 * Works alongside the existing apiVersion.middleware.js
 *
 * @module api/versionRouter
 */

const express = require('express');
const logger = require('../utils/logger');

// ─── Version Config ──────────────────────────────────────────────────────────
const VERSION_CONFIG = {
  v1: {
    status: 'stable',
    since: '2025-01-01',
    sunset: null,
    description: 'Stable API — backward compatible',
    transformers: {},
  },
  v2: {
    status: 'current',
    since: '2026-01-01',
    sunset: null,
    description: 'Current API — latest features',
    transformers: {},
  },
  v3: {
    status: 'beta',
    since: '2026-06-01',
    sunset: null,
    description: 'Beta API — experimental features',
    transformers: {},
  },
};

const CURRENT_VERSION = 'v2';

// ─── Version Routers ─────────────────────────────────────────────────────────
const versionRouters = {};

for (const version of Object.keys(VERSION_CONFIG)) {
  versionRouters[version] = express.Router();

  // Per-version metadata endpoint
  versionRouters[version].get('/', (_req, res) => {
    res.json({
      version,
      ...VERSION_CONFIG[version],
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Get the router for a specific API version
 * @param {string} version - e.g., 'v1', 'v2'
 * @returns {import('express').Router}
 */
const getVersionRouter = version => {
  if (!versionRouters[version]) {
    throw new Error(`Unknown API version: ${version}`);
  }
  return versionRouters[version];
};

/**
 * Mount a route handler on specific versions
 * @param {string} path - Route path (e.g., '/users')
 * @param {import('express').Router} handler - Route handler
 * @param {string[]} versions - Versions to mount on (default: all)
 */
const mountOnVersions = (path, handler, versions = Object.keys(VERSION_CONFIG)) => {
  for (const ver of versions) {
    if (versionRouters[ver]) {
      versionRouters[ver].use(path, handler);
    }
  }
};

/**
 * Response transformer middleware for version-specific response formatting
 */
const versionTransformer = (transformers = {}) => {
  return (req, res, next) => {
    const version = req.apiVersion || CURRENT_VERSION;
    const transformer = transformers[version];

    if (transformer) {
      const originalJson = res.json.bind(res);
      res.json = data => {
        const transformed = transformer(data);
        return originalJson(transformed);
      };
    }

    next();
  };
};

/**
 * Deprecation middleware for sunset versions
 */
const deprecationNotice = (req, res, next) => {
  const version = req.apiVersion || CURRENT_VERSION;
  const config = VERSION_CONFIG[version];

  if (config?.status === 'deprecated') {
    res.setHeader('Deprecation', 'true');
    res.setHeader('Sunset', config.sunset || 'TBD');
    res.setHeader('Link', `</api/${CURRENT_VERSION}>; rel="successor-version"`);
    logger.warn(`[APIVersion] Deprecated request: ${version} ${req.method} ${req.path}`);
  }

  next();
};

/**
 * Mount all version routers on Express app
 * @param {import('express').Express} app
 */
const mountVersionRouters = app => {
  for (const [version, router] of Object.entries(versionRouters)) {
    app.use(`/api/${version}`, deprecationNotice, router);
  }

  // /api/versions — list all supported versions
  app.get('/api/versions', (_req, res) => {
    res.json({
      success: true,
      current: CURRENT_VERSION,
      versions: Object.entries(VERSION_CONFIG).map(([v, config]) => ({
        version: v,
        ...config,
        url: `/api/${v}`,
      })),
      timestamp: new Date().toISOString(),
    });
  });

  logger.info(`[APIVersion] Mounted ${Object.keys(versionRouters).length} version routers`);
};

module.exports = {
  VERSION_CONFIG,
  CURRENT_VERSION,
  getVersionRouter,
  mountOnVersions,
  mountVersionRouters,
  versionTransformer,
  deprecationNotice,
};
