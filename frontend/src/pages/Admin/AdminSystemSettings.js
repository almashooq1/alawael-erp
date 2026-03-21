import { useState, useEffect, useCallback, useRef } from 'react';

import { adminService } from '../../services/adminService';
import logger from '../../utils/logger';
import { gradients, brandColors, statusColors } from '../../theme/palette';
import { useAuth } from '../../contexts/AuthContext';
import { useSnackbar } from '../../contexts/SnackbarContext';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CircularProgress,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Fade,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';
import PaletteIcon from '@mui/icons-material/Palette';
import SecurityIcon from '@mui/icons-material/Security';
import NotificationsIcon from '@mui/icons-material/Notifications';
import EmailIcon from '@mui/icons-material/Email';
import BackupIcon from '@mui/icons-material/Backup';
import PublicIcon from '@mui/icons-material/Public';
import WarningIcon from '@mui/icons-material/Warning';
import SaveIcon from '@mui/icons-material/Save';
import RefreshIcon from '@mui/icons-material/Refresh';
import DownloadIcon from '@mui/icons-material/Download';
import UploadIcon from '@mui/icons-material/Upload';
import HistoryIcon from '@mui/icons-material/History';
import BuildIcon from '@mui/icons-material/Build';
import SendIcon from '@mui/icons-material/Send';

// ─── Tab Panel ───────────────────────────────────────────────
function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

