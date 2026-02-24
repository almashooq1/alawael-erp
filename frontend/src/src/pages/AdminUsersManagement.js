import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Tooltip,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  LinearProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  Group as GroupIcon,
  ViewWeek as ViewWeekIcon,
  ViewAgenda as ViewAgendaIcon,
} from '@mui/icons-material';

import FileDownloadIcon from '@mui/icons-material/FileDownload';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import exportService from '../utils/exportService';
import { adminService } from '../services/adminService';
import * as XLSX from 'xlsx';

const AdminUsersManagement = () => {
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

  React.useEffect(() => {
    const fetchUsers = async () => {
      const data = await adminService.getAdminUsers('admin001');
      setUsers(data);
      setFilteredUsers(data);
      setLoading(false);
    };
    fetchUsers();
  }, []);

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

    if (role !== 'all') {
      filtered = filtered.filter(user => user.role === role);
    }

    if (status !== 'all') {
      filtered = filtered.filter(user => user.status === status);
    }

    setFilteredUsers(filtered);
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = event => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleOpenDialog = (user = null) => {
    setEditingUser(user);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingUser(null);
  };

  const handleSaveUser = () => {
    // Handle save logic
    handleCloseDialog();
  };

  const handleDeleteUser = userId => {
    if (window.confirm('هل تريد حذف هذا المستخدم؟')) {
      setUsers(users.filter(u => u.id !== userId));
      filterUsers(searchTerm, roleFilter, statusFilter);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

  // أعمدة التصدير
  // استيراد المستخدمين من ملف Excel/CSV
  const handleImport = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const data = evt.target.result;
      let usersArr = [];
      if (file.name.endsWith('.csv')) {
        // CSV
        const rows = data.split(/\r?\n/).filter(Boolean);
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
        // Excel
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        usersArr = XLSX.utils.sheet_to_json(sheet);
      }
      // دمج مع المستخدمين الحاليين (أو استبدال حسب الحاجة)
      setUsers(prev => [...prev, ...usersArr]);
      setFilteredUsers(prev => [...prev, ...usersArr]);
      alert('تم استيراد ' + usersArr.length + ' مستخدم بنجاح');
    };
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
    e.target.value = '';
  };

  const exportColumns = [
    { key: 'name', label: 'الاسم', width: 20 },
    { key: 'email', label: 'البريد الإلكتروني', width: 25 },
    { key: 'phone', label: 'الهاتف', width: 15 },
    { key: 'role', label: 'الدور', width: 10 },
    { key: 'status', label: 'الحالة', width: 10 },
    { key: 'createdAt', label: 'تاريخ الإنشاء', width: 15 },
  ];

  const handleExport = async format => {
    const result = await exportService.exportData(filteredUsers, format, {
      columns: exportColumns,
      filename: `users_${new Date().toISOString().slice(0, 10)}`,
      sheetName: 'Users',
      title: 'قائمة المستخدمين',
    });
    alert(result.message);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <GroupIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                إدارة المستخدمين
              </Typography>
              <Typography variant="body2">إدارة جميع المستخدمين في النظام</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              color="info"
              size="small"
              startIcon={<FileDownloadIcon />}
              onClick={() => handleExport('excel')}
            >
              تصدير Excel
            </Button>
            <Button
              variant="outlined"
              color="info"
              size="small"
              startIcon={<FileDownloadIcon />}
              onClick={() => handleExport('csv')}
            >
              تصدير CSV
            </Button>
            <Button
              variant="outlined"
              color="success"
              size="small"
              component="label"
              startIcon={<UploadFileIcon />}
            >
              استيراد
              <input type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleImport} />
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleOpenDialog()}
              sx={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white' }}
            >
              إضافة مستخدم
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                إجمالي المستخدمين
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {users.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                المستخدمون النشطون
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {users.filter(u => u.status === 'نشط').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                المعالجون
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {users.filter(u => u.role === 'معالج').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
              color: 'white',
            }}
          >
            <CardContent>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                الآباء
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
                {users.filter(u => u.role === 'ولي أمر').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                placeholder="البحث عن مستخدم..."
                value={searchTerm}
                onChange={handleSearch}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <VisibilityIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>الدور</InputLabel>
                <Select value={roleFilter} label="الدور" onChange={handleRoleFilter}>
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="إدارة">إدارة</MenuItem>
                  <MenuItem value="معالج">معالج</MenuItem>
                  <MenuItem value="ولي أمر">ولي أمر</MenuItem>
                  <MenuItem value="طالب">طالب</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>الحالة</InputLabel>
                <Select value={statusFilter} label="الحالة" onChange={handleStatusFilter}>
                  <MenuItem value="all">الكل</MenuItem>
                  <MenuItem value="نشط">نشط</MenuItem>
                  <MenuItem value="معطل">معطل</MenuItem>
                  <MenuItem value="قيد الانتظار">قيد الانتظار</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={2}>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, newMode) => setViewMode(newMode)}
                fullWidth
                size="small"
              >
                <ToggleButton value="table">
                  <ViewWeekIcon fontSize="small" />
                </ToggleButton>
                <ToggleButton value="grid">
                  <ViewAgendaIcon fontSize="small" />
                </ToggleButton>
              </ToggleButtonGroup>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader title={`المستخدمون (${filteredUsers.length})`} />
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>الاسم</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>البريد الإلكتروني</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الهاتف</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الدور</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>تاريخ الإنشاء</TableCell>
                <TableCell sx={{ fontWeight: 'bold', textAlign: 'center' }}>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map(user => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            backgroundColor: '#667eea',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: 12,
                            fontWeight: 'bold',
                          }}
                        >
                          {user.name.charAt(0)}
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {user.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.email}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{user.phone}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={user.role} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={user.status}
                        color={user.status === 'نشط' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{user.createdDate}</Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="تعديل">
                        <IconButton size="small" onClick={() => handleOpenDialog(user)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" onClick={() => handleDeleteUser(user.id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="صفوف لكل صفحة:"
        />
      </Card>

      {/* Edit/Add User Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingUser ? 'تعديل المستخدم' : 'إضافة مستخدم جديد'}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="الاسم الكامل"
              defaultValue={editingUser?.name || ''}
              size="small"
            />
            <TextField
              fullWidth
              label="البريد الإلكتروني"
              type="email"
              defaultValue={editingUser?.email || ''}
              size="small"
            />
            <TextField
              fullWidth
              label="الهاتف"
              defaultValue={editingUser?.phone || ''}
              size="small"
            />
            <FormControl fullWidth size="small">
              <InputLabel>الدور</InputLabel>
              <Select label="الدور" defaultValue={editingUser?.role || 'طالب'}>
                <MenuItem value="إدارة">إدارة</MenuItem>
                <MenuItem value="معالج">معالج</MenuItem>
                <MenuItem value="ولي أمر">ولي أمر</MenuItem>
                <MenuItem value="طالب">طالب</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth size="small">
              <InputLabel>الحالة</InputLabel>
              <Select label="الحالة" defaultValue={editingUser?.status || 'قيد الانتظار'}>
                <MenuItem value="نشط">نشط</MenuItem>
                <MenuItem value="معطل">معطل</MenuItem>
                <MenuItem value="قيد الانتظار">قيد الانتظار</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>إلغاء</Button>
          <Button variant="contained" onClick={handleSaveUser}>
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminUsersManagement;
