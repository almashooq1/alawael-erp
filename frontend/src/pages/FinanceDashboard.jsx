/**
 * FinanceDashboard.jsx — لوحة المالية المتقدمة
 * تصميم Glassmorphism بريميوم | Framer Motion | RTL | Dark/Light
 */
import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  Box, Typography, Grid, Avatar, Chip, LinearProgress,
  Skeleton, Tooltip, IconButton, Badge, Divider,
  Table, TableBody, TableCell, TableHead, TableRow,
  useTheme, alpha,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import PaidIcon from '@mui/icons-material/Paid';
import SavingsIcon from '@mui/icons-material/Savings';
import CreditScoreIcon from '@mui/icons-material/CreditScore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import PsychologyIcon from '@mui/icons-material/Psychology';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import PaymentsIcon from '@mui/icons-material/Payments';
import InsightsIcon from '@mui/icons-material/Insights';

/* ─── Glass ─── */
const Glass = memo(({ children, sx = {}, ...rest }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box sx={{
      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
      borderRadius: 3,
      ...sx,
    }} {...rest}>{children}</Box>
  );
});

/* ─── KPI Card ─── */
const KPICard = memo(({ title, value, subtitle, icon, gradient, trend, delay = 0 }) => {
  const theme = useTheme();
  const up = trend >= 0;
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring', stiffness: 120 }}>
      <Glass sx={{
        p: 2.5, height: '100%', position: 'relative', overflow: 'hidden',
        transition: 'transform .2s, box-shadow .2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 16px 40px ${alpha(theme.palette.common.black, .15)}` },
      }}>
        <Box sx={{ position: 'absolute', insetInlineEnd: -20, top: -20, width: 90, height: 90, borderRadius: '50%', background: gradient, opacity: .12 }} />
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>{icon}</Box>
          <Chip size="small"
            icon={up ? <TrendingUpIcon sx={{ fontSize: 13 }} /> : <TrendingDownIcon sx={{ fontSize: 13 }} />}
            label={`${up ? '+' : ''}${trend}%`}
            sx={{ background: alpha(up ? '#22c55e' : '#ef4444', .15), color: up ? '#16a34a' : '#dc2626', fontWeight: 700, fontSize: 11 }}
          />
        </Box>
        <Typography variant="h4" fontWeight={800} sx={{ background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{value}</Typography>
        <Typography variant="body2" fontWeight={600} color="text.primary" mt={0.5}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
      </Glass>
    </motion.div>
  );
});

/* ─── Tab Button ─── */
const TabBtn = memo(({ label, active, onClick, count }) => {
  const theme = useTheme();
  return (
    <motion.button onClick={onClick} whileTap={{ scale: .96 }} style={{
      background: active ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'transparent',
      color: active ? '#fff' : theme.palette.text.secondary,
      border: active ? 'none' : `1px solid ${alpha(theme.palette.divider, .5)}`,
      borderRadius: 10, padding: '7px 16px', cursor: 'pointer',
      fontWeight: active ? 700 : 500, fontSize: 13,
      display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s',
    }}>
      {label}
      {count !== undefined && (
        <Box component="span" sx={{ background: active ? 'rgba(255,255,255,.25)' : alpha('#22c55e', .15), borderRadius: 10, px: .8, py: .1, fontSize: 11, fontWeight: 700, color: active ? '#fff' : '#16a34a' }}>{count}</Box>
      )}
    </motion.button>
  );
});

/* ─── SVG Line Chart ─── */
const LineChart = memo(({ data = [], color = '#22c55e', height = 100, width = 300, labels = [] }) => {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${height - ((v - min) / range) * (height - 20) - 10}`);
  const polyline = pts.join(' ');
  const area = `M0,${height} L${pts.join(' L')} L${(data.length - 1) * step},${height} Z`;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height + 20}`} preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`lc-${color.replace('#', '')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#lc-${color.replace('#', '')})`} />
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((v, i) => (
        <circle key={i} cx={i * step} cy={parseFloat(pts[i].split(',')[1])} r="4" fill={color} stroke="#fff" strokeWidth="1.5" />
      ))}
      {labels.map((l, i) => (
        <text key={i} x={i * step} y={height + 18} textAnchor="middle" fontSize="10" fill="rgba(128,128,128,.7)">{l}</text>
      ))}
    </svg>
  );
});

