/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🎣 RBAC Custom Hooks - React Hooks للعمل مع نظام الصلاحيات
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  roleService,
  permissionService,
  userRoleService,
  policyService,
  auditService,
  systemService,
} from '../services/rbacAPIService';

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 1️⃣ ROLE HOOKS - Hooks الأدوار
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Hook لإدارة الأدوار
 * Usage: const { roles, loading, error, createRole, updateRole, deleteRole } = useRoles();
 */
export const useRoles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // الحصول على الأدوار
  const fetchRoles = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await roleService.getAllRoles(filters);
      setRoles(Array.isArray(data) ? data : data.roles || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // الحصول على دور معين
  const getRole = useCallback(async (roleId) => {
    try {
      return await roleService.getRole(roleId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // إنشاء دور جديد
  const createRole = useCallback(async (roleData) => {
    setLoading(true);
    setError(null);
    try {
      const newRole = await roleService.createRole(roleData);
      setRoles((prev) => [...prev, newRole]);
      return newRole;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // تحديث دور
  const updateRole = useCallback(async (roleId, updates) => {
    setLoading(true);
    setError(null);
    try {
      const updated = await roleService.updateRole(roleId, updates);
      setRoles((prev) =>
        prev.map((r) => (r.id === roleId ? updated : r))
      );
      return updated;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // حذف دور
  const deleteRole = useCallback(async (roleId) => {
    setLoading(true);
    setError(null);
    try {
      await roleService.deleteRole(roleId);
      setRoles((prev) => prev.filter((r) => r.id !== roleId));
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // الحصول على صلاحيات دور
  const getRolePermissions = useCallback(async (roleId) => {
    try {
      return await roleService.getRolePermissions(roleId);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return {
    roles,
    loading,
    error,
    fetchRoles,
    getRole,
    createRole,
    updateRole,
    deleteRole,
    getRolePermissions,
  };
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 2️⃣ PERMISSION HOOKS - Hooks الصلاحيات
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Hook لإدارة الصلاحيات
 */
export const usePermissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // الحصول على الصلاحيات
  const fetchPermissions = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await permissionService.getAllPermissions(filters);
      setPermissions(Array.isArray(data) ? data : data.permissions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // إنشاء صلاحية جديدة
  const createPermission = useCallback(async (permData) => {
    setLoading(true);
    setError(null);
    try {
      const newPerm = await permissionService.createPermission(permData);
      setPermissions((prev) => [...prev, newPerm]);
      return newPerm;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // إسناد صلاحية لدور
  const assignPermissionToRole = useCallback(async (roleId, permissionId) => {
    setLoading(true);
    setError(null);
    try {
      return await permissionService.assignPermissionToRole(roleId, permissionId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // إزالة صلاحية من دور
  const removePermissionFromRole = useCallback(async (roleId, permissionId) => {
    setLoading(true);
    setError(null);
    try {
      return await permissionService.removePermissionFromRole(roleId, permissionId);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  return {
    permissions,
    loading,
    error,
    fetchPermissions,
    createPermission,
    assignPermissionToRole,
    removePermissionFromRole,
  };
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 3️⃣ USER ROLE HOOKS - Hooks أدوار المستخدمين
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Hook للحصول على أدوار المستخدم
 */
export const useUserRoles = (userId) => {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // الحصول على أدوار المستخدم
  const fetchUserRoles = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await userRoleService.getUserRoles(userId);
      setRoles(Array.isArray(data) ? data : data.roles || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // الحصول على صلاحيات المستخدم
  const fetchUserPermissions = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await userRoleService.getUserPermissions(userId);
      setPermissions(Array.isArray(data) ? data : data.permissions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // التحقق من صلاحية معينة
  const checkPermission = useCallback(async (permissionId) => {
    try {
      const result = await userRoleService.checkUserPermission(userId, permissionId);
      return result.hasPermission || result.allowed || false;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, [userId]);

  // إسناد دور للمستخدم
  const assignRole = useCallback(async (roleId, temporalConfig = {}) => {
    setLoading(true);
    setError(null);
    try {
      await userRoleService.assignRoleToUser(userId, roleId, temporalConfig);
      await fetchUserRoles();
      await fetchUserPermissions();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, fetchUserRoles, fetchUserPermissions]);

  // إزالة دور من المستخدم
  const removeRole = useCallback(async (roleId) => {
    setLoading(true);
    setError(null);
    try {
      await userRoleService.removeRoleFromUser(userId, roleId);
      await fetchUserRoles();
      await fetchUserPermissions();
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId, fetchUserRoles, fetchUserPermissions]);

  useEffect(() => {
    fetchUserRoles();
    fetchUserPermissions();
  }, [fetchUserRoles, fetchUserPermissions]);

  return {
    roles,
    permissions,
    loading,
    error,
    checkPermission,
    assignRole,
    removeRole,
    refreshRoles: fetchUserRoles,
    refreshPermissions: fetchUserPermissions,
  };
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 4️⃣ POLICY HOOKS - Hooks السياسات
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Hook لإدارة السياسات
 */
export const usePolicies = () => {
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // الحصول على السياسات
  const fetchPolicies = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await policyService.getAllPolicies(filters);
      setPolicies(Array.isArray(data) ? data : data.policies || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // إنشاء سياسة جديدة
  const createPolicy = useCallback(async (policyData) => {
    setLoading(true);
    setError(null);
    try {
      const newPolicy = await policyService.createPolicy(policyData);
      setPolicies((prev) => [...prev, newPolicy]);
      return newPolicy;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // تقييم السياسات
  const evaluatePolicies = useCallback(async (userId, context = {}) => {
    try {
      return await policyService.evaluatePolicies(userId, context);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // اتخاذ قرار الوصول
  const getAccessDecision = useCallback(async (userId, context = {}) => {
    try {
      return await policyService.getAccessDecision(userId, context);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  return {
    policies,
    loading,
    error,
    fetchPolicies,
    createPolicy,
    evaluatePolicies,
    getAccessDecision,
  };
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 5️⃣ AUDIT HOOKS - Hooks التدقيق
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Hook للحصول على سجلات التدقيق
 */
export const useAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [total, setTotal] = useState(0);

  // الحصول على سجلات التدقيق
  const fetchAuditLogs = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await auditService.getAuditLogs(filters);
      if (Array.isArray(data)) {
        setLogs(data);
        setTotal(data.length);
      } else {
        setLogs(data.results || data.logs || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // البحث في السجلات
  const searchLogs = useCallback(async (query) => {
    setLoading(true);
    setError(null);
    try {
      const data = await auditService.searchAuditLogs(query);
      setLogs(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // تصدير السجلات
  const exportLogs = useCallback(async (format = 'csv', filters = {}) => {
    try {
      return await auditService.exportAuditLogs(format, filters);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  return {
    logs,
    total,
    loading,
    error,
    fetchAuditLogs,
    searchLogs,
    exportLogs,
  };
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 6️⃣ SECURITY HOOKS - Hooks الأمان
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Hook للحصول على حوادث الأمان وملخص الأمان
 */
export const useSecurity = () => {
  const [incidents, setIncidents] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // الحصول على حوادث الأمان
  const fetchIncidents = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await auditService.getSecurityIncidents(filters);
      setIncidents(Array.isArray(data) ? data : data.incidents || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // الحصول على ملخص الأمان
  const fetchSecuritySummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await auditService.getSecuritySummary();
      setSummary(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
    fetchSecuritySummary();
  }, [fetchIncidents, fetchSecuritySummary]);

  return {
    incidents,
    summary,
    loading,
    error,
    fetchIncidents,
    fetchSecuritySummary,
  };
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 7️⃣ SYSTEM HOOKS - Hooks النظام
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Hook للعمليات المتعلقة بالنظام
 */
export const useRBACSystem = () => {
  const [stats, setStats] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // الحصول على إحصائيات النظام
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await systemService.getSystemStats();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // فحص صحة النظام
  const checkHealth = useCallback(async () => {
    try {
      const data = await systemService.healthCheck();
      setHealth(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    }
  }, []);

  // تصدير البيانات
  const exportData = useCallback(async (format = 'json') => {
    setLoading(true);
    setError(null);
    try {
      return await systemService.exportRBACData(format);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // استيراد البيانات
  const importData = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    try {
      return await systemService.importRBACData(file);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    checkHealth();
  }, [fetchStats, checkHealth]);

  return {
    stats,
    health,
    loading,
    error,
    fetchStats,
    checkHealth,
    exportData,
    importData,
  };
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔍 PERMISSION CHECK HOOK - Hook للتحقق من الصلاحيات
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Hook للتحقق من صلاحية معينة بسهولة
 * Usage: const canEdit = useHasPermission('users:edit');
 */
export const useHasPermission = (permissionId, userId = null) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const currentUser = useSelector((state) => state.auth?.user);
  const effectiveUserId = userId || currentUser?.id;

  useEffect(() => {
    const checkPermission = async () => {
      if (!effectiveUserId) {
        setLoading(false);
        return;
      }

      try {
        const result = await userRoleService.checkUserPermission(
          effectiveUserId,
          permissionId
        );
        setHasPermission(result.hasPermission || result.allowed || false);
      } catch (err) {
        console.error('Permission check failed:', err);
        setHasPermission(false);
      } finally {
        setLoading(false);
      }
    };

    checkPermission();
  }, [permissionId, effectiveUserId]);

  return { hasPermission, loading };
};

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 🔄 COMBINED HOOK - Hook مركب لجميع عمليات RBAC
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Hook شامل يجمع جميع عمليات RBAC
 */
export const useRBAC = () => {
  const roles = useRoles();
  const permissions = usePermissions();
  const policies = usePolicies();
  const audit = useAuditLogs();
  const security = useSecurity();
  const system = useRBACSystem();

  return {
    roles,
    permissions,
    policies,
    audit,
    security,
    system,
  };
};

export default {
  useRoles,
  usePermissions,
  useUserRoles,
  usePolicies,
  useAuditLogs,
  useSecurity,
  useRBACSystem,
  useHasPermission,
  useRBAC,
};
