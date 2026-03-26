/**
 * Pagination Middleware — sanitise & cap page / limit query params.
 *
 * After this middleware runs every request will have:
 *   req.pagination = { page: Number, limit: Number, skip: Number }
 *
 * Usage:  app.use(paginationDefaults());        // uses 100 as max
 *         app.use(paginationDefaults({ max: 50 }));
 */

'use strict';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const ABSOLUTE_MAX_LIMIT = 100; // hard ceiling

function paginationDefaults(opts = {}) {
  const maxLimit = Math.min(Number(opts.max) || ABSOLUTE_MAX_LIMIT, ABSOLUTE_MAX_LIMIT);

  return (req, _res, next) => {
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    if (!Number.isFinite(page) || page < 1) page = DEFAULT_PAGE;
    if (!Number.isFinite(limit) || limit < 1) limit = DEFAULT_LIMIT;

    // Hard cap — never allow more than maxLimit
    if (limit > maxLimit) limit = maxLimit;

    req.query.page = String(page);
    req.query.limit = String(limit);

    req.pagination = {
      page,
      limit,
      skip: (page - 1) * limit,
    };

    next();
  };
}

module.exports = { paginationDefaults, ABSOLUTE_MAX_LIMIT };
