'use strict';
/**
 * BaseCrudService — Shared CRUD base class for DDD service modules
 * ═══════════════════════════════════════════════════════════════════
 * Extends BaseDomainModule with:
 *   - Model registry for auto-healthCheck generation
 *   - Standard CRUD helper methods (_create, _getById, _update, _delete, _list, _count)
 *   - Paginated list with configurable sort, skip/limit, populate
 *
 * Usage (Pattern A — extends BaseDomainModule → now extends BaseCrudService):
 *   const BaseCrudService = require('./base/BaseCrudService');
 *   class MyService extends BaseCrudService {
 *     constructor() {
 *       super('MyService', { description: '...', version: '1.0.0' }, {
 *         items:    { model: DDDItem,    sort: { createdAt: -1 } },
 *         records:  { model: DDDRecord,  sort: { date: -1 } },
 *       });
 *     }
 *     // healthCheck() auto-generated from registered models
 *     // Domain-specific methods only:
 *     async customAction(id) { ... }
 *   }
 *
 * Usage (Pattern B — plain class → now extends BaseCrudService):
 *   class MyService extends BaseCrudService {
 *     constructor() {
 *       super('MyService', {}, {
 *         items: DDDItem,          // shorthand: Model reference alone (default sort)
 *         records: { model: DDDRecord, sort: { date: -1 } },
 *       });
 *     }
 *   }
 * ═══════════════════════════════════════════════════════════════════
 */

const BaseDomainModule = require('./BaseDomainModule');

class BaseCrudService extends BaseDomainModule {
  /**
   * @param {string} name — service name for logging
   * @param {Object} opts — metadata (description, version)
   * @param {Object} [models] — { key: Model } or { key: { model: Model, sort: {...} } }
   */
  constructor(name, opts = {}, models = {}) {
    super(name, opts);
    this._models = {};
    if (models && typeof models === 'object') {
      this._registerModels(models);
    }
  }

  /**
   * Register models for auto healthCheck & CRUD helpers.
   * Accepts: { key: MongooseModel } or { key: { model: MongooseModel, sort: {...} } }
   */
  _registerModels(modelMap) {
    for (const [key, val] of Object.entries(modelMap)) {
      if (typeof val === 'function') {
        // Shorthand: just the model constructor
        this._models[key] = { model: val, sort: { createdAt: -1 } };
      } else if (val && val.model) {
        this._models[key] = { model: val.model, sort: val.sort || { createdAt: -1 } };
      }
    }
  }

  /* ═══════════════ CRUD Helpers ═══════════════ */

  /**
   * Create a document.
   * @param {Model} Model — Mongoose model
   * @param {Object} data — document fields
   */
  _create(Model, data) {
    return Model.create(data);
  }

  /**
   * Get a document by ID.
   * @param {Model} Model — Mongoose model
   * @param {string} id — document _id
   * @param {Object} [opts] — { populate: string|Object }
   */
  _getById(Model, id, opts = {}) {
    let q = Model.findById(id);
    if (opts.populate) q = q.populate(opts.populate);
    return q.lean();
  }

  /**
   * Update a document by ID.
   * @param {Model} Model — Mongoose model
   * @param {string} id — document _id
   * @param {Object} data — update fields
   * @param {Object} [opts] — { runValidators: true, ... }
   */
  _update(Model, id, data, opts = {}) {
    return Model.findByIdAndUpdate(id, data, { new: true, ...opts }).lean();
  }

  /**
   * Delete a document by ID (hard delete).
   * @param {Model} Model — Mongoose model
   * @param {string} id — document _id
   */
  _delete(Model, id) {
    return Model.findByIdAndDelete(id);
  }

  /**
   * List documents with optional pagination and sorting.
   * @param {Model} Model — Mongoose model
   * @param {Object} filter — query filter
   * @param {Object} [opts] — { page, limit, sort, populate }
   */
  _list(Model, filter = {}, opts = {}) {
    const sort = opts.sort || { createdAt: -1 };
    let q = Model.find(filter).sort(sort);
    if (opts.page && opts.limit) {
      q = q.skip((opts.page - 1) * opts.limit).limit(opts.limit);
    } else if (opts.limit) {
      q = q.limit(opts.limit);
    }
    if (opts.populate) q = q.populate(opts.populate);
    return q.lean();
  }

  /**
   * Count documents matching filter.
   * @param {Model} Model — Mongoose model
   * @param {Object} filter — query filter
   */
  _count(Model, filter = {}) {
    return Model.countDocuments(filter);
  }

  /* ═══════════════ Auto Health Check ═══════════════ */

  /**
   * Auto-generated healthCheck from registered models.
   * Override in subclass for custom health logic.
   */
  async healthCheck() {
    const counts = {};
    for (const [key, { model: Model }] of Object.entries(this._models)) {
      counts[key] = await Model.countDocuments();
    }
    return {
      service: this.name,
      status: 'healthy',
      counts,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = BaseCrudService;
