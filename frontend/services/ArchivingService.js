/**
 * 📦 Archiving Service (Frontend)
 * خدمة الأرشفة في الواجهة الأمامية
 */

class ArchivingService {
  constructor(baseURL = 'http://localhost:5000/api/archive') {
    this.baseURL = baseURL;
    this.requestConfig = {
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  /**
   * أرشفة مستند جديد
   */
  async archiveDocument(document) {
    try {
      const response = await fetch(`${this.baseURL}/save`, {
        method: 'POST',
        ...this.requestConfig,
        body: JSON.stringify({ document }),
      });

      return await response.json();
    } catch (error) {
      console.error('❌ خطأ في أرشفة المستند:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * تصنيف ذكي للمستند
   */
  async classifyDocument(document) {
    try {
      const response = await fetch(`${this.baseURL}/classify`, {
        method: 'POST',
        ...this.requestConfig,
        body: JSON.stringify({ document }),
      });

      return await response.json();
    } catch (error) {
      console.error('❌ خطأ في تصنيف المستند:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * بحث ذكي متقدم
   */
  async search(query, filters = {}) {
    try {
      const params = new URLSearchParams({
        q: query,
        ...filters,
      });

      const response = await fetch(`${this.baseURL}/search?${params.toString()}`, {
        method: 'GET',
        ...this.requestConfig,
      });

      return await response.json();
    } catch (error) {
      console.error('❌ خطأ في البحث:', error);
      return {
        success: false,
        error: error.message,
        results: [],
      };
    }
  }

  /**
   * استرجاع مستند من الأرشيف
   */
  async retrieveArchive(archiveId, options = {}) {
    try {
      const params = new URLSearchParams(options);
      const response = await fetch(`${this.baseURL}/${archiveId}?${params.toString()}`, {
        method: 'GET',
        ...this.requestConfig,
      });

      return await response.json();
    } catch (error) {
      console.error('❌ خطأ في استرجاع الأرشيف:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * الحصول على معلومات الأرشيف
   */
  async getArchiveInfo(archiveId) {
    try {
      const response = await fetch(`${this.baseURL}/${archiveId}/info`, {
        method: 'GET',
        ...this.requestConfig,
      });

      return await response.json();
    } catch (error) {
      console.error('❌ خطأ في الحصول على معلومات الأرشيف:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * حذف أرشيف
   */
  async deleteArchive(archiveId) {
    try {
      const response = await fetch(`${this.baseURL}/${archiveId}`, {
        method: 'DELETE',
        ...this.requestConfig,
      });

      return await response.json();
    } catch (error) {
      console.error('❌ خطأ في حذف الأرشيف:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * إنشاء نسخة احتياطية ذكية
   */
  async createBackup(options = {}) {
    try {
      const response = await fetch(`${this.baseURL}/backup`, {
        method: 'POST',
        ...this.requestConfig,
        body: JSON.stringify(options),
      });

      return await response.json();
    } catch (error) {
      console.error('❌ خطأ في إنشاء النسخة الاحتياطية:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * تنظيف الأرشيفات المنتهية
   */
  async cleanupExpired() {
    try {
      const response = await fetch(`${this.baseURL}/cleanup`, {
        method: 'POST',
        ...this.requestConfig,
      });

      return await response.json();
    } catch (error) {
      console.error('❌ خطأ في التنظيف:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * الحصول على الإحصائيات المتقدمة
   */
  async getStatistics() {
    try {
      const response = await fetch(`${this.baseURL}/stats/overview`, {
        method: 'GET',
        ...this.requestConfig,
      });

      return await response.json();
    } catch (error) {
      console.error('❌ خطأ في الحصول على الإحصائيات:', error);
      return {
        success: false,
        error: error.message,
        statistics: {},
      };
    }
  }

  /**
   * الحصول على فئات التصنيف المتاحة
   */
  async getCategories() {
    try {
      const response = await fetch(`${this.baseURL}/categories`, {
        method: 'GET',
        ...this.requestConfig,
      });

      return await response.json();
    } catch (error) {
      console.error('❌ خطأ في الحصول على الفئات:', error);
      return {
        success: false,
        error: error.message,
        categories: [],
      };
    }
  }

  /**
   * الحصول على سجل النشاطات
   */
  async getActivityLog(options = {}) {
    try {
      const params = new URLSearchParams(options);
      const response = await fetch(`${this.baseURL}/activity-log?${params.toString()}`, {
        method: 'GET',
        ...this.requestConfig,
      });

      return await response.json();
    } catch (error) {
      console.error('❌ خطأ في الحصول على سجل النشاطات:', error);
      return {
        success: false,
        error: error.message,
        activities: [],
      };
    }
  }

  /**
   * الحصول على قوالب الأرشفة
   */
  async getTemplates() {
    try {
      const response = await fetch(`${this.baseURL}/templates`, {
        method: 'GET',
        ...this.requestConfig,
      });

      return await response.json();
    } catch (error) {
      console.error('❌ خطأ في الحصول على القوالب:', error);
      return {
        success: false,
        error: error.message,
        templates: [],
      };
    }
  }

  /**
   * التحقق من سلامة الأرشيف
   */
  async verifyArchive(archiveId) {
    try {
      const response = await fetch(`${this.baseURL}/verify/${archiveId}`, {
        method: 'POST',
        ...this.requestConfig,
      });

      return await response.json();
    } catch (error) {
      console.error('❌ خطأ في التحقق من الأرشيف:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * تنسيق حجم الملف
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * تنسيق التاريخ
   */
  formatDate(date) {
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  /**
   * الحصول على أيقونة الفئة
   */
  getCategoryIcon(category) {
    const iconMap = {
      FINANCIAL: '💰',
      HR: '👥',
      CONTRACTS: '📋',
      HISTORICAL: '📚',
      PROJECTS: '🎯',
      REPORTS: '📊',
      LEGAL: '⚖️',
      SAFETY: '🛡️',
      MARKETING: '📢',
      IT: '💻',
    };
    return iconMap[category] || '📄';
  }

  /**
   * الحصول على لون الفئة
   */
  getCategoryColor(category) {
    const colorMap = {
      FINANCIAL: '#2196F3',
      HR: '#FF9800',
      CONTRACTS: '#9C27B0',
      HISTORICAL: '#795548',
      PROJECTS: '#4CAF50',
      REPORTS: '#F44336',
      LEGAL: '#673AB7',
      SAFETY: '#009688',
      MARKETING: '#E91E63',
      IT: '#00BCD4',
    };
    return colorMap[category] || '#999';
  }
}

// تصدير الخدمة
export default ArchivingService;
