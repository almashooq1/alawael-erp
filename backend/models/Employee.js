/**
 * Employee Model — Proxy
 *
 * @deprecated Use require('./HR/Employee') directly.
 *
 * This file re-exports the comprehensive HR/Employee model which includes:
 * - Saudi compliance fields (GOSI, SCFHS, iqama)
 * - branch_id (branchId) for multi-tenant isolation
 * - Full employment lifecycle management
 *
 * The root Employee.js previously had a minimal schema without branch support.
 * All 21+ consumers now automatically get the full HR/Employee schema.
 */

'use strict';

let _warned = false;

const HREmployee = require('./HR/Employee');

if (!_warned && process.env.NODE_ENV !== 'production') {
  _warned = true;
  const caller = new Error().stack?.split('\n')[2]?.trim() || '';
  console.warn(
    `[DEPRECATION] require("models/Employee") → use require("models/HR/Employee") instead. Called from: ${caller}`
  );
}

module.exports = HREmployee;
