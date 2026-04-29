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
const _base = safeDomain('_base', './_base');
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
function mountAllDomains(app) {
  let mounted = 0;
  for (const [name, domain] of Object.entries(_allDomains)) {
    if (!domain || typeof domain !== 'object') continue;
    const hook =
      typeof domain.mount === 'function'
        ? domain.mount
        : typeof domain.register === 'function'
          ? domain.register
          : null;
    if (!hook) continue;
    try {
      hook(app);
      mounted++;
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
