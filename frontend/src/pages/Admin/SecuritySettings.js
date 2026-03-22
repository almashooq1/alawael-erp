import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Typography,
  Grid,
  Paper,
  Box,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  IconButton,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  LinearProgress,
  Tooltip,
  Card,
  CardContent,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  InputAdornment,
  Slider,
  Collapse,
  Badge,
} from '@mui/material';
import {
  Shield,
  History,
  Lock,
  ContentCopy as CopyIcon,
  Visibility,
  VisibilityOff,
  Security as SecurityIcon,
  Devices,
  VpnKey,
  Delete,
  Refresh,
  ExpandMore,
  ExpandLess,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  TrendingUp,
  Block,
  Settings,
  Assessment,
  Policy,
  GppGood,
  GppBad,
  Laptop,
  PhoneAndroid,
  DesktopWindows,
  Logout,
  Add,
  Remove,
  Save,
} from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';
import { useSnackbar } from '../../contexts/SnackbarContext';
import ConfirmDialog, { useConfirmDialog } from '../../components/common/ConfirmDialog';
import { gradients } from '../../theme/palette';
import securityService from '../../services/security.service';

/* ─── Tab Panel ─── */
function TabPanel({ children, value, index, ...other }) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

/* ─── Severity Chip ─── */
function SeverityChip({ severity }) {
  const colors = { low: 'default', medium: 'warning', high: 'error', critical: 'error' };
  const labels = { low: 'منخفض', medium: 'متوسط', high: 'عالي', critical: 'حرج' };
  return (
    <Chip size="small" color={colors[severity] || 'default'} label={labels[severity] || severity} />
  );
}

/* ─── Device Icon ─── */
function DeviceIcon({ type }) {
  if (type === 'mobile') return <PhoneAndroid fontSize="small" />;
  if (type === 'desktop') return <DesktopWindows fontSize="small" />;
  return <Laptop fontSize="small" />;
}

