import React, { useState, useEffect, memo, useCallback } from 'react';
import {
  Box, Typography, Grid, Avatar, Chip, Switch, Slider,
  TextField, Select, MenuItem, FormControl, InputLabel,
  Button, IconButton, Tooltip, LinearProgress, Divider,
  Dialog, DialogTitle, DialogContent, DialogActions,
  List, ListItem, ListItemText, ListItemAvatar, ListItemSecondaryAction,
  Tabs, Tab, Badge, CircularProgress, Alert, Snackbar,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings, Person, Palette, Notifications, Security,
  Backup, Language, Business, SaveAlt, RestartAlt,
  CheckCircle, Warning, Error as ErrorIcon, Info,
  Brightness4, Brightness7, Translate, Storage,
  CloudUpload, CloudDownload, Schedule, Lock,
  Wifi, Speed, Memory, Dns, AddCircle, DeleteOutline,
  Edit, Visibility, VisibilityOff, PhotoCamera,
  VpnKey, Shield, History, Download, Upload,
  NotificationsActive, NotificationsOff, Email, Sms,
  Tune, ColorLens, TextFields, FormatSize,
} from '@mui/icons-material';

/* ─────────────────── Glass component ─────────────────── */
const Glass = memo(({ children, sx, ...rest }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        background: isDark
          ? 'rgba(255,255,255,0.05)'
          : 'rgba(255,255,255,0.7)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.8)'}`,
        borderRadius: 3,
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
});

/* ─────────────────── KPI Card ─────────────────── */
const KPICard = memo(({ title, value, subtitle, icon, gradient, trend, delay = 0 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 120 }}
      whileHover={{ y: -4, scale: 1.02 }}
    >
      <Glass sx={{ p: 2.5, height: '100%', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'absolute', insetInlineEnd: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: gradient, opacity: 0.15 }} />
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mt: 0.5 }}>{value}</Typography>
            <Typography variant="caption" sx={{ color: trend > 0 ? '#22c55e' : trend < 0 ? '#ef4444' : 'text.secondary', fontWeight: 600 }}>
              {trend > 0 ? `▲ +${trend}%` : trend < 0 ? `▼ ${trend}%` : subtitle}
            </Typography>
            {trend !== 0 && <Typography variant="caption" sx={{ color: 'text.secondary', mr: 0.5 }}> {subtitle}</Typography>}
          </Box>
          <Avatar sx={{ background: gradient, width: 48, height: 48, boxShadow: `0 4px 20px ${gradient.includes('#') ? gradient.split(',')[1]?.replace(/[^#\w]/g,'').substring(0,7) : ''}44` }}>
            {icon}
          </Avatar>
        </Box>
      </Glass>
    </motion.div>
  );
});

/* ─────────────────── Tab Button ─────────────────── */
const TabBtn = memo(({ label, active, onClick, icon, badge }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      onClick={onClick}
      style={{
        border: 'none', cursor: 'pointer', borderRadius: 12, padding: '8px 18px',
        display: 'flex', alignItems: 'center', gap: 6,
        background: active
          ? 'linear-gradient(135deg,#8b5cf6,#6366f1)'
          : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.5)',
        color: active ? '#fff' : isDark ? '#cbd5e1' : '#475569',
        fontWeight: active ? 700 : 500, fontSize: 13,
        transition: 'all 0.2s',
      }}
    >
      {icon && <span style={{ fontSize: 16, display: 'flex' }}>{icon}</span>}
      {label}
      {badge ? <span style={{ background: active ? 'rgba(255,255,255,0.3)' : '#ef4444', color: '#fff', borderRadius: 10, padding: '0 6px', fontSize: 11, fontWeight: 700 }}>{badge}</span> : null}
    </motion.button>
  );
});

/* ─────────────────── Setting Row ─────────────────── */
const SettingRow = memo(({ icon, label, description, children, gradient = 'linear-gradient(135deg,#8b5cf6,#6366f1)' }) => {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
        <Avatar sx={{ background: gradient, width: 36, height: 36 }}>{icon}</Avatar>
        <Box>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>
          {description && <Typography variant="caption" color="text.secondary">{description}</Typography>}
        </Box>
      </Box>
      <Box sx={{ minWidth: 200, display: 'flex', justifyContent: 'flex-end' }}>{children}</Box>
    </Box>
  );
});

/* ─────────────────── User Row ─────────────────── */
const UserRow = memo(({ name, role, email, avatar, status, onEdit, onDelete, delay = 0 }) => {
  const statusColor = status === 'active' ? '#22c55e' : status === 'inactive' ? '#94a3b8' : '#f59e0b';
  const statusLabel = status === 'active' ? 'نشط' : status === 'inactive' ? 'غير نشط' : 'معلق';
  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, type: 'spring' }}>
      <Glass sx={{ p: 2, mb: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar src={avatar} sx={{ width: 44, height: 44, background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}>{name[0]}</Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight={700}>{name}</Typography>
          <Typography variant="caption" color="text.secondary">{role} · {email}</Typography>
        </Box>
        <Chip label={statusLabel} size="small" sx={{ background: statusColor + '22', color: statusColor, fontWeight: 700 }} />
        <Tooltip title="تعديل"><IconButton size="small" onClick={onEdit} sx={{ color: '#6366f1' }}><Edit fontSize="small" /></IconButton></Tooltip>
        <Tooltip title="حذف"><IconButton size="small" onClick={onDelete} sx={{ color: '#ef4444' }}><DeleteOutline fontSize="small" /></IconButton></Tooltip>
      </Glass>
    </motion.div>
  );
});

