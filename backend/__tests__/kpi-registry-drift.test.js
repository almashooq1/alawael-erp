/**
 * kpi-registry-drift.test.js — service/method existence assertions.
 *
 * The KPI catalogue in config/kpi.registry.js declares a
 * `dataSource.service` + `dataSource.method` for every indicator. This
 * test makes sure those declarations do not drift away from the actual
 * codebase. If a KPI points at a service or method that no longer exists,
 * the test fails with a clear list so the registry can be repaired before
 * dashboards start rendering "unknown" for live indicators.
 *
 * The test is read-only: it requires modules and inspects exports, but
 * never calls DB-dependent methods.
 *
 * Known drift is tracked in KNOWN_DRIFT. Removing a fixed service/method
 * from that list is part of the cleanup, and the test will remind you if
 * an allowlisted issue disappears.
 */

'use strict';

const path = require('path');
const fs = require('fs');
const { KPIS } = require('../config/kpi.registry');

// Directories where service modules may live. Order matters: more specific
// locations are checked before broader fallback directories.
const SERVICE_SEARCH_ROOTS = [
  path.join(__dirname, '..', 'services'),
  path.join(__dirname, '..', 'services', 'reporting', 'builders'),
  path.join(__dirname, '..', 'rehabilitation-services'),
  path.join(__dirname, '..', 'api', 'services'),
];

// Auto-discover domain service folders so newly-added domains are picked up.
const DOMAINS_SERVICES_ROOT = path.join(__dirname, '..', 'domains');
if (fs.existsSync(DOMAINS_SERVICES_ROOT)) {
  for (const entry of fs.readdirSync(DOMAINS_SERVICES_ROOT, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const svcDir = path.join(DOMAINS_SERVICES_ROOT, entry.name, 'services');
    if (fs.existsSync(svcDir)) SERVICE_SEARCH_ROOTS.push(svcDir);
  }
}

/**
 * Known drift allowlist. Each entry is `${kpiId}: ${message}`.
 * These are the service/method pairs that are declared in the registry but
 * are not yet implemented. Phase-2 work should shrink this list.
 */
const KNOWN_DRIFT = new Set([
  // All previously-known drift entries have been resolved.
  // Keep this allowlist empty so any new drift fails the test immediately.
]);

function toPascalCase(serviceName) {
  return serviceName.replace(/(^[a-z])|(_[a-z])/g, m => m.replace('_', '').toUpperCase());
}

function resolveServiceFile(serviceName) {
  const candidates = [`${serviceName}.js`, `${serviceName}.service.js`];
  for (const root of SERVICE_SEARCH_ROOTS) {
    for (const file of candidates) {
      const full = path.join(root, file);
      if (fs.existsSync(full)) return full;
    }
  }
  return null;
}

function loadService(serviceName) {
  const file = resolveServiceFile(serviceName);
  if (!file) return { file: null, mod: null };
  // Clear the require cache so a renamed service does not hide behind a stale load.
  delete require.cache[require.resolve(file)];
  return { file, mod: require(file) };
}

function hasMethod(mod, methodName, serviceName) {
  if (!mod) return false;
  // Plain object/factory exports: direct method on the module.
  if (typeof mod[methodName] === 'function') return true;
  // Factory pattern: create<ServiceName>() returns an instance with the method.
  const pascal = toPascalCase(serviceName);
  const factoryName = `create${pascal}`;
  const factory = mod[factoryName];
  if (typeof factory === 'function') {
    try {
      const instance = factory({});
      if (instance && typeof instance[methodName] === 'function') return true;
    } catch {
      // Factory may need real deps; fall through to failure.
    }
  }
  // Default-export factory: module.exports itself is a factory.
  if (typeof mod === 'function') {
    try {
      const instance = mod({});
      if (instance && typeof instance[methodName] === 'function') return true;
    } catch {
      // Ignore — real instantiation requires dependencies.
    }
  }
  return false;
}

function buildIssueKey(kpiId, message) {
  return `${kpiId}: ${message}`;
}

describe('KPI registry — service/method drift', () => {
  const drift = [];
  const seen = new Map(); // serviceName -> { file, mod }

  beforeAll(() => {
    for (const kpi of KPIS) {
      const { service, method } = kpi.dataSource || {};
      if (!service || !method) {
        const base = 'missing service or method';
        drift.push({
          kpiId: kpi.id,
          message: base,
          allowlistKey: buildIssueKey(kpi.id, base),
        });
        continue;
      }
      let resolved = seen.get(service);
      if (!resolved) {
        resolved = loadService(service);
        seen.set(service, resolved);
      }
      if (!resolved.mod) {
        const base = `service '${service}' not found in any service directory`;
        drift.push({ kpiId: kpi.id, message: base, allowlistKey: buildIssueKey(kpi.id, base) });
        continue;
      }
      if (!hasMethod(resolved.mod, method, service)) {
        const exported = Object.keys(resolved.mod || {});
        const base = `method '${method}' not found on service '${service}'`;
        const detail = `${base} (file: ${resolved.file}, exports: [${exported.join(', ')}])`;
        drift.push({ kpiId: kpi.id, message: detail, allowlistKey: buildIssueKey(kpi.id, base) });
      }
    }
  });

  it('does not introduce new drift beyond the known allowlist', () => {
    const unknown = drift.filter(d => !KNOWN_DRIFT.has(d.allowlistKey));
    if (unknown.length) {
      throw new Error(
        `New KPI registry drift detected (${unknown.length} issue(s)):\n  - ${unknown
          .map(d => `${d.kpiId}: ${d.message}`)
          .join('\n  - ')}`
      );
    }
  });

  it('does not keep allowlisted entries that have been fixed', () => {
    const currentKeys = new Set(drift.map(d => d.allowlistKey));
    const stale = [...KNOWN_DRIFT].filter(k => !currentKeys.has(k));
    if (stale.length) {
      throw new Error(
        `The following KNOWN_DRIFT entries are no longer drifting and should be removed:\n  - ${stale.join(
          '\n  - '
        )}`
      );
    }
  });

  it('lists every service directory that was scanned', () => {
    expect(SERVICE_SEARCH_ROOTS.length).toBeGreaterThan(0);
    for (const root of SERVICE_SEARCH_ROOTS) {
      expect(fs.existsSync(root)).toBe(true);
    }
  });
});
