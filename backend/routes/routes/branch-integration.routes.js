/**
 * Branch-ERP Integration Routes
 * Handles all integration endpoints between ERP and Advanced Branch Management System
 * Version: 2.0.0
 * Date: February 18, 2026
 */

const express = require('express');
const router = express.Router();
const { BranchERPIntegrationService } = require('../integration/erp-branch-integration');

// Initialize integration service
const integrationService = new BranchERPIntegrationService();

// Track sync statistics
integrationService.lastSyncTime = null;
integrationService.syncCount = 0;

// =============================================
// MIDDLEWARE
// =============================================

/**
 * Verify API key for integration endpoints
 */
const verifyIntegrationKey = (req, res, next) => {
  const apiKey = req.headers['x-integration-key'] || req.headers['authorization']?.replace('Bearer ', '');
  
  if (!apiKey || apiKey !== process.env.INTEGRATION_SECRET_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or missing integration API key',
      timestamp: new Date().toISOString()
    });
  }
  
  next();
};

// =============================================
// PUBLIC ENDPOINTS (No Auth Required)
// =============================================

/**
 * Health Check Endpoint
 * GET /api/integration/health
 */
router.get('/health', (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      status: 'healthy',
      service: 'Branch-ERP Integration Service',
      version: '2.0.0',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get Integration Status
 * GET /api/integration/status
 */
router.get('/status', async (req, res) => {
  try {
    const status = {
      success: true,
      status: 'operational',
      service: 'Branch-ERP Integration Service',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      endpoints: {
        sync: 'POST /api/integration/sync/branches',
        kpis: 'GET /api/integration/branches/:branchId/kpis',
        inventory: 'GET /api/integration/branches/:branchId/inventory-sync',
        reports: 'GET /api/integration/branches/:branchId/reports/:reportType',
        forecasts: 'GET /api/integration/branches/:branchId/forecasts',
        dashboard: 'GET /api/integration/branches/:branchId/dashboard'
      },
      authentication: process.env.INTEGRATION_SECRET_KEY ? 'required' : 'disabled'
    };
    
    return res.status(200).json(status);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// PROTECTED ENDPOINTS (Auth Required)
// =============================================

// Apply auth middleware to protected routes (optional based on config)
if (process.env.REQUIRE_INTEGRATION_AUTH === 'true') {
  router.use(verifyIntegrationKey);
}

/**
 * Sync Branches to ERP
 * POST /api/integration/sync/branches
 * Manually trigger branch data synchronization
 */
router.post('/sync/branches', async (req, res) => {
  try {
    const result = await integrationService.syncBranchesToERP();
    integrationService.lastSyncTime = new Date();
    integrationService.syncCount = (integrationService.syncCount || 0) + 1;
    
    return res.status(200).json({
      success: result.success,
      message: `Synced ${result.synced_count} branches`,
      data: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get Branch Performance Metrics (KPIs)
 * GET /api/integration/branches/:branchId/kpis
 */
router.get('/branches/:branchId/kpis', async (req, res) => {
  try {
    const { branchId } = req.params;
    
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'Branch ID is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const metrics = await integrationService.getBranchPerformanceMetrics(branchId);
    
    return res.status(200).json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('KPI retrieval error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get Branch Inventory Data
 * GET /api/integration/branches/:branchId/inventory-sync
 */
router.get('/branches/:branchId/inventory-sync', async (req, res) => {
  try {
    const { branchId } = req.params;
    
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'Branch ID is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const inventory = await integrationService.getBranchInventory(branchId);
    
    return res.status(200).json({
      success: true,
      data: inventory,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Inventory retrieval error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get Branch Reports
 * GET /api/integration/branches/:branchId/reports/:reportType
 * Report types: OPERATIONAL, FINANCIAL, QUALITY
 */
router.get('/branches/:branchId/reports/:reportType', async (req, res) => {
  try {
    const { branchId, reportType } = req.params;
    
    if (!branchId || !reportType) {
      return res.status(400).json({
        success: false,
        error: 'Branch ID and report type are required',
        timestamp: new Date().toISOString()
      });
    }
    
    const validTypes = ['OPERATIONAL', 'FINANCIAL', 'QUALITY'];
    if (!validTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid report type. Allowed: ${validTypes.join(', ')}`,
        timestamp: new Date().toISOString()
      });
    }
    
    const report = await integrationService.getBranchReports(branchId, reportType);
    
    return res.status(200).json({
      success: true,
      data: report,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Report retrieval error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get Branch Forecasts
 * GET /api/integration/branches/:branchId/forecasts
 * Includes demand, budget, and performance predictions
 */
router.get('/branches/:branchId/forecasts', async (req, res) => {
  try {
    const { branchId } = req.params;
    
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'Branch ID is required',
        timestamp: new Date().toISOString()
      });
    }
    
    const forecasts = await integrationService.getBranchForecasts(branchId);
    
    return res.status(200).json({
      success: true,
      data: forecasts,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Forecast retrieval error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get Comprehensive Branch Dashboard
 * GET /api/integration/branches/:branchId/dashboard
 * Aggregates KPIs, inventory, reports, and forecasts
 */
router.get('/branches/:branchId/dashboard', async (req, res) => {
  try {
    const { branchId } = req.params;
    
    if (!branchId) {
      return res.status(400).json({
        success: false,
        error: 'Branch ID is required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Fetch all dashboard components in parallel
    const [kpis, inventory, reports, forecasts] = await Promise.all([
      integrationService.getBranchPerformanceMetrics(branchId),
      integrationService.getBranchInventory(branchId),
      integrationService.getBranchReports(branchId, 'FINANCIAL'),
      integrationService.getBranchForecasts(branchId)
    ]).catch(error => {
      console.error('Dashboard aggregation error:', error);
      return [null, null, null, null];
    });
    
    return res.status(200).json({
      success: true,
      data: {
        branchId,
        timestamp: new Date().toISOString(),
        components: {
          kpis,
          inventory,
          financialReport: reports,
          forecasts
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Dashboard retrieval error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Start Continuous Sync (if enabled)
 * POST /api/integration/sync/start
 */
router.post('/sync/start', async (req, res) => {
  try {
    if (process.env.ENABLE_CONTINUOUS_SYNC !== 'true') {
      return res.status(400).json({
        success: false,
        error: 'Continuous sync is not enabled. Set ENABLE_CONTINUOUS_SYNC=true',
        timestamp: new Date().toISOString()
      });
    }
    
    integrationService.startContinuousSync();
    
    return res.status(200).json({
      success: true,
      message: 'Continuous sync started',
      interval: `${integrationService.syncInterval}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync start error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Stop Continuous Sync
 * POST /api/integration/sync/stop
 */
router.post('/sync/stop', async (req, res) => {
  try {
    integrationService.stopContinuousSync();
    
    return res.status(200).json({
      success: true,
      message: 'Continuous sync stopped',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Sync stop error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get Sync Status
 * GET /api/integration/sync/status
 */
router.get('/sync/status', async (req, res) => {
  try {
    const status = {
      success: true,
      syncStatus: {
        enabled: process.env.ENABLE_CONTINUOUS_SYNC === 'true',
        interval: `${integrationService.syncInterval}ms`,
        nextSync: new Date(Date.now() + integrationService.syncInterval).toISOString(),
        lastSync: integrationService.lastSyncTime || null,
        syncCount: integrationService.syncCount || 0
      },
      timestamp: new Date().toISOString()
    };
    
    return res.status(200).json(status);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// HEALTH CHECK & VALIDATION
// =============================================

/**
 * Validate Integration Connection
 * GET /api/integration/validate
 */
router.get('/validate', async (req, res) => {
  try {
    const validation = {
      success: true,
      validation: {
        branchApiUrl: integrationService.baseURL,
        branchApiKeyConfigured: !!integrationService.apiKey,
        continuousSyncEnabled: process.env.ENABLE_CONTINUOUS_SYNC === 'true',
        integrationAuthRequired: process.env.REQUIRE_INTEGRATION_AUTH === 'true'
      },
      timestamp: new Date().toISOString()
    };
    
    return res.status(200).json(validation);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// =============================================
// ERROR HANDLING
// =============================================

router.use((err, req, res, next) => {
  console.error('Integration route error:', err);
  
  res.status(500).json({
    success: false,
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// =============================================
// EXPORTS
// =============================================

module.exports = {
  router,
  integrationService
};
