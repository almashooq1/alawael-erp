/**
 * CEODashboard.jsx — لوحة تحكم الرئيس التنفيذي (CEO)
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
import GroupsIcon from '@mui/icons-material/Groups';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import AutoGraphIcon from '@mui/icons-material/AutoGraph';
import PsychologyIcon from '@mui/icons-material/Psychology';
import BusinessIcon from '@mui/icons-material/Business';
import SpeedIcon from '@mui/icons-material/Speed';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

/* ─── Glass component ─── */
const Glass = memo(({ children, sx = {}, ...rest }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        background: isDark
          ? 'rgba(255,255,255,0.04)'
          : 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
        borderRadius: 3,
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
});

/* ─── KPI Card ─── */
const KPICard = memo(({ title, value, subtitle, icon, gradient, trend, delay = 0 }) => {
  const theme = useTheme();
  const up = trend >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 120 }}
    >
      <Glass
        sx={{
          p: 2.5,
          height: '100%',
          position: 'relative',
          overflow: 'hidden',
          cursor: 'default',
          transition: 'transform .2s, box-shadow .2s',
          '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 16px 40px ${alpha(theme.palette.common.black, .15)}` },
        }}
      >
        <Box sx={{ position: 'absolute', insetInlineEnd: -20, top: -20, width: 100, height: 100, borderRadius: '50%', background: gradient, opacity: .15 }} />
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: 2, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            {icon}
          </Box>
          <Chip
            size="small"
            icon={up ? <TrendingUpIcon sx={{ fontSize: 14 }} /> : <TrendingDownIcon sx={{ fontSize: 14 }} />}
            label={`${up ? '+' : ''}${trend}%`}
            sx={{
              background: alpha(up ? '#22c55e' : '#ef4444', .15),
              color: up ? '#16a34a' : '#dc2626',
              fontWeight: 700,
              fontSize: 11,
            }}
          />
        </Box>
        <Typography variant="h4" fontWeight={800} sx={{ background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {value}
        </Typography>
        <Typography variant="body2" fontWeight={600} color="text.primary" mt={0.5}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
      </Glass>
    </motion.div>
  );
});

/* ─── SVG Sparkline ─── */
const Sparkline = memo(({ data = [], color = '#6366f1', height = 40 }) => {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120;
  const step = w / (data.length - 1);
  const pts = data.map((v, i) => `${i * step},${height - ((v - min) / range) * height}`).join(' ');
  const area = `M0,${height} L${pts.split(' ').join(' L')} L${(data.length - 1) * step},${height} Z`;
  return (
    <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#sg-${color.replace('#','')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
});

/* ─── Tab Button ─── */
const TabBtn = memo(({ label, active, onClick, count }) => {
  const theme = useTheme();
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: .96 }}
      style={{
        background: active ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'transparent',
        color: active ? '#fff' : theme.palette.text.secondary,
        border: active ? 'none' : `1px solid ${alpha(theme.palette.divider, .5)}`,
        borderRadius: 10,
        padding: '7px 16px',
        cursor: 'pointer',
        fontWeight: active ? 700 : 500,
        fontSize: 13,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        transition: 'all .2s',
      }}
    >
      {label}
      {count !== undefined && (
        <Box component="span" sx={{ background: active ? 'rgba(255,255,255,.25)' : alpha(theme.palette.primary.main, .15), borderRadius: 10, px: .8, py: .1, fontSize: 11, fontWeight: 700, color: active ? '#fff' : theme.palette.primary.main }}>
          {count}
        </Box>
      )}
    </motion.button>
  );
});

/* ─── Ring Gauge ─── */
const RingGauge = memo(({ value, max = 100, color, label, size = 80 }) => {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const dash = pct * circ;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: .5 }}>
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(128,128,128,.15)" strokeWidth="8" />
        <circle
          cx="40" cy="40" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 40 40)"
        />
        <text x="40" y="45" textAnchor="middle" fill={color} fontSize="14" fontWeight="bold">{Math.round(pct * 100)}%</text>
      </svg>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
    </Box>
  );
});

