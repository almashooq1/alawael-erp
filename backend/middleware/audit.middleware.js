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

module.exports = auditMiddleware;
