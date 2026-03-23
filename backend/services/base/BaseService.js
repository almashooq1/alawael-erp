/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BaseService — الخدمة الأساسية
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Abstract base for all service classes. Provides standard CRUD operations,
 * audit hooks, soft-delete support, and error-safe wrappers.
 *
 * Usage:
 *   class UserService extends BaseService {
 *     constructor() { super(UserModel, 'User'); }
 *     async findByEmail(email) { return this.model.findOne({ email }).lean(); }
 *   }
 *
 * Features:
 *   - findById / findOne / findAll / create / update / softDelete / hardDelete
 *   - Pagination (page/limit/sort/filter)
 *   - Audit fields (createdBy, updatedBy)
 *   - Soft-delete (deleted: true, deletedAt, deletedBy)
 *   - Error wrapping into AppError subclasses
 *   - Lean queries by default for reads
 *   - Count helpers
 */

'use strict';

const {
  NotFoundError,
  ValidationError,
  ConflictError,
  AppError,
} = require('../../errors/AppError');
const logger = require('../../utils/logger');

class BaseService {
  /**
   * @param {import('mongoose').Model} model — Mongoose model
   * @param {string} modelName — Human-readable name (e.g. 'User')
   */
  constructor(model, modelName) {
    if (!model) throw new AppError(`BaseService: model is required for ${modelName}`);
    this.model = model;
    this.modelName = modelName || model.modelName || 'Resource';
  }

  // ─── Reads ───────────────────────────────────────────────────────────────

  /**
   * Find a single document by ID (excludes soft-deleted by default)
   * @param {string} id - Document ID
   * @param {Object} [options] - { populate, select, includeDeleted }
   * @returns {Promise<Object>}
   * @throws {NotFoundError}
   */
  async findById(id, options = {}) {
    const { populate, select, includeDeleted = false } = options;

    let query = this.model.findById(id);
    if (!includeDeleted) query = query.where({ deleted: { $ne: true } });
    if (populate) query = query.populate(populate);
    if (select) query = query.select(select);

    const doc = await query.lean();
    if (!doc) throw new NotFoundError(`${this.modelName} not found (id: ${id})`);
    return doc;
  }

  /**
   * Find one document matching a filter
   * @param {Object} filter
   * @param {Object} [options] - { populate, select, includeDeleted }
   * @returns {Promise<Object|null>}
   */
  async findOne(filter, options = {}) {
    const { populate, select, includeDeleted = false } = options;
    const safeFilter = includeDeleted ? filter : { ...filter, deleted: { $ne: true } };

    let query = this.model.findOne(safeFilter);
    if (populate) query = query.populate(populate);
    if (select) query = query.select(select);

    return query.lean();
  }

  /**
   * Find all documents with pagination, sorting, and filtering
   * @param {Object} [params]
   * @param {Object}  params.filter   — Mongoose filter
   * @param {number}  params.page     — Page number (1-based)
   * @param {number}  params.limit    — Items per page
   * @param {string|Object} params.sort — Sort specification
   * @param {string}  params.select   — Field projection
   * @param {string|Object} params.populate — Population spec
   * @param {boolean} params.includeDeleted
   * @returns {Promise<{ data: Object[], total: number, page: number, limit: number, pages: number }>}
   */
  async findAll(params = {}) {
    const {
      filter = {},
      page = 1,
      limit = 20,
      sort = { createdAt: -1 },
      select,
      populate,
      includeDeleted = false,
    } = params;

    const parsedPage = Math.max(1, parseInt(page));
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (parsedPage - 1) * parsedLimit;

    const safeFilter = includeDeleted ? filter : { ...filter, deleted: { $ne: true } };

    const [data, total] = await Promise.all([
      (() => {
        let q = this.model.find(safeFilter).sort(sort).skip(skip).limit(parsedLimit);
        if (populate) q = q.populate(populate);
        if (select) q = q.select(select);
        return q.lean();
      })(),
      this.model.countDocuments(safeFilter),
    ]);

    return {
      data,
      total,
      page: parsedPage,
      limit: parsedLimit,
      pages: Math.ceil(total / parsedLimit),
    };
  }

  /**
   * Count documents matching a filter
   */
  async count(filter = {}, includeDeleted = false) {
    const safeFilter = includeDeleted ? filter : { ...filter, deleted: { $ne: true } };
    return this.model.countDocuments(safeFilter);
  }

  // ─── Writes ──────────────────────────────────────────────────────────────

