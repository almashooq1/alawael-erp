/**
 * Admin Portal Routes
 * مسارات بوابة الإدارة
 */
import { lazyWithRetry } from '../utils/lazyLoader';

const AdminDashboard = lazyWithRetry(() => import('../pages/Admin/AdminDashboard'));
const EnhancedAdminDashboard = lazyWithRetry(
  () => import('../pages/Dashboard/EnhancedAdminDashboard')
);
const AdvancedAdminPanel = lazyWithRetry(() => import('../pages/Admin/AdvancedAdminPanel'));
const AdminUsersManagement = lazyWithRetry(() => import('../pages/AdminUsers'));
const AdminSystemSettings = lazyWithRetry(() => import('../pages/Admin/AdminSystemSettings'));
const AdminReportsAnalytics = lazyWithRetry(() => import('../pages/Admin/AdminReportsAnalytics'));
const AdvancedReportsPage = lazyWithRetry(() => import('../pages/Reports/AdvancedReportsPage'));
const AdminAuditLogs = lazyWithRetry(() => import('../pages/Admin/AdminAuditLogs'));
const AdminClinicManagement = lazyWithRetry(() => import('../pages/Admin/AdminClinicManagement'));
const AdminPaymentsBilling = lazyWithRetry(() => import('../pages/Admin/AdminPaymentsBilling'));
const AdminNotifications = lazyWithRetry(() => import('../pages/Admin/AdminNotifications'));
const ExecutiveDashboard = lazyWithRetry(() => import('../pages/Admin/ExecutiveDashboard'));
const SecuritySettings = lazyWithRetry(() => import('../pages/Admin/SecuritySettings'));
const SystemAdmin = lazyWithRetry(() => import('../pages/Admin/SystemAdmin'));
const BrandingSettings = lazyWithRetry(() => import('../pages/Admin/BrandingSettings'));

// Administration Management System
const Administration = lazyWithRetry(() => import('../pages/Admin/Administration'));
const AdminDecisions = lazyWithRetry(() => import('../pages/Admin/AdminDecisions'));
const AdminDecisionCreate = lazyWithRetry(() => import('../pages/Admin/AdminDecisionCreate'));
const AdminDecisionDetail = lazyWithRetry(() => import('../pages/Admin/AdminDecisionDetail'));
const AdminCorrespondence = lazyWithRetry(() => import('../pages/Admin/AdminCorrespondence'));
const AdminDelegations = lazyWithRetry(() => import('../pages/Admin/AdminDelegations'));

// Administrative Communications Module — الاتصالات الإدارية
const AdminCommDashboard = lazyWithRetry(() => import('../pages/admin-communications/AdminCommunicationsDashboard'));
const AdminCommList = lazyWithRetry(() => import('../pages/admin-communications/CorrespondenceList'));
const AdminCommCompose = lazyWithRetry(() => import('../pages/admin-communications/ComposeCorrespondence'));
const AdminCommDetail = lazyWithRetry(() => import('../pages/admin-communications/CorrespondenceDetail'));
const AdminCommTemplates = lazyWithRetry(() => import('../pages/admin-communications/TemplatesManagement'));
const AdminCommEntities = lazyWithRetry(() => import('../pages/admin-communications/ExternalEntitiesManagement'));

// Electronic Directives Module — التوجيهات الإلكترونية
const DirDashboard = lazyWithRetry(() => import('../pages/electronic-directives/DirectivesDashboard'));
const DirList = lazyWithRetry(() => import('../pages/electronic-directives/DirectivesList'));
const DirCompose = lazyWithRetry(() => import('../pages/electronic-directives/ComposeDirective'));
const DirDetail = lazyWithRetry(() => import('../pages/electronic-directives/DirectiveDetail'));

// System Settings Page — إعدادات النظام
const SystemSettingsPage = lazyWithRetry(() => import('../pages/SystemAdmin/SystemSettingsPage'));

// User Management System — نظام إدارة المستخدمين المتقدم
const UserManagement = lazyWithRetry(() => import('../pages/UserManagement'));

