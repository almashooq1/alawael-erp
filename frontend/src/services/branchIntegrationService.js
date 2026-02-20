/**
 * Branch-ERP Integration Service
 * Handles all API calls to the branch-ERP integration endpoints
 * API Base: http://localhost:3001/api/integration
 */

import apiClient from './apiClient';

const INTEGRATION_BASE = '/integration';

const branchIntegrationService = {
  // ==================== HEALTH & STATUS ====================

  /**
   * Check service health
   * GET /integration/health
   */
  checkHealth: async () => {
    try {
      return await apiClient.get(`${INTEGRATION_BASE}/health`);
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  },

  /**
   * Get detailed service status
   * GET /integration/status
   */
  getStatus: async () => {
    try {
      return await apiClient.get(`${INTEGRATION_BASE}/status`);
    } catch (error) {
      console.error('Status check failed:', error);
      throw error;
    }
  },

  /**
   * Validate configuration
   * GET /integration/validate
   */
  validateConfiguration: async () => {
    try {
      return await apiClient.get(`${INTEGRATION_BASE}/validate`);
    } catch (error) {
      console.error('Configuration validation failed:', error);
      throw error;
    }
  },

  // ==================== BRANCH DATA ====================

  /**
   * Get all branches and trigger sync
   * POST /integration/sync/branches
   */
  syncBranches: async () => {
    try {
      return await apiClient.post(`${INTEGRATION_BASE}/sync/branches`);
    } catch (error) {
      console.error('Branch sync failed:', error);
      throw error;
    }
  },

  /**
   * Get branch KPIs (Key Performance Indicators)
   * GET /integration/branches/:branchId/kpis
   */
  getBranchKPIs: async (branchId) => {
    if (!branchId) throw new Error('Branch ID is required');
    try {
      return await apiClient.get(`${INTEGRATION_BASE}/branches/${branchId}/kpis`);
    } catch (error) {
      console.error(`Failed to fetch KPIs for branch ${branchId}:`, error);
      throw error;
    }
  },

  /**
   * Get branch inventory data
   * GET /integration/branches/:branchId/inventory-sync
   */
  getBranchInventory: async (branchId) => {
    if (!branchId) throw new Error('Branch ID is required');
    try {
      return await apiClient.get(`${INTEGRATION_BASE}/branches/${branchId}/inventory-sync`);
    } catch (error) {
      console.error(`Failed to fetch inventory for branch ${branchId}:`, error);
      throw error;
    }
  },

  /**
   * Get branch reports
   * GET /integration/branches/:branchId/reports/:reportType
   * @param {string} branchId - Branch identifier
   * @param {string} reportType - OPERATIONAL, FINANCIAL, or QUALITY
   */
  getBranchReport: async (branchId, reportType = 'FINANCIAL') => {
    if (!branchId) throw new Error('Branch ID is required');
    try {
      return await apiClient.get(
        `${INTEGRATION_BASE}/branches/${branchId}/reports/${reportType}`
      );
    } catch (error) {
      console.error(`Failed to fetch ${reportType} report for branch ${branchId}:`, error);
      throw error;
    }
  },

  /**
   * Get 30-day branch forecasts
   * GET /integration/branches/:branchId/forecasts
   */
  getBranchForecasts: async (branchId) => {
    if (!branchId) throw new Error('Branch ID is required');
    try {
      return await apiClient.get(`${INTEGRATION_BASE}/branches/${branchId}/forecasts`);
    } catch (error) {
      console.error(`Failed to fetch forecasts for branch ${branchId}:`, error);
      throw error;
    }
  },

  /**
   * Get aggregated branch dashboard data
   * GET /integration/branches/:branchId/dashboard
   * Returns KPIs, inventory, reports, and forecasts combined
   */
  getBranchDashboard: async (branchId) => {
    if (!branchId) throw new Error('Branch ID is required');
    try {
      return await apiClient.get(`${INTEGRATION_BASE}/branches/${branchId}/dashboard`);
    } catch (error) {
      console.error(`Failed to fetch dashboard for branch ${branchId}:`, error);
      throw error;
    }
  },

  // ==================== SYNC MANAGEMENT ====================

  /**
   * Start continuous automatic sync
   * POST /integration/sync/start
   */
  startContinuousSync: async () => {
    try {
      return await apiClient.post(`${INTEGRATION_BASE}/sync/start`);
    } catch (error) {
      console.error('Failed to start continuous sync:', error);
      throw error;
    }
  },

  /**
   * Stop continuous automatic sync
   * POST /integration/sync/stop
   */
  stopContinuousSync: async () => {
    try {
      return await apiClient.post(`${INTEGRATION_BASE}/sync/stop`);
    } catch (error) {
      console.error('Failed to stop continuous sync:', error);
      throw error;
    }
  },

  /**
   * Get current sync status and history
   * GET /integration/sync/status
   */
  getSyncStatus: async () => {
    try {
      return await apiClient.get(`${INTEGRATION_BASE}/sync/status`);
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
      throw error;
    }
  },

  // ==================== BATCH OPERATIONS ====================

  /**
   * Fetch multiple branches' data in parallel
   * Useful for dashboard overview
   */
  fetchMultipleBranchesData: async (branchIds, dataType = 'dashboard') => {
    if (!Array.isArray(branchIds) || branchIds.length === 0) {
      throw new Error('Branch IDs array is required');
    }

    try {
      const promises = branchIds.map((id) => {
        if (dataType === 'dashboard') {
          return this.getBranchDashboard(id);
        } else if (dataType === 'kpis') {
          return this.getBranchKPIs(id);
        } else if (dataType === 'inventory') {
          return this.getBranchInventory(id);
        } else {
          return this.getBranchDashboard(id);
        }
      });

      return await Promise.all(promises);
    } catch (error) {
      console.error('Failed to fetch multiple branches data:', error);
      throw error;
    }
  },

  /**
   * Get all reports for a branch across all types
   */
  getAllBranchReports: async (branchId) => {
    if (!branchId) throw new Error('Branch ID is required');

    try {
      const reportTypes = ['OPERATIONAL', 'FINANCIAL', 'QUALITY'];
      const promises = reportTypes.map((type) =>
        this.getBranchReport(branchId, type)
          .then((data) => ({ type, data }))
          .catch((error) => ({ type, error: error.message }))
      );

      const results = await Promise.all(promises);
      return results.reduce((acc, item) => {
        acc[item.type.toLowerCase()] = item.data || null;
        return acc;
      }, {});
    } catch (error) {
      console.error(`Failed to fetch all reports for branch ${branchId}:`, error);
      throw error;
    }
  },

  // ==================== UTILITY METHODS ====================

  /**
   * Format API response for UI consumption
   */
  formatBranchData: (apiResponse) => {
    if (!apiResponse) return null;

    return {
      success: apiResponse.success || false,
      timestamp: apiResponse.timestamp || new Date().toISOString(),
      data: apiResponse.data || {},
      error: apiResponse.error || null,
    };
  },

  /**
   * Check if service is healthy with timeout
   */
  isServiceHealthy: async (timeoutMs = 5000) => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Health check timeout')), timeoutMs)
      );

      const healthPromise = this.checkHealth();
      const result = await Promise.race([healthPromise, timeoutPromise]);

      return result?.success === true;
    } catch (error) {
      console.error('Service health check failed:', error);
      return false;
    }
  },

  /**
   * Get integration service info
   */
  getServiceInfo: async () => {
    try {
      const health = await this.checkHealth();
      const status = await this.getStatus();

      return {
        health,
        status,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get service info:', error);
      throw error;
    }
  },
};

export default branchIntegrationService;
