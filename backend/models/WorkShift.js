/**
 * WorkShift.js — Compatibility Proxy
 * ═══════════════════════════════════
 * CANONICAL MODEL: workShift.model.js (389L, rich HR shift management:
 *   breakPeriodSchema, shiftAssignmentSchema, late/overtime policies,
 *   4 statics, 4 instance methods, 2 virtuals)
 *
 * This file re-exports the canonical WorkShift model
 * for backward-compatible `require('./WorkShift')` calls.
 */
module.exports = require('./workShift.model');
