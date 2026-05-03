/**
 * sessionToClaimBridge.js — bridges a clinical TherapySession into a draft
 * NphiesClaim record so the NPHIES submission pipeline can take over.
 *
 * Why this exists:
 *   The NPHIES integration has full eligibility / pre-auth / submit /
 *   webhook / reconciliation, but no entry-point that connects a finished
 *   therapy session to a claim. Without this, billing staff have to fill
 *   the claim form by hand from the session record — slow + error-prone.
 *   This module is the missing user-facing workflow.
 *
 * Contract:
 *   buildClaimFromSession(sessionId, options) →
 *     { ok, claim, errors, warnings, dryRun }
 *
 *   • errors  — hard reasons to refuse (no insurance, session cancelled, …)
 *   • warnings — soft signals that don't block (no diagnosis recorded yet,
 *                session not yet COMPLETED, …)
 *   • dryRun  — if true, returns the would-be claim without persisting
 *
 * Pricing:
 *   This module does NOT compute prices on its own. The caller is expected
 *   to pass `unitPrice` — typically resolved from a tariff table, the
 *   beneficiary's insurance plan, or a per-CPT fee schedule. If no price
 *   is given, we still build the claim but flag it as warning so the UI
 *   forces a manual review before submission.
 */

'use strict';

const mongoose = require('mongoose');

// CPT mapping — keyed by the Arabic `sessionType` enum on TherapySession.
// Codes mirror REHAB_CPT_CODES in nphies.service.js so the FHIR bundle
// builder there will recognize them.
const SESSION_TYPE_TO_CPT = Object.freeze({
  'علاج طبيعي': { code: '97110', description: 'Therapeutic Exercises', specialty: 'PT' },
  'علاج وظيفي': { code: '97530', description: 'Therapeutic Activities', specialty: 'OT' },
  'نطق وتخاطب': { code: '92507', description: 'Speech Therapy Individual', specialty: 'SLP' },
  'علاج سلوكي': { code: '97153', description: 'ABA Treatment by Protocol', specialty: 'BA' },
  'علاج نفسي': { code: '96130', description: 'Psychological Testing', specialty: 'PSY' },
});

const TERMINAL_NON_BILLABLE = new Set([
  'CANCELLED_BY_PATIENT',
  'CANCELLED_BY_CENTER',
  'NO_SHOW',
  'RESCHEDULED',
]);

// 24-char lowercase hex — works without mongoose at hand (the test env mocks
// the mongoose module so we cannot rely on `mongoose.Types.ObjectId.isValid`).
function isValidObjectId(id) {
  if (!id) return false;
  const s = typeof id === 'string' ? id : id._id || id.toString();
  return /^[a-fA-F0-9]{24}$/.test(s);
}

