/**
 * WhatsApp guardian resolver — shared helper for guardian-notification subscribers
 * ═══════════════════════════════════════════════════════════════════════════
 * Given a beneficiaryId, find the best contactable guardian phone. The single
 * source of truth for the event→WhatsApp subscribers (post-session W1511,
 * complaint-resolved W1513, configurable bindings W1517). Pure `pickGuardian` +
 * a thin DB read; no consent/send here (the subscriber owns those).
 *
 * @module services/whatsapp/whatsappGuardianResolver
 */

'use strict';

const mongoose = require('mongoose');

// Relationships that indicate a responsible adult — preferred over an arbitrary
// first-with-phone (e.g. a sibling) when no explicit guardian/caregiver flag is
// set. Mirrors the Beneficiary.familyMembers relationship enum.
const GUARDIAN_RELATIONSHIPS = ['father', 'mother', 'guardian', 'grandfather', 'grandmother'];

function getModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

// Pick the best contactable guardian, in priority order:
//   1. legal guardian → 2. primary caregiver → 3. a parent/guardian/grandparent
//   → 4. any member with a phone. Returns the member or null. Pure + testable.
function pickGuardian(familyMembers) {
  if (!Array.isArray(familyMembers) || !familyMembers.length) return null;
  return (
    familyMembers.find(m => m && m.hasLegalGuardianship && m.phone) ||
    familyMembers.find(m => m && m.isPrimaryCaregiver && m.phone) ||
    familyMembers.find(m => m && m.phone && GUARDIAN_RELATIONSHIPS.includes(m.relationship)) ||
    familyMembers.find(m => m && m.phone) ||
    null
  );
}

async function getGuardianPhone(beneficiaryId) {
  const Beneficiary = getModel('Beneficiary');
  if (!Beneficiary || !beneficiaryId) return null;
  const ben = await Beneficiary.findById(beneficiaryId).select('familyMembers firstName').lean();
  const g = pickGuardian(ben && ben.familyMembers);
  return g ? { phone: g.phone, beneficiaryName: (ben && ben.firstName) || null } : null;
}

module.exports = { pickGuardian, getGuardianPhone, GUARDIAN_RELATIONSHIPS };
