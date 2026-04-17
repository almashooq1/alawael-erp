/**
 * advancedRateLimiter.js — DEPRECATED PROXY
 * Delegates to: rateLimiter.js (canonical Redis-backed rate limiter)
 * Migrate to: require('./rateLimiter')
 */
module.exports = require('./rateLimiter');
