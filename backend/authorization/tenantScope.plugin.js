/**
 * tenantScope.plugin.js — Mongoose plugin that auto-injects the
 * current user's branchId filter on every query/save, based on the
 * AsyncLocalStorage request context bound by bindRequestContext.
 *
 * This is Phase-7 defense-in-depth. The primary enforcement is still
 * at the route/middleware level (requireBranchAccess + branchFilter).
 * This plugin is the "forget-proof" layer: if a new route author
 * calls `Beneficiary.find({})` without branchFilter, the plugin
 * silently adds the filter. If they call `new Beneficiary({...}).save()`
 * without a branchId, the plugin fills it in from the request.
 *
 * Semantics:
 *   • When no request context exists (CLI, scheduler, boot-time) →
 *     plugin is a no-op. Long-running background jobs that need a
 *     specific scope must call requestContext.run({ branchScope }, fn).
 *   • When ctx.bypassTenantScope === true → plugin is a no-op. Used
 *     by explicit admin queries inside requestContext.bypass().
 *   • When ctx.branchScope.allBranches === true (HQ / super_admin /
 *     cross-branch roles) → plugin is a no-op; user sees all tenants.
 *   • When ctx.branchScope.restricted === true → plugin filters by
 *     `{ [field]: ctx.branchScope.branchId }` on reads; stamps the
 *     branchId onto new docs on writes.
 *   • When ctx.branchScope.unscoped === true (token valid but
 *     requireBranchAccess middleware wasn't applied — misconfigured
 *     route) → plugin fails CLOSED: returns an empty result set and
 *     logs an error. This prevents auth-bypass-by-omission.
 *
 * Opt-in: schemas must explicitly call `.plugin(tenantScopePlugin)`.
 * Applying it globally would break legacy schemas that don't have a
 * branchId field (e.g. RBAC config, user sessions).
 *
 * Usage:
 *   const tenantScopePlugin = require('../authorization/tenantScope.plugin');
 *   BeneficiarySchema.plugin(tenantScopePlugin);                // default field 'branchId'
 *   InvoiceSchema.plugin(tenantScopePlugin, { field: 'branch' }); // legacy field name
 */

'use strict';

const requestContext = require('./requestContext');
const logger = require('../utils/logger');

const QUERY_METHODS = [
  'find',
  'findOne',
  'count',
  'countDocuments',
  'findOneAndUpdate',
  'findOneAndDelete',
  'findOneAndReplace',
  'updateOne',
  'updateMany',
  'deleteOne',
  'deleteMany',
  'replaceOne',
];

/**
 * The plugin factory. Mongoose calls this with (schema, options) when
 * a schema `.plugin(tenantScopePlugin, opts)`-s it in.
 */
function tenantScopePlugin(schema, options = {}) {
  const field = options.field || 'branchId';

  // A marker so drift tests can verify plugin application via
  // introspection (rather than grepping source files).
  schema.static('__tenantScoped', function () {
    return true;
  });
  schema.static('__tenantScopeField', function () {
    return field;
  });

  // ── READ/WRITE QUERIES ────────────────────────────────────────────
  // Register each query method individually — passing an array to
  // `schema.pre()` is supported by newer mongoose but was causing
  // the hooks to silently not fire on the version in play here.
  const scopeQuery = function scopeQuery() {
    const ctx = requestContext.get();
    if (!ctx) return; // no request context → no-op (CLIs, boot)
    if (ctx.bypassTenantScope) return;
    if (ctx.branchScope?.allBranches) return;

    // Fail-closed on the misconfigured-route case. We can't tell
    // whether the caller is legitimately admin or forgot to wire
    // requireBranchAccess, so we default to "return nothing" and log
    // loudly. This bias protects against leaks; the log tells ops
    // where to fix it.
    if (ctx.branchScope?.unscoped) {
      logger.error(
        `[tenantScope] QUERY WITHOUT SCOPE — model=${this.model?.modelName || '(unknown)'} ` +
          `requestId=${ctx.requestId || '(none)'} user=${ctx.userId || '(none)'}. ` +
          'Add requireBranchAccess + bindRequestContext to the route OR wrap in requestContext.bypass().'
      );
      this.where({ __tenant_unscoped_deny__: true });
      return;
    }

    const branchId = ctx.branchScope?.branchId;
    if (!branchId) return;

    // Support multi-branch users (secondment, regional_director who
    // only has regionIds). For simple single-branch we just equality-
    // match. If branchIds[] includes the current branch, it's the
    // same result — we keep the simple shape.
    this.where({ [field]: branchId });
  };
  for (const method of QUERY_METHODS) {
    schema.pre(method, scopeQuery);
  }

  // ── SAVE (new documents) ──────────────────────────────────────────
  // Use async-function form — newer Mongoose passes no `next` to
  // these hooks and instead awaits the returned promise.
  schema.pre('save', async function stampBranchOnSave() {
    const ctx = requestContext.get();
    if (!ctx) return;
    if (ctx.bypassTenantScope) return;
    if (this[field]) return; // caller already set it
    const scoped = ctx.branchScope?.branchId;
    if (scoped) this[field] = scoped;
  });

  // ── INSERT MANY ───────────────────────────────────────────────────
  // Mongoose's insertMany hook in v9 calls the hook with multiple
  // argument shapes across method variants. Use `arguments` and hunt
  // for the array parameter rather than assuming a fixed position.
  schema.pre('insertMany', async function stampBranchOnInsertMany(...args) {
    const ctx = requestContext.get();
    if (!ctx) return;
    if (ctx.bypassTenantScope) return;
    const scoped = ctx.branchScope?.branchId;
    if (!scoped) return;

    const docs = args.find(a => Array.isArray(a));
    if (!docs) return;
    for (const d of docs) {
      if (d && !d[field]) d[field] = scoped;
    }
  });

  // ── AGGREGATE ─────────────────────────────────────────────────────
  // Add a $match stage at the front of every aggregation pipeline.
  schema.pre('aggregate', function scopeAggregate() {
    const ctx = requestContext.get();
    if (!ctx) return;
    if (ctx.bypassTenantScope) return;
    if (ctx.branchScope?.allBranches) return;
    if (ctx.branchScope?.unscoped) {
      logger.error(
        `[tenantScope] AGGREGATE WITHOUT SCOPE — model=${this._model?.modelName || '(unknown)'}`
      );
      this.pipeline().unshift({ $match: { __tenant_unscoped_deny__: true } });
      return;
    }
    const branchId = ctx.branchScope?.branchId;
    if (branchId) this.pipeline().unshift({ $match: { [field]: branchId } });
  });
}

module.exports = tenantScopePlugin;
