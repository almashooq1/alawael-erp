/**
 * Wasel / CHI — Council of Health Insurance.
 *
 * Verifies coverage, submits claims, and polls reimbursement status
 * for qualifying rehabilitation services.
 */

'use strict';

const { AclClient } = require('../_common/acl-client');
const { InMemoryIntegrationLog } = require('../_common/integration-log');

const config = {
  baseUrl: process.env.WASEL_BASE_URL || 'https://wasel.chi.gov.sa/api',
  providerCode: process.env.WASEL_PROVIDER_CODE,
  apiKey: process.env.WASEL_API_KEY,
  sandbox: process.env.WASEL_SANDBOX === 'true',
};

const integrationLog = new InMemoryIntegrationLog();
const client = new AclClient({ name: 'wasel', baseUrl: config.baseUrl, integrationLog });

/**
 * Check coverage for a beneficiary at the point of service.
 * @param {{ nationalId: string, serviceCode: string, serviceDate: string }} params
 */
async function checkCoverage(_params) {
  throw new Error('wasel.checkCoverage: not implemented (P1)');
}

/**
 * Submit a claim for a delivered service.
 */
async function submitClaim(_params) {
  throw new Error('wasel.submitClaim: not implemented (P1)');
}

/**
 * Poll or receive webhook for claim status updates.
 */
async function getClaimStatus(_claimId) {
  throw new Error('wasel.getClaimStatus: not implemented (P1)');
}

module.exports = { config, client, integrationLog, checkCoverage, submitClaim, getClaimStatus };
