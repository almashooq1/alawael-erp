/**
 * MOI Passport Integration Routes - مسارات تكامل الجوازات
 * Express Routes for Passport Verification & Management
 * Version: 3.0.0
 */

const express = require('express');
const router = express.Router();
const MOIPassportService = require('../services/moi-passport.service');
const Logger = require('../utils/logger');
const { authenticate } = require('../middleware/auth');

// Initialize service
const passportService = new MOIPassportService();

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Passport verification middleware
 */
const passportVerificationMiddleware = (req, res, next) => {
  try {
    console.log('[MOI-MIDDLEWARE] passportVerificationMiddleware called for:', req.path);
    req.passportService = passportService;
    next();
  } catch (error) {
    console.error('[MOI-MIDDLEWARE] passportVerificationMiddleware error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Service initialization failed',
    });
  }
};

router.use(passportVerificationMiddleware);

/**
 * Request validation middleware
 */
const validateRequest = (req, res, next) => {
  try {
    const { body, user } = req;
    req.userId = user?.id || 'system';
    next();
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid request',
    });
  }
};

// ============================================================================
// PUBLIC ENDPOINTS (No Auth Required)
// ============================================================================

/**
 * GET /api/moi/health
 * Health check endpoint
 */
router.get('/health', (req, res) => {
  console.log('[MOI-HEALTH] Health endpoint called');
  res.json({
    success: true,
    status: 'healthy',
    service: 'MOI Passport Integration Service',
    version: '3.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// PROTECTED ENDPOINTS (Auth Required)
// ============================================================================

router.use(authenticate, validateRequest);

// ============================================================================
// VERIFICATION ENDPOINTS
// ============================================================================

/**
 * POST /api/moi/passports/verify
 * Verify Passport Number
 */
router.post('/passports/verify', async (req, res) => {
  try {
    const { passportNumber } = req.body;

    if (!passportNumber) {
      return res.status(400).json({
        success: false,
        error: 'Passport number is required',
      });
    }

    const result = await passportService.verifyPassport(passportNumber, req.userId);

    res.json({
      success: true,
      data: result,
      message: 'Passport verification successful',
    });
  } catch (error) {
    Logger.error('Passport verification error:', error);
    res.status(400).json({
      success: false,
      error: error.error || error.message,
      type: error.type || 'VERIFICATION_ERROR',
    });
  }
});

/**
 * POST /api/moi/national-ids/verify
 * Verify National ID
 */
router.post('/national-ids/verify', async (req, res) => {
  try {
    const { nationalId } = req.body;

    if (!nationalId) {
      return res.status(400).json({
        success: false,
        error: 'National ID is required',
      });
    }

    const result = await passportService.verifyNationalId(nationalId, req.userId);

    res.json({
      success: true,
      data: result,
      message: 'National ID verification successful',
    });
  } catch (error) {
    Logger.error('National ID verification error:', error);
    res.status(400).json({
      success: false,
      error: error.error || error.message,
      type: error.type || 'VERIFICATION_ERROR',
    });
  }
});

/**
 * POST /api/moi/iqamas/verify
 * Verify Iqama (Residency)
 */
router.post('/iqamas/verify', async (req, res) => {
  try {
    const { iqamaNumber } = req.body;

    if (!iqamaNumber) {
      return res.status(400).json({
        success: false,
        error: 'Iqama number is required',
      });
    }

    const result = await passportService.verifyIqama(iqamaNumber, req.userId);

    res.json({
      success: true,
      data: result,
      message: 'Iqama verification successful',
    });
  } catch (error) {
    Logger.error('Iqama verification error:', error);
    res.status(400).json({
      success: false,
      error: error.error || error.message,
      type: error.type || 'VERIFICATION_ERROR',
    });
  }
});

/**
 * POST /api/moi/verify/bulk
 * Bulk Verification - Multiple Documents
 */
router.post('/verify/bulk', async (req, res) => {
  try {
    const { documents } = req.body;

    if (!Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Documents array is required and must not be empty',
      });
    }

    if (documents.length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 100 documents per request',
      });
    }

    const results = [];
    const errors = [];

    for (const doc of documents) {
      try {
        let result;

        if (doc.type === 'passport' && doc.value) {
          result = await passportService.verifyPassport(doc.value, req.userId);
        } else if (doc.type === 'national-id' && doc.value) {
          result = await passportService.verifyNationalId(doc.value, req.userId);
        } else if (doc.type === 'iqama' && doc.value) {
          result = await passportService.verifyIqama(doc.value, req.userId);
        } else {
          throw new Error(`Unknown document type: ${doc.type}`);
        }

        results.push({
          type: doc.type,
          identifier: doc.value,
          result: result.data,
          status: 'verified',
        });
      } catch (error) {
        errors.push({
          type: doc.type,
          identifier: doc.value,
          error: error.message || error.error,
          status: 'failed',
        });
      }
    }

    res.json({
      success: errors.length === 0,
      data: {
        verified: results,
        failed: errors,
        summary: {
          total: documents.length,
          successful: results.length,
          failed: errors.length,
          successRate: `${((results.length / documents.length) * 100).toFixed(2)}%`,
        },
      },
    });
  } catch (error) {
    Logger.error('Bulk verification error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// VISA & TRAVEL ENDPOINTS
// ============================================================================

/**
 * POST /api/moi/exit-reentry/request
 * Request Exit/Re-entry Visa
 */
router.post('/exit-reentry/request', async (req, res) => {
  try {
    const { iqamaNumber, visaType = 'multiple', duration = 90 } = req.body;

    if (!iqamaNumber) {
      return res.status(400).json({
        success: false,
        error: 'Iqama number is required',
      });
    }

    const result = await passportService.requestExitReentryVisa(
      iqamaNumber,
      visaType,
      duration,
      req.userId
    );

    res.json({
      success: true,
      data: result,
      message: 'Exit/Re-entry visa request successful',
    });
  } catch (error) {
    Logger.error('Exit/Re-entry request error:', error);
    res.status(400).json({
      success: false,
      error: error.error || error.message,
      type: error.type || 'VISA_REQUEST_ERROR',
    });
  }
});

/**
 * GET /api/moi/travelers/:iqamaNumber
 * Get Complete Traveler Profile
 */
router.get('/travelers/:iqamaNumber', async (req, res) => {
  try {
    const { iqamaNumber } = req.params;

    if (!iqamaNumber) {
      return res.status(400).json({
        success: false,
        error: 'Iqama number is required',
      });
    }

    const result = await passportService.getTravelerProfile(iqamaNumber, req.userId);

    res.json({
      success: true,
      data: result,
      message: 'Traveler profile retrieved successfully',
    });
  } catch (error) {
    Logger.error('Traveler profile error:', error);
    res.status(400).json({
      success: false,
      error: error.error || error.message,
    });
  }
});

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * GET /api/moi/cache/stats
 * Get Cache Statistics
 */
router.get('/cache/stats', (req, res) => {
  try {
    const cacheMetrics = passportService.getMetrics();

    res.json({
      success: true,
      data: {
        cache: {
          size: cacheMetrics.cacheSize,
          maxSize: cacheMetrics.maxCacheSize,
          utilization: cacheMetrics.cacheUtilization,
          hits: cacheMetrics.totalCacheHits,
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/moi/cache/clear
 * Clear Cache
 */
router.post('/cache/clear', (req, res) => {
  try {
    const { pattern } = req.body;
    const result = passportService.clearCache(pattern);

    res.json({
      success: true,
      data: result,
      message: `Cache cleared: ${result.cleared || 'all'} items removed`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// METRICS & MONITORING
// ============================================================================

/**
 * GET /api/moi/metrics
 * Get Service Metrics
 */
router.get('/metrics', (req, res) => {
  try {
    const metrics = passportService.getMetrics();

    res.json({
      success: true,
      data: {
        requests: {
          total: metrics.totalRequests,
          successful: metrics.successfulRequests,
          failed: metrics.failedRequests,
          successRate: metrics.successRate,
          averageResponseTime: metrics.averageResponseTime,
        },
        cache: {
          hits: metrics.totalCacheHits,
          size: metrics.cacheSize,
          maxSize: metrics.maxCacheSize,
          utilization: metrics.cacheUtilization,
        },
        logs: {
          errorLogSize: metrics.errorLogSize,
          auditLogSize: metrics.auditLogSize,
        },
      },
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/moi/health
 * Health Check
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await passportService.healthCheck();

    res.json({
      success: healthStatus.status === 'healthy',
      data: healthStatus,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      details: error.message,
    });
  }
});

// ============================================================================
// AUDIT LOG ENDPOINTS
// ============================================================================

/**
 * GET /api/moi/audit-logs
 * Get Audit Logs
 */
router.get('/audit-logs', (req, res) => {
  try {
    const { action, userId, limit, startDate, endDate } = req.query;

    const filters = {};
    if (action) filters.action = action;
    if (userId) filters.userId = userId;
    if (limit) filters.limit = parseInt(limit);
    if (startDate && endDate) {
      filters.startDate = new Date(startDate);
      filters.endDate = new Date(endDate);
    }

    const logs = passportService.getAuditLog(filters);

    res.json({
      success: true,
      data: {
        logs,
        count: logs.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

router.use((error, req, res, next) => {
  Logger.error('Passport route error:', error);

  res.status(error.statusCode || 500).json({
    success: false,
    error: error.message || 'Internal server error',
    type: error.type || 'INTERNAL_ERROR',
    timestamp: new Date(),
  });
});

module.exports = router;
