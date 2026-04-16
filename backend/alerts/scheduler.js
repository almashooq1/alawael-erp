/**
 * Scheduler — runs the AlertDispatcher on an interval.
 *
 * Two modes are supported:
 *   - `intervalMs` simple setInterval (default 5 minutes)
 *   - `cronExpression` delegated to node-cron (already a dependency)
 *
 * Only one scheduled job per process.
 */

'use strict';

class AlertsScheduler {
  constructor({ dispatcher, intervalMs = 5 * 60 * 1000, cronExpression, cron, logger = console }) {
    if (!dispatcher) throw new Error('AlertsScheduler: dispatcher required');
    this.dispatcher = dispatcher;
    this.intervalMs = intervalMs;
    this.cronExpression = cronExpression;
    this.cron = cron;
    this.logger = logger;
    this._timer = null;
    this._cronTask = null;
    this._running = false;
  }

  start(ctxFactory = () => ({})) {
    if (this._timer || this._cronTask) return this;
    const run = async () => {
      if (this._running) return;
      this._running = true;
      try {
        const ctx = await ctxFactory();
        const result = await this.dispatcher.tick(ctx);
        if (result.errors.length && this.logger.warn) {
          this.logger.warn(`alerts tick errors: ${result.errors.join('; ')}`);
        }
        if (this.logger.info) {
          this.logger.info(
            `alerts tick: raised=${result.raised} resolved=${result.resolved} notified=${result.notified}`
          );
        }
      } catch (err) {
        this.logger.error && this.logger.error(`alerts tick crashed: ${err.message}`);
      } finally {
        this._running = false;
      }
    };

    if (this.cronExpression && this.cron && typeof this.cron.schedule === 'function') {
      this._cronTask = this.cron.schedule(this.cronExpression, run);
    } else {
      this._timer = setInterval(run, this.intervalMs);
    }
    // Fire once immediately so newcomers see initial state.
    run().catch(() => {});
    return this;
  }

  stop() {
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
    if (this._cronTask && typeof this._cronTask.stop === 'function') {
      this._cronTask.stop();
      this._cronTask = null;
    }
  }

  isRunning() {
    return !!(this._timer || this._cronTask);
  }
}

module.exports = { AlertsScheduler };
