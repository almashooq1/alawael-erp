/**
 * ssoAudit.service.js — fire-and-forget audit-event recorder (W205h).
 *
 * Routes call `recordAudit(req, { action, ... })` from any privileged
 * admin endpoint. The model is lazy-required so tests without Mongo
 * can stub it out via jest.mock. Failures NEVER block the operation
 * being audited — we'd rather miss an audit row than reject a force
 * logout that the operator needs to perform.
 *
 * Use cases covered by the canonical action strings:
 *   sso.session.end                — force-end one session
 *   sso.session.logout-all         — kill every session of a user
 *   sso.oauth-client.register      — new client
 *   sso.oauth-client.deactivate    — soft delete
 *   sso.oauth-client.rotate-secret — W205g rotation
 *   sso.jwks.fetch                 — anyone fetching JWKS (sampled — high volume)
 *   sso.mfa.bypass                 — for completeness if/when we add break-glass
 *
 * Add new strings freely; this is a soft contract.
 */

'use strict';

const logger = require('../utils/logger');

let _Model = null;
function getModel() {
  if (!_Model) {
    try {
      _Model = require('../models/SsoAuditEvent');
    } catch (err) {
      logger.warn('[sso-audit] SsoAuditEvent model unavailable:', err.message);
      _Model = null;
    }
  }
  return _Model;
}

function clientIp(req) {
  if (!req) return undefined;
  const fwd = req.headers?.['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || undefined;
}

/**
 * Record an audit event. Resolves to the saved doc (or null on failure).
 * Never throws — failures are logged and swallowed so the calling route
 * can complete its primary action regardless.
 *
 * @param {import('express').Request|null} req  request for ip+ua+actor (may be null in cron context)
 * @param {object} opts
 * @param {string} opts.action       e.g. 'sso.session.end'
 * @param {string} [opts.targetType] e.g. 'session' | 'oauth_client' | 'user'
 * @param {string} [opts.targetId]   stringified id of the target
 * @param {object} [opts.metadata]   extra context
 * @param {string} [opts.outcome]    'success' (default) | 'failure'
 * @param {string} [opts.errorMessage]
 */
async function recordAudit(req, opts) {
  try {
    const Model = getModel();
    if (!Model) return null;

    const user = req?.user || {};
    const doc = {
      action: opts.action,
      actorUserId: user.userId || undefined,
      actorRole: user.role || undefined,
      actorEmail: user.email || undefined,
      targetType: opts.targetType,
      targetId: opts.targetId,
      metadata: opts.metadata || {},
      ipAddress: clientIp(req),
      userAgent: req?.get?.('user-agent'),
      outcome: opts.outcome || 'success',
      errorMessage: opts.errorMessage,
    };
    return await Model.create(doc);
  } catch (err) {
    logger.warn('[sso-audit] record failed (non-fatal):', err.message);
    return null;
  }
}

/**
 * Convenience wrapper: record a failure with err.message + stack.
 */
async function recordAuditFailure(req, opts, err) {
  return recordAudit(req, {
    ...opts,
    outcome: 'failure',
    errorMessage: err?.message || String(err),
  });
}

module.exports = { recordAudit, recordAuditFailure };
