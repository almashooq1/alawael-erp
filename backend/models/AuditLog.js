/**
 * AuditLog.js — Compatibility Proxy
 * ══════════════════════════════════
 * CANONICAL MODEL: auditLog.model.js (589L, 28+ fields, statics, methods,
 *   anomaly detection, review workflow, geo-location, 60+ event types)
 *
 * This file re-exports only the AuditLog model (not the constants)
 * for backward-compatible `require('./AuditLog')` calls.
 *
 * For full access: const { AuditLog, AuditEventTypes, SeverityLevels } = require('./auditLog.model');
 */
module.exports = require('./auditLog.model').AuditLog;
