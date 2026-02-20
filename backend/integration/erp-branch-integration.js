/**
 * ERP System Integration Module - Advanced Branch Management Integration
 * This module handles the complete integration between ERP and Advanced Branch System
 * Version: 2.0.0
 * Date: February 18, 2026
 */

const express = require('express');
const router = express.Router();

// =============================================
// BRANCH-ERP INTEGRATION SERVICE
// =============================================

class BranchERPIntegrationService {
  constructor() {
    this.baseURL = process.env.BRANCH_API_URL || 'http://localhost:5000/api/v2';
    this.apiKey = process.env.BRANCH_API_KEY || '';
    this.syncInterval = 60000; // 1 minute
  }

  /**
   * Sync branch data with ERP
   */
  async syncBranchesToERP() {
    try {
      const response = await fetch(`${this.baseURL}/branches`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch branches: ${response.statusText}`);
      }

      const branchesData = await response.json();
      
      // Transform and sync to ERP database
      const syncedBranches = await this.processBranchesForERP(branchesData.data);
      
      return {
        success: true,
        synced_count: syncedBranches.length,
        timestamp: new Date().toISOString(),
        branches: syncedBranches
      };
    } catch (error) {
      console.error('Branch sync error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Process branch data for ERP integration
   */
  async processBranchesForERP(branches) {
    return branches.map(branch => ({
      // ERP Core Fields
      id: branch.id,
      code: branch.code,
      name_en: branch.name_en,
      name_ar: branch.name_ar,
      status: this.mapBranchStatus(branch.status),
      
      // Location & Contact
      location: branch.location,
      city: branch.city,
      region: branch.region,
      country: branch.country,
      coordinates: {
        latitude: branch.latitude,
        longitude: branch.longitude
      },
      
      // Management
      director_name: branch.director_name,
      director_email: branch.director_email,
      phone: branch.phone,
      email: branch.email,
      
      // Metrics
      total_staff: branch.total_staff,
      max_capacity: branch.max_capacity,
      current_utilization: branch.current_utilization,
      annual_budget: branch.annual_budget,
      budget_spent: branch.budget_spent,
      
      // Hierarchy
      parent_branch_id: branch.parent_branch_id,
      
      // Sync Metadata
      sync_timestamp: new Date().toISOString(),
      source: 'advanced_branch_system',
      erp_last_updated: new Date().toISOString()
    }));
  }

  /**
   * Map branch statuses between systems
   */
  mapBranchStatus(status) {
    const statusMap = {
      'ACTIVE': 'ACTIVE',
      'INACTIVE': 'INACTIVE',
      'CLOSED': 'CLOSED',
      'SUSPENDED': 'SUSPENDED',
      'PLANNED': 'PLANNED'
    };
    return statusMap[status] || 'ACTIVE';
  }

  /**
   * Get branch performance metrics for ERP reporting
   */
  async getBranchPerformanceMetrics(branchId) {
    try {
      const response = await fetch(`${this.baseURL}/branches/${branchId}/performance`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch performance metrics`);
      }

      const metricsData = await response.json();
      
      return {
        success: true,
        branch_id: branchId,
        performance_score: metricsData.data.performance_score,
        kpis: metricsData.data.trends,
        insights: metricsData.data.insights,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Performance metrics fetch error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get inventory data for ERP stock management
   */
  async getBranchInventory(branchId) {
    try {
      const response = await fetch(`${this.baseURL}/branches/${branchId}/inventory`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch inventory`);
      }

      const inventoryData = await response.json();
      
      return {
        success: true,
        branch_id: branchId,
        items: inventoryData.data.items,
        total_value: inventoryData.data.total_value,
        turnover_rate: inventoryData.data.turnover_rate,
        recommendations: inventoryData.data.reorder_recommendations,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Inventory fetch error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get branch reports for ERP analytics
   */
  async getBranchReports(branchId, reportType = 'OPERATIONAL') {
    try {
      const response = await fetch(
        `${this.baseURL}/branches/${branchId}/reports?type=${reportType}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch reports`);
      }

      const reportsData = await response.json();
      
      return {
        success: true,
        branch_id: branchId,
        report_type: reportType,
        reports: reportsData.data,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Reports fetch error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get forecasts and predictions for ERP planning
   */
  async getBranchForecasts(branchId) {
    try {
      const response = await fetch(`${this.baseURL}/branches/${branchId}/forecasts`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch forecasts`);
      }

      const forecastData = await response.json();
      
      return {
        success: true,
        branch_id: branchId,
        demand_forecast: forecastData.data.demand_forecast,
        budget_forecast: forecastData.data.budget_forecast,
        performance_trend: forecastData.data.performance_trend,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Forecasts fetch error:', error);
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Start continuous sync
   */
  startContinuousSync() {
    console.log('Starting continuous branch-ERP sync...');
    
    // Initial sync
    this.syncBranchesToERP().then(result => {
      console.log('Initial sync result:', result);
    });

    // Periodic sync
    setInterval(() => {
      this.syncBranchesToERP().then(result => {
        if (result.success) {
          console.log(`[${new Date().toISOString()}] Synced ${result.synced_count} branches`);
        } else {
          console.error(`[${new Date().toISOString()}] Sync failed:`, result.error);
        }
      });
    }, this.syncInterval);
  }
}

// =============================================
// API ENDPOINTS
// =============================================

const integrationService = new BranchERPIntegrationService();

/**
 * Sync all branches
 */
router.post('/sync/branches', async (req, res) => {
  const result = await integrationService.syncBranchesToERP();
  res.json(result);
});

/**
 * Get branch KPIs for ERP dashboard
 */
router.get('/branches/:branchId/kpis', async (req, res) => {
  const { branchId } = req.params;
  const result = await integrationService.getBranchPerformanceMetrics(branchId);
  res.json(result);
});

/**
 * Get branch inventory for stock management
 */
router.get('/branches/:branchId/inventory-sync', async (req, res) => {
  const { branchId } = req.params;
  const result = await integrationService.getBranchInventory(branchId);
  res.json(result);
});

/**
 * Get branch reports
 */
router.get('/branches/:branchId/reports/:reportType', async (req, res) => {
  const { branchId, reportType } = req.params;
  const result = await integrationService.getBranchReports(branchId, reportType);
  res.json(result);
});

/**
 * Get forecasts for planning
 */
router.get('/branches/:branchId/forecasts', async (req, res) => {
  const { branchId } = req.params;
  const result = await integrationService.getBranchForecasts(branchId);
  res.json(result);
});

/**
 * Get comprehensive branch dashboard
 */
router.get('/branches/:branchId/dashboard', async (req, res) => {
  const { branchId } = req.params;
  
  try {
    const [performance, inventory, reports, forecasts] = await Promise.all([
      integrationService.getBranchPerformanceMetrics(branchId),
      integrationService.getBranchInventory(branchId),
      integrationService.getBranchReports(branchId, 'OPERATIONAL'),
      integrationService.getBranchForecasts(branchId)
    ]);

    const dashboard = {
      success: true,
      branch_id: branchId,
      performance,
      inventory,
      reports,
      forecasts,
      generated_at: new Date().toISOString()
    };

    res.json(dashboard);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health check
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ERP-Branch Integration',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// =============================================
// INITIALIZATION
// =============================================

function initializeIntegration(app) {
  console.log('Initializing ERP-Branch Integration Service');
  
  // Mount routes
  app.use('/api/integration', router);
  
  // Start continuous sync if enabled
  if (process.env.ENABLE_CONTINUOUS_SYNC === 'true') {
    integrationService.startContinuousSync();
  }
  
  console.log('ERP-Branch Integration Service initialized successfully');
}

module.exports = {
  router,
  BranchERPIntegrationService,
  initializeIntegration
};
