/**
 * Cap Pagination Middleware — حد أقصى لمعاملات الصفحات
 *
 * Prevents DoS attacks via uncapped pagination parameters.
 * Automatically caps `limit`, `per_page`, and `pageSize` query params
 * to a safe maximum value (200 by default).
 *
 * Must be mounted BEFORE route handlers in app.js:
 *   app.use(capPagination());
 */

'use strict';

const MAX_LIMIT = 200;

function capPagination(maxLimit = MAX_LIMIT) {
  return (req, _res, next) => {
    if (req.query) {
      const fields = ['limit', 'per_page', 'pageSize'];
      for (const field of fields) {
        if (req.query[field] !== undefined) {
          const val = parseInt(req.query[field], 10);
          if (!Number.isFinite(val) || val < 1) {
            req.query[field] = '20'; // safe default
          } else if (val > maxLimit) {
            req.query[field] = String(maxLimit);
          }
        }
      }
      // Ensure page is at least 1
      if (req.query.page !== undefined) {
        const page = parseInt(req.query.page, 10);
        if (!Number.isFinite(page) || page < 1) {
          req.query.page = '1';
        }
      }
    }
    next();
  };
}

module.exports = capPagination;
