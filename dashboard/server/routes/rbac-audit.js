/**
 * ALAWAEL Quality Dashboard - RBAC & Audit API Routes
 * Phase 13 - Pillar 1: Advanced Features
 */

const express = require('express');
const router = express.Router();
const { requirePermission, requireRole, getRoleInfo, canAccess } = require('../middleware/rbac');

/**
 * GET /api/rbac/my-permissions
 * Get current user's permissions
 */
router.get('/rbac/my-permissions', (req, res) => {
  try {
    res.json({
      userId: req.user?.id,
      role: req.userRole,
      permissions: req.permissions,
      roleLevel: req.roleLevel,
      roleInfo: getRoleInfo(req.userRole),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error getting permissions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/rbac/roles
 * Get all available roles (Admin only)
 */
router.get('/rbac/roles', requireRole('ADMIN'), (req, res) => {
  try {
    // Import RBAC config
    const { rbacConfig } = require('../middleware/rbac');

    res.json({
      roles: rbacConfig.roles,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error getting roles:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/rbac/check-permission/:permission
 * Check if user has specific permission
 */
router.get('/rbac/check-permission/:permission', (req, res) => {
  try {
    const { canAccess } = require('../middleware/rbac');
    const permission = req.params.permission;

    res.json({
      userId: req.user?.id,
      permission,
      hasPermission: canAccess(req.userRole, permission),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error checking permission:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/audit/logs
 * Query audit logs (Admin only)
 */
router.get('/audit/logs', requirePermission('read:all'), (req, res) => {
  try {
    const { auditLogger } = req.app.locals;

    if (!auditLogger) {
      return res.status(500).json({ error: 'Audit logger not initialized' });
    }

    const filters = {
      userId: req.query.userId,
      action: req.query.action,
      category: req.query.category,
      severity: req.query.severity,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

    const logs = auditLogger.queryLogs(filters);

    res.json({
      count: logs.length,
      logs: logs.slice(0, 100), // Limit to 100 results
      filters,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error querying audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/audit/stats
 * Get audit statistics (Admin only)
 */
router.get('/audit/stats', requirePermission('read:all'), (req, res) => {
  try {
    const { auditLogger } = req.app.locals;

    if (!auditLogger) {
      return res.status(500).json({ error: 'Audit logger not initialized' });
    }

    const days = req.query.days || 7;
    const stats = auditLogger.getAuditStats(parseInt(days));

    res.json({
      period: `Last ${days} days`,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error getting audit stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/audit/export
 * Export audit logs for compliance (Admin only)
 */
router.get('/audit/export', requirePermission('read:all'), (req, res) => {
  try {
    const { auditLogger } = req.app.locals;

    if (!auditLogger) {
      return res.status(500).json({ error: 'Audit logger not initialized' });
    }

    const filters = {
      userId: req.query.userId,
      action: req.query.action,
      category: req.query.category,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    };

    const format = req.query.format || 'json';
    const exported = auditLogger.exportLogs(filters, format);

    if (format === 'csv') {
      res.type('text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="audit-export-${new Date().toISOString()}.csv"`
      );
    } else {
      res.type('application/json');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="audit-export-${new Date().toISOString()}.json"`
      );
    }

    res.send(exported);
  } catch (error) {
    console.error('❌ Error exporting audit logs:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/audit/security-events
 * Get recent security events (Admin only)
 */
router.get('/audit/security-events', requireRole('ADMIN'), (req, res) => {
  try {
    const { auditLogger } = req.app.locals;

    if (!auditLogger) {
      return res.status(500).json({ error: 'Audit logger not initialized' });
    }

    const days = req.query.days || 7;
    const stats = auditLogger.getAuditStats(parseInt(days));

    res.json({
      securityEvents: stats.securityEvents,
      count: stats.securityEvents.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error getting security events:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/audit/cleanup
 * Trigger audit log cleanup (Admin only)
 */
router.post('/audit/cleanup', requireRole('ADMIN'), (req, res) => {
  try {
    const { auditLogger } = req.app.locals;

    if (!auditLogger) {
      return res.status(500).json({ error: 'Audit logger not initialized' });
    }

    auditLogger.cleanupOldLogs();

    res.json({
      message: 'Audit log cleanup initiated',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error during audit cleanup:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
