/**
 * Document Service
 * خدمة التعامل مع API المستندات
 * يستخدم apiClient المركزي لضمان إرسال Token وتحديثه تلقائياً
 */

import apiClient from './api.client';
import logger from 'utils/logger';
import { triggerBlobDownload } from 'utils/downloadHelper';

const documentService = {
  // 📤 تحميل مستند
  uploadDocument: async (file, title, description, category, tags) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description || '');
      formData.append('category', category || 'أخرى');
      if (tags) formData.append('tags', tags);

      // IMPORTANT: Do NOT set Content-Type manually for FormData.
      // The browser must auto-set it with the multipart boundary parameter.
      return await apiClient.post('/documents/upload', formData, {
        headers: { 'Content-Type': undefined },
      });
    } catch (error) {
      logger.error('خطأ في تحميل المستند:', error);
      throw error;
    }
  },

  // 📋 الحصول على جميع المستندات
  getAllDocuments: async (filters = {}) => {
    try {
      const params = {};
      if (filters.category) params.category = filters.category;
      if (filters.search) params.search = filters.search;
      if (filters.folder) params.folder = filters.folder;
      if (filters.sortBy) params.sortBy = filters.sortBy;
      if (filters.status) params.status = filters.status;
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;

      return await apiClient.get('/documents', { params });
    } catch (error) {
      logger.error('خطأ في جلب المستندات:', error);
      return { documents: [] };
    }
  },

  // 📄 الحصول على مستند واحد
  getDocument: async id => {
    try {
      return await apiClient.get(`/documents/${id}`);
    } catch (error) {
      logger.error('خطأ في جلب المستند:', error);
      throw error;
    }
  },

  // ✏️ تحديث المستند
  updateDocument: async (id, updates) => {
    try {
      return await apiClient.put(`/documents/${id}`, updates);
    } catch (error) {
      logger.error('خطأ في تحديث المستند:', error);
      throw error;
    }
  },

  // 📥 تنزيل المستند — يستخدم apiClient لضمان الـ interceptors
  downloadDocument: async (id, fileName) => {
    try {
      const data = await apiClient.get(`/documents/${id}/download`, {
        responseType: 'blob',
      });
      triggerBlobDownload(data, fileName);
    } catch (error) {
      logger.error('خطأ في تنزيل المستند:', error);
      throw error;
    }
  },

  // 🔗 مشاركة المستند
  shareDocument: async (id, email, permission) => {
    try {
      return await apiClient.post(`/documents/${id}/share`, { email, permission });
    } catch (error) {
      logger.error('خطأ في مشاركة المستند:', error);
      throw error;
    }
  },

  // 🚫 إزالة الوصول
  revokeAccess: async (id, shareId) => {
    try {
      return await apiClient.delete(`/documents/${id}/share/${shareId}`);
    } catch (error) {
      logger.error('خطأ في إزالة الوصول:', error);
      throw error;
    }
  },

  // 🗑️ حذف المستند
  deleteDocument: async id => {
    try {
      return await apiClient.delete(`/documents/${id}`);
    } catch (error) {
      logger.error('خطأ في حذف المستند:', error);
      throw error;
    }
  },

  // ♻️ استرجاع المستند
  restoreDocument: async id => {
    try {
      return await apiClient.post(`/documents/${id}/restore`);
    } catch (error) {
      logger.error('خطأ في استرجاع المستند:', error);
      throw error;
    }
  },

  // 📊 الحصول على الإحصائيات
  getStats: async () => {
    try {
      return await apiClient.get('/documents/stats');
    } catch (error) {
      logger.error('خطأ في جلب الإحصائيات:', error);
      return { totalDocuments: 0, totalSize: 0, byCategory: [] };
    }
  },

  // 🔍 البحث المتقدم
  searchDocuments: async (query, filters = {}) => {
    try {
      const params = { q: query };
      if (filters.category) params.category = filters.category;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;

      return await apiClient.get('/documents/search', { params });
    } catch (error) {
      logger.error('خطأ في البحث:', error);
      throw error;
    }
  },

  // 📁 الحصول على المجلدات
  getFolders: async () => {
    try {
      return await apiClient.get('/documents/folders');
    } catch (error) {
      logger.error('خطأ في جلب المجلدات:', error);
      return [];
    }
  },

  // 📊 لوحة المعلومات
  getDashboard: async () => {
    try {
      return await apiClient.get('/documents/dashboard');
    } catch (error) {
      logger.error('خطأ في جلب لوحة المعلومات:', error);
      return { data: { stats: {}, categories: [] } };
    }
  },

  // 📈 التحليلات
  getAnalytics: async () => {
    try {
      return await apiClient.get('/documents/reports/analytics');
    } catch (error) {
      logger.error('خطأ في جلب التحليلات:', error);
      return { data: {} };
    }
  },

  // صيغة حجم الملف
  formatFileSize: bytes => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // تحديد أيقونة الملف — يشمل جميع التنسيقات المدعومة
  getFileIcon: fileType => {
    const icons = {
      // PDF
      pdf: '📄',
      // Word
      doc: '📝',
      docx: '📝',
      docm: '📝',
      odt: '📝',
      rtf: '📝',
      // Excel
      xls: '📊',
      xlsx: '📊',
      xlsm: '📊',
      ods: '📊',
      csv: '📊',
      // PowerPoint
      ppt: '🎥',
      pptx: '🎥',
      pptm: '🎥',
      odp: '🎥',
      // Text & Code
      txt: '📃',
      json: '📃',
      xml: '📃',
      html: '📃',
      htm: '📃',
      // Images
      jpg: '🖼️',
      jpeg: '🖼️',
      png: '🖼️',
      gif: '🖼️',
      bmp: '🖼️',
      webp: '🖼️',
      tiff: '🖼️',
      tif: '🖼️',
      svg: '🖼️',
      ico: '🖼️',
      // Audio
      mp3: '🎵',
      wav: '🎵',
      ogg: '🎵',
      m4a: '🎵',
      flac: '🎵',
      aac: '🎵',
      // Video
      mp4: '🎬',
      webm: '🎬',
      ogv: '🎬',
      avi: '🎬',
      mkv: '🎬',
      mov: '🎬',
      // Archives
      zip: '🗜️',
      rar: '🗜️',
      '7z': '🗜️',
      gz: '🗜️',
      tar: '🗜️',
      // Other
      other: '📦',
    };
    return icons[fileType?.toLowerCase()] || icons.other;
  },

  // 📜 الحصول على إصدارات المستند
  getVersions: async id => {
    try {
      return await apiClient.get(`/documents/${id}/versions`);
    } catch (error) {
      logger.error('خطأ في جلب الإصدارات:', error);
      return { versions: [] };
    }
  },

  // ⬆️ تحميل إصدار جديد
  uploadVersion: async (id, file, changes) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (changes) formData.append('changes', changes);

      // IMPORTANT: Do NOT set Content-Type manually for FormData.
      // The browser must auto-set it with the multipart boundary parameter.
      return await apiClient.post(`/documents/${id}/upload-version`, formData, {
        headers: { 'Content-Type': undefined },
      });
    } catch (error) {
      logger.error('خطأ في تحميل الإصدار:', error);
      throw error;
    }
  },

  // ↩️ استرجاع إصدار سابق
  restoreVersion: async (id, versionId) => {
    try {
      return await apiClient.post(`/documents/${id}/versions/${versionId}/restore`);
    } catch (error) {
      logger.error('خطأ في استرجاع الإصدار:', error);
      throw error;
    }
  },

  // 🔎 معاينة المستند
  getPreviewUrl: id => `/api/documents/${id}/preview`,
};

export default documentService;
