'use strict';
/**
 * schedulerSnapshotsBootstrap — Wave 322
 *
 * Hydrates the in-process scheduler-registry from durable Mongo snapshots
 * on boot, and flips the registry into persist-on-recordRun mode. Wire this
 * in `server.js` after Mongo connects and BEFORE the cron bootstraps register
 * their schedulers (so we don't double-emit `never-run` for keys that have a
 * snapshot but haven't ticked since restart).
 *
 * Idempotent + best-effort: if Mongo is down or the model is unavailable,
 * the registry simply continues with whatever was already registered.
 */

function wireSchedulerSnapshots({ logger = console } = {}) {
  const schedulerRegistry = require('../intelligence/scheduler-registry');
  return schedulerRegistry
    .hydrateFromSnapshots()
    .then(count => {
      if (typeof logger.info === 'function') {
        logger.info(`[W322] scheduler-registry hydrated ${count} snapshot(s)`);
      }
      return count;
    })
    .catch(err => {
      if (typeof logger.warn === 'function') {
        logger.warn(`[W322] scheduler snapshot hydration skipped: ${err.message}`);
      }
      return 0;
    });
}

module.exports = { wireSchedulerSnapshots };
