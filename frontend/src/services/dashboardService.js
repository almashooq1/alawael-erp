import api from '../utils/api';

/**
 * خدمة لوحة التحكم المتقدمة
 * Enhanced Dashboard Service
 *
 * يوفر واجهة برمجية لجلب بيانات لوحة التحكم والإحصائيات
 * Provides API interface for dashboard data and statistics
 */

const dashboardService = {
  /**
   * الحصول على إحصائيات لوحة التحكم الرئيسية
   * Get main dashboard statistics
   *
   * @returns {Promise} الإحصائيات العامة
   */
  getMainStatistics: async () => {
    try {
      const response = await api.get('/dashboard/statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard statistics:', error);
      throw error;
    }
  },

  /**
   * الحصول على بيانات الإيرادات والمصروفات
   * Get revenue and expenses data
   *
   * @param {string} period - الفترة الزمنية (daily, weekly, monthly, yearly)
   * @param {number} months - عدد الأشهر للبيانات التاريخية
   * @returns {Promise} بيانات الإيرادات والمصروفات
   */
  getRevenueExpenses: async (period = 'monthly', months = 6) => {
    try {
      const response = await api.get('/dashboard/revenue-expenses', {
        params: { period, months },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching revenue and expenses:', error);
      throw error;
    }
  },

  /**
   * الحصول على توزيع الجلسات حسب الفئة
   * Get sessions distribution by category
   *
   * @param {string} period - الفترة الزمنية
   * @returns {Promise} توزيع الجلسات
   */
  getSessionsDistribution: async (period = 'monthly') => {
    try {
      const response = await api.get('/dashboard/sessions-distribution', {
        params: { period },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching sessions distribution:', error);
      throw error;
    }
  },

  /**
   * الحصول على بيانات التقدم الأسبوعي
   * Get weekly progress data
   *
   * @returns {Promise} بيانات التقدم
   */
  getWeeklyProgress: async () => {
    try {
      const response = await api.get('/dashboard/weekly-progress');
      return response.data;
    } catch (error) {
      console.error('Error fetching weekly progress:', error);
      throw error;
    }
  },

  /**
   * الحصول على الأنشطة الأخيرة
   * Get recent activities
   *
   * @param {number} limit - عدد الأنشطة المطلوبة
   * @returns {Promise} قائمة الأنشطة
   */
  getRecentActivities: async (limit = 10) => {
    try {
      const response = await api.get('/dashboard/recent-activities', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  },

  /**
   * الحصول على المواعيد القادمة
   * Get upcoming appointments
   *
   * @param {number} days - عدد الأيام القادمة
   * @returns {Promise} قائمة المواعيد
   */
  getUpcomingAppointments: async (days = 7) => {
    try {
      const response = await api.get('/dashboard/upcoming-appointments', {
        params: { days },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching upcoming appointments:', error);
      throw error;
    }
  },

  /**
   * الحصول على إحصائيات المستخدمين
   * Get users statistics
   *
   * @returns {Promise} إحصائيات المستخدمين
   */
  getUsersStatistics: async () => {
    try {
      const response = await api.get('/dashboard/users-statistics');
      return response.data;
    } catch (error) {
      console.error('Error fetching users statistics:', error);
      throw error;
    }
  },

  /**
   * الحصول على أداء النظام
   * Get system performance metrics
   *
   * @returns {Promise} مقاييس الأداء
   */
  getSystemPerformance: async () => {
    try {
      const response = await api.get('/dashboard/system-performance');
      return response.data;
    } catch (error) {
      console.error('Error fetching system performance:', error);
      throw error;
    }
  },

  /**
   * الحصول على التنبيهات الهامة
   * Get important notifications
   *
   * @param {number} limit - عدد التنبيهات
   * @returns {Promise} قائمة التنبيهات
   */
  getNotifications: async (limit = 5) => {
    try {
      const response = await api.get('/dashboard/notifications', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  /**
   * الحصول على معدلات الحضور
   * Get attendance rates
   *
   * @param {string} period - الفترة الزمنية
   * @returns {Promise} معدلات الحضور
   */
  getAttendanceRates: async (period = 'monthly') => {
    try {
      const response = await api.get('/dashboard/attendance-rates', {
        params: { period },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching attendance rates:', error);
      throw error;
    }
  },

  /**
   * الحصول على التقييمات والملاحظات
   * Get reviews and feedback
   *
   * @param {number} limit - عدد التقييمات
   * @returns {Promise} قائمة التقييمات
   */
  getReviews: async (limit = 10) => {
    try {
      const response = await api.get('/dashboard/reviews', {
        params: { limit },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching reviews:', error);
      throw error;
    }
  },

  /**
   * الحصول على ملخص المالية
   * Get financial summary
   *
   * @param {string} period - الفترة الزمنية
   * @returns {Promise} ملخص المالية
   */
  getFinancialSummary: async (period = 'monthly') => {
    try {
      const response = await api.get('/dashboard/financial-summary', {
        params: { period },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching financial summary:', error);
      throw error;
    }
  },

  /**
   * الحصول على توزيع الموظفين
   * Get staff distribution
   *
   * @returns {Promise} توزيع الموظفين
   */
  getStaffDistribution: async () => {
    try {
      const response = await api.get('/dashboard/staff-distribution');
      return response.data;
    } catch (error) {
      console.error('Error fetching staff distribution:', error);
      throw error;
    }
  },

  /**
   * تحديث بيانات لوحة التحكم
   * Refresh dashboard data
   *
   * @returns {Promise} البيانات المحدثة
   */
  refreshDashboard: async () => {
    try {
      const response = await api.post('/dashboard/refresh');
      return response.data;
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
      throw error;
    }
  },

  /**
   * حفظ تفضيلات لوحة التحكم
   * Save dashboard preferences
   *
   * @param {Object} preferences - التفضيلات
   * @returns {Promise}
   */
  savePreferences: async preferences => {
    try {
      const response = await api.post('/dashboard/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('Error saving dashboard preferences:', error);
      throw error;
    }
  },

  /**
   * الحصول على تفضيلات المستخدم
   * Get user preferences
   *
   * @returns {Promise} التفضيلات
   */
  getPreferences: async () => {
    try {
      const response = await api.get('/dashboard/preferences');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard preferences:', error);
      throw error;
    }
  },
};

export default dashboardService;
