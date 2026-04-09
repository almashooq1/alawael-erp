/**
 * Multi-Tenant Data Isolator - Al-Awael ERP
 * نظام عزل البيانات متعدد المستأجرين
 *
 * Features:
 *  - Automatic tenant (branch) scoping on every query
 *  - Cross-tenant leak prevention
 *  - Tenant-aware aggregation pipeline injection
 *  - Per-tenant statistics & quotas
 *  - Mongoose plugin for transparent isolation
 *  - Admin bypass for super-admin operations
 *  - Tenant context propagation via AsyncLocalStorage
 */

'use strict';

const { AsyncLocalStorage } = require('async_hooks');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ══════════════════════════════════════════════════════════════════
// Tenant Context Store (Thread-local via AsyncLocalStorage)
// ══════════════════════════════════════════════════════════════════
const tenantStore = new AsyncLocalStorage();

// ══════════════════════════════════════════════════════════════════
// Multi-Tenant Isolator
// ══════════════════════════════════════════════════════════════════
class MultiTenantIsolator {
  constructor(options = {}) {
    this._tenantField = options.tenantField || 'branchId';
    this._enabled = options.enabled !== false;
    this._strict = options.strict !== false; // Reject queries without tenant context
    this._bypassRoles = new Set(options.bypassRoles || ['superAdmin', 'systemAdmin']);
    this._excludeModels = new Set(
      options.excludeModels || [
        'User',
        'Branch',
        'Setting',
        'SystemConfig',
        'AuditLog',
        'BackupMeta',
        'MigrationRecord',
        'ArchiveMeta',
        'Counter',
      ]
    );
    this._quotas = new Map(); // tenantId -> { maxDocs, maxStorage }
    this._stats = new Map(); // tenantId -> { queries, writes, reads }
  }

  // ────── Context Management ──────

  /**
   * Run a function within a tenant context
   * @param {Object} context - { tenantId, userId, role }
   * @param {Function} fn - async function to execute
   */
  async runInTenant(context, fn) {
    return tenantStore.run(
      {
        tenantId: context.tenantId || context.branchId,
        userId: context.userId,
        role: context.role,
        isBypass: this._bypassRoles.has(context.role),
      },
      fn
    );
  }

  /**
   * Get current tenant context
   */
  getCurrentTenant() {
    return tenantStore.getStore() || null;
  }

  /**
   * Express middleware to set tenant context from request
   */
  middleware() {
    const self = this;
    return (req, _res, next) => {
      const tenantId = req.user?.branchId || req.headers['x-tenant-id'] || req.query._tenantId;
      const context = {
        tenantId,
        userId: req.user?._id,
        role: req.user?.role,
        isBypass: self._bypassRoles.has(req.user?.role),
      };

      tenantStore.run(context, () => {
        req.tenantContext = context;
        next();
      });
    };
  }

  // ────── Mongoose Plugin ──────