/* ─────────────────── Backup Row ─────────────────── */
const BackupRow = memo(({ name, date, size, type, status, delay = 0 }) => {
  const statusMap = { success: { color: '#22c55e', label: 'ناجح' }, failed: { color: '#ef4444', label: 'فشل' }, running: { color: '#f59e0b', label: 'جارٍ' } };
  const s = statusMap[status] || statusMap.success;
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <Glass sx={{ p: 2, mb: 1.5, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ background: type === 'full' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'linear-gradient(135deg,#06b6d4,#0891b2)', width: 40, height: 40 }}>
          {type === 'full' ? <Storage fontSize="small" /> : <CloudUpload fontSize="small" />}
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" fontWeight={700}>{name}</Typography>
          <Typography variant="caption" color="text.secondary">{date} · {size}</Typography>
        </Box>
        <Chip label={type === 'full' ? 'كامل' : 'تدريجي'} size="small" variant="outlined" sx={{ mr: 1 }} />
        <Chip label={s.label} size="small" sx={{ background: s.color + '22', color: s.color, fontWeight: 700 }} />
        <Tooltip title="تنزيل"><IconButton size="small" sx={{ color: '#06b6d4' }}><Download fontSize="small" /></IconButton></Tooltip>
      </Glass>
    </motion.div>
  );
});

