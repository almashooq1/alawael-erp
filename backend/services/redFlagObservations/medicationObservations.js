/**
 * medicationObservations.js — Beneficiary-360 Commit 23.
 *
 * Adapter for two CRITICAL + blocking flags:
 *
 *   clinical.allergy.severe.medication_conflict
 *     → onPrescribe(beneficiaryId) →
 *       { drug: { rxNormId: 'allergen.match' | 'no-conflict' } }
 *     The registry path `drug.rxNormId` + condition
 *     `== 'allergen.match'` means: if ANY active medication
 *     collides with a recorded SEVERE/life-threatening allergy,
 *     return the sentinel `'allergen.match'` which raises the flag.
 *
 *   safety.medication.interaction.detected
 *     → interactionCheckForBeneficiary(beneficiaryId) →
 *       { hasInteraction: boolean }
 *     True when TWO active medications share a high-severity
 *     interaction from the catalog.
 *
 * Registered as `medicationService` in the locator.
 *
 * Design decisions:
 *
 *   1. **Case-insensitive exact name match for allergies.**
 *      "Penicillin" allergy → matches medication "penicillin" but
 *      NOT "amoxicillin" (a related penicillin-class drug). If
 *      both the allergy and the medication carry an `rxNormClass`,
 *      a class-level match is also attempted. Full pharmacologic
 *      class expansion would require an SFDA data feed; this is
 *      the pragmatic clinical-safety floor.
 *
 *   2. **Only `severe` and `life_threatening` allergies count.**
 *      Mild/moderate allergies are tracked in the model but don't
 *      trip this CRITICAL flag.
 *
 *   3. **Interaction catalog in config, not DB.** High-severity
 *      known pairs live in `config/medication-interactions.js`
 *      and are loaded as a frozen list. Swap in an SFDA feed
 *      later without changing this file.
 *
 *   4. **Active medications only.** `held` and `stopped` are
 *      excluded from both checks.
 */

'use strict';

const DEFAULT_ALLERGY_EXPORTS = requireOptional('../../models/Allergy');
const DEFAULT_MEDICATION_EXPORTS = requireOptional('../../models/MedicationOrder');
const { findAllInteractions } = require('../../config/medication-interactions');

function requireOptional(path) {
  try {
    return require(path);
  } catch {
    return null;
  }
}

function createMedicationObservations(deps = {}) {
  const Allergy = deps.allergyModel || (DEFAULT_ALLERGY_EXPORTS && DEFAULT_ALLERGY_EXPORTS.Allergy);
  const Medication =
    deps.medicationModel ||
    (DEFAULT_MEDICATION_EXPORTS && DEFAULT_MEDICATION_EXPORTS.MedicationOrder);
  const severeSeverities = deps.severeSeverities ||
    (DEFAULT_ALLERGY_EXPORTS && DEFAULT_ALLERGY_EXPORTS.SEVERE_SEVERITIES) || [
      'severe',
      'life_threatening',
    ];

  if (Allergy == null) {
    throw new Error('medicationObservations: Allergy model is required');
  }
  if (Medication == null) {
    throw new Error('medicationObservations: MedicationOrder model is required');
  }

  function normName(name) {
    return (name || '').trim().toLowerCase();
  }

  async function activeMedications(beneficiaryId) {
    return Medication.find({ beneficiaryId, status: 'active' }, 'name rxNormId rxNormClass').lean();
  }

  async function severeAllergies(beneficiaryId) {
    return Allergy.find(
      {
        beneficiaryId,
        status: 'active',
        severity: { $in: severeSeverities },
      },
      'substance rxNormClass severity'
    ).lean();
  }

  /**
   * Does this beneficiary have any active medication that
   * collides with a recorded severe allergy? Returns a structured
   * response keyed to match the registry path `drug.rxNormId`.
   */
  async function onPrescribe(beneficiaryId) {
    const [allergies, medications] = await Promise.all([
      severeAllergies(beneficiaryId),
      activeMedications(beneficiaryId),
    ]);
    if (allergies.length === 0 || medications.length === 0) {
      return { drug: { rxNormId: 'no-conflict' } };
    }
    const allergySubstances = new Set(allergies.map(a => normName(a.substance)));
    const allergyClasses = new Set(allergies.map(a => normName(a.rxNormClass)).filter(Boolean));
    for (const med of medications) {
      const medName = normName(med.name);
      if (allergySubstances.has(medName)) {
        return { drug: { rxNormId: 'allergen.match' } };
      }
      const medClass = normName(med.rxNormClass);
      if (medClass && allergyClasses.has(medClass)) {
        return { drug: { rxNormId: 'allergen.match' } };
      }
    }
    return { drug: { rxNormId: 'no-conflict' } };
  }

  /**
   * Does this beneficiary have any two active medications that
   * appear together in the interactions catalog at `high` severity?
   */
  async function interactionCheckForBeneficiary(beneficiaryId) {
    const medications = await activeMedications(beneficiaryId);
    if (medications.length < 2) return { hasInteraction: false };
    const names = medications.map(m => m.name);
    const hits = findAllInteractions(names).filter(h => h.severity === 'high');
    return { hasInteraction: hits.length > 0 };
  }

  return Object.freeze({
    onPrescribe,
    interactionCheckForBeneficiary,
  });
}

module.exports = { createMedicationObservations };
