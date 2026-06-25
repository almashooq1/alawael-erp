/**
 * WhatsApp guardian resolver — shared helper for guardian-notification subscribers
 * ═══════════════════════════════════════════════════════════════════════════
 * Given a beneficiaryId, find the best contactable guardian phone. Used by the
 * event→WhatsApp subscribers (post-session W1511, complaint-resolved W1513, …).
 * Pure `pickGuardian` + a thin DB read; no consent/send here (the subscriber
 * owns those).
 *
 * NOTE: the W1511 post-session subscriber currently inlines an identical
 * resolver; a trivial follow-up should point it at this module (rule of three).
 *
 * @module services/whatsapp/whatsappGuardianResolver
 */

'use strict';

const mongoose = require('mongoose');

function getModel(name) {
  try {
    return mongoose.model(name);
  } catch {
    return null;
  }
}

// Pick the best contactable guardian: legal guardian → primary caregiver →
// first member with a phone. Returns the member or null. Pure + testable.
function pickGuardian(familyMembers) {
  if (!Array.isArray(familyMembers) || !familyMembers.length) return null;
  return (
    familyMembers.find(m => m && m.hasLegalGuardianship && m.phone) ||
    familyMembers.find(m => m && m.isPrimaryCaregiver && m.phone) ||
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

module.exports = { pickGuardian, getGuardianPhone };