  /**
   * Create a new document
   * @param {Object} data — Document data
   * @param {Object} [options] - { userId } — for audit trail
   * @returns {Promise<Object>}
   */
  async create(data, options = {}) {
    try {
      const doc = new this.model({
        ...data,
        ...(options.userId && { createdBy: options.userId }),
      });
      const saved = await doc.save();
      logger.debug(`[${this.modelName}] Created: ${saved._id}`);
      return saved.toObject();
    } catch (err) {
      this._handleMongoError(err);
    }
  }

  /**
   * Update a document by ID
   * @param {string} id
   * @param {Object} updates
   * @param {Object} [options] - { userId, returnNew }
   * @returns {Promise<Object>}
   * @throws {NotFoundError}
   */
  async update(id, updates, options = {}) {
    const { userId, returnNew = true } = options;
    try {
      const doc = await this.model.findOneAndUpdate(
        { _id: id, deleted: { $ne: true } },
        {
          ...updates,
          ...(userId && { updatedBy: userId }),
          updatedAt: new Date(),
        },
        { new: returnNew, runValidators: true }
      );
      if (!doc) throw new NotFoundError(`${this.modelName} not found (id: ${id})`);
      logger.debug(`[${this.modelName}] Updated: ${id}`);
      return doc.toObject();
    } catch (err) {
      if (err instanceof AppError) throw err;
      this._handleMongoError(err);
    }
  }

  /**
   * Soft-delete a document
   * @param {string} id
   * @param {Object} [options] - { userId }
   * @returns {Promise<Object>}
   */
  async softDelete(id, options = {}) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, deleted: { $ne: true } },
      {
        deleted: true,
        deletedAt: new Date(),
        ...(options.userId && { deletedBy: options.userId }),
      },
      { new: true }
    );
    if (!doc) throw new NotFoundError(`${this.modelName} not found (id: ${id})`);
    logger.debug(`[${this.modelName}] Soft-deleted: ${id}`);
    return doc.toObject();
  }

  /**
   * Hard-delete a document (permanent)
   * @param {string} id
   * @returns {Promise<boolean>}
   */
  async hardDelete(id) {
    const result = await this.model.findByIdAndDelete(id);
    if (!result) throw new NotFoundError(`${this.modelName} not found (id: ${id})`);
    logger.debug(`[${this.modelName}] Hard-deleted: ${id}`);
    return true;
  }

  /**
   * Restore a soft-deleted document
   * @param {string} id
   * @returns {Promise<Object>}
   */
  async restore(id) {
    const doc = await this.model.findOneAndUpdate(
      { _id: id, deleted: true },
      { $unset: { deleted: 1, deletedAt: 1, deletedBy: 1 } },
      { new: true }
    );
    if (!doc) throw new NotFoundError(`${this.modelName} not found or not deleted (id: ${id})`);
    logger.debug(`[${this.modelName}] Restored: ${id}`);
    return doc.toObject();
  }

  // ─── Bulk Operations ────────────────────────────────────────────────────

  /**
   * Create multiple documents in batch
   * @param {Object[]} items
   * @param {Object} [options] - { userId }
   * @returns {Promise<Object[]>}
   */
  async createMany(items, options = {}) {
    try {
      const enriched = items.map(item => ({
        ...item,
        ...(options.userId && { createdBy: options.userId }),
      }));
      const docs = await this.model.insertMany(enriched, { ordered: false });
      logger.debug(`[${this.modelName}] Bulk created: ${docs.length} items`);
      return docs.map(d => d.toObject());
    } catch (err) {
      this._handleMongoError(err);
    }
  }

  /**
   * Check if a document exists
   * @param {Object} filter
   * @returns {Promise<boolean>}
   */
  async exists(filter) {
    const doc = await this.model.exists({ ...filter, deleted: { $ne: true } });
    return !!doc;
  }

  // ─── Error Helpers ───────────────────────────────────────────────────────

  /**
   * Convert Mongoose errors to AppError subclasses
   * @param {Error} err
   * @throws {ValidationError|ConflictError|AppError}
   */
  _handleMongoError(err) {
    // Mongoose ValidationError
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map(e => e.message);
      throw new ValidationError(`${this.modelName} validation failed`, messages);
    }

    // Duplicate key (code 11000)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
      throw new ConflictError(`${this.modelName}: duplicate value for "${field}"`);
    }

    // CastError (invalid ObjectId)
    if (err.name === 'CastError') {
      throw new ValidationError(`Invalid ${err.path}: ${err.value}`);
    }

    // Unknown — rethrow as generic AppError
    throw new AppError(err.message || `${this.modelName} operation failed`, 500);
  }
}

module.exports = BaseService;
