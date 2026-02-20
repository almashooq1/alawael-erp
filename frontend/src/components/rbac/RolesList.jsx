import React, { useEffect, useState, useRef } from 'react';
import OrgBranchPermissionDialog from './OrgBranchPermissionDialog';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import { updateRole } from '../../store/slices/rbacSlice';
import { fetchPermissions } from '../../services/permissionsService';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Typography,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  TextField,
  IconButton,
} from '@mui/material';
import { CloudUpload, CloudDownload, Search } from '@mui/icons-material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { fetchRoles, deleteRole } from '../../store/slices/rbacSlice';
import { sendSmartRBACNotification } from '../../services/notificationsSmartService';
import { sendSecurityEmailAlert } from '../communications/EmailPanel';
import { sendSecuritySmsAlert } from '../communications/SmsPanel';
import { sendSecurityWhatsappAlert } from '../communications/WhatsappPanel';

const RolesList = () => {
  const dispatch = useDispatch();
  const { roles, loading, error } = useSelector((state) => state.rbac);
  const [permissions, setPermissions] = useState([]);
  const [search, setSearch] = useState('');
  const [filteredRoles, setFilteredRoles] = useState([]);
  const fileInputRef = useRef();
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedPerms, setSelectedPerms] = useState([]);
  const [orgBranchDialogOpen, setOrgBranchDialogOpen] = useState(false);
  const [orgBranchInitial, setOrgBranchInitial] = useState(null);

  useEffect(() => {
    dispatch(fetchRoles());
    fetchPermissions().then(setPermissions);
  }, [dispatch]);

  useEffect(() => {
    if (!search) {
      setFilteredRoles(roles);
    } else {
      setFilteredRoles(
        roles.filter(role =>
          role.name.toLowerCase().includes(search.toLowerCase()) ||
          (role.permissions || []).some(pid => {
            const perm = permissions.find(p => p.id === pid);
            return perm && perm.name.toLowerCase().includes(search.toLowerCase());
          })
        )
      );
    }
  }, [search, roles, permissions]);

  const handleDelete = (roleId) => {
    if (window.confirm('هل تريد حذف هذا الدور؟')) {
      dispatch(deleteRole(roleId));
    }
  };

  // Open dialog to assign permissions
  const handleEditPermissions = (role) => {
    setSelectedRole(role);
    setSelectedPerms(role.permissions || []);
    setAssignDialogOpen(true);
  };

  const handlePermToggle = (permId) => {
    setSelectedPerms(prev =>
      prev.includes(permId)
        ? prev.filter(id => id !== permId)
        : [...prev, permId]
    );
  };

  const handleAssignSave = () => {
    if (!selectedRole) return;
    dispatch(updateRole({ roleId: selectedRole.id, roleData: { ...selectedRole, permissions: selectedPerms } }));
    sendSmartRBACNotification({
      user: 'admin', // Replace with actual user context if available
      action: 'تغيير صلاحيات دور',
      details: `الدور: ${selectedRole.name}`
    });
    // Check if security email/SMS alerts are enabled (read from localStorage)
    const securityEmailEnabled = localStorage.getItem('securityEmailEnabled') !== '0';
    if (securityEmailEnabled) {
      const emailTemplate = localStorage.getItem('securityEmailTemplate') || 'تنبيه أمني: تم تغيير صلاحيات الدور: {role} بواسطة المدير.';
      sendSecurityEmailAlert({
        subject: 'تنبيه أمني: تغيير صلاحيات دور',
        body: emailTemplate.replace('{role}', selectedRole.name)
      });
    }
    const securitySmsEnabled = localStorage.getItem('securitySmsEnabled') !== '0';
    if (securitySmsEnabled) {
      const smsTemplate = localStorage.getItem('securitySmsTemplate') || 'تنبيه أمني: تم تغيير صلاحيات الدور: {role} بواسطة المدير.';
      sendSecuritySmsAlert({
        message: smsTemplate.replace('{role}', selectedRole.name)
      });
    }
    const securityWhatsappEnabled = localStorage.getItem('securityWhatsappEnabled') !== '0';
    if (securityWhatsappEnabled) {
      const whatsappTemplate = localStorage.getItem('securityWhatsappTemplate') || 'تنبيه واتساب: تم تغيير صلاحيات الدور: {role} بواسطة المدير.';
      sendSecurityWhatsappAlert({
        message: whatsappTemplate.replace('{role}', selectedRole.name)
      });
    }
    setAssignDialogOpen(false);
    setSelectedRole(null);
    setSelectedPerms([]);
  };

  const handleAssignCancel = () => {
    setAssignDialogOpen(false);
    setSelectedRole(null);
    setSelectedPerms([]);
  };

  // Open dialog for org/branch permission assignment
  const handleOrgBranchAssign = () => {
    setOrgBranchDialogOpen(false);
    setOrgBranchDialogOpen(true);
  };

  const handleOrgBranchSave = (data) => {
    alert('تم حفظ الصلاحيات للمؤسسة/الفرع (محاكاة): ' + JSON.stringify(data));
    setOrgBranchDialogOpen(false);
  };

  // Export RBAC settings as JSON
  const handleExport = () => {
    const data = JSON.stringify(roles, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rbac-roles.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import RBAC settings from JSON
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const importedRoles = JSON.parse(evt.target.result);
        alert('تم استيراد الأدوار بنجاح! (محاكاة)');
      } catch {
        alert('ملف غير صالح!');
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">قائمة الأدوار والصلاحيات</Typography>
        <Box display="flex" gap={1}>
          <TextField
            size="small"
            placeholder="بحث عن دور أو صلاحية..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{ startAdornment: <Search /> }}
            sx={{ minWidth: 220 }}
          />
          <Button variant="contained" color="primary" startIcon={<AddIcon />}>دور جديد</Button>
          <Button variant="outlined" color="success" startIcon={<CloudDownload />} onClick={() => handleExport()}>
            تصدير RBAC
          </Button>
          <Button variant="outlined" color="info" startIcon={<CloudUpload />} onClick={() => fileInputRef.current?.click()}>
            استيراد RBAC
          </Button>
          <Button variant="outlined" color="secondary" onClick={handleOrgBranchAssign}>
            تعيين صلاحيات مؤسسة/فرع
          </Button>
          <input type="file" accept=".json" ref={fileInputRef} style={{ display: 'none' }} onChange={handleImport} />
          <OrgBranchPermissionDialog open={orgBranchDialogOpen} onClose={() => setOrgBranchDialogOpen(false)} onSave={handleOrgBranchSave} initial={orgBranchInitial} />
        </Box>
      </Box>

      {error && <Typography color="error">{error}</Typography>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell>اسم الدور</TableCell>
              <TableCell>الوصف</TableCell>
              <TableCell>عدد الصلاحيات</TableCell>
              <TableCell>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(filteredRoles.length > 0 ? filteredRoles : roles).map((role) => (
              <TableRow key={role.id}>
                <TableCell>
                  <Chip label={role.name} variant="outlined" />
                </TableCell>
                <TableCell>{role.description}</TableCell>
                <TableCell>{role.permissions?.length || 0}</TableCell>
                <TableCell>
                  <Button size="small" startIcon={<EditIcon />} sx={{ mr: 1 }} onClick={() => handleEditPermissions(role)}>
                    تعديل الصلاحيات
                  </Button>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<DeleteIcon />}
                    onClick={() => handleDelete(role.id)}
                  >
                    حذف
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog for assigning permissions to a role */}
      <Dialog open={assignDialogOpen} onClose={handleAssignCancel} maxWidth="sm" fullWidth>
        <DialogTitle>تعيين الصلاحيات للدور: {selectedRole?.name}</DialogTitle>
        <DialogContent>
          <FormGroup>
            {permissions.map(perm => (
              <FormControlLabel
                key={perm.id}
                control={
                  <Checkbox
                    checked={selectedPerms.includes(perm.id)}
                    onChange={() => handlePermToggle(perm.id)}
                  />
                }
                label={perm.name + (perm.description ? ` - ${perm.description}` : '')}
              />
            ))}
          </FormGroup>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAssignCancel} color="primary" variant="outlined">إلغاء</Button>
          <Button onClick={handleAssignSave} color="success" variant="contained">حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RolesList;
