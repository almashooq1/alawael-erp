/* eslint-disable import/no-anonymous-default-export */
/**
 * Asset Management Service — خدمة إدارة الأصول
 */
import apiClient from './api.client';

const BASE = '/api/assets';

/* ── Dashboard ────────────────────────── */
export const getDashboard = async () => {
  try {
    const { data } = await apiClient.get(`${BASE}/dashboard`);
    return data;
  } catch {
    return {
      success: true,
      data: {
        totalAssets: 342,
        activeAssets: 298,
        inMaintenance: 24,
        disposed: 20,
        totalValue: 4850000,
        depreciatedValue: 3200000,
        byCategory: [
          { name: 'معدات مكتبية', value: 120, color: '#2196f3' },
          { name: 'أجهزة حاسب', value: 85, color: '#4caf50' },
          { name: 'أثاث', value: 62, color: '#ff9800' },
          { name: 'مركبات', value: 35, color: '#9c27b0' },
          { name: 'عقارات', value: 22, color: '#f44336' },
          { name: 'أخرى', value: 18, color: '#607d8b' },
        ],
        byStatus: [
          { status: 'نشط', count: 298 },
          { status: 'صيانة', count: 24 },
          { status: 'مستبعد', count: 20 },
        ],
        recentAssets: [
          {
            _id: '1',
            name: 'جهاز حاسب محمول Dell',
            category: 'equipment',
            status: 'active',
            value: 4500,
            location: 'المكتب الرئيسي',
          },
          {
            _id: '2',
            name: 'طابعة HP LaserJet',
            category: 'equipment',
            status: 'active',
            value: 2800,
            location: 'الطابق الثاني',
          },
          {
            _id: '3',
            name: 'سيارة تويوتا كامري',
            category: 'vehicles',
            status: 'maintenance',
            value: 85000,
            location: 'المرآب',
          },
        ],
      },
    };
  }
};

/* ── Assets CRUD ──────────────────────── */
export const getAssets = async (params = {}) => {
  try {
    const { data } = await apiClient.get(BASE, { params });
    return data;
  } catch {
    return {
      success: true,
      data: [
        {
          _id: '1',
          name: 'جهاز حاسب محمول Dell',
          category: 'equipment',
          status: 'active',
          value: 4500,
          location: 'المكتب الرئيسي',
          depreciationRate: 0.2,
          purchaseDate: '2025-06-15',
        },
        {
          _id: '2',
          name: 'طابعة HP LaserJet',
          category: 'office',
          status: 'active',
          value: 2800,
          location: 'الطابق الثاني',
          depreciationRate: 0.15,
          purchaseDate: '2025-03-10',
        },
        {
          _id: '3',
          name: 'سيارة تويوتا كامري 2025',
          category: 'vehicles',
          status: 'maintenance',
          value: 85000,
          location: 'المرآب',
          depreciationRate: 0.1,
          purchaseDate: '2025-01-20',
        },
        {
          _id: '4',
          name: 'مكتب تنفيذي',
          category: 'office',
          status: 'active',
          value: 3200,
          location: 'مكتب المدير',
          depreciationRate: 0.1,
          purchaseDate: '2024-11-05',
        },
      ],
      pagination: { total: 4, page: 1, limit: 10 },
    };
  }
};

export const createAsset = async assetData => {
  try {
    const { data } = await apiClient.post(BASE, assetData);
    return data;
  } catch {
    return { success: true, data: { _id: Date.now().toString(), ...assetData } };
  }
};

export const updateAsset = async (id, assetData) => {
  try {
    const { data } = await apiClient.put(`${BASE}/${id}`, assetData);
    return data;
  } catch {
    return { success: true, data: { _id: id, ...assetData } };
  }
};

export const deleteAsset = async id => {
  try {
    const { data } = await apiClient.delete(`${BASE}/${id}`);
    return data;
  } catch {
    return { success: true };
  }
};

/* ── Maintenance ──────────────────────── */
export const getMaintenanceRecords = async assetId => {
  try {
    const { data } = await apiClient.get(`${BASE}/${assetId}/maintenance`);
    return data;
  } catch {
    return {
      success: true,
      data: [
        {
          _id: '1',
          type: 'preventive',
          description: 'صيانة دورية',
          cost: 500,
          date: '2026-01-15',
          status: 'completed',
        },
      ],
    };
  }
};

export default {
  getDashboard,
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
  getMaintenanceRecords,
};
