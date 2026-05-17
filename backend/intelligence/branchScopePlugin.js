'use strict';

/**
 * branchScopePlugin.js — Wave 34.
 *
 * Mongoose plugin that auto-injects branch scope on every read query.
 * Models that adopt this plugin no longer require callers to wrap
 * filters manually with `withBranchScope` — the plugin handles it
 * via pre-find / pre-findOne / pre-count / pre-aggregate hooks.
 *
 * Usage:
 *
 *   const branchScopePlugin = require('../intelligence/branchScopePlugin');
 *   const beneficiarySchema = new mongoose.Schema({...});
 *   beneficiarySchema.plugin(branchScopePlugin);
 *
 *   // At call site (pass actor via query options):
 *   const docs = await Beneficiary
 *     .find({ status: 'active' })
 *     .setOptions({ actor: req.actor });
 *
 *   // System bypass (migrations, scheduled jobs):
 *   const docs = await Beneficiary.find({}).setOptions({
 *     actor: branchScopePlugin.SYSTEM_BYPASS,
 *   });
 *
 * Plugin options:
 *   branchField:     'branchId' (default; override for legacy models)
 *   requireActor:    true (default — throws if neither actor nor
 *                          SYSTEM_BYPASS passed in query options)
 *   strict:          false (default — when true, also enforces writes;
 *                          when false, only reads are scoped)
 *
 * The plugin marks each Query with `__branchScoped = true` AFTER
 * applying scope, so re-entrant hooks (e.g. populate) don't
 * double-apply.
 *
 * The hook bodies are exported as named helpers so they're testable
 * without going through Mongoose's exec() chain.
 */

const withBranchScope = require('./withBranchScope');

const SYSTEM_BYPASS = withBranchScope.SYSTEM_BYPASS;

/**
 * Apply scope to a Query (find / findOne / count / etc).
 * Pre-hook body — `query` is the Query instance.
 * Mutates `query.__branchScoped = true` to guard against re-entrance.
 */
function applyReadScope(query, { branchField = 'branchId', requireActor = true } = {}) {
  if (query.__branchScoped) return;
  const queryOpts =
    (typeof query.getOptions === 'function' ? query.getOptions() : query.options) || {};
  const actor = queryOpts.actor;
  if (actor === undefined || actor === null) {
    if (requireActor) {
      throw new Error(
        'branchScopePlugin: query missing { actor }. ' +
          'Pass req.actor or branchScopePlugin.SYSTEM_BYPASS via .setOptions().'
      );
    }
    query.__branchScoped = true;
    return;
  }
  const currentFilter =
    (typeof query.getFilter === 'function'
      ? query.getFilter()
      : query.filter || query._conditions) || {};
  const scoped = withBranchScope(actor, currentFilter, { branchField });
  if (typeof query.setQuery === 'function') {
    query.setQuery(scoped);
  } else if (query._conditions !== undefined) {
    query._conditions = scoped;
  }
  query.__branchScoped = true;
}

/**
 * Apply scope to a write Query (updateMany / deleteMany / etc).
 * Used only when plugin's `strict: true`.
 */
function applyWriteScope(query, { branchField = 'branchId', requireActor = true } = {}) {
  if (query.__branchScoped) return;
  const queryOpts =
    (typeof query.getOptions === 'function' ? query.getOptions() : query.options) || {};
  const actor = queryOpts.actor;
  if (actor === undefined || actor === null) {
    if (requireActor) {
      throw new Error(
        'branchScopePlugin (strict): write query missing { actor }. ' +
          'Pass req.actor via .setOptions() — writes require explicit scope.'
      );
    }
    query.__branchScoped = true;
    return;
  }
  const currentFilter =
    (typeof query.getFilter === 'function' ? query.getFilter() : query._conditions) || {};
  const scoped = withBranchScope(actor, currentFilter, { branchField });
  if (typeof query.setQuery === 'function') {
    query.setQuery(scoped);
  } else if (query._conditions !== undefined) {
    query._conditions = scoped;
  }
  query.__branchScoped = true;
}

/**
 * Apply scope to an Aggregate pipeline.
 * Prepends a $match stage with the actor's scoped branch filter.
 */
function applyAggregateScope(aggregate, { branchField = 'branchId', requireActor = true } = {}) {
  if (aggregate.__branchScoped) return;
  const pipeline = aggregate.pipeline();
  const opts = aggregate.options || {};
  const actor = opts.actor;
  if (actor === undefined || actor === null) {
    if (requireActor) {
      throw new Error(
        'branchScopePlugin: aggregate missing { actor }. ' +
          'Pass req.actor or SYSTEM_BYPASS via .option({ actor }).'
      );
    }
    aggregate.__branchScoped = true;
    return;
  }
  const scoped = withBranchScope(actor, {}, { branchField });
  if (Object.keys(scoped).length > 0) {
    pipeline.unshift({ $match: scoped });
  }
  aggregate.__branchScoped = true;
}

// Sentinel attached to schemas that have the plugin — the drift
// test reads this to verify adoption (Wave 35).
const APPLIED_MARKER = Symbol.for('branchScopePlugin.applied');

function branchScopePlugin(schema, opts = {}) {
  const branchField = opts.branchField || 'branchId';
  const requireActor = opts.requireActor !== false; // default true
  const strict = !!opts.strict;
  const cfg = { branchField, requireActor };

  // Mark the schema as plugin-protected (idempotent — re-running
  // schema.plugin() updates the same marker).
  schema[APPLIED_MARKER] = { branchField, requireActor, strict };

  schema.pre(['find', 'findOne', 'count', 'countDocuments', 'distinct'], function () {
    applyReadScope(this, cfg);
  });

  if (strict) {
    schema.pre(
      [
        'updateOne',
        'updateMany',
        'deleteOne',
        'deleteMany',
        'findOneAndUpdate',
        'findOneAndDelete',
      ],
      function () {
        applyWriteScope(this, cfg);
      }
    );
  }

  schema.pre('aggregate', function () {
    applyAggregateScope(this, cfg);
  });
}

branchScopePlugin.SYSTEM_BYPASS = SYSTEM_BYPASS;
// Exported for direct unit testing — these ARE the hook bodies.
branchScopePlugin.applyReadScope = applyReadScope;
branchScopePlugin.applyWriteScope = applyWriteScope;
branchScopePlugin.applyAggregateScope = applyAggregateScope;

/**
 * Wave 35 — Introspection. Returns true when the plugin has been
 * applied to a Mongoose schema OR model. Used by the drift test
 * (`branch-scope-adoption-wave35.test.js`) to enforce that every
 * model listed in BRANCH_SCOPED_MODELS_REGISTRY actually has the
 * plugin wired.
 */
function isAppliedTo(schemaOrModel) {
  if (!schemaOrModel) return false;
  const schema = schemaOrModel.schema || schemaOrModel;
  return !!schema[APPLIED_MARKER];
}

function getAppliedConfig(schemaOrModel) {
  if (!schemaOrModel) return null;
  const schema = schemaOrModel.schema || schemaOrModel;
  return schema[APPLIED_MARKER] || null;
}

branchScopePlugin.isAppliedTo = isAppliedTo;
branchScopePlugin.getAppliedConfig = getAppliedConfig;
branchScopePlugin.APPLIED_MARKER = APPLIED_MARKER;

module.exports = branchScopePlugin;
