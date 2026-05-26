/**
 * nphies-webhook.routes.js — receiver for NPHIES async callbacks.
 *
 * Mount at /api/v1/webhooks/nphies.
 *
 * Auth: no user-level auth — provider-to-provider. Secured via the shared
 * webhookHmac middleware. Requires the app to have `express.json({ verify })`
 * wired globally so `req.rawBody` is available for signature verification.
 *
 * Env:
 *   NPHIES_WEBHOOK_SECRET — shared secret from the CHI provisioning email
 *   NPHIES_WEBHOOK_HEADER — header name (default 'X-NPHIES-Signature')
 *   NPHIES_WEBHOOK_PREFIX — signature prefix to strip (default 'sha256=')
 *
 * Behaviour:
 *   - 200 on success OR on "unknown claimReference" — NPHIES retries 4xx.
 *   - 401 on signature mismatch (handled by the middleware).
 *   - 500 only on genuine internal error so the retry mechanism kicks in.
 */

'use strict';

const express = require('express');
const router = express.Router();

const verifyWebhookHmac = require('../middleware/webhookHmac.middleware');
const { defaultService } = require('../services/nphiesReconciliationService');
const safeError = require('../utils/safeError');
const logger = require('../utils/logger');

function _normalizePayload(raw) {
  // NPHIES envelopes vary by bundle version; extract the fields we care about
  // regardless of nesting depth.
  const src = raw || {};
  const sub = src.submission || src.data || src;
  return {
    claimReference: sub.claimReference || sub.reference || src.claimReference,
    status: sub.status || src.status,
    reason: sub.reason || src.reason,
    message: sub.message || src.message,
    approvedAmount: sub.approvedAmount,
    remainingBalance: sub.remainingBalance ?? sub.patientShare,
    mode: src.mode || 'live',
    receivedAt: new Date().toISOString(),
  };
}

// W457: NPHIES webhook secret MUST be set in production. Pre-W457 a
// missing env defaulted to the literal 'nphies-dev-secret-change-me'
// which an attacker could read from this source file → forge HMAC
// signatures and inject fake claim-status updates (e.g. mark a denied
// claim as approved, or vice versa).
const _NPHIES_WEBHOOK_SECRET = (() => {
  const v = process.env.NPHIES_WEBHOOK_SECRET;
  if (v) return v;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'NPHIES_WEBHOOK_SECRET is required in production — refusing to start with a known default'
    );
  }
  // dev/test only — emit warning

  console.warn('[nphies-webhook] NPHIES_WEBHOOK_SECRET unset — using non-prod fallback');
  return 'nphies-dev-secret-change-me';
})();

router.post(
  '/',
  verifyWebhookHmac({
    secret: _NPHIES_WEBHOOK_SECRET,
    header: process.env.NPHIES_WEBHOOK_HEADER || 'X-NPHIES-Signature',
    prefix: process.env.NPHIES_WEBHOOK_PREFIX || 'sha256=',
    encoding: 'hex',
    name: 'nphies',
  }),
  async (req, res) => {
    try {
      const payload = _normalizePayload(req.body);
      if (!payload.claimReference) {
        // Still 200 so NPHIES doesn't retry a malformed payload forever.
        logger.warn('[nphies-webhook] missing claimReference', { body: req.body });
        return res.status(200).json({ accepted: false, reason: 'MISSING_REFERENCE' });
      }
      const result = await defaultService.processWebhook(payload);
      if (!result.matched) {
        return res
          .status(200)
          .json({ accepted: true, matched: false, claimReference: payload.claimReference });
      }
      return res.status(200).json({
        accepted: true,
        matched: true,
        claimId: result.claimId,
        status: result.after?.nphies?.submission?.status,
      });
    } catch (err) {
      return safeError(res, err, 'nphies-webhook');
    }
  }
);

module.exports = router;
