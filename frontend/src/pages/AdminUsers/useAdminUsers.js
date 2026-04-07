/**
 * useAdminUsers — state, effects & handlers for Admin Users Management
 * هوك مخصص لإدارة المستخدمين
 */

import { useState, useEffect } from 'react';
import { adminService } from 'services/adminService';
import exportService from 'services/exportService';
import logger from 'utils/logger';
import { useSnackbar } from 'contexts/SnackbarContext';
import { useAuth } from 'contexts/AuthContext';
import { useConfirmDialog } from 'components/common/ConfirmDialog';
import { EXPORT_COLUMNS, INITIAL_FORM } from './constants';

export default function useAdminUsers() {
  const { currentUser } = useAuth();
  const userId = currentUser?._id || currentUser?.id || '';
  const showSnackbar = useSnackbar();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [confirmState, showConfirm] = useConfirmDialog();
  const [formData, setFormData] = useState(INITIAL_FORM);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await adminService.getAdminUsers(userId);
        setUsers(data);
        setFilteredUsers(data);
      } catch (err) {
        logger.error('Failed to load users:', err);
        setError(err.message || 'حدث خطأ في تحميل المستخدمين');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, [userId]);

  // ── filtering ──────────────────────────────
  const filterUsers = (search, role, status) => {
    let filtered = users;
    if (search) {
      filtered = filtered.filter(
        user =>
          user.name.toLowerCase().includes(search) ||
          user.email.toLowerCase().includes(search) ||
          user.phone.includes(search)
      );
    }
    if (role !== 'all') filtered = filtered.filter(user => user.role === role);
    if (status !== 'all') filtered = filtered.filter(user => user.status === status);
    setFilteredUsers(filtered);
    setPage(0);
  };

  const handleSearch = event => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);
    filterUsers(term, roleFilter, statusFilter);
  };

  const handleRoleFilter = event => {
    const role = event.target.value;
    setRoleFilter(role);
    filterUsers(searchTerm, role, statusFilter);
  };

  const handleStatusFilter = event => {
    const status = event.target.value;
    setStatusFilter(status);
    filterUsers(searchTerm, roleFilter, status);
  };

  // ── pagination ─────────────────────────────
  const handleChangePage = (_event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // ── CRUD ───────────────────────────────────
  const handleOpenDialog = (user = null) => {
    setEditingUser(user);
    setFormData(
      user
        ? {
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role || 'طالب',
            status: user.status || 'قيد الانتظار',
          }
        : INITIAL_FORM
    );
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        await adminService.updateUser(editingUser._id || editingUser.id, formData);
        showSnackbar('تم تحديث المستخدم بنجاح', 'success');
      } else {
        await adminService.createUser(formData);
        showSnackbar('تم إنشاء المستخدم بنجاح', 'success');
      }
      const data = await adminService.getAdminUsers(userId);
      setUsers(data);
      setFilteredUsers(data);
      handleCloseDialog();
    } catch (err) {
      logger.error('Save user failed:', err);
      showSnackbar(err?.message || 'حدث خطأ في حفظ المستخدم', 'error');
    }
  };

  const handleDeleteUser = delId => {
    showConfirm({
      title: 'حذف المستخدم',
      message: 'هل تريد حذف هذا المستخدم؟',
      confirmText: 'حذف',
      confirmColor: 'error',
      onConfirm: async () => {
        try {
          await adminService.deleteUser(delId);
          showSnackbar('تم حذف المستخدم بنجاح', 'success');
          const data = await adminService.getAdminUsers(userId);
          setUsers(data);
          setFilteredUsers(data);
        } catch (err) {
          logger.error('Delete user failed:', err);
          showSnackbar('حدث خطأ في حذف المستخدم', 'error');
        }
      },
    });
  };

  // ── import / export ────────────────────────
  const handleImport = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async evt => {
      const raw = evt.target.result;
      let usersArr = [];
      if (file.name.endsWith('.csv')) {
        const rows = raw.split(/\r?\n/).filter(Boolean);
        const headers = rows[0].split(',').map(h => h.replace(/"/g, '').trim());
        usersArr = rows.slice(1).map(row => {
          const values = row.split(',');
          const obj = {};
          headers.forEach((h, i) => {
            obj[h] = values[i] ? values[i].replace(/"/g, '').trim() : '';
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
      setUsers(prev => [...prev, ...usersArr]);
      setFilteredUsers(prev => [...prev, ...usersArr]);
      showSnackbar('تم استيراد ' + usersArr.length + ' مستخدم بنجاح', 'success');
    };
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsArrayBuffer(file);
    }
    e.target.value = '';
  };

  const handleExport = async format => {
    try {
      const result = await exportService.exportData(filteredUsers, format, {
        columns: EXPORT_COLUMNS,
        filename: `users_${new Date().toISOString().slice(0, 10)}`,
        sheetName: 'Users',
        title: 'قائمة المستخدمين',
      });
      showSnackbar(result.message, 'info');
    } catch (err) {
      logger.error('Export failed:', err);
      showSnackbar('حدث خطأ أثناء التصدير', 'error');
    }
  };

  return {
    users,
    filteredUsers,
    page,
    rowsPerPage,
    searchTerm,
    roleFilter,
    statusFilter,
    viewMode,
    setViewMode,
    openDialog,
    editingUser,
    loading,
    error,
    confirmState,
    formData,
    setFormData,
    handleSearch,
    handleRoleFilter,
    handleStatusFilter,
    handleChangePage,
    handleChangeRowsPerPage,
    handleOpenDialog,
    handleCloseDialog,
    handleSaveUser,
    handleDeleteUser,
    handleImport,
    handleExport,
  };
}
