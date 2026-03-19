/**
 * Centralized logger utility.
 * - In development: logs to console normally
 * - In production: suppresses debug/log, keeps warn/error
 * - Future: plug in Sentry, LogRocket, or any APM here
 */

const isDev = process.env.NODE_ENV !== 'production';

const noop = () => {};

const logger = {
  /** Debug-level: only in development */
  debug: isDev ? console.debug.bind(console) : noop,

  /** Informational: only in development */
  log: isDev ? console.log.bind(console) : noop,

  /** Warnings: always visible */
  warn: console.warn.bind(console),

  /** Errors: always visible + Sentry integration */
  error: (...args) => {
    console.error(...args);
    // Report to Sentry if it's an Error object
    try {
      const { captureException } = require('./sentry');
      const error = args.find(a => a instanceof Error);
      if (error) {
        captureException(error, { additionalArgs: args.filter(a => !(a instanceof Error)) });
      }
    } catch (e) {
      // Sentry not available, skip
    }
  },
};

export default logger;