/* ─────────────────────────────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────────────────────────────── */
export default function SecuritySettings() {
  const showSnackbar = useSnackbar();
  const { confirmState, showConfirm, handleConfirm, handleCancel } = useConfirmDialog();

  /* ── Global State ── */
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  /* ── Profile & MFA ── */
  const [profile, setProfile] = useState(null);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [setupDialog, setSetupDialog] = useState(false);
  const [setupStep, setSetupStep] = useState(1); // 1=QR, 2=verify, 3=backup
  const [secretData, setSecretData] = useState(null);
  const [mfaToken, setMfaToken] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [showSecret, setShowSecret] = useState(false);

  /* ── Password Change ── */
  const [passwordDialog, setPasswordDialog] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  /* ── Sessions ── */
  const [sessions, setSessions] = useState([]);

  /* ── Security Logs ── */
  const [logs, setLogs] = useState([]);
  const [logsPagination, setLogsPagination] = useState({ page: 1, total: 0 });
  const [logsFilter, setLogsFilter] = useState({ severity: '', eventType: '' });

  /* ── Security Policy ── */
  const [policy, setPolicy] = useState(null);
  const [policyDirty, setPolicyDirty] = useState(false);

  /* ── IP Lists ── */
  const [newIp, setNewIp] = useState('');
  const [ipListType, setIpListType] = useState('whitelist');

  /* ── Analytics ── */
  const [overview, setOverview] = useState(null);

  /* ── Ref to track mounted ── */
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    []
  );

  /* ─── Data Loading ─── */
  const loadProfile = useCallback(async () => {
    try {
      const res = await securityService.getProfile();
      if (mounted.current && res?.data) {
        setProfile(res.data);
        setMfaEnabled(!!res.data.mfaEnabled);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const res = await securityService.getSessions();
      if (mounted.current) setSessions(res?.data || []);
    } catch {
      /* ignore */
    }
  }, []);

  const loadLogs = useCallback(
    async (page = 1) => {
      try {
        const params = { page, limit: 20 };
        if (logsFilter.severity) params.severity = logsFilter.severity;
        if (logsFilter.eventType) params.eventType = logsFilter.eventType;
        const res = await securityService.getMyLogs(params);
        if (mounted.current && res?.data) {
          setLogs(res.data.logs || []);
          setLogsPagination(res.data.pagination || { page, total: 0 });
        }
      } catch {
        setLogs([]);
      }
    },
    [logsFilter]
  );

  const loadPolicy = useCallback(async () => {
    try {
      const res = await securityService.getPolicy();
      if (mounted.current && res?.data) setPolicy(res.data);
    } catch {
      /* ignore */
    }
  }, []);

  const loadOverview = useCallback(async () => {
    try {
      const res = await securityService.getOverview();
      if (mounted.current && res?.data) setOverview(res.data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.allSettled([
        loadProfile(),
        loadSessions(),
        loadLogs(),
        loadPolicy(),
        loadOverview(),
      ]);
      if (mounted.current) setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  /* ─── MFA Handlers ─── */
  const handleSetupMfa = async () => {
    setActionLoading(true);
    try {
      const res = await securityService.setupMfa();
      if (res?.data) {
        setSecretData(res.data);
        setSetupStep(1);
        setMfaToken('');
        setSetupDialog(true);
      }
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'حدث خطأ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerifyMfa = async () => {
    if (mfaToken.length < 6) return showSnackbar('أدخل رمز التحقق (6 أرقام)', 'warning');
    setActionLoading(true);
    try {
      const res = await securityService.enableMfa(mfaToken, secretData?.secret);
      if (res?.data) {
        setMfaEnabled(true);
        setBackupCodes(res.data.backupCodes || []);
        setSetupStep(3);
        showSnackbar('تم تفعيل المصادقة الثنائية بنجاح', 'success');
      }
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'رمز التحقق غير صحيح', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisableMfa = () => {
    showConfirm({
      title: 'إلغاء المصادقة الثنائية',
      message: 'هل أنت متأكد من إلغاء المصادقة الثنائية؟ يقلل هذا من مستوى أمان حسابك.',
      confirmText: 'إلغاء التفعيل',
      severity: 'error',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          await securityService.disableMfa();
          setMfaEnabled(false);
          showSnackbar('تم إلغاء المصادقة الثنائية', 'info');
          loadProfile();
        } catch (err) {
          showSnackbar(err?.response?.data?.message || 'حدث خطأ', 'error');
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleRegenerateBackup = async () => {
    setActionLoading(true);
    try {
      const res = await securityService.regenerateBackupCodes();
      if (res?.data?.backupCodes) {
        setBackupCodes(res.data.backupCodes);
        setSetupStep(3);
        setSetupDialog(true);
        showSnackbar('تم إعادة إنشاء رموز الاسترداد', 'success');
      }
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'حدث خطأ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /* ─── Password Change ─── */
  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return showSnackbar('جميع الحقول مطلوبة', 'warning');
    if (newPassword !== confirmPassword)
      return showSnackbar('كلمة المرور الجديدة غير متطابقة', 'warning');
    if (newPassword.length < 8)
      return showSnackbar('كلمة المرور يجب أن تكون 8 أحرف على الأقل', 'warning');

    setActionLoading(true);
    try {
      await securityService.changePassword(currentPassword, newPassword);
      showSnackbar('تم تغيير كلمة المرور بنجاح', 'success');
      setPasswordDialog(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      loadProfile();
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'فشل تغيير كلمة المرور', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /* ─── Session Handlers ─── */
  const handleTerminateSession = id => {
    showConfirm({
      title: 'إنهاء الجلسة',
      message: 'هل أنت متأكد من إنهاء هذه الجلسة؟',
      onConfirm: async () => {
        try {
          await securityService.terminateSession(id);
          showSnackbar('تم إنهاء الجلسة', 'success');
          loadSessions();
        } catch (err) {
          showSnackbar('حدث خطأ', 'error');
        }
      },
    });
  };

  const handleLogoutAll = () => {
    showConfirm({
      title: 'تسجيل خروج الكل',
      message: 'سيتم إنهاء جميع الجلسات الأخرى. هل تريد المتابعة؟',
      severity: 'warning',
      onConfirm: async () => {
        try {
          const res = await securityService.logoutAllSessions();
          showSnackbar(`تم إنهاء ${res?.data?.terminated || 0} جلسة`, 'success');
          loadSessions();
        } catch {
          showSnackbar('حدث خطأ', 'error');
        }
      },
    });
  };

  /* ─── Policy Handlers ─── */
  const handlePolicyChange = (key, value) => {
    setPolicy(prev => ({ ...prev, [key]: value }));
    setPolicyDirty(true);
  };

  const handleSavePolicy = async () => {
    setActionLoading(true);
    try {
      await securityService.updatePolicy(policy);
      showSnackbar('تم حفظ سياسة الأمان', 'success');
      setPolicyDirty(false);
    } catch (err) {
      showSnackbar(err?.response?.data?.message || 'حدث خطأ', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  /* ─── IP Handlers ─── */
  const handleAddIp = async () => {
    if (!newIp || !/^[\d.:/]+$/.test(newIp)) return showSnackbar('أدخل عنوان IP صحيح', 'warning');
    try {
      if (ipListType === 'whitelist') {
        await securityService.addIpWhitelist(newIp);
      } else {
        await securityService.addIpBlacklist(newIp);
      }
      setNewIp('');
      showSnackbar('تمت إضافة العنوان', 'success');
      loadPolicy();
    } catch {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  const handleRemoveIp = async (ip, type) => {
    try {
      if (type === 'whitelist') await securityService.removeIpWhitelist(ip);
      else await securityService.removeIpBlacklist(ip);
      showSnackbar('تمت إزالة العنوان', 'success');
      loadPolicy();
    } catch {
      showSnackbar('حدث خطأ', 'error');
    }
  };

  /* ─── Copy utility ─── */
  const copyToClipboard = text => {
    navigator.clipboard?.writeText(text);
    showSnackbar('تم النسخ', 'success');
  };

  /* ─── Format date ─── */
  const fmtDate = d => {
    if (!d) return '—';
    return new Date(d).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' });
  };

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */
  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={48} />
        <Typography sx={{ mt: 2 }}>جاري تحميل إعدادات الأمان...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* ── Header ── */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          background: gradients.warning,
          color: '#fff',
          borderRadius: 3,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SecurityIcon sx={{ fontSize: 40 }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>
              إعدادات الأمان المتقدمة
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              إدارة المصادقة الثنائية، الجلسات، كلمة المرور، السياسات الأمنية، والتحليلات
            </Typography>
          </Box>
          {overview && (
            <Box sx={{ ml: 'auto', textAlign: 'center' }}>
              <Typography variant="h3" fontWeight={800}>
                {overview.securityScore}%
              </Typography>
              <Typography variant="caption">نقاط الأمان</Typography>
            </Box>
          )}
        </Box>
      </Paper>

      {/* ── Tabs ── */}
      <Paper elevation={0} sx={{ borderRadius: 3, mb: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab icon={<Shield />} label="المصادقة و كلمة المرور" iconPosition="start" />
          <Tab icon={<Devices />} label="الجلسات النشطة" iconPosition="start" />
          <Tab icon={<History />} label="سجل النشاط" iconPosition="start" />
          <Tab icon={<Policy />} label="السياسات الأمنية" iconPosition="start" />
          <Tab icon={<Assessment />} label="التحليلات" iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ============================== TAB 0 — MFA & Password ============================== */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          {/* MFA Section */}
          <Grid item xs={12} md={7}>
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <VpnKey color="primary" />
                <Typography variant="h6" fontWeight={600}>
                  المصادقة الثنائية (2FA)
                </Typography>
                <Chip
                  size="small"
                  icon={mfaEnabled ? <CheckCircle /> : <ErrorIcon />}
                  color={mfaEnabled ? 'success' : 'default'}
                  label={mfaEnabled ? 'مفعّلة' : 'معطّلة'}
                  sx={{ ml: 'auto' }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                أضف طبقة حماية إضافية لحسابك. يتم استخدام رمز يتغير كل 30 ثانية من تطبيق المصادقة.
              </Typography>

              {mfaEnabled ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                    المصادقة الثنائية مفعّلة منذ {fmtDate(profile?.mfaEnabledAt)}
                  </Alert>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <Button
                      variant="outlined"
                      color="primary"
                      startIcon={<Refresh />}
                      onClick={handleRegenerateBackup}
                      disabled={actionLoading}
                    >
                      إعادة إنشاء رموز الاسترداد
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<GppBad />}
                      onClick={handleDisableMfa}
                      disabled={actionLoading}
                    >
                      إلغاء المصادقة الثنائية
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<GppGood />}
                  onClick={handleSetupMfa}
                  disabled={actionLoading}
                  sx={{ borderRadius: 2 }}
                >
                  تفعيل المصادقة الثنائية
                </Button>
              )}
            </Paper>
          </Grid>

          {/* Password Section */}
          <Grid item xs={12} md={5}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'divider',
                height: '100%',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Lock color="warning" />
                <Typography variant="h6" fontWeight={600}>
                  كلمة المرور
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                آخر تغيير: {fmtDate(profile?.passwordChangedAt) || 'لم يتم التغيير'}
              </Typography>
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                يُنصح بتغيير كلمة المرور كل 90 يومًا
              </Alert>
              <Button
                variant="contained"
                color="warning"
                startIcon={<Lock />}
                onClick={() => setPasswordDialog(true)}
                disabled={actionLoading}
                sx={{ borderRadius: 2 }}
              >
                تغيير كلمة المرور
              </Button>
            </Paper>
          </Grid>

          {/* Quick Stats */}
          <Grid item xs={12}>
            <Grid container spacing={2}>
              {[
                {
                  icon: <Devices color="primary" />,
                  label: 'الجلسات النشطة',
                  value: profile?.activeSessions || 0,
                  color: 'primary.main',
                },
                {
                  icon: <Shield color="success" />,
                  label: 'المصادقة الثنائية',
                  value: mfaEnabled ? 'مفعّلة' : 'معطّلة',
                  color: mfaEnabled ? 'success.main' : 'text.secondary',
                },
                {
                  icon: <SecurityIcon color="info" />,
                  label: 'الأجهزة الموثوقة',
                  value: profile?.trustedDevicesCount || 0,
                  color: 'info.main',
                },
                {
                  icon: <History color="warning" />,
                  label: 'آخر نشاط أمني',
                  value: profile?.recentActivity?.[0]
                    ? fmtDate(profile.recentActivity[0].timestamp)
                    : 'لا يوجد',
                  color: 'warning.main',
                },
              ].map((stat, i) => (
                <Grid item xs={6} md={3} key={i}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      textAlign: 'center',
                    }}
                  >
                    {stat.icon}
                    <Typography variant="h6" fontWeight={700} color={stat.color}>
                      {stat.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {stat.label}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </TabPanel>

      {/* ============================== TAB 1 — Sessions ============================== */}
      <TabPanel value={tab} index={1}>
        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
        >
          <Box
            sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Devices color="primary" />
              <Typography variant="h6" fontWeight={600}>
                الجلسات النشطة ({sessions.length})
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button startIcon={<Refresh />} onClick={loadSessions} size="small">
                تحديث
              </Button>
              {sessions.length > 1 && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<Logout />}
                  onClick={handleLogoutAll}
                  size="small"
                >
                  تسجيل خروج الكل
                </Button>
              )}
            </Box>
          </Box>

          {sessions.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              لا توجد جلسات نشطة
            </Alert>
          ) : (
            <List disablePadding>
              {sessions.map((s, idx) => (
                <Box key={s._id || idx}>
                  {idx > 0 && <Divider />}
                  <ListItem
                    sx={{ py: 2 }}
                    secondaryAction={
                      <Tooltip title="إنهاء الجلسة">
                        <IconButton
                          edge="end"
                          color="error"
                          onClick={() => handleTerminateSession(s._id)}
                        >
                          <Delete />
                        </IconButton>
                      </Tooltip>
                    }
                  >
                    <ListItemIcon>
                      <DeviceIcon type={s.device?.type} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography fontWeight={600}>
                            {s.device?.browser || s.userAgent?.substring(0, 30) || 'جهاز غير معروف'}
                          </Typography>
                          {s.isCurrent && (
                            <Chip size="small" label="الجلسة الحالية" color="primary" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box component="span" sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                          <span>IP: {s.ipAddress || '—'}</span>
                          <span>
                            {s.location?.city ? `${s.location.city}, ${s.location.country}` : ''}
                          </span>
                          <span>آخر نشاط: {fmtDate(s.lastActivity)}</span>
                        </Box>
                      }
                    />
                  </ListItem>
                </Box>
              ))}
            </List>
          )}
        </Paper>
      </TabPanel>

      {/* ============================== TAB 2 — Activity Logs ============================== */}
      <TabPanel value={tab} index={2}>
        <Paper
          elevation={0}
          sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <History color="primary" />
            <Typography variant="h6" fontWeight={600}>
              سجل النشاط الأمني
            </Typography>
          </Box>

          {/* Filters */}
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
            <TextField
              select
              size="small"
              label="الأهمية"
              value={logsFilter.severity}
              onChange={e => setLogsFilter(p => ({ ...p, severity: e.target.value }))}
              sx={{ minWidth: 120 }}
              SelectProps={{ native: true }}
            >
              <option value="">الكل</option>
              <option value="low">منخفض</option>
              <option value="medium">متوسط</option>
              <option value="high">عالي</option>
              <option value="critical">حرج</option>
            </TextField>
            <TextField
              select
              size="small"
              label="نوع الحدث"
              value={logsFilter.eventType}
              onChange={e => setLogsFilter(p => ({ ...p, eventType: e.target.value }))}
              sx={{ minWidth: 140 }}
              SelectProps={{ native: true }}
            >
              <option value="">الكل</option>
              <option value="login">تسجيل دخول</option>
              <option value="logout">تسجيل خروج</option>
              <option value="modification">تعديل</option>
              <option value="failed_auth">محاولة فاشلة</option>
              <option value="suspicious">نشاط مشبوه</option>
            </TextField>
            <Button startIcon={<Refresh />} onClick={() => loadLogs(1)} size="small">
              تحديث
            </Button>
          </Box>

          {logs.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              لا توجد سجلات أمنية بعد
            </Alert>
          ) : (
            <>
              <Table size="small" sx={{ mb: 2 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>الإجراء</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الأهمية</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>IP</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {logs.map((log, i) => (
                    <TableRow key={log._id || i} hover>
                      <TableCell>{log.action || log.details?.body?.message || '—'}</TableCell>
                      <TableCell>
                        <SeverityChip severity={log.severity} />
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {log.ip || '—'}
                      </TableCell>
                      <TableCell>{fmtDate(log.timestamp || log.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                <Button
                  size="small"
                  disabled={logsPagination.page <= 1}
                  onClick={() => loadLogs(logsPagination.page - 1)}
                >
                  السابق
                </Button>
                <Chip
                  label={`${logsPagination.page} / ${Math.ceil((logsPagination.total || 1) / 20)}`}
                  size="small"
                />
                <Button
                  size="small"
                  disabled={logsPagination.page * 20 >= logsPagination.total}
                  onClick={() => loadLogs(logsPagination.page + 1)}
                >
                  التالي
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </TabPanel>

      {/* ============================== TAB 3 — Security Policy ============================== */}
      <TabPanel value={tab} index={3}>
        <Grid container spacing={3}>
          {/* Session & Login Policy */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
            >
              <Typography
                variant="h6"
                fontWeight={600}
                sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Settings color="primary" />
                سياسة الجلسات وتسجيل الدخول
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  مهلة الجلسة (دقائق): <b>{policy?.sessionTimeout || 480}</b>
                </Typography>
                <Slider
                  value={policy?.sessionTimeout || 480}
                  onChange={(_, v) => handlePolicyChange('sessionTimeout', v)}
                  min={5}
                  max={1440}
                  step={5}
                  marks={[
                    { value: 30, label: '30د' },
                    { value: 480, label: '8س' },
                    { value: 1440, label: '24س' },
                  ]}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  أقصى عدد جلسات متزامنة: <b>{policy?.maxConcurrentSessions || 5}</b>
                </Typography>
                <Slider
                  value={policy?.maxConcurrentSessions || 5}
                  onChange={(_, v) => handlePolicyChange('maxConcurrentSessions', v)}
                  min={1}
                  max={20}
                  marks
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  أقصى محاولات تسجيل دخول فاشلة: <b>{policy?.maxLoginAttempts || 5}</b>
                </Typography>
                <Slider
                  value={policy?.maxLoginAttempts || 5}
                  onChange={(_, v) => handlePolicyChange('maxLoginAttempts', v)}
                  min={3}
                  max={20}
                  marks
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  مدة قفل الحساب (دقائق): <b>{policy?.lockoutDuration || 30}</b>
                </Typography>
                <Slider
                  value={policy?.lockoutDuration || 30}
                  onChange={(_, v) => handlePolicyChange('lockoutDuration', v)}
                  min={5}
                  max={120}
                  step={5}
                  marks={[
                    { value: 5, label: '5د' },
                    { value: 30, label: '30د' },
                    { value: 120, label: '2س' },
                  ]}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Password Policy */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
            >
              <Typography
                variant="h6"
                fontWeight={600}
                sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Lock color="warning" />
                سياسة كلمة المرور
              </Typography>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" gutterBottom>
                  الحد الأدنى لطول كلمة المرور: <b>{policy?.passwordMinLength || 8}</b>
                </Typography>
                <Slider
                  value={policy?.passwordMinLength || 8}
                  onChange={(_, v) => handlePolicyChange('passwordMinLength', v)}
                  min={6}
                  max={32}
                  marks={[
                    { value: 8, label: '8' },
                    { value: 16, label: '16' },
                    { value: 32, label: '32' },
                  ]}
                />
              </Box>

              {[
                { key: 'passwordRequireUppercase', label: 'يتطلب أحرف كبيرة (A-Z)' },
                { key: 'passwordRequireLowercase', label: 'يتطلب أحرف صغيرة (a-z)' },
                { key: 'passwordRequireNumbers', label: 'يتطلب أرقام (0-9)' },
                { key: 'passwordRequireSpecial', label: 'يتطلب رموز خاصة (!@#$)' },
              ].map(({ key, label }) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Switch
                      checked={!!policy?.[key]}
                      onChange={e => handlePolicyChange(key, e.target.checked)}
                      color="warning"
                    />
                  }
                  label={label}
                  sx={{ display: 'block', mb: 1 }}
                />
              ))}

              <Divider sx={{ my: 2 }} />

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" gutterBottom>
                  انتهاء صلاحية كلمة المرور (أيام): <b>{policy?.passwordExpiryDays || 90}</b>
                  {policy?.passwordExpiryDays === 0 && ' (لا تنتهي)'}
                </Typography>
                <Slider
                  value={policy?.passwordExpiryDays || 90}
                  onChange={(_, v) => handlePolicyChange('passwordExpiryDays', v)}
                  min={0}
                  max={365}
                  step={15}
                />
              </Box>
            </Paper>
          </Grid>

          {/* Notifications & Extra Options */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
            >
              <Typography
                variant="h6"
                fontWeight={600}
                sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Warning color="error" />
                الإشعارات الأمنية
              </Typography>

              {[
                { key: 'notifyOnNewLogin', label: 'إشعار عند تسجيل دخول جديد' },
                { key: 'notifyOnPasswordChange', label: 'إشعار عند تغيير كلمة المرور' },
                { key: 'notifyOnMfaChange', label: 'إشعار عند تغيير المصادقة الثنائية' },
                { key: 'notifyOnSuspiciousActivity', label: 'إشعار عند نشاط مشبوه' },
                { key: 'requireMfa', label: 'إجبار المصادقة الثنائية لجميع المستخدمين' },
                { key: 'autoLogoutInactive', label: 'تسجيل خروج تلقائي عند عدم النشاط' },
              ].map(({ key, label }) => (
                <FormControlLabel
                  key={key}
                  control={
                    <Switch
                      checked={!!policy?.[key]}
                      onChange={e => handlePolicyChange(key, e.target.checked)}
                      color="primary"
                    />
                  }
                  label={label}
                  sx={{ display: 'block', mb: 0.5 }}
                />
              ))}
            </Paper>
          </Grid>

          {/* IP Management */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
            >
              <Typography
                variant="h6"
                fontWeight={600}
                sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
              >
                <Block color="error" />
                إدارة عناوين IP
              </Typography>

              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <TextField
                  select
                  size="small"
                  value={ipListType}
                  onChange={e => setIpListType(e.target.value)}
                  SelectProps={{ native: true }}
                >
                  <option value="whitelist">القائمة البيضاء</option>
                  <option value="blacklist">القائمة السوداء</option>
                </TextField>
                <TextField
                  size="small"
                  placeholder="مثال: 192.168.1.1"
                  value={newIp}
                  onChange={e => setNewIp(e.target.value)}
                  sx={{ flex: 1 }}
                />
                <Button variant="contained" size="small" startIcon={<Add />} onClick={handleAddIp}>
                  إضافة
                </Button>
              </Box>

              {/* Whitelist */}
              {policy?.ipWhitelist?.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" fontWeight={600} color="success.main">
                    القائمة البيضاء:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {policy.ipWhitelist.map(ip => (
                      <Chip
                        key={ip}
                        label={ip}
                        size="small"
                        color="success"
                        variant="outlined"
                        onDelete={() => handleRemoveIp(ip, 'whitelist')}
                      />
                    ))}
                  </Box>
                </Box>
              )}

              {/* Blacklist */}
              {policy?.ipBlacklist?.length > 0 && (
                <Box>
                  <Typography variant="caption" fontWeight={600} color="error.main">
                    القائمة السوداء:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                    {policy.ipBlacklist.map(ip => (
                      <Chip
                        key={ip}
                        label={ip}
                        size="small"
                        color="error"
                        variant="outlined"
                        onDelete={() => handleRemoveIp(ip, 'blacklist')}
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Save Button */}
          {policyDirty && (
            <Grid item xs={12}>
              <Box sx={{ textAlign: 'center' }}>
                <Button
                  variant="contained"
                  size="large"
                  color="primary"
                  startIcon={<Save />}
                  onClick={handleSavePolicy}
                  disabled={actionLoading}
                  sx={{ borderRadius: 2, px: 5 }}
                >
                  حفظ السياسات الأمنية
                </Button>
              </Box>
            </Grid>
          )}
        </Grid>
      </TabPanel>

      {/* ============================== TAB 4 — Analytics ============================== */}
      <TabPanel value={tab} index={4}>
        {!overview ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Score + Key Metrics */}
            <Grid item xs={12}>
              <Grid container spacing={2}>
                {[
                  {
                    icon: <GppGood sx={{ fontSize: 36 }} color="success" />,
                    value: `${overview.securityScore}%`,
                    label: 'نقاط الأمان',
                    bg: 'success.light',
                  },
                  {
                    icon: <Shield sx={{ fontSize: 36 }} color="primary" />,
                    value: `${overview.mfaAdoptionRate}%`,
                    label: 'نسبة تفعيل 2FA',
                    bg: 'primary.light',
                  },
                  {
                    icon: <Devices sx={{ fontSize: 36 }} color="info" />,
                    value: overview.activeSessions,
                    label: 'الجلسات النشطة',
                    bg: 'info.light',
                  },
                  {
                    icon: <Warning sx={{ fontSize: 36 }} color="warning" />,
                    value: overview.failedLogins24h,
                    label: 'محاولات فاشلة (24س)',
                    bg: 'warning.light',
                  },
                  {
                    icon: <ErrorIcon sx={{ fontSize: 36 }} color="error" />,
                    value: overview.criticalEvents,
                    label: 'أحداث حرجة (7أيام)',
                    bg: 'error.light',
                  },
                  {
                    icon: <TrendingUp sx={{ fontSize: 36 }} color="secondary" />,
                    value: overview.logs24h,
                    label: 'أحداث أمنية (24س)',
                    bg: 'secondary.light',
                  },
                ].map((m, i) => (
                  <Grid item xs={6} sm={4} md={2} key={i}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        textAlign: 'center',
                        border: '1px solid',
                        borderColor: 'divider',
                      }}
                    >
                      {m.icon}
                      <Typography variant="h5" fontWeight={800}>
                        {m.value}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {m.label}
                      </Typography>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Grid>

            {/* Events by Severity */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  الأحداث حسب الأهمية (30 يوم)
                </Typography>
                {(overview.logsBySeverity || []).length === 0 ? (
                  <Typography color="text.secondary">لا توجد بيانات</Typography>
                ) : (
                  overview.logsBySeverity.map(item => {
                    const total = overview.logsBySeverity.reduce((s, x) => s + x.count, 0) || 1;
                    const pct = Math.round((item.count / total) * 100);
                    const colors = {
                      low: '#4caf50',
                      medium: '#ff9800',
                      high: '#f44336',
                      critical: '#9c27b0',
                    };
                    const labels = { low: 'منخفض', medium: 'متوسط', high: 'عالي', critical: 'حرج' };
                    return (
                      <Box key={item._id} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {labels[item._id] || item._id}
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {item.count} ({pct}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': { bgcolor: colors[item._id] || '#2196f3' },
                          }}
                        />
                      </Box>
                    );
                  })
                )}
              </Paper>
            </Grid>

            {/* Events by Type */}
            <Grid item xs={12} md={6}>
              <Paper
                elevation={0}
                sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
                  الأحداث حسب النوع (30 يوم)
                </Typography>
                {(overview.logsByType || []).length === 0 ? (
                  <Typography color="text.secondary">لا توجد بيانات</Typography>
                ) : (
                  overview.logsByType.map(item => {
                    const total = overview.logsByType.reduce((s, x) => s + x.count, 0) || 1;
                    const pct = Math.round((item.count / total) * 100);
                    const typeLabels = {
                      login: 'تسجيل دخول',
                      logout: 'تسجيل خروج',
                      modification: 'تعديل',
                      deletion: 'حذف',
                      failed_auth: 'محاولة فاشلة',
                      suspicious: 'نشاط مشبوه',
                      access: 'وصول',
                    };
                    return (
                      <Box key={item._id} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {typeLabels[item._id] || item._id}
                          </Typography>
                          <Typography variant="body2" fontWeight={600}>
                            {item.count} ({pct}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{ height: 8, borderRadius: 4, bgcolor: 'grey.200' }}
                        />
                      </Box>
                    );
                  })
                )}
              </Paper>
            </Grid>

            {/* Recent Critical Events */}
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
              >
                <Typography
                  variant="h6"
                  fontWeight={600}
                  sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                >
                  <ErrorIcon color="error" />
                  آخر الأحداث الحرجة والعالية
                </Typography>
                {(overview.recentCritical || []).length === 0 ? (
                  <Alert severity="success" sx={{ borderRadius: 2 }}>
                    لا توجد أحداث حرجة! النظام آمن.
                  </Alert>
                ) : (
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>الإجراء</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>المستخدم</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>الأهمية</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {overview.recentCritical.map((log, i) => (
                        <TableRow key={log._id || i} hover>
                          <TableCell>{log.action}</TableCell>
                          <TableCell>{log.userId?.name || log.userId?.email || '—'}</TableCell>
                          <TableCell>
                            <SeverityChip severity={log.severity} />
                          </TableCell>
                          <TableCell>{fmtDate(log.timestamp)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Paper>
            </Grid>

            {/* Refresh Button */}
            <Grid item xs={12} sx={{ textAlign: 'center' }}>
              <Button startIcon={<Refresh />} onClick={loadOverview} variant="outlined">
                تحديث التحليلات
              </Button>
            </Grid>
          </Grid>
        )}
      </TabPanel>

      {/* ═══════════════════════════════════════════════════════════════════
         DIALOGS
         ═══════════════════════════════════════════════════════════════════ */}

      {/* ── MFA Setup Dialog ── */}
      <Dialog
        open={setupDialog}
        onClose={() => {
          if (setupStep !== 2) setSetupDialog(false);
        }}
        maxWidth="sm"
        fullWidth
      >
        {/* Step 1 — QR Code */}
        {setupStep === 1 && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>إعداد المصادقة الثنائية — الخطوة 1</DialogTitle>
            <DialogContent>
              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                امسح رمز QR التالي باستخدام تطبيق المصادقة (مثل Google Authenticator أو Authy)
              </Alert>
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                {secretData?.otpauthUrl && <QRCodeSVG value={secretData.otpauthUrl} size={200} />}
              </Box>
              <Box sx={{ textAlign: 'center', mt: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  أو أدخل الرمز يدوياً:
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    mt: 0.5,
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: 'monospace',
                      bgcolor: 'grey.100',
                      px: 2,
                      py: 0.5,
                      borderRadius: 1,
                    }}
                  >
                    {showSecret ? secretData?.secret : '••••••••••••••••'}
                  </Typography>
                  <IconButton size="small" onClick={() => setShowSecret(!showSecret)}>
                    {showSecret ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                  <IconButton size="small" onClick={() => copyToClipboard(secretData?.secret)}>
                    <CopyIcon />
                  </IconButton>
                </Box>
              </Box>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setSetupDialog(false)}>إلغاء</Button>
              <Button variant="contained" onClick={() => setSetupStep(2)}>
                التالي — إدخال الرمز
              </Button>
            </DialogActions>
          </>
        )}

        {/* Step 2 — Verify Token */}
        {setupStep === 2 && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>التحقق من الرمز — الخطوة 2</DialogTitle>
            <DialogContent>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                أدخل الرمز المكون من 6 أرقام من تطبيق المصادقة
              </Typography>
              <TextField
                fullWidth
                label="رمز التحقق"
                value={mfaToken}
                onChange={e => setMfaToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                inputProps={{
                  maxLength: 6,
                  style: { textAlign: 'center', fontSize: 24, letterSpacing: 8 },
                }}
                autoFocus
              />
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button onClick={() => setSetupStep(1)}>رجوع</Button>
              <Button
                variant="contained"
                color="success"
                onClick={handleVerifyMfa}
                disabled={actionLoading || mfaToken.length < 6}
              >
                {actionLoading ? <CircularProgress size={20} /> : 'تفعيل'}
              </Button>
            </DialogActions>
          </>
        )}

        {/* Step 3 — Backup Codes */}
        {setupStep === 3 && (
          <>
            <DialogTitle sx={{ fontWeight: 700, color: 'success.main' }}>
              ✅ تم التفعيل — رموز الاسترداد
            </DialogTitle>
            <DialogContent>
              <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                احفظ هذه الرموز في مكان آمن. يمكنك استخدامها لتسجيل الدخول إذا فقدت جهازك.
              </Alert>
              <Grid container spacing={1}>
                {backupCodes.map((code, i) => (
                  <Grid item xs={6} key={i}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1,
                        textAlign: 'center',
                        fontFamily: 'monospace',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {code}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
              <Button
                fullWidth
                startIcon={<CopyIcon />}
                onClick={() => copyToClipboard(backupCodes.join('\n'))}
                sx={{ mt: 2 }}
              >
                نسخ جميع الرموز
              </Button>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
              <Button
                variant="contained"
                onClick={() => {
                  setSetupDialog(false);
                  setBackupCodes([]);
                }}
              >
                تم — إغلاق
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ── Password Change Dialog ── */}
      <Dialog
        open={passwordDialog}
        onClose={() => setPasswordDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>تغيير كلمة المرور</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="كلمة المرور الحالية"
            type={showPasswords ? 'text' : 'password'}
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPasswords(!showPasswords)} edge="end">
                    {showPasswords ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
          <TextField
            fullWidth
            label="كلمة المرور الجديدة"
            type={showPasswords ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            sx={{ mb: 2 }}
            helperText="يجب أن تكون 8 أحرف على الأقل وتحتوي على حرف كبير ورقم ورمز خاص"
          />
          <TextField
            fullWidth
            label="تأكيد كلمة المرور الجديدة"
            type={showPasswords ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            error={confirmPassword && newPassword !== confirmPassword}
            helperText={
              confirmPassword && newPassword !== confirmPassword ? 'كلمة المرور غير متطابقة' : ''
            }
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPasswordDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            color="warning"
            onClick={handleChangePassword}
            disabled={actionLoading || !currentPassword || !newPassword}
          >
            {actionLoading ? <CircularProgress size={20} /> : 'تغيير كلمة المرور'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm Dialog ── */}
      <ConfirmDialog {...confirmState} onConfirm={handleConfirm} onCancel={handleCancel} />
    </Container>
  );
}
