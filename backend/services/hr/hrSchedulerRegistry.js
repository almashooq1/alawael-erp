'use strict';

/**
 * hrSchedulerRegistry.js — minimal singleton holder so the route layer
 * can read the scheduler's last-run summary without re-instantiating it.
 *
 * startup/schedulers.js writes here once at boot.
 * routes/hr/hr-workflow.routes.js reads from here on every /scheduler/status request.
 *
 * Keep this file dependency-free — it's just a holder, not a service.
 */

let scheduler = null;

module.exports = {
  setScheduler(instance) {
    scheduler = instance;
  },
  getScheduler() {
    return scheduler;
  },
};
