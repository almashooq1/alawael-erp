/**
 * Logger — alias module
 * Re-exports the main logger from ../logger (backend/utils/logger.js)
 * to support imports via both:
 *   require('../utils/logger')        → backend/utils/logger.js  (direct)
 *   require('../utils/logger/index')  → this file               (folder index)
 */
module.exports = require('../logger');
