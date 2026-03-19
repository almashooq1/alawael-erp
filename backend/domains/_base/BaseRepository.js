/**
 * BaseRepository — نمط Repository الأساسي
 *
 * يوفر طبقة تجريد للتعامل مع قاعدة البيانات
 * جميع عمليات CRUD الأساسية مع دعم:
 *  - Pagination
 *  - Filtering
 *  - Sorting
 *  - Soft Delete
 *  - Audit Trail
 *
 * @module domains/_base/BaseRepository
 */

const logger = require('../../utils/logger');

class BaseRepository {
  /**
   * @param {import('mongoose').Model} model - Mongoose Model
   * @param {Object} [options]
   * @param {boolean} [options.softDelete=false] - استخدام الحذف الناعم
   * @param {string} [options.deletedField='isDeleted'] - حقل الحذف الناعم
   */
  constructor(model, options = {}) {
    this.model = model;
    this.softDelete = options.softDelete || false;
    this.deletedField = options.deletedField || 'isDeleted';
  }

  /**
   * البحث مع ترقيم الصفحات
   */
  async findPaginated({
    filter = {},
    page = 1,
    limit = 20,
    sort = { createdAt: -1 },
    select,
    populate,
  } = {}) {
    const query = this._applyDeleteFilter(filter);
    const skip = (page - 1) * limit;

    let queryBuilder = this.model.find(query).sort(sort).skip(skip).limit(limit);

    if (select) queryBuilder = queryBuilder.select(select);
    if (populate) queryBuilder = queryBuilder.populate(populate);

    const [data, total] = await Promise.all([
      queryBuilder.lean().exec(),
      this.model.countDocuments(query),
    ]);

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  /**
   * البحث بمعرف
   */
  async findById(id, { select, populate } = {}) {
    let query = this.model.findById(id);
    if (select) query = query.select(select);
    if (populate) query = query.populate(populate);
    return query.lean().exec();
  }

  /**
   * البحث بشرط (واحد)
   */
  async findOne(filter, { select, populate } = {}) {
    const query = this._applyDeleteFilter(filter);
    let queryBuilder = this.model.findOne(query);
    if (select) queryBuilder = queryBuilder.select(select);
    if (populate) queryBuilder = queryBuilder.populate(populate);
    return queryBuilder.lean().exec();
  }

  /**
   * البحث بشرط (متعدد)
   */
  async find(filter = {}, { select, populate, sort, limit } = {}) {
    const query = this._applyDeleteFilter(filter);
    let queryBuilder = this.model.find(query);
    if (select) queryBuilder = queryBuilder.select(select);
    if (populate) queryBuilder = queryBuilder.populate(populate);
    if (sort) queryBuilder = queryBuilder.sort(sort);
    if (limit) queryBuilder = queryBuilder.limit(limit);
    return queryBuilder.lean().exec();
  }

  /**
   * إنشاء سجل جديد
   */
  async create(data) {
    const doc = await this.model.create(data);
    return doc.toObject ? doc.toObject() : doc;
  }

  /**
   * إنشاء سجلات متعددة
   */
  async createMany(dataArray) {
    return this.model.insertMany(dataArray);
  }

  /**
   * تحديث بمعرف
   */
  async updateById(id, data) {
    return this.model.findByIdAndUpdate(id, data, { new: true, runValidators: true }).lean().exec();
  }

  /**
   * تحديث بشرط
   */
  async updateMany(filter, data) {
    return this.model.updateMany(this._applyDeleteFilter(filter), data);
  }

  /**
   * حذف بمعرف (ناعم أو صلب)
   */
  async deleteById(id, { hard = false } = {}) {
    if (this.softDelete && !hard) {
      return this.model
        .findByIdAndUpdate(id, { [this.deletedField]: true, deletedAt: new Date() }, { new: true })
        .lean()
        .exec();
    }
    return this.model.findByIdAndDelete(id).lean().exec();
  }

  /**
   * عدد السجلات
   */
  async count(filter = {}) {
    return this.model.countDocuments(this._applyDeleteFilter(filter));
  }

  /**
   * التحقق من وجود سجل
   */
  async exists(filter) {
    const count = await this.model.countDocuments(this._applyDeleteFilter(filter));
    return count > 0;
  }

  /**
   * Aggregation pipeline
   */
  async aggregate(pipeline) {
    return this.model.aggregate(pipeline);
  }

  /**
   * تطبيق فلتر الحذف الناعم
   * @private
   */
  _applyDeleteFilter(filter) {
    if (this.softDelete) {
      return { ...filter, [this.deletedField]: { $ne: true } };
    }
    return filter;
  }
}

module.exports = { BaseRepository };
