const AuditService = require('../services/audit.service');

/**
 * Middleware to log API requests to Audit Log
 * Use this for critical routes that need tracking
 */
const auditMiddleware = (actionName, moduleName) => {
  return (req, res, next) => {
    // Hook into response finish to log the outcome
    const originalSend = res.send;

    res.send = function (body) {
      const statusCode = res.statusCode;
      const status = statusCode >= 400 ? 'FAILURE' : 'SUCCESS';

      // Try to parse partial changes if possible (advanced usage)
      let resourceDetails = {};
      if (req.params.id) resourceDetails.id = req.params.id;

      AuditService.log(
        req,
        actionName || req.method,
        moduleName || 'API',
        resourceDetails,
        null, // changes tracking requires more complex logic
        status,
        `Request to ${req.originalUrl} finished with ${statusCode}`,
      );

      originalSend.call(this, body);
    };

    next();
  };
};

/**
 * Audit middleware for authentication events
 */
const auditAuthMiddleware = (actionName = 'AUTH_ACTION') => {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function (body) {
      const statusCode = res.statusCode;
      const status = statusCode < 400 ? 'SUCCESS' : 'FAILURE';

      AuditService.log(
        req,
        actionName,
        'AUTHENTICATION',
        {},
        null,
        status,
        `Authentication action: ${actionName}`,
      );

      originalSend.call(this, body);
    };

    next();
  };
};

/**
 * Audit middleware for CRUD operations
 */
const auditCrudMiddleware = (entityType) => {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function (body) {
      const statusCode = res.statusCode;
      const status = statusCode < 400 ? 'SUCCESS' : 'FAILURE';
      const method = req.method;
      const actionMap = {
        POST: 'CREATE',
        PUT: 'UPDATE',
        PATCH: 'UPDATE',
        DELETE: 'DELETE',
        GET: 'READ',
      };
      const action = actionMap[method] || 'OPERATION';

      AuditService.log(
        req,
        `${action}_${entityType.toUpperCase()}`,
        entityType,
        { id: req.params.id, type: entityType },
        null,
        status,
        `${action} operation on ${entityType}`,
      );

      originalSend.call(this, body);
    };

    next();
  };
};

/**
 * Audit middleware for brute force detection
 */
const auditBruteForceMiddleware = () => {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function (body) {
      const statusCode = res.statusCode;
      if (statusCode === 401 || statusCode === 429) {
        const status = statusCode === 429 ? 'FAILURE' : 'SUCCESS';

        AuditService.log(
          req,
          statusCode === 429 ? 'RATE_LIMIT_EXCEEDED' : 'AUTH_FAILED',
          'SECURITY',
          {},
          null,
          status,
          statusCode === 429 ? 'Rate limit exceeded' : 'Authentication failed',
        );
      }

      originalSend.call(this, body);
    };

    next();
  };
};

module.exports = {
  auditMiddleware,
  auditAuthMiddleware,
  auditCrudMiddleware,
  auditBruteForceMiddleware,
};
