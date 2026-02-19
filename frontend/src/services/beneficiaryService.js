import api from '../utils/api';

/**
 * خدمة إدارة المستفيدين
 * Beneficiary Management Service
 *
 * يوفر واجهة برمجية للتفاعل مع نظام إدارة المستفيدين
 * Provides API interface for beneficiary management system
 */

const beneficiaryService = {
  /**
   * الحصول على قائمة المستفيدين مع التصفية والبحث
   * Get beneficiaries list with filtering and search
   *
   * @param {Object} params - معاملات البحث والتصفية
   * @param {string} params.search - نص البحث
   * @param {string} params.status - حالة المستفيد (active, pending, inactive)
   * @param {string} params.category - فئة المستفيد
   * @param {string} params.gender - الجنس
   * @param {number} params.minAge - العمر الأدنى
   * @param {number} params.maxAge - العمر الأقصى
   * @param {number} params.page - رقم الصفحة
   * @param {number} params.limit - عدد النتائج في الصفحة
   * @param {string} params.sortBy - حقل الترتيب
   * @param {string} params.sortOrder - اتجاه الترتيب (asc, desc)
   * @returns {Promise} قائمة المستفيدين
   */
  getBeneficiaries: async (params = {}) => {
    try {
      const response = await api.get('/beneficiaries', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching beneficiaries:', error);
      throw error;
    }
  },

  /**
   * الحصول على تفاصيل مستفيد محدد
   * Get specific beneficiary details
   *
   * @param {string} id - معرف المستفيد
   * @returns {Promise} بيانات المستفيد
   */
  getBeneficiaryById: async id => {
    try {
      const response = await api.get(`/beneficiaries/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching beneficiary ${id}:`, error);
      throw error;
    }
  },

  /**
   * إضافة مستفيد جديد
   * Add new beneficiary
   *
   * @param {Object} beneficiaryData - بيانات المستفيد
   * @returns {Promise} بيانات المستفيد المضاف
   */
  createBeneficiary: async beneficiaryData => {
    try {
      const response = await api.post('/beneficiaries', beneficiaryData);
      return response.data;
    } catch (error) {
      console.error('Error creating beneficiary:', error);
      throw error;
    }
  },

  /**
   * تحديث بيانات مستفيد
   * Update beneficiary data
   *
   * @param {string} id - معرف المستفيد
   * @param {Object} beneficiaryData - البيانات المحدثة
   * @returns {Promise} بيانات المستفيد المحدثة
   */
  updateBeneficiary: async (id, beneficiaryData) => {
    try {
      const response = await api.put(`/beneficiaries/${id}`, beneficiaryData);
      return response.data;
    } catch (error) {
      console.error(`Error updating beneficiary ${id}:`, error);
      throw error;
    }
  },

  /**
   * حذف مستفيد
   * Delete beneficiary
   *
   * @param {string} id - معرف المستفيد
   * @returns {Promise}
   */
  deleteBeneficiary: async id => {
    try {
      const response = await api.delete(`/beneficiaries/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting beneficiary ${id}:`, error);
      throw error;
    }
  },

  /**
   * حذف مستفيدين متعددين
   * Delete multiple beneficiaries
   *
   * @param {Array} ids - معرفات المستفيدين
   * @returns {Promise}
   */
  deleteBeneficiaries: async ids => {
    try {
      const response = await api.post('/beneficiaries/bulk-delete', { ids });
      return response.data;
    } catch (error) {
      console.error('Error deleting beneficiaries:', error);
      throw error;
    }
  },

  /**
   * أرشفة مستفيد
   * Archive beneficiary
   *
   * @param {string} id - معرف المستفيد
   * @returns {Promise}
   */
  archiveBeneficiary: async id => {
    try {
      const response = await api.post(`/beneficiaries/${id}/archive`);
      return response.data;
    } catch (error) {
      console.error(`Error archiving beneficiary ${id}:`, error);
      throw error;
    }
  },

  /**
   * إضافة إلى المفضلة
   * Add to favorites
   *
   * @param {string} id - معرف المستفيد
   * @returns {Promise}
   */
  toggleFavorite: async id => {
    try {
      const response = await api.post(`/beneficiaries/${id}/favorite`);
      return response.data;
    } catch (error) {
      console.error(`Error toggling favorite for beneficiary ${id}:`, error);
      throw error;
    }
  },

  /**
   * الحصول على إحصائيات المستفيدين
   * Get beneficiaries statistics
   *
   * @returns {Promise} الإحصائيات
   */
  getStatistics: async () => {
    try {
      const response = await api.get('/beneficiaries/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching beneficiaries statistics:', error);
      throw error;
    }
  },

  /**
   * الحصول على بيانات الرسوم البيانية
   * Get chart data
   *
   * @param {string} chartType - نوع الرسم البياني (monthly, category, status)
   * @returns {Promise} بيانات الرسم البياني
   */
  getChartData: async chartType => {
    try {
      const response = await api.get(`/beneficiaries/charts/${chartType}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching chart data for ${chartType}:`, error);
      throw error;
    }
  },

  /**
   * تصدير بيانات المستفيدين
   * Export beneficiaries data
   *
   * @param {string} format - صيغة التصدير (excel, pdf, csv)
   * @param {Object} filters - فلاتر البيانات المراد تصديرها
   * @returns {Promise} ملف التصدير
   */
  exportBeneficiaries: async (format, filters = {}) => {
    try {
      const response = await api.post(
        `/beneficiaries/export/${format}`,
        { filters },
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error) {
      console.error(`Error exporting beneficiaries to ${format}:`, error);
      throw error;
    }
  },

  /**
   * استيراد بيانات المستفيدين
   * Import beneficiaries data
   *
   * @param {File} file - ملف الاستيراد
   * @returns {Promise} نتيجة الاستيراد
   */
  importBeneficiaries: async file => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/beneficiaries/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error importing beneficiaries:', error);
      throw error;
    }
  },

  /**
   * إرسال رسالة لمستفيد
   * Send message to beneficiary
   *
   * @param {string} id - معرف المستفيد
   * @param {Object} messageData - بيانات الرسالة
   * @returns {Promise}
   */
  sendMessage: async (id, messageData) => {
    try {
      const response = await api.post(`/beneficiaries/${id}/message`, messageData);
      return response.data;
    } catch (error) {
      console.error(`Error sending message to beneficiary ${id}:`, error);
      throw error;
    }
  },

  /**
   * الحصول على سجل تقدم المستفيد
   * Get beneficiary progress history
   *
   * @param {string} id - معرف المستفيد
   * @returns {Promise} سجل التقدم
   */
  getProgressHistory: async id => {
    try {
      const response = await api.get(`/beneficiaries/${id}/progress`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching progress for beneficiary ${id}:`, error);
      throw error;
    }
  },

  /**
   * الحصول على المواعيد القادمة للمستفيد
   * Get beneficiary upcoming appointments
   *
   * @param {string} id - معرف المستفيد
   * @returns {Promise} قائمة المواعيد
   */
  getAppointments: async id => {
    try {
      const response = await api.get(`/beneficiaries/${id}/appointments`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching appointments for beneficiary ${id}:`, error);
      throw error;
    }
  },
};

export default beneficiaryService;
