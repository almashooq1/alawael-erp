/**
 * Safe Pagination Utility — أداة الصفحات الآمنة
 *
 * Sanitizes pagination parameters from user input to prevent:
 * - DoS via excessively large `limit` values (e.g., ?limit=999999)
 * - Negative page numbers
 * - Non-numeric values
 *
 * Usage:
 *   const { page, limit, skip } = safePagination(req.query);
 *   // or with custom defaults:
 *   const { page, limit, skip } = safePagination(req.query, { defaultLimit: 15, maxLimit: 50 });
 */

'use strict';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200; // absolute max — no route should exceed this

/**
 * @param {object} query - req.query or any object with page/limit/per_page/pageSize
 * @param {object} [options]
 * @param {number} [options.defaultLimit=20]
 * @param {number} [options.maxLimit=200]
 * @returns {{ page: number, limit: number, skip: number }}
 */
function safePagination(query = {}, options = {}) {
  const defaultLimit = options.defaultLimit || DEFAULT_LIMIT;
  const maxLimit = Math.min(options.maxLimit || MAX_LIMIT, MAX_LIMIT);

  const rawPage = parseInt(query.page, 10);
  const rawLimit = parseInt(query.limit || query.per_page || query.pageSize, 10);

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : DEFAULT_PAGE;
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, maxLimit) : defaultLimit;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

module.exports = safePagination;
