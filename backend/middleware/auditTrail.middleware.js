/**
 * Professional Audit Trail Middleware — نظام تتبع العمليات الاحترافي
 *
 * Records every significant operation for compliance and debugging.
 * Supports: Create, Update, Delete, Login, Export, Import, Config changes.
 *
 * @module middleware/auditTrail
 */

const logger = require('../utils/logger');
const { escapeRegex } = require('../utils/sanitize');

// ─── Audit Event Types ───────────────────────────────────────────────────────
const AUDIT_EVENTS = {
  // Auth Events
  AUTH_LOGIN: 'auth.login',
  AUTH_LOGOUT: 'auth.logout',
  AUTH_LOGIN_FAILED: 'auth.login_failed',
  AUTH_PASSWORD_CHANGE: 'auth.password_change',
  AUTH_TOKEN_REFRESH: 'auth.token_refresh',
  AUTH_MFA_ENABLED: 'auth.mfa_enabled',

  // Data Events
  DATA_CREATE: 'data.create',
  DATA_READ: 'data.read',
  DATA_UPDATE: 'data.update',
  DATA_DELETE: 'data.delete',
  DATA_EXPORT: 'data.export',
  DATA_IMPORT: 'data.import',
  DATA_BULK_OPERATION: 'data.bulk_operation',

  // Admin Events
  ADMIN_CONFIG_CHANGE: 'admin.config_change',
  ADMIN_USER_CREATE: 'admin.user_create',
  ADMIN_USER_UPDATE: 'admin.user_update',
  ADMIN_USER_DELETE: 'admin.user_delete',
  ADMIN_ROLE_CHANGE: 'admin.role_change',
  ADMIN_PERMISSION_CHANGE: 'admin.permission_change',

  // System Events
  SYSTEM_STARTUP: 'system.startup',
  SYSTEM_SHUTDOWN: 'system.shutdown',
  SYSTEM_ERROR: 'system.error',
  SYSTEM_MAINTENANCE: 'system.maintenance',
};

// ─── Severity Levels ─────────────────────────────────────────────────────────
const SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

// ─── In-Memory Buffer (flushed periodically) ─────────────────────────────────
const auditBuffer = [];
const BUFFER_FLUSH_INTERVAL = 30_000; // 30 seconds
const BUFFER_MAX_SIZE = 500;

// ─── Audit Entry Builder ─────────────────────────────────────────────────────
class AuditEntry {
  constructor({
    event,
    actor = null,
    target = null,
    details = {},
    severity = SEVERITY.LOW,
    ip = null,
    userAgent = null,
    requestId = null,
  }) {
    this.id = `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.event = event;
    this.actor = actor ? { id: actor.id || actor._id, email: actor.email, role: actor.role } : null;
    this.target = target;
    this.details = details;
    this.severity = severity;
    this.ip = ip;
    this.userAgent = userAgent;
    this.requestId = requestId;
    this.timestamp = new Date().toISOString();
    this.environment = process.env.NODE_ENV || 'development';
  }
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Record an audit event
 */
const recordAudit = entry => {
  const auditEntry = entry instanceof AuditEntry ? entry : new AuditEntry(entry);

  auditBuffer.push(auditEntry);

  // Structured log for immediate visibility
  logger.info(`[AUDIT] ${auditEntry.event}`, {
    auditId: auditEntry.id,
    actor: auditEntry.actor?.email || 'system',
    target: auditEntry.target,
    severity: auditEntry.severity,
    requestId: auditEntry.requestId,
  });

  // Flush if buffer is full
  if (auditBuffer.length >= BUFFER_MAX_SIZE) {
    flushAuditBuffer();
  }
};

/**
 * Flush audit buffer to persistent storage
 */
const flushAuditBuffer = async () => {
  if (auditBuffer.length === 0) return;

  const entries = auditBuffer.splice(0);

  try {
    // Try to persist to MongoDB
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      const AuditLog =
        mongoose.models.AuditLog ||
        mongoose.model(
          'AuditLog',
          new mongoose.Schema(
            {
              id: String,
              event: { type: String, index: true },
              actor: { id: String, email: String, role: String },
              target: mongoose.Schema.Types.Mixed,
              details: mongoose.Schema.Types.Mixed,
              severity: { type: String, enum: Object.values(SEVERITY), index: true },
              ip: String,
              userAgent: String,
              requestId: String,
              environment: String,
              timestamp: { type: Date, index: true },
            },
            { collection: 'audit_logs', timestamps: true }
          )
        );
      await AuditLog.insertMany(entries, { ordered: false });
      logger.debug(`[AUDIT] Flushed ${entries.length} audit entries to DB`);
    }
  } catch (err) {
    logger.error(`[AUDIT] Failed to flush audit buffer: ${err.message}`);
    // Re-add failed entries
    auditBuffer.unshift(...entries.slice(0, BUFFER_MAX_SIZE - auditBuffer.length));
  }
};

// Auto-flush every 30 seconds
if (process.env.NODE_ENV !== 'test') {
  setInterval(flushAuditBuffer, BUFFER_FLUSH_INTERVAL);
}

// ─── Express Middleware ──────────────────────────────────────────────────────

/**
 * Auto-audit middleware for write operations (POST, PUT, PATCH, DELETE).
 * Attach to routes or globally for automatic audit logging.
 */
const auditMiddleware = ({ resource = 'unknown', severity = SEVERITY.MEDIUM } = {}) => {
  return (req, res, next) => {
    // Only audit write operations
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    const originalJson = res.json.bind(res);
    res.json = data => {
      const eventMap = {
        POST: AUDIT_EVENTS.DATA_CREATE,
        PUT: AUDIT_EVENTS.DATA_UPDATE,
        PATCH: AUDIT_EVENTS.DATA_UPDATE,
        DELETE: AUDIT_EVENTS.DATA_DELETE,
      };

      recordAudit({
        event: eventMap[req.method] || `data.${req.method.toLowerCase()}`,
        actor: req.user || null,
        target: {
          resource,
          path: req.originalUrl,
          params: req.params,
          id: req.params?.id || data?.data?.id || data?.data?._id,
        },
        details: {
          method: req.method,
          statusCode: res.statusCode,
          success: res.statusCode < 400,
          bodyKeys: Object.keys(req.body || {}),
        },
        severity: req.method === 'DELETE' ? SEVERITY.HIGH : severity,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        requestId: req.requestId,
      });

      return originalJson(data);
    };

    next();
  };
};

// ─── Query Interface ─────────────────────────────────────────────────────────

/**
 * Query audit logs with filters.
 */
const queryAuditLogs = async ({
  event,
  actorEmail,
  severity,
  startDate,
  endDate,
  page = 1,
  limit = 50,
} = {}) => {
  try {
    const mongoose = require('mongoose');
    const AuditLog = mongoose.models.AuditLog;
    if (!AuditLog) return { entries: auditBuffer.slice(-limit), source: 'memory' };

    const filter = {};
    if (event) filter.event = { $regex: escapeRegex(event), $options: 'i' };
    if (actorEmail) filter['actor.email'] = actorEmail;
    if (severity) filter.severity = severity;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const [entries, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return { entries, total, page, limit, source: 'database' };
  } catch (err) {
    logger.error(`[AUDIT QUERY] Error: ${err.message}`);
    return { entries: [], total: 0, source: 'error' };
  }
};

module.exports = {
  AUDIT_EVENTS,
  SEVERITY,
  AuditEntry,
  recordAudit,
  flushAuditBuffer,
  auditMiddleware,
  queryAuditLogs,
};
