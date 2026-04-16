/**
 * Alerts API client — wraps /api/alerts/* endpoints.
 */

import apiClient from './api.client';

const base = '/alerts';

export async function getActiveAlerts(params = {}) {
  const { data } = await apiClient.get(`${base}/active`, { params });
  return data;
}

export async function getAlertById(id) {
  const { data } = await apiClient.get(`${base}/${encodeURIComponent(id)}`);
  return data;
}

export async function acknowledgeAlert(id, note) {
  const { data } = await apiClient.post(`${base}/${encodeURIComponent(id)}/acknowledge`, { note });
  return data;
}

export async function snoozeAlert(id, minutes = 60) {
  const { data } = await apiClient.post(`${base}/${encodeURIComponent(id)}/snooze`, { minutes });
  return data;
}

export async function getRules() {
  const { data } = await apiClient.get(`${base}/rules/list`);
  return data;
}

export default {
  getActiveAlerts,
  getAlertById,
  acknowledgeAlert,
  snoozeAlert,
  getRules,
};
