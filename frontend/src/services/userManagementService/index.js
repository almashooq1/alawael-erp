/**
 * User Management Service — خدمة إدارة المستخدمين
 * Communicates with /api/user-management endpoints
 */
import apiClient from '../api.client';
import logger from '../../utils/logger';

// بيانات وهمية للاستخدام عند عدم توفر الـ API
const mockStats = {
  total: 0,
  active: 0,
  inactive: 0,
  locked: 0,
  newThisMonth: 0,
  byRole: [],
  byBranch: [],
  recentLogins: [],
  dailyRegistrations: [],
};

const mockRoles = [
  { value: 'super_admin', label: 'مدير النظام' },
  { value: 'admin', label: 'مدير' },
  { value: 'manager', label: 'مدير إداري' },
  { value: 'supervisor', label: 'مشرف' },
  { value: 'hr', label: 'موارد بشرية' },
  { value: 'hr_manager', label: 'مدير موارد بشرية' },
  { value: 'accountant', label: 'محاسب' },
  { value: 'finance', label: 'مالية' },
  { value: 'doctor', label: 'طبيب' },
  { value: 'therapist', label: 'معالج' },
  { value: 'teacher', label: 'معلم' },
  { value: 'receptionist', label: 'استقبال' },
  { value: 'data_entry', label: 'إدخال بيانات' },
  { value: 'parent', label: 'ولي أمر' },
  { value: 'student', label: 'طالب' },
  { value: 'viewer', label: 'مشاهد' },
  { value: 'user', label: 'مستخدم' },
  { value: 'guest', label: 'زائر' },
];

const userManagementService = {
  /**
   * إحصائيات المستخدمين
   */
  async getStats() {
    try {
      const data = await apiClient.get('/user-management/stats');
      return data?.data || data || mockStats;
    } catch (err) {
      logger.warn('User stats API unavailable:', err?.message);
      return mockStats;
    }
  },

  /**
   * جلب قائمة المستخدمين
   */
  async getUsers(params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', params.page);
      if (params.limit) query.set('limit', params.limit);
      if (params.search) query.set('search', params.search);
      if (params.role && params.role !== 'all') query.set('role', params.role);
      if (params.isActive !== undefined && params.isActive !== 'all')
        query.set('isActive', params.isActive);
      if (params.branch && params.branch !== 'all') query.set('branch', params.branch);
      if (params.sortBy) query.set('sortBy', params.sortBy);
      if (params.sortOrder) query.set('sortOrder', params.sortOrder);
      if (params.dateFrom) query.set('dateFrom', params.dateFrom);
      if (params.dateTo) query.set('dateTo', params.dateTo);

      const data = await apiClient.get(`/user-management?${query.toString()}`);
      return {
        users: data?.data || [],
        pagination: data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
      };
    } catch (err) {
      logger.warn('User list API unavailable:', err?.message);
      return { users: [], pagination: { page: 1, limit: 20, total: 0, pages: 0 } };
    }
  },

  /**
   * جلب الأدوار المتاحة
   */
  async getRoles() {
    try {
      const data = await apiClient.get('/user-management/roles');
      return data?.data || mockRoles;
    } catch (err) {
      logger.warn('Roles API unavailable:', err?.message);
      return mockRoles;
    }
  },

  /**
   * تفاصيل مستخدم
   */
  async getUserById(id) {
    try {
      const data = await apiClient.get(`/user-management/${id}`);
      return data?.data || data;
    } catch (err) {
      logger.error('Get user detail error:', err?.message);
      throw err;
    }
  },

  /**
   * إنشاء مستخدم
   */
  async createUser(userData) {
    const data = await apiClient.post('/user-management', userData);
    return data?.data || data;
  },

  /**
   * تحديث مستخدم
   */
  async updateUser(id, userData) {
    const data = await apiClient.put(`/user-management/${id}`, userData);
    return data?.data || data;
  },

  /**
   * حذف مستخدم (تعطيل)
   */
  async deleteUser(id) {
    return apiClient.delete(`/user-management/${id}`);
  },

  /**
   * تبديل حالة المستخدم
   */
  async toggleUserStatus(id) {
    const data = await apiClient.patch(`/user-management/${id}/toggle-status`);
    return data?.data || data;
  },

  /**
   * إعادة تعيين كلمة المرور
   */
  async resetPassword(id, newPassword = null) {
    const data = await apiClient.post(`/user-management/${id}/reset-password`, {
      newPassword,
    });
    return data;
  },

  /**
   * فك قفل الحساب
   */
  async unlockUser(id) {
    return apiClient.post(`/user-management/${id}/unlock`);
  },

  /**
   * تحديث الصلاحيات
   */
  async updatePermissions(id, permissions) {
    const data = await apiClient.put(`/user-management/${id}/permissions`, permissions);
    return data?.data || data;
  },

  /**
   * عمليات جماعية
   */
  async bulkAction(action, userIds, extra = {}) {
    const data = await apiClient.post('/user-management/bulk-action', {
      action,
      userIds,
      ...extra,
    });
    return data;
  },

  /**
   * سجل نشاط المستخدم
   */
  async getUserActivity(id, params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', params.page);
      if (params.limit) query.set('limit', params.limit);
      const data = await apiClient.get(`/user-management/${id}/activity?${query.toString()}`);
      return {
        logs: data?.data || [],
        pagination: data?.pagination || { page: 1, limit: 20, total: 0 },
      };
    } catch (err) {
      logger.warn('User activity API unavailable:', err?.message);
      return { logs: [], pagination: { page: 1, limit: 20, total: 0 } };
    }
  },

  /**
   * تصدير المستخدمين
   */
  async exportUsers(filters = {}) {
    try {
      const query = new URLSearchParams();
      if (filters.role) query.set('role', filters.role);
      if (filters.isActive !== undefined) query.set('isActive', filters.isActive);
      const data = await apiClient.get(`/user-management/export/all?${query.toString()}`);
      return data?.data || [];
    } catch (err) {
      logger.error('Export users error:', err?.message);
      throw err;
    }
  },

  /**
   * استيراد مستخدمين
   */
  async importUsers(usersData) {
    const data = await apiClient.post('/user-management/import', { users: usersData });
    return data;
  },

  /**
   * جلب قائمة الفروع المتاحة
   */
  async getBranches() {
    try {
      const data = await apiClient.get('/user-management/branches');
      return data?.data || [];
    } catch (err) {
      logger.warn('Branches API unavailable:', err?.message);
      return [];
    }
  },

  /**
   * سجل تسجيلات الدخول
   */
  async getLoginHistory(id, params = {}) {
    try {
      const query = new URLSearchParams();
      if (params.page) query.set('page', params.page);
      if (params.limit) query.set('limit', params.limit);
      const data = await apiClient.get(`/user-management/${id}/login-history?${query.toString()}`);
      return {
        history: data?.data || [],
        pagination: data?.pagination || { page: 1, limit: 20, total: 0 },
      };
    } catch (err) {
      logger.warn('Login history API unavailable:', err?.message);
      return { history: [], pagination: { page: 1, limit: 20, total: 0 } };
    }
  },

  /**
   * إعادة تعيين المصادقة الثنائية
   */
  async resetMfa(id) {
    const data = await apiClient.patch(`/user-management/${id}/mfa/reset`);
    return data;
  },

  /**
   * تحديث حالة التحقق (بريد/هاتف)
   */
  async verifyUser(id, { emailVerified, phoneVerified }) {
    const data = await apiClient.patch(`/user-management/${id}/verify`, {
      emailVerified,
      phoneVerified,
    });
    return data?.data || data;
  },
};

export default userManagementService;
