/**
 * Executive Dashboard Service
 * Frontend service for managing dashboard data and operations
 */

import api from '../../utils/api';

class ExecutiveDashboardService {
  constructor() {
    this.baseUrl = '/api/executive-dashboard';
    this.cacheKey = 'executiveDashboardCache';
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get executive dashboard overview
   */
  async getDashboard() {
    try {
      const response = await api.get(this.baseUrl);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      throw error;
    }
  }

  /**
   * Get all KPIs
   */
  async getKPIs(filters = {}) {
    try {
      const params = new URLSearchParams(filters).toString();
      const response = await api.get(`${this.baseUrl}/kpis${params ? '?' + params : ''}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      throw error;
    }
  }

  /**
   * Get KPI details with analytics
   */
  async getKPIDetails(kpiId) {
    try {
      const response = await api.get(`${this.baseUrl}/kpis/${kpiId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching KPI details:', error);
      throw error;
    }
  }

  /**
   * Get KPI insights
   */
  async getKPIInsights(kpiId) {
    try {
      const response = await api.get(`${this.baseUrl}/kpis/${kpiId}/insights`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching KPI insights:', error);
      throw error;
    }
  }

  /**
   * Create new KPI
   */
  async createKPI(kpiData) {
    try {
      const response = await api.post(`${this.baseUrl}/kpis`, kpiData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating KPI:', error);
      throw error;
    }
  }

  /**
   * Update KPI value
   */
  async updateKPIValue(kpiId, value) {
    try {
      const response = await api.put(`${this.baseUrl}/kpis/${kpiId}`, {
        value,
        timestamp: new Date(),
      });
      return response.data.data;
    } catch (error) {
      console.error('Error updating KPI:', error);
      throw error;
    }
  }

  /**
   * Get AI insights
   */
  async getAIInsights() {
    try {
      const response = await api.get(`${this.baseUrl}/ai-insights`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching AI insights:', error);
      throw error;
    }
  }

  /**
   * Get AI briefing
   */
  async getAIBriefing() {
    try {
      const response = await api.get(`${this.baseUrl}/ai-briefing`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching AI briefing:', error);
      throw error;
    }
  }

  /**
   * Get department comparison
   */
  async getDepartmentComparison() {
    try {
      const response = await api.get(`${this.baseUrl}/departments`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching department comparison:', error);
      throw error;
    }
  }

  /**
   * Generate executive report
   */
  async generateReport(period = 'monthly') {
    try {
      const response = await api.get(`${this.baseUrl}/report`, {
        params: { period },
      });
      return response.data.data;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  }

  /**
   * Get real-time data
   */
  async getRealtimeData() {
    try {
      const response = await api.get(`${this.baseUrl}/realtime`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching real-time data:', error);
      throw error;
    }
  }

  /**
   * Get data quality metrics
   */
  async getDataQuality() {
    try {
      const response = await api.get(`${this.baseUrl}/data-quality`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching data quality:', error);
      throw error;
    }
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats() {
    try {
      const response = await api.get(`${this.baseUrl}/connection-stats`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching connection stats:', error);
      throw error;
    }
  }

  /**
   * Refresh all data
   */
  async refreshData() {
    try {
      const response = await api.post(`${this.baseUrl}/refresh`);
      return response.data.data;
    } catch (error) {
      console.error('Error refreshing data:', error);
      throw error;
    }
  }

  /**
   * Create custom dashboard
   */
  async createDashboard(dashboardData) {
    try {
      const response = await api.post(`${this.baseUrl}/dashboards`, dashboardData);
      return response.data.data;
    } catch (error) {
      console.error('Error creating dashboard:', error);
      throw error;
    }
  }

  /**
   * Get custom dashboard
   */
  async getDashboard(dashboardId) {
    try {
      const response = await api.get(`${this.baseUrl}/dashboards/${dashboardId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error fetching dashboard:', error);
      throw error;
    }
  }

  /**
   * Add widget to dashboard
   */
  async addWidget(dashboardId, widgetData) {
    try {
      const response = await api.post(
        `${this.baseUrl}/dashboards/${dashboardId}/widgets`,
        widgetData
      );
      return response.data.data;
    } catch (error) {
      console.error('Error adding widget:', error);
      throw error;
    }
  }

  /**
   * Export dashboard as PDF
   */
  async exportPDF(dashboardId) {
    try {
      const response = await api.get(
        `${this.baseUrl}/dashboards/${dashboardId}/export/pdf`,
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      console.error('Error exporting PDF:', error);
      throw error;
    }
  }

  /**
   * Cache management
   */
  setCache(key, data) {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    sessionStorage.setItem(`${this.cacheKey}_${key}`, JSON.stringify(cacheData));
  }

  getCache(key) {
    const cached = sessionStorage.getItem(`${this.cacheKey}_${key}`);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > this.cacheTimeout) {
      sessionStorage.removeItem(`${this.cacheKey}_${key}`);
      return null;
    }

    return data;
  }

  clearCache() {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(this.cacheKey)) {
        sessionStorage.removeItem(key);
      }
    });
  }
}

export default new ExecutiveDashboardService();
