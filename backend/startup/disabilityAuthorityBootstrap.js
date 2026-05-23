'use strict';

/**
 * disabilityAuthorityBootstrap.js — wire W281 adapter routes (W281b).
 *
 * The adapter is a pure transport module (no class, no MFA gate of its
 * own — gates live at the route layer). This bootstrap simply attaches
 * the adapter to `app._disabilityAuthorityAdapter` and mounts the
 * 3-endpoint routes file.
 *
 * Distinct from `disabilityAuthority.routes.js` which serves the
 * pre-existing internal `DisabilityAuthorityService` (periodic reports
 * stored locally). The adapter's routes mount at:
 *   /api/disability-authority/adapter
 *   /api/v1/disability-authority/adapter
 */

function wireDisabilityAuthority(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) {
    throw new Error('disabilityAuthorityBootstrap.wireDisabilityAuthority: app + logger required');
  }

  try {
    const adapter = require('../services/disabilityAuthorityAdapter');
    const adapterRouter = require('../routes/disabilityAuthorityAdapter.routes');

    app._disabilityAuthorityAdapter = adapter;

    app.use('/api/disability-authority/adapter', adapterRouter);
    app.use('/api/v1/disability-authority/adapter', adapterRouter);

    logger.info(
      '[startup] Disability Authority adapter wired (W281b): /api/disability-authority/adapter (mode=' +
        adapter.getConfig().mode +
        ')'
    );
  } catch (err) {
    logger.warn('[startup] Disability Authority wiring failed (W281b)', { err: err.message });
  }
}

module.exports = { wireDisabilityAuthority };
