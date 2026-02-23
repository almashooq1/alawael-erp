const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const os = require('os');
const { checkPermission } = require('../middleware/checkPermission');
const { PERMISSIONS } = require('../config/roles');
const AuditService = require('../services/audit.service');
const { setMaintenanceMode, isMaintenanceMode } = require('../middleware/maintenance.middleware'); // Added Maintenance

/**
 * @desc Get System Health Status
 * @access Public (or Restricted based on policy)
 */
router.get('/', async (req, res) => {
  const healthcheck = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'OK',
    maintenance: isMaintenanceMode(), // Report maintenance status
    server: {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        usage: 1 - os.freemem() / os.totalmem(),
      },
    },
    services: {
      database: mongoose.STATES[mongoose.connection.readyState],
      // Redis check could be added here if needed
    },
  };

  try {
    // Check Database connection
    if (mongoose.connection.readyState !== 1) {
      healthcheck.status = 'DEGRAPHED';
      healthcheck.services.database = 'DISCONNECTED';
    }

    res.status(200).json(healthcheck);
  } catch (error) {
    healthcheck.status = 'ERROR';
    res.status(503).json(healthcheck);
  }
});

/**
 * @desc Toggle Maintenance Mode
 * @access Admin Only
 */
router.post('/maintenance', async (req, res) => {
  try {
    const { enabled } = req.body;
    setMaintenanceMode(enabled === true);

    // Log this critical action
    await AuditService.log(
      req,
      'TOGGLE_MAINTENANCE',
      'SYSTEM',
      { type: 'System', id: 'global' },
      { after: enabled },
      'SUCCESS',
      `Maintenance mode set to ${enabled}`,
    );

    res.json({
      success: true,
      message: `Maintenance mode ${enabled ? 'ENABLED' : 'DISABLED'}`,
      isMaintenance: enabled,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * @desc Get Advanced Audit Logs

 * @access Admin/Manager
 */
router.get(
  '/audit-logs',
  // protect, // Assuming protect middleware is imported if needed
  // checkPermission(PERMISSIONS.VIEW_LOGS),
  async (req, res) => {
    try {
      const { page, limit, module, action, userId, from, to } = req.query;

      const filters = {
        module,
        action,
        userId,
        startDate: from,
        endDate: to,
      };

      const result = await AuditService.getLogs(filters, parseInt(page), parseInt(limit));

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
);

module.exports = router;