  /**
   * Mongoose plugin for automatic tenant isolation
   * Usage: schema.plugin(isolator.plugin(), { modelName: 'Product' })
   */
  plugin() {
    const self = this;

    return function multiTenantPlugin(schema, pluginOptions = {}) {
      const modelName = pluginOptions.modelName || 'Unknown';

      // Skip excluded models
      if (self._excludeModels.has(modelName)) return;

      // Ensure tenant field exists in schema
      if (!schema.path(self._tenantField)) {
        schema.add({
          [self._tenantField]: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Branch',
            index: true,
          },
        });
      }

      // ── Pre-save: auto-inject tenantId ──
      schema.pre('save', function (next) {
        const ctx = self.getCurrentTenant();
        if (ctx && ctx.tenantId && !this[self._tenantField]) {
          this[self._tenantField] = ctx.tenantId;
        }
        next();
      });

      // ── Pre-find: auto-scope queries ──
      const queryHooks = [
        'find',
        'findOne',
        'findOneAndUpdate',
        'findOneAndDelete',
        'countDocuments',
        'estimatedDocumentCount',
        'distinct',
        'updateMany',
        'deleteMany',
        'updateOne',
        'deleteOne',
      ];

      for (const hook of queryHooks) {
        schema.pre(hook, function () {
          self._injectTenantFilter(this, modelName);
        });
      }

      // ── Pre-aggregate: inject $match stage ──
      schema.pre('aggregate', function () {
        const ctx = self.getCurrentTenant();
        if (!ctx || ctx.isBypass) return;
        if (!ctx.tenantId) {
          if (self._strict) {
            throw new Error(`[Tenant] Aggregation on ${modelName} without tenant context`);
          }
          return;
        }

        // Check if first stage already has tenant filter
        const pipeline = this.pipeline();
        const firstStage = pipeline[0];
        if (firstStage?.$match?.[self._tenantField]) return;

        // Prepend tenant filter
        this.pipeline().unshift({
          $match: { [self._tenantField]: new mongoose.Types.ObjectId(ctx.tenantId) },
        });

        self._trackStat(ctx.tenantId, 'aggregations');
      });

      // ── Post hooks for leak detection ──
      schema.post('find', function (docs) {
        self._validateResults(docs, modelName);
      });

      schema.post('findOne', function (doc) {
        if (doc) self._validateResults([doc], modelName);
      });
    };
  }

  // ────── Internal ──────

  _injectTenantFilter(query, modelName) {
    const ctx = this.getCurrentTenant();
    if (!ctx || ctx.isBypass) return;
    if (!ctx.tenantId) {
      if (this._strict) {
        throw new Error(`[Tenant] Query on ${modelName} without tenant context`);
      }
      return;
    }

    const filter = query.getFilter();

    // Don't override if tenant filter already present
    if (filter[this._tenantField]) return;

    query.where(this._tenantField).equals(ctx.tenantId);
    this._trackStat(ctx.tenantId, 'queries');
  }

  _validateResults(docs, modelName) {
    if (!this._enabled || !docs?.length) return;

    const ctx = this.getCurrentTenant();
    if (!ctx || ctx.isBypass || !ctx.tenantId) return;

    const tenantStr = String(ctx.tenantId);
    const leaks = docs.filter(doc => {
      const docTenant = doc[this._tenantField];
      return docTenant && String(docTenant) !== tenantStr;
    });

    if (leaks.length > 0) {
      logger.error(`[Tenant] DATA LEAK DETECTED in ${modelName}!`, {
        expectedTenant: tenantStr,
        leakedDocs: leaks.length,
        docIds: leaks.slice(0, 5).map(d => d._id),
      });

      // Remove leaked docs from results
      const safe = docs.filter(doc => {
        const docTenant = doc[this._tenantField];
        return !docTenant || String(docTenant) === tenantStr;
      });
      docs.length = 0;
      docs.push(...safe);
    }
  }

  _trackStat(tenantId, type) {
    const tid = String(tenantId);
    if (!this._stats.has(tid)) {
      this._stats.set(tid, {
        queries: 0,
        aggregations: 0,
        writes: 0,
        reads: 0,
        firstSeen: new Date(),
      });
    }
    const stat = this._stats.get(tid);
    stat[type] = (stat[type] || 0) + 1;
    stat.lastActivity = new Date();
  }

  // ────── Tenant Quotas ──────

  setQuota(tenantId, quota) {
    this._quotas.set(String(tenantId), {
      maxDocuments: quota.maxDocuments || Infinity,
      maxStorageBytes: quota.maxStorageBytes || Infinity,
      maxQueriesPerMinute: quota.maxQueriesPerMinute || Infinity,
    });
  }

  async checkQuota(tenantId) {
    const quota = this._quotas.get(String(tenantId));
    if (!quota) return { withinLimits: true, quota: null };

    const db = mongoose.connection.db;
    if (!db) return { withinLimits: true, error: 'Not connected' };

    const collections = await db.listCollections().toArray();
    let totalDocs = 0;

    for (const col of collections) {
      const count = await db
        .collection(col.name)
        .countDocuments({ [this._tenantField]: new mongoose.Types.ObjectId(tenantId) });
      totalDocs += count;
    }

    return {
      withinLimits: totalDocs <= quota.maxDocuments,
      current: { documents: totalDocs },
      quota,
      usage: {
        documentsPercent: ((totalDocs / quota.maxDocuments) * 100).toFixed(1) + '%',
      },
    };
  }

  // ────── Statistics ──────

  getStats(tenantId) {
    if (tenantId) {
      return this._stats.get(String(tenantId)) || null;
    }

    const result = {};
    for (const [tid, stat] of this._stats) {
      result[tid] = { ...stat };
    }
    return {
      totalTenants: this._stats.size,
      tenants: result,
    };
  }

  /**
   * Get per-tenant document counts across all collections
   */
  async getTenantSizes() {
    const db = mongoose.connection.db;
    if (!db) throw new Error('Not connected');

    const result = await db
      .collection('branches')
      .find({}, { projection: { name: 1 } })
      .toArray();
    const tenants = {};

    for (const branch of result) {
      const tid = branch._id;
      const collections = await db.listCollections().toArray();
      let totalDocs = 0;

      for (const col of collections) {
        if (this._excludeModels.has(col.name)) continue;
        try {
          const count = await db.collection(col.name).countDocuments({ [this._tenantField]: tid });
          totalDocs += count;
        } catch (_) {
          // skip
        }
      }

      tenants[String(tid)] = {
        name: branch.name,
        documents: totalDocs,
      };
    }

    return tenants;
  }

  // ────── Configuration ──────

  excludeModel(modelName) {
    this._excludeModels.add(modelName);
    return this;
  }

  includeModel(modelName) {
    this._excludeModels.delete(modelName);
    return this;
  }

  setBypassRoles(roles) {
    this._bypassRoles.clear();
    roles.forEach(r => this._bypassRoles.add(r));
    return this;
  }

  isEnabled() {
    return this._enabled;
  }

  enable() {
    this._enabled = true;
  }

  disable() {
    this._enabled = false;
  }
}

// Singleton
const tenantIsolator = new MultiTenantIsolator();

module.exports = {
  MultiTenantIsolator,
  tenantIsolator,
  tenantStore,
};
