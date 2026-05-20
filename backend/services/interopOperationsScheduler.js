/**
 * interopOperationsScheduler.js
 *
 * Single tick that drives the Interop Operations Center: write one
 * `IntegrationTrendSample` per adapter, then run the alert engine. Both
 * are wrapped in their own try/catch so a fault in one half doesn't
 * starve the other.
 *
 * Follows the same factory pattern as stagnantGoalScheduler: pure
 * `runOnce({ now })` core + optional `start({ schedule, cron })` wrapper.
 * Tests inject mocks for the recorder + alertEngine and exercise
 * runOnce directly; production injects the real services + node-cron.
 *
 * Default cron: every 5 minutes (matches the trend sample bucket size).
 */

'use strict';

const DEFAULT_LOGGER = { info: () => {}, warn: () => {}, error: () => {} };
const DEFAULT_SCHEDULE = '*/5 * * * *';

function createInteropOperationsScheduler(deps = {}) {
  const recorder = deps.recorder; // { recordOnce }
  const alertEngine = deps.alertEngine; // { evaluate }
  const logger = deps.logger || DEFAULT_LOGGER;

  if (!recorder || typeof recorder.recordOnce !== 'function') {
    throw new Error('interopOperationsScheduler: recorder.recordOnce is required');
  }
  if (!alertEngine || typeof alertEngine.evaluate !== 'function') {
    throw new Error('interopOperationsScheduler: alertEngine.evaluate is required');
  }

  /**
   * Run one tick. Always settles — never throws.
   * @returns {Promise<{recorder: object|null, alerts: object|null, errors: number}>}
   */
  async function runOnce({ now = new Date(), source = 'scheduler' } = {}) {
    const out = { ranAt: now.toISOString(), recorder: null, alerts: null, errors: 0 };

    try {
      out.recorder = await recorder.recordOnce({ now, source });
    } catch (err) {
      out.errors += 1;
      logger.warn({ err: err && err.message }, 'interopOperationsScheduler: recordOnce failed');
    }

    try {
      out.alerts = await alertEngine.evaluate({ now });
    } catch (err) {
      out.errors += 1;
      logger.warn({ err: err && err.message }, 'interopOperationsScheduler: alert evaluate failed');
    }

    logger.info(out, 'interopOperationsScheduler: tick complete');
    return out;
  }

  function start({ schedule = DEFAULT_SCHEDULE, cron } = {}) {
    if (!cron || typeof cron.schedule !== 'function') {
      throw new Error('interopOperationsScheduler.start: node-cron compatible cron required');
    }
    const job = cron.schedule(schedule, () => {
      runOnce().catch(err =>
        logger.error({ err: err && err.message }, 'interopOperationsScheduler: tick crashed')
      );
    });
    return { stop: () => job.stop() };
  }

  return { runOnce, start };
}

module.exports = createInteropOperationsScheduler;
module.exports.DEFAULT_SCHEDULE = DEFAULT_SCHEDULE;
