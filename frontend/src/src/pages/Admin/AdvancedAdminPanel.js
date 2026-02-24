import React, { useState } from 'react';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Switch,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  LinearProgress,
  Paper,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Save as SaveIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Add as AddIcon,
  Block as BlockIcon,
  CheckCircle as ActiveIcon,
  Warning as WarningIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [settingsChanged, setSettingsChanged] = useState(false);

  // Sample data
  const users = [
    {
      id: 1,
      name: 'أحمد محمد',
      email: 'ahmed@example.com',
      role: 'admin',
      status: 'active',
      lastLogin: '2026-01-19 10:30',
    },
    {
      id: 2,
      name: 'فاطمة علي',
      email: 'fatima@example.com',
      role: 'manager',
      status: 'active',
      lastLogin: '2026-01-19 09:15',
    },
    {
      id: 3,
      name: 'محمد علي',
      email: 'muhammed@example.com',
      role: 'therapist',
      status: 'inactive',
      lastLogin: '2026-01-18 14:45',
    },
    {
      id: 4,
      name: 'سارة حسن',
      email: 'sarah@example.com',
      role: 'case_manager',
      status: 'active',
      lastLogin: '2026-01-19 08:20',
    },
  ];

  const systemSettings = {
    security: {
      twoFactorAuth: true,
      sessionTimeout: 30,
      passwordExpiry: 90,
      enforceStrongPassword: true,
    },
    notifications: {
      emailNotifications: true,
      smsNotifications: false,
      pushNotifications: true,
      dailyReport: true,
    },
    performance: {
      cachingEnabled: true,
      compressionEnabled: true,
      apiRateLimit: 1000,
      databaseOptimization: true,
    },
    backup: {
      autoBackup: true,
      backupFrequency: 'daily',
      retentionDays: 30,
      encryptBackup: true,
    },
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleEditUser = user => {
    setSelectedUser(user);
    setEditDialogOpen(true);
  };

  const handleDeleteUser = userId => {
    alert(`حذف المستخدم ${userId}`);
  };

  const handleBlockUser = userId => {
    alert(`حظر المستخدم ${userId}`);
  };

  const handleSaveSettings = () => {
    alert('تم حفظ الإعدادات بنجاح');
    setSettingsChanged(false);
  };

  const getRoleColor = role => {
    const roleColors = {
      admin: 'error',
      manager: 'warning',
      therapist: 'info',
      case_manager: 'success',
    };
    return roleColors[role] || 'default';
  };

  const getRoleLabel = role => {
    const roleLabels = {
      admin: 'مدير النظام',
      manager: 'مدير',
      therapist: 'معالج',
      case_manager: 'مدير حالات',
    };
    return roleLabels[role] || role;
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 'bold' }}>
        ⚙️ لوحة التحكم الإدارية
      </Typography>

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        sx={{ mb: 3, borderBottom: '1px solid #e0e0e0' }}
      >
        <Tab label="إدارة المستخدمين" />
        <Tab label="الأمان" />
        <Tab label="الإخطارات" />
        <Tab label="الأداء" />
        <Tab label="النسخ الاحتياطية" />
      </Tabs>

      {/* Users Management */}
      {activeTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h6">المستخدمون النشطون</Typography>
            <Button variant="contained" color="primary" startIcon={<AddIcon />}>
              إضافة مستخدم جديد
            </Button>
          </Box>

          <TableContainer component={Paper}>
            <Table>
              <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>
                    <strong>الاسم</strong>
                  </TableCell>
                  <TableCell>
                    <strong>البريد الإلكتروني</strong>
                  </TableCell>
                  <TableCell>
                    <strong>الدور</strong>
                  </TableCell>
                  <TableCell>
                    <strong>الحالة</strong>
                  </TableCell>
                  <TableCell>
                    <strong>آخر دخول</strong>
                  </TableCell>
                  <TableCell>
                    <strong>الإجراءات</strong>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map(user => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Chip
                        label={getRoleLabel(user.role)}
                        color={getRoleColor(user.role)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={user.status === 'active' ? <ActiveIcon /> : <WarningIcon />}
                        label={user.status === 'active' ? 'نشط' : 'غير نشط'}
                        color={user.status === 'active' ? 'success' : 'default'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{user.lastLogin}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleEditUser(user)}
                        color="primary"
                        title="تعديل"
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleBlockUser(user.id)}
                        color="warning"
                        title="حظر"
                      >
                        <BlockIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteUser(user.id)}
                        color="error"
                        title="حذف"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Security Settings */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="🔒 إعدادات الأمان" subheader="تحكم بمستويات الأمان للنظام" />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        المصادقة الثنائية
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        تفعيل/تعطيل المصادقة الثنائية
                      </Typography>
                    </Box>
                    <Switch defaultChecked onChange={() => setSettingsChanged(true)} />
                  </Box>

                  <Divider />

                  <Box
                    sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                        فرض كلمات مرور قوية
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        الحد الأدنى: 8 أحرف، رموز، أرقام
                      </Typography>
                    </Box>
                    <Switch defaultChecked onChange={() => setSettingsChanged(true)} />
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      انتهاء صلاحية كلمة المرور (بالأيام)
                    </Typography>
                    <TextField
                      type="number"
                      value={90}
                      fullWidth
                      size="small"
                      onChange={() => setSettingsChanged(true)}
                    />
                  </Box>

                  <Divider />

                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                      مهلة الجلسة (بالدقائق)
                    </Typography>
                    <TextField
                      type="number"
                      value={30}
                      fullWidth
                      size="small"
                      onChange={() => setSettingsChanged(true)}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="📊 سجلات الأمان" />
              <CardContent>
                <Alert severity="info" sx={{ mb: 2 }}>
                  آخر فحص أمان: 2026-01-19 10:30
                </Alert>
                <Typography variant="body2" sx={{ mb: 2 }}>
                  <strong>✅ لم يتم اكتشاف تهديدات</strong>
                </Typography>
                <Button variant="outlined" fullWidth sx={{ mb: 2 }}>
                  عرض السجلات الكاملة
                </Button>
                <Button variant="contained" color="warning" fullWidth>
                  فحص الأمان الآن
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Notifications Settings */}
      {activeTab === 2 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="🔔 قنوات الإشعارات" />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    { label: 'إشعارات البريد الإلكتروني', key: 'email' },
                    { label: 'إشعارات SMS', key: 'sms' },
                    { label: 'إشعارات Push', key: 'push' },
                    { label: 'التقرير اليومي', key: 'daily' },
                  ].map(item => (
                    <Box
                      key={item.key}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px',
                        backgroundColor: '#f5f5f5',
                        borderRadius: '8px',
                      }}
                    >
                      <Typography variant="body2">{item.label}</Typography>
                      <Switch onChange={() => setSettingsChanged(true)} />
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="⏰ جدول الإشعارات" />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      وقت البدء
                    </Typography>
                    <TextField type="time" value="08:00" fullWidth size="small" />
                  </Box>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                      وقت النهاية
                    </Typography>
                    <TextField type="time" value="18:00" fullWidth size="small" />
                  </Box>
                  <Button variant="outlined" fullWidth>
                    حفظ الإعدادات
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Performance Settings */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardHeader title="⚡ إعدادات الأداء" />
              <CardContent>
                <Grid container spacing={2}>
                  {[
                    { label: 'تفعيل Caching', icon: '💾', enabled: true },
                    { label: 'ضغط البيانات', icon: '📦', enabled: true },
                    { label: 'تحسين قاعدة البيانات', icon: '🗄️', enabled: true },
                    { label: 'CDN مفعل', icon: '🌐', enabled: false },
                  ].map((item, index) => (
                    <Grid item xs={12} sm={6} md={3} key={index}>
                      <Paper
                        sx={{
                          padding: '16px',
                          textAlign: 'center',
                          backgroundColor: item.enabled ? '#e8f5e9' : '#f5f5f5',
                          cursor: 'pointer',
                          '&:hover': {
                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          },
                        }}
                      >
                        <Typography sx={{ fontSize: '32px', mb: 1 }}>{item.icon}</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                          {item.label}
                        </Typography>
                        <Chip
                          label={item.enabled ? 'مفعل' : 'معطل'}
                          color={item.enabled ? 'success' : 'default'}
                          size="small"
                          sx={{ mt: 1 }}
                        />
                      </Paper>
                    </Grid>
                  ))}
                </Grid>

                <Divider sx={{ my: 3 }} />

                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 2 }}>
                    حد معدل API (طلب/ساعة)
                  </Typography>
                  <TextField
                    type="number"
                    value={1000}
                    fullWidth
                    size="small"
                    onChange={() => setSettingsChanged(true)}
                  />
                </Box>

                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    استخدام المموري: 45% من 16GB
                  </Typography>
                  <LinearProgress variant="determinate" value={45} sx={{ mb: 2 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Backup Settings */}
      {activeTab === 4 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="💾 سياسة النسخ الاحتياطية" />
              <CardContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>النسخ الاحتياطي التلقائي</Typography>
                    <Switch defaultChecked onChange={() => setSettingsChanged(true)} />
                  </Box>

                  <Box>
                    <Typography sx={{ fontWeight: 'bold', mb: 1 }}>
                      تكرار النسخة الاحتياطية
                    </Typography>
                    <FormControl fullWidth size="small">
                      <Select defaultValue="daily">
                        <MenuItem value="hourly">كل ساعة</MenuItem>
                        <MenuItem value="daily">يومي</MenuItem>
                        <MenuItem value="weekly">أسبوعي</MenuItem>
                        <MenuItem value="monthly">شهري</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>

                  <Box>
                    <Typography sx={{ fontWeight: 'bold', mb: 1 }}>
                      فترة الاحتفاظ (بالأيام)
                    </Typography>
                    <TextField value={30} fullWidth size="small" type="number" />
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography>تشفير النسخة الاحتياطية</Typography>
                    <Switch defaultChecked onChange={() => setSettingsChanged(true)} />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="📋 سجل النسخ الاحتياطية" />
              <CardContent>
                {[
                  { date: '2026-01-19', time: '02:00', size: '2.4 GB', status: 'نجح' },
                  { date: '2026-01-18', time: '02:00', size: '2.3 GB', status: 'نجح' },
                  { date: '2026-01-17', time: '02:00', size: '2.2 GB', status: 'نجح' },
                ].map((backup, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      borderBottom: '1px solid #e0e0e0',
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {backup.date} - {backup.time}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {backup.size}
                      </Typography>
                    </Box>
                    <Chip label={backup.status} color="success" size="small" />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Save Button */}
      {settingsChanged && (
        <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button variant="outlined">إلغاء</Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
          >
            حفظ التغييرات
          </Button>
        </Box>
      )}

      {/* Edit User Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تعديل بيانات المستخدم</DialogTitle>
        <DialogContent>
          {selectedUser && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
              <TextField label="الاسم" value={selectedUser.name} fullWidth />
              <TextField label="البريد الإلكتروني" value={selectedUser.email} fullWidth />
              <FormControl fullWidth>
                <InputLabel>الدور</InputLabel>
                <Select value={selectedUser.role}>
                  <MenuItem value="admin">مدير النظام</MenuItem>
                  <MenuItem value="manager">مدير</MenuItem>
                  <MenuItem value="therapist">معالج</MenuItem>
                  <MenuItem value="case_manager">مدير حالات</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>إلغاء</Button>
          <Button
            onClick={() => setEditDialogOpen(false)}
            variant="contained"
            startIcon={<SaveIcon />}
          >
            حفظ
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminPanel;
