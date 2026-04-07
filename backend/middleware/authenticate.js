/**
 * Authentication middleware for integration routes
 *
 * ⚠️ COMPATIBILITY PROXY — All logic consolidated in ./auth.js (Round 29)
 *
 * This file re-exports `authenticateToken` from auth.js as the default
 * export so that `require('../middleware/authenticate')` keeps working.
 */

const { authenticateToken } = require('./auth');

module.exports = authenticateToken;
