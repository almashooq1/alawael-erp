/**
 * requestContext.js — AsyncLocalStorage-backed request context.
 *
 * Express middleware binds the current user's branchScope + role +
 * userId into an AsyncLocalStorage store at the start of a request.
 * Any async code inside that request — including Mongoose queries
 * deep inside services — can then read the current scope without
 * having to thread `req` through every function call.
 *
 * This is the binding layer the `tenantScope` Mongoose plugin relies
 * on. Without it, the plugin would have to be passed an explicit
 * scope on every query, which defeats the "forget-proof" goal.
 *
 * Why AsyncLocalStorage (not simple global / not req-on-model)?
 *   • Global: leaks between concurrent requests.
 *   • Req-on-model: requires every caller to pass req, which is
 *     exactly the pattern that already exists and that routes miss.
 *   • AsyncLocalStorage: scope-local to the request, propagates
 *     through await / Promise.all / setTimeout, zero caller boilerplate.
 *
 * Bypassing the scope (for admin jobs, migrations, schedulers):
 *   const { bypass } = require('./requestContext');
 *   await bypass(async () => {
 *     // Queries here run WITHOUT branch filtering.
 *   });
 */

'use strict';

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

/**
 * Express middleware — binds the authenticated request's branchScope
 * (and a few helpers) into the AsyncLocalStorage store. MUST run
 * AFTER `requireBranchAccess` has populated `req.branchScope`.
 *
 * If `req.branchScope` is missing, the context is still established
 * but marked `unscoped: true` so the tenantScope plugin can choose
 * to deny (fail-closed) if it wants to.
 */
const bindRequestContext = (req, _res, next) => {
  const ctx = {
    userId: req.user?.id || req.user?._id || null,
    role: req.user?.role || null,
    branchScope: req.branchScope || { unscoped: true },
    regionIds: req.user?.regionIds || [],
    branchIds: req.user?.branchIds || [],
    // Explicit bypass flag the caller can flip via bypass() below.
    bypassTenantScope: false,
    // Request id for correlation in audit logs written by the plugin.
    requestId: req.requestId || null,
  };
  storage.run(ctx, () => next());
};

/** Get the current request context (or null if outside a request).
 *
 * Tries AsyncLocalStorage first, then falls back to the last-set
 * context (via run()) if ALS has dropped the reference. The fallback
 * covers Mongoose 9's insertMany/aggregate paths where ALS
 * propagation is flaky. Outside any run() call, returns null.
 */
const get = () => {
  const viaAls = storage.getStore();
  if (viaAls) return viaAls;
  return globalThis[Symbol.for('alawael.requestContext.currentFallback')] || null;
};

/**
 * Run a block of code with a fresh context where `bypassTenantScope`
 * is forced to true. Used by scheduled jobs and admin CLIs.
 *
 * Note: the callback is wrapped in an async IIFE so the
 * AsyncLocalStorage store stays alive across every `await` inside
 * `fn` — a bare `storage.run(ctx, fn)` would destroy the store the
 * instant fn returned its promise, and mongoose's query machinery
 * would then see `getStore() === undefined` at execution time.
 */
const bypass = fn => {
  const current = storage.getStore();
  return storage.run({ ...(current || {}), bypassTenantScope: true }, async () => fn());
};

/**
 * Run a block with an explicit pre-built context. Used by tests and
 * by non-HTTP callers (schedulers, Redis workers, etc.) that need to
 * run as a specific user.
 *
 * Mongoose 9's Model-level methods (insertMany, aggregate, collection
 * ops) execute on microtask + setImmediate chains that Node's
 * AsyncLocalStorage normally DOES propagate through — but a known
 * interaction with `async_hooks` in Node 18+ means our ALS store
 * sometimes loses context across those boundaries. As a belt-and-
 * braces measure, we also stash a reference on a dedicated
 * Symbol-keyed global so hooks that can't read ALS can fall back to
 * the most-recent run's context.
 */
const FALLBACK_SYMBOL = Symbol.for('alawael.requestContext.currentFallback');

const run = (ctx, fn) =>
  storage.run(ctx, async () => {
    const prev = globalThis[FALLBACK_SYMBOL];
    globalThis[FALLBACK_SYMBOL] = ctx;
    try {
      return await fn();
    } finally {
      globalThis[FALLBACK_SYMBOL] = prev;
    }
  });

module.exports = { bindRequestContext, get, bypass, run };