export default function AdminRoutes() {
  return (
    <>
      {/* Admin Portal — Protected by RoleGuard */}
      <Route
        path="admin-portal"
        element={
          <RoleGuard allowedRoles={['admin', 'super_admin']}>
            <AdminDashboard />
          </RoleGuard>
        }
      />
      <Route path="admin-portal/enhanced" element={<EnhancedAdminDashboard />} />
      <Route path="admin-portal/advanced" element={<AdvancedAdminPanel />} />
      <Route path="admin-portal/users" element={<AdminUsersManagement />} />
      <Route path="admin-portal/settings" element={<AdminSystemSettings />} />
      <Route path="admin-portal/reports" element={<AdminReportsAnalytics />} />
      <Route path="admin-portal/advanced-reports" element={<AdvancedReportsPage />} />
      <Route path="admin-portal/audit-logs" element={<AdminAuditLogs />} />
      <Route path="admin-portal/clinics" element={<AdminClinicManagement />} />
      <Route path="admin-portal/payments" element={<AdminPaymentsBilling />} />
      <Route path="admin-portal/notifications" element={<AdminNotifications />} />

      {/* Executive Dashboard */}
      <Route path="executive-dashboard" element={<ExecutiveDashboard />} />

      {/* Security */}
      <Route path="security" element={<SecuritySettings />} />

      {/* System Administration */}
      <Route path="system-admin" element={<SystemAdmin />} />

      {/* Branding & UI Customization — الهوية المؤسسية */}
      <Route path="admin-portal/branding" element={<BrandingSettings />} />
      <Route path="branding-settings" element={<BrandingSettings />} />

      {/* Administration Management System */}
      <Route path="administration" element={<Administration />} />
      <Route path="administration/decisions" element={<AdminDecisions />} />
      <Route path="administration/decisions/create" element={<AdminDecisionCreate />} />
      <Route path="administration/decisions/:id" element={<AdminDecisionDetail />} />
      <Route path="administration/correspondence" element={<AdminCorrespondence />} />
      <Route path="administration/correspondence/:id" element={<AdminCorrespondence />} />
      <Route path="administration/delegations" element={<AdminDelegations />} />

      {/* Administrative Communications Module — الاتصالات الإدارية */}
      <Route
        path="admin-communications"
        element={
          <RoleGuard allowedRoles={['admin', 'super_admin', 'manager', 'secretary']}>
            <AdminCommDashboard />
          </RoleGuard>
        }
      />
      <Route path="admin-communications/inbox" element={<AdminCommList viewMode="inbox" />} />
      <Route path="admin-communications/outbox" element={<AdminCommList viewMode="outbox" />} />
      <Route path="admin-communications/all" element={<AdminCommList viewMode="all" />} />
      <Route path="admin-communications/compose" element={<AdminCommCompose />} />
      <Route path="admin-communications/view/:id" element={<AdminCommDetail />} />
      <Route path="admin-communications/templates" element={<AdminCommTemplates />} />
      <Route path="admin-communications/external-entities" element={<AdminCommEntities />} />

      {/* Electronic Directives Module — التوجيهات الإلكترونية */}
      <Route
        path="electronic-directives"
        element={
          <RoleGuard allowedRoles={['admin', 'super_admin', 'manager', 'department_head']}>
            <DirDashboard />
          </RoleGuard>
        }
      />
      <Route path="electronic-directives/list" element={<DirList />} />
      <Route path="electronic-directives/compose" element={<DirCompose />} />
      <Route path="electronic-directives/view/:id" element={<DirDetail />} />

      {/* System Settings — إعدادات النظام */}
      <Route
        path="system-settings"
        element={
          <RoleGuard allowedRoles={['admin', 'super_admin']}>
            <SystemSettingsPage />
          </RoleGuard>
        }
      />
      <Route
        path="admin-portal/system-settings"
        element={
          <RoleGuard allowedRoles={['admin', 'super_admin']}>
            <SystemSettingsPage />
          </RoleGuard>
        }
      />

      {/* User Management System — نظام إدارة المستخدمين المتقدم */}
      <Route
        path="user-management"
        element={
          <RoleGuard allowedRoles={['admin', 'super_admin', 'hr', 'hr_manager', 'manager']}>
            <UserManagement />
          </RoleGuard>
        }
      />
      <Route
        path="admin-portal/user-management"
        element={
          <RoleGuard allowedRoles={['admin', 'super_admin', 'hr', 'hr_manager', 'manager']}>
            <UserManagement />
          </RoleGuard>
        }
      />
    </>
  );
}
