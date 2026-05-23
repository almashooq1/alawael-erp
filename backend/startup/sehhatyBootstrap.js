'use strict';

/**
 * sehhatyBootstrap.js — wire Sehhaty/Tawakkalna service + routes (W280b).
 *
 * Constructs `sehhatyService` with `enforceMfa:true` so non-HTTP callers
 * (cron / worker / future CLI) hit the same gate that requireMfaTier(1)
 * enforces at the route layer (W275 service-layer defense-in-depth,
 * auto-tracked by W276 drift guard).
 *
 * Exposes:
 *   app._sehhatyAdapter — pure transport (mock-first)
 *   app._sehhatyService — consent-gated wrapper (the PHI gate)
 *
 * Routes mounted at:
 *   /api/sehhaty
 *   /api/v1/sehhaty
 */

function wireSehhaty(app, deps = {}) {
  const { logger } = deps;
  if (!app || !logger) throw new Error('sehhatyBootstrap.wireSehhaty: app + logger required');

  try {
    const sehhatyAdapter = require('../services/sehhatyAdapter');
    const sehhatyServiceFactory = require('../services/sehhaty.service');
    const sehhatyRouter = require('../routes/sehhaty.routes');

    // Try to attach AuditLogger if the adapter-audit logger is present
    let AuditLogger = null;
    try {
      AuditLogger = require('../utils/adapterAuditLogger');
    } catch {
      // optional — service degrades to no-audit
    }

    // W275 pattern: enforceMfa:true makes the service-layer gate reject
    // actors with mfaTier < 1 even when route layer skipped.
    const sehhatyService = sehhatyServiceFactory({
      adapter: sehhatyAdapter,
      AuditLogger,
      enforceMfa: true,
    });

    app._sehhatyAdapter = sehhatyAdapter;
    app._sehhatyService = sehhatyService;

    app.use('/api/sehhaty', sehhatyRouter);
    app.use('/api/v1/sehhaty', sehhatyRouter);

    logger.info(
      '[startup] Sehhaty wired (W280b): /api/sehhaty + /api/v1/sehhaty, mode=' +
        sehhatyAdapter.getConfig().mode +
        ', enforceMfa=true'
    );
  } catch (err) {
    logger.warn('[startup] Sehhaty wiring failed (W280b)', { err: err.message });
  }
}

module.exports = { wireSehhaty };
