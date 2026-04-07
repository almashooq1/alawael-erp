/**
 * Permission-based Authorization Middleware
 * مسار: middleware/authorize.js
 *
 * ⚠️ COMPATIBILITY PROXY — All logic consolidated in ./auth.js (Round 29)
 *
 * This file re-exports `requirePermission` from auth.js as the default
 * export so that `require('../middleware/authorize')` keeps working.
 */

const { requirePermission } = require('./auth');

module.exports = requirePermission;