function generateClaimNumber() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CLM-${y}${m}-${rand}`;
}

function mapSessionTypeToCpt(sessionType, fallback) {
  if (sessionType && SESSION_TYPE_TO_CPT[sessionType]) {
    return { ...SESSION_TYPE_TO_CPT[sessionType], source: 'session-type' };
  }
  return { ...fallback, source: 'fallback' };
}

/**
 * Build (and optionally persist) a draft NphiesClaim from a session.
 *
 * @param {string|ObjectId} sessionId
 * @param {object} [options]
 * @param {boolean} [options.dryRun=false]      — return without saving
 * @param {number}  [options.unitPrice]         — per-unit price for the CPT
 * @param {Array}   [options.diagnosis]         — [{ code, description }, ...]
 * @param {object}  [options.cptOverride]       — override the CPT mapping
 * @param {object}  [options.models]            — DI hook for tests
 *
 * @returns {Promise<{ ok, claim, errors, warnings, dryRun }>}
 */
async function buildClaimFromSession(sessionId, options = {}) {
  const errors = [];
  const warnings = [];

  if (!sessionId || !isValidObjectId(sessionId)) {
    errors.push('invalid_session_id');
    return { ok: false, claim: null, errors, warnings, dryRun: !!options.dryRun };
  }

  const models = options.models || {
    TherapySession: mongoose.model('TherapySession'),
    Beneficiary: mongoose.model('Beneficiary'),
    NphiesClaim: mongoose.model('NphiesClaim'),
  };

  const session = await models.TherapySession.findById(sessionId).populate('beneficiary');
  if (!session) {
    errors.push('session_not_found');
    return { ok: false, claim: null, errors, warnings, dryRun: !!options.dryRun };
  }

  // Status checks
  if (TERMINAL_NON_BILLABLE.has(session.status)) {
    errors.push(`session_not_billable:${session.status}`);
  }
  if (session.status !== 'COMPLETED') {
    warnings.push(`session_not_completed:${session.status}`);
  }
  if (session.isBilled) {
    warnings.push('session_already_billed');
  }

  // Beneficiary + insurance
  const beneficiary = session.beneficiary;
  if (!beneficiary) {
    errors.push('beneficiary_missing');
    return { ok: false, claim: null, errors, warnings, dryRun: !!options.dryRun };
  }

  const ins = beneficiary.insuranceInfo || {};
  if (!ins.hasInsurance) {
    errors.push('no_insurance_on_file');
  }
  if (!ins.policyNumber) {
    errors.push('insurance_policy_number_missing');
  }
  if (ins.coverageEndDate && new Date(ins.coverageEndDate) < new Date()) {
    errors.push('insurance_coverage_expired');
  }

  // CPT mapping
  const cpt = mapSessionTypeToCpt(
    session.sessionType,
    options.cptOverride || { code: '99999', description: 'Unmapped session type', specialty: 'GEN' }
  );
  if (cpt.source === 'fallback') {
    warnings.push(`unmapped_session_type:${session.sessionType || 'null'}`);
  }

  // Pricing
  // 1) honor an explicit price from the caller (UI override / dry-run preview)
  // 2) else look up the negotiated tariff for (provider, cpt, serviceDate)
  // 3) else warn — the UI will block submission until a price is set
  let unitPrice = Number.isFinite(options.unitPrice) ? Number(options.unitPrice) : null;
  let priceSource = unitPrice !== null && unitPrice > 0 ? 'override' : null;

  if ((unitPrice === null || unitPrice <= 0) && options.useTariff !== false) {
    try {
      const { lookupPrice } = require('./insuranceTariffs');
      const t = await lookupPrice({
        provider: ins.provider,
        providerId: ins.groupNumber,
        cptCode: cpt.code,
        date: session.date,
        models: options.models,
      });
      if (t.found) {
        unitPrice = t.unitPrice;
        priceSource = t.source;
      }
    } catch (err) {
      // Swallow — pricing must never crash the bridge. Surface as warning.
      warnings.push(`tariff_lookup_failed:${err.code || err.message || 'unknown'}`);
    }
  }

  if (unitPrice === null || unitPrice <= 0) {
    warnings.push('unit_price_missing_or_zero');
  }
  const quantity = 1;
  const total = (unitPrice || 0) * quantity;

  // Diagnosis
  const diagnosis =
    Array.isArray(options.diagnosis) && options.diagnosis.length ? options.diagnosis : [];
  if (diagnosis.length === 0) {
    warnings.push('diagnosis_missing');
  }

  if (errors.length) {
    return { ok: false, claim: null, errors, warnings, dryRun: !!options.dryRun };
  }

  const draft = {
    claimNumber: generateClaimNumber(),
    beneficiary: beneficiary._id,
    session: session._id,
    memberId: ins.policyNumber,
    insurerName: ins.provider,
    insurerId: ins.groupNumber || undefined,
    planName: ins.coverageType,
    serviceDate: session.date,
    diagnosis,
    services: [
      {
        code: cpt.code,
        description: cpt.description,
        quantity,
        unitPrice: unitPrice || 0,
        total,
      },
    ],
    totalAmount: total,
    copay: ins.copayAmount,
    deductible: ins.deductible,
    nphies: {
      submission: { status: 'NOT_SUBMITTED' },
    },
  };

  if (options.dryRun) {
    return { ok: true, claim: draft, errors, warnings, dryRun: true, priceSource };
  }

  const saved = await models.NphiesClaim.create(draft);
  return { ok: true, claim: saved, errors, warnings, dryRun: false, priceSource };
}

module.exports = {
  buildClaimFromSession,
  // exposed for tests + tooling
  SESSION_TYPE_TO_CPT,
  TERMINAL_NON_BILLABLE,
  generateClaimNumber,
  mapSessionTypeToCpt,
};
