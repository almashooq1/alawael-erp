import React, { useEffect, useState } from 'react';
import { fetchOrganizations } from '../../services/organizationsService';
import { fetchBranches } from '../../services/branchesService';
import { TextField, Chip, MenuItem, Select, InputLabel, FormControl } from '@mui/material';
import { useDispatch, useSelector } from 'react-redux';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Box,
  Typography,
  CircularProgress,
  Dialog,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { fetchUsers, deleteUser, updateUser } from '../../store/slices/usersSlice';

const UsersList = () => {
  const dispatch = useDispatch();
  const { users, loading, error } = useSelector((state) => state.users);
  const [openDialog, setOpenDialog] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [branches, setBranches] = useState([]);

  useEffect(() => {
    dispatch(fetchUsers());
    fetchOrganizations().then(setOrganizations);
  }, [dispatch]);

  // Update branches when dialog opens or organization changes
  useEffect(() => {
    if (openDialog && editUser && editUser.organizationId) {
      fetchBranches(editUser.organizationId).then(setBranches);
    } else if (openDialog) {
      setBranches([]);
    }
  }, [openDialog, editUser && editUser.organizationId]);

  const handleDelete = (userId) => {
    if (window.confirm('هل تريد حذف هذا المستخدم؟')) {
      dispatch(deleteUser(userId));
    }
  };

  const handleEditClick = (user) => {
    setEditUser({ ...user });
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
    setEditUser(null);
  };

  const handleEditChange = (field, value) => {
    // If organization changes, reset branch
    if (field === 'organizationId') {
      setEditUser(prev => ({ ...prev, organizationId: value, branchId: '' }));
    } else {
      setEditUser(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleEditSave = () => {
    if (!editUser) return;
    // معالجة القيم النصية للأدوار والصلاحيات
    const roles = typeof editUser.roles === 'string' ? editUser.roles.split(',').map(r => r.trim()).filter(Boolean) : editUser.roles;
    const permissions = typeof editUser.permissions === 'string' ? editUser.permissions.split(',').map(p => p.trim()).filter(Boolean) : editUser.permissions;
    const userData = {
      ...editUser,
      roles,
      permissions,
    };
    // dispatch تحديث المستخدم
    dispatch(updateUser({ userId: editUser.id, userData })).then(() => {
      handleDialogClose();
      dispatch(fetchUsers());
    });
  };

  if (loading) {
    return <CircularProgress />;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">قائمة المستخدمين</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => setOpenDialog(true)}
        >
          مستخدم جديد
        </Button>
      </Box>

      {error && <Typography color="error">{error}</Typography>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>الاسم</TableCell>
              <TableCell>البريد الإلكتروني</TableCell>
              <TableCell>الحالة</TableCell>
              <TableCell>الدور</TableCell>
              <TableCell>المؤسسة</TableCell>
              <TableCell>الفرع</TableCell>
              <TableCell>الأدوار الإضافية</TableCell>
              <TableCell>الصلاحيات</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.name}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      color: user.isActive ? 'green' : 'red',
                      fontWeight: 'bold',
                    }}
                  >
                    {user.isActive ? 'نشط' : 'معطل'}
                  </Typography>
                </TableCell>
                <TableCell>{user.role}</TableCell>
                <TableCell>{user.organizationId || '-'}</TableCell>
                <TableCell>{user.branchId || '-'}</TableCell>
                <TableCell>
                  {(user.roles && user.roles.length > 0)
                    ? user.roles.map(r => <Chip key={r} label={r} size="small" sx={{ mr: 0.5 }}/>)
                    : <Typography variant="caption" color="textSecondary">-</Typography>}
                </TableCell>
                <TableCell>
                  {(user.permissions && user.permissions.length > 0)
                    ? user.permissions.map(p => <Chip key={p} label={p} size="small" color="info" sx={{ mr: 0.5 }}/>)
                    : <Typography variant="caption" color="textSecondary">-</Typography>}
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    startIcon={<EditIcon />}
                    sx={{ mr: 1 }}
                    onClick={() => handleEditClick(user)}
                  >
                    تعديل
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(user.id)}
                  >
                    حذف
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={!!openDialog} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <Box p={3} display="flex" flexDirection="column" gap={2}>
          <Typography variant="h6">تعديل بيانات المستخدم</Typography>
          {editUser && (
            <>
              <TextField label="الاسم" value={editUser.name} fullWidth margin="dense" disabled />
              <TextField label="البريد الإلكتروني" value={editUser.email} fullWidth margin="dense" disabled />
              <FormControl fullWidth margin="dense">
                <InputLabel>المؤسسة</InputLabel>
                <Select
                  value={editUser.organizationId || ''}
                  label="المؤسسة"
                  onChange={e => handleEditChange('organizationId', e.target.value)}
                >
                  <MenuItem value=""><em>اختر المؤسسة</em></MenuItem>
                  {organizations.map(org => (
                    <MenuItem key={org.id} value={org.id}>{org.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense" disabled={!editUser.organizationId}>
                <InputLabel>الفرع</InputLabel>
                <Select
                  value={editUser.branchId || ''}
                  label="الفرع"
                  onChange={e => handleEditChange('branchId', e.target.value)}
                >
                  <MenuItem value=""><em>اختر الفرع</em></MenuItem>
                  {branches.map(branch => (
                    <MenuItem key={branch.id} value={branch.id}>{branch.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth margin="dense">
                <InputLabel>الدور الأساسي</InputLabel>
                <Select value={editUser.role || ''} label="الدور الأساسي" onChange={e => handleEditChange('role', e.target.value)}>
                  <MenuItem value="admin">مدير</MenuItem>
                  <MenuItem value="manager">مدير فرع</MenuItem>
                  <MenuItem value="user">مستخدم</MenuItem>
                  <MenuItem value="viewer">مشاهد</MenuItem>
                </Select>
              </FormControl>
              <TextField label="الأدوار الإضافية (مفصولة بفاصلة)" value={Array.isArray(editUser.roles) ? editUser.roles.join(',') : (editUser.roles || '')} fullWidth margin="dense" onChange={e => handleEditChange('roles', e.target.value)} />
              <TextField label="الصلاحيات (مفصولة بفاصلة)" value={Array.isArray(editUser.permissions) ? editUser.permissions.join(',') : (editUser.permissions || '')} fullWidth margin="dense" onChange={e => handleEditChange('permissions', e.target.value)} />
            </>
          )}
          <Box display="flex" justifyContent="flex-end" gap={1}>
            <Button onClick={handleDialogClose} color="primary" variant="outlined">
              إغلاق
            </Button>
            <Button onClick={handleEditSave} color="success" variant="contained" disabled={!editUser}>
              حفظ
            </Button>
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
};

export default UsersList;