// ─── Section Card Wrapper ────────────────────────────────────
function SectionCard({ title, icon, children, collapsible, defaultExpanded = true }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <Card sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon}
            <Typography variant="h6" fontWeight="bold">
              {title}
            </Typography>
          </Box>
        }
        action={
          collapsible && (
            <IconButton onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )
        }
        sx={{ pb: 0 }}
      />
      <Divider sx={{ mt: 1 }} />
      <Collapse in={expanded}>
        <CardContent>{children}</CardContent>
      </Collapse>
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────
const AdminSystemSettings = () => {
  const { user: _user } = useAuth();
  const showSnackbar = useSnackbar();

  // State
  const [settings, setSettings] = useState(null);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [hasChanges, setHasChanges] = useState(false);
  const [historyDialog, setHistoryDialog] = useState(false);
  const [history, setHistory] = useState([]);
  const [resetDialog, setResetDialog] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [importDialog, setImportDialog] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const fileInputRef = useRef(null);

  // ─── Fetch Settings ──────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getAdminSettings();
      setSettings(data);
      setOriginalSettings(JSON.parse(JSON.stringify(data)));
      setHasChanges(false);
    } catch (err) {
      logger.error('Error loading settings:', err);
      setError('خطأ في تحميل الإعدادات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ─── Setting Change Handler ──────────────────────────────
  const handleSettingChange = useCallback((path, value) => {
    setSettings(prev => {
      const updated = JSON.parse(JSON.stringify(prev));
      const parts = path.split('.');
      let target = updated;
      for (let i = 0; i < parts.length - 1; i++) {
        if (!target[parts[i]]) target[parts[i]] = {};
        target = target[parts[i]];
      }
      target[parts[parts.length - 1]] = value;
      return updated;
    });
    setHasChanges(true);
  }, []);

  // ─── Save All ────────────────────────────────────────────
  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      const result = await adminService.saveAdminSettings(settings);
      if (result) {
        setSettings(result);
        setOriginalSettings(JSON.parse(JSON.stringify(result)));
      }
      setHasChanges(false);
      showSnackbar('تم حفظ جميع الإعدادات بنجاح', 'success');
    } catch (err) {
      logger.error('Error saving settings:', err);
      showSnackbar('خطأ في حفظ الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Save Section ────────────────────────────────────────
  const handleSaveSection = async section => {
    try {
      setSaving(true);
      const result = await adminService.updateSettingsSection(section, settings[section]);
      if (result) {
        setSettings(result);
        setOriginalSettings(JSON.parse(JSON.stringify(result)));
      }
      setHasChanges(false);
      showSnackbar('تم حفظ إعدادات القسم بنجاح', 'success');
    } catch (err) {
      logger.error('Error saving section:', err);
      showSnackbar('خطأ في حفظ القسم', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Reset ───────────────────────────────────────────────
  const handleResetConfirm = async () => {
    try {
      setSaving(true);
      let result;
      if (resetTarget === 'all') {
        result = await adminService.resetAllSettings();
      } else {
        result = await adminService.resetSettingsSection(resetTarget);
      }
      if (result) {
        setSettings(result);
        setOriginalSettings(JSON.parse(JSON.stringify(result)));
      }
      setHasChanges(false);
      setResetDialog(false);
      showSnackbar('تم إعادة تعيين الإعدادات بنجاح', 'success');
    } catch (err) {
      logger.error('Error resetting settings:', err);
      showSnackbar('خطأ في إعادة تعيين الإعدادات', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openResetDialog = target => {
    setResetTarget(target);
    setResetDialog(true);
  };

  // ─── Discard Changes ─────────────────────────────────────
  const handleDiscardChanges = () => {
    setSettings(JSON.parse(JSON.stringify(originalSettings)));
    setHasChanges(false);
    showSnackbar('تم التراجع عن التغييرات', 'info');
  };

  // ─── Export ──────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const data = await adminService.exportSettings();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-settings-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showSnackbar('تم تصدير الإعدادات بنجاح', 'success');
    } catch (err) {
      logger.error('Export error:', err);
      showSnackbar('خطأ في تصدير الإعدادات', 'error');
    }
  };

  // ─── Import ──────────────────────────────────────────────
  const handleImportFile = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setImportJson(ev.target.result);
      setImportDialog(true);
    };
    reader.readAsText(file);
  };

  const handleImportConfirm = async () => {
    try {
      const data = JSON.parse(importJson);
      const result = await adminService.importSettings(data);
      if (result) {
        setSettings(result);
        setOriginalSettings(JSON.parse(JSON.stringify(result)));
      }
      setImportDialog(false);
      setImportJson('');
      setHasChanges(false);
      showSnackbar('تم استيراد الإعدادات بنجاح', 'success');
    } catch (err) {
      logger.error('Import error:', err);
      showSnackbar('خطأ في استيراد الإعدادات — تأكد من صحة ملف JSON', 'error');
    }
  };

  // ─── History ─────────────────────────────────────────────
  const handleViewHistory = async () => {
    try {
      const data = await adminService.getSettingsHistory(30);
      setHistory(Array.isArray(data) ? data : []);
      setHistoryDialog(true);
    } catch (err) {
      logger.error('History error:', err);
    }
  };

  // ─── Test Email ──────────────────────────────────────────
  const handleTestEmail = async () => {
    try {
      setTestingEmail(true);
      const result = await adminService.testEmailConfig();
      showSnackbar(
        result?.message || 'تم إرسال البريد التجريبي',
        result?.success ? 'success' : 'error'
      );
    } catch (err) {
      showSnackbar('فشل في اختبار البريد', 'error');
    } finally {
      setTestingEmail(false);
    }
  };

  // ─── Trigger Backup ──────────────────────────────────────
  const handleTriggerBackup = async () => {
    try {
      setBackingUp(true);
      const result = await adminService.triggerBackup();
      showSnackbar(result?.message || 'تم بدء النسخ الاحتياطي', 'success');
      fetchSettings();
    } catch (err) {
      showSnackbar('خطأ في النسخ الاحتياطي', 'error');
    } finally {
      setBackingUp(false);
    }
  };

  // ─── Toggle Maintenance ──────────────────────────────────
  const handleToggleMaintenance = async () => {
    try {
      const newState = !settings?.general?.maintenanceMode;
      const result = await adminService.toggleMaintenance(
        newState,
        settings?.general?.maintenanceMessage
      );
      if (result) {
        setSettings(result);
        setOriginalSettings(JSON.parse(JSON.stringify(result)));
      }
      showSnackbar(newState ? 'تم تفعيل وضع الصيانة' : 'تم إيقاف وضع الصيانة', 'success');
    } catch (err) {
      showSnackbar('خطأ في تبديل وضع الصيانة', 'error');
    }
  };

  // ─── Tab Config ──────────────────────────────────────────
  const tabs = [
    { label: 'عام', icon: <SettingsIcon fontSize="small" /> },
    { label: 'المظهر', icon: <PaletteIcon fontSize="small" /> },
    { label: 'الأمان', icon: <SecurityIcon fontSize="small" /> },
    { label: 'الإشعارات', icon: <NotificationsIcon fontSize="small" /> },
    { label: 'البريد', icon: <EmailIcon fontSize="small" /> },
    { label: 'النسخ الاحتياطي', icon: <BackupIcon fontSize="small" /> },
    { label: 'التكاملات', icon: <IntegrationIcon fontSize="small" /> },
    { label: 'إقليمي', icon: <PublicIcon fontSize="small" /> },
  ];

  // ─── Loading State ───────────────────────────────────────
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <LinearProgress sx={{ borderRadius: 2 }} />
        <Typography sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
          جاري تحميل الإعدادات...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" action={<Button onClick={fetchSettings}>إعادة المحاولة</Button>}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* ─── Header ────────────────────────────────────────── */}
      <Paper
        elevation={0}
        sx={{
          background: gradients.primary,
          color: '#fff',
          p: 3,
          borderRadius: 3,
          mb: 3,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              <SettingsIcon sx={{ mr: 1, verticalAlign: 'middle', fontSize: 36 }} />
              إعدادات النظام المتقدمة
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              إدارة جميع إعدادات النظام من مكان واحد — عام، أمان، إشعارات، بريد، نسخ احتياطي والمزيد
            </Typography>
            {settings?.general?.maintenanceMode && (
              <Chip
                icon={<WarningIcon />}
                label="وضع الصيانة مفعّل"
                color="warning"
                sx={{ mt: 1 }}
              />
            )}
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Tooltip title="حفظ جميع الإعدادات">
              <span>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
                  onClick={handleSaveSettings}
                  disabled={saving || !hasChanges}
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  حفظ الكل
                </Button>
              </span>
            </Tooltip>
            {hasChanges && (
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleDiscardChanges}
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}
              >
                تراجع
              </Button>
            )}
            <Tooltip title="تصدير الإعدادات">
              <IconButton onClick={handleExport} sx={{ color: '#fff' }}>
                <DownloadIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="استيراد الإعدادات">
              <IconButton onClick={() => fileInputRef.current?.click()} sx={{ color: '#fff' }}>
                <UploadIcon />
              </IconButton>
            </Tooltip>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleImportFile}
            />
            <Tooltip title="سجل التغييرات">
              <IconButton onClick={handleViewHistory} sx={{ color: '#fff' }}>
                <HistoryIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        </Box>
        {hasChanges && (
          <Alert
            severity="warning"
            sx={{
              mt: 2,
              bgcolor: 'rgba(255,152,0,0.15)',
              color: '#fff',
              '& .MuiAlert-icon': { color: '#ffb74d' },
            }}
          >
            لديك تغييرات غير محفوظة — اضغط &quot;حفظ الكل&quot; لحفظها
          </Alert>
        )}
      </Paper>

      {/* ─── Tabs ──────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 2, mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { minHeight: 56, fontWeight: 'bold', fontSize: '0.85rem' },
            '& .Mui-selected': { color: brandColors.primaryStart },
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          {tabs.map((tab, i) => (
            <Tab key={i} label={tab.label} icon={tab.icon} iconPosition="start" />
          ))}
        </Tabs>
      </Paper>

      {/* ═══════ TAB 0 — General ═══════════════════════════ */}
      <TabPanel value={activeTab} index={0}>
        <SectionCard
          title="الإعدادات العامة"
          icon={<SettingsIcon sx={{ color: brandColors.primaryStart }} />}
        >
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
                label="إصدار النظام"
                value={settings?.general?.systemVersion || ''}
                onChange={e => handleSettingChange('general.systemVersion', e.target.value)}
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="وصف النظام"
                value={settings?.general?.description || ''}
                onChange={e => handleSettingChange('general.description', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>اللغة</InputLabel>
                <Select
                  value={settings?.general?.language || 'ar'}
                  label="اللغة"
                  onChange={e => handleSettingChange('general.language', e.target.value)}
                >
                  <MenuItem value="ar">العربية</MenuItem>
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="fr">Français</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>مستوى الدعم</InputLabel>
                <Select
                  value={settings?.general?.supportLevel || 'premium'}
                  label="مستوى الدعم"
                  onChange={e => handleSettingChange('general.supportLevel', e.target.value)}
                >
                  <MenuItem value="basic">أساسي</MenuItem>
                  <MenuItem value="standard">قياسي</MenuItem>
                  <MenuItem value="premium">متميز</MenuItem>
                  <MenuItem value="enterprise">مؤسسي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>المنطقة الزمنية</InputLabel>
                <Select
                  value={settings?.general?.timezone || 'Asia/Riyadh'}
                  label="المنطقة الزمنية"
                  onChange={e => handleSettingChange('general.timezone', e.target.value)}
                >
                  <MenuItem value="Asia/Riyadh">الرياض (UTC+3)</MenuItem>
                  <MenuItem value="Asia/Dubai">دبي (UTC+4)</MenuItem>
                  <MenuItem value="Asia/Kuwait">الكويت (UTC+3)</MenuItem>
                  <MenuItem value="Africa/Cairo">القاهرة (UTC+2)</MenuItem>
                  <MenuItem value="Europe/London">لندن (UTC+0)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>تنسيق التاريخ</InputLabel>
                <Select
                  value={settings?.general?.dateFormat || 'DD/MM/YYYY'}
                  label="تنسيق التاريخ"
                  onChange={e => handleSettingChange('general.dateFormat', e.target.value)}
                >
                  <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                  <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                  <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="العملة"
                value={settings?.general?.currency || 'SAR'}
                onChange={e => handleSettingChange('general.currency', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="الحد الأقصى لحجم الرفع (MB)"
                value={settings?.general?.maxUploadSize || 10}
                onChange={e =>
                  handleSettingChange('general.maxUploadSize', parseInt(e.target.value))
                }
              />
            </Grid>
          </Grid>
        </SectionCard>

        {/* Maintenance Mode */}
        <SectionCard title="وضع الصيانة" icon={<BuildIcon sx={{ color: statusColors.warning }} />}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12}>
              <Alert
                severity={settings?.general?.maintenanceMode ? 'warning' : 'info'}
                sx={{ mb: 2 }}
              >
                {settings?.general?.maintenanceMode
                  ? 'وضع الصيانة مفعّل — لن يتمكن المستخدمون من الوصول للنظام'
                  : 'وضع الصيانة معطّل — النظام يعمل بشكل طبيعي'}
              </Alert>
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="رسالة الصيانة"
                value={settings?.general?.maintenanceMessage || ''}
                onChange={e => handleSettingChange('general.maintenanceMessage', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                variant="contained"
                fullWidth
                color={settings?.general?.maintenanceMode ? 'success' : 'warning'}
                startIcon={<BuildIcon />}
                onClick={handleToggleMaintenance}
                sx={{ height: 56 }}
              >
                {settings?.general?.maintenanceMode ? 'إيقاف وضع الصيانة' : 'تفعيل وضع الصيانة'}
              </Button>
            </Grid>
          </Grid>
        </SectionCard>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ResetIcon />}
            onClick={() => openResetDialog('general')}
          >
            إعادة تعيين
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => handleSaveSection('general')}
            disabled={saving}
          >
            حفظ الإعدادات العامة
          </Button>
        </Box>
      </TabPanel>

      {/* ═══════ TAB 1 — Appearance ════════════════════════ */}
      <TabPanel value={activeTab} index={1}>
        <SectionCard
          title="المظهر والهوية البصرية"
          icon={<PaletteIcon sx={{ color: statusColors.info }} />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>السمة</InputLabel>
                <Select
                  value={settings?.appearance?.theme || 'light'}
                  label="السمة"
                  onChange={e => handleSettingChange('appearance.theme', e.target.value)}
                >
                  <MenuItem value="light">فاتح</MenuItem>
                  <MenuItem value="dark">داكن</MenuItem>
                  <MenuItem value="auto">تلقائي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="color"
                label="اللون الأساسي"
                value={settings?.appearance?.primaryColor || '#1976d2'}
                onChange={e => handleSettingChange('appearance.primaryColor', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="color"
                label="اللون الثانوي"
                value={settings?.appearance?.secondaryColor || '#dc004e'}
                onChange={e => handleSettingChange('appearance.secondaryColor', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="color"
                label="لون الشريط الجانبي"
                value={settings?.appearance?.sidebarColor || '#1e293b'}
                onChange={e => handleSettingChange('appearance.sidebarColor', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <InputLabel>حجم الخط</InputLabel>
                <Select
                  value={settings?.appearance?.fontSize || 'medium'}
                  label="حجم الخط"
                  onChange={e => handleSettingChange('appearance.fontSize', e.target.value)}
                >
                  <MenuItem value="small">صغير</MenuItem>
                  <MenuItem value="medium">متوسط</MenuItem>
                  <MenuItem value="large">كبير</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.appearance?.compactMode || false}
                    onChange={e => handleSettingChange('appearance.compactMode', e.target.checked)}
                  />
                }
                label="الوضع المضغوط"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.appearance?.showLogo !== false}
                    onChange={e => handleSettingChange('appearance.showLogo', e.target.checked)}
                  />
                }
                label="عرض شعار النظام"
              />
            </Grid>
          </Grid>
        </SectionCard>
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ResetIcon />}
            onClick={() => openResetDialog('appearance')}
          >
            إعادة تعيين
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => handleSaveSection('appearance')}
            disabled={saving}
          >
            حفظ إعدادات المظهر
          </Button>
        </Box>
      </TabPanel>

      {/* ═══════ TAB 2 — Security ══════════════════════════ */}
      <TabPanel value={activeTab} index={2}>
        <SectionCard
          title="إعدادات الأمان"
          icon={<SecurityIcon sx={{ color: statusColors.error }} />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.security?.twoFactorAuth || false}
                    onChange={e => handleSettingChange('security.twoFactorAuth', e.target.checked)}
                  />
                }
                label="المصادقة الثنائية (2FA)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.security?.encryptData || false}
                    onChange={e => handleSettingChange('security.encryptData', e.target.checked)}
                  />
                }
                label="تشفير البيانات"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.security?.enableAuditLog !== false}
                    onChange={e => handleSettingChange('security.enableAuditLog', e.target.checked)}
                  />
                }
                label="سجل التدقيق"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.security?.enableCaptcha || false}
                    onChange={e => handleSettingChange('security.enableCaptcha', e.target.checked)}
                  />
                }
                label="تفعيل CAPTCHA"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="مهلة انتهاء الجلسة (دقيقة)"
                value={settings?.security?.sessionTimeout || 30}
                onChange={e =>
                  handleSettingChange('security.sessionTimeout', parseInt(e.target.value))
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="الحد الأقصى لمحاولات الدخول"
                value={settings?.security?.maxLoginAttempts || 5}
                onChange={e =>
                  handleSettingChange('security.maxLoginAttempts', parseInt(e.target.value))
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="مدة القفل (دقيقة)"
                value={settings?.security?.lockoutDuration || 15}
                onChange={e =>
                  handleSettingChange('security.lockoutDuration', parseInt(e.target.value))
                }
              />
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard
          title="سياسة كلمات المرور"
          icon={<SecurityIcon sx={{ color: brandColors.primaryEnd }} />}
          collapsible
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.security?.enforcePasswordPolicy !== false}
                    onChange={e =>
                      handleSettingChange('security.enforcePasswordPolicy', e.target.checked)
                    }
                  />
                }
                label="فرض سياسة كلمات المرور"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="الحد الأدنى لطول كلمة المرور"
                value={settings?.security?.passwordMinLength || 8}
                onChange={e =>
                  handleSettingChange('security.passwordMinLength', parseInt(e.target.value))
                }
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.security?.passwordRequireUppercase !== false}
                    onChange={e =>
                      handleSettingChange('security.passwordRequireUppercase', e.target.checked)
                    }
                  />
                }
                label="تتطلب أحرف كبيرة"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.security?.passwordRequireNumbers !== false}
                    onChange={e =>
                      handleSettingChange('security.passwordRequireNumbers', e.target.checked)
                    }
                  />
                }
                label="تتطلب أرقام"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.security?.passwordRequireSpecial !== false}
                    onChange={e =>
                      handleSettingChange('security.passwordRequireSpecial', e.target.checked)
                    }
                  />
                }
                label="تتطلب رموز خاصة"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="انتهاء صلاحية كلمة المرور (يوم)"
                value={settings?.security?.passwordExpiryDays || 90}
                onChange={e =>
                  handleSettingChange('security.passwordExpiryDays', parseInt(e.target.value))
                }
              />
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard
          title="قائمة IP البيضاء"
          icon={<SecurityIcon sx={{ color: statusColors.warning }} />}
          collapsible
          defaultExpanded={false}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.security?.ipWhitelist || false}
                    onChange={e => handleSettingChange('security.ipWhitelist', e.target.checked)}
                  />
                }
                label="تفعيل قائمة IP البيضاء"
              />
            </Grid>
            {settings?.security?.ipWhitelist && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  أضف عناوين IP المسموح بها (عنوان واحد في كل سطر)
                </Alert>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="عناوين IP المسموح بها"
                  value={(settings?.security?.ipWhitelistAddresses || []).join('\n')}
                  onChange={e =>
                    handleSettingChange(
                      'security.ipWhitelistAddresses',
                      e.target.value.split('\n').filter(Boolean)
                    )
                  }
                  placeholder={'192.168.1.1\n10.0.0.0/24'}
                />
              </Grid>
            )}
          </Grid>
        </SectionCard>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ResetIcon />}
            onClick={() => openResetDialog('security')}
          >
            إعادة تعيين
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => handleSaveSection('security')}
            disabled={saving}
          >
            حفظ إعدادات الأمان
          </Button>
        </Box>
      </TabPanel>

      {/* ═══════ TAB 3 — Notifications ═════════════════════ */}
      <TabPanel value={activeTab} index={3}>
        <SectionCard
          title="إعدادات الإشعارات"
          icon={<NotificationsIcon sx={{ color: statusColors.info }} />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.notifications?.emailNotifications !== false}
                    onChange={e =>
                      handleSettingChange('notifications.emailNotifications', e.target.checked)
                    }
                  />
                }
                label="إشعارات البريد الإلكتروني"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.notifications?.smsNotifications !== false}
                    onChange={e =>
                      handleSettingChange('notifications.smsNotifications', e.target.checked)
                    }
                  />
                }
                label="إشعارات الرسائل القصيرة (SMS)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.notifications?.pushNotifications !== false}
                    onChange={e =>
                      handleSettingChange('notifications.pushNotifications', e.target.checked)
                    }
                  />
                }
                label="إشعارات الدفع (Push)"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.notifications?.whatsappNotifications || false}
                    onChange={e =>
                      handleSettingChange('notifications.whatsappNotifications', e.target.checked)
                    }
                  />
                }
                label="إشعارات واتساب"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="email"
                label="بريد الإشعارات"
                value={settings?.notifications?.notificationEmail || ''}
                onChange={e =>
                  handleSettingChange('notifications.notificationEmail', e.target.value)
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="رقم هاتف SMS"
                value={settings?.notifications?.smsPhone || ''}
                onChange={e => handleSettingChange('notifications.smsPhone', e.target.value)}
                placeholder="+966501234567"
              />
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard
          title="تفضيلات الإشعارات"
          icon={<NotificationsIcon sx={{ color: brandColors.primaryEnd }} />}
          collapsible
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>تكرار الملخص</InputLabel>
                <Select
                  value={settings?.notifications?.digestFrequency || 'realtime'}
                  label="تكرار الملخص"
                  onChange={e =>
                    handleSettingChange('notifications.digestFrequency', e.target.value)
                  }
                >
                  <MenuItem value="realtime">فوري</MenuItem>
                  <MenuItem value="hourly">كل ساعة</MenuItem>
                  <MenuItem value="daily">يومي</MenuItem>
                  <MenuItem value="weekly">أسبوعي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.notifications?.quietHoursEnabled || false}
                    onChange={e =>
                      handleSettingChange('notifications.quietHoursEnabled', e.target.checked)
                    }
                  />
                }
                label="ساعات الهدوء"
              />
            </Grid>
            {settings?.notifications?.quietHoursEnabled && (
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="time"
                    label="بداية ساعات الهدوء"
                    value={settings?.notifications?.quietHoursStart || '22:00'}
                    onChange={e =>
                      handleSettingChange('notifications.quietHoursStart', e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    type="time"
                    label="نهاية ساعات الهدوء"
                    value={settings?.notifications?.quietHoursEnd || '07:00'}
                    onChange={e =>
                      handleSettingChange('notifications.quietHoursEnd', e.target.value)
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
              </>
            )}
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.notifications?.notifyOnNewUser !== false}
                    onChange={e =>
                      handleSettingChange('notifications.notifyOnNewUser', e.target.checked)
                    }
                  />
                }
                label="إشعار عند مستخدم جديد"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.notifications?.notifyOnPayment !== false}
                    onChange={e =>
                      handleSettingChange('notifications.notifyOnPayment', e.target.checked)
                    }
                  />
                }
                label="إشعار عند دفعة جديدة"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.notifications?.notifyOnError !== false}
                    onChange={e =>
                      handleSettingChange('notifications.notifyOnError', e.target.checked)
                    }
                  />
                }
                label="إشعار عند خطأ في النظام"
              />
            </Grid>
          </Grid>
        </SectionCard>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ResetIcon />}
            onClick={() => openResetDialog('notifications')}
          >
            إعادة تعيين
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => handleSaveSection('notifications')}
            disabled={saving}
          >
            حفظ إعدادات الإشعارات
          </Button>
        </Box>
      </TabPanel>

      {/* ═══════ TAB 4 — Email / SMTP ══════════════════════ */}
      <TabPanel value={activeTab} index={4}>
        <SectionCard
          title="إعدادات البريد الإلكتروني (SMTP)"
          icon={<EmailIcon sx={{ color: brandColors.primaryStart }} />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="خادم SMTP"
                value={settings?.email?.smtpServer || ''}
                onChange={e => handleSettingChange('email.smtpServer', e.target.value)}
                placeholder="smtp.gmail.com"
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
                label="اسم المستخدم"
                value={settings?.email?.username || ''}
                onChange={e => handleSettingChange('email.username', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="password"
                label="كلمة المرور"
                value={settings?.email?.password || ''}
                onChange={e => handleSettingChange('email.password', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="email"
                label="بريد المرسل"
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
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.email?.enableSSL !== false}
                    onChange={e => handleSettingChange('email.enableSSL', e.target.checked)}
                  />
                }
                label="تفعيل SSL"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.email?.enableTLS !== false}
                    onChange={e => handleSettingChange('email.enableTLS', e.target.checked)}
                  />
                }
                label="تفعيل TLS"
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                type="number"
                label="محاولات إعادة الإرسال"
                value={settings?.email?.maxRetrySend || 3}
                onChange={e => handleSettingChange('email.maxRetrySend', parseInt(e.target.value))}
              />
            </Grid>
          </Grid>
        </SectionCard>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={testingEmail ? <CircularProgress size={18} /> : <SendIcon />}
            onClick={handleTestEmail}
            disabled={testingEmail}
          >
            إرسال بريد تجريبي
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ResetIcon />}
            onClick={() => openResetDialog('email')}
          >
            إعادة تعيين
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => handleSaveSection('email')}
            disabled={saving}
          >
            حفظ إعدادات البريد
          </Button>
        </Box>
      </TabPanel>

      {/* ═══════ TAB 5 — Backup ════════════════════════════ */}
      <TabPanel value={activeTab} index={5}>
        <SectionCard
          title="النسخ الاحتياطي والاستعادة"
          icon={<BackupIcon sx={{ color: statusColors.success }} />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              {settings?.backup?.lastBackupDate ? (
                <Alert
                  severity={
                    settings?.backup?.lastBackupStatus === 'success' ? 'success' : 'warning'
                  }
                  sx={{ mb: 2 }}
                >
                  آخر نسخ احتياطي:{' '}
                  {new Date(settings.backup.lastBackupDate).toLocaleString('ar-SA')} — الحالة:{' '}
                  {settings.backup.lastBackupStatus === 'success' ? 'ناجح' : 'فشل'}
                </Alert>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  لم يتم إجراء نسخ احتياطي بعد
                </Alert>
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.backup?.autoBackup !== false}
                    onChange={e => handleSettingChange('backup.autoBackup', e.target.checked)}
                  />
                }
                label="النسخ الاحتياطي التلقائي"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.backup?.compressionEnabled !== false}
                    onChange={e =>
                      handleSettingChange('backup.compressionEnabled', e.target.checked)
                    }
                  />
                }
                label="ضغط النسخ الاحتياطية"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.backup?.encryptBackup || false}
                    onChange={e => handleSettingChange('backup.encryptBackup', e.target.checked)}
                  />
                }
                label="تشفير النسخ الاحتياطية"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="تكرار النسخ (ساعات)"
                value={settings?.backup?.backupFrequency || 24}
                onChange={e =>
                  handleSettingChange('backup.backupFrequency', parseInt(e.target.value))
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="الاحتفاظ بالنسخ (أيام)"
                value={settings?.backup?.backupRetention || 30}
                onChange={e =>
                  handleSettingChange('backup.backupRetention', parseInt(e.target.value))
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>مكان التخزين</InputLabel>
                <Select
                  value={settings?.backup?.backupLocation || 'local'}
                  label="مكان التخزين"
                  onChange={e => handleSettingChange('backup.backupLocation', e.target.value)}
                >
                  <MenuItem value="local">محلي</MenuItem>
                  <MenuItem value="cloud">سحابي</MenuItem>
                  <MenuItem value="both">محلي + سحابي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </SectionCard>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="success"
            startIcon={backingUp ? <CircularProgress size={18} /> : <BackupIcon />}
            onClick={handleTriggerBackup}
            disabled={backingUp}
          >
            نسخ احتياطي الآن
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ResetIcon />}
            onClick={() => openResetDialog('backup')}
          >
            إعادة تعيين
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => handleSaveSection('backup')}
            disabled={saving}
          >
            حفظ إعدادات النسخ
          </Button>
        </Box>
      </TabPanel>

      {/* ═══════ TAB 6 — Integrations ══════════════════════ */}
      <TabPanel value={activeTab} index={6}>
        <SectionCard
          title="التكاملات والخدمات الخارجية"
          icon={<IntegrationIcon sx={{ color: brandColors.primaryStart }} />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>بوابة الرسائل القصيرة</InputLabel>
                <Select
                  value={settings?.integrations?.smsGateway || 'none'}
                  label="بوابة الرسائل القصيرة"
                  onChange={e => handleSettingChange('integrations.smsGateway', e.target.value)}
                >
                  <MenuItem value="none">غير مفعّل</MenuItem>
                  <MenuItem value="twilio">Twilio</MenuItem>
                  <MenuItem value="unifonic">Unifonic</MenuItem>
                  <MenuItem value="mobily">Mobily</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="مفتاح API الرسائل القصيرة"
                type="password"
                value={settings?.integrations?.smsApiKey || ''}
                onChange={e => handleSettingChange('integrations.smsApiKey', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>بوابة الدفع</InputLabel>
                <Select
                  value={settings?.integrations?.paymentGateway || 'none'}
                  label="بوابة الدفع"
                  onChange={e => handleSettingChange('integrations.paymentGateway', e.target.value)}
                >
                  <MenuItem value="none">غير مفعّل</MenuItem>
                  <MenuItem value="moyasar">Moyasar</MenuItem>
                  <MenuItem value="hyperpay">HyperPay</MenuItem>
                  <MenuItem value="tap">Tap</MenuItem>
                  <MenuItem value="stripe">Stripe</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="مفتاح API الدفع"
                type="password"
                value={settings?.integrations?.paymentApiKey || ''}
                onChange={e => handleSettingChange('integrations.paymentApiKey', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="مفتاح Google Maps API"
                type="password"
                value={settings?.integrations?.googleMapsApiKey || ''}
                onChange={e => handleSettingChange('integrations.googleMapsApiKey', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="مفتاح واتساب API"
                type="password"
                value={settings?.integrations?.whatsappApiKey || ''}
                onChange={e => handleSettingChange('integrations.whatsappApiKey', e.target.value)}
              />
            </Grid>
          </Grid>
        </SectionCard>

        <SectionCard
          title="Webhooks و API"
          icon={<IntegrationIcon sx={{ color: statusColors.warning }} />}
          collapsible
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.integrations?.enableApi !== false}
                    onChange={e => handleSettingChange('integrations.enableApi', e.target.checked)}
                  />
                }
                label="تفعيل واجهة API"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="حد الطلبات (في الدقيقة)"
                value={settings?.integrations?.apiRateLimit || 100}
                onChange={e =>
                  handleSettingChange('integrations.apiRateLimit', parseInt(e.target.value))
                }
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.integrations?.enableWebhooks || false}
                    onChange={e =>
                      handleSettingChange('integrations.enableWebhooks', e.target.checked)
                    }
                  />
                }
                label="تفعيل Webhooks"
              />
            </Grid>
            {settings?.integrations?.enableWebhooks && (
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="رابط Webhook"
                  value={settings?.integrations?.webhookUrl || ''}
                  onChange={e => handleSettingChange('integrations.webhookUrl', e.target.value)}
                  placeholder="https://example.com/webhook"
                />
              </Grid>
            )}
          </Grid>
        </SectionCard>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ResetIcon />}
            onClick={() => openResetDialog('integrations')}
          >
            إعادة تعيين
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => handleSaveSection('integrations')}
            disabled={saving}
          >
            حفظ إعدادات التكاملات
          </Button>
        </Box>
      </TabPanel>

      {/* ═══════ TAB 7 — Regional / Compliance ═════════════ */}
      <TabPanel value={activeTab} index={7}>
        <SectionCard
          title="الإعدادات الإقليمية والامتثال"
          icon={<PublicIcon sx={{ color: statusColors.success }} />}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>الدولة</InputLabel>
                <Select
                  value={settings?.regional?.country || 'SA'}
                  label="الدولة"
                  onChange={e => handleSettingChange('regional.country', e.target.value)}
                >
                  <MenuItem value="SA">المملكة العربية السعودية</MenuItem>
                  <MenuItem value="AE">الإمارات</MenuItem>
                  <MenuItem value="KW">الكويت</MenuItem>
                  <MenuItem value="BH">البحرين</MenuItem>
                  <MenuItem value="QA">قطر</MenuItem>
                  <MenuItem value="OM">عمان</MenuItem>
                  <MenuItem value="EG">مصر</MenuItem>
                  <MenuItem value="JO">الأردن</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="المنطقة"
                value={settings?.regional?.region || ''}
                onChange={e => handleSettingChange('regional.region', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="الرقم الضريبي (VAT)"
                value={settings?.regional?.vatNumber || ''}
                onChange={e => handleSettingChange('regional.vatNumber', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="نسبة ضريبة القيمة المضافة (%)"
                value={settings?.regional?.vatRate || 15}
                onChange={e => handleSettingChange('regional.vatRate', parseFloat(e.target.value))}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.regional?.enableVAT !== false}
                    onChange={e => handleSettingChange('regional.enableVAT', e.target.checked)}
                  />
                }
                label="تفعيل ضريبة القيمة المضافة"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings?.regional?.enableZakat !== false}
                    onChange={e => handleSettingChange('regional.enableZakat', e.target.checked)}
                  />
                }
                label="تفعيل حساب الزكاة"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="بداية السنة المالية"
                value={settings?.regional?.fiscalYearStart || '01-01'}
                onChange={e => handleSettingChange('regional.fiscalYearStart', e.target.value)}
                placeholder="MM-DD"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>وضع الامتثال</InputLabel>
                <Select
                  value={settings?.regional?.complianceMode || 'saudi'}
                  label="وضع الامتثال"
                  onChange={e => handleSettingChange('regional.complianceMode', e.target.value)}
                >
                  <MenuItem value="saudi">سعودي</MenuItem>
                  <MenuItem value="gcc">خليجي</MenuItem>
                  <MenuItem value="international">دولي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </SectionCard>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ResetIcon />}
            onClick={() => openResetDialog('regional')}
          >
            إعادة تعيين
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={() => handleSaveSection('regional')}
            disabled={saving}
          >
            حفظ الإعدادات الإقليمية
          </Button>
        </Box>
      </TabPanel>

      {/* ═══════ Bottom Action Bar ═════════════════════════ */}
      <Fade in={hasChanges}>
        <Paper
          elevation={8}
          sx={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            px: 4,
            py: 2,
            borderRadius: 3,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            zIndex: 1200,
            bgcolor: 'background.paper',
            border: '2px solid',
            borderColor: statusColors.warning,
          }}
        >
          <WarningIcon color="warning" />
          <Typography fontWeight="bold">لديك تغييرات غير محفوظة</Typography>
          <Button variant="outlined" onClick={handleDiscardChanges}>
            تراجع
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />}
            onClick={handleSaveSettings}
            disabled={saving}
          >
            حفظ جميع التغييرات
          </Button>
        </Paper>
      </Fade>

      {/* ═══════ Reset Confirmation Dialog ═════════════════ */}
      <Dialog open={resetDialog} onClose={() => setResetDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          تأكيد إعادة التعيين
        </DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mt: 1 }}>
            {resetTarget === 'all'
              ? 'سيتم إعادة تعيين جميع الإعدادات إلى القيم الافتراضية. هذا الإجراء لا يمكن التراجع عنه.'
              : `سيتم إعادة تعيين قسم "${resetTarget}" إلى القيم الافتراضية.`}
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={<ResetIcon />}
            onClick={handleResetConfirm}
          >
            إعادة تعيين
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════ Import Dialog ═════════════════════════════ */}
      <Dialog open={importDialog} onClose={() => setImportDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <UploadIcon color="primary" />
          استيراد الإعدادات
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
            سيتم استبدال الإعدادات الحالية بالإعدادات المستوردة. تأكد من صحة الملف.
          </Alert>
          <TextField
            fullWidth
            multiline
            rows={10}
            value={importJson}
            onChange={e => setImportJson(e.target.value)}
            label="محتوى JSON"
            dir="ltr"
            sx={{ fontFamily: 'monospace' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setImportDialog(false)}>إلغاء</Button>
          <Button variant="contained" startIcon={<UploadIcon />} onClick={handleImportConfirm}>
            استيراد
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══════ History Dialog ═════════════════════════════ */}
      <Dialog open={historyDialog} onClose={() => setHistoryDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="primary" />
          سجل التغييرات
        </DialogTitle>
        <DialogContent>
          {history.length === 0 ? (
            <Alert severity="info" sx={{ mt: 1 }}>
              لا توجد تغييرات مسجلة بعد
            </Alert>
          ) : (
            <List>
              {history.map((entry, idx) => (
                <ListItem key={idx} divider>
                  <ListItemIcon>
                    <HistoryIcon color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip
                          label={entry.section || 'عام'}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Typography variant="body2">{entry.changes?.action || 'تحديث'}</Typography>
                      </Box>
                    }
                    secondary={new Date(entry.changedAt).toLocaleString('ar-SA')}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default AdminSystemSettings;
