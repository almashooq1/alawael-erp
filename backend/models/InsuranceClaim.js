/**
 * InsuranceClaim.js — Compatibility Proxy
 * ═══════════════════════════════════════
 * CANONICAL MODEL: insuranceClaim.model.js (403L, 4 models:
 *   InsuranceContract, PreAuthorization, InsuranceClaim, ClaimItem)
 *
 * This file re-exports only the InsuranceClaim model
 * for backward-compatible `require('./InsuranceClaim')` calls.
 *
 * For full access: const { InsuranceClaim, InsuranceContract, PreAuthorization, ClaimItem }
 *   = require('./insuranceClaim.model');
 */
module.exports = require('./insuranceClaim.model').InsuranceClaim;
