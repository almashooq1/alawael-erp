const AuditLog = require('../../backend/models/AuditLog');

/**
 * Audit logger middleware for Express routes
 * Usage: auditLogger({ action, module, resourceType })
 */
function auditLogger({ action, module, resourceType }) {
  return async (req, res, next) => {
    // Capture before state if needed
    const before = req.beforeResource || null;
    // After response
    res.on('finish', async () => {
      try {
        const actor = req.user
          ? {
              id: req.user._id,
              name: req.user.name,
              email: req.user.email,
              role: req.user.role,
              ip: req.ip,
            }
          : { ip: req.ip };
        const resource = req.resourceId
          ? { id: req.resourceId, type: resourceType }
          : { type: resourceType };
        const log = new AuditLog({
          action,
          module,
          actor,
          resource,
          meta: {
            userAgent: req.headers['user-agent'],
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
          },
          changes: {
            before,
            after: res.locals.savedResource || null,
          },
          status: res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
          description: `${action} ${resourceType}`,
        });
        await log.save();
      } catch (err) {
        // Silent fail
      }
    });
    next();
  };
}

module.exports = auditLogger;
