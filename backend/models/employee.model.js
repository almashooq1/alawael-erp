/**
 * employee.model.js — Compatibility Alias
 * ══════════════════════════════════════════════
 * Re-exports the canonical HR/Employee model directly,
 * bypassing the legacy ./Employee proxy (which emits a
 * deprecation warning on every load).
 */
module.exports = require('./HR/Employee');
