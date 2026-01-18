const AuditLog = require('../models/AuditLog');

/**
 * Advanced Audit Logging Service
 */
class AuditService {
  /**
   * Log an action asynchronously
   * @param {Object} ctx - The context (req)
   * @param {string} action - Action name (e.g. 'LOGIN')
   * @param {string} module - Module name (e.g. 'AUTH')
   * @param {Object} resource - Resource details {id, type}
   * @param {Object} changes - Changes {before, after}
   * @param {string} status - 'SUCCESS' | 'FAILURE'
   */
  static async log(ctx, action, module, resource = {}, changes = {}, status = 'SUCCESS', description = '') {
    try {
      // Don't block the main thread, fire and forget (or await if critical)
      const actor = ctx.user
        ? {
            id: ctx.user.id,
            name: ctx.user.fullName || 'Unknown',
            email: ctx.user.email,
            role: ctx.user.role,
            ip: ctx.ip || ctx.headers['x-forwarded-for'] || ctx.connection.remoteAddress,
          }
        : {
            ip: ctx.ip || 'Unknown',
            role: 'GUEST',
          };

      const meta = {
        userAgent: ctx.headers ? ctx.headers['user-agent'] : 'System',
        method: ctx.method,
        url: ctx.originalUrl,
      };

      const logEntry = new AuditLog({
        action,
        module,
        actor,
        resource,
        meta,
        changes,
        status,
        description,
      });

      await logEntry.save();
    } catch (error) {
      console.error('Audit Logging Failed:', error.message);
      // Fail silently to not disrupt user experience
    }
  }

  /**
   * Retrieve logs with filtering and pagination
   */
  static async getLogs(filters = {}, page = 1, limit = 20) {
    const query = {};

    if (filters.module) query.module = filters.module;
    if (filters.action) query.action = filters.action;
    if (filters.userId) query['actor.id'] = filters.userId;
    if (filters.startDate && filters.endDate) {
      query.timestamp = {
        $gte: new Date(filters.startDate),
        $lte: new Date(filters.endDate),
      };
    }

    const logs = await AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await AuditLog.countDocuments(query);

    return { logs, total, page, pages: Math.ceil(total / limit) };
  }
}

module.exports = AuditService;
module.exports.instance = new AuditService();