/* ─── Invoice Row ─── */
const InvoiceRow = memo(({ id, client, amount, status, date, branch }) => {
  const theme = useTheme();
  const statusColors = { مدفوع: '#22c55e', معلق: '#f59e0b', متأخر: '#ef4444', مسودة: '#6366f1' };
  const c = statusColors[status] || '#6366f1';
  return (
    <TableRow sx={{ '&:hover': { background: alpha(theme.palette.primary.main, .04) }, transition: 'background .2s' }}>
      <TableCell><Typography variant="body2" fontWeight={600} color="primary.main">{id}</Typography></TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 30, height: 30, background: `linear-gradient(135deg,${c},${c}88)`, fontSize: 12, fontWeight: 700 }}>{client.charAt(0)}</Avatar>
          <Typography variant="body2" fontWeight={600}>{client}</Typography>
        </Box>
      </TableCell>
      <TableCell><Typography variant="body2" fontWeight={700} color="success.main">{amount.toLocaleString()} ر.س</Typography></TableCell>
      <TableCell><Chip size="small" label={status} sx={{ background: alpha(c, .15), color: c, fontWeight: 700, fontSize: 10 }} /></TableCell>
      <TableCell><Typography variant="caption" color="text.secondary">{branch}</Typography></TableCell>
      <TableCell><Typography variant="caption" color="text.secondary">{date}</Typography></TableCell>
    </TableRow>
  );
});

/* ─── Expense Row ─── */
const ExpenseRow = memo(({ category, amount, budget, pct }) => {
  const theme = useTheme();
  const over = pct > 100;
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .5 }}>
        <Typography variant="body2" fontWeight={600}>{category}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body2" fontWeight={700} sx={{ color: over ? '#ef4444' : '#22c55e' }}>{amount.toLocaleString()}</Typography>
          <Typography variant="caption" color="text.secondary">/ {budget.toLocaleString()} ر.س</Typography>
          {over && <Chip size="small" label="تجاوز" sx={{ background: alpha('#ef4444', .12), color: '#ef4444', fontWeight: 700, fontSize: 9, height: 18 }} />}
        </Box>
      </Box>
      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ type: 'spring', delay: .1 }} style={{ transformOrigin: 'right' }}>
        <LinearProgress variant="determinate" value={Math.min(pct, 100)}
          sx={{ height: 7, borderRadius: 4, '& .MuiLinearProgress-bar': { background: over ? 'linear-gradient(90deg,#ef4444,#dc2626)' : pct > 80 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#22c55e,#16a34a)' } }}
        />
      </motion.div>
    </Box>
  );
});

/* ─── Alert Item ─── */
const AlertItem = memo(({ type, msg, dept, time }) => {
  const theme = useTheme();
  const colors = { critical: '#ef4444', warning: '#f59e0b', info: '#6366f1', success: '#22c55e' };
  const c = colors[type] || colors.info;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderInlineStart: `3px solid ${c}`, background: alpha(c, .06), borderRadius: '0 8px 8px 0', mb: 1 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0, boxShadow: `0 0 6px ${c}` }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight={600}>{msg}</Typography>
        <Typography variant="caption" color="text.secondary">{dept} · {time}</Typography>
      </Box>
      <Chip size="small" label={type === 'critical' ? 'حرج' : type === 'warning' ? 'تحذير' : type === 'success' ? 'إنجاز' : 'معلومة'}
        sx={{ background: alpha(c, .15), color: c, fontWeight: 700, fontSize: 10 }} />
    </Box>
  );
});

/* ─── Demo Data ─── */
const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو'];
const MONTHS_SHORT = MONTHS.map(m => m.slice(0, 3));

