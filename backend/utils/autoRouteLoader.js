/**
 * autoRouteLoader.js
 * Automatically mounts all route files from backend/routes/ that are NOT
 * already individually registered in app.js.
 *
 * Filename → API path conversion (kebab-case):
 *   academicYear.routes.js  →  /api/v1/academic-year
 *   fleetFuel.js            →  /api/v1/fleet-fuel
 *   hr-module.routes.js     →  /api/v1/hr-module
 */

'use strict';

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

/**
 * Convert a route filename to an API mount path.
 * @param {string} filename  e.g. "academicYear.routes.js"
 * @returns {string}         e.g. "/api/v1/academic-year"
 */
function fileToApiPath(filename) {
  // Remove .routes.js or .js suffix
  const base = filename.replace(/\.routes\.js$/, '').replace(/\.js$/, '');
  // camelCase → kebab-case
  const kebab = base.replace(/([A-Z])/g, m => `-${m.toLowerCase()}`).replace(/^-/, '');
  return `/api/v1/${kebab}`;
}

/**
 * Load all routes from routesDir that are not in the skipSet,
 * derive mount path from filename, and mount on app.
 *
 * @param {import('express').Application} app
 * @param {string}   routesDir   Absolute path to routes directory
 * @param {string[]} skipFiles   Filenames (without extension) already mounted
 * @returns {number} count of newly mounted routes
 */
function autoMountRoutes(app, routesDir, skipFiles = []) {
  const skipSet = new Set(
    skipFiles.map(f =>
      f
        .replace(/\.routes\.js$/, '')
        .replace(/\.js$/, '')
        .toLowerCase()
    )
  );

  let mounted = 0;
  let failed = 0;

  const files = fs
    .readdirSync(routesDir)
    .filter(f => f.endsWith('.js') && !f.startsWith('_') && !f.startsWith('.'));

  for (const file of files) {
    const baseName = file
      .replace(/\.routes\.js$/, '')
      .replace(/\.js$/, '')
      .toLowerCase();
    if (skipSet.has(baseName)) continue;

    const apiPath = fileToApiPath(file);
    const filePath = path.join(routesDir, file);

    try {
      const router = require(filePath);

      // Only mount if it looks like an Express router or middleware function
      if (typeof router === 'function' || (router && typeof router.handle === 'function')) {
        app.use(apiPath, router);
        mounted++;
        logger.debug(`[AutoRouter] ✓ ${apiPath}  ← ${file}`);
      } else {
        logger.debug(`[AutoRouter] skip (not a router): ${file}`);
      }
    } catch (err) {
      failed++;
      logger.warn(`[AutoRouter] ✗ ${file} — ${err.message}`);
    }
  }

  logger.info(`[AutoRouter] Mounted ${mounted} routes (${failed} skipped/failed)`);
  return mounted;
}

module.exports = { autoMountRoutes, fileToApiPath };
