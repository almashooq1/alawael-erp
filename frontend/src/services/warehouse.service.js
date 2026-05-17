/**
 * Warehouse Service — خدمة إدارة المستودعات
 */
import apiClient from './api.client';

const MOCK_DASHBOARD = {
  summary: { totalWarehouses: 0, totalItems: 0, lowStock: 0, totalValue: 0, transactions: 0 },
  categoryBreakdown: [],
  recentTransactions: [],
};

export async function getWarehouseDashboard() {
  try {
    const { data } = await apiClient.get('/api/v1/warehouse/dashboard');
    return data?.data || MOCK_DASHBOARD;
  } catch {
    return MOCK_DASHBOARD;
  }
}

export async function getWarehouses(params = {}) {
  try {
    const { data } = await apiClient.get('/api/v1/warehouse', { params });
    return data?.data || [];
  } catch {
    return [];
  }
}

export async function getWarehouse(id) {
  try {
    const { data } = await apiClient.get(`/api/v1/warehouse/${id}`);
    return data?.data || null;
  } catch {
    return null;
  }
}

export async function createWarehouse(payload) {
  const { data } = await apiClient.post('/api/v1/warehouse', payload);
  return data?.data;
}

export async function updateWarehouse(id, payload) {
  const { data } = await apiClient.put(`/api/v1/warehouse/${id}`, payload);
  return data?.data;
}

export async function deleteWarehouse(id) {
  const { data } = await apiClient.delete(`/api/v1/warehouse/${id}`);
  return data?.data;
}

export async function getWarehouseItems(warehouseId, params = {}) {
  try {
    const { data } = await apiClient.get(`/api/v1/warehouse/${warehouseId}/items`, { params });
    return data?.data || [];
  } catch {
    return [];
  }
}

export async function createWarehouseItem(warehouseId, payload) {
  const { data } = await apiClient.post(`/api/v1/warehouse/${warehouseId}/items`, payload);
  return data?.data;
}

export async function updateWarehouseItem(id, payload) {
  const { data } = await apiClient.put(`/api/v1/warehouse/items/${id}`, payload);
  return data?.data;
}

export async function getTransactions(params = {}) {
  try {
    const { data } = await apiClient.get('/api/v1/warehouse/transactions/list', { params });
    return data?.data || [];
  } catch {
    return [];
  }
}

export async function createTransaction(payload) {
  const { data } = await apiClient.post('/api/v1/warehouse/transactions', payload);
  return data?.data;
}

export async function approveTransaction(id) {
  const { data } = await apiClient.put(`/api/v1/warehouse/transactions/${id}/approve`);
  return data?.data;
}

export async function completeTransaction(id) {
  const { data } = await apiClient.put(`/api/v1/warehouse/transactions/${id}/complete`);
  return data?.data;
}

export async function getLowStockAlerts() {
  try {
    const { data } = await apiClient.get('/api/v1/warehouse/alerts/low-stock');
    return data?.data || [];
  } catch {
    return [];
  }
}
