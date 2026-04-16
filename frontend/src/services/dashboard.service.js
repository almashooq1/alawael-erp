/**
 * Dashboard API client — wraps /api/dashboard/* endpoints.
 */

import apiClient from './api.client';

const base = '/dashboard';

export async function getKpiDefinitions() {
  const { data } = await apiClient.get(`${base}/kpi-definitions`);
  return data;
}

export async function getExecutiveSnapshot(params = {}) {
  const { data } = await apiClient.get(`${base}/executive-snapshot`, { params });
  return data;
}

export async function getKpi(id, params = {}) {
  const { data } = await apiClient.get(`${base}/kpi/${encodeURIComponent(id)}`, { params });
  return data;
}

export async function getKpiByCategory(category, params = {}) {
  const { data } = await apiClient.get(`${base}/kpi`, {
    params: { category, ...params },
  });
  return data;
}

export default {
  getKpiDefinitions,
  getExecutiveSnapshot,
  getKpi,
  getKpiByCategory,
};
