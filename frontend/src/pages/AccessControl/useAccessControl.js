/**
 * useAccessControl — هوك لوحة تحكم الصلاحيات والوصول
 * Centralizes all state, data fetching, and handlers for the AccessControl page
 */
import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'contexts/SnackbarContext';
import accessControlService from 'services/accessControlService';
import { TABS } from './accessControl.constants';

const useAccessControl = () => {
  const showSnackbar = useSnackbar();

  // ─── Tab ────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(TABS.OVERVIEW);

  // ─── Data ────────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [stats, setStats] = useState(null);
  const [insights, setInsights] = useState([]);
  const [securityScore, setSecurityScore] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);

  // ─── Loading flags ────────────────────────────────
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [saving, setSaving] = useState(false);

  // Combined loading for overview
  const loading = loadingUsers || loadingRoles || loadingStats;

  // ─── Fetch helpers ────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      setLoadingUsers(true);
      const res = await accessControlService.getUsers({ limit: 200 });
      const list = res?.users || res?.data || res || [];
      setUsers(list);

      const computed = accessControlService.computeInsights(list);
      setInsights(computed);
    } catch (err) {
      showSnackbar('فشل في تحميل بيانات المستخدمين', 'error');
    } finally {
      setLoadingUsers(false);
    }
  }, [showSnackbar]);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const res = await accessControlService.getUserStats();
      setStats(res);
    } catch {
      // stats are supplemental; fail silently
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      setLoadingRoles(true);
      const res = await accessControlService.getRoles();
      setRoles(res?.roles || res?.data || res || []);
    } catch (err) {
      showSnackbar('فشل في تحميل الأدوار', 'error');
    } finally {
      setLoadingRoles(false);
    }
  }, [showSnackbar]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoadingAudit(true);
      const res = await accessControlService.getAuditLogs({ limit: 200 });
      setAuditLogs(res?.logs || res?.data || res || []);
    } catch {
      // Non-critical
    } finally {
      setLoadingAudit(false);
    }
  }, []);

  // Recompute score whenever users or insights change
  useEffect(() => {
    if (users.length > 0) {
      const score = accessControlService.computeSecurityScore(users, insights);
      setSecurityScore(score);
    }
  }, [users, insights]);

  // ─── Initial load ────────────────────────────────
  useEffect(() => {
    fetchUsers();
    fetchStats();
    fetchRoles();
    fetchAuditLogs();
  }, [fetchUsers, fetchStats, fetchRoles, fetchAuditLogs]);

  // ─── Refresh all ─────────────────────────────────
  const handleRefresh = useCallback(() => {
    fetchUsers();
    fetchStats();
    fetchRoles();
    fetchAuditLogs();
  }, [fetchUsers, fetchStats, fetchRoles, fetchAuditLogs]);

  // ─── Role CRUD ────────────────────────────────────
  const handleRoleCreate = useCallback(
    async data => {
      try {
        setSaving(true);
        await accessControlService.createRole(data);
        showSnackbar(`تم إنشاء الدور "${data.name}" بنجاح`, 'success');
        fetchRoles();
      } catch (err) {
        showSnackbar('فشل في إنشاء الدور', 'error');
      } finally {
        setSaving(false);
      }
    },
    [showSnackbar, fetchRoles]
  );

  const handleRoleUpdate = useCallback(
    async updates => {
      try {
        setSaving(true);
        // updates is a map roleKey → permissions array; batch save
        await Promise.all(
          Object.entries(updates).map(([roleKey, perms]) =>
            accessControlService.updateRole(roleKey, { permissions: perms }).catch(() => null)
          )
        );
        showSnackbar('تم حفظ التغييرات بنجاح', 'success');
        fetchRoles();
      } catch {
        showSnackbar('حدث خطأ أثناء الحفظ', 'error');
      } finally {
        setSaving(false);
      }
    },
    [showSnackbar, fetchRoles]
  );

  const handleRoleDelete = useCallback(
    async roleId => {
      try {
        setSaving(true);
        await accessControlService.deleteRole(roleId);
        showSnackbar('تم حذف الدور بنجاح', 'success');
        fetchRoles();
      } catch (err) {
        showSnackbar('فشل في حذف الدور', 'error');
      } finally {
        setSaving(false);
      }
    },
    [showSnackbar, fetchRoles]
  );

  // ─── User permission update ───────────────────────
  const handleUserPermissionUpdate = useCallback(
    async (userId, payload) => {
      try {
        setSaving(true);
        await accessControlService.updateUserPermissions(userId, payload);
        showSnackbar('تم تحديث صلاحيات المستخدم بنجاح', 'success');
        fetchUsers();
      } catch {
        showSnackbar('فشل في تحديث الصلاحيات', 'error');
      } finally {
        setSaving(false);
      }
    },
    [showSnackbar, fetchUsers]
  );

  const handleUserRoleUpdate = useCallback(
    async (userId, role) => {
      try {
        setSaving(true);
        await accessControlService.updateUserRole(userId, role);
        showSnackbar('تم تحديث دور المستخدم بنجاح', 'success');
        fetchUsers();
      } catch {
        showSnackbar('فشل في تحديث الدور', 'error');
      } finally {
        setSaving(false);
      }
    },
    [showSnackbar, fetchUsers]
  );

  // ─── Insight action ───────────────────────────────
  const handleInsightAction = useCallback(insight => {
    // Navigate to appropriate tab based on insight id (set by computeInsights)
    const userInsights = [
      'dormant_high',
      'locked_accounts',
      'no_mfa',
      'never_logged',
      'inactive_30d',
    ];
    if (userInsights.includes(insight.id)) {
      setActiveTab(TABS.USERS);
    } else {
      setActiveTab(TABS.ROLES);
    }
  }, []);

  return {
    // State
    activeTab,
    setActiveTab,
    users,
    roles,
    stats,
    insights,
    securityScore,
    auditLogs,
    loading,
    loadingAudit,
    saving,
    loadingUsers,
    loadingRoles,
    loadingStats,
    // Handlers
    handleRefresh,
    handleRoleCreate,
    handleRoleUpdate,
    handleRoleDelete,
    handleUserPermissionUpdate,
    handleUserRoleUpdate,
    handleInsightAction,
  };
};

export default useAccessControl;
