/**
 * Madaa — Salary card disbursement (primarily non-Saudi workers).
 *
 * Payroll run → generate Madaa SFTP payload → upload to bank SFTP endpoint.
 * This adapter exposes the payload generator + a stub for the actual transfer.
 */

'use strict';

const { InMemoryIntegrationLog } = require('../_common/integration-log');

const config = {
  sftpHost: process.env.MADAA_SFTP_HOST,
  sftpUser: process.env.MADAA_SFTP_USER,
  sftpKeyRef: process.env.MADAA_SFTP_KEY_REF, // reference to secret in vault
  outputDir: process.env.MADAA_OUTPUT_DIR || './exports/madaa',
  sandbox: process.env.MADAA_SANDBOX === 'true',
};

const integrationLog = new InMemoryIntegrationLog();

/**
 * Build a Madaa-compatible salary file payload.
 * @param {{ runId: string, employees: Array<{id,iqama,accountNumber,amount,currency}> }} params
 * @returns {{ filename: string, content: string }}
 */
function buildPayload({ runId, employees }) {
  if (!runId) throw new Error('madaa.buildPayload: runId required');
  if (!Array.isArray(employees) || !employees.length) {
    throw new Error('madaa.buildPayload: employees required');
  }
  // Placeholder format — replace with actual Madaa spec during P1 implementation.
  const header = `H|${runId}|${employees.length}|${new Date().toISOString()}`;
  const lines = employees.map(e =>
    ['D', e.id, e.iqama, e.accountNumber, e.amount, e.currency || 'SAR'].join('|')
  );
  const footer = `F|${runId}|${employees.length}`;
  const content = [header, ...lines, footer].join('\n');
  return { filename: `madaa-${runId}.txt`, content };
}

async function uploadPayload(_payload) {
  throw new Error('madaa.uploadPayload: not implemented (P1) — will use ssh2-sftp-client');
}

module.exports = { config, integrationLog, buildPayload, uploadPayload };
