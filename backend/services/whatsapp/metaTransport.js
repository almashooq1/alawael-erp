'use strict';

/**
 * Shared Meta Graph signing helper (W1424i).
 * ══════════════════════════════════════════════════════════════════════════
 * Single source of truth for the `appsecret_proof` that EVERY server-side Meta
 * Graph call must carry when the app has "Require App Secret Proof" enabled.
 *
 * Before this module, TWO independent implementations existed and could diverge:
 *   - Path A  services/whatsapp/whatsappService.js  → keyed by WHATSAPP_WEBHOOK_SECRET
 *   - Path B  integrations/whatsapp/providers/metaCloudProvider.js
 *                                                  → WHATSAPP_APP_SECRET || WHATSAPP_WEBHOOK_SECRET
 * If WHATSAPP_APP_SECRET were ever set to a different value, the two senders would
 * sign the SAME token with DIFFERENT secrets and one would be rejected by Meta.
 * Both now resolve the secret HERE with one canonical precedence. (On prod
 * WHATSAPP_APP_SECRET is unset, so this is behaviour-identical to Path A today —
 * a pure consolidation, verified by the W1424i parity test.)
 *
 * NOTE: this intentionally unifies only the SIGNING. The full HTTP request +
 * retry transport is still duplicated between Path A and Path B; merging that is
 * deferred to a session that can run a live send + scheduled-reminder
 * integration test, because Path A's request backs every WhatsApp send.
 */

const crypto = require('crypto');

/**
 * Resolve the Meta app secret (also the webhook-signature secret) with ONE
 * canonical precedence used by both send paths.
 * @returns {string|null}
 */
function resolveAppSecret() {
  return process.env.WHATSAPP_APP_SECRET || process.env.WHATSAPP_WEBHOOK_SECRET || null;
}

/**
 * appsecret_proof = HMAC-SHA256(accessToken) keyed by the app secret, hex-encoded.
 * Returns null when either the access token or an app secret is missing (so the
 * caller simply omits the query param — matching Meta when the toggle is off).
 * @param {string} accessToken
 * @param {string|null} [appSecret] — defaults to resolveAppSecret()
 * @returns {string|null}
 */
function appsecretProof(accessToken, appSecret = resolveAppSecret()) {
  if (!appSecret || !accessToken) return null;
  return crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex');
}

/**
 * Append `appsecret_proof` to a URL or path as a query param, when computable.
 * @param {string} urlOrPath
 * @param {string} accessToken
 * @param {string|null} [appSecret]
 * @returns {string}
 */
function withProof(urlOrPath, accessToken, appSecret = resolveAppSecret()) {
  const proof = appsecretProof(accessToken, appSecret);
  if (!proof) return urlOrPath;
  return urlOrPath + (urlOrPath.includes('?') ? '&' : '?') + 'appsecret_proof=' + proof;
}

module.exports = { resolveAppSecret, appsecretProof, withProof };
