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
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  ExpandMore as ExpandMoreIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Language as LanguageIcon,
  Palette as PaletteIcon,
} from '@mui/icons-material';
import { adminService } from '../services/adminService';

const AdminSystemSettings = () => {
  const [settings, setSettings] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchSettings = async () => {
      const data = await adminService.getAdminSettings('admin001');
      setSettings(data);
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSettingChange = (path, value) => {
    setSettings(prev => {
      const newSettings = { ...prev };
      const keys = path.split('.');
      let obj = newSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
      }
      obj[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const handleSaveSettings = async () => {
    // Handle save logic
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress />
      </Container>
    );
  }

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
            <SettingsIcon sx={{ fontSize: 40, mr: 2 }} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 'bold' }}>
                إعدادات النظام
              </Typography>
              <Typography variant="body2">إدارة إعدادات النظام والتكوينات</Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSaveSettings}
            sx={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white' }}
          >
            حفظ الإعدادات
          </Button>
        </Box>
      </Box>

      {/* Success Message */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          تم حفظ الإعدادات بنجاح
        </Alert>
      )}

      {/* General Settings */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="الإعدادات العامة" avatar={<SettingsIcon sx={{ color: '#667eea' }} />} />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="اسم النظام"
                value={settings?.general?.systemName || ''}
                onChange={e => handleSettingChange('general.systemName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="رمز النظام"
                value={settings?.general?.systemVersion || ''}
                onChange={e => handleSettingChange('general.systemVersion', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="وصف النظام"
                value={settings?.general?.description || ''}
                onChange={e => handleSettingChange('general.description', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>لغة النظام</InputLabel>
                <Select value={settings?.general?.language || 'ar'} onChange={e => handleSettingChange('general.language', e.target.value)}>
                  <MenuItem value="ar">العربية</MenuItem>
                  <MenuItem value="en">الإنجليزية</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>الدعم الفني</InputLabel>
                <Select
                  value={settings?.general?.supportLevel || 'premium'}
                  onChange={e => handleSettingChange('general.supportLevel', e.target.value)}
                >
                  <MenuItem value="basic">أساسي</MenuItem>
                  <MenuItem value="standard">معياري</MenuItem>
                  <MenuItem value="premium">متقدم</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="إعدادات الأمان" avatar={<SecurityIcon sx={{ color: '#FF9800' }} />} />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.security?.twoFactorAuth || false}
                    onChange={e => handleSettingChange('security.twoFactorAuth', e.target.checked)}
                  />
                }
                label="تفعيل المصادقة الثنائية"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.security?.encryptData || true}
                    onChange={e => handleSettingChange('security.encryptData', e.target.checked)}
                  />
                }
                label="تشفير البيانات"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="مدة انتهاء الجلسة (دقائق)"
                value={settings?.security?.sessionTimeout || 30}
                onChange={e => handleSettingChange('security.sessionTimeout', parseInt(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="محاولات تسجيل الدخول الفاشلة المسموحة"
                value={settings?.security?.maxLoginAttempts || 5}
                onChange={e => handleSettingChange('security.maxLoginAttempts', parseInt(e.target.value))}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.security?.ipWhitelist || false}
                    onChange={e => handleSettingChange('security.ipWhitelist', e.target.checked)}
                  />
                }
                label="قائمة عناوين IP البيضاء"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="إعدادات الإشعارات" avatar={<NotificationsIcon sx={{ color: '#2196F3' }} />} />
        <Divider />
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.notifications?.emailNotifications || true}
                    onChange={e => handleSettingChange('notifications.emailNotifications', e.target.checked)}
                  />
                }
                label="إرسال إشعارات بالبريد الإلكتروني"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.notifications?.smsNotifications || true}
                    onChange={e => handleSettingChange('notifications.smsNotifications', e.target.checked)}
                  />
                }
                label="إرسال إشعارات برسائل قصيرة"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.notifications?.pushNotifications || true}
                    onChange={e => handleSettingChange('notifications.pushNotifications', e.target.checked)}
                  />
                }
                label="إشعارات الدفع"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="email"
                label="بريد إلكتروني للإشعارات"
                value={settings?.notifications?.notificationEmail || ''}
                onChange={e => handleSettingChange('notifications.notificationEmail', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="رقم هاتف SMS"
                value={settings?.notifications?.smsPhone || ''}
                onChange={e => handleSettingChange('notifications.smsPhone', e.target.value)}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Database Settings */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="إعدادات قاعدة البيانات" avatar={<PaletteIcon sx={{ color: '#4CAF50' }} />} />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="اسم خادم قاعدة البيانات"
                value={settings?.database?.serverName || ''}
                onChange={e => handleSettingChange('database.serverName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="منفذ قاعدة البيانات"
                value={settings?.database?.port || 27017}
                onChange={e => handleSettingChange('database.port', parseInt(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="اسم قاعدة البيانات"
                value={settings?.database?.databaseName || ''}
                onChange={e => handleSettingChange('database.databaseName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="مستخدم قاعدة البيانات"
                value={settings?.database?.username || ''}
                onChange={e => handleSettingChange('database.username', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.database?.autoBackup || true}
                    onChange={e => handleSettingChange('database.autoBackup', e.target.checked)}
                  />
                }
                label="النسخ الاحتياطي التلقائي"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="تكرار النسخ الاحتياطي (ساعات)"
                value={settings?.database?.backupFrequency || 24}
                onChange={e => handleSettingChange('database.backupFrequency', parseInt(e.target.value))}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Email Configuration */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <LanguageIcon sx={{ mr: 2, color: '#667eea' }} />
          <Typography sx={{ fontWeight: 'bold' }}>إعدادات البريد الإلكتروني</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={3} sx={{ width: '100%' }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="خادم SMTP"
                value={settings?.email?.smtpServer || ''}
                onChange={e => handleSettingChange('email.smtpServer', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="منفذ SMTP"
                value={settings?.email?.smtpPort || 587}
                onChange={e => handleSettingChange('email.smtpPort', parseInt(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="email"
                label="عنوان البريد الإلكتروني"
                value={settings?.email?.fromEmail || ''}
                onChange={e => handleSettingChange('email.fromEmail', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="اسم المرسل"
                value={settings?.email?.fromName || ''}
                onChange={e => handleSettingChange('email.fromName', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.email?.enableSSL || true}
                    onChange={e => handleSettingChange('email.enableSSL', e.target.checked)}
                  />
                }
                label="تفعيل SSL/TLS"
              />
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
        <Button variant="contained" startIcon={<SaveIcon />} onClick={handleSaveSettings} size="large">
          حفظ جميع الإعدادات
        </Button>
        <Button variant="outlined" startIcon={<RefreshIcon />} size="large">
          إعادة تعيين الإعدادات الافتراضية
        </Button>
      </Box>
    </Container>
  );
};

export default AdminSystemSettings;
