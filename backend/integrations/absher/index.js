/**
 * Absher — Saudi citizen/resident identity verification.
 */

'use strict';

const { AclClient } = require('../_common/acl-client');
const { InMemoryIntegrationLog } = require('../_common/integration-log');

const config = {
  baseUrl: process.env.ABSHER_BASE_URL || 'https://absher.sa/api',
  clientId: process.env.ABSHER_CLIENT_ID,
  clientSecret: process.env.ABSHER_CLIENT_SECRET,
  sandbox: process.env.ABSHER_SANDBOX === 'true',
};

const integrationLog = new InMemoryIntegrationLog();
const client = new AclClient({ name: 'absher', baseUrl: config.baseUrl, integrationLog });

/**
 * Verify identity of a Saudi national / resident by national ID.
 * @param {{ nationalId: string, dateOfBirth: string }} params
 * @returns {Promise<{ verified: boolean, name: string, nationality: string }>}
 */
async function verifyIdentity(_params) {
  throw new Error('absher.verifyIdentity: not implemented (P1)');
}

module.exports = { config, client, integrationLog, verifyIdentity };
