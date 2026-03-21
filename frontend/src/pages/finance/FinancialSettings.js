import { useState, useEffect, useCallback } from 'react';

import { surfaceColors, neutralColors, brandColors } from 'theme/palette';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  MenuItem,
  Snackbar,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import Business from '@mui/icons-material/Business';
import Notifications from '@mui/icons-material/Notifications';
import Assessment from '@mui/icons-material/Assessment';
import Settings from '@mui/icons-material/Settings';
import Save from '@mui/icons-material/Save';

const API = process.env.REACT_APP_API_URL || '/api';

const FinancialSettings = () => {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [numberingPreview, setNumberingPreview] = useState(null);

  const headers = { Authorization: `Bearer ${localStorage.getItem('token')}` };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/finance/extended/settings`, { headers });
      const json = await res.json();
      if (json.success) setSettings(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchPreview = async () => {
    try {
      const res = await fetch(`${API}/finance/extended/settings/numbering-preview`, { headers });
      const json = await res.json();
      if (json.success) setNumberingPreview(json.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/finance/extended/settings`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (json.success) {
        setSnackbar({ open: true, message: 'تم حفظ الإعدادات بنجاح', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'فشل حفظ الإعدادات', severity: 'error' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: 'حدث خطأ أثناء الحفظ', severity: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const update = (section, field, value) => {
    setSettings(prev => ({
      ...prev,
      [section]: { ...prev[section], [field]: value },
    }));
  };

  if (loading || !settings)
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );

  const tabPanels = [
    // General Settings (0)
    () => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          الإعدادات العامة
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="اسم الشركة"
            value={settings.general?.companyName || ''}
            onChange={e => update('general', 'companyName', e.target.value)}
            fullWidth
          />
          <TextField
            label="السجل التجاري"
            value={settings.general?.commercialRegistration || ''}
            onChange={e => update('general', 'commercialRegistration', e.target.value)}
            fullWidth
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            label="العملة الأساسية"
            value={settings.general?.defaultCurrency || 'SAR'}
            onChange={e => update('general', 'defaultCurrency', e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="SAR">ريال سعودي (SAR)</MenuItem>
            <MenuItem value="USD">دولار أمريكي (USD)</MenuItem>
            <MenuItem value="EUR">يورو (EUR)</MenuItem>
            <MenuItem value="AED">درهم إماراتي (AED)</MenuItem>
          </TextField>
          <TextField
            select
            label="السنة المالية"
            value={settings.general?.fiscalYearStart || '01'}
            onChange={e => update('general', 'fiscalYearStart', e.target.value)}
            sx={{ minWidth: 200 }}
          >
            {['01', '04', '07', '10'].map(m => (
              <MenuItem key={m} value={m}>
                {m === '01' ? 'يناير' : m === '04' ? 'أبريل' : m === '07' ? 'يوليو' : 'أكتوبر'}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="اللغة"
            value={settings.general?.language || 'ar'}
            onChange={e => update('general', 'language', e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="ar">العربية</MenuItem>
            <MenuItem value="en">English</MenuItem>
            <MenuItem value="both">ثنائي اللغة</MenuItem>
          </TextField>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="الرقم الضريبي"
            value={settings.general?.taxNumber || ''}
            onChange={e => update('general', 'taxNumber', e.target.value)}
            fullWidth
          />
          <TextField
            label="عنوان الشركة"
            value={settings.general?.address || ''}
            onChange={e => update('general', 'address', e.target.value)}
            fullWidth
          />
        </Box>
      </Box>
    ),

    // Tax Settings (1)
    () => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          إعدادات الضرائب
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="نسبة ضريبة القيمة المضافة %"
            type="number"
            value={settings.tax?.vatRate ?? 15}
            onChange={e => update('tax', 'vatRate', +e.target.value)}
            sx={{ width: 200 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.tax?.vatEnabled ?? true}
                onChange={e => update('tax', 'vatEnabled', e.target.checked)}
              />
            }
            label="تفعيل ضريبة القيمة المضافة"
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            label="نسبة ضريبة الاستقطاع %"
            type="number"
            value={settings.tax?.withholdingRate ?? 5}
            onChange={e => update('tax', 'withholdingRate', +e.target.value)}
            sx={{ width: 200 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={settings.tax?.withholdingEnabled ?? false}
                onChange={e => update('tax', 'withholdingEnabled', e.target.checked)}
              />
            }
            label="تفعيل ضريبة الاستقطاع"
          />
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={settings.tax?.autoCalculateTax ?? true}
              onChange={e => update('tax', 'autoCalculateTax', e.target.checked)}
            />
          }
          label="حساب الضريبة تلقائياً"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.tax?.pricesIncludeTax ?? true}
              onChange={e => update('tax', 'pricesIncludeTax', e.target.checked)}
            />
          }
          label="الأسعار شاملة الضريبة"
        />
        <Divider />
        <Typography variant="subtitle2" fontWeight={700}>
          الفترة الضريبية
        </Typography>
        <TextField
          select
          label="فترة تقديم إقرار ضريبة القيمة المضافة"
          value={settings.tax?.vatFilingPeriod || 'quarterly'}
          onChange={e => update('tax', 'vatFilingPeriod', e.target.value)}
          sx={{ maxWidth: 300 }}
        >
          <MenuItem value="monthly">شهري</MenuItem>
          <MenuItem value="quarterly">ربع سنوي</MenuItem>
        </TextField>
      </Box>
    ),

    // Accounting Settings (2)
    () => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          إعدادات المحاسبة
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            label="طريقة المحاسبة"
            value={settings.accounting?.method || 'accrual'}
            onChange={e => update('accounting', 'method', e.target.value)}
            sx={{ minWidth: 240 }}
          >
            <MenuItem value="accrual">أساس الاستحقاق</MenuItem>
            <MenuItem value="cash">الأساس النقدي</MenuItem>
          </TextField>
          <TextField
            select
            label="طريقة الإهلاك"
            value={settings.accounting?.depreciationMethod || 'straight_line'}
            onChange={e => update('accounting', 'depreciationMethod', e.target.value)}
            sx={{ minWidth: 240 }}
          >
            <MenuItem value="straight_line">القسط الثابت</MenuItem>
            <MenuItem value="declining_balance">القسط المتناقص</MenuItem>
            <MenuItem value="sum_of_years">مجموع أرقام السنوات</MenuItem>
          </TextField>
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={settings.accounting?.autoPostJournals ?? false}
              onChange={e => update('accounting', 'autoPostJournals', e.target.checked)}
            />
          }
          label="ترحيل القيود تلقائياً"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.accounting?.requireApproval ?? true}
              onChange={e => update('accounting', 'requireApproval', e.target.checked)}
            />
          }
          label="طلب اعتماد قبل الترحيل"
        />
        <Divider />
        <Typography variant="subtitle2" fontWeight={700}>
          الترقيم التلقائي
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="بادئة الفواتير"
            value={settings.accounting?.invoicePrefix || 'INV-'}
            onChange={e => update('accounting', 'invoicePrefix', e.target.value)}
          />
          <TextField
            label="بادئة سندات القبض"
            value={settings.accounting?.receiptPrefix || 'RV-'}
            onChange={e => update('accounting', 'receiptPrefix', e.target.value)}
          />
          <TextField
            label="بادئة سندات الصرف"
            value={settings.accounting?.paymentPrefix || 'PV-'}
            onChange={e => update('accounting', 'paymentPrefix', e.target.value)}
          />
          <TextField
            label="بادئة القيود"
            value={settings.accounting?.journalPrefix || 'JE-'}
            onChange={e => update('accounting', 'journalPrefix', e.target.value)}
          />
        </Box>
        <Button
          variant="outlined"
          startIcon={<Preview />}
          onClick={fetchPreview}
          sx={{ alignSelf: 'flex-start', borderRadius: 2 }}
        >
          معاينة الترقيم
        </Button>
        {numberingPreview && (
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {Object.entries(numberingPreview).map(([k, v]) => (
              <Chip
                key={k}
                label={`${k}: ${v}`}
                variant="outlined"
                sx={{ fontFamily: 'monospace', fontWeight: 600 }}
              />
            ))}
          </Box>
        )}
      </Box>
    ),

    // Notification Settings (3)
    () => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          إعدادات الإشعارات
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={settings.notifications?.emailNotifications ?? true}
              onChange={e => update('notifications', 'emailNotifications', e.target.checked)}
            />
          }
          label="إشعارات البريد الإلكتروني"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.notifications?.paymentDueReminders ?? true}
              onChange={e => update('notifications', 'paymentDueReminders', e.target.checked)}
            />
          }
          label="تذكير بمواعيد الدفع المستحقة"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.notifications?.taxDeadlineReminders ?? true}
              onChange={e => update('notifications', 'taxDeadlineReminders', e.target.checked)}
            />
          }
          label="تذكير بمواعيد الإقرارات الضريبية"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.notifications?.budgetAlerts ?? true}
              onChange={e => update('notifications', 'budgetAlerts', e.target.checked)}
            />
          }
          label="تنبيهات تجاوز الميزانية"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.notifications?.chequeMaturityAlerts ?? true}
              onChange={e => update('notifications', 'chequeMaturityAlerts', e.target.checked)}
            />
          }
          label="تنبيهات استحقاق الشيكات"
        />
        <Divider />
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            label="أيام التذكير قبل الاستحقاق"
            type="number"
            value={settings.notifications?.reminderDaysBefore ?? 7}
            onChange={e => update('notifications', 'reminderDaysBefore', +e.target.value)}
            sx={{ width: 240 }}
          />
          <TextField
            label="البريد الإلكتروني للإشعارات"
            value={settings.notifications?.notificationEmail || ''}
            onChange={e => update('notifications', 'notificationEmail', e.target.value)}
            fullWidth
          />
        </Box>
      </Box>
    ),

    // Reports Settings (4)
    () => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          إعدادات التقارير
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <TextField
            select
            label="تنسيق التقارير الافتراضي"
            value={settings.reports?.defaultFormat || 'pdf'}
            onChange={e => update('reports', 'defaultFormat', e.target.value)}
            sx={{ minWidth: 200 }}
          >
            <MenuItem value="pdf">PDF</MenuItem>
            <MenuItem value="excel">Excel</MenuItem>
            <MenuItem value="csv">CSV</MenuItem>
          </TextField>
          <TextField
            select
            label="حجم الصفحة"
            value={settings.reports?.pageSize || 'A4'}
            onChange={e => update('reports', 'pageSize', e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="A4">A4</MenuItem>
            <MenuItem value="Letter">Letter</MenuItem>
            <MenuItem value="Legal">Legal</MenuItem>
          </TextField>
        </Box>
        <FormControlLabel
          control={
            <Switch
              checked={settings.reports?.showLogo ?? true}
              onChange={e => update('reports', 'showLogo', e.target.checked)}
            />
          }
          label="إظهار شعار الشركة في التقارير"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.reports?.showBilingual ?? true}
              onChange={e => update('reports', 'showBilingual', e.target.checked)}
            />
          }
          label="عرض ثنائي اللغة (عربي/إنجليزي)"
        />
        <FormControlLabel
          control={
            <Switch
              checked={settings.reports?.showSignature ?? false}
              onChange={e => update('reports', 'showSignature', e.target.checked)}
            />
          }
          label="إظهار مكان التوقيع"
        />
        <TextField
          label="ملاحظات تذييل التقارير"
          value={settings.reports?.footerNote || ''}
          onChange={e => update('reports', 'footerNote', e.target.value)}
          multiline
          rows={2}
          fullWidth
        />
      </Box>
    ),

    // Backup Settings (5)
    () => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h6" fontWeight={700} gutterBottom>
          إعدادات النسخ الاحتياطي
        </Typography>
        <FormControlLabel
          control={
            <Switch
              checked={settings.backup?.autoBackup ?? true}
              onChange={e => update('backup', 'autoBackup', e.target.checked)}
            />
          }
          label="نسخ احتياطي تلقائي"
        />
        <TextField
          select
          label="تكرار النسخ الاحتياطي"
          value={settings.backup?.frequency || 'daily'}
          onChange={e => update('backup', 'frequency', e.target.value)}
          sx={{ maxWidth: 240 }}
        >
          <MenuItem value="daily">يومي</MenuItem>
          <MenuItem value="weekly">أسبوعي</MenuItem>
          <MenuItem value="monthly">شهري</MenuItem>
        </TextField>
        <TextField
          label="الاحتفاظ بالنسخ (أيام)"
          type="number"
          value={settings.backup?.retentionDays ?? 30}
          onChange={e => update('backup', 'retentionDays', +e.target.value)}
          sx={{ maxWidth: 240 }}
        />
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          النسخ الاحتياطي يعمل تلقائياً حسب الجدولة المحددة. يمكنك تحميل نسخة احتياطية يدوياً من
          لوحة التحكم.
        </Alert>
      </Box>
    ),
  ];

  const tabIcons = [
    <Business sx={{ fontSize: 18 }} />,
    <Receipt sx={{ fontSize: 18 }} />,
    <AccountBalance sx={{ fontSize: 18 }} />,
    <Notifications sx={{ fontSize: 18 }} />,
    <Assessment sx={{ fontSize: 18 }} />,
    <Backup sx={{ fontSize: 18 }} />,
  ];
  const tabLabels = ['عام', 'الضرائب', 'المحاسبة', 'الإشعارات', 'التقارير', 'النسخ الاحتياطي'];

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight={800}>
            <Settings sx={{ fontSize: 32, verticalAlign: 'middle', mr: 1 }} />
            الإعدادات المالية
          </Typography>
          <Typography variant="body2" sx={{ color: neutralColors.textSecondary }}>
            Financial Settings - تكوين النظام المالي والمحاسبي
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <Save />}
          onClick={handleSave}
          disabled={saving}
          sx={{
            bgcolor: brandColors.primary,
            borderRadius: 2,
            fontWeight: 700,
            px: 4,
            '&:hover': { bgcolor: brandColors.primaryDark },
          }}
        >
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </Button>
      </Box>

      {/* Settings Card with Tabs */}
      <Card sx={{ borderRadius: 2.5, border: `1px solid ${surfaceColors.border}` }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: `1px solid ${surfaceColors.border}`, px: 1 }}
        >
          {tabLabels.map((label, i) => (
            <Tab
              key={i}
              label={label}
              icon={tabIcons[i]}
              iconPosition="start"
              sx={{ fontWeight: 600, minHeight: 56 }}
            />
          ))}
        </Tabs>
        <CardContent sx={{ p: 3, minHeight: 400 }}>{tabPanels[activeTab]()}</CardContent>
      </Card>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ borderRadius: 2, fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default FinancialSettings;
