/**
 * Tenant Routes
 * مسارات الالتزام
 *
 * API Routes for multi-tenant support
 * مسارات API لدعم متعدد الالتزام
 */

const express = require('express');
const tenantController = require('../controllers/tenant.controller');
const { _authenticateToken } = require('../middleware/auth');

const router = express.Router();

// If tenantController is a Router, use it directly
if (tenantController && tenantController._router) {
  // tenantController is a Router, merge its routes
  router.use('/', tenantController);
} else if (
  typeof tenantController === 'function' ||
  (tenantController && typeof tenantController.getAll === 'function')
) {
  // tenantController is object with action methods or middleware
  router.all('/', (_req, res) => {
    res.status(501).json({
      success: false,
      message: 'Tenant routes not fully initialized',
      status: 'NOT_IMPLEMENTED',
    });
  });
} else {
  // Fallback: all routes return 501 (not implemented)
  router.all('*', (_req, res) => {
    res.status(501).json({
      success: false,
      message: 'Tenant routes not fully initialized',
      status: 'NOT_IMPLEMENTED',
    });
  });
}

module.exports = router;
