/**
 * Electronic Directives Service — خدمة التوجيهات الإلكترونية
 *
 * Maps to backend: /api/electronic-directives/*
 */

import api from './api.client';

const BASE = '/electronic-directives';

const electronicDirectivesService = {
  // ==================== CRUD ====================
  /** إنشاء توجيه جديد */
  create: data => api.post(BASE, data),

  /** البحث والتصفية */
  search: (params = {}) => api.get(BASE, { params }),

  /** الحصول على توجيه بالتفصيل */
  getById: id => api.get(`${BASE}/${id}`),

  /** تحديث مسودة */
  update: (id, data) => api.put(`${BASE}/${id}`, data),

  // ==================== LIFECYCLE ====================
  /** إصدار توجيه */
  issue: id => api.post(`${BASE}/${id}/issue`),

  /** إلغاء توجيه */
  cancel: (id, reason) => api.post(`${BASE}/${id}/cancel`, { reason }),

  // ==================== READ / ACKNOWLEDGE ====================
  /** تحديد كمقروء */
  markAsRead: id => api.post(`${BASE}/${id}/read`),

  /** الإقرار بالاستلام */
  acknowledge: (id, response = '') => api.post(`${BASE}/${id}/acknowledge`, { response }),

  // ==================== ACTIONS ====================
  /** إضافة إجراء مطلوب */
  addAction: (id, data) => api.post(`${BASE}/${id}/actions`, data),

  /** إكمال إجراء */
  completeAction: (id, actionIdx, completionData = {}) =>
    api.put(`${BASE}/${id}/actions/${actionIdx}/complete`, completionData),

  // ==================== ATTACHMENTS ====================
  /** رفع مرفق */
  uploadAttachment: (id, file, description = '') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description);
    return api.post(`${BASE}/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** حذف مرفق */
  deleteAttachment: (id, attachmentId) => api.delete(`${BASE}/${id}/attachments/${attachmentId}`),

  // ==================== QUERIES ====================
  /** التوجيهات المتأخرة */
  getOverdue: () => api.get(`${BASE}/overdue`),

  /** إحصائيات التوجيهات */
  getStatistics: (params = {}) => api.get(`${BASE}/statistics`, { params }),
};

export default electronicDirectivesService;
