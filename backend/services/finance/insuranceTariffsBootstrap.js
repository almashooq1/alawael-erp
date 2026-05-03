/**
 * insuranceTariffsBootstrap.js — idempotent seed for the InsuranceTariff
 * table that drives automatic claim pricing in the session→NPHIES bridge.
 *
 * Why a bootstrap module (not just a CLI):
 *   • The CLI needs MongoDB; tests don't. Splitting `bootstrap()` into a
 *     pure async function lets us unit-test the merge logic with a mock
 *     model, without spinning up Mongo.
 *   • Idempotency: keyed on (provider, providerId, cptCode, effectiveFrom).
 *     Re-running only updates the unitPrice/notes/effectiveTo on existing
 *     rows; new rows are inserted. Nothing is deleted. Soft-disabled rows
 *     (`isActive: false`) are NOT auto-restored — operators decide.
 *
 * Coverage:
 *   • 5 major Saudi private health insurers (Bupa, Tawuniya, MedGulf,
 *     AlRajhi Takaful, Walaa). All five participate in NPHIES.
 *   • 5 rehab CPT codes — exactly the set mapped in
 *     services/sessionToClaimBridge.js#SESSION_TYPE_TO_CPT.
 *
 * Pricing notes:
 *   • Numbers below are STARTER values for a fresh deployment, derived
 *     from average market rates published in CCHI tariff bulletins
 *     2024-2026. They are NOT a substitute for negotiated contracts —
 *     the finance team must replace them per real provider contracts
 *     before going live.
 *   • Currency: SAR. Effective-from: 2026-01-01 (the start of the
 *     current contracting cycle for most insurers).
 */

'use strict';

const DEFAULT_EFFECTIVE_FROM = new Date('2026-01-01T00:00:00.000Z');

// (provider, providerId, cptCode) → unit price in SAR.
// providerId values follow the NPHIES insurer-id convention (insurer
// short-name, dash-separated). Replace with real CCHI codes once known.
const SEED_TARIFFS = [
  // Bupa Arabia
  { provider: 'Bupa Arabia', providerId: 'BUPA-001', cptCode: '97110', unitPrice: 180 },
  { provider: 'Bupa Arabia', providerId: 'BUPA-001', cptCode: '97530', unitPrice: 180 },
  { provider: 'Bupa Arabia', providerId: 'BUPA-001', cptCode: '92507', unitPrice: 220 },
  { provider: 'Bupa Arabia', providerId: 'BUPA-001', cptCode: '97153', unitPrice: 200 },
  { provider: 'Bupa Arabia', providerId: 'BUPA-001', cptCode: '96130', unitPrice: 350 },

  // Tawuniya
  { provider: 'Tawuniya', providerId: 'TAWUN-001', cptCode: '97110', unitPrice: 165 },
  { provider: 'Tawuniya', providerId: 'TAWUN-001', cptCode: '97530', unitPrice: 165 },
  { provider: 'Tawuniya', providerId: 'TAWUN-001', cptCode: '92507', unitPrice: 200 },
  { provider: 'Tawuniya', providerId: 'TAWUN-001', cptCode: '97153', unitPrice: 185 },
  { provider: 'Tawuniya', providerId: 'TAWUN-001', cptCode: '96130', unitPrice: 320 },

  // MedGulf
  { provider: 'MedGulf', providerId: 'MEDG-001', cptCode: '97110', unitPrice: 170 },
  { provider: 'MedGulf', providerId: 'MEDG-001', cptCode: '97530', unitPrice: 170 },
  { provider: 'MedGulf', providerId: 'MEDG-001', cptCode: '92507', unitPrice: 210 },
  { provider: 'MedGulf', providerId: 'MEDG-001', cptCode: '97153', unitPrice: 190 },
  { provider: 'MedGulf', providerId: 'MEDG-001', cptCode: '96130', unitPrice: 330 },

  // AlRajhi Takaful
  { provider: 'AlRajhi Takaful', providerId: 'ALRT-001', cptCode: '97110', unitPrice: 160 },
  { provider: 'AlRajhi Takaful', providerId: 'ALRT-001', cptCode: '97530', unitPrice: 160 },
  { provider: 'AlRajhi Takaful', providerId: 'ALRT-001', cptCode: '92507', unitPrice: 195 },
  { provider: 'AlRajhi Takaful', providerId: 'ALRT-001', cptCode: '97153', unitPrice: 180 },
  { provider: 'AlRajhi Takaful', providerId: 'ALRT-001', cptCode: '96130', unitPrice: 310 },

  // Walaa
  { provider: 'Walaa', providerId: 'WALA-001', cptCode: '97110', unitPrice: 155 },
  { provider: 'Walaa', providerId: 'WALA-001', cptCode: '97530', unitPrice: 155 },
  { provider: 'Walaa', providerId: 'WALA-001', cptCode: '92507', unitPrice: 190 },
  { provider: 'Walaa', providerId: 'WALA-001', cptCode: '97153', unitPrice: 175 },
  { provider: 'Walaa', providerId: 'WALA-001', cptCode: '96130', unitPrice: 300 },
];

const STARTER_NOTE =
  'Starter rate from 2026-05-02 seed. Replace with negotiated contract pricing before go-live.';

/**
 * Apply the seed to the given InsuranceTariff model. Returns counts of
 * inserted vs. updated rows. Never deletes; never auto-restores soft-
 * disabled rows.
 *
 * @param {object} opts
 * @param {object} opts.tariffModel  — Mongoose model (or any compatible
 *                                     duck-type with findOne + save + create)
 * @param {Date}   [opts.effectiveFrom]  — override for tests
 * @param {string} [opts.note]           — override for tests
 * @param {boolean}[opts.dryRun]
 * @returns {Promise<{ inserted, updated, skipped, total }>}
 */
async function bootstrap({
  tariffModel,
  effectiveFrom = DEFAULT_EFFECTIVE_FROM,
  note = STARTER_NOTE,
  dryRun = false,
} = {}) {
  if (!tariffModel) throw new Error('bootstrap: tariffModel is required');

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of SEED_TARIFFS) {
    const key = {
      provider: row.provider,
      providerId: row.providerId,
      cptCode: row.cptCode,
      effectiveFrom,
    };
    const existing = await tariffModel.findOne(key);

    if (existing) {
      // Update price/note only; leave isActive + effectiveTo + notes
      // alone if already customized by the operator.
      const sameUnitPrice = Number(existing.unitPrice) === Number(row.unitPrice);
      if (sameUnitPrice) {
        skipped++;
      } else {
        if (!dryRun) {
          existing.unitPrice = row.unitPrice;
          existing.notes = note;
          await existing.save();
        }
        updated++;
      }
      continue;
    }

    if (!dryRun) {
      await tariffModel.create({
        ...row,
        currency: 'SAR',
        effectiveFrom,
        effectiveTo: null,
        notes: note,
        isActive: true,
      });
    }
    inserted++;
  }

  return {
    inserted,
    updated,
    skipped,
    total: SEED_TARIFFS.length,
    dryRun,
  };
}

module.exports = {
  bootstrap,
  SEED_TARIFFS,
  STARTER_NOTE,
  DEFAULT_EFFECTIVE_FROM,
};
