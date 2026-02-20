/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔐 RBAC API Service - Frontend Integration Layer
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * خدمة التكامل الكاملة بين Frontend و RBAC Backend
 * Complete integration service between React frontend and RBAC backend API
 * 
 * Base URL: http://localhost:3001/api/rbac-advanced
 */

import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const RBAC_API = `${API_BASE}/api/rbac-advanced`;

// Create axios instance with default config
const rbacClient = axios.create({
  baseURL: RBAC_API,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptors for auth token
rbacClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
rbacClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const errorMsg = error.response?.data?.message || error.message;
    console.error('RBAC API Error:', errorMsg);
    return Promise.reject(new Error(errorMsg));
  }
);

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 1️⃣ ROLE MANAGEMENT - إدارة الأدوار
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const roleService = {
  /**
   * الحصول على قائمة كل الأدوار
   */
  getAllRoles: async (filters = {}) => {
    try {
      const response = await rbacClient.get('/roles', { params: filters });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * الحصول على دور معين
   */
  getRole: async (roleId) => {
    try {
      return await rbacClient.get(`/roles/${roleId}`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * إنشاء دور جديد
   */
  createRole: async (roleData) => {
    try {
      const payload = {
        name: roleData.name,
        description: roleData.description,
        level: roleData.level || 5,
        parent: roleData.parentRoleId || null,
        permissions: roleData.permissions || [],
        attributes: roleData.attributes || {},
      };
      return await rbacClient.post('/roles', payload);
    } catch (error) {
      throw error;
    }
  },

  /**
   * تحديث دور موجود
   */
  updateRole: async (roleId, updates) => {
    try {
      const payload = {
        name: updates.name,
        description: updates.description,
        level: updates.level,
        parent: updates.parentRoleId,
        attributes: updates.attributes || {},
      };
      return await rbacClient.put(`/roles/${roleId}`, payload);
    } catch (error) {
      throw error;
    }
  },

  /**
   * حذف دور
   */
  deleteRole: async (roleId) => {
    try {
      return await rbacClient.delete(`/roles/${roleId}`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * الحصول على صلاحيات دور معين
   */
  getRolePermissions: async (roleId) => {
    try {
      const response = await rbacClient.get(`/roles/${roleId}`);
      return response.permissions || [];
    } catch (error) {
      throw error;
    }
  },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 2️⃣ PERMISSION MANAGEMENT - إدارة الصلاحيات
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const permissionService = {
  /**
   * الحصول على قائمة كل الصلاحيات
   */
  getAllPermissions: async (filters = {}) => {
    try {
      const response = await rbacClient.get('/permissions', { params: filters });
      return response;
    } catch (error) {
      throw error;
    }
  },

  /**
   * إنشاء صلاحية جديدة
   */
  createPermission: async (permissionData) => {
    try {
      const payload = {
        name: permissionData.name,
        description: permissionData.description,
        resource: permissionData.resource,
        action: permissionData.action,
        scope: permissionData.scope || 'global',
        category: permissionData.category || 'general',
        tags: permissionData.tags || [],
      };
      return await rbacClient.post('/permissions', payload);
    } catch (error) {
      throw error;
    }
  },

  /**
   * إسناد صلاحية لدور
   */
  assignPermissionToRole: async (roleId, permissionId) => {
    try {
      return await rbacClient.post(`/roles/${roleId}/permissions/${permissionId}`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * إزالة صلاحية من دور
   */
  removePermissionFromRole: async (roleId, permissionId) => {
    try {
      return await rbacClient.delete(`/roles/${roleId}/permissions/${permissionId}`);
    } catch (error) {
      throw error;
    }
  },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 3️⃣ USER-ROLE MANAGEMENT - إدارة أدوار المستخدمين
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const userRoleService = {
  /**
   * الحصول على أدوار المستخدم
   */
  getUserRoles: async (userId) => {
    try {
      return await rbacClient.get(`/users/${userId}/roles`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * الحصول على صلاحيات المستخدم الفعلية
   */
  getUserPermissions: async (userId) => {
    try {
      return await rbacClient.get(`/users/${userId}/permissions`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * التحقق من صلاحية معينة للمستخدم
   */
  checkUserPermission: async (userId, permissionId) => {
    try {
      return await rbacClient.get(`/users/${userId}/permissions/${permissionId}/check`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * إسناد دور للمستخدم
   */
  assignRoleToUser: async (userId, roleId, temporalConfig = {}) => {
    try {
      const payload = {
        roleId,
        startDate: temporalConfig.startDate,
        endDate: temporalConfig.endDate,
        reason: temporalConfig.reason,
      };
      return await rbacClient.post(`/users/${userId}/roles/${roleId}`, payload);
    } catch (error) {
      throw error;
    }
  },

  /**
   * إزالة دور من المستخدم
   */
  removeRoleFromUser: async (userId, roleId) => {
    try {
      return await rbacClient.delete(`/users/${userId}/roles/${roleId}`);
    } catch (error) {
      throw error;
    }
  },

  /**
   * الحصول على مصفوفة الصلاحيات (User × Permission)
   */
  getPermissionMatrix: async (userId) => {
    try {
      const permissions = await rbacClient.get(`/users/${userId}/permissions`);
      return permissions;
    } catch (error) {
      throw error;
    }
  },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 4️⃣ POLICY MANAGEMENT - إدارة السياسات
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const policyService = {
  /**
   * الحصول على قائمة كل السياسات
   */
  getAllPolicies: async (filters = {}) => {
    try {
      return await rbacClient.get('/policies', { params: filters });
    } catch (error) {
      throw error;
    }
  },

  /**
   * إنشاء سياسة جديدة
   */
  createPolicy: async (policyData) => {
    try {
      const payload = {
        name: policyData.name,
        description: policyData.description,
        principal: policyData.principal,
        action: policyData.action,
        resource: policyData.resource,
        effect: policyData.effect || 'Allow',
        conditions: policyData.conditions || {},
        priority: policyData.priority || 100,
      };
      return await rbacClient.post('/policies', payload);
    } catch (error) {
      throw error;
    }
  },

  /**
   * تقييم السياسات للمستخدم
   */
  evaluatePolicies: async (userId, context = {}) => {
    try {
      const payload = {
        userId,
        ...context,
      };
      return await rbacClient.post(`/users/${userId}/evaluate-policies`, payload);
    } catch (error) {
      throw error;
    }
  },

  /**
   * اتخاذ قرار الوصول
   */
  getAccessDecision: async (userId, context = {}) => {
    try {
      const payload = {
        userId,
        ...context,
      };
      return await rbacClient.post(`/users/${userId}/access-decision`, payload);
    } catch (error) {
      throw error;
    }
  },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 5️⃣ AUDIT & SECURITY - التدقيق والأمان
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const auditService = {
  /**
   * الحصول على سجلات التدقيق
   */
  getAuditLogs: async (filters = {}) => {
    try {
      return await rbacClient.get('/audit-logs', { params: filters });
    } catch (error) {
      throw error;
    }
  },

  /**
   * البحث في سجلات التدقيق
   */
  searchAuditLogs: async (query) => {
    try {
      return await rbacClient.get('/audit-logs', {
        params: {
          search: query,
          limit: 100,
        },
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * إنشاء تقرير تدقيق
   */
  generateAuditReport: async (reportConfig = {}) => {
    try {
      return await rbacClient.post('/audit-report', reportConfig);
    } catch (error) {
      throw error;
    }
  },

  /**
   * الحصول على حوادث الأمان
   */
  getSecurityIncidents: async (filters = {}) => {
    try {
      return await rbacClient.get('/security-incidents', { params: filters });
    } catch (error) {
      throw error;
    }
  },

  /**
   * الحصول على ملخص الأمان
   */
  getSecuritySummary: async () => {
    try {
      return await rbacClient.get('/security-summary');
    } catch (error) {
      throw error;
    }
  },

  /**
   * تصدير بيانات التدقيق
   */
  exportAuditLogs: async (format = 'csv', filters = {}) => {
    try {
      const response = await axios.get(`${RBAC_API}/audit-logs/export`, {
        params: { format, ...filters },
        responseType: format === 'csv' ? 'blob' : 'json',
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 6️⃣ SYSTEM MANAGEMENT - إدارة النظام
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const systemService = {
  /**
   * الحصول على إحصائيات النظام
   */
  getSystemStats: async () => {
    try {
      return await rbacClient.get('/system-stats');
    } catch (error) {
      throw error;
    }
  },

  /**
   * فحص صحة النظام
   */
  healthCheck: async () => {
    try {
      return await rbacClient.get('/health');
    } catch (error) {
      throw error;
    }
  },

  /**
   * تصدير بيانات RBAC كاملة
   */
  exportRBACData: async (format = 'json') => {
    try {
      const response = await axios.get(`${RBAC_API}/export`, {
        params: { format },
        responseType: format === 'json' ? 'json' : 'blob',
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  /**
   * استيراد بيانات RBAC
   */
  importRBACData: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      return await rbacClient.post('/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    } catch (error) {
      throw error;
    }
  },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔗 COMPOSITE SERVICE - الخدمة المركبة
 * ═══════════════════════════════════════════════════════════════════════════
 */

export const rbacService = {
  roles: roleService,
  permissions: permissionService,
  userRoles: userRoleService,
  policies: policyService,
  audit: auditService,
  system: systemService,

  /**
   * الحصول على البيانات الأولية للتهيئة
   */
  initializeRBAC: async () => {
    try {
      const [roles, permissions, stats] = await Promise.all([
        roleService.getAllRoles(),
        permissionService.getAllPermissions(),
        systemService.getSystemStats(),
      ]);
      return { roles, permissions, stats };
    } catch (error) {
      throw error;
    }
  },

  /**
   * تحديث كامل البيانات
   */
  refreshAllData: async () => {
    try {
      return await this.initializeRBAC();
    } catch (error) {
      throw error;
    }
  },
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎯 UTILITY FUNCTIONS - دوال مساعدة
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * معالج الأخطاء الموحد
 */
export const handleRBACError = (error) => {
  if (error.response?.status === 401) {
    // التعامل مع عدم التصريح
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  } else if (error.response?.status === 403) {
    // التعامل مع منع الوصول
    console.error('Access Denied:', error.message);
  } else {
    console.error('RBAC Error:', error.message);
  }
};

/**
 * تصدير الملفات
 */
export const downloadFile = (data, filename, type = 'application/json') => {
  const blob = new Blob([data], { type });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export default rbacService;
