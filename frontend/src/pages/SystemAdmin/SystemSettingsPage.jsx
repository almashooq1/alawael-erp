/**
 * System Settings Page — إعدادات النظام
 * AlAwael ERP — Admin Panel
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Divider,
  Alert,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Build as MaintenanceIcon,
} from '@mui/icons-material';
import systemSettingsService from '../../services/systemSettingsService';

export default function SystemSettingsPage() {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [maintenanceDialog, setMaintenanceDialog] = useState(false);

  // ── Editable local copies ──────────────────────────────────────────────
  const [generalForm, setGeneralForm] = useState({
    siteName: '',
    siteNameAr: '',
    timezone: 'Asia/Riyadh',
    language: 'ar',
    currency: 'SAR',
  });

  const [securityForm, setSecurityForm] = useState({
    sessionTimeout: 30,
    maxLoginAttempts: 5,
    passwordMinLength: 8,
    requireMFA: false,
  });

  // ── Fetch Settings ─────────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await systemSettingsService.get();
      const data = res.data?.data || res.data;
      setSettings(data);

      // Populate forms
      if (data?.general) {
        setGeneralForm(prev => ({ ...prev, ...data.general }));
      }
      if (data?.security) {
        setSecurityForm(prev => ({ ...prev, ...data.security }));
      }
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في جلب الإعدادات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ── Save ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await systemSettingsService.update({
        general: generalForm,
        security: securityForm,
      });
      setSuccess('تم حفظ الإعدادات بنجاح');
      fetchSettings();
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  // ── Maintenance Toggle ─────────────────────────────────────────────────
  const handleMaintenanceToggle = async () => {
    try {
      await systemSettingsService.toggleMaintenance();
      setMaintenanceDialog(false);
      setSuccess('تم تبديل وضع الصيانة');
      fetchSettings();
    } catch (err) {
      setError(err.response?.data?.message || 'خطأ في تبديل وضع الصيانة');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <SettingsIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight="bold">
            إعدادات النظام
          </Typography>
          {settings?.maintenance?.enabled && (
            <Chip
              icon={<WarningIcon />}
              label="وضع الصيانة مُفعّل"
              color="warning"
              size="small"
            />
          )}
        </Box>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<MaintenanceIcon />}
            variant="outlined"
            color="warning"
            onClick={() => setMaintenanceDialog(true)}
          >
            وضع الصيانة
          </Button>
          <Button startIcon={<RefreshIcon />} variant="outlined" onClick={fetchSettings}>
            تحديث
          </Button>
          <Button
            startIcon={<SaveIcon />}
            variant="contained"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {loading ? (
        <Typography>جاري التحميل...</Typography>
      ) : (
        <Grid container spacing={3}>
          {/* General Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  الإعدادات العامة
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={2}>
                  <TextField
                    label="اسم الموقع (EN)"
                    value={generalForm.siteName}
                    onChange={e =>
                      setGeneralForm(f => ({ ...f, siteName: e.target.value }))
                    }
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="اسم الموقع (AR)"
                    value={generalForm.siteNameAr}
                    onChange={e =>
                      setGeneralForm(f => ({ ...f, siteNameAr: e.target.value }))
                    }
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="المنطقة الزمنية"
                    value={generalForm.timezone}
                    onChange={e =>
                      setGeneralForm(f => ({ ...f, timezone: e.target.value }))
                    }
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="العملة"
                    value={generalForm.currency}
                    onChange={e =>
                      setGeneralForm(f => ({ ...f, currency: e.target.value }))
                    }
                    fullWidth
                    size="small"
                    select
                  >
                    <option value="SAR">ريال سعودي (SAR)</option>
                    <option value="USD">دولار أمريكي (USD)</option>
                    <option value="EUR">يورو (EUR)</option>
                  </TextField>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Security Settings */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  إعدادات الأمان
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={2}>
                  <TextField
                    label="مهلة الجلسة (دقائق)"
                    type="number"
                    value={securityForm.sessionTimeout}
                    onChange={e =>
                      setSecurityForm(f => ({
                        ...f,
                        sessionTimeout: parseInt(e.target.value, 10) || 30,
                      }))
                    }
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="محاولات تسجيل الدخول القصوى"
                    type="number"
                    value={securityForm.maxLoginAttempts}
                    onChange={e =>
                      setSecurityForm(f => ({
                        ...f,
                        maxLoginAttempts: parseInt(e.target.value, 10) || 5,
                      }))
                    }
                    fullWidth
                    size="small"
                  />
                  <TextField
                    label="الحد الأدنى لطول كلمة المرور"
                    type="number"
                    value={securityForm.passwordMinLength}
                    onChange={e =>
                      setSecurityForm(f => ({
                        ...f,
                        passwordMinLength: parseInt(e.target.value, 10) || 8,
                      }))
                    }
                    fullWidth
                    size="small"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={securityForm.requireMFA}
                        onChange={e =>
                          setSecurityForm(f => ({ ...f, requireMFA: e.target.checked }))
                        }
                      />
                    }
                    label="تفعيل المصادقة الثنائية الإلزامية"
                  />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Maintenance Mode Dialog */}
      <Dialog
        open={maintenanceDialog}
        onClose={() => setMaintenanceDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>تبديل وضع الصيانة</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            {settings?.maintenance?.enabled
              ? 'سيتم إيقاف وضع الصيانة وإعادة الوصول للمستخدمين.'
              : 'سيتم تفعيل وضع الصيانة ومنع المستخدمين من الوصول مؤقتاً.'}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMaintenanceDialog(false)}>إلغاء</Button>
          <Button variant="contained" color="warning" onClick={handleMaintenanceToggle}>
            {settings?.maintenance?.enabled ? 'إيقاف الصيانة' : 'تفعيل الصيانة'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
