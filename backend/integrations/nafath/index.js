/**
 * Nafath — Saudi National Digital Identity for e-signature + SSO.
 *
 * Implements ADR-008. Production endpoints, certs, and signing flow
 * are configured via env vars and the adapter config.
 *
 * Exports a stable public API; internals can be swapped.
 */

'use strict';

const { AclClient } = require('../_common/acl-client');
const { InMemoryIntegrationLog } = require('../_common/integration-log');

const config = {
  baseUrl: process.env.NAFATH_BASE_URL || 'https://nafath.sa/api',
  clientId: process.env.NAFATH_CLIENT_ID,
  clientSecret: process.env.NAFATH_CLIENT_SECRET,
  redirectUri: process.env.NAFATH_REDIRECT_URI,
  sandbox: process.env.NAFATH_SANDBOX === 'true',
};

const integrationLog = new InMemoryIntegrationLog();
const client = new AclClient({
  name: 'nafath',
  baseUrl: config.baseUrl,
  integrationLog,
});

/**
 * Create a signature request for a document.
 * @param {{ documentHash: string, signerNationalId: string, purpose: string }} params
 * @returns {Promise<{ requestId: string, authUrl: string }>}
 */
async function createSignatureRequest(_params) {
  // TODO: wire to real Nafath endpoint + CSID signing
  throw new Error('nafath.createSignatureRequest: not implemented (P1)');
}

/**
 * Verify a signed artifact returned by Nafath callback.
 * @param {{ callbackPayload: object }} params
 * @returns {Promise<{ signerNationalId: string, signedAt: string, documentHash: string, verified: boolean }>}
 */
async function verifySignature(_params) {
  throw new Error('nafath.verifySignature: not implemented (P1)');
}

/**
 * Exchange an OIDC authorization code for user identity (SSO flow).
 */
async function exchangeAuthCode(_code) {
  throw new Error('nafath.exchangeAuthCode: not implemented (P1)');
}

module.exports = {
  config,
  client,
  integrationLog,
  createSignatureRequest,
  verifySignature,
  exchangeAuthCode,
};
