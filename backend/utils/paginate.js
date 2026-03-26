/**
 * Reusable Pagination Utility
 * أداة ترقيم الصفحات القابلة لإعادة الاستخدام
 *
 * Usage:
 *   const { paginate, paginateMeta } = require('../utils/paginate');
 *   const query = Model.find(filter).sort({ createdAt: -1 });
 *   const { data, meta } = await paginate(query, req.query);
 *   res.json({ success: true, data, ...meta });
 */

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

/**
 * Apply pagination to a Mongoose query.
 *
 * @param {import('mongoose').Query} query - Mongoose query (pre-exec)
 * @param {object} params - { page, limit } from req.query
 * @param {object} [opts] - { maxLimit, lean }
 * @returns {Promise<{ data: any[], meta: { page, limit, total, totalPages, hasNext, hasPrev } }>}
 */
async function paginate(query, params = {}, opts = {}) {
  const page = Math.max(1, parseInt(params.page, 10) || 1);
  const maxLimit = opts.maxLimit || MAX_LIMIT;
  const limit = Math.min(Math.max(1, parseInt(params.limit, 10) || DEFAULT_LIMIT), maxLimit);
  const skip = (page - 1) * limit;

  // Clone the query for count (before skip/limit mutate it)
  const countQuery = query.model.find().merge(query).skip(0).limit(0);
  const [data, total] = await Promise.all([
    opts.lean !== false ? query.skip(skip).limit(limit).lean() : query.skip(skip).limit(limit),
    countQuery.countDocuments(),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Build meta object from manual count + params (when paginate() isn't suitable).
 */
function paginateMeta(total, { page = 1, limit = DEFAULT_LIMIT } = {}) {
  const p = Math.max(1, +page);
  const l = Math.min(Math.max(1, +limit), MAX_LIMIT);
  const totalPages = Math.ceil(total / l) || 1;
  return { page: p, limit: l, total, totalPages, hasNext: p < totalPages, hasPrev: p > 1 };
}

module.exports = { paginate, paginateMeta, DEFAULT_LIMIT, MAX_LIMIT };
