/**
 * UserManagement — صفحة إدارة المستخدمين الرئيسية
 * نظام شامل لإدارة المستخدمين، الأدوار، الصلاحيات والعمليات الجماعية
 */
import { Box, Typography, Alert, Breadcrumbs, Link } from '@mui/material';
import {
  People as PeopleIcon,
  Home as HomeIcon,
  AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import ConfirmDialog from 'components/common/ConfirmDialog';
import useUserManagement from './useUserManagement';
import StatsCards from './StatsCards';
import UsersToolbar from './UsersToolbar';
import UsersTable from './UsersTable';
import UserFormDialog from './UserFormDialog';
import UserDetailDialog from './UserDetailDialog';
import ResetPasswordDialog from './ResetPasswordDialog';
import PermissionsDialog from './PermissionsDialog';

const UserManagement = () => {
  const {
    // Data
    users,
    stats,
    roles,
    pagination,
    loading,
    saving,
    error,
    clearError,

    // Filters
    search,
    roleFilter,
    statusFilter,
    sortBy,
    sortOrder,

    // Dialog states
    formDialogOpen,
    detailDialogOpen,
    resetPassDialogOpen,
    permDialogOpen,
    editingUser,
    selectedUser,
    formData,
    setFormData,
    confirmState,

    // Selection
    selectedIds,
    clearSelectedIds,

    // Handlers
    handleSearch,
    handleRoleFilter,
    handleStatusFilter,
    handleSort,
    handlePageChange,
    handleLimitChange,
    handleOpenCreateDialog,
    handleOpenEditDialog,
    handleCloseFormDialog,
    handleSaveUser,
    handleDeleteUser,
    handleToggleStatus,
    handleViewUser,
    handleOpenResetPassword,
    handleResetPassword,
    handleUnlockUser,
    handleOpenPermissions,
    handleSavePermissions,
    handleToggleSelect,
    handleSelectAll,
    handleBulkAction,
    handleExport,
    handleImport,

    // Close dialogs
    setDetailDialogOpen,
    setResetPassDialogOpen,
    setPermDialogOpen,

    // Refresh
    refreshData,
  } = useUserManagement();

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* شريط التنقل */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          underline="hover"
          color="inherit"
          href="/dashboard"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <HomeIcon fontSize="small" />
          الرئيسية
        </Link>
        <Link
          underline="hover"
          color="inherit"
          href="/admin"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
        >
          <AdminIcon fontSize="small" />
          لوحة الإدارة
        </Link>
        <Typography
          color="text.primary"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontWeight: 'bold' }}
        >
          <PeopleIcon fontSize="small" />
          إدارة المستخدمين
        </Typography>
      </Breadcrumbs>

      {/* العنوان */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <PeopleIcon color="primary" sx={{ fontSize: 32 }} />
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
            إدارة المستخدمين
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إنشاء وتعديل وإدارة المستخدمين والأدوار والصلاحيات
          </Typography>
        </Box>
      </Box>

      {/* رسالة خطأ */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      {/* بطاقات الإحصائيات */}
      <StatsCards stats={stats} loading={loading && !stats} />

      {/* شريط الأدوات */}
      <UsersToolbar
        search={search}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        selectedCount={selectedIds.length}
        onSearch={handleSearch}
        onRoleFilter={handleRoleFilter}
        onStatusFilter={handleStatusFilter}
        onCreateUser={handleOpenCreateDialog}
        onExport={handleExport}
        onImport={handleImport}
        onBulkAction={handleBulkAction}
        onRefresh={refreshData}
        onClearSelection={clearSelectedIds}
      />

      {/* جدول المستخدمين */}
      <UsersTable
        users={users}
        loading={loading}
        pagination={pagination}
        sortBy={sortBy}
        sortOrder={sortOrder}
        selectedIds={selectedIds}
        onSort={handleSort}
        onPageChange={handlePageChange}
        onLimitChange={handleLimitChange}
        onToggleSelect={handleToggleSelect}
        onSelectAll={handleSelectAll}
        onEdit={handleOpenEditDialog}
        onView={handleViewUser}
        onDelete={handleDeleteUser}
        onToggleStatus={handleToggleStatus}
        onResetPassword={handleOpenResetPassword}
        onUnlock={handleUnlockUser}
        onPermissions={handleOpenPermissions}
      />

      {/* ═══ Dialogs ═══ */}

      {/* حوار إنشاء / تعديل مستخدم */}
      <UserFormDialog
        open={formDialogOpen}
        onClose={handleCloseFormDialog}
        editingUser={editingUser}
        formData={formData}
        setFormData={setFormData}
        onSave={handleSaveUser}
        roles={roles}
        saving={saving}
      />

      {/* حوار تفاصيل المستخدم */}
      <UserDetailDialog
        open={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        user={selectedUser}
      />

      {/* حوار إعادة تعيين كلمة المرور */}
      <ResetPasswordDialog
        open={resetPassDialogOpen}
        onClose={() => setResetPassDialogOpen(false)}
        user={selectedUser}
        onResetPassword={handleResetPassword}
      />

      {/* حوار الصلاحيات */}
      <PermissionsDialog
        open={permDialogOpen}
        onClose={() => setPermDialogOpen(false)}
        user={selectedUser}
        onSave={handleSavePermissions}
      />

      {/* حوار التأكيد */}
      <ConfirmDialog {...confirmState} />
    </Box>
  );
};

export default UserManagement;
