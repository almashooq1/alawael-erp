/**
 * Yakeen — Civil registry verification (Saudi).
 *
 * Used by BC-03 Intake to validate national IDs and family relationships
 * before admitting a beneficiary.
 */

'use strict';

const { AclClient } = require('../_common/acl-client');
const { InMemoryIntegrationLog } = require('../_common/integration-log');

const config = {
  baseUrl: process.env.YAKEEN_BASE_URL || 'https://yakeen.sa/api',
  apiKey: process.env.YAKEEN_API_KEY,
  sandbox: process.env.YAKEEN_SANDBOX === 'true',
};

const integrationLog = new InMemoryIntegrationLog();
const client = new AclClient({ name: 'yakeen', baseUrl: config.baseUrl, integrationLog });

/**
 * Look up a person by national ID + date of birth.
 * @param {{ nationalId: string, dateOfBirth: string }} params
 * @returns {Promise<{ firstName: string, lastName: string, gender: string, nationality: string }>}
 */
async function lookupPerson(_params) {
  throw new Error('yakeen.lookupPerson: not implemented (P1)');
}

/**
 * Verify a parent/guardian relationship to a minor.
 */
async function verifyGuardianship(_params) {
  throw new Error('yakeen.verifyGuardianship: not implemented (P1)');
}

module.exports = { config, client, integrationLog, lookupPerson, verifyGuardianship };
