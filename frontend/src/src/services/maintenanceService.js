/**
 * =====================================================
 * MAINTENANCE SERVICE - خدمة الصيانة المتقدمة
 * =====================================================
 * 
 * خدمة شاملة للتعامل مع جميع عمليات الصيانة
 * تتضمن: جدولة + تنبؤات + تنبيهات + تحليلات
 */

import axios from 'axios';

// قاعدة URL للـ API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';
const MAINTENANCE_API_URL = `${API_BASE_URL}/v1/maintenance`;

// إنشاء instance من axios مع إعدادات افتراضية
const maintenanceAPI = axios.create({
  baseURL: MAINTENANCE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// جميع requests يجب أن تحتوي على token
maintenanceAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// معالجة responses
maintenanceAPI.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

/**
 * ========================
 * SCHEDULES - جداول الصيانة
 * ========================
 */
export const scheduleService = {
  /**
   * الحصول على جميع جداول الصيانة
   * @param {Object} filters - المرشحات (vehicleId, type, status)
   * @returns {Promise<Array>}
   */
  async getAllSchedules(filters = {}) {
    try {
      return await maintenanceAPI.get('/schedules', { params: filters });
    } catch (error) {
      console.error('خطأ في جلب جداول الصيانة:', error);
      throw error;
    }
  },

  /**
   * الحصول على جدول محدد
   * @param {string} scheduleId
   * @returns {Promise<Object>}
   */
  async getScheduleById(scheduleId) {
    try {
      return await maintenanceAPI.get(`/schedules/${scheduleId}`);
    } catch (error) {
      console.error('خطأ في جلب الجدول:', error);
      throw error;
    }
  },

  /**
   * إنشاء جدول صيانة جديد
   * @param {Object} scheduleData
   * @returns {Promise<Object>}
   */
  async createSchedule(scheduleData) {
    try {
      return await maintenanceAPI.post('/schedules', scheduleData);
    } catch (error) {
      console.error('خطأ في إنشاء جدول:', error);
      throw error;
    }
  },

  /**
   * تحديث جدول صيانة
   * @param {string} scheduleId
   * @param {Object} scheduleData
   * @returns {Promise<Object>}
   */
  async updateSchedule(scheduleId, scheduleData) {
    try {
      return await maintenanceAPI.put(`/schedules/${scheduleId}`, scheduleData);
    } catch (error) {
      console.error('خطأ في تحديث الجدول:', error);
      throw error;
    }
  },

  /**
   * حذف جدول صيانة
   * @param {string} scheduleId
   * @returns {Promise<Object>}
   */
  async deleteSchedule(scheduleId) {
    try {
      return await maintenanceAPI.delete(`/schedules/${scheduleId}`);
    } catch (error) {
      console.error('خطأ في حذف الجدول:', error);
      throw error;
    }
  },
};

/**
 * ========================
 * TASKS - مهام الصيانة
 * ========================
 */
export const taskService = {
  /**
   * الحصول على جميع مهام الصيانة
   */
  async getAllTasks(filters = {}) {
    try {
      return await maintenanceAPI.get('/tasks', { params: filters });
    } catch (error) {
      console.error('خطأ في جلب المهام:', error);
      throw error;
    }
  },

  /**
   * الحصول على مهمة محددة
   */
  async getTaskById(taskId) {
    try {
      return await maintenanceAPI.get(`/tasks/${taskId}`);
    } catch (error) {
      console.error('خطأ في جلب المهمة:', error);
      throw error;
    }
  },

  /**
   * إنشاء مهمة صيانة جديدة
   */
  async createTask(taskData) {
    try {
      return await maintenanceAPI.post('/tasks', taskData);
    } catch (error) {
      console.error('خطأ في إنشاء مهمة:', error);
      throw error;
    }
  },

  /**
   * تحديث حالة المهمة
   */
  async updateTaskStatus(taskId, status) {
    try {
      return await maintenanceAPI.patch(`/tasks/${taskId}/status`, { status });
    } catch (error) {
      console.error('خطأ في تحديث حالة المهمة:', error);
      throw error;
    }
  },

  /**
   * تسجيل تكاليف المهمة
   */
  async recordTaskCost(taskId, costData) {
    try {
      return await maintenanceAPI.post(`/tasks/${taskId}/costs`, costData);
    } catch (error) {
      console.error('خطأ في تسجيل التكاليف:', error);
      throw error;
    }
  },
};

/**
 * ========================
 * PREDICTIONS - التنبؤات
 * ========================
 */
export const predictionService = {
  /**
   * الحصول على التنبؤات الذكية
   */
  async getPredictions(vehicleId) {
    try {
      return await maintenanceAPI.get('/predictions', {
        params: { vehicleId },
      });
    } catch (error) {
      console.error('خطأ في جلب التنبؤات:', error);
      throw error;
    }
  },

  /**
   * الحصول على التنبيهات
   */
  async getAlerts(filters = {}) {
    try {
      return await maintenanceAPI.get('/anomalies', { params: filters });
    } catch (error) {
      console.error('خطأ في جلب التنبيهات:', error);
      throw error;
    }
  },

  /**
   * الحصول على التوصيات
   */
  async getRecommendations(vehicleId) {
    try {
      return await maintenanceAPI.get('/recommendations', {
        params: { vehicleId },
      });
    } catch (error) {
      console.error('خطأ في جلب التوصيات:', error);
      throw error;
    }
  },
};

/**
 * ========================
 * ANALYTICS - التحليلات
 * ========================
 */
export const analyticsService = {
  /**
   * الحصول على تقرير شامل
   */
  async getComprehensiveReport(filters = {}) {
    try {
      return await maintenanceAPI.get('/reports/comprehensive', {
        params: filters,
      });
    } catch (error) {
      console.error('خطأ في جلب التقرير الشامل:', error);
      throw error;
    }
  },

  /**
   * الحصول على تقرير التكاليف
   */
  async getCostsReport(filters = {}) {
    try {
      return await maintenanceAPI.get('/reports/costs', {
        params: filters,
      });
    } catch (error) {
      console.error('خطأ في جلب تقرير التكاليف:', error);
      throw error;
    }
  },

  /**
   * الحصول على تقرير أداء الموردين
   */
  async getProviderReport(filters = {}) {
    try {
      return await maintenanceAPI.get('/reports/providers', {
        params: filters,
      });
    } catch (error) {
      console.error('خطأ في جلب تقرير الموردين:', error);
      throw error;
    }
  },

  /**
   * الحصول على تقرير المخزون
   */
  async getInventoryReport(filters = {}) {
    try {
      return await maintenanceAPI.get('/reports/inventory', {
        params: filters,
      });
    } catch (error) {
      console.error('خطأ في جلب تقرير المخزون:', error);
      throw error;
    }
  },

  /**
   * الحصول على إحصائيات الصيانة
   */
  async getMaintenanceStats(vehicleId) {
    try {
      return await maintenanceAPI.get('/statistics', {
        params: { vehicleId },
      });
    } catch (error) {
      console.error('خطأ في جلب الإحصائيات:', error);
      throw error;
    }
  },

  /**
   * تصدير التقرير
   */
  async exportReport(reportType, format = 'pdf') {
    try {
      const response = await maintenanceAPI.get(`/reports/${reportType}/export`, {
        params: { format },
        responseType: format === 'pdf' ? 'blob' : 'json',
      });
      return response;
    } catch (error) {
      console.error('خطأ في تصدير التقرير:', error);
      throw error;
    }
  },
};

/**
 * ========================
 * INVENTORY - المخزون
 * ========================
 */
export const inventoryService = {
  /**
   * الحصول على قائمة الأجزاء
   */
  async getInventory(filters = {}) {
    try {
      return await maintenanceAPI.get('/inventory', { params: filters });
    } catch (error) {
      console.error('خطأ في جلب المخزون:', error);
      throw error;
    }
  },

  /**
   * إضافة جزء جديد
   */
  async addPart(partData) {
    try {
      return await maintenanceAPI.post('/inventory', partData);
    } catch (error) {
      console.error('خطأ في إضافة جزء:', error);
      throw error;
    }
  },

  /**
   * تحديث مستويات المخزون
   */
  async updateStock(partId, quantity) {
    try {
      return await maintenanceAPI.patch(`/inventory/${partId}`, {
        currentStock: quantity,
      });
    } catch (error) {
      console.error('خطأ في تحديث المخزون:', error);
      throw error;
    }
  },

  /**
   * طلب جزء من مورد
   */
  async orderPart(partId, supplierId, quantity) {
    try {
      return await maintenanceAPI.post(`/inventory/${partId}/order`, {
        supplierId,
        quantity,
      });
    } catch (error) {
      console.error('خطأ في طلب جزء:', error);
      throw error;
    }
  },
};

/**
 * ========================
 * ISSUES - المشاكل/العيوب
 * ========================
 */
export const issueService = {
  /**
   * تقرير مشكلة جديدة
   */
  async reportIssue(issueData) {
    try {
      return await maintenanceAPI.post('/issues', issueData);
    } catch (error) {
      console.error('خطأ في تقرير المشكلة:', error);
      throw error;
    }
  },

  /**
   * الحصول على المشاكل
   */
  async getIssues(filters = {}) {
    try {
      return await maintenanceAPI.get('/issues', { params: filters });
    } catch (error) {
      console.error('خطأ في جلب المشاكل:', error);
      throw error;
    }
  },

  /**
   * تحديث حالة المشكلة
   */
  async updateIssueStatus(issueId, status) {
    try {
      return await maintenanceAPI.patch(`/issues/${issueId}`, { status });
    } catch (error) {
      console.error('خطأ في تحديث حالة المشكلة:', error);
      throw error;
    }
  },

  /**
   * تسجيل حل المشكلة
   */
  async resolveIssue(issueId, resolutionData) {
    try {
      return await maintenanceAPI.post(`/issues/${issueId}/resolve`, resolutionData);
    } catch (error) {
      console.error('خطأ في حل المشكلة:', error);
      throw error;
    }
  },
};

/**
 * ========================
 * PROVIDERS - الموردين
 * ========================
 */
export const providerService = {
  /**
   * الحصول على قائمة الموردين
   */
  async getProviders() {
    try {
      return await maintenanceAPI.get('/providers');
    } catch (error) {
      console.error('خطأ في جلب الموردين:', error);
      throw error;
    }
  },

  /**
   * إضافة مورد جديد
   */
  async addProvider(providerData) {
    try {
      return await maintenanceAPI.post('/providers', providerData);
    } catch (error) {
      console.error('خطأ في إضافة مورد:', error);
      throw error;
    }
  },

  /**
   * تقييم مورد
   */
  async rateProvider(providerId, rating) {
    try {
      return await maintenanceAPI.patch(`/providers/${providerId}/rate`, { rating });
    } catch (error) {
      console.error('خطأ في تقييم المورد:', error);
      throw error;
    }
  },
};

// تصدير جميع الخدمات
export default {
  scheduleService,
  taskService,
  predictionService,
  analyticsService,
  inventoryService,
  issueService,
  providerService,
};
