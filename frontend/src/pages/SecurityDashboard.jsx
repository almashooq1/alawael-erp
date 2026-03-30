import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Box, Typography, Grid, Skeleton, Chip, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, MenuItem, Select, FormControl, Switch, LinearProgress
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Glass ─── */
const Glass = memo(({ children, sx, ...rest }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box sx={{
      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
      borderRadius: 3, ...sx,
    }} {...rest}>{children}</Box>
  );
});

/* ─── KPI Card ─── */
const KPICard = memo(({ title, value, subtitle, icon, gradient, trend, delay = 0, alert }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isPos = trend >= 0;
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring', stiffness: 120 }}>
      <Glass sx={{ p: 3, height: '100%', position: 'relative', overflow: 'hidden' }}>
        {alert && <Box sx={{ position: 'absolute', top: 10, insetInlineStart: 10, width: 8, height: 8, borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 0 3px #ef444433' }} />}
        <Box sx={{ position: 'absolute', top: -20, insetInlineEnd: -20, width: 100, height: 100, borderRadius: '50%', background: gradient, opacity: 0.12 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 2, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{icon}</Box>
          <Chip label={`${isPos ? '+' : ''}${trend}%`} size="small" sx={{ background: isPos ? '#22c55e22' : '#ef444422', color: isPos ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 11 }} />
        </Box>
        <Typography variant="h4" fontWeight={800} sx={{ background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>{value}</Typography>
        <Typography variant="body2" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)', mb: 0.5 }}>{title}</Typography>
        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>{subtitle}</Typography>
      </Glass>
    </motion.div>
  );
});

/* ─── Tab Button ─── */
const TabBtn = memo(({ label, active, onClick, icon, badge }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={onClick}
      style={{ background: active ? 'linear-gradient(135deg,#6366f1,#4f46e5)' : 'transparent', border: active ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 10, padding: '8px 18px', cursor: 'pointer', color: active ? '#fff' : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)', fontWeight: active ? 700 : 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      {icon && <span style={{ fontSize: 15 }}>{icon}</span>}
      {label}
      {badge > 0 && <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 800 }}>{badge}</span>}
    </motion.button>
  );
});

/* ─── Threat Row ─── */
const ThreatRow = memo(({ threat, onBlock }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const sevColors = { 'عالي': '#ef4444', 'متوسط': '#f59e0b', 'منخفض': '#22c55e', 'حرج': '#dc2626' };
  const color = sevColors[threat.severity] || '#6366f1';
  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }}
      style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
      <td style={{ padding: '12px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <span style={{ fontSize: 18 }}>{threat.icon}</span>
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>{threat.type}</Typography>
            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{threat.source}</Typography>
          </Box>
        </Box>
      </td>
      <td style={{ padding: '12px 16px' }}><Typography variant="caption" sx={{ color: '#6366f1', fontFamily: 'monospace' }}>{threat.ip}</Typography></td>
      <td style={{ padding: '12px 16px' }}><Chip label={threat.severity} size="small" sx={{ background: `${color}22`, color, border: `1px solid ${color}44`, fontWeight: 700, fontSize: 10 }} /></td>
      <td style={{ padding: '12px 16px' }}><Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>{threat.time}</Typography></td>
      <td style={{ padding: '12px 16px' }}>
        <Chip label={threat.status} size="small" sx={{ background: threat.status === 'محجوب' ? '#22c55e22' : threat.status === 'جارٍ التحقيق' ? '#f59e0b22' : '#ef444422', color: threat.status === 'محجوب' ? '#22c55e' : threat.status === 'جارٍ التحقيق' ? '#f59e0b' : '#ef4444', fontSize: 10 }} />
      </td>
      <td style={{ padding: '12px 16px' }}>
        {threat.status !== 'محجوب' && (
          <Tooltip title="حجب الآن">
            <IconButton size="small" onClick={() => onBlock(threat)} sx={{ color: '#ef4444' }}>🚫</IconButton>
          </Tooltip>
        )}
      </td>
    </motion.tr>
  );
});

/* ─── User Session Row ─── */
const SessionRow = memo(({ session, onRevoke }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
      <td style={{ padding: '12px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: '50%', background: `${session.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>{session.avatar}</Box>
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>{session.user}</Typography>
            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{session.role}</Typography>
          </Box>
        </Box>
      </td>
      <td style={{ padding: '12px 16px' }}><Typography variant="caption" sx={{ color: '#6366f1', fontFamily: 'monospace' }}>{session.ip}</Typography></td>
      <td style={{ padding: '12px 16px' }}><Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>{session.device}</Typography></td>
      <td style={{ padding: '12px 16px' }}><Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>{session.loginTime}</Typography></td>
      <td style={{ padding: '12px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: session.active ? '#22c55e' : '#94a3b8' }} />
          <Typography variant="caption" sx={{ color: session.active ? '#22c55e' : '#94a3b8' }}>{session.active ? 'نشط' : 'منتهي'}</Typography>
        </Box>
      </td>
      <td style={{ padding: '12px 16px' }}>
        {session.active && (
          <Tooltip title="إنهاء الجلسة">
            <IconButton size="small" onClick={() => onRevoke(session)} sx={{ color: '#f59e0b' }}>⏏️</IconButton>
          </Tooltip>
        )}
      </td>
    </motion.tr>
  );
});

/* ─── Ring Gauge ─── */
const Ring = memo(({ value, max = 100, color, size = 90, label }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const r = 32; const circ = 2 * Math.PI * r; const pct = Math.min(value / max, 1);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 80 80">
          <circle cx={40} cy={40} r={r} fill="none" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} strokeWidth={8} />
          <circle cx={40} cy={40} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" transform="rotate(-90 40 40)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
          <text x={40} y={45} textAnchor="middle" fontSize={14} fontWeight="bold" fill={color}>{Math.round(pct * 100)}%</text>
        </svg>
      </Box>
      <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)', textAlign: 'center', fontSize: 10 }}>{label}</Typography>
    </Box>
  );
});

/* ─── DEMO DATA ─── */
const DEMO = {
  kpis: [
    { title: 'مستوى الأمان', value: '92%', subtitle: 'تقييم شامل للنظام', icon: '🛡️', gradient: 'linear-gradient(135deg,#6366f1,#4f46e5)', trend: 5 },
    { title: 'التهديدات المكتشفة', value: '23', subtitle: 'هذا الأسبوع', icon: '⚠️', gradient: 'linear-gradient(135deg,#ef4444,#dc2626)', trend: -12, alert: true },
    { title: 'المحاولات المحجوبة', value: '847', subtitle: 'هذا الشهر', icon: '🚫', gradient: 'linear-gradient(135deg,#22c55e,#16a34a)', trend: 8 },
    { title: 'الجلسات النشطة', value: '134', subtitle: 'مستخدم متصل الآن', icon: '👤', gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)', trend: 3 },
    { title: 'الثغرات المكتشفة', value: '4', subtitle: 'تحتاج معالجة فورية', icon: '🔍', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', trend: -2, alert: true },
    { title: 'نسبة الامتثال', value: '98%', subtitle: 'معايير ISO 27001', icon: '✅', gradient: 'linear-gradient(135deg,#8b5cf6,#7c3aed)', trend: 1 },
  ],
  threats: [
    { id: 1, type: 'هجوم Brute Force', source: 'خارجي', ip: '185.220.101.45', severity: 'حرج', time: 'منذ 5 دق', status: 'محجوب', icon: '💥' },
    { id: 2, type: 'محاولة SQL Injection', source: 'خارجي', ip: '91.108.4.77', severity: 'عالي', time: 'منذ 22 دق', status: 'جارٍ التحقيق', icon: '💉' },
    { id: 3, type: 'نشاط غير طبيعي', source: 'داخلي', ip: '192.168.1.45', severity: 'متوسط', time: 'منذ 1 ساعة', status: 'قيد المراجعة', icon: '🔍' },
    { id: 4, type: 'Port Scanning', source: 'خارجي', ip: '45.142.212.8', severity: 'منخفض', time: 'منذ 2 ساعة', status: 'محجوب', icon: '🔭' },
    { id: 5, type: 'محاولة XSS', source: 'خارجي', ip: '104.21.45.67', severity: 'عالي', time: 'منذ 3 ساعات', status: 'محجوب', icon: '⚡' },
    { id: 6, type: 'تسرب بيانات محتمل', source: 'داخلي', ip: '192.168.1.89', severity: 'حرج', time: 'منذ 5 ساعات', status: 'جارٍ التحقيق', icon: '💧' },
  ],
  sessions: [
    { id: 1, user: 'د. محمد العمري', role: 'مدير النظام', ip: '192.168.1.101', device: 'Chrome / Windows', loginTime: '08:32', active: true, color: '#6366f1', avatar: '👨‍💼' },
    { id: 2, user: 'أ. سارة الأحمد', role: 'مدير مالي', ip: '192.168.1.115', device: 'Safari / macOS', loginTime: '09:15', active: true, color: '#22c55e', avatar: '👩‍💼' },
    { id: 3, user: 'م. خالد العمري', role: 'مدير HR', ip: '192.168.1.78', device: 'Firefox / Linux', loginTime: '07:58', active: true, color: '#f59e0b', avatar: '👨‍💻' },
    { id: 4, user: 'د. نورا الزهراني', role: 'طبيبة', ip: '192.168.1.203', device: 'Chrome / Android', loginTime: '10:02', active: false, color: '#ec4899', avatar: '👩‍⚕️' },
    { id: 5, user: 'أ. فهد الراشد', role: 'محلل بيانات', ip: '192.168.1.167', device: 'Edge / Windows', loginTime: '09:45', active: true, color: '#06b6d4', avatar: '👨‍🔬' },
  ],
  vulnerabilities: [
    { title: 'SSL Certificate انتهاء الصلاحية', severity: 'عالي', deadline: '15/04/2026', status: 'قيد المعالجة', pct: 60 },
    { title: 'إصدار قديم لـ Node.js', severity: 'متوسط', deadline: '30/04/2026', status: 'مجدول', pct: 20 },
    { title: 'ضعف في سياسة كلمات المرور', severity: 'منخفض', deadline: '01/05/2026', status: 'مفتوح', pct: 5 },
    { title: 'CORS misconfiguration', severity: 'متوسط', deadline: '20/04/2026', status: 'قيد المعالجة', pct: 45 },
  ],
  complianceItems: [
    { label: 'تشفير البيانات', score: 100, color: '#22c55e' },
    { label: 'التحقق المزدوج (2FA)', score: 87, color: '#6366f1' },
    { label: 'سجلات التدقيق', score: 95, color: '#06b6d4' },
    { label: 'سياسة كلمات المرور', score: 78, color: '#f59e0b' },
    { label: 'النسخ الاحتياطي', score: 92, color: '#10b981' },
    { label: 'تشفير الشبكة', score: 99, color: '#8b5cf6' },
  ],
  auditLog: [
    { action: 'تسجيل دخول ناجح', user: 'د. محمد العمري', ip: '192.168.1.101', time: '08:32:14', type: 'نجاح' },
    { action: 'تغيير كلمة مرور', user: 'أ. سارة الأحمد', ip: '192.168.1.115', time: '08:45:03', type: 'نجاح' },
    { action: 'محاولة دخول فاشلة', user: 'مجهول', ip: '185.220.101.45', time: '09:12:47', type: 'فشل' },
    { action: 'تصدير بيانات مرضى', user: 'د. نورا الزهراني', ip: '192.168.1.203', time: '09:33:21', type: 'تحذير' },
    { action: 'تعديل صلاحيات مستخدم', user: 'م. خالد العمري', ip: '192.168.1.78', time: '10:05:55', type: 'نجاح' },
    { action: 'حجب IP مشبوه', user: 'النظام', ip: '91.108.4.77', time: '10:22:08', type: 'أمان' },
  ],
};

const TABS = [
  { label: 'نظرة عامة', icon: '🛡️', badge: 0 },
  { label: 'التهديدات', icon: '⚠️', badge: 3 },
  { label: 'الجلسات', icon: '👤', badge: 0 },
  { label: 'الثغرات', icon: '🔍', badge: 4 },
  { label: 'الامتثال', icon: '✅', badge: 0 },
  { label: 'سجل التدقيق', icon: '📋', badge: 0 },
];

/* ═══════════ MAIN ═══════════ */
export default function SecurityDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [scanDialog, setScanDialog] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);

  const bg = isDark
    ? 'linear-gradient(135deg,#0a0a1a 0%,#0f0a2e 50%,#0a0f1a 100%)'
    : 'linear-gradient(135deg,#eef2ff 0%,#f0f5ff 50%,#e8f4ff 100%)';
  const G = 'linear-gradient(135deg,#6366f1,#4f46e5)';

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => { setData(DEMO); setLoading(false); }, 900);
    return () => clearTimeout(t);
  }, [refresh]);

  useEffect(() => {
    const iv = setInterval(() => setRefresh(r => r + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  const handleBlock = useCallback((threat) => {
    setData(prev => ({ ...prev, threats: prev.threats.map(t => t.id === threat.id ? { ...t, status: 'محجوب' } : t) }));
  }, []);

  const handleRevoke = useCallback((session) => {
    setData(prev => ({ ...prev, sessions: prev.sessions.map(s => s.id === session.id ? { ...s, active: false } : s) }));
  }, []);

  const handleScan = useCallback(() => {
    setScanning(true);
    setScanProgress(0);
    const iv = setInterval(() => {
      setScanProgress(p => {
        if (p >= 100) { clearInterval(iv); setScanning(false); setScanDialog(false); return 100; }
        return p + 8;
      });
    }, 200);
  }, []);

  const sevColors = { 'عالي': '#ef4444', 'متوسط': '#f59e0b', 'منخفض': '#22c55e', 'حرج': '#dc2626' };
  const activeSessions = data?.sessions?.filter(s => s.active).length || 0;

  return (
    <Box sx={{ minHeight: '100vh', background: bg, p: { xs: 2, md: 3 }, direction: 'rtl' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120 }}>
        <Glass sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 3, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 8px 24px #6366f144' }}>🛡️</Box>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ background: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                مركز الأمن والحماية
              </Typography>
              <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                مراقبة شاملة لأمن النظام والبيانات
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip label={`🟢 ${activeSessions} جلسة نشطة`} size="small" sx={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44', fontWeight: 700 }} />
            <Chip label="🔴 تهديد نشط" size="small" sx={{ background: '#ef444422', color: '#ef4444', border: '1px solid #ef444444', fontWeight: 700 }} />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={() => setRefresh(r => r + 1)}
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'), borderRadius: 10, padding: '8px 14px', cursor: 'pointer', color: isDark ? '#fff' : '#000', fontSize: 13 }}>
              🔄 تحديث
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={() => setScanDialog(true)}
              style={{ background: G, border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: '0 4px 16px #6366f144' }}>
              🔍 فحص الأمان
            </motion.button>
          </Box>
        </Glass>
      </motion.div>

      {/* KPI Cards */}
      <Grid container spacing={2} mb={3}>
        {(loading ? Array(6).fill(null) : data?.kpis || []).map((kpi, i) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
            {loading ? <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} /> : <KPICard {...kpi} delay={i * 0.07} />}
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Glass sx={{ p: 1.5, mb: 3, display: 'flex', gap: 1, overflowX: 'auto', flexWrap: 'nowrap' }}>
        {TABS.map((t, i) => <TabBtn key={i} label={t.label} icon={t.icon} badge={t.badge} active={tab === i} onClick={() => setTab(i)} />)}
      </Glass>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>

          {/* TAB 0: Overview */}
          {tab === 0 && !loading && (
            <Grid container spacing={3}>
              {/* Security Score */}
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🎯 مستوى الأمان الكلي</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 3 }}>
                    <Ring value={92} color="#6366f1" size={120} label="النتيجة الكلية" />
                  </Box>
                  <Grid container spacing={1.5}>
                    {[
                      { label: 'الشبكة', v: 95, c: '#22c55e' },
                      { label: 'البيانات', v: 98, c: '#6366f1' },
                      { label: 'التطبيق', v: 87, c: '#f59e0b' },
                      { label: 'المستخدمون', v: 83, c: '#06b6d4' },
                    ].map((m, i) => (
                      <Grid item xs={6} key={i}>
                        <Box sx={{ p: 1.5, borderRadius: 2, background: `${m.c}11`, border: `1px solid ${m.c}22`, textAlign: 'center' }}>
                          <Typography variant="h6" fontWeight={800} sx={{ color: m.c }}>{m.v}%</Typography>
                          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontSize: 10 }}>{m.label}</Typography>
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>

              {/* Threats Summary */}
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>⚠️ ملخص التهديدات</Typography>
                  {[
                    { label: 'تهديدات حرجة', count: 2, color: '#dc2626' },
                    { label: 'تهديدات عالية', count: 5, color: '#ef4444' },
                    { label: 'تهديدات متوسطة', count: 9, color: '#f59e0b' },
                    { label: 'تهديدات منخفضة', count: 7, color: '#22c55e' },
                  ].map((t, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Box sx={{ width: 36, height: 36, borderRadius: 2, background: `${t.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${t.color}33` }}>
                        <Typography variant="body2" fontWeight={800} sx={{ color: t.color }}>{t.count}</Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="caption" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)' }}>{t.label}</Typography>
                        <Box sx={{ height: 4, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', mt: 0.5, overflow: 'hidden' }}>
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(t.count / 9) * 100}%` }} transition={{ delay: i * 0.1, duration: 0.7 }}
                            style={{ height: '100%', background: t.color, borderRadius: 2 }} />
                        </Box>
                      </Box>
                    </Box>
                  ))}
                  <Box sx={{ mt: 2, p: 2, borderRadius: 2, background: '#ef444411', border: '1px solid #ef444433' }}>
                    <Typography variant="caption" fontWeight={700} sx={{ color: '#ef4444' }}>🚨 تنبيه: تهديدان حرجان قيد التحقيق</Typography>
                  </Box>
                </Glass>
              </Grid>

              {/* Recent Activity */}
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📋 آخر الأحداث الأمنية</Typography>
                  {(data?.auditLog || []).slice(0, 5).map((log, i) => {
                    const lc = log.type === 'نجاح' ? '#22c55e' : log.type === 'فشل' ? '#ef4444' : log.type === 'أمان' ? '#6366f1' : '#f59e0b';
                    return (
                      <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                        <Box sx={{ display: 'flex', gap: 2, mb: 1.5, p: 1.5, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${lc}22` }}>
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: lc, mt: 0.5, flexShrink: 0 }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="caption" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }}>{log.action}</Typography>
                            <Box sx={{ display: 'flex', gap: 1, mt: 0.3 }}>
                              <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: 10 }}>{log.user}</Typography>
                              <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', fontSize: 10 }}>· {log.time}</Typography>
                            </Box>
                          </Box>
                          <Chip label={log.type} size="small" sx={{ background: `${lc}22`, color: lc, fontSize: 9, height: 18 }} />
                        </Box>
                      </motion.div>
                    );
                  })}
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* TAB 1: Threats */}
          {tab === 1 && !loading && (
            <Glass sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>⚠️ التهديدات المكتشفة</Typography>
                <Chip label={`${(data?.threats || []).filter(t => t.status !== 'محجوب').length} نشط`} size="small" sx={{ background: '#ef444422', color: '#ef4444', fontWeight: 700, border: '1px solid #ef444444' }} />
              </Box>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                      {['نوع التهديد', 'عنوان IP', 'الخطورة', 'الوقت', 'الحالة', 'إجراء'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.threats || []).map(t => <ThreatRow key={t.id} threat={t} onBlock={handleBlock} />)}
                  </tbody>
                </table>
              </Box>
            </Glass>
          )}

          {/* TAB 2: Sessions */}
          {tab === 2 && !loading && (
            <Glass sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>👤 الجلسات النشطة</Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip label={`${activeSessions} نشط`} size="small" sx={{ background: '#22c55e22', color: '#22c55e', fontWeight: 700 }} />
                  <Chip label={`${(data?.sessions?.length || 0) - activeSessions} منتهي`} size="small" sx={{ background: '#94a3b822', color: '#94a3b8', fontWeight: 700 }} />
                </Box>
              </Box>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                      {['المستخدم', 'عنوان IP', 'الجهاز', 'وقت الدخول', 'الحالة', 'إجراء'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.sessions || []).map(s => <SessionRow key={s.id} session={s} onRevoke={handleRevoke} />)}
                  </tbody>
                </table>
              </Box>
            </Glass>
          )}

          {/* TAB 3: Vulnerabilities */}
          {tab === 3 && !loading && (
            <Grid container spacing={3}>
              {(data?.vulnerabilities || []).map((v, i) => {
                const vc = sevColors[v.severity] || '#6366f1';
                return (
                  <Grid item xs={12} md={6} key={i}>
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                      <Glass sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Typography variant="body1" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)', flex: 1 }}>{v.title}</Typography>
                          <Chip label={v.severity} size="small" sx={{ background: `${vc}22`, color: vc, border: `1px solid ${vc}44`, fontWeight: 700, mr: 0 }} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>📅 الموعد: {v.deadline}</Typography>
                          <Chip label={v.status} size="small" sx={{ background: v.status === 'قيد المعالجة' ? '#6366f122' : v.status === 'مجدول' ? '#f59e0b22' : '#ef444422', color: v.status === 'قيد المعالجة' ? '#6366f1' : v.status === 'مجدول' ? '#f59e0b' : '#ef4444', fontSize: 10 }} />
                        </Box>
                        <Box>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>تقدم المعالجة</Typography>
                            <Typography variant="caption" fontWeight={700} sx={{ color: vc }}>{v.pct}%</Typography>
                          </Box>
                          <Box sx={{ height: 8, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${v.pct}%` }} transition={{ delay: i * 0.15, duration: 0.8 }}
                              style={{ height: '100%', borderRadius: 4, background: vc }} />
                          </Box>
                        </Box>
                      </Glass>
                    </motion.div>
                  </Grid>
                );
              })}
            </Grid>
          )}

          {/* TAB 4: Compliance */}
          {tab === 4 && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>✅ مؤشرات الامتثال الأمني</Typography>
                  <Grid container spacing={2} justifyContent="center">
                    {(data?.complianceItems || []).map((c, i) => (
                      <Grid item key={i} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Ring value={c.score} color={c.color} label={c.label} size={90} />
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📜 شهادات وإطارات الامتثال</Typography>
                  {[
                    { name: 'ISO/IEC 27001', desc: 'إدارة أمن المعلومات', status: 'معتمد', color: '#22c55e', expiry: '12/2026' },
                    { name: 'HIPAA', desc: 'حماية بيانات المرضى', status: 'معتمد', color: '#6366f1', expiry: '06/2027' },
                    { name: 'GDPR', desc: 'حماية البيانات الشخصية', status: 'قيد التجديد', color: '#f59e0b', expiry: '03/2026' },
                    { name: 'SOC 2 Type II', desc: 'أمن الخدمات السحابية', status: 'معتمد', color: '#06b6d4', expiry: '09/2026' },
                  ].map((cert, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 2, borderRadius: 2, background: `${cert.color}0d`, border: `1px solid ${cert.color}22` }}>
                        <Box sx={{ width: 44, height: 44, borderRadius: 2, background: `${cert.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🏆</Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: cert.color }}>{cert.name}</Typography>
                          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>{cert.desc}</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'left' }}>
                          <Chip label={cert.status} size="small" sx={{ background: `${cert.color}22`, color: cert.color, fontWeight: 700, fontSize: 10 }} />
                          <Typography variant="caption" display="block" sx={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', fontSize: 9, mt: 0.5, textAlign: 'center' }}>حتى {cert.expiry}</Typography>
                        </Box>
                      </Box>
                    </motion.div>
                  ))}
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* TAB 5: Audit Log */}
          {tab === 5 && !loading && (
            <Glass sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📋 سجل التدقيق الأمني</Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                      {['الحدث', 'المستخدم', 'عنوان IP', 'الوقت', 'النوع'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.auditLog || []).map((log, i) => {
                      const lc = log.type === 'نجاح' ? '#22c55e' : log.type === 'فشل' ? '#ef4444' : log.type === 'أمان' ? '#6366f1' : '#f59e0b';
                      return (
                        <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                          style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                          <td style={{ padding: '12px 16px' }}>
                            <Typography variant="body2" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }}>{log.action}</Typography>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.65)' }}>{log.user}</Typography>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <Typography variant="caption" sx={{ color: '#6366f1', fontFamily: 'monospace' }}>{log.ip}</Typography>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontFamily: 'monospace' }}>{log.time}</Typography>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <Chip label={log.type} size="small" sx={{ background: `${lc}22`, color: lc, border: `1px solid ${lc}44`, fontWeight: 700, fontSize: 10 }} />
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </Box>
            </Glass>
          )}

          {loading && (
            <Grid container spacing={3}>
              {Array(4).fill(null).map((_, i) => <Grid item xs={12} md={6} key={i}><Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} /></Grid>)}
            </Grid>
          )}

        </motion.div>
      </AnimatePresence>

      {/* Scan Dialog */}
      <Dialog open={scanDialog} onClose={() => !scanning && setScanDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: isDark ? '#0a0a1a' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 3, direction: 'rtl' } }}>
        <DialogTitle sx={{ background: G, color: '#fff', fontWeight: 700, borderRadius: '12px 12px 0 0' }}>
          🔍 فحص أمان النظام
        </DialogTitle>
        <DialogContent sx={{ pt: 3, pb: 2 }}>
          {!scanning ? (
            <Box>
              <Typography variant="body2" mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)' }}>
                سيتم إجراء فحص شامل للنظام يشمل:
              </Typography>
              {['🔍 فحص الثغرات الأمنية', '🛡️ تحليل الحركة الشبكية', '👤 مراجعة صلاحيات المستخدمين', '💾 فحص قواعد البيانات', '🔐 التحقق من التشفير'].map((item, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)' }}>{item}</Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Box sx={{ py: 2 }}>
              <Typography variant="body2" fontWeight={600} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>
                🔍 جارٍ الفحص... {scanProgress}%
              </Typography>
              <LinearProgress variant="determinate" value={scanProgress} sx={{ height: 10, borderRadius: 5, background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)', '& .MuiLinearProgress-bar': { background: G, borderRadius: 5 } }} />
              <Typography variant="caption" mt={1} display="block" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                {scanProgress < 30 ? 'فحص الثغرات...' : scanProgress < 60 ? 'تحليل الشبكة...' : scanProgress < 90 ? 'مراجعة الصلاحيات...' : 'اكتمال الفحص...'}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          {!scanning && <Button onClick={() => setScanDialog(false)} sx={{ borderRadius: 2 }}>إلغاء</Button>}
          {!scanning && (
            <Button variant="contained" onClick={handleScan}
              sx={{ background: G, borderRadius: 2, fontWeight: 700 }}>
              🚀 بدء الفحص
            </Button>
          )}
        </DialogActions>
      </Dialog>

    </Box>
  );
}
