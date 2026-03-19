/**
 * Security & Monitoring System - Access Control & Logging 🔐
 * نظام الأمان والمراقبة - التحكم بالوصول والتسجيل
 *
 * Features:
 * ✅ User authentication & authorization
 * ✅ Role-based access control (RBAC)
 * ✅ Activity logging
 * ✅ Security audit trail
 * ✅ Permission management
 * ✅ User sessions
 * ✅ Two-factor authentication setup
 * ✅ IP whitelisting
 * ✅ API key management
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Avatar,
  Divider,
  Alert,
  Tooltip,
  Switch,
  Tabs,
  Tab,
  LinearProgress,
} from '@mui/material';
import {
  Lock as LockIcon,
  Visibility as VisibilityIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

const SecurityMonitoring = () => {
  const [tabValue, setTabValue] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogType, setDialogType] = useState('addUser');

  const [users, _setUsers] = useState([
    {
      id: '1',
      name: 'محمد علي',
      email: 'mohammadali@example.com',
      role: 'admin',
      status: 'active',
      lastLogin: '2026-01-16 14:30',
      mfa: true,
      sessions: 2,
    },
    {
      id: '2',
      name: 'فاطمة محمود',
      email: 'fatima.mahmoud@example.com',
      role: 'manager',
      status: 'active',
      lastLogin: '2026-01-16 13:15',
      mfa: true,
      sessions: 1,
    },
    {
      id: '3',
      name: 'أحمد حسن',
      email: 'ahmad.hasan@example.com',
      role: 'user',
      status: 'active',
      lastLogin: '2026-01-16 12:00',
      mfa: false,
      sessions: 1,
    },
    {
      id: '4',
      name: 'سارة محمد',
      email: 'sarah.mohammad@example.com',
      role: 'user',
      status: 'inactive',
      lastLogin: '2026-01-10 10:30',
      mfa: false,
      sessions: 0,
    },
  ]);

  const [apiKeys, _setApiKeys] = useState([
    { id: '1', name: 'Production API', key: 'sk_prod_1234567890abcdef', created: '2025-12-01', lastUsed: '2026-01-16', status: 'active' },
    { id: '2', name: 'Development API', key: 'sk_dev_abcdefghijklmnop', created: '2025-11-15', lastUsed: '2026-01-15', status: 'active' },
    { id: '3', name: 'Testing API', key: 'sk_test_zyxwvutsrqponmlk', created: '2025-10-01', lastUsed: '2026-01-10', status: 'inactive' },
  ]);

  const [activityLog, _setActivityLog] = useState([
    { id: '1', user: 'محمد علي', action: 'تسجيل دخول', timestamp: '2026-01-16 14:30', ip: '192.168.1.100', status: 'success', risk: 'low' },
    {
      id: '2',
      user: 'فاطمة محمود',
      action: 'تعديل إعدادات المستخدم',
      timestamp: '2026-01-16 13:45',
      ip: '192.168.1.101',
      status: 'success',
      risk: 'medium',
    },
    {
      id: '3',
      user: 'أحمد حسن',
      action: 'محاولة وصول غير مصرح',
      timestamp: '2026-01-16 12:30',
      ip: '192.168.1.102',
      status: 'failed',
      risk: 'high',
    },
    {
      id: '4',
      user: 'سارة محمد',
      action: 'تنزيل البيانات',
      timestamp: '2026-01-16 11:15',
      ip: '192.168.1.103',
      status: 'success',
      risk: 'low',
    },
  ]);

  const _permissions = {
    admin: ['view_all', 'edit_all', 'delete_all', 'manage_users', 'view_logs', 'manage_settings'],
    manager: ['view_all', 'edit_team', 'view_logs', 'view_reports'],
    user: ['view_own', 'edit_own', 'view_reports'],
  };

  const rolesList = [
    { id: 'admin', name: 'مسؤول النظام', icon: '👑', color: '#ff6b6b', permissions: 6, description: 'وصول كامل للنظام' },
    { id: 'manager', name: 'مدير الفريق', icon: '👔', color: '#4ecdc4', permissions: 4, description: 'إدارة فريق والتقارير' },
    { id: 'user', name: 'مستخدم عادي', icon: '👤', color: '#95e1d3', permissions: 3, description: 'وصول محدود للبيانات الشخصية' },
  ];

  const stats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    mfaEnabled: users.filter(u => u.mfa).length,
    activeSessions: users.reduce((sum, u) => sum + u.sessions, 0),
  };

  const handleAddUser = useCallback(() => {
    setDialogType('addUser');
    setOpenDialog(true);
  }, []);

  const handleAddAPIKey = useCallback(() => {
    setDialogType('addAPIKey');
    setOpenDialog(true);
  }, []);

  const getRoleColor = role => {
    const colors = { admin: 'error', manager: 'warning', user: 'info' };
    return colors[role] || 'default';
  };

  const getStatusColor = status => {
    return status === 'active' ? 'success' : 'default';
  };

  const getRiskColor = risk => {
    const colors = { low: '#4caf50', medium: '#ff9800', high: '#f44336' };
    return colors[risk] || '#666';
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'إجمالي المستخدمين', value: stats.totalUsers, icon: '👥', color: '#667eea' },
          { label: 'المستخدمون النشطون', value: stats.activeUsers, icon: '🟢', color: '#4caf50' },
          { label: 'MFA مفعل', value: stats.mfaEnabled, icon: '🔐', color: '#ff9800' },
          { label: 'جلسات نشطة', value: stats.activeSessions, icon: '⏱️', color: '#2196f3' },
        ].map((stat, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper
              sx={{
                p: 2.5,
                borderRadius: 2,
                background: `linear-gradient(135deg, ${stat.color}20, ${stat.color}05)`,
                border: `2px solid ${stat.color}30`,
              }}
            >
              <Typography variant="h3" sx={{ mb: 0.5 }}>
                {stat.icon}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {stat.label}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, val) => setTabValue(val)}>
          <Tab label="👥 المستخدمون والأدوار" />
          <Tab label="🔑 مفاتيح API" />
          <Tab label="📋 سجل الأنشطة" />
          <Tab label="⚙️ الإعدادات الأمنية" />
        </Tabs>
      </Paper>

      {/* Tab 0: Users & Roles */}
      {tabValue === 0 && (
        <Stack spacing={3}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddUser}
              sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              مستخدم جديد
            </Button>
          </Box>

          {/* Roles Overview */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              📋 نظرة عامة على الأدوار
            </Typography>
            <Grid container spacing={2}>
              {rolesList.map(role => (
                <Grid item xs={12} sm={6} md={4} key={role.id}>
                  <Card sx={{ borderRadius: 2, borderTop: `4px solid ${role.color}` }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h3">{role.icon}</Typography>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                            {role.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {role.permissions} صلاحيات
                          </Typography>
                        </Box>
                      </Box>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        {role.description}
                      </Typography>
                      <LinearProgress
                        variant="determinate"
                        value={(role.permissions / 6) * 100}
                        sx={{ mb: 1, height: 4, borderRadius: 2 }}
                      />
                      <Button size="small" variant="outlined" fullWidth sx={{ borderRadius: 2 }}>
                        تعديل الصلاحيات
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* Users Table */}
          <Box>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
              👥 المستخدمون
            </Typography>
            <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ backgroundColor: '#667eea' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الاسم</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>البريد</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الدور</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحالة</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>آخر دخول</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>MFA</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">
                      الإجراءات
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id} sx={{ '&:hover': { backgroundColor: '#f8f9ff' } }}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', width: 32, height: 32 }}>
                            {user.name.charAt(0)}
                          </Avatar>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {user.name}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip label={user.role} size="small" color={getRoleColor(user.role)} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={user.status === 'active' ? 'نشط' : 'خامل'}
                          size="small"
                          color={getStatusColor(user.status)}
                          icon={user.status === 'active' ? <CheckIcon /> : <CloseIcon />}
                        />
                      </TableCell>
                      <TableCell>{user.lastLogin}</TableCell>
                      <TableCell>
                        <Chip
                          label={user.mfa ? '✓ مفعل' : '✗ معطل'}
                          size="small"
                          color={user.mfa ? 'success' : 'default'}
                          icon={user.mfa ? <LockIcon /> : <VisibilityIcon />}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="تحرير">
                          <IconButton size="small" color="primary">
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف">
                          <IconButton size="small" color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        </Stack>
      )}

      {/* Tab 1: API Keys */}
      {tabValue === 1 && (
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              🔑 مفاتيح API
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleAddAPIKey}
              sx={{ borderRadius: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              مفتاح جديد
            </Button>
          </Box>

          {apiKeys.map(key => (
            <Card key={key.id} sx={{ borderRadius: 2 }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {key.name}
                    </Typography>
                    <Typography variant="caption" color="textSecondary" sx={{ fontFamily: 'monospace', display: 'block', mt: 0.5 }}>
                      {key.key}
                    </Typography>
                  </Box>
                  <Chip label={key.status === 'active' ? 'نشط' : 'معطل'} color={key.status === 'active' ? 'success' : 'default'} />
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="caption" color="textSecondary">
                    📅 تاريخ الإنشاء: {key.created}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    ⏰ آخر استخدام: {key.lastUsed}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button size="small" variant="outlined">
                    نسخ المفتاح
                  </Button>
                  <Button size="small" variant="outlined" color="warning">
                    إعادة تعيين
                  </Button>
                  <Button size="small" variant="outlined" color="error">
                    حذف
                  </Button>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}

      {/* Tab 2: Activity Log */}
      {tabValue === 2 && (
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            📋 سجل الأنشطة
          </Typography>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table>
              <TableHead sx={{ backgroundColor: '#667eea' }}>
                <TableRow>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>المستخدم</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الإجراء</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الوقت</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>عنوان IP</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>الحالة</TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>المخاطر</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {activityLog.map(log => (
                  <TableRow key={log.id} sx={{ '&:hover': { backgroundColor: '#f8f9ff' } }}>
                    <TableCell>{log.user}</TableCell>
                    <TableCell>{log.action}</TableCell>
                    <TableCell>{log.timestamp}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace' }}>{log.ip}</TableCell>
                    <TableCell>
                      <Chip
                        label={log.status === 'success' ? 'نجح' : 'فشل'}
                        size="small"
                        color={log.status === 'success' ? 'success' : 'error'}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.risk}
                        size="small"
                        sx={{ backgroundColor: getRiskColor(log.risk) + '20', color: getRiskColor(log.risk), fontWeight: 600 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      )}

      {/* Tab 3: Security Settings */}
      {tabValue === 3 && (
        <Stack spacing={2}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            ⚙️ الإعدادات الأمنية
          </Typography>

          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Stack spacing={2}>
                {[
                  { label: 'المصادقة الثنائية (MFA)', description: 'طلب رمز إضافي عند تسجيل الدخول', enabled: true },
                  { label: 'تصفية عنوان IP', description: 'السماح فقط بـ IP معينة', enabled: false },
                  { label: 'التشفير من طرف إلى طرف', description: 'تشفير جميع البيانات المحساسة', enabled: true },
                  { label: 'سجل الأنشطة المفصل', description: 'تسجيل جميع العمليات الأمنية', enabled: true },
                  { label: 'تنبيهات الأمان', description: 'إرسال إشعارات عند محاولات مريبة', enabled: true },
                  { label: 'انتهاء الجلسة تلقائي', description: 'تسجيل الخروج بعد 30 دقيقة من عدم النشاط', enabled: true },
                ].map((setting, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      backgroundColor: '#f8f9ff',
                      borderRadius: 2,
                    }}
                  >
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                        {setting.label}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {setting.description}
                      </Typography>
                    </Box>
                    <Switch checked={setting.enabled} />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>

          <Alert severity="info" sx={{ borderRadius: 2 }}>
            💡 <strong>نصيحة:</strong> تفعيل المصادقة الثنائية (MFA) يحسن أمان حسابك بشكل كبير.
          </Alert>
        </Stack>
      )}

      {/* Dialogs */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
          {dialogType === 'addUser' ? 'مستخدم جديد' : 'مفتاح API جديد'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            {dialogType === 'addUser' ? (
              <>
                <TextField label="الاسم الكامل" fullWidth required />
                <TextField label="البريد الإلكتروني" type="email" fullWidth required />
                <FormControl fullWidth>
                  <InputLabel>الدور</InputLabel>
                  <Select label="الدور">
                    {['admin', 'manager', 'user'].map(role => (
                      <MenuItem key={role} value={role}>
                        {role}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl fullWidth>
                  <InputLabel>الحالة</InputLabel>
                  <Select label="الحالة">
                    {['active', 'inactive'].map(status => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            ) : (
              <>
                <TextField label="اسم المفتاح" fullWidth required placeholder="مثل: Production API" />
                <FormControl fullWidth>
                  <InputLabel>النوع</InputLabel>
                  <Select label="النوع">
                    {['production', 'development', 'testing'].map(type => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>إلغاء</Button>
          <Button variant="contained">إنشاء</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecurityMonitoring;
