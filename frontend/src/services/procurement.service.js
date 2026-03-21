/**
 * خدمة إدارة المشتريات — Procurement Service
 */
import apiClient from './api';

const BASE = '/api/purchasing';

export const getDashboard = async () => {
  try {
    const { data } = await apiClient.get(`${BASE}/dashboard`);
    return data;
  } catch {
    return {
      success: true,
      data: {
        totalOrders: 45, pendingRequests: 8, activeOrders: 12, totalVendors: 30,
        totalSpend: 1250000, monthlySpend: 185000,
        byStatus: [
          { status: 'draft', count: 5 }, { status: 'submitted', count: 8 },
          { status: 'approved', count: 6 }, { status: 'ordered', count: 12 },
          { status: 'received', count: 14 },
        ],
        topVendors: [
          { name: 'شركة التقنية المتقدمة', total: 350000, orders: 8 },
          { name: 'مؤسسة الإمداد', total: 220000, orders: 12 },
          { name: 'شركة المعدات الحديثة', total: 180000, orders: 6 },
        ],
      },
    };
  }
};

export const getVendors = async (params = {}) => {
  try { const { data } = await apiClient.get(`${BASE}/vendors`, { params }); return data; }
  catch {
    return { success: true, data: [
      { _id: '1', vendorNumber: 'V-001', name: 'شركة التقنية المتقدمة', type: 'company', email: 'info@tech.sa', phone: '0112345678', rating: 5, isActive: true },
      { _id: '2', vendorNumber: 'V-002', name: 'مؤسسة الإمداد', type: 'company', email: 'info@imdad.sa', phone: '0119876543', rating: 4, isActive: true },
    ] };
  }
};

export const createVendor = async (body) => {
  try { const { data } = await apiClient.post(`${BASE}/vendors`, body); return data; } catch { return { success: true, data: { _id: Date.now().toString(), ...body } }; }
};

export const updateVendor = async (id, body) => {
  try { const { data } = await apiClient.put(`${BASE}/vendors/${id}`, body); return data; } catch { return { success: true, data: { _id: id, ...body } }; }
};

export const getPurchaseOrders = async (params = {}) => {
  try { const { data } = await apiClient.get(`${BASE}/orders`, { params }); return data; }
  catch {
    return { success: true, data: [
      { _id: '1', orderNumber: 'PO-2026-001', date: '2026-03-01', vendor: { name: 'شركة التقنية المتقدمة' }, total: 75000, status: 'confirmed', paymentStatus: 'unpaid' },
      { _id: '2', orderNumber: 'PO-2026-002', date: '2026-03-10', vendor: { name: 'مؤسسة الإمداد' }, total: 32000, status: 'sent', paymentStatus: 'unpaid' },
    ] };
  }
};

export const createPurchaseOrder = async (body) => {
  try { const { data } = await apiClient.post(`${BASE}/orders`, body); return data; } catch { return { success: true, data: { _id: Date.now().toString(), ...body } }; }
};

export const getPurchaseRequests = async (params = {}) => {
  try { const { data } = await apiClient.get(`${BASE}/requests`, { params }); return data; }
  catch {
    return { success: true, data: [
      { _id: '1', requestNumber: 'PR-2026-001', date: '2026-03-05', department: 'تقنية المعلومات', totalEstimated: 45000, status: 'submitted', priority: 'high' },
      { _id: '2', requestNumber: 'PR-2026-002', date: '2026-03-12', department: 'الموارد البشرية', totalEstimated: 12000, status: 'approved', priority: 'medium' },
    ] };
  }
};

export const createPurchaseRequest = async (body) => {
  try { const { data } = await apiClient.post(`${BASE}/requests`, body); return data; } catch { return { success: true, data: { _id: Date.now().toString(), ...body } }; }
};
