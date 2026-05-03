/**
 * Blockchain Auto-Issue — إصدار تلقائي للشهادات
 *
 * Single funnel for "this thing finished, issue a cert for it" requests
 * coming from any source (LMS course completion, IEP completion, CPE
 * milestone, HR onboarding, etc.). Idempotency-keyed by (source, sourceRef)
 * so the same completion event is safe to fire twice without producing
 * duplicate certs.
 *
 * Feature flag: BLOCKCHAIN_AUTO_ISSUE=1 (off by default — explicit opt-in
 * keeps the change additive; turning the flag off in prod stops new auto-
 * issuance without rolling code).
 *
 * Failure mode: errors are swallowed and counted (`auto_issue.error`). A
 * cert failure must NEVER cascade into the source flow (an LMS course
 * completion shouldn't fail because the chain is degraded).
 */

'use strict';

const certService = require('./blockchainCertService');
const metrics = require('./blockchain/metrics');
const logger = require('../utils/logger');

const SOURCE_DEFAULTS = {
  lms: { category: 'training', titlePrefix: { ar: 'إكمال دورة', en: 'Course Completion' } },
  iep: {
    category: 'rehabilitation',
    titlePrefix: { ar: 'إكمال خطة تعليمية', en: 'IEP Completion' },
  },
  cpe: { category: 'professional', titlePrefix: { ar: 'استكمال التطوير المهني', en: 'CPE Cycle' } },
  onboarding: {
    category: 'compliance',
    titlePrefix: { ar: 'إكمال التهيئة', en: 'Onboarding Completion' },
  },
  training: {
    category: 'training',
    titlePrefix: { ar: 'إنجاز تدريبي', en: 'Training Achievement' },
  },
};

function isEnabled() {
  return String(process.env.BLOCKCHAIN_AUTO_ISSUE || '').trim() === '1';
}

function buildIdempotencyKey(source, sourceRef) {
  return `auto:${source}:${sourceRef}`;
}

function buildTitle(source, payloadTitle) {
  if (payloadTitle?.ar || payloadTitle?.en) return payloadTitle;
  const def = SOURCE_DEFAULTS[source] || { titlePrefix: { ar: 'شهادة', en: 'Certificate' } };
  return def.titlePrefix;
}

function buildCategory(source, override) {
  if (override) return override;
  return SOURCE_DEFAULTS[source]?.category || 'achievement';
}

/**
 * Auto-issue (or no-op) on a completion event.
 *
 * @param {Object} args
 * @param {string} args.source       — discriminator: 'lms' | 'iep' | 'cpe' | 'onboarding' | 'training'
 * @param {string} args.sourceRef    — stable id from the source domain (course enrollment _id, iep _id, …)
 * @param {Object} args.recipient    — { name: { ar, en }, nationalId?, email?, userId? }
 * @param {Object} [args.title]      — { ar, en } — falls back to source default
 * @param {Object} [args.data]       — free-form template data (course title, scores, etc.)
 * @param {string} [args.category]   — overrides the source default
 * @param {Date}   [args.expiryDate]
 * @param {string} [args.userId]     — actor (defaults to system)
 * @param {boolean} [args.skipIssue] — create draft only, don't anchor
 * @returns {Promise<{ ok, certificate?, deduped?, skipped?, reason?, error? }>}
 */
async function autoIssue(args) {
  if (!isEnabled()) {
    return { ok: false, skipped: true, reason: 'auto-issue disabled' };
  }
  const { source, sourceRef, recipient, title, data, category, expiryDate, userId, skipIssue } =
    args || {};

  if (!source || !sourceRef) {
    metrics.bumpAutoIssue(source || 'unknown', 'error');
    return { ok: false, error: 'source and sourceRef required' };
  }
  if (!recipient?.name?.ar && !recipient?.name?.en) {
    metrics.bumpAutoIssue(source, 'error');
    return { ok: false, error: 'recipient.name.ar or .en required' };
  }

  const idempotencyKey = buildIdempotencyKey(source, sourceRef);

  try {
    const created = await certService.createCertificate(
      {
        recipient,
        title: buildTitle(source, title),
        data,
        category: buildCategory(source, category),
        expiryDate,
      },
      { userId, idempotencyKey }
    );

    if (created.deduped) {
      metrics.bumpAutoIssue(source, 'deduped');
      return { ok: true, deduped: true, certificate: created.certificate };
    }

    if (skipIssue) {
      metrics.bumpAutoIssue(source, 'issued'); // draft created counts as success path
      return { ok: true, certificate: created.certificate };
    }

    const issued = await certService.issueCertificate(created.certificate._id, { userId });
    metrics.bumpAutoIssue(source, 'issued');
    return { ok: true, certificate: issued };
  } catch (err) {
    metrics.bumpAutoIssue(source, 'error');
    logger?.warn?.(`[blockchain.autoIssue] ${source}:${sourceRef} failed — ${err?.message || err}`);
    return { ok: false, error: err?.message || String(err) };
  }
}

module.exports = {
  autoIssue,
  isEnabled,
  buildIdempotencyKey,
  buildTitle,
  buildCategory,
  SOURCE_DEFAULTS,
};
