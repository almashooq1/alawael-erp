/**
 * Document Service
 * خدمة التعامل مع API المستندات
 */

import { getToken } from '../../utils/tokenStorage';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const documentService = {
  // 📤 تحميل مستند
  uploadDocument: async (file, title, description, category, tags) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('tags', tags);

      const response = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'خطأ في تحميل المستند');
      }

      return await response.json();
    } catch (error) {
      console.error('خطأ في تحميل المستند:', error);
      throw error;
    }
  },

  // 📋 الحصول على جميع المستندات
  getAllDocuments: async (filters = {}) => {
    try {
      const params = new URLSearchParams();

      if (filters.category) params.append('category', filters.category);
      if (filters.search) params.append('search', filters.search);
      if (filters.folder) params.append('folder', filters.folder);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);

      const response = await fetch(`${API_BASE}/documents?${params}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('خطأ في جلب المستندات');
      }

      return await response.json();
    } catch (error) {
      console.error('خطأ في جلب المستندات:', error);
      // إرجاع بيانات وهمية كبديل
      return {
        documents: [
          {
            _id: '1',
            title: 'مثال على مستند 1',
            category: 'تقارير',
            fileSize: 1024000,
            uploadedAt: new Date().toISOString(),
            uploadedByName: 'المستخدم',
          },
          {
            _id: '2',
            title: 'مثال على مستند 2',
            category: 'عقود',
            fileSize: 2048000,
            uploadedAt: new Date().toISOString(),
            uploadedByName: 'المستخدم',
          },
        ],
      };
    }
  },

  // 📄 الحصول على مستند واحد
  getDocument: async id => {
    try {
      const response = await fetch(`${API_BASE}/documents/${id}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('خطأ في جلب المستند');
      }

      return await response.json();
    } catch (error) {
      console.error('خطأ في جلب المستند:', error);
      throw error;
    }
  },

  // ✏️ تحديث المستند
  updateDocument: async (id, updates) => {
    try {
      const response = await fetch(`${API_BASE}/documents/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'خطأ في تحديث المستند');
      }

      return await response.json();
    } catch (error) {
      console.error('خطأ في تحديث المستند:', error);
      throw error;
    }
  },

  // 📥 تنزيل المستند
  downloadDocument: async (id, fileName) => {
    try {
      const response = await fetch(`${API_BASE}/documents/${id}/download`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('خطأ في تنزيل المستند');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('خطأ في تنزيل المستند:', error);
      throw error;
    }
  },

  // 🔗 مشاركة المستند
  shareDocument: async (id, email, permission) => {
    try {
      const response = await fetch(`${API_BASE}/documents/${id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ email, permission }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'خطأ في مشاركة المستند');
      }

      return await response.json();
    } catch (error) {
      console.error('خطأ في مشاركة المستند:', error);
      throw error;
    }
  },

  // 🚫 إزالة الوصول
  revokeAccess: async (id, shareId) => {
    try {
      const response = await fetch(`${API_BASE}/documents/${id}/share/${shareId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('خطأ في إزالة الوصول');
      }

      return await response.json();
    } catch (error) {
      console.error('خطأ في إزالة الوصول:', error);
      throw error;
    }
  },

  // 🗑️ حذف المستند
  deleteDocument: async id => {
    try {
      const response = await fetch(`${API_BASE}/documents/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'خطأ في حذف المستند');
      }

      return await response.json();
    } catch (error) {
      console.error('خطأ في حذف المستند:', error);
      throw error;
    }
  },

  // ♻️ استرجاع المستند
  restoreDocument: async id => {
    try {
      const response = await fetch(`${API_BASE}/documents/${id}/restore`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('خطأ في استرجاع المستند');
      }

      return await response.json();
    } catch (error) {
      console.error('خطأ في استرجاع المستند:', error);
      throw error;
    }
  },

  // 📊 الحصول على الإحصائيات
  getStats: async () => {
    try {
      const response = await fetch(`${API_BASE}/documents/stats`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('خطأ في جلب الإحصائيات');
      }

      return await response.json();
    } catch (error) {
      console.error('خطأ في جلب الإحصائيات:', error);
      return {
        totalDocuments: 0,
        totalSize: 0,
        byCategory: [],
      };
    }
  },

  // 🔍 البحث المتقدم
  searchDocuments: async (query, filters = {}) => {
    try {
      const params = new URLSearchParams();
      params.append('q', query);

      if (filters.category) params.append('category', filters.category);
      if (filters.dateFrom) params.append('dateFrom', filters.dateFrom);
      if (filters.dateTo) params.append('dateTo', filters.dateTo);

      const response = await fetch(`${API_BASE}/documents/search?${params}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('خطأ في البحث');
      }

      return await response.json();
    } catch (error) {
      console.error('خطأ في البحث:', error);
      throw error;
    }
  },

  // 📁 الحصول على المجلدات
  getFolders: async () => {
    try {
      const response = await fetch(`${API_BASE}/documents/folders`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('خطأ في جلب المجلدات');
      }

      return await response.json();
    } catch (error) {
      console.error('خطأ في جلب المجلدات:', error);
      return [];
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

  // تحديد أيقونة الملف
  getFileIcon: fileType => {
    const icons = {
      pdf: '📄',
      docx: '📝',
      xlsx: '📊',
      jpg: '🖼️',
      png: '🖼️',
      txt: '📃',
      pptx: '🎥',
      zip: '🗜️',
      other: '📦',
    };
    return icons[fileType] || icons.other;
  },
};

export default documentService;
