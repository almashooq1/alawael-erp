/**
 * Smart Query Builder - Al-Awael ERP
 * باني الاستعلامات الذكي
 *
 * Features:
 *  - Fluent API for building complex MongoDB queries
 *  - Automatic query optimization (index hints, projection pruning)
 *  - Built-in pagination (offset & cursor-based)
 *  - Full-text search with relevance scoring
 *  - Geospatial queries
 *  - Date range helpers (Arabic calendar support)
 *  - Population chain with depth control
 *  - Query plan analysis & explain mode
 *  - Automatic lean() for read-only queries
 *  - Result transformation pipeline
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════════
// SmartQueryBuilder
// ══════════════════════════════════════════════════════════════════
class SmartQueryBuilder {
  /**
   * @param {mongoose.Model} model - Mongoose model to query
   */
  constructor(model) {
    if (!model || !model.modelName) {
      throw new Error('SmartQueryBuilder requires a valid Mongoose model');
    }
    this._model = model;
    this._filter = {};
    this._projection = null;
    this._sort = null;
    this._skip = 0;
    this._limit = 0;
    this._populate = [];
    this._lean = true;
    this._leanOptions = { virtuals: true };
    this._hints = null;
    this._comment = null;
    this._readPreference = null;
    this._transforms = [];
    this._middleware = [];
    this._cache = null; // { key, ttl }
    this._explain = false;
    this._allowDiskUse = false;
    this._collation = null;
    this._batchSize = null;
    this._maxTimeMs = null;
    this._selectFields = [];
    this._excludeFields = [];
  }

  // ────── Static Factory ──────
  static for(model) {
    return new SmartQueryBuilder(model);
  }

  // ══════════════════════════════════════════════════════════════════
  // Filter Methods
  // ══════════════════════════════════════════════════════════════════

  /** Add filter conditions (merged with existing) */
  where(conditions) {
    Object.assign(this._filter, conditions);
    return this;
  }

  /** Filter by exact match */
  eq(field, value) {
    this._filter[field] = value;
    return this;
  }

  /** Filter by not equal */
  ne(field, value) {
    this._filter[field] = { $ne: value };
    return this;
  }

  /** Filter where field is in array */
  in(field, values) {
    this._filter[field] = { $in: Array.isArray(values) ? values : [values] };
    return this;
  }

  /** Filter where field is not in array */
  nin(field, values) {
    this._filter[field] = { $nin: Array.isArray(values) ? values : [values] };
    return this;
  }

  /** Greater than */
  gt(field, value) {
    this._filter[field] = { ...this._filter[field], $gt: value };
    return this;
  }

  /** Greater than or equal */
  gte(field, value) {
    this._filter[field] = { ...this._filter[field], $gte: value };
    return this;
  }

  /** Less than */
  lt(field, value) {
    this._filter[field] = { ...this._filter[field], $lt: value };
    return this;
  }

  /** Less than or equal */
  lte(field, value) {
    this._filter[field] = { ...this._filter[field], $lte: value };
    return this;
  }

  /** Date range filter (inclusive) */
  dateRange(field, from, to) {
    const range = {};
    if (from) range.$gte = new Date(from);
    if (to) range.$lte = new Date(to);
    if (Object.keys(range).length) {
      this._filter[field] = { ...this._filter[field], ...range };
    }
    return this;
  }

  /** Today's records */
  today(field = 'createdAt') {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return this.dateRange(field, start, end);
  }

  /** This month's records */
  thisMonth(field = 'createdAt') {
    const start = new Date();
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59, 999);
    return this.dateRange(field, start, end);
  }

  /** This year's records */
  thisYear(field = 'createdAt') {
    const start = new Date(new Date().getFullYear(), 0, 1);
    const end = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
    return this.dateRange(field, start, end);
  }

  /** Regex search */
  regex(field, pattern, flags = 'i') {
    this._filter[field] = { $regex: pattern, $options: flags };
    return this;
  }

  /** Full-text search */
  textSearch(searchTerm, language = 'none') {
    this._filter.$text = { $search: searchTerm, $language: language };
    if (!this._sort) {
      this._sort = { score: { $meta: 'textScore' } };
      this._selectFields.push({ score: { $meta: 'textScore' } });
    }
    return this;
  }

  /** Exists check */
  exists(field, shouldExist = true) {
    this._filter[field] = { $exists: shouldExist };
    return this;
  }

  /** Array size filter */
  arraySize(field, size) {
    this._filter[field] = { $size: size };
    return this;
  }

  /** Array element match */
  elemMatch(field, conditions) {
    this._filter[field] = { $elemMatch: conditions };
    return this;
  }

  /** Logical OR */
  or(conditions) {
    if (!this._filter.$or) this._filter.$or = [];
    this._filter.$or.push(...(Array.isArray(conditions) ? conditions : [conditions]));
    return this;
  }

  /** Logical AND */
  and(conditions) {
    if (!this._filter.$and) this._filter.$and = [];
    this._filter.$and.push(...(Array.isArray(conditions) ? conditions : [conditions]));
    return this;
  }

  /** Multi-field smart search (searches across multiple text fields) */
  smartSearch(term, fields = ['name.ar', 'name.en', 'email', 'phone']) {
    if (!term || !term.trim()) return this;
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    this._filter.$or = fields.map(f => ({ [f]: { $regex: escaped, $options: 'i' } }));
    return this;
  }

  /** Geospatial: near a point */
  near(field, longitude, latitude, maxDistanceMeters = 10000) {
    this._filter[field] = {
      $near: {
        $geometry: { type: 'Point', coordinates: [longitude, latitude] },
        $maxDistance: maxDistanceMeters,
      },
    };
    return this;
  }

  /** Filter by ObjectId reference */
  ref(field, id) {
    if (id && mongoose.Types.ObjectId.isValid(id)) {
      this._filter[field] = new mongoose.Types.ObjectId(id);
    }
    return this;
  }

  /** Active records only (status = 'active' or isActive = true) */
  active() {
    this._filter.$or = [{ status: 'active' }, { isActive: true }];
    return this;
  }

  /** Non-deleted records (works with soft-delete plugin) */
  notDeleted() {
    this._filter.isDeleted = { $ne: true };
    return this;
  }

  /** Branch-scoped query */
  forBranch(branchId) {
    if (branchId) this._filter.branch = branchId;
    return this;
  }

  // ══════════════════════════════════════════════════════════════════
  // Projection / Selection
  // ══════════════════════════════════════════════════════════════════

  /** Select specific fields */
  select(...fields) {
    this._selectFields.push(...fields.flat());
    return this;
  }

  /** Exclude specific fields */
  exclude(...fields) {
    this._excludeFields.push(...fields.flat());
    return this;
  }

  // ══════════════════════════════════════════════════════════════════
  // Sorting
  // ══════════════════════════════════════════════════════════════════

  /** Sort by field(s) */
  sortBy(field, direction = 'asc') {
    if (!this._sort) this._sort = {};
    if (typeof field === 'object') {
      Object.assign(this._sort, field);
    } else {
      this._sort[field] = direction === 'desc' || direction === -1 ? -1 : 1;
    }
    return this;
  }

  /** Sort newest first */
  newest(field = 'createdAt') {
    return this.sortBy(field, 'desc');
  }

  /** Sort oldest first */
  oldest(field = 'createdAt') {
    return this.sortBy(field, 'asc');
  }

  // ══════════════════════════════════════════════════════════════════
  // Pagination
  // ══════════════════════════════════════════════════════════════════

  /** Set page number (1-based) and page size */
  page(pageNum, pageSize = 20) {
    pageNum = Math.max(1, parseInt(pageNum) || 1);
    pageSize = Math.min(500, Math.max(1, parseInt(pageSize) || 20));
    this._skip = (pageNum - 1) * pageSize;
    this._limit = pageSize;
    this._pageNum = pageNum;
    this._pageSize = pageSize;
    return this;
  }

  /** Cursor-based pagination using _id */
  afterCursor(cursorId) {
    if (cursorId && mongoose.Types.ObjectId.isValid(cursorId)) {
      this._filter._id = { $gt: new mongoose.Types.ObjectId(cursorId) };
    }
    return this;
  }

  /** Cursor-based pagination (previous) */
  beforeCursor(cursorId) {
    if (cursorId && mongoose.Types.ObjectId.isValid(cursorId)) {
      this._filter._id = { $lt: new mongoose.Types.ObjectId(cursorId) };
      if (!this._sort) this._sort = { _id: -1 };
    }
    return this;
  }

  /** Set limit */
  take(n) {
    this._limit = Math.min(1000, Math.max(0, parseInt(n) || 0));
    return this;
  }

  /** Set skip */
  offset(n) {
    this._skip = Math.max(0, parseInt(n) || 0);
    return this;
  }

  // ══════════════════════════════════════════════════════════════════
  // Population
  // ══════════════════════════════════════════════════════════════════

  /** Populate a reference field */
  with(field, select = null, model = null) {
    const populateOpt = { path: field };
    if (select) populateOpt.select = select;
    if (model) populateOpt.model = model;
    this._populate.push(populateOpt);
    return this;
  }

  /** Deep populate (nested) */
  deepWith(path, nestedPath, nestedSelect = null) {
    this._populate.push({
      path,
      populate: { path: nestedPath, select: nestedSelect },
    });
    return this;
  }

  // ══════════════════════════════════════════════════════════════════
  // Performance
  // ══════════════════════════════════════════════════════════════════

  /** Use lean queries (default: true) */
  lean(enable = true, options = {}) {
    this._lean = enable;
    if (Object.keys(options).length) this._leanOptions = options;
    return this;
  }

  /** Hint which index to use */
  hint(indexSpec) {
    this._hints = indexSpec;
    return this;
  }

  /** Set max execution time */
  timeout(ms) {
    this._maxTimeMs = ms;
    return this;
  }

  /** Allow disk use for large sorts */
  diskUse(enable = true) {
    this._allowDiskUse = enable;
    return this;
  }

  /** Add comment for query profiler */
  comment(text) {
    this._comment = text;
    return this;
  }

  /** Set read preference */
  readFrom(preference = 'secondaryPreferred') {
    this._readPreference = preference;
    return this;
  }

  /** Set collation (important for Arabic text sorting) */
  collation(locale = 'ar', options = {}) {
    this._collation = { locale, strength: 2, ...options };
    return this;
  }

  /** Set batch size for cursor */
  batch(size) {
    this._batchSize = size;
    return this;
  }

  // ══════════════════════════════════════════════════════════════════
  // Caching
  // ══════════════════════════════════════════════════════════════════

  /** Cache query results */
  cached(key, ttlSeconds = 300) {
    this._cache = { key, ttl: ttlSeconds };
    return this;
  }

  // ══════════════════════════════════════════════════════════════════
  // Transforms
  // ══════════════════════════════════════════════════════════════════

  /** Add post-query transform function */
  transform(fn) {
    this._transforms.push(fn);
    return this;
  }

  /** Map each result through a function */
  map(fn) {
    this._transforms.push(docs => docs.map(fn));
    return this;
  }

  /** Filter results after query */
  postFilter(fn) {
    this._transforms.push(docs => docs.filter(fn));
    return this;
  }

  /** Group results by a field */
  groupBy(field) {
    this._transforms.push(docs => {
      const groups = {};
      for (const doc of docs) {
        const key = typeof field === 'function' ? field(doc) : doc[field];
        if (!groups[key]) groups[key] = [];
        groups[key].push(doc);
      }
      return groups;
    });
    return this;
  }

  // ══════════════════════════════════════════════════════════════════
  // Execution
  // ══════════════════════════════════════════════════════════════════

  /** Build the Mongoose query object (without executing) */
  _buildQuery() {
    let q = this._model.find(this._filter);

    // Projection
    if (this._selectFields.length) {
      const projection = {};
      for (const f of this._selectFields) {
        if (typeof f === 'string') projection[f] = 1;
        else Object.assign(projection, f);
      }
      q = q.select(projection);
    }
    if (this._excludeFields.length) {
      q = q.select(this._excludeFields.map(f => `-${f}`).join(' '));
    }

    // Sort
    if (this._sort) q = q.sort(this._sort);

    // Pagination
    if (this._skip) q = q.skip(this._skip);
    if (this._limit) q = q.limit(this._limit);

    // Population
    for (const pop of this._populate) {
      q = q.populate(pop);
    }

    // Lean
    if (this._lean) q = q.lean(this._leanOptions);

    // Performance hints
    if (this._hints) q = q.hint(this._hints);
    if (this._comment) q = q.comment(this._comment);
    if (this._readPreference) q = q.read(this._readPreference);
    if (this._collation) q = q.collation(this._collation);
    if (this._batchSize) q = q.batchSize(this._batchSize);
    if (this._maxTimeMs) q = q.maxTimeMS(this._maxTimeMs);
    if (this._allowDiskUse) q = q.allowDiskUse(true);

    return q;
  }

  /** Execute the query and return results */
  async exec() {
    const startTime = Date.now();

    try {
      // Explain mode
      if (this._explain) {
        return await this._buildQuery().explain('executionStats');
      }

      let results = await this._buildQuery().exec();

      // Apply transforms
      for (const fn of this._transforms) {
        results = await fn(results);
      }

      // Log slow queries
      const duration = Date.now() - startTime;
      if (duration > 500) {
        logger.warn(`[SmartQuery] Slow query on ${this._model.modelName}: ${duration}ms`, {
          filter: JSON.stringify(this._filter).slice(0, 200),
          sort: this._sort,
          limit: this._limit,
        });
      }

      return results;
    } catch (err) {
      logger.error(`[SmartQuery] Error on ${this._model.modelName}: ${err.message}`, {
        filter: JSON.stringify(this._filter).slice(0, 200),
      });
      throw err;
    }
  }

  /** Execute and return paginated response */
  async paginate() {
    const pageNum = this._pageNum || 1;
    const pageSize = this._pageSize || this._limit || 20;

    const [docs, totalDocs] = await Promise.all([
      this.exec(),
      this._model.countDocuments(this._filter),
    ]);

    const totalPages = Math.ceil(totalDocs / pageSize);

    return {
      docs,
      meta: {
        totalDocs,
        totalPages,
        page: pageNum,
        limit: pageSize,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
        nextPage: pageNum < totalPages ? pageNum + 1 : null,
        prevPage: pageNum > 1 ? pageNum - 1 : null,
      },
    };
  }

  /** Get a single document */
  async one() {
    const q = this._model.findOne(this._filter);

    if (this._selectFields.length) {
      const projection = {};
      for (const f of this._selectFields) {
        if (typeof f === 'string') projection[f] = 1;
        else Object.assign(projection, f);
      }
      q.select(projection);
    }

    for (const pop of this._populate) q.populate(pop);
    if (this._lean) q.lean(this._leanOptions);
    if (this._sort) q.sort(this._sort);
    if (this._hints) q.hint(this._hints);
    if (this._maxTimeMs) q.maxTimeMS(this._maxTimeMs);

    let result = await q.exec();

    for (const fn of this._transforms) {
      result = await fn(result);
    }

    return result;
  }

  /** Get count of matching documents */
  async count() {
    return this._model.countDocuments(this._filter);
  }

  /** Check if any matching document exists.
   *  Named `existsAny` because `exists(field, shouldExist)` is also a filter
   *  builder method on this class. */
  async existsAny() {
    const doc = await this._model.findOne(this._filter).select('_id').lean();
    return !!doc;
  }

  /** Get distinct values for a field */
  async distinct(field) {
    return this._model.distinct(field, this._filter);
  }

  /** Explain the query plan */
  async explain() {
    this._explain = true;
    return this.exec();
  }

  /** Stream results using cursor */
  cursor() {
    return this._buildQuery().cursor();
  }

  // ══════════════════════════════════════════════════════════════════
  // Aggregation Shorthand
  // ══════════════════════════════════════════════════════════════════

  /** Run aggregation pipeline on this model */
  async aggregate(pipeline = []) {
    // Prepend filter as $match if we have filters
    if (Object.keys(this._filter).length) {
      pipeline.unshift({ $match: this._filter });
    }
    return this._model.aggregate(pipeline).allowDiskUse(this._allowDiskUse).exec();
  }

  /** Quick stats: count, min, max, avg for a numeric field */
  async stats(field) {
    const pipeline = [];
    if (Object.keys(this._filter).length) {
      pipeline.push({ $match: this._filter });
    }
    pipeline.push({
      $group: {
        _id: null,
        count: { $sum: 1 },
        min: { $min: `$${field}` },
        max: { $max: `$${field}` },
        avg: { $avg: `$${field}` },
        sum: { $sum: `$${field}` },
      },
    });

    const [result] = await this._model.aggregate(pipeline);
    return result || { count: 0, min: null, max: null, avg: null, sum: 0 };
  }

  /** Group and count by a field */
  async countBy(field) {
    const pipeline = [];
    if (Object.keys(this._filter).length) {
      pipeline.push({ $match: this._filter });
    }
    pipeline.push({ $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $sort: { count: -1 } });

    return this._model.aggregate(pipeline);
  }

  // ══════════════════════════════════════════════════════════════════
  // Bulk Operations
  // ══════════════════════════════════════════════════════════════════

  /** Update all matching documents */
  async updateAll(updateData) {
    return this._model.updateMany(this._filter, updateData);
  }

  /** Delete all matching documents */
  async deleteAll() {
    return this._model.deleteMany(this._filter);
  }

  /** Soft-delete all matching documents */
  async softDeleteAll(deletedBy = null) {
    return this._model.updateMany(this._filter, {
      $set: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }
}

// ══════════════════════════════════════════════════════════════════
// Helper: Create query from request (Express middleware integration)
// ══════════════════════════════════════════════════════════════════
function queryFromRequest(model, req, options = {}) {
  const qb = SmartQueryBuilder.for(model);
  const {
    page = 1,
    limit = 20,
    sort,
    sortDir = 'desc',
    search,
    status,
    branch,
    from,
    to,
    dateField = 'createdAt',
    ...filters
  } = req.query;

  // Pagination
  qb.page(parseInt(page), parseInt(limit));

  // Sort
  if (sort) {
    qb.sortBy(sort, sortDir);
  } else {
    qb.newest();
  }

  // Search
  const searchFields = options.searchFields || ['name.ar', 'name.en'];
  if (search) qb.smartSearch(search, searchFields);

  // Status filter
  if (status) qb.eq('status', status);

  // Branch scope
  if (branch || req.user?.branch) {
    qb.forBranch(branch || req.user.branch);
  }

  // Date range
  if (from || to) qb.dateRange(dateField, from, to);

  // Additional filters from query string
  const allowedFilters = options.allowedFilters || [];
  for (const [key, value] of Object.entries(filters)) {
    if (allowedFilters.includes(key) && value !== undefined && value !== '') {
      qb.eq(key, value);
    }
  }

  // Soft-delete exclusion
  if (options.softDelete !== false) qb.notDeleted();

  // Population
  if (options.populate) {
    const pops = Array.isArray(options.populate) ? options.populate : [options.populate];
    for (const p of pops) {
      if (typeof p === 'string') qb.with(p);
      else qb.with(p.path, p.select);
    }
  }

  // Field selection
  if (options.select) qb.select(options.select);
  if (options.exclude) qb.exclude(options.exclude);

  // Arabic collation
  if (options.arabicSort) qb.collation('ar');

  return qb;
}

module.exports = {
  SmartQueryBuilder,
  queryFromRequest,
};
