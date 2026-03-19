/**
 * BaseService — طبقة الخدمات الأساسية
 *
 * توفر العمليات المشتركة لجميع الخدمات مع:
 *  - Validation
 *  - Error Handling
 *  - Event Emission
 *  - Caching
 *
 * @module domains/_base/BaseService
 */

const { EventEmitter } = require('events');
const logger = require('../../utils/logger');

class BaseService extends EventEmitter {
  /**
   * @param {import('./BaseRepository').BaseRepository} repository
   * @param {Object} [options]
   * @param {string} [options.name] - اسم الخدمة
   * @param {Object} [options.cache] - إعدادات التخزين المؤقت
   */
  constructor(repository, options = {}) {
    super();
    this.repository = repository;
    this.name = options.name || 'BaseService';
    this.cacheEnabled = options.cache?.enabled || false;
    this.cacheTTL = options.cache?.ttl || 300; // 5 minutes
    this._cache = new Map();
  }

  /**
   * الحصول على قائمة مع ترقيم الصفحات
   */
  async list(params = {}) {
    const cacheKey = `list:${JSON.stringify(params)}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) return cached;

    const result = await this.repository.findPaginated(params);
    this._setCache(cacheKey, result);
    return result;
  }

  /**
   * الحصول على سجل بمعرف
   */
  async getById(id, options = {}) {
    const cacheKey = `get:${id}`;
    const cached = this._getFromCache(cacheKey);
    if (cached) return cached;

    const result = await this.repository.findById(id, options);
    if (!result) {
      const error = new Error(`${this.name}: السجل غير موجود (${id})`);
      error.statusCode = 404;
      throw error;
    }

    this._setCache(cacheKey, result);
    return result;
  }

  /**
   * إنشاء سجل جديد
   */
  async create(data, context = {}) {
    // Pre-create hook
    await this.beforeCreate(data, context);

    const result = await this.repository.create(data);

    // Post-create hook
    await this.afterCreate(result, context);

    // Emit event
    this.emit('created', { entity: result, context });

    // Invalidate cache
    this._invalidateCache();

    return result;
  }

  /**
   * تحديث سجل
   */
  async update(id, data, context = {}) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      const error = new Error(`${this.name}: السجل غير موجود (${id})`);
      error.statusCode = 404;
      throw error;
    }

    // Pre-update hook
    await this.beforeUpdate(id, data, existing, context);

    const result = await this.repository.updateById(id, data);

    // Post-update hook
    await this.afterUpdate(result, existing, context);

    // Emit event
    this.emit('updated', { entity: result, previous: existing, context });

    // Invalidate cache
    this._invalidateCache();

    return result;
  }

  /**
   * حذف سجل
   */
  async delete(id, context = {}) {
    const existing = await this.repository.findById(id);
    if (!existing) {
      const error = new Error(`${this.name}: السجل غير موجود (${id})`);
      error.statusCode = 404;
      throw error;
    }

    // Pre-delete hook
    await this.beforeDelete(id, existing, context);

    const result = await this.repository.deleteById(id);

    // Post-delete hook
    await this.afterDelete(existing, context);

    // Emit event
    this.emit('deleted', { entity: existing, context });

    // Invalidate cache
    this._invalidateCache();

    return result;
  }

  // ─── Lifecycle Hooks (override in subclass) ─────────────────────────────

  async beforeCreate(data, context) {}
  async afterCreate(entity, context) {}
  async beforeUpdate(id, data, existing, context) {}
  async afterUpdate(entity, previous, context) {}
  async beforeDelete(id, existing, context) {}
  async afterDelete(entity, context) {}

  // ─── Cache Methods ──────────────────────────────────────────────────────

  _getFromCache(key) {
    if (!this.cacheEnabled) return null;
    const entry = this._cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      this._cache.delete(key);
      return null;
    }
    return entry.value;
  }

  _setCache(key, value) {
    if (!this.cacheEnabled) return;
    this._cache.set(key, {
      value,
      expiry: Date.now() + this.cacheTTL * 1000,
    });
  }

  _invalidateCache() {
    this._cache.clear();
  }
}

module.exports = { BaseService };
