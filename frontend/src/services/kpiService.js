/**
 * kpiService — read-only access to the canonical KPI registry and dashboard values.
 *
 * Powers pages that need registry-based KPIs instead of ad-hoc custom KPIs.
 */

import apiClient from './api.client';
import logger from 'utils/logger';

export const kpiService = {
  async getRegistryKPIs(role = null) {
    try {
      const res = await apiClient.get('/api/v1/dashboards/kpis', {
        params: role ? { role } : undefined,
      });
      const payload = res?.data;
      return {
        success: true,
        data: payload?.kpis || payload?.data || [],
      };
    } catch (err) {
      logger.warn('kpiService.getRegistryKPIs error:', err?.message);
      return { success: false, data: [], error: err?.message || 'فشل تحميل مؤشرات الأداء' };
    }
  },

  async getDashboard(dashboardId = 'rehab', filters = {}) {
    try {
      const res = await apiClient.get(`/api/v1/dashboards/${dashboardId}`, { params: filters });
      return { success: true, data: res?.data };
    } catch (err) {
      logger.warn('kpiService.getDashboard error:', err?.message);
      return { success: false, data: null, error: err?.message || 'فشل تحميل لوحة المؤشرات' };
    }
  },

  async getComputedDashboard(branchId, periodType = 'monthly') {
    try {
      const res = await apiClient.get('/api/v1/kpi-dashboard/dashboard', {
        params: { branchId, periodType },
      });
      return { success: true, data: res?.data };
    } catch (err) {
      logger.warn('kpiService.getComputedDashboard error:', err?.message);
      return { success: false, data: null, error: err?.message || 'فشل تحميل المؤشرات المحسوبة' };
    }
  },
};

export default kpiService;
