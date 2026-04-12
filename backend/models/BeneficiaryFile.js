/**
 * BeneficiaryFile — BACKWARD-COMPATIBLE ALIAS
 * ══════════════════════════════════════════════════════════════════════════
 * DEPRECATED: This file now re-exports the canonical Beneficiary model.
 *
 * The canonical model is: require('./Beneficiary') → 'Beneficiary'
 * All 42 code references have been migrated (2025-06-10).
 *
 * This file is kept ONLY for:
 *   - Any missed require('./BeneficiaryFile') still lurking in codebase
 *   - models/index.js backward compatibility
 *
 * The old BeneficiaryFile schema (80 lines) is preserved in:
 *   scripts/archive/BeneficiaryFile.schema.backup.js
 *
 * DO NOT create new references to this file — use require('./Beneficiary').
 * ══════════════════════════════════════════════════════════════════════════
 */
module.exports = require('./Beneficiary');
