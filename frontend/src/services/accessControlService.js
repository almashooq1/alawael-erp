/**
 * Access Control Service — خدمة لوحة تحكم الصلاحيات والوصول
 */
import apiClient from './api.client';

const BASE = '/api/v1/rbac';
const USER_MGMT = '/user-management';

const accessControlService = {
  // ─── ROLES ──────────────────────────────────────────────────────────────
  getRoles: () => apiClient.get(`${BASE}/roles`).then(r => r.data?.data || []),

  createRole: data => apiClient.post(`${BASE}/roles`, data).then(r => r.data?.data),

  updateRole: (id, data) => apiClient.put(`${BASE}/roles/${id}`, data).then(r => r.data?.data),

  deleteRole: id => apiClient.delete(`${BASE}/roles/${id}`).then(r => r.data),

  // ─── PERMISSIONS ────────────────────────────────────────────────────────
  getPermissions: () => apiClient.get(`${BASE}/permissions`).then(r => r.data?.data || []),

  // ─── USERS ──────────────────────────────────────────────────────────────
  getUsers: (params = {}) => apiClient.get(`${USER_MGMT}/users`, { params }).then(r => r.data),

  getUserStats: () => apiClient.get(`${USER_MGMT}/stats`).then(r => r.data?.data || {}),

  updateUserPermissions: (userId, payload) =>
    apiClient.put(`${USER_MGMT}/users/${userId}/permissions`, payload).then(r => r.data),

  updateUserRole: (userId, role) =>
    apiClient.put(`${USER_MGMT}/users/${userId}`, { role }).then(r => r.data),

  // ─── AUDIT TRAIL ────────────────────────────────────────────────────────
  getAuditLogs: (params = {}) =>
    apiClient
      .get('/audit-trail', { params: { ...params, module: 'rbac,permissions,users' } })
      .then(r => r.data?.data || [])
      .catch(() => []),

  // ─── SECURITY INSIGHTS ──────────────────────────────────────────────────
  /**
   * Compute security insights client-side from user data.
   * Falls back to a mock-free analysis when data is available.
   */
  computeInsights: users => {
    const now = Date.now();
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;

    const insights = [];

    // 1. Dormant high-privilege accounts
    const dormantHigh = users.filter(u => {
      const lastLogin = u.lastLogin ? new Date(u.lastLogin).getTime() : 0;
      const isHigh = ['super_admin', 'admin', 'head_office_admin', 'it_admin'].includes(u.role);
      const isDormant = now - lastLogin > ninetyDays;
      return u.isActive && isHigh && isDormant;
    });
    if (dormantHigh.length > 0) {
      insights.push({
        id: 'dormant_high',
        severity: 'critical',
        title: 'حسابات عالية الصلاحية خاملة',
        description: `${dormantHigh.length} حساب بصلاحيات عالية لم يُستخدم خلال آخر 90 يوماً`,
        action: 'مراجعة وتعطيل الحسابات الخاملة',
        affectedCount: dormantHigh.length,
        users: dormantHigh.map(u => ({ id: u._id, name: u.fullName, role: u.role })),
      });
    }

    // 2. Locked accounts
    const locked = users.filter(u => u.lockUntil && new Date(u.lockUntil) > new Date());
    if (locked.length > 0) {
      insights.push({
        id: 'locked_accounts',
        severity: 'high',
        title: 'حسابات مقفولة',
        description: `${locked.length} حساب مقفول بسبب محاولات تسجيل دخول فاشلة`,
        action: 'مراجعة حسابات مقفولة وفحص نشاطها',
        affectedCount: locked.length,
        users: locked.map(u => ({ id: u._id, name: u.fullName, role: u.role })),
      });
    }

    // 3. Users without MFA
    const noMfa = users.filter(
      u =>
        u.isActive &&
        !u.mfa?.enabled &&
        ['super_admin', 'admin', 'it_admin', 'finance', 'accountant'].includes(u.role)
    );
    if (noMfa.length > 0) {
      insights.push({
        id: 'no_mfa',
        severity: 'high',
        title: 'حسابات حساسة بدون تحقق ثنائي (MFA)',
        description: `${noMfa.length} حساب بصلاحيات مالية/إدارية لم يُفعّل التحقق الثنائي`,
        action: 'إلزام هذه الحسابات بتفعيل MFA',
        affectedCount: noMfa.length,
        users: noMfa.map(u => ({ id: u._id, name: u.fullName, role: u.role })),
      });
    }

    // 4. Never-logged-in active accounts
    const neverLogged = users.filter(u => u.isActive && !u.lastLogin);
    if (neverLogged.length > 0) {
      insights.push({
        id: 'never_logged',
        severity: 'medium',
        title: 'حسابات نشطة لم تُستخدم قط',
        description: `${neverLogged.length} حساب مفعّل لم يُسجّل دخولاً أبداً`,
        action: 'مراجعة الحسابات غير المُستخدمة',
        affectedCount: neverLogged.length,
        users: neverLogged.map(u => ({ id: u._id, name: u.fullName, role: u.role })),
      });
    }

    // 5. Recently inactive accounts
    const recentlyInactive = users.filter(u => {
      const lastLogin = u.lastLogin ? new Date(u.lastLogin).getTime() : 0;
      return u.isActive && lastLogin > 0 && now - lastLogin > thirtyDays;
    });
    if (recentlyInactive.length > 0) {
      insights.push({
        id: 'inactive_30d',
        severity: 'low',
        title: 'حسابات غير نشطة (30+ يوم)',
        description: `${recentlyInactive.length} حساب لم يسجّل دخولاً خلال آخر 30 يوماً`,
        action: 'مراجعة دورية للحسابات الخاملة',
        affectedCount: recentlyInactive.length,
        users: recentlyInactive.map(u => ({ id: u._id, name: u.fullName, role: u.role })),
      });
    }

    return insights;
  },

  /**
   * Compute a security score (0-100) from user list and insights.
   */
  computeSecurityScore: (users, insights) => {
    if (!users.length) return 100;
    let deductions = 0;

    for (const i of insights) {
      const ratio = i.affectedCount / users.length;
      if (i.severity === 'critical') deductions += ratio * 40;
      else if (i.severity === 'high') deductions += ratio * 25;
      else if (i.severity === 'medium') deductions += ratio * 10;
      else deductions += ratio * 5;
    }

    return Math.max(0, Math.round(100 - deductions * 100));
  },
};

export default accessControlService;
