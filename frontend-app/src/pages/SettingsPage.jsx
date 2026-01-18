import { useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Grid,
  TextField,
  Button,
  Avatar,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import {
  Person,
  Security,
  Notifications,
  Language,
  Palette,
  Save,
  Upload,
  LockReset,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { toast } from 'react-toastify';

export default function SettingsPage() {
  const { user } = useAuthStore();
  const [tabValue, setTabValue] = useState(0);

  // Profile settings
  const [profile, setProfile] = useState({
    fullName: user?.fullName || 'مستخدم النظام',
    email: user?.email || 'user@example.com',
    phone: '+970-59-1234567',
    position: 'مدير النظام',
    department: 'تكنولوجيا المعلومات',
  });

  // Security settings
  const [security, setSecurity] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false,
    sessionTimeout: 30,
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    weeklyReport: true,
    monthlyReport: true,
    systemAlerts: true,
    securityAlerts: true,
  });

  // Appearance settings
  const [appearance, setAppearance] = useState({
    language: 'ar',
    theme: 'light',
    fontSize: 'medium',
    sidebarCollapsed: false,
  });

  const handleProfileSave = () => {
    toast.success('تم حفظ إعدادات الملف الشخصي');
  };

  const handleSecuritySave = () => {
    if (security.newPassword !== security.confirmPassword) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }
    toast.success('تم تحديث إعدادات الأمان');
    setSecurity({ ...security, currentPassword: '', newPassword: '', confirmPassword: '' });
  };

  const handleNotificationsSave = () => {
    toast.success('تم حفظ إعدادات الإشعارات');
  };

  const handleAppearanceSave = () => {
    toast.success('تم حفظ إعدادات المظهر');
  };

  return (
    <Container maxWidth="xl">
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        الإعدادات
      </Typography>

      <Paper sx={{ width: '100%' }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab icon={<Person />} label="الملف الشخصي" iconPosition="start" />
          <Tab icon={<Security />} label="الأمان" iconPosition="start" />
          <Tab icon={<Notifications />} label="الإشعارات" iconPosition="start" />
          <Tab icon={<Palette />} label="المظهر" iconPosition="start" />
        </Tabs>

        {/* Profile Tab */}
        {tabValue === 0 && (
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} display="flex" flexDirection="column" alignItems="center">
                <Avatar
                  sx={{ width: 120, height: 120, mb: 2, bgcolor: 'primary.main', fontSize: 48 }}
                >
                  {profile.fullName.charAt(0)}
                </Avatar>
                <Button variant="outlined" startIcon={<Upload />}>
                  تغيير الصورة
                </Button>
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="الاسم الكامل"
                  value={profile.fullName}
                  onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="البريد الإلكتروني"
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="رقم الهاتف"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="المنصب"
                  value={profile.position}
                  onChange={(e) => setProfile({ ...profile, position: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="القسم"
                  value={profile.department}
                  onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" startIcon={<Save />} onClick={handleProfileSave}>
                  حفظ التغييرات
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Security Tab */}
        {tabValue === 1 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              تغيير كلمة المرور
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="password"
                  label="كلمة المرور الحالية"
                  value={security.currentPassword}
                  onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="password"
                  label="كلمة المرور الجديدة"
                  value={security.newPassword}
                  onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  type="password"
                  label="تأكيد كلمة المرور"
                  value={security.confirmPassword}
                  onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 3 }} />

            <Typography variant="h6" gutterBottom fontWeight="bold">
              إعدادات الأمان المتقدمة
            </Typography>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="المصادقة الثنائية (2FA)"
                      secondary="إضافة طبقة أمان إضافية لحسابك"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={security.twoFactorEnabled}
                        onChange={(e) =>
                          setSecurity({ ...security, twoFactorEnabled: e.target.checked })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="مهلة الجلسة"
                      secondary="الوقت قبل تسجيل الخروج التلقائي (بالدقائق)"
                    />
                    <ListItemSecondaryAction>
                      <Select
                        value={security.sessionTimeout}
                        onChange={(e) =>
                          setSecurity({ ...security, sessionTimeout: e.target.value })
                        }
                        size="small"
                      >
                        <MenuItem value={15}>15 دقيقة</MenuItem>
                        <MenuItem value={30}>30 دقيقة</MenuItem>
                        <MenuItem value={60}>ساعة واحدة</MenuItem>
                        <MenuItem value={120}>ساعتان</MenuItem>
                      </Select>
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>

            <Alert severity="info" sx={{ mb: 2 }}>
              آخر تسجيل دخول: 16 يناير 2026 - 09:30 صباحاً من عنوان IP: 192.168.1.100
            </Alert>

            <Button variant="contained" startIcon={<LockReset />} onClick={handleSecuritySave}>
              حفظ إعدادات الأمان
            </Button>
          </Box>
        )}

        {/* Notifications Tab */}
        {tabValue === 2 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              تفضيلات الإشعارات
            </Typography>
            <Card>
              <CardContent>
                <List>
                  <ListItem>
                    <ListItemText
                      primary="الإشعارات عبر البريد الإلكتروني"
                      secondary="استلام الإشعارات على بريدك الإلكتروني"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={notifications.emailNotifications}
                        onChange={(e) =>
                          setNotifications({ ...notifications, emailNotifications: e.target.checked })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="الإشعارات الفورية"
                      secondary="إشعارات push على المتصفح"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={notifications.pushNotifications}
                        onChange={(e) =>
                          setNotifications({ ...notifications, pushNotifications: e.target.checked })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="الرسائل القصيرة (SMS)"
                      secondary="استلام تنبيهات مهمة عبر SMS"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={notifications.smsNotifications}
                        onChange={(e) =>
                          setNotifications({ ...notifications, smsNotifications: e.target.checked })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="التقرير الأسبوعي"
                      secondary="ملخص أسبوعي عن نشاط النظام"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={notifications.weeklyReport}
                        onChange={(e) =>
                          setNotifications({ ...notifications, weeklyReport: e.target.checked })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="التقرير الشهري"
                      secondary="تقرير شامل عن أداء النظام شهرياً"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={notifications.monthlyReport}
                        onChange={(e) =>
                          setNotifications({ ...notifications, monthlyReport: e.target.checked })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="تنبيهات النظام"
                      secondary="إشعارات عن تحديثات وصيانة النظام"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={notifications.systemAlerts}
                        onChange={(e) =>
                          setNotifications({ ...notifications, systemAlerts: e.target.checked })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                  <ListItem>
                    <ListItemText
                      primary="تنبيهات الأمان"
                      secondary="إشعارات فورية عن الأنشطة المشبوهة"
                    />
                    <ListItemSecondaryAction>
                      <Switch
                        checked={notifications.securityAlerts}
                        onChange={(e) =>
                          setNotifications({ ...notifications, securityAlerts: e.target.checked })
                        }
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                </List>
              </CardContent>
            </Card>
            <Box sx={{ mt: 3 }}>
              <Button variant="contained" startIcon={<Save />} onClick={handleNotificationsSave}>
                حفظ إعدادات الإشعارات
              </Button>
            </Box>
          </Box>
        )}

        {/* Appearance Tab */}
        {tabValue === 3 && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              تخصيص المظهر
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>اللغة</InputLabel>
                  <Select
                    value={appearance.language}
                    label="اللغة"
                    onChange={(e) => setAppearance({ ...appearance, language: e.target.value })}
                  >
                    <MenuItem value="ar">العربية</MenuItem>
                    <MenuItem value="en">English</MenuItem>
                    <MenuItem value="he">עברית</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>الوضع</InputLabel>
                  <Select
                    value={appearance.theme}
                    label="الوضع"
                    onChange={(e) => setAppearance({ ...appearance, theme: e.target.value })}
                  >
                    <MenuItem value="light">فاتح</MenuItem>
                    <MenuItem value="dark">داكن</MenuItem>
                    <MenuItem value="auto">تلقائي</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControl fullWidth>
                  <InputLabel>حجم الخط</InputLabel>
                  <Select
                    value={appearance.fontSize}
                    label="حجم الخط"
                    onChange={(e) => setAppearance({ ...appearance, fontSize: e.target.value })}
                  >
                    <MenuItem value="small">صغير</MenuItem>
                    <MenuItem value="medium">متوسط</MenuItem>
                    <MenuItem value="large">كبير</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={appearance.sidebarCollapsed}
                      onChange={(e) =>
                        setAppearance({ ...appearance, sidebarCollapsed: e.target.checked })
                      }
                    />
                  }
                  label="القائمة الجانبية مطوية بشكل افتراضي"
                />
              </Grid>
              <Grid item xs={12}>
                <Button variant="contained" startIcon={<Save />} onClick={handleAppearanceSave}>
                  حفظ إعدادات المظهر
                </Button>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
