/**
 * Mongoose Global Plugins - Al-Awael ERP
 * إضافات Mongoose العالمية للنماذج
 *
 * Provides: timestamps, softDelete, pagination, toJSON, auditFields, slugify
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../../utils/logger');

// ══════════════════════════════════════════════════════════════════
// 1. Timestamps Plugin (enhanced)
// ══════════════════════════════════════════════════════════════════
function timestampsPlugin(schema) {
  schema.add({
    createdAt: { type: Date, default: Date.now, immutable: true },
    updatedAt: { type: Date, default: Date.now },
  });

  schema.pre('save', function (next) {
    if (!this.isNew) this.updatedAt = new Date();
    next();
  });

  schema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function (next) {
    this.set({ updatedAt: new Date() });
    next();
  });

  // Virtual: age in days since creation
  schema.virtual('ageInDays').get(function () {
    if (!this.createdAt) return null;
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24));
  });
}

// ══════════════════════════════════════════════════════════════════
// 2. Soft Delete Plugin
// ══════════════════════════════════════════════════════════════════
function softDeletePlugin(schema, options = {}) {
  const deletedAtField = options.deletedAtField || 'deletedAt';
  const deletedByField = options.deletedByField || 'deletedBy';
  const isDeletedField = options.isDeletedField || 'isDeleted';

  schema.add({
    [isDeletedField]: { type: Boolean, default: false, index: true },
    [deletedAtField]: { type: Date, default: null },
    [deletedByField]: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  });

  // Override default queries to exclude soft-deleted docs
  const excludeDeleted = function () {
    if (!this.getFilter()[isDeletedField]) {
      this.where({ [isDeletedField]: false });
    }
  };

  schema.pre('find', excludeDeleted);
  schema.pre('findOne', excludeDeleted);
  schema.pre('findOneAndUpdate', excludeDeleted);
  schema.pre('countDocuments', excludeDeleted);
  schema.pre('aggregate', function () {
    const pipeline = this.pipeline();
    if (pipeline[0] && !pipeline[0].$match?.[isDeletedField]) {
      pipeline.unshift({ $match: { [isDeletedField]: false } });
    }
  });

  // Instance method: soft delete
  schema.methods.softDelete = async function (deletedBy = null) {
    this[isDeletedField] = true;
    this[deletedAtField] = new Date();
    this[deletedByField] = deletedBy;
    await this.save();
    return this;
  };

  // Instance method: restore
  schema.methods.restore = async function () {
    this[isDeletedField] = false;
    this[deletedAtField] = null;
    this[deletedByField] = null;
    await this.save();
    return this;
  };

  // Static method: find with deleted
  schema.statics.findWithDeleted = function (filter = {}) {
    return this.findOne(filter).setOptions({ skipSoftDelete: true });
  };

  schema.statics.findAllWithDeleted = function (filter = {}) {
    return this.find(filter).setOptions({ skipSoftDelete: true });
  };
}

// ══════════════════════════════════════════════════════════════════
// 3. Pagination Plugin
// ══════════════════════════════════════════════════════════════════
function paginationPlugin(schema) {
  /**
   * Paginate query results
   * @param {Object} query - MongoDB filter query
   * @param {Object} options - { page, limit, sort, populate, select, lean }
   * @returns {Object} { docs, totalDocs, totalPages, page, limit, hasNextPage, hasPrevPage }
   */
  schema.statics.paginate = async function (query = {}, options = {}) {
    const page = Math.max(1, parseInt(options.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(options.limit) || 20));
    const skip = (page - 1) * limit;
    const sort = options.sort || { createdAt: -1 };
    const select = options.select || '';
    const populate = options.populate || [];
    const lean = options.lean !== false;

    let q = this.find(query).sort(sort).skip(skip).limit(limit);

    if (select) q = q.select(select);
    if (lean) q = q.lean({ virtuals: false });

    if (populate && populate.length > 0) {
      const pops = Array.isArray(populate) ? populate : [populate];
      for (const p of pops) q = q.populate(p);
    }

    const [docs, totalDocs] = await Promise.all([q.exec(), this.countDocuments(query)]);

    const totalPages = Math.ceil(totalDocs / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return {
      docs,
      totalDocs,
      totalPages,
      page,
      limit,
      hasNextPage,
      hasPrevPage,
      nextPage: hasNextPage ? page + 1 : null,
      prevPage: hasPrevPage ? page - 1 : null,
    };
  };

  /**
   * Cursor-based pagination (efficient for large datasets)
   */
  schema.statics.cursorPaginate = async function (query = {}, options = {}) {
    const limit = Math.min(200, Math.max(1, parseInt(options.limit) || 20));
    const cursor = options.cursor; // last _id
    const direction = options.direction || 'next'; // 'next' | 'prev'
    const sort = options.sort || { _id: 1 };

    const filter = { ...query };
    if (cursor) {
      const op = direction === 'next' ? '$gt' : '$lt';
      filter._id = { [op]: new mongoose.Types.ObjectId(cursor) };
    }

    const docs = await this.find(filter)
      .sort(sort)
      .limit(limit + 1)
      .lean();

    const hasMore = docs.length > limit;
    if (hasMore) docs.pop();

    const nextCursor = hasMore ? docs[docs.length - 1]._id : null;
    const prevCursor = docs.length > 0 ? docs[0]._id : null;

    return { docs, hasMore, nextCursor, prevCursor, limit };
  };
}