const DEMO = {
  kpis: [
    { title: 'إجمالي الإيرادات', value: '4.8M', subtitle: 'هذا الشهر', icon: <AccountBalanceIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#22c55e,#16a34a)', trend: 12.4 },
    { title: 'إجمالي المصروفات', value: '2.16M', subtitle: 'هذا الشهر', icon: <PaymentsIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#ef4444,#dc2626)', trend: 4.2 },
    { title: 'صافي الربح', value: '2.64M', subtitle: 'هامش 55%', icon: <SavingsIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', trend: 18.7 },
    { title: 'الفواتير المعلقة', value: '142', subtitle: 'بقيمة 380K', icon: <ReceiptLongIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', trend: -12.3 },
    { title: 'التحصيل', value: '94.2%', subtitle: 'معدل التحصيل', icon: <CreditScoreIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)', trend: 2.1 },
    { title: 'السيولة', value: '1.2M', subtitle: 'احتياطي نقدي', icon: <AccountBalanceWalletIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#ec4899,#be185d)', trend: 6.8 },
  ],
  revenue: [3.2, 3.8, 4.1, 3.9, 4.4, 4.6, 4.8],
  expenses: [1.8, 1.9, 2.0, 1.95, 2.05, 2.1, 2.16],
  profit: [1.4, 1.9, 2.1, 1.95, 2.35, 2.5, 2.64],
  invoices: [
    { id: 'INV-2026-0142', client: 'مركز الأمل للتأهيل', amount: 48500, status: 'مدفوع', branch: 'الرياض', date: '2026-03-28' },
    { id: 'INV-2026-0141', client: 'مستشفى الرعاية', amount: 32000, status: 'معلق', branch: 'جدة', date: '2026-03-25' },
    { id: 'INV-2026-0140', client: 'شركة الدعم الطبي', amount: 15800, status: 'متأخر', branch: 'الدمام', date: '2026-03-10' },
    { id: 'INV-2026-0139', client: 'مركز الصحة المتكاملة', amount: 62400, status: 'مدفوع', branch: 'الرياض', date: '2026-03-05' },
    { id: 'INV-2026-0138', client: 'مؤسسة الوفاء', amount: 9800, status: 'مسودة', branch: 'مكة', date: '2026-03-01' },
    { id: 'INV-2026-0137', client: 'تأمين الحياة', amount: 118000, status: 'مدفوع', branch: 'الرياض', date: '2026-02-28' },
  ],
  expenses_breakdown: [
    { category: 'الرواتب والأجور', amount: 1080000, budget: 1100000, pct: 98 },
    { category: 'المعدات الطبية', amount: 280000, budget: 250000, pct: 112 },
    { category: 'الإيجارات والمرافق', amount: 180000, budget: 200000, pct: 90 },
    { category: 'التدريب والتطوير', amount: 65000, budget: 85000, pct: 76 },
    { category: 'الصيانة والإصلاح', amount: 92000, budget: 80000, pct: 115 },
    { category: 'التسويق والإعلان', amount: 45000, budget: 60000, pct: 75 },
    { category: 'الأدوية والمستلزمات', amount: 320000, budget: 340000, pct: 94 },
    { category: 'الإدارة العامة', amount: 98000, budget: 110000, pct: 89 },
  ],
  alerts: [
    { type: 'critical', msg: 'تجاوز ميزانية المعدات الطبية بنسبة 12%', dept: 'المشتريات', time: 'اليوم' },
    { type: 'warning', msg: '18 فاتورة متأخرة عن الدفع (أكثر من 30 يوم)', dept: 'الفوترة', time: 'منذ ساعتين' },
    { type: 'warning', msg: 'تجاوز ميزانية الصيانة بنسبة 15%', dept: 'الصيانة', time: 'أمس' },
    { type: 'success', msg: 'تحقيق هدف الإيرادات الشهري بنسبة 106%', dept: 'المالية', time: 'اليوم' },
    { type: 'info', msg: 'موعد إغلاق الميزانية الربعية في 5 أبريل', dept: 'المحاسبة', time: 'تذكير' },
  ],
  aiInsights: [
    { icon: '📈', text: 'الإيرادات في تصاعد مستمر — النمو المتوقع للربع الثاني هو +14% بناءً على النمط الحالي.' },
    { icon: '⚠️', text: 'إذا استمر الإنفاق على المعدات بهذا المعدل، سيتجاوز الميزانية السنوية بـ 280,000 ر.س بنهاية العام.' },
    { icon: '💡', text: 'تحسين عمليات تحصيل الفواتير المتأخرة يمكن أن يحرر تدفقاً نقدياً فورياً بـ 380,000 ر.س.' },
    { icon: '🎯', text: 'الهدف السنوي البالغ 55M ر.س قابل للتحقيق بنسبة 94% إذا حافظنا على المعدل الحالي.' },
  ],
  branchRevenue: [
    { name: 'الرياض الرئيسي', q1: 5400, q2: 5800, color: '#6366f1' },
    { name: 'جدة', q1: 3200, q2: 3500, color: '#06b6d4' },
    { name: 'الدمام', q1: 2400, q2: 2600, color: '#22c55e' },
    { name: 'مكة', q1: 1800, q2: 1950, color: '#f59e0b' },
    { name: 'المدينة', q1: 1200, q2: 1100, color: '#ef4444' },
  ],
};

const TABS = ['نظرة عامة', 'الإيرادات', 'المصروفات', 'الفواتير', 'التنبيهات', 'ذكاء اصطناعي'];

/* ─── Main ─── */
export default function FinanceDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const bg = isDark
    ? 'radial-gradient(ellipse at 0% 0%, rgba(34,197,94,.12) 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(16,185,129,.1) 0%, transparent 55%), #0f0f1a'
    : 'radial-gradient(ellipse at 0% 0%, rgba(34,197,94,.07) 0%, transparent 55%), radial-gradient(ellipse at 100% 100%, rgba(16,185,129,.06) 0%, transparent 55%), #f1f5f9';

  const refresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setLastRefresh(new Date()); }, 700);
  }, []);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 800); return () => clearTimeout(t); }, []);
  useEffect(() => { const id = setInterval(refresh, 5 * 60 * 1000); return () => clearInterval(id); }, [refresh]);

  return (
    <Box sx={{ minHeight: '100vh', background: bg, p: { xs: 2, md: 3 }, direction: 'rtl' }}>

      {/* ─── Header ─── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
        <Glass sx={{
          p: { xs: 2.5, md: 3 }, mb: 3, overflow: 'hidden', position: 'relative',
          background: isDark ? 'linear-gradient(135deg,rgba(34,197,94,.18),rgba(16,185,129,.12))' : 'linear-gradient(135deg,rgba(34,197,94,.1),rgba(16,185,129,.07))',
        }}>
          <Box sx={{ position: 'absolute', insetInlineEnd: -60, top: -60, width: 240, height: 240, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', opacity: .08 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: 3, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(34,197,94,.4)' }}>
                <AccountBalanceIcon sx={{ color: '#fff', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  لوحة المالية المتقدمة
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  تتبع شامل للإيرادات والمصروفات · مارس 2026 · آخر تحديث: {lastRefresh.toLocaleTimeString('ar-SA')}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Badge badgeContent={DEMO.alerts.filter(a => a.type === 'critical' || a.type === 'warning').length} color="error">
                <IconButton size="small" sx={{ background: alpha(theme.palette.error.main, .1) }}>
                  <NotificationsActiveIcon fontSize="small" color="error" />
                </IconButton>
              </Badge>
              <Tooltip title="تحديث">
                <IconButton onClick={refresh} size="small" sx={{ background: alpha('#22c55e', .1) }}>
                  <RefreshIcon fontSize="small" sx={{ color: '#22c55e' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 3, mt: 2.5, flexWrap: 'wrap' }}>
            {[
              { label: 'هامش الربح', value: '55%' },
              { label: 'معدل التحصيل', value: '94.2%' },
              { label: 'نمو الإيرادات', value: '+12.4%' },
              { label: 'الفواتير المتأخرة', value: '18' },
            ].map((s, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)' }} />
                <Typography variant="caption" color="text.secondary">{s.label}:</Typography>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#22c55e' }}>{s.value}</Typography>
              </Box>
            ))}
          </Box>
        </Glass>
      </motion.div>

      {/* ─── KPI Cards ─── */}
      {loading ? (
        <Grid container spacing={2} mb={3}>
          {[...Array(6)].map((_, i) => <Grid item xs={12} sm={6} md={4} lg={2} key={i}><Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} /></Grid>)}
        </Grid>
      ) : (
        <Grid container spacing={2} mb={3}>
          {DEMO.kpis.map((k, i) => <Grid item xs={12} sm={6} md={4} lg={2} key={i}><KPICard {...k} delay={i * .07} /></Grid>)}
        </Grid>
      )}

      {/* ─── Tabs ─── */}
      <Glass sx={{ p: 1.5, mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {TABS.map((t, i) => (
          <TabBtn key={i} label={t} active={tab === i} onClick={() => setTab(i)} count={i === 4 ? DEMO.alerts.length : undefined} />
        ))}
      </Glass>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .3 }}>

          {/* ─── Tab 0: نظرة عامة ─── */}
          {tab === 0 && (
            <Grid container spacing={3}>
              {/* الملخص المالي */}
              <Grid item xs={12}>
                <Glass sx={{ p: 3, background: isDark ? 'linear-gradient(135deg,rgba(34,197,94,.15),rgba(16,185,129,.1))' : 'linear-gradient(135deg,rgba(34,197,94,.08),rgba(16,185,129,.05))' }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>الملخص المالي — مارس 2026</Typography>
                  <Grid container spacing={2}>
                    {[
                      { label: 'الإيرادات', value: '4,800,000 ر.س', pct: 100, color: '#22c55e' },
                      { label: 'المصروفات', value: '2,160,000 ر.س', pct: 45, color: '#ef4444' },
                      { label: 'صافي الربح', value: '2,640,000 ر.س', pct: 55, color: '#6366f1' },
                    ].map((s, i) => (
                      <Grid item xs={12} md={4} key={i}>
                        <motion.div initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * .12 }}>
                          <Box sx={{ p: 2.5, background: alpha(s.color, .1), borderRadius: 2, border: `1px solid ${alpha(s.color, .2)}` }}>
                            <Typography variant="caption" color="text.secondary" display="block" mb={1}>{s.label}</Typography>
                            <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
                            <Box sx={{ mt: 1.5 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .4 }}>
                                <Typography variant="caption" color="text.secondary">نسبة من الإيرادات</Typography>
                                <Typography variant="caption" fontWeight={700} sx={{ color: s.color }}>{s.pct}%</Typography>
                              </Box>
                              <LinearProgress variant="determinate" value={s.pct} sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg,${s.color},${s.color}aa)` } }} />
                            </Box>
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>

              {/* Line chart الإيرادات */}
              <Grid item xs={12} md={8}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>مقارنة الإيرادات والمصروفات</Typography>
                      <Typography variant="caption" color="text.secondary">مليون ر.س — آخر 7 أشهر</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      {[{ label: 'الإيرادات', color: '#22c55e' }, { label: 'المصروفات', color: '#ef4444' }, { label: 'الربح', color: '#6366f1' }].map((l, i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: .5 }}>
                          <Box sx={{ width: 12, height: 3, borderRadius: 2, background: l.color }} />
                          <Typography variant="caption" color="text.secondary">{l.label}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <Box sx={{ position: 'relative' }}>
                    <LineChart data={DEMO.revenue} color="#22c55e" labels={MONTHS_SHORT} height={100} width={300} />
                    <Box sx={{ mt: -2 }}>
                      <LineChart data={DEMO.expenses} color="#ef4444" labels={MONTHS_SHORT} height={100} width={300} />
                    </Box>
                  </Box>
                </Glass>
              </Grid>

              {/* أداء الفروع */}
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>إيرادات الفروع Q1 vs Q2</Typography>
                  {DEMO.branchRevenue.map((b, i) => (
                    <Box key={i} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .4 }}>
                        <Typography variant="body2" fontWeight={600}>{b.name}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: .5 }}>
                          <Typography variant="caption" fontWeight={700} sx={{ color: b.color }}>{b.q2}K</Typography>
                          {b.q2 >= b.q1
                            ? <TrendingUpIcon sx={{ fontSize: 13, color: '#22c55e' }} />
                            : <TrendingDownIcon sx={{ fontSize: 13, color: '#ef4444' }} />}
                        </Box>
                      </Box>
                      <LinearProgress variant="determinate" value={(b.q2 / 6000) * 100}
                        sx={{ height: 7, borderRadius: 4, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg,${b.color},${b.color}99)` } }}
                      />
                    </Box>
                  ))}
                </Glass>
              </Grid>

              {/* أحدث التنبيهات */}
              <Grid item xs={12}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>أحدث التنبيهات المالية</Typography>
                  <Grid container spacing={1}>
                    {DEMO.alerts.slice(0, 4).map((a, i) => (
                      <Grid item xs={12} md={6} key={i}>
                        <AlertItem {...a} />
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ─── Tab 1: الإيرادات ─── */}
          {tab === 1 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>اتجاه الإيرادات الشهرية</Typography>
                      <Typography variant="caption" color="text.secondary">مليون ر.س — يناير إلى يوليو 2026</Typography>
                    </Box>
                    <Chip label="↑ 12.4%" icon={<TrendingUpIcon />} sx={{ background: alpha('#22c55e', .15), color: '#16a34a', fontWeight: 700 }} />
                  </Box>
                  {/* Bar Chart */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 160 }}>
                    {DEMO.revenue.map((v, i) => {
                      const pct = v / Math.max(...DEMO.revenue);
                      return (
                        <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: .5 }}>
                          <Typography variant="caption" fontWeight={700} sx={{ color: '#22c55e' }}>{v}M</Typography>
                          <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * .08, type: 'spring' }}
                            style={{ transformOrigin: 'bottom', width: '100%', borderRadius: '6px 6px 0 0', height: `${pct * 130}px`, background: i === DEMO.revenue.length - 1 ? 'linear-gradient(180deg,#22c55e,#16a34a)' : `rgba(34,197,94,${.3 + pct * .5})` }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{MONTHS_SHORT[i]}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Glass>
              </Grid>

              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>مصادر الإيرادات</Typography>
                  {[
                    { source: 'خدمات التأهيل', amount: 2160000, pct: 45, color: '#22c55e' },
                    { source: 'الاستشارات الطبية', amount: 1200000, pct: 25, color: '#6366f1' },
                    { source: 'عقود التأمين', amount: 960000, pct: 20, color: '#06b6d4' },
                    { source: 'التدريب والتعليم', amount: 480000, pct: 10, color: '#f59e0b' },
                  ].map((s, i) => (
                    <Box key={i} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .4 }}>
                        <Typography variant="body2" fontWeight={600}>{s.source}</Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: s.color }}>{s.pct}%</Typography>
                      </Box>
                      <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * .08, type: 'spring' }} style={{ transformOrigin: 'right' }}>
                        <LinearProgress variant="determinate" value={s.pct}
                          sx={{ height: 7, borderRadius: 4, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg,${s.color},${s.color}99)` } }}
                        />
                      </motion.div>
                      <Typography variant="caption" color="text.secondary">{s.amount.toLocaleString()} ر.س</Typography>
                    </Box>
                  ))}
                </Glass>
              </Grid>

              <Grid item xs={12}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>إيرادات الفروع التفصيلية</Typography>
                  <Grid container spacing={2}>
                    {DEMO.branchRevenue.map((b, i) => (
                      <Grid item xs={12} sm={6} md={4} lg={2.4} key={i}>
                        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .08 }}>
                          <Box sx={{ p: 2, background: alpha(b.color, .08), borderRadius: 2, border: `1px solid ${alpha(b.color, .2)}`, textAlign: 'center' }}>
                            <Avatar sx={{ width: 40, height: 40, background: b.color, fontWeight: 700, mx: 'auto', mb: 1 }}>{b.name.charAt(0)}</Avatar>
                            <Typography variant="body2" fontWeight={700}>{b.name}</Typography>
                            <Typography variant="h6" fontWeight={800} sx={{ color: b.color }}>{b.q2}K</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: .5 }}>
                              {b.q2 >= b.q1 ? <TrendingUpIcon sx={{ fontSize: 14, color: '#22c55e' }} /> : <TrendingDownIcon sx={{ fontSize: 14, color: '#ef4444' }} />}
                              <Typography variant="caption" sx={{ color: b.q2 >= b.q1 ? '#22c55e' : '#ef4444', fontWeight: 700 }}>
                                {b.q2 >= b.q1 ? '+' : ''}{(((b.q2 - b.q1) / b.q1) * 100).toFixed(1)}%
                              </Typography>
                            </Box>
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ─── Tab 2: المصروفات ─── */}
          {tab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6" fontWeight={700}>تفاصيل المصروفات</Typography>
                    <Chip size="small" label="2,160,000 ر.س" sx={{ background: alpha('#ef4444', .12), color: '#ef4444', fontWeight: 700 }} />
                  </Box>
                  {DEMO.expenses_breakdown.map((e, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .06 }}>
                      <ExpenseRow {...e} />
                    </motion.div>
                  ))}
                </Glass>
              </Grid>

              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>مقارنة المصروفات الشهرية</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 140 }}>
                    {DEMO.expenses.map((v, i) => {
                      const pct = v / Math.max(...DEMO.expenses);
                      return (
                        <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: .5 }}>
                          <Typography variant="caption" fontWeight={700} sx={{ color: '#ef4444', fontSize: 9 }}>{v}M</Typography>
                          <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * .08, type: 'spring' }}
                            style={{ transformOrigin: 'bottom', width: '100%', borderRadius: '4px 4px 0 0', height: `${pct * 110}px`, background: `rgba(239,68,68,${.4 + pct * .5})` }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>{MONTHS_SHORT[i]}</Typography>
                        </Box>
                      );
                    })}
                  </Box>

                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" fontWeight={700} mb={1.5} color="text.secondary">بنود تجاوزت الميزانية</Typography>
                  {DEMO.expenses_breakdown.filter(e => e.pct > 100).map((e, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, mb: 1, background: alpha('#ef4444', .08), borderRadius: 2 }}>
                      <Typography variant="body2" fontWeight={600}>{e.category}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" fontWeight={700} color="error.main">{e.pct}%</Typography>
                        <Chip size="small" label={`+${e.amount - e.budget} ر.س زيادة`} sx={{ background: alpha('#ef4444', .12), color: '#ef4444', fontSize: 9 }} />
                      </Box>
                    </Box>
                  ))}
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ─── Tab 3: الفواتير ─── */}
          {tab === 3 && (
            <Glass sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h6" fontWeight={700}>سجل الفواتير</Typography>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                  {[
                    { label: 'مدفوع', count: DEMO.invoices.filter(i => i.status === 'مدفوع').length, color: '#22c55e' },
                    { label: 'معلق', count: DEMO.invoices.filter(i => i.status === 'معلق').length, color: '#f59e0b' },
                    { label: 'متأخر', count: DEMO.invoices.filter(i => i.status === 'متأخر').length, color: '#ef4444' },
                  ].map((s, i) => (
                    <Chip key={i} size="small" label={`${s.label}: ${s.count}`} sx={{ background: alpha(s.color, .12), color: s.color, fontWeight: 700 }} />
                  ))}
                </Box>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['رقم الفاتورة', 'العميل', 'المبلغ', 'الحالة', 'الفرع', 'التاريخ'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {DEMO.invoices.map((inv, i) => (
                    <motion.tr key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * .06 }}>
                      <InvoiceRow {...inv} />
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </Glass>
          )}

          {/* ─── Tab 4: التنبيهات ─── */}
          {tab === 4 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <WarningAmberIcon color="warning" />
                    <Typography variant="h6" fontWeight={700}>التنبيهات المالية</Typography>
                    <Chip label={DEMO.alerts.length} size="small" color="warning" />
                  </Box>
                  {DEMO.alerts.map((a, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .08 }}>
                      <AlertItem {...a} />
                    </motion.div>
                  ))}
                </Glass>
              </Grid>
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>ملخص</Typography>
                  {[
                    { label: 'حرجة', count: DEMO.alerts.filter(a => a.type === 'critical').length, color: '#ef4444' },
                    { label: 'تحذير', count: DEMO.alerts.filter(a => a.type === 'warning').length, color: '#f59e0b' },
                    { label: 'إنجاز', count: DEMO.alerts.filter(a => a.type === 'success').length, color: '#22c55e' },
                    { label: 'معلومة', count: DEMO.alerts.filter(a => a.type === 'info').length, color: '#6366f1' },
                  ].map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, mb: 1.5, background: alpha(s.color, .1), borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                        <Typography variant="body2" fontWeight={600}>{s.label}</Typography>
                      </Box>
                      <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>{s.count}</Typography>
                    </Box>
                  ))}
                  <Box sx={{ mt: 2, p: 2, background: alpha('#22c55e', .08), borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutlineIcon color="success" fontSize="small" />
                    <Typography variant="caption" color="success.main">تم حل 6 تنبيهات هذا الأسبوع</Typography>
                  </Box>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ─── Tab 5: ذكاء اصطناعي ─── */}
          {tab === 5 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Glass sx={{ p: 3, background: isDark ? 'linear-gradient(135deg,rgba(34,197,94,.18),rgba(16,185,129,.12))' : 'linear-gradient(135deg,rgba(34,197,94,.1),rgba(16,185,129,.07))' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 2.5, background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PsychologyIcon sx={{ color: '#fff' }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>توصيات ذكاء اصطناعي — المالية</Typography>
                      <Typography variant="caption" color="text.secondary">تحليل مالي متقدم وتوقعات استراتيجية</Typography>
                    </Box>
                    <Chip label="AI-Powered" sx={{ ml: 'auto', background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: '#fff', fontWeight: 700 }} />
                  </Box>
                  <Grid container spacing={2}>
                    {DEMO.aiInsights.map((ins, i) => (
                      <Grid item xs={12} md={6} key={i}>
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .1 }}>
                          <Box sx={{ p: 2.5, background: isDark ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.7)', borderRadius: 2, border: `1px solid ${alpha('#22c55e', .2)}`, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                            <Typography fontSize={24}>{ins.icon}</Typography>
                            <Typography variant="body2" color="text.primary" lineHeight={1.7}>{ins.text}</Typography>
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>

              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <InsightsIcon sx={{ color: '#22c55e' }} />
                    <Typography variant="h6" fontWeight={700}>توقعات الربع الثاني</Typography>
                  </Box>
                  {[
                    { label: 'الإيرادات المتوقعة', value: '16.2M ر.س', trend: '+14%', color: '#22c55e' },
                    { label: 'المصروفات المتوقعة', value: '7.1M ر.س', trend: '+3.5%', color: '#ef4444' },
                    { label: 'صافي الربح المتوقع', value: '9.1M ر.س', trend: '+21%', color: '#6366f1' },
                    { label: 'معدل التحصيل المتوقع', value: '96%', trend: '+1.8%', color: '#f59e0b' },
                  ].map((f, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .08 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, mb: 1, background: alpha(f.color, .08), borderRadius: 2 }}>
                        <Typography variant="body2" fontWeight={600}>{f.label}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: f.color }}>{f.value}</Typography>
                          <Chip size="small" label={f.trend} sx={{ background: alpha('#22c55e', .12), color: '#16a34a', fontWeight: 700, fontSize: 10 }} />
                        </Box>
                      </Box>
                    </motion.div>
                  ))}
                </Glass>
              </Grid>

              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <AutoGraphIcon sx={{ color: '#6366f1' }} />
                    <Typography variant="h6" fontWeight={700}>الصحة المالية للمنظمة</Typography>
                  </Box>
                  {[
                    { label: 'السيولة المالية', value: 82, color: '#22c55e' },
                    { label: 'كفاءة التحصيل', value: 94, color: '#6366f1' },
                    { label: 'إدارة المصروفات', value: 74, color: '#f59e0b' },
                    { label: 'الاستدامة المالية', value: 88, color: '#06b6d4' },
                  ].map((s, i) => (
                    <Box key={i} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .4 }}>
                        <Typography variant="body2" fontWeight={600}>{s.label}</Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: s.color }}>{s.value}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={s.value} sx={{ height: 7, borderRadius: 3, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg,${s.color},${s.color}99)` } }} />
                    </Box>
                  ))}
                </Glass>
              </Grid>
            </Grid>
          )}
        </motion.div>
      </AnimatePresence>
    </Box>
  );
}
