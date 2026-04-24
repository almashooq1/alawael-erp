/**
 * Webhook HMAC Verifier — unified middleware for authenticating incoming
 * webhooks from external providers (ZATCA, payment gateways, Twilio,
 * SendGrid, Meta WhatsApp, custom partners).
 *
 * Each provider signs the request body with a shared secret. This middleware
 * re-computes the signature from the raw body and rejects mismatches with
 * 401 before any business logic runs.
 *
 * Requires the Express app to expose the raw body. The simplest wiring is to
 * mount `express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } })`
 * globally, or add it on the webhook router only.
 *
 * Provider configs:
 *   {
 *     secret:      process.env.XYZ_WEBHOOK_SECRET,
 *     algo:        'sha256'           (default)
 *     header:      'X-Signature'      (header name)
 *     prefix:      'sha256='          (optional prefix to strip)
 *     encoding:    'hex' | 'base64'   (default 'hex')
 *     timestampHeader: 'X-Timestamp'  (optional replay-protection)
 *     toleranceSec: 300               (reject if |now - ts| exceeds, default 5min)
 *     payload:     (req) => req.rawBody  (custom builder, e.g. "ts.body")
 *   }
 */

'use strict';

const crypto = require('crypto');

function verifyWebhookHmac(config = {}) {
  const {
    secret,
    algo = 'sha256',
    header = 'X-Signature',
    prefix = '',
    encoding = 'hex',
    timestampHeader = null,
    toleranceSec = 300,
    payload,
  } = config;

  if (!secret) {
    throw new Error('verifyWebhookHmac: secret is required');
  }
  if (!['hex', 'base64'].includes(encoding)) {
    throw new Error("verifyWebhookHmac: encoding must be 'hex' or 'base64'");
  }

  return function webhookHmacMiddleware(req, res, next) {
    const sigHeader = req.get(header);
    if (!sigHeader) {
      return res.status(401).json({ error: 'MISSING_SIGNATURE', header });
    }

    const provided =
      prefix && sigHeader.startsWith(prefix) ? sigHeader.slice(prefix.length) : sigHeader;

    let ts = null;
    if (timestampHeader) {
      ts = req.get(timestampHeader);
      if (!ts) return res.status(401).json({ error: 'MISSING_TIMESTAMP', header: timestampHeader });
      const tsNum = Number(ts);
      if (!Number.isFinite(tsNum)) return res.status(401).json({ error: 'INVALID_TIMESTAMP' });
      const skew = Math.abs(Math.floor(Date.now() / 1000) - tsNum);
      if (skew > toleranceSec)
        return res.status(401).json({ error: 'TIMESTAMP_OUT_OF_TOLERANCE', skew });
    }

    const bodyBuf = typeof payload === 'function' ? payload(req, ts) : req.rawBody;
    if (!bodyBuf) {
      return res.status(400).json({
        error: 'RAW_BODY_UNAVAILABLE',
        message: 'Enable express.json({ verify }) to expose req.rawBody',
      });
    }

    const expected = crypto
      .createHmac(algo, secret)
      .update(typeof bodyBuf === 'string' ? bodyBuf : Buffer.from(bodyBuf))
      .digest(encoding);

    if (!_safeEqual(expected, provided)) {
      return res.status(401).json({ error: 'SIGNATURE_MISMATCH' });
    }

    req.webhookVerified = { provider: config.name || null, algo, at: Date.now() };
    return next();
  };
}

function _safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

module.exports = verifyWebhookHmac;
module.exports.default = verifyWebhookHmac;
