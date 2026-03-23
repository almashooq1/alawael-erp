/**
 * Integration Context Middleware — وسيط سياق التكامل
 *
 * Enriches every HTTP request with distributed tracing context
 * (correlationId, causationId, source module) and propagates that
 * context to the SystemIntegrationBus and downstream services.
 *
 * This middleware ensures that every event published from within a
 * request handler carries the same correlation context, enabling
 * end-to-end tracing across all modules.
 *
 * @module middleware/integrationContext.middleware
 */

'use strict';

const { v4: uuidv4 } = require('uuid');

// ═══════════════════════════════════════════════════════════════════════════════
//  Context Store (CLS-like per-request context)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Lightweight async-local-like context map keyed by requestId.
 * Falls back to a simple Map for environments without AsyncLocalStorage.
 */
const contextStore = new Map();

/**
 * Get current context for a request
 */
function getContext(requestId) {
  return contextStore.get(requestId) || null;
}

/**
 * Clean up context (called after response)
 */
function clearContext(requestId) {
  contextStore.delete(requestId);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Middleware Factory
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create the integration context middleware
 *
 * @param {Object} options
 * @param {Object} options.integrationBus  - SystemIntegrationBus instance
 * @param {string} options.serviceName     - Name of this service (default: 'alawael-erp')
 * @param {boolean} options.propagateHeaders - Include trace headers in response
 */
function createIntegrationContextMiddleware(options = {}) {
  const { integrationBus = null, serviceName = 'alawael-erp', propagateHeaders = true } = options;

  return function integrationContextMiddleware(req, res, next) {
    // ── Generate / Extract Trace IDs ──────────────────────────────────
    const correlationId =
      req.headers['x-correlation-id'] || req.headers['x-request-id'] || uuidv4();

    const causationId = req.headers['x-causation-id'] || null;
    const requestId = uuidv4();

    // ── Determine source module from URL path ─────────────────────────
    const sourceModule = extractModuleFromPath(req.path);

    // ── Build context ─────────────────────────────────────────────────
    const context = {
      requestId,
      correlationId,
      causationId,
      sourceModule,
      serviceName,
      userId: null, // Will be populated by auth middleware later
      sessionId: null,
      ip: req.ip || req.connection?.remoteAddress,
      method: req.method,
      path: req.path,
      userAgent: req.headers['user-agent'],
      startTime: Date.now(),
    };

    // Populate from authenticated user if available
    if (req.user) {
      context.userId = req.user._id || req.user.id;
      context.sessionId = req.sessionID;
    }

    // ── Store context ─────────────────────────────────────────────────
    contextStore.set(requestId, context);

    // ── Attach to request ─────────────────────────────────────────────
    req.integrationContext = context;
    req.correlationId = correlationId;
    req.requestId = requestId;

    // ── Shorthand publish method on req ───────────────────────────────
    req.publishEvent = async (domain, eventType, payload, eventOptions = {}) => {
      if (!integrationBus) return null;
      return integrationBus.publish(domain, eventType, payload, {
        ...eventOptions,
        metadata: {
          correlationId,
          causationId: eventOptions.causationId || requestId,
          userId: context.userId || (req.user && (req.user._id || req.user.id)),
          source: sourceModule,
          requestId,
          ...(eventOptions.metadata || {}),
        },
      });
    };

    // ── Propagate headers in response ─────────────────────────────────
    if (propagateHeaders) {
      res.setHeader('X-Correlation-Id', correlationId);
      res.setHeader('X-Request-Id', requestId);
    }

    // ── Enrich user context after auth middleware runs ─────────────────
    const originalNext = next;
    const enrichOnce = () => {
      if (req.user && !context.userId) {
        context.userId = req.user._id || req.user.id;
        context.sessionId = req.sessionID;
      }
    };

    // ── Cleanup after response ────────────────────────────────────────
    const cleanup = () => {
      const duration = Date.now() - context.startTime;

      // Emit request trace event for long requests
      if (integrationBus && duration > 5000) {
        integrationBus
          .publish(
            'system',
            'request.slow',
            {
              path: req.path,
              method: req.method,
              duration,
              statusCode: res.statusCode,
              correlationId,
            },
            {
              metadata: { correlationId, source: sourceModule, requestId },
            }
          )
          .catch(() => {}); // fire-and-forget
      }

      clearContext(requestId);
    };

    res.on('finish', cleanup);
    res.on('close', cleanup);

    // Intercept next to enrich after auth
    next = () => {
      enrichOnce();
      originalNext();
    };

    next();
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Utility — Module Extraction from URL Path
// ═══════════════════════════════════════════════════════════════════════════════

const MODULE_PATH_MAP = {
  employee: 'hr',
  employees: 'hr',
  hr: 'hr',
  leave: 'hr',
  salary: 'hr',
  department: 'hr',
  payroll: 'finance',
  finance: 'finance',
  invoice: 'finance',
  payment: 'finance',
  expense: 'finance',
  budget: 'finance',
  accounting: 'finance',
  beneficiary: 'beneficiary',
  beneficiaries: 'beneficiary',
  assessment: 'beneficiary',
  disability: 'beneficiary',
  medical: 'medical',
  therapy: 'medical',
  prescription: 'medical',
  clinic: 'medical',
  health: 'medical',
  attendance: 'attendance',
  notification: 'notification',
  notifications: 'notification',
  auth: 'system',
  login: 'system',
  user: 'system',
  users: 'system',
  role: 'system',
  permission: 'system',
  dashboard: 'dashboard',
  report: 'reporting',
  reports: 'reporting',
  analytics: 'analytics',
  warehouse: 'supply-chain',
  inventory: 'supply-chain',
  supply: 'supply-chain',
  job: 'jobs',
  jobs: 'jobs',
  rehabilitation: 'rehabilitation',
};

function extractModuleFromPath(path) {
  if (!path) return 'unknown';
  // Remove /api/v1/ or /api/ prefix
  const cleaned = path.replace(/^\/api\/(v\d+\/)?/, '');
  const firstSegment = cleaned.split('/')[0]?.toLowerCase();
  return MODULE_PATH_MAP[firstSegment] || firstSegment || 'unknown';
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Express Routes — Context inspection endpoints (dev/admin only)
// ═══════════════════════════════════════════════════════════════════════════════

function mountIntegrationContextRoutes(app) {
  const express = require('express');
  const router = express.Router();

  router.get('/active', (req, res) => {
    res.json({
      success: true,
      data: {
        activeContexts: contextStore.size,
        note: 'Active request contexts in flight',
      },
    });
  });

  router.get('/inspect/:requestId', (req, res) => {
    const ctx = getContext(req.params.requestId);
    res.json({
      success: true,
      data: ctx || { message: 'Context not found or already cleaned up' },
    });
  });

  app.use('/api/v2/integration-context', router);
}

// ─── Module Exports ──────────────────────────────────────────────────────────

module.exports = {
  createIntegrationContextMiddleware,
  mountIntegrationContextRoutes,
  getContext,
  clearContext,
  extractModuleFromPath,
  MODULE_PATH_MAP,
};
