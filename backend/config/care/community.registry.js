'use strict';

/**
 * care/community.registry.js — Phase 17 Commit 4 (4.0.86).
 *
 * Taxonomy for community partners + beneficiary linkages to them.
 * Partners are external orgs (schools, mosques, charities, govt
 * agencies, hospitals, employers, etc.); linkages are the
 * per-beneficiary records of "beneficiary X is connected to
 * partner Y for purpose Z". No state machine on partners (they're
 * just a directory); simple active/ended lifecycle on linkages.
 */

const PARTNER_CATEGORIES = Object.freeze([
  'school',
  'mosque',
  'charity',
  'govt_agency',
  'hospital',
  'clinic',
  'employer',
  'vocational_training',
  'disability_support',
  'community_center',
  'sports_club',
  'other',
]);

const PARTNER_STATUSES = Object.freeze(['active', 'inactive', 'blacklisted']);

const LINKAGE_TYPES = Object.freeze([
  'ongoing', // long-term relationship (e.g., school enrollment)
  'one_time', // single event (e.g., community iftar)
  'referral', // sent the beneficiary to partner for service
  'collaboration', // joint work on a plan
]);

const LINKAGE_STATUSES = Object.freeze(['active', 'paused', 'ended', 'cancelled']);

const LINKAGE_PURPOSES = Object.freeze([
  'education',
  'religious_guidance',
  'medical_treatment',
  'financial_support',
  'vocational_training',
  'recreation',
  'social_integration',
  'counseling',
  'housing',
  'other',
]);

// ── Helpers ─────────────────────────────────────────────────────────

function isValidPartnerCategory(c) {
  return PARTNER_CATEGORIES.includes(c);
}

function isValidLinkageType(t) {
  return LINKAGE_TYPES.includes(t);
}

function validate() {
  // Just ensure no dup vocabulary
  for (const arr of [
    PARTNER_CATEGORIES,
    PARTNER_STATUSES,
    LINKAGE_TYPES,
    LINKAGE_STATUSES,
    LINKAGE_PURPOSES,
  ]) {
    if (new Set(arr).size !== arr.length) {
      throw new Error(`community registry: duplicate in vocabulary`);
    }
  }
  return true;
}

module.exports = {
  PARTNER_CATEGORIES,
  PARTNER_STATUSES,
  LINKAGE_TYPES,
  LINKAGE_STATUSES,
  LINKAGE_PURPOSES,
  isValidPartnerCategory,
  isValidLinkageType,
  validate,
};
