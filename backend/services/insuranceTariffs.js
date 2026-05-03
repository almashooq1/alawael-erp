/**
 * insuranceTariffs.js — lookup negotiated price per (insurer × CPT × date).
 *
 * Pure read-side service. Never mutates the tariff table — that's the job
 * of an admin route + seed script. The session→claim bridge calls
 * lookupPrice() to fill in `unitPrice` automatically when the UI didn't
 * provide one, so billing staff don't have to memorize fee schedules.
 *
 * Resolution rules (deterministic):
 *   1. Prefer match on providerId (NPHIES insurer id). Fall back to a
 *      case-insensitive match on the human-readable provider name.
 *   2. Among matches for that insurer + cptCode, filter to rows with
 *      effectiveFrom <= date AND (effectiveTo == null OR effectiveTo >= date)
 *      AND isActive == true.
 *   3. Pick the row with the latest effectiveFrom.
 *   4. If two rows tie on effectiveFrom (same insurer, same CPT, same
 *      effective date), that is a data error → the service throws.
 *
 * Contract:
 *   lookupPrice({ provider, providerId, cptCode, date, models }) →
 *     { found: true,  unitPrice, currency, source, tariffId }
 *     { found: false, reason }
 *
 *   reason values: 'missing_input', 'no_match', 'ambiguous'
 *   source values: 'tariff:providerId' | 'tariff:provider' (which match-path won)
 */

'use strict';

const mongoose = require('mongoose');

function getModel(models) {
  if (models?.InsuranceTariff) return models.InsuranceTariff;
  return mongoose.model('InsuranceTariff');
}

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function lookupPrice({ provider, providerId, cptCode, date, models } = {}) {
  if (!cptCode) return { found: false, reason: 'missing_input' };
  if (!provider && !providerId) return { found: false, reason: 'missing_input' };

  const Tariff = getModel(models);
  const at = date instanceof Date ? date : new Date(date || Date.now());
  if (Number.isNaN(at.getTime())) return { found: false, reason: 'missing_input' };

  const baseFilter = {
    cptCode: String(cptCode).trim(),
    isActive: true,
    effectiveFrom: { $lte: at },
    $or: [{ effectiveTo: null }, { effectiveTo: { $gte: at } }],
  };

  // 1) Try providerId exact match first (canonical NPHIES id).
  if (providerId) {
    const rows = await Tariff.find({ ...baseFilter, providerId: String(providerId).trim() })
      .sort({ effectiveFrom: -1 })
      .limit(2)
      .lean();
    const picked = pickFromCandidates(rows);
    if (picked) {
      return {
        found: true,
        unitPrice: picked.unitPrice,
        currency: picked.currency || 'SAR',
        source: 'tariff:providerId',
        tariffId: String(picked._id),
      };
    }
  }

  // 2) Fall back to case-insensitive provider name match.
  if (provider) {
    const rows = await Tariff.find({
      ...baseFilter,
      provider: { $regex: `^${escapeRegex(String(provider).trim())}$`, $options: 'i' },
    })
      .sort({ effectiveFrom: -1 })
      .limit(2)
      .lean();
    const picked = pickFromCandidates(rows);
    if (picked) {
      return {
        found: true,
        unitPrice: picked.unitPrice,
        currency: picked.currency || 'SAR',
        source: 'tariff:provider',
        tariffId: String(picked._id),
      };
    }
  }

  return { found: false, reason: 'no_match' };
}

function pickFromCandidates(rows) {
  if (!rows || rows.length === 0) return null;
  if (rows.length === 1) return rows[0];
  // Two rows. They are sorted desc by effectiveFrom, so equal timestamps =
  // ambiguous. Throwing here is intentional: silent overlapping tariffs
  // would let two different prices be served to identical inputs.
  if (rows[0].effectiveFrom?.getTime?.() === rows[1].effectiveFrom?.getTime?.()) {
    const err = new Error(
      `insuranceTariffs: ambiguous match — two active rows share effectiveFrom for ` +
        `cpt=${rows[0].cptCode} provider=${rows[0].provider}/${rows[0].providerId || ''}`
    );
    err.code = 'ambiguous';
    throw err;
  }
  return rows[0];
}

module.exports = { lookupPrice };
