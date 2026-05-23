'use strict';

/**
 * dpiaBootstrap.js — Wave 285 wiring for the DPIA service + routes.
 *
 * Constructs `dpiaService` with `enforceMfa:true` so non-HTTP callers
 * (cron / worker / future CLI) hit the same tier-2 gate that
 * requireMfaTier(2) enforces at the route layer (W275 service-layer
 * defense-in-depth pattern, tracked by W276 drift guard).
 *
 * Mounts:
 *   /api/dpia    (legacy URL)
 *   /api/v1/dpia (versioned URL — preferred for new clients)
 *
 * Late binding: routes call `req.app._dpiaService` at request time, so
 * this bootstrap can run anywhere in startup as long as the routes
 * mount AFTER this returns.
 *
 * @param {import('express').Express} app
 * @param {{ logger: any }} deps
 */
function wireDpia(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) throw new Error('dpiaBootstrap.wireDpia: app + logger required');

  try {
    const dpiaServiceFactory = require('../services/dpia.service');
    const dpiaRouter = require('../routes/dpia.routes');

    // W275 pattern: enforceMfa:true makes service-layer sign() reject
    // actors with mfaTier < 2 even if the call comes from a worker.
    const dpiaService = dpiaServiceFactory({ enforceMfa: true });
    app._dpiaService = dpiaService;

    app.use('/api/dpia', dpiaRouter);
    app.use('/api/v1/dpia', dpiaRouter);

    logger.info('[startup] DPIA wired (W285): /api/dpia + /api/v1/dpia, enforceMfa=true');
  } catch (err) {
    logger.warn('[startup] DPIA wiring failed (W285)', { err: err.message });
  }
}

module.exports = { wireDpia };
