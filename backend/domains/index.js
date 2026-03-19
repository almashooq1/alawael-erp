/**
 * Domain Registry — سجل الدومينات
 *
 * Central registry that discovers, initializes, and mounts all domain modules.
 * Works alongside the existing routes/_registry.js for backward compatibility.
 *
 * @module domains/index
 */

const logger = require('../utils/logger');
const { BaseDomainModule } = require('./_base/BaseDomainModule');

// ─── Registry State ──────────────────────────────────────────────────────────
const _domains = new Map();

/**
 * Register a domain module
 * @param {BaseDomainModule} domain
 */
const registerDomain = domain => {
  if (!(domain instanceof BaseDomainModule)) {
    throw new Error('Domain must be an instance of BaseDomainModule');
  }
  if (_domains.has(domain.name)) {
    logger.warn(`[DomainRegistry] Domain "${domain.name}" already registered, skipping`);
    return;
  }
  _domains.set(domain.name, domain);
  logger.info(`[DomainRegistry] Registered domain: ${domain.name} (v${domain.version})`);
};

/**
 * Initialize all registered domains
 */
const initializeAllDomains = async () => {
  const sorted = _topologicalSort([..._domains.values()]);

  for (const domain of sorted) {
    try {
      await domain.initialize();
    } catch (error) {
      logger.error(
        `[DomainRegistry] Failed to initialize domain "${domain.name}": ${error.message}`
      );
    }
  }

  logger.info(`[DomainRegistry] Initialized ${_domains.size} domains`);
};

/**
 * Mount all initialized domains on Express app
 * @param {import('express').Express} app
 */
const mountAllDomains = app => {
  let mounted = 0;
  for (const [name, domain] of _domains) {
    try {
      if (domain._initialized) {
        domain.mount(app);
        mounted++;
      } else {
        logger.warn(`[DomainRegistry] Skipping unmounted domain "${name}" (not initialized)`);
      }
    } catch (error) {
      logger.error(`[DomainRegistry] Failed to mount domain "${name}": ${error.message}`);
    }
  }
  logger.info(`[DomainRegistry] Mounted ${mounted}/${_domains.size} domains`);
};

/**
 * Get a registered domain by name
 * @param {string} name
 * @returns {BaseDomainModule|undefined}
 */
const getDomain = name => _domains.get(name);

/**
 * List all registered domains
 */
const listDomains = () => {
  return [..._domains.values()].map(d => d.getInfo());
};

/**
 * Run health checks for all domains
 */
const healthCheckAll = async () => {
  const results = {};
  for (const [name, domain] of _domains) {
    results[name] = await domain.runHealthChecks();
  }
  return results;
};

/**
 * API endpoint: Domain registry info
 * @param {import('express').Express} app
 */
const mountRegistryEndpoints = app => {
  app.get('/api/v2/domains', (_req, res) => {
    res.json({
      success: true,
      domains: listDomains(),
      total: _domains.size,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/v2/domains/health', async (_req, res) => {
    const health = await healthCheckAll();
    const allHealthy = Object.values(health).every(h => h.healthy);
    res.status(allHealthy ? 200 : 503).json({
      success: true,
      status: allHealthy ? 'healthy' : 'degraded',
      domains: health,
      timestamp: new Date().toISOString(),
    });
  });
};

// ─── Topological Sort for Dependency Order ───────────────────────────────────
function _topologicalSort(domains) {
  const visited = new Set();
  const sorted = [];
  const domainMap = new Map(domains.map(d => [d.name, d]));

  function visit(domain) {
    if (visited.has(domain.name)) return;
    visited.add(domain.name);
    for (const dep of domain.dependencies) {
      if (domainMap.has(dep)) {
        visit(domainMap.get(dep));
      }
    }
    sorted.push(domain);
  }

  for (const domain of domains) {
    visit(domain);
  }
  return sorted;
}

module.exports = {
  registerDomain,
  initializeAllDomains,
  mountAllDomains,
  getDomain,
  listDomains,
  healthCheckAll,
  mountRegistryEndpoints,
};
