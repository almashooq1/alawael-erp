/**
 * API Deprecation Middleware — تحذير إيقاف الواجهات البرمجية
 *
 * Injects standard RFC 8594 deprecation headers so API consumers
 * are notified when endpoints are scheduled for removal.
 *
 * Headers added:
 *   Deprecation: true
 *   Sunset: <RFC 7231 date>
 *   Link: <url>; rel="successor-version"
 *
 * Usage:
 *   const { deprecate } = require('../middleware/deprecation');
 *
 *   // Deprecate a single route
 *   router.get('/old-endpoint', deprecate({ sunset: '2026-12-31', successor: '/api/v2/new-endpoint' }), handler);
 *
 *   // Deprecate an entire version prefix
 *   app.use('/api/v1', deprecate({ sunset: '2026-12-31', successor: '/api/v2' }));
 */

'use strict';

/**
 * Create a deprecation middleware.
 *
 * @param {object}  opts
 * @param {string}  opts.sunset    — ISO date when the endpoint will be removed (e.g. '2026-12-31')
 * @param {string} [opts.successor] — URL of the replacement endpoint
 * @param {string} [opts.message]   — Optional human-readable deprecation note
 * @returns {Function} Express middleware
 */
function deprecate(opts = {}) {
  const { sunset, successor, message } = opts;

  // Pre-compute the Sunset header value (HTTP-date per RFC 7231)
  let sunsetDate = null;
  if (sunset) {
    const d = new Date(sunset);
    if (!isNaN(d.getTime())) {
      sunsetDate = d.toUTCString();
    }
  }

  return (req, res, next) => {
    res.setHeader('Deprecation', 'true');

    if (sunsetDate) {
      res.setHeader('Sunset', sunsetDate);
    }

    if (successor) {
      const linkValue = `<${successor}>; rel="successor-version"`;
      const existing = res.getHeader('Link');
      res.setHeader('Link', existing ? `${existing}, ${linkValue}` : linkValue);
    }

    if (message) {
      res.setHeader('X-Deprecation-Notice', message);
    }

    next();
  };
}

module.exports = { deprecate };
