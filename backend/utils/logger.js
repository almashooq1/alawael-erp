/**
 * Logger utility
 *
 * In production / development: delegates to the Winston-based advanced logger
 * (file rotation, JSON output, error tracking).
 * In test: silent no-ops so tests stay clean.
 */

const isTestEnv = process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID;

let logger;
let createChildLogger;
let sanitizeLogData;

if (isTestEnv) {
  // Silent stubs during tests
  logger = {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
    child: () => logger, // child returns the same silent logger
  };
  createChildLogger = () => logger;
  sanitizeLogData = data => data;
} else {
  try {
    const advanced = require('../config/logging.advanced');
    logger = advanced.logger;
    createChildLogger = advanced.createChildLogger || (() => logger);
    sanitizeLogData = advanced.sanitizeLogData || (data => data);
  } catch (_err) {
    // Fallback if winston isn't installed
    logger = {
      info: (message, ...args) => console.log(`[INFO] ${message}`, ...args),
      error: (message, ...args) => console.error(`[ERROR] ${message}`, ...args),
      warn: (message, ...args) => console.warn(`[WARN] ${message}`, ...args),
      debug: (message, ...args) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`[DEBUG] ${message}`, ...args);
        }
      },
      child: () => logger,
    };
    createChildLogger = () => logger;
    sanitizeLogData = data => data;
  }
}

module.exports = logger;
module.exports.createChildLogger = createChildLogger;
module.exports.sanitizeLogData = sanitizeLogData;