/* ─────────────────── Demo Data ─────────────────── */
const DEMO = {
  kpis: [
    { title: 'المستخدمون النشطون', value: '248', subtitle: 'من إجمالي 312', icon: <Person />, gradient: 'linear-gradient(135deg,#8b5cf6,#6366f1)', trend: 8 },
    { title: 'آخر نسخ احتياطي', value: '2س', subtitle: 'منذ ساعتين', icon: <Backup />, gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)', trend: 0 },
    { title: 'أداء النظام', value: '98%', subtitle: 'وقت التشغيل', icon: <Speed />, gradient: 'linear-gradient(135deg,#22c55e,#16a34a)', trend: 2 },
    { title: 'الأذونات النشطة', value: '1,847', subtitle: 'قاعدة صلاحية', icon: <VpnKey />, gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', trend: -1 },
    { title: 'الجلسات المتزامنة', value: '37', subtitle: 'اتصال حالي', icon: <Wifi />, gradient: 'linear-gradient(135deg,#ec4899,#db2777)', trend: 12 },
    { title: 'حجم قاعدة البيانات', value: '4.7 GB', subtitle: 'من 10 GB', icon: <Memory />, gradient: 'linear-gradient(135deg,#64748b,#475569)', trend: 0 },
  ],
  users: [
    { name: 'د. سارة القحطاني', role: 'مدير النظام', email: 'sara@hospital.sa', status: 'active' },
    { name: 'محمد الزهراني', role: 'مشرف HR', email: 'mz@hospital.sa', status: 'active' },
    { name: 'ليلى العتيبي', role: 'محاسبة', email: 'layla@hospital.sa', status: 'active' },
    { name: 'أحمد الغامدي', role: 'ممرض أول', email: 'ahmed@hospital.sa', status: 'inactive' },
    { name: 'نورة الدوسري', role: 'سكرتيرة طبية', email: 'noura@hospital.sa', status: 'active' },
    { name: 'فهد الشمري', role: 'تقنية معلومات', email: 'fahad@hospital.sa', status: 'suspended' },
  ],
  backups: [
    { name: 'نسخة كاملة - مارس 2026', date: '30/03/2026 02:00', size: '2.3 GB', type: 'full', status: 'success' },
    { name: 'نسخة تدريجية', date: '29/03/2026 14:00', size: '180 MB', type: 'incremental', status: 'success' },
    { name: 'نسخة كاملة - فبراير 2026', date: '28/02/2026 02:00', size: '2.1 GB', type: 'full', status: 'success' },
    { name: 'نسخة تدريجية', date: '27/03/2026 14:00', size: '154 MB', type: 'incremental', status: 'failed' },
    { name: 'نسخة كاملة - يناير 2026', date: '31/01/2026 02:00', size: '1.9 GB', type: 'full', status: 'success' },
  ],
};

const TABS = [
  { label: 'عام', icon: <Settings sx={{ fontSize: 16 }} /> },
  { label: 'المستخدمون', icon: <Person sx={{ fontSize: 16 }} />, badge: 6 },
  { label: 'المظهر', icon: <Palette sx={{ fontSize: 16 }} /> },
  { label: 'الإشعارات', icon: <Notifications sx={{ fontSize: 16 }} /> },
  { label: 'الأمان', icon: <Security sx={{ fontSize: 16 }} /> },
  { label: 'النسخ الاحتياطي', icon: <Backup sx={{ fontSize: 16 }} /> },
];

/* ═══════════════════════════════════════════════════════ */
/*                   MAIN COMPONENT                       */
/* ═══════════════════════════════════════════════════════ */
export default function SettingsDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saveDialog, setSaveDialog] = useState(false);
  const [addUserDialog, setAddUserDialog] = useState(false);
  const [backupDialog, setBackupDialog] = useState(false);
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const [saving, setSaving] = useState(false);
  const [backupProgress, setBackupProgress] = useState(0);

  // General settings state
  const [hospitalName, setHospitalName] = useState('مستشفى الأوائل التخصصي');
  const [language, setLanguage] = useState('ar');
  const [timezone, setTimezone] = useState('Asia/Riyadh');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');
  const [sessionTimeout, setSessionTimeout] = useState(30);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  // Appearance state
  const [fontSize, setFontSize] = useState(14);
  const [borderRadius, setBorderRadius] = useState(12);
  const [animSpeed, setAnimSpeed] = useState(0.3);
  const [compactMode, setCompactMode] = useState(false);
  const [showAvatars, setShowAvatars] = useState(true);
  const [accentColor, setAccentColor] = useState('#6366f1');

  // Notifications state
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(true);
  const [pushNotif, setPushNotif] = useState(true);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [notifSound, setNotifSound] = useState(true);
  const [dailySummary, setDailySummary] = useState(true);

  // Security state
  const [twoFactor, setTwoFactor] = useState(true);
  const [ipWhitelist, setIpWhitelist] = useState(false);
  const [passwordPolicy, setPasswordPolicy] = useState('strong');
  const [loginAttempts, setLoginAttempts] = useState(5);
  const [auditLog, setAuditLog] = useState(true);
  const [encryptData, setEncryptData] = useState(true);

  useEffect(() => {
    const load = () => {
      setLoading(true);
      setTimeout(() => { setData(DEMO); setLoading(false); }, 800);
    };
    load();
    const iv = setInterval(load, 60000);
    return () => clearInterval(iv);
  }, []);

  const handleSave = useCallback(() => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setSaveDialog(false);
      setSnack({ open: true, msg: 'تم حفظ الإعدادات بنجاح ✓', severity: 'success' });
    }, 1500);
  }, []);

  const handleBackup = useCallback(() => {
    setBackupProgress(0);
    const iv = setInterval(() => {
      setBackupProgress(p => {
        if (p >= 100) { clearInterval(iv); setTimeout(() => setBackupDialog(false), 800); setSnack({ open: true, msg: 'تم إنشاء النسخة الاحتياطية بنجاح ✓', severity: 'success' }); return 100; }
        return p + 8;
      });
    }, 200);
  }, []);

  const bg = isDark
    ? 'radial-gradient(ellipse at top, #1e1b4b 0%, #0f172a 60%, #1a0533 100%)'
    : 'radial-gradient(ellipse at top, #ede9fe 0%, #f0f9ff 60%, #fdf4ff 100%)';

  const GRADIENT = 'linear-gradient(135deg,#8b5cf6,#6366f1)';

  if (loading || !data) return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
        <Avatar sx={{ width: 64, height: 64, background: GRADIENT }}><Settings sx={{ fontSize: 32 }} /></Avatar>
      </motion.div>
    </Box>
  );

  return (
    <Box sx={{ minHeight: '100vh', background: bg, direction: 'rtl', p: { xs: 2, md: 3 } }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -30 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 100 }}>
        <Glass sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar sx={{ width: 56, height: 56, background: GRADIENT, boxShadow: '0 4px 24px #6366f144' }}>
              <Settings sx={{ fontSize: 28 }} />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ background: GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                إعدادات النظام
              </Typography>
              <Typography variant="caption" color="text.secondary">ضبط وتكوين منصة الأوائل الطبية · {hospitalName}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button variant="outlined" startIcon={<RestartAlt />} size="small"
                sx={{ borderRadius: 2, borderColor: '#6366f1', color: '#6366f1' }}>
                استعادة الافتراضي
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button variant="contained" startIcon={<SaveAlt />} size="small" onClick={() => setSaveDialog(true)}
                sx={{ borderRadius: 2, background: GRADIENT, boxShadow: '0 4px 12px #6366f144' }}>
                حفظ التغييرات
              </Button>
            </motion.div>
          </Box>
        </Glass>
      </motion.div>

      {/* ── KPI Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {data.kpis.map((k, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <KPICard {...k} delay={i * 0.05} />
          </Grid>
        ))}
      </Grid>

      {/* ── Tabs ── */}
      <Glass sx={{ p: 1.5, mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {TABS.map((t, i) => (
          <TabBtn key={i} label={t.label} icon={t.icon} badge={t.badge} active={tab === i} onClick={() => setTab(i)} />
        ))}
      </Glass>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        >

          {/* ════ Tab 0: عام ════ */}
          {tab === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Business sx={{ color: '#6366f1' }} /> معلومات المنشأة
                  </Typography>
                  <TextField fullWidth label="اسم المستشفى / المنشأة" value={hospitalName} onChange={e => setHospitalName(e.target.value)} size="small" sx={{ mb: 2 }} />
                  <TextField fullWidth label="البريد الإلكتروني الرسمي" defaultValue="info@alawael-hospital.sa" size="small" sx={{ mb: 2 }} />
                  <TextField fullWidth label="رقم الهاتف" defaultValue="+966 11 000 0000" size="small" sx={{ mb: 2 }} />
                  <TextField fullWidth label="العنوان" defaultValue="الرياض، المملكة العربية السعودية" size="small" multiline rows={2} />
                </Glass>
              </Grid>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Tune sx={{ color: '#6366f1' }} /> إعدادات النظام
                  </Typography>
                  <SettingRow icon={<Language sx={{ fontSize: 18 }} />} label="اللغة" description="لغة واجهة المستخدم">
                    <Select value={language} onChange={e => setLanguage(e.target.value)} size="small" sx={{ minWidth: 140 }}>
                      <MenuItem value="ar">العربية</MenuItem>
                      <MenuItem value="en">English</MenuItem>
                    </Select>
                  </SettingRow>
                  <SettingRow icon={<Schedule sx={{ fontSize: 18 }} />} label="المنطقة الزمنية" description="توقيت النظام">
                    <Select value={timezone} onChange={e => setTimezone(e.target.value)} size="small" sx={{ minWidth: 160 }}>
                      <MenuItem value="Asia/Riyadh">الرياض (UTC+3)</MenuItem>
                      <MenuItem value="Asia/Dubai">دبي (UTC+4)</MenuItem>
                      <MenuItem value="Europe/London">لندن (UTC+0)</MenuItem>
                    </Select>
                  </SettingRow>
                  <SettingRow icon={<TextFields sx={{ fontSize: 18 }} />} label="تنسيق التاريخ">
                    <Select value={dateFormat} onChange={e => setDateFormat(e.target.value)} size="small" sx={{ minWidth: 160 }}>
                      <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                      <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                      <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                    </Select>
                  </SettingRow>
                  <SettingRow icon={<Wifi sx={{ fontSize: 18 }} />} label="تحديث تلقائي" description="تحديث البيانات كل 60 ثانية">
                    <Switch checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} color="primary" />
                  </SettingRow>
                  <SettingRow icon={<Warning sx={{ fontSize: 18 }} />} label="وضع الصيانة" description="إيقاف الوصول مؤقتاً">
                    <Switch checked={maintenanceMode} onChange={e => setMaintenanceMode(e.target.checked)} color="warning" />
                  </SettingRow>
                </Glass>
              </Grid>
              <Grid item xs={12}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} mb={2} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Speed sx={{ color: '#6366f1' }} /> أداء النظام
                  </Typography>
                  <Grid container spacing={2}>
                    {[
                      { label: 'استخدام المعالج', value: 34, color: '#22c55e' },
                      { label: 'استخدام الذاكرة', value: 61, color: '#f59e0b' },
                      { label: 'استخدام التخزين', value: 47, color: '#06b6d4' },
                      { label: 'نطاق الشبكة', value: 22, color: '#8b5cf6' },
                    ].map((m, i) => (
                      <Grid item xs={12} sm={6} key={i}>
                        <Box sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" fontWeight={600}>{m.label}</Typography>
                            <Typography variant="caption" fontWeight={700} sx={{ color: m.color }}>{m.value}%</Typography>
                          </Box>
                          <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} style={{ transformOrigin: 'right' }} transition={{ delay: i * 0.1 + 0.3 }}>
                            <LinearProgress variant="determinate" value={m.value} sx={{ height: 8, borderRadius: 4, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', '& .MuiLinearProgress-bar': { background: m.color, borderRadius: 4 } }} />
                          </motion.div>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                  <Box sx={{ mt: 2, p: 2, borderRadius: 2, background: isDark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', display: 'flex', gap: 1, alignItems: 'center' }}>
                    <CheckCircle sx={{ color: '#22c55e', fontSize: 20 }} />
                    <Typography variant="body2" color="#22c55e" fontWeight={600}>جميع الخدمات تعمل بشكل طبيعي · وقت التشغيل: 99.98% هذا الشهر</Typography>
                  </Box>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ════ Tab 1: المستخدمون ════ */}
          {tab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700}>إدارة المستخدمين ({data.users.length})</Typography>
                    <Button variant="contained" startIcon={<AddCircle />} size="small" onClick={() => setAddUserDialog(true)}
                      sx={{ background: GRADIENT, borderRadius: 2 }}>مستخدم جديد</Button>
                  </Box>
                  {data.users.map((u, i) => (
                    <UserRow key={i} {...u} delay={i * 0.07}
                      onEdit={() => setSnack({ open: true, msg: `تعديل: ${u.name}`, severity: 'info' })}
                      onDelete={() => setSnack({ open: true, msg: `تم حذف: ${u.name}`, severity: 'warning' })}
                    />
                  ))}
                </Glass>
              </Grid>
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3, mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={2}>توزيع الأدوار</Typography>
                  {[
                    { label: 'مدير النظام', count: 2, color: '#6366f1' },
                    { label: 'طبيب', count: 45, color: '#22c55e' },
                    { label: 'ممرض', count: 78, color: '#06b6d4' },
                    { label: 'إداري', count: 34, color: '#f59e0b' },
                    { label: 'محاسب', count: 12, color: '#ec4899' },
                    { label: 'تقنية معلومات', count: 5, color: '#8b5cf6' },
                  ].map((r, i) => (
                    <Box key={i} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600}>{r.label}</Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ color: r.color }}>{r.count}</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={(r.count / 78) * 100}
                        sx={{ height: 6, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', '& .MuiLinearProgress-bar': { background: r.color, borderRadius: 3 } }} />
                    </Box>
                  ))}
                </Glass>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={2}>إعدادات الوصول</Typography>
                  <SettingRow icon={<VpnKey sx={{ fontSize: 16 }} />} label="تسجيل تلقائي" description="SSO">
                    <Switch defaultChecked color="primary" size="small" />
                  </SettingRow>
                  <SettingRow icon={<Lock sx={{ fontSize: 16 }} />} label="تسجيل الضيوف" description="وصول محدود">
                    <Switch color="primary" size="small" />
                  </SettingRow>
                  <SettingRow icon={<Person sx={{ fontSize: 16 }} />} label="التسجيل الذاتي" description="للمرضى">
                    <Switch defaultChecked color="primary" size="small" />
                  </SettingRow>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ════ Tab 2: المظهر ════ */}
          {tab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} mb={2} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <ColorLens sx={{ color: '#6366f1' }} /> إعدادات المظهر
                  </Typography>
                  <SettingRow icon={isDark ? <Brightness7 sx={{ fontSize: 18 }} /> : <Brightness4 sx={{ fontSize: 18 }} />} label="الوضع المظلم" description="تبديل بين الفاتح والداكن">
                    <Switch checked={isDark} color="primary" />
                  </SettingRow>
                  <SettingRow icon={<FormatSize sx={{ fontSize: 18 }} />} label={`حجم الخط: ${fontSize}px`} description="الحجم الافتراضي للنصوص">
                    <Box sx={{ width: 160 }}>
                      <Slider value={fontSize} onChange={(_, v) => setFontSize(v)} min={12} max={18} step={1} size="small" sx={{ color: '#6366f1' }} valueLabelDisplay="auto" />
                    </Box>
                  </SettingRow>
                  <SettingRow icon={<Tune sx={{ fontSize: 18 }} />} label={`نصف قطر الحواف: ${borderRadius}px`} description="استدارة العناصر">
                    <Box sx={{ width: 160 }}>
                      <Slider value={borderRadius} onChange={(_, v) => setBorderRadius(v)} min={0} max={24} step={2} size="small" sx={{ color: '#6366f1' }} valueLabelDisplay="auto" />
                    </Box>
                  </SettingRow>
                  <SettingRow icon={<Speed sx={{ fontSize: 18 }} />} label={`سرعة الحركة: ${animSpeed}s`} description="سرعة الانتقالات">
                    <Box sx={{ width: 160 }}>
                      <Slider value={animSpeed} onChange={(_, v) => setAnimSpeed(v)} min={0.1} max={1} step={0.1} size="small" sx={{ color: '#6366f1' }} valueLabelDisplay="auto" />
                    </Box>
                  </SettingRow>
                  <SettingRow icon={<Tune sx={{ fontSize: 18 }} />} label="الوضع المدمج" description="تقليل المسافات">
                    <Switch checked={compactMode} onChange={e => setCompactMode(e.target.checked)} color="primary" />
                  </SettingRow>
                  <SettingRow icon={<PhotoCamera sx={{ fontSize: 18 }} />} label="إظهار الصور الشخصية" description="صور المستخدمين">
                    <Switch checked={showAvatars} onChange={e => setShowAvatars(e.target.checked)} color="primary" />
                  </SettingRow>
                </Glass>
              </Grid>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3, mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={2}>لون التمييز</Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    {['#6366f1','#8b5cf6','#ec4899','#ef4444','#f59e0b','#22c55e','#06b6d4','#0ea5e9'].map(c => (
                      <motion.div key={c} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.9 }}>
                        <Box onClick={() => setAccentColor(c)} sx={{
                          width: 36, height: 36, borderRadius: '50%', background: c, cursor: 'pointer',
                          border: accentColor === c ? '3px solid white' : '3px solid transparent',
                          boxShadow: accentColor === c ? `0 0 12px ${c}88` : 'none',
                          transition: 'all 0.2s',
                        }} />
                      </motion.div>
                    ))}
                  </Box>
                </Glass>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={2}>معاينة التصميم</Typography>
                  <Box sx={{ p: 2, borderRadius: `${borderRadius}px`, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.7)', border: '1px solid rgba(99,102,241,0.3)', mb: 2 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: fontSize, color: accentColor }}>مثال على النص الرئيسي</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: fontSize - 2 }}>نص فرعي توضيحي للمعاينة</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Box sx={{ px: 2, py: 0.75, borderRadius: `${borderRadius / 1.5}px`, background: accentColor, color: '#fff', fontSize: fontSize - 1, fontWeight: 700 }}>زر رئيسي</Box>
                    <Box sx={{ px: 2, py: 0.75, borderRadius: `${borderRadius / 1.5}px`, border: `1px solid ${accentColor}`, color: accentColor, fontSize: fontSize - 1, fontWeight: 600 }}>زر ثانوي</Box>
                  </Box>
                  <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">وضع مدمج:</Typography>
                    <Chip label={compactMode ? 'مفعّل' : 'معطّل'} size="small" sx={{ background: compactMode ? '#22c55e22' : '#94a3b822', color: compactMode ? '#22c55e' : '#94a3b8', fontWeight: 700 }} />
                  </Box>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ════ Tab 3: الإشعارات ════ */}
          {tab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} mb={2} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <NotificationsActive sx={{ color: '#f97316' }} /> قنوات الإشعارات
                  </Typography>
                  <SettingRow icon={<Email sx={{ fontSize: 18 }} />} label="إشعارات البريد الإلكتروني" description="رسائل تلقائية للأحداث المهمة" gradient="linear-gradient(135deg,#6366f1,#8b5cf6)">
                    <Switch checked={emailNotif} onChange={e => setEmailNotif(e.target.checked)} color="primary" />
                  </SettingRow>
                  <SettingRow icon={<Sms sx={{ fontSize: 18 }} />} label="إشعارات الرسائل النصية" description="SMS للحالات الطارئة" gradient="linear-gradient(135deg,#22c55e,#16a34a)">
                    <Switch checked={smsNotif} onChange={e => setSmsNotif(e.target.checked)} color="primary" />
                  </SettingRow>
                  <SettingRow icon={<NotificationsActive sx={{ fontSize: 18 }} />} label="الإشعارات الفورية" description="Push notifications في المتصفح" gradient="linear-gradient(135deg,#f97316,#ea580c)">
                    <Switch checked={pushNotif} onChange={e => setPushNotif(e.target.checked)} color="primary" />
                  </SettingRow>
                  <SettingRow icon={<NotificationsOff sx={{ fontSize: 18 }} />} label="الإشعارات العاجلة فقط" description="تجاهل الإشعارات الاعتيادية" gradient="linear-gradient(135deg,#ef4444,#dc2626)">
                    <Switch checked={urgentOnly} onChange={e => setUrgentOnly(e.target.checked)} color="warning" />
                  </SettingRow>
                  <SettingRow icon={<Notifications sx={{ fontSize: 18 }} />} label="صوت الإشعارات" description="تنبيه صوتي عند الاستلام" gradient="linear-gradient(135deg,#8b5cf6,#6366f1)">
                    <Switch checked={notifSound} onChange={e => setNotifSound(e.target.checked)} color="primary" />
                  </SettingRow>
                  <SettingRow icon={<Schedule sx={{ fontSize: 18 }} />} label="ملخص يومي" description="تقرير يومي على البريد الإلكتروني" gradient="linear-gradient(135deg,#06b6d4,#0891b2)">
                    <Switch checked={dailySummary} onChange={e => setDailySummary(e.target.checked)} color="primary" />
                  </SettingRow>
                </Glass>
              </Grid>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3, mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={2}>جدول الإشعارات</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={1}>ساعات الإرسال المسموح بها</Typography>
                  {[
                    { label: 'ساعات العمل', start: 8, end: 17, active: true, color: '#22c55e' },
                    { label: 'ما بعد العمل', start: 17, end: 22, active: true, color: '#f59e0b' },
                    { label: 'الليل المتأخر', start: 22, end: 8, active: false, color: '#ef4444' },
                  ].map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1.5, borderBottom: i < 2 ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` : 'none' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                        <Typography variant="body2" fontWeight={600}>{s.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.start}:00 - {s.end}:00</Typography>
                      </Box>
                      <Switch defaultChecked={s.active} size="small" color="primary" />
                    </Box>
                  ))}
                </Glass>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={2}>أنواع الأحداث</Typography>
                  {[
                    { label: 'حالات الطوارئ', icon: '🚨', checked: true },
                    { label: 'مواعيد المرضى', icon: '📅', checked: true },
                    { label: 'النتائج المخبرية', icon: '🔬', checked: true },
                    { label: 'الصيدلية والأدوية', icon: '💊', checked: true },
                    { label: 'الفواتير والمدفوعات', icon: '💳', checked: false },
                    { label: 'تحديثات النظام', icon: '⚙️', checked: false },
                  ].map((e, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 1, borderBottom: i < 5 ? `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}` : 'none' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography>{e.icon}</Typography>
                        <Typography variant="body2" fontWeight={500}>{e.label}</Typography>
                      </Box>
                      <Switch defaultChecked={e.checked} size="small" color="primary" />
                    </Box>
                  ))}
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ════ Tab 4: الأمان ════ */}
          {tab === 4 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="subtitle1" fontWeight={700} mb={2} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                    <Shield sx={{ color: '#6366f1' }} /> إعدادات الأمان
                  </Typography>
                  <SettingRow icon={<VpnKey sx={{ fontSize: 18 }} />} label="التحقق الثنائي (2FA)" description="طبقة حماية إضافية لجميع الحسابات">
                    <Switch checked={twoFactor} onChange={e => setTwoFactor(e.target.checked)} color="success" />
                  </SettingRow>
                  <SettingRow icon={<Dns sx={{ fontSize: 18 }} />} label="قائمة IP المسموح بها" description="تقييد الوصول بعناوين IP محددة">
                    <Switch checked={ipWhitelist} onChange={e => setIpWhitelist(e.target.checked)} color="primary" />
                  </SettingRow>
                  <SettingRow icon={<History sx={{ fontSize: 18 }} />} label="سجل التدقيق" description="تسجيل جميع العمليات الحساسة">
                    <Switch checked={auditLog} onChange={e => setAuditLog(e.target.checked)} color="primary" />
                  </SettingRow>
                  <SettingRow icon={<Lock sx={{ fontSize: 18 }} />} label="تشفير البيانات" description="AES-256 للبيانات الحساسة">
                    <Switch checked={encryptData} onChange={e => setEncryptData(e.target.checked)} color="success" />
                  </SettingRow>
                  <SettingRow icon={<Schedule sx={{ fontSize: 18 }} />} label={`مهلة الجلسة: ${sessionTimeout} دقيقة`} description="تسجيل الخروج تلقائياً">
                    <Box sx={{ width: 160 }}>
                      <Slider value={sessionTimeout} onChange={(_, v) => setSessionTimeout(v)} min={5} max={120} step={5} size="small" sx={{ color: '#6366f1' }} valueLabelDisplay="auto" />
                    </Box>
                  </SettingRow>
                  <SettingRow icon={<ErrorIcon sx={{ fontSize: 18 }} />} label={`محاولات تسجيل الدخول: ${loginAttempts}`} description="حظر بعد عدد المحاولات">
                    <Box sx={{ width: 160 }}>
                      <Slider value={loginAttempts} onChange={(_, v) => setLoginAttempts(v)} min={3} max={10} step={1} size="small" sx={{ color: '#ef4444' }} valueLabelDisplay="auto" />
                    </Box>
                  </SettingRow>
                </Glass>
              </Grid>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3, mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={2}>سياسة كلمة المرور</Typography>
                  {[
                    { value: 'basic', label: 'أساسية', desc: '6 أحرف على الأقل', color: '#f59e0b' },
                    { value: 'medium', label: 'متوسطة', desc: '8 أحرف + رقم', color: '#06b6d4' },
                    { value: 'strong', label: 'قوية', desc: '10 أحرف + رمز + حرف كبير', color: '#22c55e' },
                    { value: 'enterprise', label: 'مؤسسية', desc: '14 حرف + انتهاء صلاحية 90 يوم', color: '#6366f1' },
                  ].map(p => (
                    <motion.div key={p.value} whileHover={{ x: -4 }} whileTap={{ scale: 0.98 }}>
                      <Box onClick={() => setPasswordPolicy(p.value)} sx={{
                        p: 1.5, mb: 1, borderRadius: 2, cursor: 'pointer',
                        background: passwordPolicy === p.value ? (isDark ? `${p.color}22` : `${p.color}11`) : 'transparent',
                        border: `2px solid ${passwordPolicy === p.value ? p.color : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        transition: 'all 0.2s',
                      }}>
                        <Box>
                          <Typography variant="body2" fontWeight={700} sx={{ color: passwordPolicy === p.value ? p.color : 'text.primary' }}>{p.label}</Typography>
                          <Typography variant="caption" color="text.secondary">{p.desc}</Typography>
                        </Box>
                        {passwordPolicy === p.value && <CheckCircle sx={{ color: p.color, fontSize: 20 }} />}
                      </Box>
                    </motion.div>
                  ))}
                </Glass>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={1.5}>حالة الأمان</Typography>
                  <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
                    <svg width="120" height="120" viewBox="0 0 120 120">
                      <circle cx="60" cy="60" r="50" fill="none" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} strokeWidth="10" />
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#22c55e" strokeWidth="10"
                        strokeDasharray={`${2 * Math.PI * 50 * 0.87} ${2 * Math.PI * 50}`}
                        strokeLinecap="round" transform="rotate(-90 60 60)" />
                      <text x="60" y="55" textAnchor="middle" fill={isDark ? '#fff' : '#1e293b'} fontSize="20" fontWeight="bold">87%</text>
                      <text x="60" y="72" textAnchor="middle" fill={isDark ? '#94a3b8' : '#64748b'} fontSize="10">أمان عالٍ</text>
                    </svg>
                  </Box>
                  {[
                    { label: '2FA مفعّل', ok: twoFactor },
                    { label: 'تشفير البيانات', ok: encryptData },
                    { label: 'سجل التدقيق', ok: auditLog },
                    { label: 'قائمة IP', ok: ipWhitelist },
                  ].map((c, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                      {c.ok ? <CheckCircle sx={{ color: '#22c55e', fontSize: 18 }} /> : <Warning sx={{ color: '#f59e0b', fontSize: 18 }} />}
                      <Typography variant="caption" fontWeight={600}>{c.label}</Typography>
                    </Box>
                  ))}
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ════ Tab 5: النسخ الاحتياطي ════ */}
          {tab === 5 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight={700}>سجل النسخ الاحتياطية</Typography>
                    <Button variant="contained" startIcon={<CloudUpload />} size="small" onClick={() => { setBackupDialog(true); handleBackup(); }}
                      sx={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)', borderRadius: 2 }}>
                      نسخة احتياطية الآن
                    </Button>
                  </Box>
                  {data.backups.map((b, i) => (
                    <BackupRow key={i} {...b} delay={i * 0.08} />
                  ))}
                </Glass>
              </Grid>
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3, mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={2}>جدولة النسخ التلقائية</Typography>
                  <SettingRow icon={<Schedule sx={{ fontSize: 16 }} />} label="نسخة كاملة أسبوعية" description="كل أحد 02:00 صباحاً">
                    <Switch defaultChecked color="primary" size="small" />
                  </SettingRow>
                  <SettingRow icon={<CloudUpload sx={{ fontSize: 16 }} />} label="نسخة تدريجية يومية" description="كل يوم 14:00">
                    <Switch defaultChecked color="primary" size="small" />
                  </SettingRow>
                  <SettingRow icon={<Storage sx={{ fontSize: 16 }} />} label="تخزين سحابي" description="AWS S3 / Azure Blob">
                    <Switch defaultChecked color="success" size="small" />
                  </SettingRow>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="caption" color="text.secondary">فترة الاحتفاظ:</Typography>
                  <Select defaultValue={30} size="small" fullWidth sx={{ mt: 1 }}>
                    <MenuItem value={7}>7 أيام</MenuItem>
                    <MenuItem value={30}>30 يوم</MenuItem>
                    <MenuItem value={90}>90 يوم</MenuItem>
                    <MenuItem value={365}>سنة كاملة</MenuItem>
                  </Select>
                </Glass>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="subtitle2" fontWeight={700} mb={2}>إحصائيات التخزين</Typography>
                  {[
                    { label: 'قاعدة البيانات', used: 4.7, total: 10, color: '#6366f1' },
                    { label: 'المستندات', used: 12.3, total: 50, color: '#06b6d4' },
                    { label: 'الصور الطبية', used: 87.2, total: 200, color: '#f59e0b' },
                  ].map((s, i) => (
                    <Box key={i} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600}>{s.label}</Typography>
                        <Typography variant="caption" sx={{ color: s.color }}>{s.used} / {s.total} GB</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={(s.used / s.total) * 100}
                        sx={{ height: 8, borderRadius: 4, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', '& .MuiLinearProgress-bar': { background: s.color, borderRadius: 4 } }} />
                    </Box>
                  ))}
                  <Box sx={{ p: 1.5, borderRadius: 2, background: isDark ? 'rgba(6,182,212,0.08)' : 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', textAlign: 'center' }}>
                    <Typography variant="caption" color="#06b6d4" fontWeight={700}>إجمالي المستخدم: 104.2 GB من 260 GB</Typography>
                  </Box>
                </Glass>
              </Grid>
            </Grid>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Save Dialog ── */}
      <Dialog open={saveDialog} onClose={() => setSaveDialog(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3, background: isDark ? '#1e293b' : '#fff', direction: 'rtl' } }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <SaveAlt sx={{ color: '#6366f1' }} /> تأكيد حفظ الإعدادات
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">سيتم تطبيق جميع التغييرات على النظام. هل تريد المتابعة؟</Typography>
          {saving && <LinearProgress sx={{ mt: 2, borderRadius: 2 }} />}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setSaveDialog(false)} variant="outlined" sx={{ borderRadius: 2 }}>إلغاء</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving}
            sx={{ background: GRADIENT, borderRadius: 2 }}>
            {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add User Dialog ── */}
      <Dialog open={addUserDialog} onClose={() => setAddUserDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3, background: isDark ? '#1e293b' : '#fff', direction: 'rtl' } }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <AddCircle sx={{ color: '#6366f1' }} /> إضافة مستخدم جديد
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={6}><TextField fullWidth label="الاسم الكامل" size="small" /></Grid>
            <Grid item xs={6}><TextField fullWidth label="البريد الإلكتروني" size="small" /></Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>الدور الوظيفي</InputLabel>
                <Select label="الدور الوظيفي" defaultValue="">
                  <MenuItem value="admin">مدير النظام</MenuItem>
                  <MenuItem value="doctor">طبيب</MenuItem>
                  <MenuItem value="nurse">ممرض</MenuItem>
                  <MenuItem value="admin_staff">إداري</MenuItem>
                  <MenuItem value="accountant">محاسب</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}><TextField fullWidth label="كلمة المرور المؤقتة" size="small" type="password" /></Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>الفرع</InputLabel>
                <Select label="الفرع" defaultValue="">
                  <MenuItem value="main">المقر الرئيسي - الرياض</MenuItem>
                  <MenuItem value="north">الفرع الشمالي</MenuItem>
                  <MenuItem value="east">الفرع الشرقي</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setAddUserDialog(false)} variant="outlined" sx={{ borderRadius: 2 }}>إلغاء</Button>
          <Button onClick={() => { setAddUserDialog(false); setSnack({ open: true, msg: 'تم إضافة المستخدم بنجاح ✓', severity: 'success' }); }} variant="contained"
            sx={{ background: GRADIENT, borderRadius: 2 }}>إضافة</Button>
        </DialogActions>
      </Dialog>

      {/* ── Backup Progress Dialog ── */}
      <Dialog open={backupDialog} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3, background: isDark ? '#1e293b' : '#fff', direction: 'rtl' } }}>
        <DialogTitle sx={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CloudUpload sx={{ color: '#06b6d4' }} /> إنشاء نسخة احتياطية
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>جارٍ حفظ النسخة الاحتياطية الكاملة للنظام...</Typography>
          <LinearProgress variant="determinate" value={backupProgress}
            sx={{ height: 10, borderRadius: 5, bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#06b6d4,#0891b2)', borderRadius: 5 } }} />
          <Typography variant="caption" sx={{ color: '#06b6d4', fontWeight: 700, mt: 1, display: 'block', textAlign: 'center' }}>
            {backupProgress < 100 ? `${backupProgress}% مكتمل...` : '✓ اكتمل بنجاح!'}
          </Typography>
        </DialogContent>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar open={snack.open} autoHideDuration={3000} onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
        <Alert severity={snack.severity} sx={{ borderRadius: 2, fontWeight: 600 }} onClose={() => setSnack(s => ({ ...s, open: false }))}>
          {snack.msg}
        </Alert>
      </Snackbar>

    </Box>
  );
}