// ══════════════════════════════════════════════════════════════════
// 4. toJSON Plugin (remove sensitive fields, add virtuals)
// ══════════════════════════════════════════════════════════════════
function toJSONPlugin(schema, options = {}) {
  const sensitiveFields = options.sensitiveFields || [
    'password',
    'passwordHash',
    '__v',
    'passwordResetToken',
    'passwordResetExpires',
    'emailVerificationToken',
  ];

  schema.set('toJSON', {
    virtuals: true,
    versionKey: false,
    transform(doc, ret) {
      // Convert _id to id
      ret.id = ret._id?.toString();
      delete ret._id;

      // Remove sensitive fields
      for (const field of sensitiveFields) {
        delete ret[field];
      }

      return ret;
    },
  });

  schema.set('toObject', {
    virtuals: true,
    versionKey: false,
  });
}

// ══════════════════════════════════════════════════════════════════
// 5. Audit Fields Plugin (who created/updated)
// ══════════════════════════════════════════════════════════════════
function auditPlugin(schema) {
  schema.add({
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lastModifiedNote: { type: String, default: null },
  });

  // Usage: doc.setAudit(userId)
  schema.methods.setAudit = function (userId, note = null) {
    if (this.isNew) {
      this.createdBy = userId;
    }
    this.updatedBy = userId;
    if (note) this.lastModifiedNote = note;
    return this;
  };
}

// ══════════════════════════════════════════════════════════════════
// 6. Branch (Multi-tenancy) Plugin
// ══════════════════════════════════════════════════════════════════
function branchPlugin(schema, options = {}) {
  if (options.required !== false) {
    schema.add({
      branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Branch',
        index: true,
        default: null,
      },
      branchCode: { type: String, index: true, default: null },
    });
  }

  // Scope queries to branch
  schema.statics.forBranch = function (branchId) {
    return this.find({ branch: branchId });
  };

  schema.statics.forBranchCode = function (code) {
    return this.find({ branchCode: code });
  };
}

// ══════════════════════════════════════════════════════════════════
// 7. Status History Plugin
// ══════════════════════════════════════════════════════════════════
function statusHistoryPlugin(schema, options = {}) {
  const statusField = options.statusField || 'status';

  schema.add({
    statusHistory: [
      {
        status: String,
        changedAt: { type: Date, default: Date.now },
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        reason: String,
        notes: String,
      },
    ],
  });

  schema.methods.changeStatus = async function (
    newStatus,
    changedBy = null,
    reason = null,
    notes = null
  ) {
    const prevStatus = this[statusField];
    this[statusField] = newStatus;
    this.statusHistory.push({
      status: newStatus,
      changedAt: new Date(),
      changedBy,
      reason: reason || `Changed from ${prevStatus} to ${newStatus}`,
      notes,
    });
    await this.save();
    return this;
  };
}

// ══════════════════════════════════════════════════════════════════
// 8. Searchable (text indexing helper) Plugin
// ══════════════════════════════════════════════════════════════════
function searchablePlugin(schema, options = {}) {
  const fields = options.fields || ['name.ar', 'name.en'];

  // Add compound text index
  const textIndex = {};
  for (const field of fields) {
    textIndex[field] = 'text';
  }
  schema.index(textIndex);

  // Search static method
  schema.statics.search = function (term, additionalFilter = {}, options = {}) {
    const filter = {
      ...additionalFilter,
      $text: { $search: term },
    };

    let q = this.find(filter, { score: { $meta: 'textScore' } });
    q = q.sort({ score: { $meta: 'textScore' } });

    if (options.limit) q = q.limit(options.limit);

    return q;
  };
}

// ══════════════════════════════════════════════════════════════════
// Register all plugins globally
// ══════════════════════════════════════════════════════════════════
function registerGlobalPlugins(options = {}) {
  const {
    timestamps = true,
    softDelete = false, // opt-in per model
    pagination = true,
    toJSON = true,
    audit = false, // opt-in per model
  } = options;

  if (timestamps) mongoose.plugin(timestampsPlugin);
  if (pagination) mongoose.plugin(paginationPlugin);
  if (toJSON) mongoose.plugin(toJSONPlugin);
  if (softDelete) mongoose.plugin(softDeletePlugin);
  if (audit) mongoose.plugin(auditPlugin);

  logger.info('Mongoose global plugins registered');
}

module.exports = {
  registerGlobalPlugins,
  // Export individual plugins for per-model use
  timestampsPlugin,
  softDeletePlugin,
  paginationPlugin,
  toJSONPlugin,
  auditPlugin,
  branchPlugin,
  statusHistoryPlugin,
  searchablePlugin,
};
