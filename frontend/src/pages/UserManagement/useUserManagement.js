/**
 * useUserManagement — Custom hook for user management state & logic
 * هوك مخصص لإدارة المستخدمين
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import userManagementService from 'services/userManagementService';
import exportService from 'services/exportService';
import logger from 'utils/logger';
import { useSnackbar } from 'contexts/SnackbarContext';
import { useConfirmDialog } from 'components/common/ConfirmDialog';
import { INITIAL_FORM, EXPORT_COLUMNS, getRoleLabel } from './constants';

export default function useUserManagement() {
  const showSnackbar = useSnackbar();
  const [confirmState, showConfirm] = useConfirmDialog();

  // ─── State ──────────────────────────────────────
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState(null);
  const [roles, setRoles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [resetPassDialogOpen, setResetPassDialogOpen] = useState(false);
  const [permDialogOpen, setPermDialogOpen] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState(INITIAL_FORM);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState([]);

  // Debounce timer
  const searchTimer = useRef(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  // ─── Fetch Users ────────────────────────────────
  const fetchUsers = useCallback(
    async (params = {}) => {
      try {
        setLoading(true);
        const result = await userManagementService.getUsers({
          page: params.page || pagination.page,
          limit: params.limit || pagination.limit,
          search: params.search !== undefined ? params.search : search,
          role: params.role !== undefined ? params.role : roleFilter,
          isActive: params.isActive !== undefined ? params.isActive : statusFilter,
          sortBy: params.sortBy || sortBy,
          sortOrder: params.sortOrder || sortOrder,
        });
        setUsers(result.users);
        setPagination(result.pagination);
        setError(null);
      } catch (err) {
        logger.error('Failed to load users:', err);
        setError('حدث خطأ في تحميل المستخدمين');
      } finally {
        setLoading(false);
      }
    },
    [pagination.page, pagination.limit, search, roleFilter, statusFilter, sortBy, sortOrder]
  );

  // ─── Fetch Stats ────────────────────────────────
  const fetchStats = useCallback(async () => {
    try {
      const data = await userManagementService.getStats();
      setStats(data);
    } catch (err) {
      logger.warn('Stats fetch failed:', err);
    }
  }, []);

  // ─── Fetch Roles ────────────────────────────────
  const fetchRoles = useCallback(async () => {
    try {
      const data = await userManagementService.getRoles();
      setRoles(data);
    } catch (err) {
      logger.warn('Roles fetch failed:', err);
    }
  }, []);

  // ─── Initial Load ──────────────────────────────
  useEffect(() => {
    fetchUsers({ page: 1 });
    fetchStats();
    fetchRoles();
  }, []); // eslint-disable-line

  // ─── Search with debounce ──────────────────────
  const handleSearch = useCallback(
    value => {
      setSearch(value);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      searchTimer.current = setTimeout(() => {
        fetchUsers({ page: 1, search: value });
      }, 400);
    },
    [fetchUsers]
  );

  // ─── Filter Handlers ───────────────────────────
  const handleRoleFilter = useCallback(
    value => {
      setRoleFilter(value);
      fetchUsers({ page: 1, role: value });
    },
    [fetchUsers]
  );

  const handleStatusFilter = useCallback(
    value => {
      setStatusFilter(value);
      fetchUsers({ page: 1, isActive: value });
    },
    [fetchUsers]
  );

  const handleSort = useCallback(
    field => {
      const newOrder = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
      setSortBy(field);
      setSortOrder(newOrder);
      fetchUsers({ page: 1, sortBy: field, sortOrder: newOrder });
    },
    [sortBy, sortOrder, fetchUsers]
  );

  const handlePageChange = useCallback(
    newPage => {
      setPagination(prev => ({ ...prev, page: newPage }));
      fetchUsers({ page: newPage });
    },
    [fetchUsers]
  );

  const handleLimitChange = useCallback(
    newLimit => {
      setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
      fetchUsers({ page: 1, limit: newLimit });
    },
    [fetchUsers]
  );

  // ─── CRUD ──────────────────────────────────────
  const handleOpenCreateDialog = useCallback(() => {
    setEditingUser(null);
    setFormData(INITIAL_FORM);
    setFormDialogOpen(true);
  }, []);

  const handleOpenEditDialog = useCallback(user => {
    setEditingUser(user);
    setFormData({
      fullName: user.fullName || '',
      username: user.username || '',
      email: user.email || '',
      phone: user.phone || '',
      password: '',
      role: user.role || 'user',
      branch: user.branch?._id || user.branch || '',
      isActive: user.isActive !== undefined ? user.isActive : true,
      requirePasswordChange: user.requirePasswordChange || false,
      notifyByEmail: false,
      customPermissions: user.customPermissions || [],
      deniedPermissions: user.deniedPermissions || [],
    });
    setFormDialogOpen(true);
  }, []);

  const handleCloseFormDialog = useCallback(() => {
    setFormDialogOpen(false);
    setEditingUser(null);
    setFormData(INITIAL_FORM);
  }, []);

  const handleSaveUser = useCallback(async () => {
    try {
      setSaving(true);
      const payload = { ...formData };
      // لا نرسل كلمة مرور فارغة عند التحديث
      if (editingUser && !payload.password) {
        delete payload.password;
      }
      // لا نرسل فرع فارغ
      if (!payload.branch) delete payload.branch;

      if (editingUser) {
        await userManagementService.updateUser(editingUser._id || editingUser.id, payload);
        showSnackbar('تم تحديث المستخدم بنجاح', 'success');
      } else {
        const result = await userManagementService.createUser(payload);
        if (result?.tempPassword) {
          showSnackbar(`تم إنشاء المستخدم — كلمة المرور المؤقتة: ${result.tempPassword}`, 'info');
        } else {
          showSnackbar('تم إنشاء المستخدم بنجاح', 'success');
        }
      }
      handleCloseFormDialog();
      fetchUsers();
      fetchStats();
    } catch (err) {
      logger.error('Save user failed:', err);
      const msg = err?.response?.data?.message || err?.message || 'حدث خطأ في حفظ المستخدم';
      showSnackbar(msg, 'error');
    } finally {
      setSaving(false);
    }
  }, [formData, editingUser, handleCloseFormDialog, fetchUsers, fetchStats, showSnackbar]);

  const handleDeleteUser = useCallback(
    (userId, userName) => {
      showConfirm({
        title: 'تعطيل المستخدم',
        message: `هل تريد تعطيل المستخدم "${userName}"؟ سيتم إلغاء تفعيل الحساب.`,
        confirmText: 'تعطيل',
        confirmColor: 'error',
        onConfirm: async () => {
          try {
            await userManagementService.deleteUser(userId);
            showSnackbar('تم تعطيل المستخدم بنجاح', 'success');
            fetchUsers();
            fetchStats();
          } catch (err) {
            logger.error('Delete user failed:', err);
            showSnackbar('حدث خطأ في تعطيل المستخدم', 'error');
          }
        },
      });
    },
    [showConfirm, fetchUsers, fetchStats, showSnackbar]
  );

  const handleToggleStatus = useCallback(
    async userId => {
      try {
        const result = await userManagementService.toggleUserStatus(userId);
        showSnackbar(result.isActive ? 'تم تفعيل المستخدم' : 'تم تعطيل المستخدم', 'success');
        fetchUsers();
        fetchStats();
      } catch (err) {
        logger.error('Toggle status failed:', err);
        showSnackbar('حدث خطأ في تغيير حالة المستخدم', 'error');
      }
    },
    [fetchUsers, fetchStats, showSnackbar]
  );

  // ─── View User Detail ──────────────────────────
  const handleViewUser = useCallback(
    async user => {
      try {
        const detail = await userManagementService.getUserById(user._id || user.id);
        setSelectedUser(detail);
        setDetailDialogOpen(true);
      } catch (err) {
        logger.error('View user failed:', err);
        showSnackbar('حدث خطأ في جلب بيانات المستخدم', 'error');
      }
    },
    [showSnackbar]
  );

  // ─── Reset Password ────────────────────────────
  const handleOpenResetPassword = useCallback(user => {
    setSelectedUser(user);
    setResetPassDialogOpen(true);
  }, []);

  const handleResetPassword = useCallback(
    async (userId, newPassword) => {
      try {
        const result = await userManagementService.resetPassword(userId, newPassword || null);
        if (result?.data?.tempPassword) {
          showSnackbar(`تم إعادة تعيين كلمة المرور — المؤقتة: ${result.data.tempPassword}`, 'info');
        } else {
          showSnackbar('تم إعادة تعيين كلمة المرور بنجاح', 'success');
        }
        setResetPassDialogOpen(false);
      } catch (err) {
        logger.error('Reset password failed:', err);
        showSnackbar('حدث خطأ في إعادة تعيين كلمة المرور', 'error');
      }
    },
    [showSnackbar]
  );

  // ─── Unlock ────────────────────────────────────
  const handleUnlockUser = useCallback(
    async userId => {
      try {
        await userManagementService.unlockUser(userId);
        showSnackbar('تم فك قفل الحساب بنجاح', 'success');
        fetchUsers();
      } catch (err) {
        logger.error('Unlock user failed:', err);
        showSnackbar('حدث خطأ في فك القفل', 'error');
      }
    },
    [fetchUsers, showSnackbar]
  );

  // ─── Permissions ───────────────────────────────
  const handleOpenPermissions = useCallback(user => {
    setSelectedUser(user);
    setPermDialogOpen(true);
  }, []);

  const handleSavePermissions = useCallback(
    async (userId, permissions) => {
      try {
        await userManagementService.updatePermissions(userId, permissions);
        showSnackbar('تم تحديث الصلاحيات بنجاح', 'success');
        setPermDialogOpen(false);
        fetchUsers();
      } catch (err) {
        logger.error('Save permissions failed:', err);
        showSnackbar('حدث خطأ في تحديث الصلاحيات', 'error');
      }
    },
    [fetchUsers, showSnackbar]
  );

  // ─── Bulk Selection ────────────────────────────
  const handleToggleSelect = useCallback(userId => {
    setSelectedIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.length === users.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(users.map(u => u._id || u.id));
    }
  }, [users, selectedIds]);

  const handleBulkAction = useCallback(
    async (action, extra = {}) => {
      if (selectedIds.length === 0) {
        showSnackbar('يرجى تحديد مستخدم واحد على الأقل', 'warning');
        return;
      }

      showConfirm({
        title: 'تأكيد العملية الجماعية',
        message: `سيتم تنفيذ العملية على ${selectedIds.length} مستخدم. هل تريد المتابعة؟`,
        confirmText: 'تنفيذ',
        confirmColor: 'primary',
        onConfirm: async () => {
          try {
            const result = await userManagementService.bulkAction(action, selectedIds, extra);
            showSnackbar(result?.message || 'تم تنفيذ العملية بنجاح', 'success');
            if (result?.data?.passwords) {
              // Individual passwords per user from bulk reset
              const passwordList = Object.values(result.data.passwords).join(', ');
              showSnackbar(`كلمات المرور المؤقتة: ${passwordList}`, 'info');
            } else if (result?.data?.tempPassword) {
              showSnackbar(`كلمة المرور المؤقتة: ${result.data.tempPassword}`, 'info');
            }
            setSelectedIds([]);
            fetchUsers();
            fetchStats();
          } catch (err) {
            logger.error('Bulk action failed:', err);
            showSnackbar('حدث خطأ في تنفيذ العملية', 'error');
          }
        },
      });
    },
    [selectedIds, showConfirm, fetchUsers, fetchStats, showSnackbar]
  );

  // ─── Import / Export ───────────────────────────
  const handleExport = useCallback(
    async format => {
      try {
        // Fetch ALL users from server (not just current page)
        const serverData = await userManagementService.exportUsers({
          role: roleFilter,
          isActive: statusFilter,
        });
        const exportData = (serverData || users).map(u => ({
          ...u,
          roleLabel: getRoleLabel(u.role || u.الدور),
          statusLabel: u.isActive ? 'نشط' : u.الحالة || 'معطل',
        }));
        const result = await exportService.exportData(exportData, format, {
          columns: EXPORT_COLUMNS,
          filename: `users_${new Date().toISOString().slice(0, 10)}`,
          sheetName: 'المستخدمون',
          title: 'قائمة المستخدمين',
        });
        showSnackbar(result?.message || 'تم التصدير بنجاح', 'info');
      } catch (err) {
        logger.error('Export failed:', err);
        showSnackbar('حدث خطأ أثناء التصدير', 'error');
      }
    },
    [users, roleFilter, statusFilter, showSnackbar]
  );

  const handleImport = useCallback(
    async e => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async evt => {
        try {
          const raw = evt.target.result;
          let usersArr = [];

          if (file.name.endsWith('.csv')) {
            const rows = raw.split(/\r?\n/).filter(Boolean);
            const headers = rows[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
            usersArr = rows.slice(1).map(row => {
              // Handle quoted fields that may contain commas
              const values = [];
              let current = '';
              let inQuotes = false;
              for (const ch of row) {
                if (ch === '"') {
                  inQuotes = !inQuotes;
                } else if (ch === ',' && !inQuotes) {
                  values.push(current.trim());
                  current = '';
                } else {
                  current += ch;
                }
              }
              values.push(current.trim());

              const obj = {};
              headers.forEach((h, i) => {
                obj[h] = values[i] || '';
              });
              return obj;
            });
          } else {
            const ExcelJS = (await import(/* webpackChunkName: "exceljs" */ 'exceljs')).default;
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(raw);
            const worksheet = workbook.worksheets[0];
            const headers = [];
            worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
              if (rowNumber === 1) {
                row.eachCell((cell, colNumber) => {
                  headers[colNumber] = cell.value;
                });
              } else {
                const rowData = {};
                row.eachCell((cell, colNumber) => {
                  rowData[headers[colNumber]] = cell.value;
                });
                usersArr.push(rowData);
              }
            });
          }

          if (usersArr.length === 0) {
            showSnackbar('الملف فارغ', 'warning');
            return;
          }

          const result = await userManagementService.importUsers(usersArr);
          showSnackbar(result?.message || `تم استيراد ${usersArr.length} مستخدم`, 'success');
          fetchUsers();
          fetchStats();
        } catch (err) {
          logger.error('Import failed:', err);
          showSnackbar('حدث خطأ أثناء الاستيراد', 'error');
        }
      };

      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
      e.target.value = '';
    },
    [fetchUsers, fetchStats, showSnackbar]
  );

  return {
    // Data
    users,
    stats,
    roles,
    pagination,
    loading,
    saving,
    error,
    clearError: () => setError(null),

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
    clearSelectedIds: () => setSelectedIds([]),

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
    refreshData: () => {
      fetchUsers();
      fetchStats();
    },
  };
}
