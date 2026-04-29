/**
 * Domain Registry — سجل النطاقات الرئيسي
 * ══════════════════════════════════════════════════════════════════════════
 * Central entry point for all domain modules.
 * 24 bounded contexts — 3 original + 21 activated.
 *
 * Usage:
 *   const domains = require('./domains');
 *   await domains.notifications.send({ ... });
 *   await domains.hr.employee.create({ ... });
 *   await domains.security.roles.getAll();
 *
 * @module domains
 */

const logger = require('../utils/logger');

function safeDomain(name, path) {
  try {
    return require(path);
  } catch (err) {
    logger.warn(`[Domains] Failed to load domain "${name}": ${err.message}`);
    return {};
  }
}

// ─── Core (originally active) ────────────────────────────────────────────────
const notifications = require('./notifications');
const hr = require('./hr');
const security = require('./security');

// ─── Activated domains (substantial code) ────────────────────────────────────
// _base is a directory of base classes (BaseDomainModule, BaseService,
// BaseRepository, ...), not a domain — there's no _base/index.js. Each
// concrete domain requires its base classes directly via
// `require('../_base/BaseDomainModule')`. We keep the placeholder
// reference so the module exports key set stays stable for any consumer
// iterating `Object.keys(domains)`, but resolve it to {} without trying
// the require (which used to log "Failed to load domain '_base'" on
// every boot).
const _base = {};
const aiRecommendations = safeDomain('ai-recommendations', './ai-recommendations');
const arVr = safeDomain('ar-vr', './ar-vr');
const assessments = safeDomain('assessments', './assessments');
const behavior = safeDomain('behavior', './behavior');
const carePlans = safeDomain('care-plans', './care-plans');
const core = safeDomain('core', './core');
const dashboards = safeDomain('dashboards', './dashboards');
const episodes = safeDomain('episodes', './episodes');
const family = safeDomain('family', './family');
const fieldTraining = safeDomain('field-training', './field-training');
const goals = safeDomain('goals', './goals');
const groupTherapy = safeDomain('group-therapy', './group-therapy');
const programs = safeDomain('programs', './programs');
const quality = safeDomain('quality', './quality');
const reports = safeDomain('reports', './reports');
const research = safeDomain('research', './research');
const sessions = safeDomain('sessions', './sessions');
const teleRehab = safeDomain('tele-rehab', './tele-rehab');
const timeline = safeDomain('timeline', './timeline');
const workflow = safeDomain('workflow', './workflow');

const _allDomains = {
  // Core (original)
  notifications,
  hr,
  security,
  // Infrastructure
  _base,
  // Beneficiary & Care
  core, // beneficiary profiles, 360° view
  episodes, // episodes of care
  carePlans, // unified care plans
  timeline, // care timeline
  // Rehabilitation
  assessments, // clinical assessments
  sessions, // clinical sessions
  goals, // goal bank & measures library
  programs, // rehabilitation programs
  groupTherapy, // group therapy sessions
  behavior, // behavior management
  family, // family engagement
  teleRehab, // tele-rehabilitation
  arVr, // AR/VR rehabilitation
  // AI & Analytics
  aiRecommendations, // AI recommendation engine
  dashboards, // KPI dashboards & decision support
  reports, // report templates & generation
  // Quality & Training
  quality, // quality management & compliance
  fieldTraining, // field training programs
  research, // clinical research
  // Workflow
  workflow, // intelligent workflow engine
};

// Walk every domain and call its `mount`/`register` hook (whichever the
// domain exposes) on the Express app. Domains that don't expose either
// are silently skipped — they're library-only at this point.
//
// BaseDomainModule subclasses require `.initialize()` before `.mount()`
// — kick that off synchronously when present (the implementation only
// `await`s when truly needed; the registerRoutes path is sync). We
// keep .mount(app) as a method call so `this` stays bound.
function mountAllDomains(app) {
  let mounted = 0;
  for (const [name, domain] of Object.entries(_allDomains)) {
    if (!domain || typeof domain !== 'object') continue;
    try {
      // BaseDomainModule.initialize is async-flagged but its body runs
      // synchronously (just registerRoutes + registerMiddleware). We
      // call without await so `_initialized = true` lands before the
      // next line — anything truly async needs an explicit boot phase.
      if (typeof domain.initialize === 'function' && domain._initialized === false) {
        domain.initialize();
      }
      if (typeof domain.mount === 'function') {
        domain.mount(app);
        mounted++;
      } else if (typeof domain.register === 'function') {
        domain.register(app);
        mounted++;
      }
    } catch (err) {
      logger.warn(`[Domains] mount failed for "${name}": ${err.message}`);
    }
  }
  if (mounted) logger.info(`[Domains] Mounted ${mounted} domain(s)`);
  return mounted;
}

// Best-effort aggregate health check across every domain that exposes
// a `health()`/`healthCheck()` method.
async function healthCheckAll() {
  const results = {};
  for (const [name, domain] of Object.entries(_allDomains)) {
    if (!domain || typeof domain !== 'object') continue;
    const probe =
      typeof domain.health === 'function'
        ? domain.health
        : typeof domain.healthCheck === 'function'
          ? domain.healthCheck
          : null;
    if (!probe) {
      results[name] = { status: 'unknown' };
      continue;
    }
    try {
      results[name] = (await probe()) || { status: 'ok' };
    } catch (err) {
      results[name] = { status: 'error', error: err.message };
    }
  }
  return results;
}

module.exports = {
  ..._allDomains,
  mountAllDomains,
  healthCheckAll,
};
