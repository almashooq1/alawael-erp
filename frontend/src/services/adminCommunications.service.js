/**
 * Administrative Communications Service — خدمة الاتصالات الإدارية
 *
 * Maps to backend: /api/admin-communications/*
 */

import api from './api.client';

const BASE = '/admin-communications';

const adminCommunicationsService = {
  // ==================== ENUMS ====================
  /** الحصول على قوائم التعداد (أنواع، حالات، أولويات، مستويات السرية) */
  getEnums: () => api.get(`${BASE}/enums`),

  // ==================== CORRESPONDENCES CRUD ====================
  /** إنشاء مراسلة جديدة */
  create: data => api.post(`${BASE}/correspondences`, data),

  /** البحث والتصفية في المراسلات */
  search: (params = {}) => api.get(`${BASE}/correspondences`, { params }),

  /** الحصول على مراسلة بالتفصيل */
  getById: id => api.get(`${BASE}/correspondences/${id}`),

  /** تحديث مراسلة */
  update: (id, data) => api.put(`${BASE}/correspondences/${id}`, data),

  // ==================== INBOX / OUTBOX ====================
  /** صندوق الوارد */
  getInbox: (params = {}) => api.get(`${BASE}/correspondences/inbox`, { params }),

  /** صندوق الصادر */
  getOutbox: (params = {}) => api.get(`${BASE}/correspondences/outbox`, { params }),

  /** المراسلات المتأخرة */
  getOverdue: (days = 0) => api.get(`${BASE}/correspondences/overdue`, { params: { days } }),

  // ==================== STATISTICS ====================
  /** إحصائيات المراسلات */
  getStatistics: (params = {}) => api.get(`${BASE}/correspondences/statistics`, { params }),

  // ==================== ACTIONS ====================
  /** إرسال مراسلة */
  send: id => api.post(`${BASE}/correspondences/${id}/send`),

  /** استلام مراسلة */
  receive: (id, recipientId) => api.post(`${BASE}/correspondences/${id}/receive`, { recipientId }),

  /** الموافقة على مراسلة */
  approve: (id, comments) => api.post(`${BASE}/correspondences/${id}/approve`, { comments }),

  /** رفض مراسلة */
  reject: (id, reason) => api.post(`${BASE}/correspondences/${id}/reject`, { reason }),

  /** إضافة توجيه */
  addDirective: (id, data) => api.post(`${BASE}/correspondences/${id}/directive`, data),

  /** تحديد كمقروءة */
  markAsRead: id => api.post(`${BASE}/correspondences/${id}/read`),

  /** أرشفة مراسلة */
  archive: (id, data = {}) => api.post(`${BASE}/correspondences/${id}/archive`, data),

  // ==================== ATTACHMENTS ====================
  /** رفع مرفق */
  uploadAttachment: (id, file, description = '', isConfidential = false) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('description', description);
    formData.append('isConfidential', String(isConfidential));
    return api.post(`${BASE}/correspondences/${id}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /** تحميل مرفق */
  downloadAttachment: (id, filename) =>
    api.get(`${BASE}/correspondences/${id}/attachments/${filename}`, {
      responseType: 'blob',
    }),

  // ==================== THREAD / HISTORY ====================
  /** سلسلة المراسلات */
  getThread: id => api.get(`${BASE}/correspondences/${id}/thread`),

  /** سجل الإجراءات */
  getHistory: id => api.get(`${BASE}/correspondences/${id}/history`),

  // ==================== TEMPLATES ====================
  /** قوائم القوالب */
  getTemplates: (params = {}) => api.get(`${BASE}/templates`, { params }),

  /** إنشاء قالب */
  createTemplate: data => api.post(`${BASE}/templates`, data),

  /** تطبيق قالب على مراسلة */
  applyTemplate: (templateId, data = {}) => api.post(`${BASE}/templates/${templateId}/apply`, data),

  // ==================== EXTERNAL ENTITIES ====================
  /** الجهات الخارجية */
  getExternalEntities: (params = {}) => api.get(`${BASE}/external-entities`, { params }),

  /** إنشاء جهة خارجية */
  createExternalEntity: data => api.post(`${BASE}/external-entities`, data),

  /** الحصول على جهة خارجية بالمعرف */
  getExternalEntityById: id => api.get(`${BASE}/external-entities/${id}`),

  /** تحديث جهة خارجية */
  updateExternalEntity: (id, data) => api.put(`${BASE}/external-entities/${id}`, data),

  // ==================== GOVERNMENT ====================
  /** قائمة الوزارات (السعودية) */
  getMinistries: () => api.get(`${BASE}/government/ministries`),

  /** قائمة المناطق (السعودية) */
  getRegions: () => api.get(`${BASE}/government/regions`),

  // ==================== BULK OPERATIONS ====================
  /** تحديث حالة مجموعة مراسلات */
  bulkStatusUpdate: (ids, status) =>
    api.post(`${BASE}/correspondences/bulk/status`, { ids, status }),

  /** أرشفة مجموعة مراسلات */
  bulkArchive: ids => api.post(`${BASE}/correspondences/bulk/archive`, { ids }),
};

export default adminCommunicationsService;
