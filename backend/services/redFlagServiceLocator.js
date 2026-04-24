/**
 * redFlagServiceLocator.js — Beneficiary-360 Foundation Commit 3a.
 *
 * Resolves a red-flag's declared `trigger.source.service` +
 * `trigger.source.method` into an actual callable. The registry
 * stores those as plain strings on purpose — no dynamic `require`
 * and no string-keyed `global` lookups survive this boundary.
 *
 * Design decisions:
 *
 *   1. The locator is explicit: callers `register(name, obj)` at
 *      bootstrap, and the engine calls `resolve(name, method)` to
 *      get a bound function. An unregistered service throws a
 *      descriptive error naming both the service and the flag id
 *      that asked for it — makes misconfiguration loud and fixable.
 *
 *   2. The registered object must expose the named method as a
 *      plain function. Arrow functions, class methods, anything
 *      callable — fine. Non-functions throw.
 *
 *   3. The locator keeps NO references to the wider module graph.
 *      It cannot require, import, or reach for globals. This is
 *      the guardrail that keeps `trigger.source` from becoming a
 *      remote-code-execution vector if the registry is ever
 *      compromised.
 *
 *   4. `createLocator()` returns a fresh instance. Tests can stand
 *      up a throwaway locator with fake services; production can
 *      build one at bootstrap and inject it into the engine. There
 *      is no module-level singleton — locator state is per-instance.
 */

'use strict';

function createLocator() {
  const services = new Map();

  function register(name, instance) {
    if (typeof name !== 'string' || name.length === 0) {
      throw new Error('redFlagServiceLocator: service name must be a non-empty string');
    }
    if (instance == null || typeof instance !== 'object') {
      throw new Error(
        `redFlagServiceLocator: service '${name}' must be registered with an object instance`
      );
    }
    services.set(name, instance);
  }

  function has(name) {
    return services.has(name);
  }

  function list() {
    return Array.from(services.keys()).sort();
  }

  /**
   * Resolve a (service, method) pair into a bound, invokable function.
   * `forFlagId` is threaded through purely for error messages — it
   * lets the engine produce "flag X asked for Y.Z which is missing"
   * diagnostics without the locator needing to know about flags.
   */
  function resolve(serviceName, methodName, { forFlagId } = {}) {
    const flagHint = forFlagId ? ` (requested by flag '${forFlagId}')` : '';
    if (!services.has(serviceName)) {
      throw new Error(
        `redFlagServiceLocator: service '${serviceName}' is not registered${flagHint}`
      );
    }
    const instance = services.get(serviceName);
    const method = instance[methodName];
    if (typeof method !== 'function') {
      throw new Error(
        `redFlagServiceLocator: '${serviceName}.${methodName}' is not a function${flagHint}`
      );
    }
    return method.bind(instance);
  }

  function clear() {
    services.clear();
  }

  return Object.freeze({ register, has, list, resolve, clear });
}

module.exports = { createLocator };
