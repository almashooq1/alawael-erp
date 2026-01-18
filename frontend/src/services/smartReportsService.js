import api from './api';

/**
 * خدمة التقارير الذكية
 * Smart Reports Service
 *
 * توفر نظام تقارير متقدم مع التحليل الذكي
 * Provides advanced reporting system with intelligent analysis
 */

const smartReportsService = {
  /**
   * الحصول على تقرير شامل
   * Get comprehensive report
   *
   * @param {Object} filters - الفلاتر
   * @returns {Promise}
   */
  getComprehensiveReport: async (filters = {}) => {
    try {
      const response = await api.post('/reports/comprehensive', filters);
      return response.data;
    } catch (error) {
      console.error('Error fetching comprehensive report:', error);
      throw error;
    }
  },

  /**
   * الحصول على تحليل الأداء
   * Get performance analysis
   *
   * @param {string} period - الفترة الزمنية
   * @param {Object} filters - الفلاتر
   * @returns {Promise}
   */
  getPerformanceAnalysis: async (period = 'monthly', filters = {}) => {
    try {
      const response = await api.post('/reports/performance', {
        period,
        ...filters,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching performance analysis:', error);
      throw error;
    }
  },

  /**
   * الحصول على تحليل الاتجاهات
   * Get trend analysis
   *
   * @param {string} metric - المقياس المراد تحليله
   * @param {number} days - عدد الأيام
   * @returns {Promise}
   */
  getTrendAnalysis: async (metric, days = 30) => {
    try {
      const response = await api.get('/reports/trends', {
        params: { metric, days },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching trend analysis:', error);
      throw error;
    }
  },

  /**
   * الحصول على التقرير المقارن
   * Get comparative report
   *
   * @param {Array} periods - الفترات المراد مقارنتها
   * @param {Array} metrics - المقاييس
   * @returns {Promise}
   */
  getComparativeReport: async (periods, metrics) => {
    try {
      const response = await api.post('/reports/comparative', {
        periods,
        metrics,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching comparative report:', error);
      throw error;
    }
  },

  /**
   * الحصول على التقرير التفصيلي
   * Get detailed report
   *
   * @param {string} type - نوع التقرير
   * @param {Object} filters - الفلاتر
   * @returns {Promise}
   */
  getDetailedReport: async (type, filters = {}) => {
    try {
      const response = await api.post(`/reports/${type}/detailed`, filters);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${type} detailed report:`, error);
      throw error;
    }
  },

  /**
   * الحصول على تقرير التوصيات
   * Get recommendations report
   *
   * @param {Object} data - البيانات المطلوب تحليلها
   * @returns {Promise}
   */
  getRecommendations: async data => {
    try {
      const response = await api.post('/reports/recommendations', data);
      return response.data;
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  },

  /**
   * الحصول على التقرير التنفيذي
   * Get executive summary
   *
   * @param {Object} filters - الفلاتر
   * @returns {Promise}
   */
  getExecutiveSummary: async (filters = {}) => {
    try {
      const response = await api.post('/reports/executive-summary', filters);
      return response.data;
    } catch (error) {
      console.error('Error fetching executive summary:', error);
      throw error;
    }
  },

  /**
   * الحصول على KPIs الرئيسية
   * Get key performance indicators
   *
   * @param {Object} filters - الفلاتر
   * @returns {Promise}
   */
  getKPIs: async (filters = {}) => {
    try {
      const response = await api.post('/reports/kpis', filters);
      return response.data;
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      throw error;
    }
  },

  /**
   * الحصول على تقرير تحليل SWOT
   * Get SWOT analysis
   *
   * @param {Object} filters - الفلاتر
   * @returns {Promise}
   */
  getSWOTAnalysis: async (filters = {}) => {
    try {
      const response = await api.post('/reports/swot', filters);
      return response.data;
    } catch (error) {
      console.error('Error fetching SWOT analysis:', error);
      throw error;
    }
  },

  /**
   * الحصول على التنبؤات
   * Get forecasts
   *
   * @param {string} metric - المقياس
   * @param {number} days - عدد الأيام للتنبؤ
   * @returns {Promise}
   */
  getForecasts: async (metric, days = 30) => {
    try {
      const response = await api.get('/reports/forecasts', {
        params: { metric, days },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching forecasts:', error);
      throw error;
    }
  },

  /**
   * الحصول على تقرير الشذوذ
   * Get anomaly detection
   *
   * @param {Object} filters - الفلاتر
   * @returns {Promise}
   */
  getAnomalies: async (filters = {}) => {
    try {
      const response = await api.post('/reports/anomalies', filters);
      return response.data;
    } catch (error) {
      console.error('Error fetching anomalies:', error);
      throw error;
    }
  },

  /**
   * حفظ التقرير المخصص
   * Save custom report
   *
   * @param {Object} reportData - بيانات التقرير
   * @returns {Promise}
   */
  saveCustomReport: async reportData => {
    try {
      const response = await api.post('/reports/custom/save', reportData);
      return response.data;
    } catch (error) {
      console.error('Error saving custom report:', error);
      throw error;
    }
  },

  /**
   * الحصول على التقارير المحفوظة
   * Get saved reports
   *
   * @param {Object} filters - الفلاتر
   * @returns {Promise}
   */
  getSavedReports: async (filters = {}) => {
    try {
      const response = await api.post('/reports/custom/list', filters);
      return response.data;
    } catch (error) {
      console.error('Error fetching saved reports:', error);
      throw error;
    }
  },

  /**
   * الحصول على تقرير محفوظ معين
   * Get specific saved report
   *
   * @param {string} reportId - معرّف التقرير
   * @returns {Promise}
   */
  getSavedReport: async reportId => {
    try {
      const response = await api.get(`/reports/custom/${reportId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching saved report ${reportId}:`, error);
      throw error;
    }
  },

  /**
   * حذف تقرير محفوظ
   * Delete saved report
   *
   * @param {string} reportId - معرّف التقرير
   * @returns {Promise}
   */
  deleteSavedReport: async reportId => {
    try {
      const response = await api.delete(`/reports/custom/${reportId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting saved report ${reportId}:`, error);
      throw error;
    }
  },

  /**
   * جدولة التقرير
   * Schedule report
   *
   * @param {Object} scheduleData - بيانات الجدولة
   * @returns {Promise}
   */
  scheduleReport: async scheduleData => {
    try {
      const response = await api.post('/reports/schedule', scheduleData);
      return response.data;
    } catch (error) {
      console.error('Error scheduling report:', error);
      throw error;
    }
  },

  /**
   * إرسال التقرير عبر البريد الإلكتروني
   * Send report via email
   *
   * @param {Object} emailData - بيانات الإرسال
   * @returns {Promise}
   */
  sendReportEmail: async emailData => {
    try {
      const response = await api.post('/reports/send-email', emailData);
      return response.data;
    } catch (error) {
      console.error('Error sending report email:', error);
      throw error;
    }
  },

  /**
   * الحصول على قالب التقرير
   * Get report template
   *
   * @param {string} templateId - معرّف القالب
   * @returns {Promise}
   */
  getTemplate: async templateId => {
    try {
      const response = await api.get(`/reports/templates/${templateId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching template ${templateId}:`, error);
      throw error;
    }
  },

  /**
   * الحصول على قوائم التقارير المتاحة
   * Get available report list
   *
   * @returns {Promise}
   */
  getAvailableReports: async () => {
    try {
      const response = await api.get('/reports/available');
      return response.data;
    } catch (error) {
      console.error('Error fetching available reports:', error);
      throw error;
    }
  },

  /**
   * تحليل البيانات المتقدم
   * Advanced data analysis
   *
   * @param {Array} data - البيانات المطلوب تحليلها
   * @param {Object} options - خيارات التحليل
   * @returns {Promise}
   */
  analyzeData: async (data, options = {}) => {
    try {
      const response = await api.post('/reports/analyze', {
        data,
        ...options,
      });
      return response.data;
    } catch (error) {
      console.error('Error analyzing data:', error);
      throw error;
    }
  },
};

export default smartReportsService;
