'use strict';

/**
 * access-review-templates.service.js — Wave 80.
 *
 * Pure resolver on top of the static Wave-80 template registry.
 * Given a templateId and a candidate-actor list (typically a
 * User.find() projection from the IAM layer), returns the subset of
 * actors that match the template's filter — ready to feed into the
 * Wave-74 scheduler's `buildReviewerQueues`.
 *
 * Public API:
 *   listTemplates()                          — passthrough to registry
 *   getTemplate(id)                          — passthrough
 *   resolveTemplate({ templateId, actors })  — { ok, matched, total, template }
 *                                              | { ok:false, reason }
 *
 * Filter semantics (mirrors registry.filter shape):
 *   roles                  — actor.roles must include AT LEAST ONE
 *   rolesAll               — actor.roles must include ALL of these
 *   highSensitivityOnly    — actor must hold any HIGH_SENSITIVITY_ROLES
 *   serviceAccountsOnly    — actor.isServiceAccount === true
 *   tempElevatedOnly       — actor.isTempElevated === true
 *   scopes                 — actor.scope must match one of these
 *   branchIds              — actor.branchId must match one of these
 *   dormantAtLeastDays     — actor.lastUsedAt older than N days
 *
 * All criteria are AND-combined. An empty filter matches all actors.
 * Pure function — no I/O, no DB.
 */

const reg = require('./access-review.registry');
const tplReg = require('./access-review-templates.registry');

function _isHighSensitivity(roles) {
  if (!Array.isArray(roles)) return false;
  return roles.some(r => reg.isHighSensitivity(r));
}

function _daysSince(date, now) {
  if (!date) return Infinity;
  const t = new Date(date).getTime();
  if (Number.isNaN(t)) return Infinity;
  return Math.floor((now.getTime() - t) / (24 * 60 * 60 * 1000));
}

function _matchesFilter(actor, filter, now) {
  if (!filter || typeof filter !== 'object') return true;
  const f = filter;
  const roles = Array.isArray(actor.roles) ? actor.roles : [];

  if (Array.isArray(f.roles) && f.roles.length > 0) {
    if (!f.roles.some(r => roles.includes(r))) return false;
  }
  if (Array.isArray(f.rolesAll) && f.rolesAll.length > 0) {
    if (!f.rolesAll.every(r => roles.includes(r))) return false;
  }
  if (f.highSensitivityOnly === true) {
    if (!_isHighSensitivity(roles)) return false;
  }
  if (f.serviceAccountsOnly === true) {
    if (actor.isServiceAccount !== true) return false;
  }
  if (f.tempElevatedOnly === true) {
    if (actor.isTempElevated !== true) return false;
  }
  if (Array.isArray(f.scopes) && f.scopes.length > 0) {
    if (!actor.scope || !f.scopes.includes(actor.scope)) return false;
  }
  if (Array.isArray(f.branchIds) && f.branchIds.length > 0) {
    if (!actor.branchId || !f.branchIds.includes(actor.branchId)) return false;
  }
  if (typeof f.dormantAtLeastDays === 'number' && f.dormantAtLeastDays > 0) {
    if (_daysSince(actor.lastUsedAt, now) < f.dormantAtLeastDays) return false;
  }
  return true;
}

/**
 * @param {object} opts
 *   - logger
 *   - now  — () => Date  (for tests)
 */
function createAccessReviewTemplatesService({ logger = console, now = () => new Date() } = {}) {
  void logger;

  function listTemplates() {
    return tplReg.listTemplates();
  }

  function getTemplate(id) {
    return tplReg.getTemplate(id);
  }

  /**
   * Resolve a template against a candidate actor list.
   *
   * @param {object} input
   *   - templateId : string
   *   - actors     : array of { userId, roles, scope?, branchId?,
   *                              isServiceAccount?, isTempElevated?,
   *                              lastUsedAt? }
   * @returns
   *   { ok: true, templateId, template, matched: actors[], total: number,
   *     suggestedReviewType, suggestedCadence, dormancyThresholds? }
   *   | { ok: false, reason: 'TEMPLATE_NOT_FOUND' | 'ACTORS_MUST_BE_ARRAY' }
   */
  function resolveTemplate({ templateId, actors } = {}) {
    const tpl = tplReg.getTemplate(templateId);
    if (!tpl) return { ok: false, reason: 'TEMPLATE_NOT_FOUND' };
    if (!Array.isArray(actors)) return { ok: false, reason: 'ACTORS_MUST_BE_ARRAY' };

    const nowDate = now();
    const matched = actors.filter(a => a && _matchesFilter(a, tpl.filter, nowDate));

    const out = {
      ok: true,
      templateId,
      template: { ...tpl },
      matched,
      total: matched.length,
      suggestedReviewType: tpl.reviewType,
      suggestedCadence: tpl.defaultCadence,
    };
    if (tpl.thresholds) out.dormancyThresholds = { ...tpl.thresholds };
    return out;
  }

  return {
    listTemplates,
    getTemplate,
    resolveTemplate,
  };
}

module.exports = {
  createAccessReviewTemplatesService,
};