/* ─── Alert Row ─── */
const AlertRow = memo(({ type, msg, branch, time }) => {
  const colors = { critical: '#ef4444', warning: '#f59e0b', info: '#6366f1' };
  const c = colors[type] || colors.info;
  return (
    <Box sx={{
      display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5,
      borderInlineStart: `3px solid ${c}`,
      background: alpha(c, .06), borderRadius: '0 8px 8px 0', mb: 1,
    }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0, boxShadow: `0 0 6px ${c}` }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight={600} color="text.primary">{msg}</Typography>
        <Typography variant="caption" color="text.secondary">{branch} · {time}</Typography>
      </Box>
      <Chip size="small" label={type === 'critical' ? 'حرج' : type === 'warning' ? 'تحذير' : 'معلومة'} sx={{ background: alpha(c, .15), color: c, fontWeight: 700, fontSize: 10 }} />
    </Box>
  );
});

/* ─── Branch Row ─── */
const BranchRow = memo(({ name, revenue, patients, score, trend }) => {
  const theme = useTheme();
  const up = trend >= 0;
  return (
    <TableRow sx={{ '&:hover': { background: alpha(theme.palette.primary.main, .04) }, transition: 'background .2s' }}>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar sx={{ width: 32, height: 32, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontSize: 13, fontWeight: 700 }}>
            {name.charAt(0)}
          </Avatar>
          <Typography variant="body2" fontWeight={600}>{name}</Typography>
        </Box>
      </TableCell>
      <TableCell><Typography variant="body2" fontWeight={600} color="primary.main">{revenue.toLocaleString()} ر.س</Typography></TableCell>
      <TableCell><Typography variant="body2">{patients.toLocaleString()}</Typography></TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress variant="determinate" value={score} sx={{ flex: 1, height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { background: score >= 80 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : score >= 60 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#ef4444,#dc2626)' } }} />
          <Typography variant="caption" fontWeight={700}>{score}%</Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: .5, color: up ? '#16a34a' : '#dc2626' }}>
          {up ? <TrendingUpIcon sx={{ fontSize: 16 }} /> : <TrendingDownIcon sx={{ fontSize: 16 }} />}
          <Typography variant="caption" fontWeight={700}>{up ? '+' : ''}{trend}%</Typography>
        </Box>
      </TableCell>
    </TableRow>
  );
});

/* ─── Demo Data ─── */
const DEMO = {
  kpis: [
    { title: 'إجمالي الإيرادات', value: '4.8M', subtitle: 'هذا الشهر', icon: <AccountBalanceIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', trend: 12.4 },
    { title: 'إجمالي المرضى', value: '12,840', subtitle: 'نشط حالياً', icon: <MedicalServicesIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)', trend: 8.7 },
    { title: 'الموظفون', value: '348', subtitle: 'في جميع الفروع', icon: <GroupsIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', trend: 3.2 },
    { title: 'معدل الأداء', value: '87%', subtitle: 'متوسط الفروع', icon: <SpeedIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#22c55e,#16a34a)', trend: 5.1 },
    { title: 'رضا المرضى', value: '94%', subtitle: 'تقييمات هذا الشهر', icon: <EmojiEventsIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#ec4899,#be185d)', trend: 2.3 },
    { title: 'الاستيعاب', value: '79%', subtitle: 'طاقة الفروع', icon: <BusinessIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#f97316,#ea580c)', trend: -1.8 },
  ],
  revenue: [3.2, 3.8, 4.1, 3.9, 4.4, 4.6, 4.8],
  patients: [9800, 10200, 10800, 11200, 11600, 12100, 12840],
  branches: [
    { name: 'الرياض الرئيسي', revenue: 1850000, patients: 4200, score: 92, trend: 14 },
    { name: 'جدة', revenue: 1100000, patients: 3100, score: 87, trend: 9 },
    { name: 'الدمام', revenue: 820000, patients: 2400, score: 81, trend: 6 },
    { name: 'مكة المكرمة', revenue: 620000, patients: 1800, score: 76, trend: -2 },
    { name: 'المدينة المنورة', revenue: 410000, patients: 1340, score: 69, trend: -5 },
  ],
  alerts: [
    { type: 'critical', msg: 'انخفاض حاد في إيرادات فرع المدينة (-18%)', branch: 'المدينة المنورة', time: 'منذ ساعة' },
    { type: 'warning', msg: 'نسبة غياب الموظفين فوق المعدل (12%)', branch: 'جدة', time: 'منذ 3 ساعات' },
    { type: 'warning', msg: 'معدل استيعاب منخفض في فرع مكة', branch: 'مكة المكرمة', time: 'منذ 5 ساعات' },
    { type: 'info', msg: 'تحقيق هدف المرضى الشهري في الرياض', branch: 'الرياض', time: 'اليوم' },
    { type: 'info', msg: 'تجديد عقد الدمام بنجاح', branch: 'الدمام', time: 'أمس' },
  ],
  rings: [
    { label: 'الأداء المالي', value: 87, color: '#6366f1' },
    { label: 'رضا المرضى', value: 94, color: '#22c55e' },
    { label: 'كفاءة الموظفين', value: 78, color: '#f59e0b' },
    { label: 'جودة الخدمة', value: 91, color: '#06b6d4' },
  ],
  aiInsights: [
    { icon: '📈', text: 'من المتوقع نمو إيرادات فرع جدة بنسبة 15% خلال الربع القادم بناءً على الاتجاه الحالي.' },
    { icon: '⚠️', text: 'فرع المدينة المنورة يحتاج تدخلاً عاجلاً — توقع استمرار الانخفاض دون إجراء.' },
    { icon: '🎯', text: 'الهدف السنوي البالغ 55M ر.س قابل للتحقيق إذا حافظنا على معدل النمو الحالي (4.8M/شهر).' },
    { icon: '💡', text: 'زيادة كادر العلاج الطبيعي في الرياض بنسبة 10% قد يرفع الطاقة الاستيعابية إلى 95%.' },
  ],
};

const TABS = ['نظرة عامة', 'الفروع', 'المالية', 'التنبيهات', 'ذكاء اصطناعي'];

/* ─── Main Component ─── */
export default function CEODashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const bg = isDark
    ? 'radial-gradient(ellipse at 0% 0%, rgba(99,102,241,.15) 0%, transparent 60%), radial-gradient(ellipse at 100% 100%, rgba(139,92,246,.12) 0%, transparent 60%), #0f0f1a'
    : 'radial-gradient(ellipse at 0% 0%, rgba(99,102,241,.08) 0%, transparent 60%), radial-gradient(ellipse at 100% 100%, rgba(139,92,246,.06) 0%, transparent 60%), #f1f5f9';

  const refresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setLastRefresh(new Date()); }, 800);
  }, []);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 900); return () => clearTimeout(t); }, []);
  useEffect(() => { const id = setInterval(refresh, 5 * 60 * 1000); return () => clearInterval(id); }, [refresh]);

  return (
    <Box sx={{ minHeight: '100vh', background: bg, p: { xs: 2, md: 3 }, direction: 'rtl' }}>

      {/* ─── Header ─── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
        <Glass sx={{ p: { xs: 2.5, md: 3 }, mb: 3, background: isDark ? 'linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.15))' : 'linear-gradient(135deg,rgba(99,102,241,.12),rgba(139,92,246,.08))', overflow: 'hidden', position: 'relative' }}>
          <Box sx={{ position: 'absolute', insetInlineEnd: -60, top: -60, width: 240, height: 240, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', opacity: .08 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: 3, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(99,102,241,.4)' }}>
                <AutoGraphIcon sx={{ color: '#fff', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  لوحة تحكم الرئيس التنفيذي
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  نظرة شاملة على أداء المنظمة · آخر تحديث: {lastRefresh.toLocaleTimeString('ar-SA')}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Badge badgeContent={DEMO.alerts.filter(a => a.type === 'critical').length} color="error">
                <IconButton size="small" sx={{ background: alpha(theme.palette.error.main, .1), '&:hover': { background: alpha(theme.palette.error.main, .2) } }}>
                  <NotificationsActiveIcon fontSize="small" color="error" />
                </IconButton>
              </Badge>
              <Tooltip title="تحديث البيانات">
                <IconButton onClick={refresh} size="small" sx={{ background: alpha(theme.palette.primary.main, .1), '&:hover': { background: alpha(theme.palette.primary.main, .2) } }}>
                  <RefreshIcon fontSize="small" color="primary" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Quick stats bar */}
          <Box sx={{ display: 'flex', gap: 3, mt: 2.5, flexWrap: 'wrap' }}>
            {[
              { label: 'الفروع النشطة', value: '5' },
              { label: 'التنبيهات الحرجة', value: DEMO.alerts.filter(a => a.type === 'critical').length },
              { label: 'نمو الإيرادات', value: '+12.4%' },
              { label: 'هدف الشهر', value: '96%' },
            ].map((s, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }} />
                <Typography variant="caption" color="text.secondary">{s.label}:</Typography>
                <Typography variant="caption" fontWeight={700} color="primary.main">{s.value}</Typography>
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
          {DEMO.kpis.map((k, i) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
              <KPICard {...k} delay={i * 0.07} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* ─── Tabs ─── */}
      <Glass sx={{ p: 1.5, mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {TABS.map((t, i) => (
          <TabBtn key={i} label={t} active={tab === i} onClick={() => setTab(i)}
            count={i === 3 ? DEMO.alerts.length : undefined}
          />
        ))}
      </Glass>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .3 }}>

          {/* ─── Tab 0: نظرة عامة ─── */}
          {tab === 0 && (
            <Grid container spacing={3}>
              {/* Revenue trend */}
              <Grid item xs={12} md={8}>
                <Glass sx={{ p: 3, height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>اتجاه الإيرادات</Typography>
                      <Typography variant="caption" color="text.secondary">الأشهر السبعة الماضية (مليون ر.س)</Typography>
                    </Box>
                    <Chip label="نمو +12.4%" icon={<TrendingUpIcon />} sx={{ background: alpha('#22c55e', .15), color: '#16a34a', fontWeight: 700 }} />
                  </Box>
                  {/* SVG Bar Chart */}
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 140 }}>
                    {DEMO.revenue.map((v, i) => {
                      const pct = v / Math.max(...DEMO.revenue);
                      const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو'];
                      return (
                        <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: .5 }}>
                          <Typography variant="caption" fontWeight={700} color="primary.main">{v}M</Typography>
                          <motion.div
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: 1 }}
                            transition={{ delay: i * .08, type: 'spring' }}
                            style={{ transformOrigin: 'bottom', width: '100%', borderRadius: '6px 6px 0 0', height: `${pct * 100}px`, background: i === DEMO.revenue.length - 1 ? 'linear-gradient(180deg,#6366f1,#8b5cf6)' : `rgba(99,102,241,${.3 + pct * .4})` }}
                          />
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>{months[i].slice(0, 3)}</Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Glass>
              </Grid>

              {/* Performance rings */}
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight={700} mb={.5}>مؤشرات الأداء</Typography>
                  <Typography variant="caption" color="text.secondary">مستوى الأداء الكلي للمنظمة</Typography>
                  <Grid container spacing={2} mt={1}>
                    {DEMO.rings.map((r, i) => (
                      <Grid item xs={6} key={i} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <motion.div initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * .1 }}>
                          <RingGauge {...r} />
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>

              {/* Top branches mini */}
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>أفضل الفروع أداءً</Typography>
                  {DEMO.branches.slice(0, 3).map((b, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                      <Avatar sx={{ width: 36, height: 36, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontWeight: 700, fontSize: 14 }}>{b.name.charAt(0)}</Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2" fontWeight={600}>{b.name}</Typography>
                          <Typography variant="body2" fontWeight={700} color="primary.main">{b.score}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={b.score} sx={{ height: 5, borderRadius: 3, mt: .5, '& .MuiLinearProgress-bar': { background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' } }} />
                      </Box>
                    </Box>
                  ))}
                </Glass>
              </Grid>

              {/* Recent alerts mini */}
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>أحدث التنبيهات</Typography>
                  {DEMO.alerts.slice(0, 3).map((a, i) => <AlertRow key={i} {...a} />)}
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ─── Tab 1: الفروع ─── */}
          {tab === 1 && (
            <Glass sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h6" fontWeight={700}>أداء الفروع التفصيلي</Typography>
                <Chip label="5 فروع نشطة" icon={<BusinessIcon />} color="primary" size="small" />
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['الفرع', 'الإيرادات', 'المرضى', 'درجة الأداء', 'الاتجاه'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {DEMO.branches.map((b, i) => <BranchRow key={i} {...b} />)}
                </TableBody>
              </Table>

              <Divider sx={{ my: 3 }} />
              <Grid container spacing={2}>
                {DEMO.branches.map((b, i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <motion.div initial={{ opacity: 0, scale: .95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * .08 }}>
                      <Glass sx={{ p: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                          <Avatar sx={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', fontWeight: 700 }}>{b.name.charAt(0)}</Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={700}>{b.name}</Typography>
                            <Typography variant="caption" color="text.secondary">فرع نشط</Typography>
                          </Box>
                        </Box>
                        <Grid container spacing={1}>
                          {[
                            { l: 'الإيرادات', v: `${(b.revenue / 1000000).toFixed(2)}M` },
                            { l: 'المرضى', v: b.patients.toLocaleString() },
                          ].map((s, j) => (
                            <Grid item xs={6} key={j}>
                              <Box sx={{ background: alpha(theme.palette.primary.main, .07), borderRadius: 2, p: 1, textAlign: 'center' }}>
                                <Typography variant="caption" color="text.secondary">{s.l}</Typography>
                                <Typography variant="body2" fontWeight={700} color="primary.main">{s.v}</Typography>
                              </Box>
                            </Grid>
                          ))}
                        </Grid>
                        <Box sx={{ mt: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .5 }}>
                            <Typography variant="caption" color="text.secondary">الأداء</Typography>
                            <Typography variant="caption" fontWeight={700}>{b.score}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={b.score} sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { background: b.score >= 80 ? 'linear-gradient(90deg,#22c55e,#16a34a)' : 'linear-gradient(90deg,#f59e0b,#d97706)' } }} />
                        </Box>
                      </Glass>
                    </motion.div>
                  </Grid>
                ))}
              </Grid>
            </Glass>
          )}

          {/* ─── Tab 2: المالية ─── */}
          {tab === 2 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Glass sx={{ p: 3, background: isDark ? 'linear-gradient(135deg,rgba(34,197,94,.15),rgba(16,185,129,.1))' : 'linear-gradient(135deg,rgba(34,197,94,.08),rgba(16,185,129,.05))' }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>الملخص المالي الشهري</Typography>
                  <Grid container spacing={3}>
                    {[
                      { label: 'إجمالي الإيرادات', value: '4,800,000', unit: 'ر.س', color: '#22c55e', icon: <TrendingUpIcon /> },
                      { label: 'المصروفات التشغيلية', value: '2,160,000', unit: 'ر.س', color: '#ef4444', icon: <TrendingDownIcon /> },
                      { label: 'صافي الربح', value: '2,640,000', unit: 'ر.س', color: '#6366f1', icon: <AccountBalanceIcon /> },
                      { label: 'هامش الربح', value: '55%', unit: '', color: '#f59e0b', icon: <SpeedIcon /> },
                    ].map((item, i) => (
                      <Grid item xs={12} sm={6} md={3} key={i}>
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .1 }}>
                          <Box sx={{ p: 2, background: alpha(item.color, .1), borderRadius: 2, textAlign: 'center', border: `1px solid ${alpha(item.color, .2)}` }}>
                            <Box sx={{ color: item.color, mb: 1 }}>{item.icon}</Box>
                            <Typography variant="h5" fontWeight={800} sx={{ color: item.color }}>{item.value} <Typography component="span" variant="caption">{item.unit}</Typography></Typography>
                            <Typography variant="caption" color="text.secondary">{item.label}</Typography>
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>

              <Grid item xs={12} md={7}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>توزيع الإيرادات حسب الفرع</Typography>
                  {DEMO.branches.map((b, i) => {
                    const pct = (b.revenue / DEMO.branches.reduce((s, x) => s + x.revenue, 0)) * 100;
                    return (
                      <Box key={i} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .5 }}>
                          <Typography variant="body2" fontWeight={600}>{b.name}</Typography>
                          <Typography variant="body2" fontWeight={700} color="primary.main">{(b.revenue / 1000000).toFixed(2)}M ({pct.toFixed(1)}%)</Typography>
                        </Box>
                        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * .1, type: 'spring' }} style={{ transformOrigin: 'right' }}>
                          <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { background: `hsl(${240 - i * 40},80%,60%)` } }} />
                        </motion.div>
                      </Box>
                    );
                  })}
                </Glass>
              </Grid>

              <Grid item xs={12} md={5}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>اتجاه المرضى الشهري</Typography>
                  <Sparkline data={DEMO.patients} color="#06b6d4" height={80} />
                  <Box sx={{ mt: 2 }}>
                    {[
                      { label: 'مرضى جدد هذا الشهر', value: '+740', color: '#22c55e' },
                      { label: 'معدل الاحتفاظ', value: '91.2%', color: '#6366f1' },
                      { label: 'متوسط مدة العلاج', value: '14 يوم', color: '#f59e0b' },
                    ].map((s, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, mb: 1, background: alpha(s.color, .08), borderRadius: 2 }}>
                        <Typography variant="body2">{s.label}</Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ─── Tab 3: التنبيهات ─── */}
          {tab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <WarningAmberIcon color="warning" />
                    <Typography variant="h6" fontWeight={700}>جميع التنبيهات</Typography>
                    <Chip label={`${DEMO.alerts.length} تنبيه`} size="small" color="warning" />
                  </Box>
                  {DEMO.alerts.map((a, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .08 }}>
                      <AlertRow {...a} />
                    </motion.div>
                  ))}
                </Glass>
              </Grid>
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>ملخص التنبيهات</Typography>
                  {[
                    { label: 'حرجة', count: DEMO.alerts.filter(a => a.type === 'critical').length, color: '#ef4444' },
                    { label: 'تحذير', count: DEMO.alerts.filter(a => a.type === 'warning').length, color: '#f59e0b' },
                    { label: 'معلومة', count: DEMO.alerts.filter(a => a.type === 'info').length, color: '#6366f1' },
                  ].map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, mb: 1.5, background: alpha(s.color, .1), borderRadius: 2, border: `1px solid ${alpha(s.color, .2)}` }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                        <Typography variant="body2" fontWeight={600}>{s.label}</Typography>
                      </Box>
                      <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>{s.count}</Typography>
                    </Box>
                  ))}
                  <Box sx={{ mt: 2, p: 2, background: alpha('#22c55e', .08), borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutlineIcon color="success" fontSize="small" />
                    <Typography variant="caption" color="success.main">تم حل 8 تنبيهات هذا الأسبوع</Typography>
                  </Box>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ─── Tab 4: ذكاء اصطناعي ─── */}
          {tab === 4 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Glass sx={{ p: 3, background: isDark ? 'linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.15))' : 'linear-gradient(135deg,rgba(99,102,241,.1),rgba(139,92,246,.07))' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 2.5, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PsychologyIcon sx={{ color: '#fff' }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>توصيات الذكاء الاصطناعي</Typography>
                      <Typography variant="caption" color="text.secondary">تحليل متقدم وتوقعات استراتيجية</Typography>
                    </Box>
                    <Chip label="مدعوم بـ AI" sx={{ ml: 'auto', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', fontWeight: 700 }} />
                  </Box>
                  <Grid container spacing={2}>
                    {DEMO.aiInsights.map((ins, i) => (
                      <Grid item xs={12} md={6} key={i}>
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .1 }}>
                          <Box sx={{ p: 2.5, background: isDark ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.7)', borderRadius: 2, border: `1px solid ${alpha(theme.palette.primary.main, .15)}`, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                            <Typography fontSize={24}>{ins.icon}</Typography>
                            <Typography variant="body2" color="text.primary" lineHeight={1.7}>{ins.text}</Typography>
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>

              {/* AI Score overall */}
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>نقاط الصحة التنظيمية</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <RingGauge value={84} color="#6366f1" label="الصحة الكلية" size={100} />
                    <Box sx={{ flex: 1 }}>
                      {[
                        { label: 'الاستدامة المالية', v: 88, c: '#22c55e' },
                        { label: 'جودة الرعاية', v: 91, c: '#06b6d4' },
                        { label: 'كفاءة العمليات', v: 79, c: '#f59e0b' },
                        { label: 'رضا الموظفين', v: 73, c: '#ec4899' },
                      ].map((s, i) => (
                        <Box key={i} sx={{ mb: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .3 }}>
                            <Typography variant="caption">{s.label}</Typography>
                            <Typography variant="caption" fontWeight={700}>{s.v}%</Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={s.v} sx={{ height: 5, borderRadius: 3, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg,${s.c},${s.c}aa)` } }} />
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Glass>
              </Grid>

              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>توقعات الشهر القادم</Typography>
                  {[
                    { label: 'الإيرادات المتوقعة', value: '5.4M ر.س', trend: '+12.5%', color: '#22c55e' },
                    { label: 'المرضى المتوقعون', value: '13,500', trend: '+5.1%', color: '#06b6d4' },
                    { label: 'معدل الأداء المتوقع', value: '89%', trend: '+2.3%', color: '#6366f1' },
                    { label: 'رضا المرضى المتوقع', value: '95%', trend: '+1.1%', color: '#f59e0b' },
                  ].map((f, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .08 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, mb: 1, background: alpha(f.color, .08), borderRadius: 2 }}>
                        <Typography variant="body2" fontWeight={600}>{f.label}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: f.color }}>{f.value}</Typography>
                          <Chip size="small" label={f.trend} sx={{ background: alpha('#22c55e', .15), color: '#16a34a', fontWeight: 700, fontSize: 10 }} />
                        </Box>
                      </Box>
                    </motion.div>
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
