/**
 * Auth Middleware — alias module
 * Re-exports the authentication middleware from ../middleware/auth.middleware
 * to support imports via:
 *   require('../auth/middleware')
 */
module.exports = require('../middleware/auth.middleware');
