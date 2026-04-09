/**
 * DDD Audit Trail Middleware — سجل التدقيق للدومينات العلاجية
 *
 * Automatically records all CUD (Create, Update, Delete) operations
 * across all 20 DDD domains. Uses the existing AuditLog model.
 *
 * Features:
 *  - Captures before/after snapshots (diff)
 *  - Records user, IP, user-agent
 *  - Marks compliance-relevant operations (clinical data)
 *  - Supports search by entity, user, date range
 *  - Per-domain audit configuration
 *
 * Usage in routes:
 *   const { dddAudit } = require('../../middleware/dddAudit.middleware');
 *   router.post('/', dddAudit('core', 'create', 'Beneficiary'), controller.create);
 *   router.put('/:id', dddAudit('core', 'update', 'Beneficiary'), controller.update);
 *
 * Or use auto-audit on the router:
 *   router.use(dddAutoAudit('core', 'Beneficiary'));
 *
 * @module middleware/dddAudit
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ── Compliance-relevant domains (clinical data = must audit) ─────────────
const COMPLIANCE_DOMAINS = new Set([
  'core',
  'episodes',
  'assessments',
  'care-plans',
  'sessions',
  'goals',
  'behavior',
  'ai-recommendations',
  'quality',
  'family',
  'tele-rehab',
  'ar-vr',
]);

// ── Operations that trigger audit ────────────────────────────────────────
const AUDITABLE_METHODS = {
  POST: 'create',
  PUT: 'update',
  PATCH: 'update',
  DELETE: 'delete',
};

/**
 * Compute shallow diff between old and new objects
 */
function computeDiff(oldObj, newObj) {
  if (!oldObj || !newObj) return { changed: [], added: [], removed: [] };

  const changes = [];
  const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)]);

  for (const key of allKeys) {
    // Skip internal fields
    if (['_id', '__v', 'updatedAt', 'createdAt'].includes(key)) continue;

    const oldVal = oldObj[key];
    const newVal = newObj[key];

    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      changes.push({
        field: key,
        oldValue: oldVal,
        newValue: newVal,
      });
    }
  }

  return changes;
}

/**
 * Record an audit entry to the AuditLog collection
 */
async function recordAudit(entry) {
  try {
    const AuditLog = mongoose.models.AuditLog || require('../models/AuditLog');
    if (!AuditLog) return;

    await AuditLog.create({
      operation: entry.operation,
      entity: entry.entity,
      entityId: entry.entityId,
      user: {
        userId: entry.userId,
        username: entry.username,
        role: entry.role,
      },
      description: entry.description,
      changes: entry.changes || [],
      before: entry.before || null,
      after: entry.after || null,
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      metadata: {
        domain: entry.domain,
        route: entry.route,
        method: entry.method,
        statusCode: entry.statusCode,
        ...(entry.metadata || {}),
      },
      complianceRelevant: entry.complianceRelevant || false,
      complianceType: entry.complianceType || null,
      organizationId: entry.organizationId,
      timestamp: new Date(),
    });
  } catch (err) {
    logger.error(`[DDD-Audit] Failed to record audit: ${err.message}`);
  }
}

/**
 * DDD Audit middleware — explicit operation and entity
 *
 * @param {string} domain - DDD domain name
 * @param {string} operation - 'create' | 'update' | 'delete'
 * @param {string} entity - Mongoose model name (e.g. 'Beneficiary')
 * @param {object} [options]
 * @param {boolean} [options.captureBody=true] - Capture request body as 'after'
 * @param {boolean} [options.captureBefore=true] - Fetch record before update/delete
 * @param {string} [options.complianceType] - Override compliance type
 * @returns {Function} Express middleware
 */
function dddAudit(domain, operation, entity, options = {}) {
  const { captureBody = true, captureBefore = true, complianceType = null } = options;

  return async (req, res, next) => {
    const isCompliance = COMPLIANCE_DOMAINS.has(domain);

    // Capture 'before' state for update/delete
    let beforeSnapshot = null;
    if (captureBefore && (operation === 'update' || operation === 'delete') && req.params.id) {
      try {
        const Model = mongoose.models[entity];
        if (Model) {
          const doc = await Model.findById(req.params.id).lean();
          if (doc) {
            beforeSnapshot = doc;
          }
        }
      } catch {
        // Okay to skip — not critical
      }
    }

    // Intercept response to capture the result
    const originalJson = res.json.bind(res);
    res.json = body => {
      // Only audit successful mutations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const afterData = captureBody ? body?.data || req.body : null;
        const entityId = req.params.id || body?.data?._id || body?._id || null;

        const changes = computeDiff(
          beforeSnapshot,
          afterData && typeof afterData === 'object' ? afterData : null
        );

        recordAudit({
          operation,
          entity,
          entityId: entityId?.toString(),
          userId: req.user?._id?.toString() || req.user?.id,
          username: req.user?.username || req.user?.name || 'system',
          role: req.user?.role || 'unknown',
          description: `${operation} ${entity} in ${domain}`,
          changes,
          before: beforeSnapshot,
          after: afterData,
          ipAddress: req.ip || req.connection?.remoteAddress,
          userAgent: req.headers?.['user-agent'],
          domain,
          route: req.originalUrl || req.url,
          method: req.method,
          statusCode: res.statusCode,
          complianceRelevant: isCompliance,
          complianceType: complianceType || (isCompliance ? 'clinical-data' : null),
          organizationId: req.user?.organizationId,
        });
      }

      return originalJson(body);
    };

    next();
  };
}

/**
 * Auto-audit middleware — infers operation from HTTP method
 * Only audits POST, PUT, PATCH, DELETE (skips GET/HEAD/OPTIONS)
 *
 * @param {string} domain
 * @param {string} entity
 * @param {object} [options]
 */
function dddAutoAudit(domain, entity, options = {}) {
  return (req, res, next) => {
    const operation = AUDITABLE_METHODS[req.method];
    if (!operation) return next(); // GET → skip

    return dddAudit(domain, operation, entity, options)(req, res, next);
  };
}

/**
 * Query audit trail for a DDD entity
 */
async function queryDDDAuditTrail(filters = {}) {
  const AuditLog = mongoose.models.AuditLog || require('../models/AuditLog');
  if (!AuditLog) return [];

  const query = {};

  if (filters.domain) query['metadata.domain'] = filters.domain;
  if (filters.entity) query.entity = filters.entity;
  if (filters.entityId) query.entityId = filters.entityId;
  if (filters.userId) query['user.userId'] = filters.userId;
  if (filters.operation) query.operation = filters.operation;
  if (filters.complianceOnly) query.complianceRelevant = true;

  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
    if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
  }

  const page = filters.page || 1;
  const limit = Math.min(filters.limit || 50, 200);
  const skip = (page - 1) * limit;

  const [docs, total] = await Promise.all([
    AuditLog.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).lean(),
    AuditLog.countDocuments(query),
  ]);

  return {
    data: docs,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

module.exports = {
  dddAudit,
  dddAutoAudit,
  recordAudit,
  queryDDDAuditTrail,
  computeDiff,
  COMPLIANCE_DOMAINS,
};
