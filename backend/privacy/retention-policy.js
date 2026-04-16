/**
 * Retention policy declarations.
 *
 * Each data category has a retention period (years) and an archival
 * destination. A background job reads these to move or delete records.
 *
 * Values reflect ADR-007 § Data Retention.
 */

'use strict';

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const POLICIES = {
  clinical: { years: 15, tier: 'cold_after_2y', reason: 'MoH requirement' },
  financial: { years: 10, tier: 'cold_after_2y', reason: 'ZATCA + corporate law' },
  hr: { years: 7, tier: 'cold_after_1y', reason: 'labor law retention' },
  marketing_consent: { years: 3, tier: 'active', reason: 'PDPL re-consent cycle' },
  audit: { years: 7, tier: 'cold_after_1y', reason: 'ADR-009 § retention' },
  integration_log: { years: 7, tier: 'cold_after_1y', reason: 'regulator forensics' },
};

/**
 * @param {string} category
 * @param {Date} createdAt
 * @returns {Date} the date after which the record is eligible for deletion
 */
function retainUntil(category, createdAt) {
  const p = POLICIES[category];
  if (!p) throw new Error(`Unknown retention category: ${category}`);
  return new Date(createdAt.getTime() + p.years * YEAR_MS);
}

/** All known policy category keys. */
function categories() {
  return Object.keys(POLICIES);
}

module.exports = { POLICIES, retainUntil, categories };
