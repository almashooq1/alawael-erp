import React, { useState, useEffect, memo } from 'react';
import {
  Box, Typography, Grid, Skeleton, Chip, Tooltip
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
const KPICard = memo(({ title, value, subtitle, icon, gradient, trend, delay = 0 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isPos = trend >= 0;
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring', stiffness: 120 }}>
      <Glass sx={{ p: 3, height: '100%', position: 'relative', overflow: 'hidden' }}>
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
const TabBtn = memo(({ label, active, onClick, icon }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={onClick}
      style={{ background: active ? 'linear-gradient(135deg,#0ea5e9,#6366f1)' : 'transparent', border: active ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 10, padding: '8px 18px', cursor: 'pointer', color: active ? '#fff' : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)', fontWeight: active ? 700 : 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      {icon && <span style={{ fontSize: 15 }}>{icon}</span>}{label}
    </motion.button>
  );
});

/* ─── SVG Multi-Line Chart ─── */
const MultiLine = memo(({ series, labels, height = 150, width = 500 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const allVals = series.flatMap(s => s.data);
  const max = Math.max(...allVals, 1);
  const min = Math.min(...allVals, 0);
  const range = max - min || 1;
  const n = labels.length;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height + 30}`} style={{ overflow: 'visible' }}>
      <defs>
        {series.map((s, si) => (
          <linearGradient key={si} id={`mlg${si}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={s.color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={s.color} stopOpacity={0} />
          </linearGradient>
        ))}
      </defs>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((f, i) => (
        <line key={i} x1={0} y1={f * height} x2={width} y2={f * height}
          stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} strokeWidth={1} />
      ))}
      {series.map((s, si) => {
        const pts = s.data.map((v, i) => {
          const x = (i / (n - 1)) * width;
          const y = height - ((v - min) / range) * height;
          return `${x},${y}`;
        }).join(' ');
        const areaPoints = `0,${height} ${pts} ${width},${height}`;
        return (
          <g key={si}>
            <polygon points={areaPoints} fill={`url(#mlg${si})`} />
            <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {s.data.map((v, i) => {
              const x = (i / (n - 1)) * width;
              const y = height - ((v - min) / range) * height;
              return <circle key={i} cx={x} cy={y} r={3.5} fill={s.color} stroke={isDark ? '#1e1e2e' : '#fff'} strokeWidth={2} />;
            })}
          </g>
        );
      })}
      {labels.map((l, i) => (
        <text key={i} x={(i / (n - 1)) * width} y={height + 20} textAnchor="middle" fontSize={9}
          fill={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}>{l}</text>
      ))}
    </svg>
  );
});

/* ─── Horizontal Bar ─── */
const HBar = memo(({ label, value, max, color, unit = '' }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const pct = Math.min((value / max) * 100, 100);
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)' }}>{label}</Typography>
        <Typography variant="caption" fontWeight={700} sx={{ color }}>{value.toLocaleString()}{unit}</Typography>
      </Box>
      <Box sx={{ height: 8, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{ height: '100%', borderRadius: 4, background: color }} />
      </Box>
    </Box>
  );
});

/* ─── Funnel Chart ─── */
const Funnel = memo(({ stages }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const max = stages[0]?.value || 1;
  return (
    <Box>
      {stages.map((s, i) => {
        const pct = (s.value / max) * 100;
        const _leftMargin = `${(100 - pct) / 2}%`;
        return (
          <motion.div key={i} initial={{ opacity: 0, scaleX: 0.5 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: i * 0.1 }}>
            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.7)' }}>{s.label}</Typography>
                <Typography variant="caption" fontWeight={700} sx={{ color: s.color }}>{s.value.toLocaleString()} ({Math.round(pct)}%)</Typography>
              </Box>
              <Box sx={{ height: 28, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ width: `${pct}%`, height: '100%', background: s.color, borderRadius: 2, opacity: 0.85 }} />
              </Box>
            </Box>
          </motion.div>
        );
      })}
    </Box>
  );
});

/* ─── Scatter Dot ─── */
const ScatterChart = memo(({ data, width = 300, height = 180 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const maxX = Math.max(...data.map(d => d.x), 1);
  const maxY = Math.max(...data.map(d => d.y), 1);
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
      {[0, 0.5, 1].map((f, i) => (
        <React.Fragment key={i}>
          <line x1={0} y1={f * height} x2={width} y2={f * height} stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
          <line x1={f * width} y1={0} x2={f * width} y2={height} stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
        </React.Fragment>
      ))}
      {data.map((d, i) => (
        <motion.circle key={i} cx={(d.x / maxX) * width} cy={height - (d.y / maxY) * height}
          r={d.size || 6} fill={d.color} opacity={0.75}
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }} />
      ))}
    </svg>
  );
});

/* ─── DEMO DATA ─── */
const DEMO = {
  kpis: [
    { title: 'إجمالي الزيارات', value: '124K', subtitle: 'هذا الشهر', icon: '👁️', gradient: 'linear-gradient(135deg,#0ea5e9,#6366f1)', trend: 18 },
    { title: 'مستخدمون نشطون', value: '8,247', subtitle: 'يومياً', icon: '👥', gradient: 'linear-gradient(135deg,#22c55e,#10b981)', trend: 12 },
    { title: 'معدل التحويل', value: '6.4%', subtitle: 'من الزوار', icon: '🎯', gradient: 'linear-gradient(135deg,#f59e0b,#f97316)', trend: 3 },
    { title: 'متوسط الجلسة', value: '8.2 دق', subtitle: 'لكل مستخدم', icon: '⏱️', gradient: 'linear-gradient(135deg,#8b5cf6,#ec4899)', trend: -2 },
    { title: 'إيرادات المنصة', value: '2.8M', subtitle: 'ريال هذا الربع', icon: '💰', gradient: 'linear-gradient(135deg,#06b6d4,#0ea5e9)', trend: 22 },
    { title: 'رضا المستخدمين', value: '4.7/5', subtitle: 'من 1,240 تقييم', icon: '⭐', gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)', trend: 5 },
  ],
  trendSeries: [
    { label: 'يناير', v1: 320, v2: 210, v3: 180 },
    { label: 'فبراير', v1: 410, v2: 280, v3: 220 },
    { label: 'مارس', v1: 380, v2: 310, v3: 245 },
    { label: 'أبريل', v1: 520, v2: 390, v3: 290 },
    { label: 'مايو', v1: 490, v2: 360, v3: 310 },
    { label: 'يونيو', v1: 610, v2: 420, v3: 350 },
    { label: 'يوليو', v1: 580, v2: 445, v3: 380 },
  ],
  topPages: [
    { label: 'لوحة CEO', value: 12450, color: '#6366f1' },
    { label: 'إدارة المرضى', value: 9870, color: '#06b6d4' },
    { label: 'الجدول الزمني', value: 8340, color: '#22c55e' },
    { label: 'التقارير', value: 7120, color: '#f59e0b' },
    { label: 'الموارد البشرية', value: 6540, color: '#ec4899' },
    { label: 'المخزون', value: 5890, color: '#8b5cf6' },
  ],
  funnel: [
    { label: 'زوار الموقع', value: 124000, color: '#0ea5e9' },
    { label: 'تسجيل الدخول', value: 48000, color: '#6366f1' },
    { label: 'استخدام الميزات', value: 28000, color: '#8b5cf6' },
    { label: 'مهام مكتملة', value: 14500, color: '#22c55e' },
    { label: 'تقارير مُصدَّرة', value: 7800, color: '#10b981' },
  ],
  deviceDist: [
    { label: 'سطح المكتب', pct: 58, color: '#6366f1' },
    { label: 'الجوال', pct: 32, color: '#22c55e' },
    { label: 'الجهاز اللوحي', pct: 10, color: '#f59e0b' },
  ],
  scatter: [
    { x: 45, y: 87, color: '#6366f1', size: 8 }, { x: 78, y: 92, color: '#22c55e', size: 10 },
    { x: 32, y: 65, color: '#f59e0b', size: 7 }, { x: 91, y: 78, color: '#ef4444', size: 9 },
    { x: 55, y: 95, color: '#06b6d4', size: 12 }, { x: 67, y: 84, color: '#8b5cf6', size: 8 },
    { x: 23, y: 72, color: '#ec4899', size: 6 }, { x: 84, y: 88, color: '#10b981', size: 11 },
    { x: 40, y: 61, color: '#f97316', size: 7 }, { x: 72, y: 79, color: '#0ea5e9', size: 9 },
  ],
  hourly: [12, 18, 25, 42, 67, 89, 134, 178, 213, 245, 267, 289, 312, 298, 276, 241, 198, 167, 134, 98, 72, 54, 38, 21],
  geographic: [
    { region: 'الرياض', users: 4250, pct: 52, color: '#6366f1' },
    { region: 'جدة', users: 2180, pct: 27, color: '#22c55e' },
    { region: 'الدمام', users: 980, pct: 12, color: '#f59e0b' },
    { region: 'مكة', users: 520, pct: 6, color: '#06b6d4' },
    { region: 'أخرى', users: 317, pct: 3, color: '#8b5cf6' },
  ],
  insights: [
    { icon: '📈', title: 'نمو قياسي', text: 'زيادة 22% في الإيرادات هذا الربع مدفوعة بارتفاع استخدام التقارير التلقائية والذكاء الاصطناعي.', color: '#22c55e' },
    { icon: '🕐', title: 'ذروة الاستخدام', text: 'أعلى نشاط بين 10:00 و14:00. يُنصح بجدولة الصيانة خارج هذه الفترة.', color: '#6366f1' },
    { icon: '📱', title: 'الجوال في تصاعد', text: 'ارتفع استخدام الجوال من 24% إلى 32% خلال 6 أشهر. يُنصح بتحسين تجربة الجوال.', color: '#f59e0b' },
    { icon: '🎯', title: 'صفحة الجدول الأعلى', text: 'صفحة الجدول الزمني تحقق أعلى معدل تفاعل (8.9 دق/جلسة) مقارنة بباقي الصفحات.', color: '#06b6d4' },
  ],
};

const TABS = [
  { label: 'نظرة عامة', icon: '📊' },
  { label: 'الاتجاهات', icon: '📈' },
  { label: 'السلوك', icon: '🎯' },
  { label: 'الجغرافيا', icon: '🗺️' },
  { label: 'مسار التحويل', icon: '🔻' },
  { label: 'رؤى ذكية', icon: '🤖' },
];

/* ═════════════════════ MAIN ════════════════════ */
export default function AnalyticsDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('هذا الشهر');
  const [refresh, setRefresh] = useState(0);

  const bg = isDark
    ? 'linear-gradient(135deg,#050a1a 0%,#0a0518 50%,#050f1a 100%)'
    : 'linear-gradient(135deg,#f0f9ff 0%,#e8f4ff 50%,#ede9fe 100%)';
  const G = 'linear-gradient(135deg,#0ea5e9,#6366f1)';

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => { setData(DEMO); setLoading(false); }, 850);
    return () => clearTimeout(t);
  }, [refresh, period]);

  useEffect(() => {
    const iv = setInterval(() => setRefresh(r => r + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  const multiSeries = [
    { data: DEMO.trendSeries.map(d => d.v1), color: '#6366f1' },
    { data: DEMO.trendSeries.map(d => d.v2), color: '#22c55e' },
    { data: DEMO.trendSeries.map(d => d.v3), color: '#f59e0b' },
  ];
  const multiLabels = DEMO.trendSeries.map(d => d.label);

  return (
    <Box sx={{ minHeight: '100vh', background: bg, p: { xs: 2, md: 3 }, direction: 'rtl' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120 }}>
        <Glass sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 3, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 8px 24px #6366f144' }}>📊</Box>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ background: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                التحليلات المتقدمة
              </Typography>
              <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                رؤى معمقة وتحليل شامل لبيانات المنصة
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
            {['هذا الأسبوع', 'هذا الشهر', 'هذا الربع', 'هذا العام'].map(p => (
              <motion.button key={p} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={() => setPeriod(p)}
                style={{ background: period === p ? G : 'transparent', border: period === p ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', color: period === p ? '#fff' : isDark ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,0.6)', fontWeight: period === p ? 700 : 500, fontSize: 12 }}>
                {p}
              </motion.button>
            ))}
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }} onClick={() => setRefresh(r => r + 1)}
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 10, padding: '8px 14px', cursor: 'pointer', color: isDark ? '#fff' : '#000', fontSize: 13 }}>
              🔄
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
        {TABS.map((t, i) => <TabBtn key={i} label={t.label} icon={t.icon} active={tab === i} onClick={() => setTab(i)} />)}
      </Glass>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>

          {/* TAB 0: Overview */}
          {tab === 0 && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📈 مقارنة المؤشرات الشهرية</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      {[['المستخدمون', '#6366f1'], ['الزيارات', '#22c55e'], ['التحويلات', '#f59e0b']].map(([l, c], i) => (
                        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
                          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)', fontSize: 10 }}>{l}</Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                  <MultiLine series={multiSeries} labels={multiLabels} height={160} width={520} />
                </Glass>
              </Grid>
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📱 الأجهزة المستخدمة</Typography>
                  {(data?.deviceDist || []).map((d, i) => (
                    <Box key={i} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)' }}>{d.label}</Typography>
                        <Typography variant="caption" fontWeight={800} sx={{ color: d.color }}>{d.pct}%</Typography>
                      </Box>
                      <Box sx={{ height: 8, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${d.pct}%` }} transition={{ delay: i * 0.15, duration: 0.8 }}
                          style={{ height: '100%', borderRadius: 4, background: d.color }} />
                      </Box>
                    </Box>
                  ))}
                  <Box sx={{ mt: 3, p: 2, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                    {[
                      { label: 'معدل الارتداد', value: '28.4%', color: '#22c55e' },
                      { label: 'صفحات/جلسة', value: '5.7', color: '#6366f1' },
                      { label: 'مدة الجلسة', value: '8m 12s', color: '#f59e0b' },
                    ].map((m, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', mb: i < 2 ? 1 : 0 }}>
                        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>{m.label}</Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ color: m.color }}>{m.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Glass>
              </Grid>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📄 أكثر الصفحات زيارةً</Typography>
                  {(data?.topPages || []).map((p, i) => (
                    <HBar key={i} label={p.label} value={p.value} max={data.topPages[0].value} color={p.color} />
                  ))}
                </Glass>
              </Grid>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🕐 نشاط الاستخدام (24 ساعة)</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 80, mt: 2 }}>
                    {(data?.hourly || []).map((v, i) => {
                      const max = Math.max(...(data?.hourly || [1]));
                      const h = Math.max((v / max) * 80, 3);
                      const isNow = i === new Date().getHours();
                      return (
                        <motion.div key={i} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.02 }}
                          style={{ flex: 1, height: h, borderRadius: 3, background: isNow ? '#6366f1' : isDark ? 'rgba(255,255,255,0.2)' : 'rgba(99,102,241,0.35)', transformOrigin: 'bottom' }} />
                      );
                    })}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    {['12ص', '6ص', '12م', '6م', '12م'].map((t, i) => (
                      <Typography key={i} variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', fontSize: 9 }}>{t}</Typography>
                    ))}
                  </Box>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* TAB 1: Trends */}
          {tab === 1 && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📈 اتجاهات النمو الشهرية</Typography>
                  <MultiLine series={multiSeries} labels={multiLabels} height={200} width={600} />
                  <Box sx={{ display: 'flex', gap: 3, mt: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {[['المستخدمون النشطون', '#6366f1', '+18%'], ['إجمالي الزيارات', '#22c55e', '+24%'], ['التحويلات', '#f59e0b', '+11%']].map(([l, c, p], i) => (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderRadius: 2, background: `${c}11`, border: `1px solid ${c}22` }}>
                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
                        <Box>
                          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)', fontSize: 10 }}>{l}</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ color: c }}>{p}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Glass>
              </Grid>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📊 مقارنة أسبوعية</Typography>
                  {[
                    { day: 'الأحد', v: 4250, prev: 3800 },
                    { day: 'الاثنين', v: 7120, prev: 6400 },
                    { day: 'الثلاثاء', v: 6890, prev: 6200 },
                    { day: 'الأربعاء', v: 8340, prev: 7500 },
                    { day: 'الخميس', v: 7680, prev: 7100 },
                    { day: 'الجمعة', v: 3240, prev: 3100 },
                    { day: 'السبت', v: 2180, prev: 2050 },
                  ].map((d, i) => {
                    const diff = ((d.v - d.prev) / d.prev * 100).toFixed(1);
                    return (
                      <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                        <Typography variant="caption" fontWeight={600} sx={{ minWidth: 58, color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)' }}>{d.day}</Typography>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ height: 7, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', overflow: 'hidden', mb: 0.3 }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(d.v / 8340) * 100}%` }} transition={{ delay: i * 0.08, duration: 0.7 }}
                              style={{ height: '100%', background: '#6366f1', borderRadius: 4 }} />
                          </Box>
                          <Box sx={{ height: 4, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(d.prev / 8340) * 100}%` }} transition={{ delay: i * 0.08 + 0.1, duration: 0.7 }}
                              style={{ height: '100%', background: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)', borderRadius: 4 }} />
                          </Box>
                        </Box>
                        <Typography variant="caption" fontWeight={700} sx={{ color: diff >= 0 ? '#22c55e' : '#ef4444', minWidth: 40, textAlign: 'right', fontSize: 11 }}>{diff >= 0 ? '+' : ''}{diff}%</Typography>
                      </Box>
                    );
                  })}
                </Glass>
              </Grid>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🔵 ارتباط المؤشرات</Typography>
                  <Typography variant="caption" mb={2} display="block" sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>محور X: الزيارات • محور Y: التحويلات • الحجم: الإيرادات</Typography>
                  <ScatterChart data={data?.scatter || []} width={300} height={180} />
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* TAB 2: Behavior */}
          {tab === 2 && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🎯 أكثر الصفحات تفاعلاً</Typography>
                  {[
                    { page: 'لوحة CEO', time: '12.4 دق', bounce: '15%', score: 9.2 },
                    { page: 'الجدول الزمني', time: '8.9 دق', bounce: '21%', score: 8.7 },
                    { page: 'إدارة المرضى', time: '7.2 دق', bounce: '28%', score: 8.1 },
                    { page: 'التقارير المتقدمة', time: '6.8 دق', bounce: '32%', score: 7.6 },
                    { page: 'إدارة المخزون', time: '5.4 دق', bounce: '38%', score: 6.9 },
                  ].map((p, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5, p: 1.5, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)' }}>
                        <Box sx={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#0ea5e9,#6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 12 }}>{i + 1}</Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="caption" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }}>{p.page}</Typography>
                          <Box sx={{ display: 'flex', gap: 1.5, mt: 0.3 }}>
                            <Typography variant="caption" sx={{ color: '#6366f1', fontSize: 10 }}>⏱ {p.time}</Typography>
                            <Typography variant="caption" sx={{ color: '#22c55e', fontSize: 10 }}>↩ {p.bounce}</Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="body2" fontWeight={800} sx={{ color: p.score >= 8.5 ? '#22c55e' : p.score >= 7 ? '#f59e0b' : '#ef4444' }}>{p.score}</Typography>
                          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', fontSize: 9 }}>تفاعل</Typography>
                        </Box>
                      </Box>
                    </motion.div>
                  ))}
                </Glass>
              </Grid>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🕐 نشاط الاستخدام اليومي</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: 100, mt: 1, mb: 1 }}>
                    {(data?.hourly || []).map((v, i) => {
                      const max = Math.max(...(data?.hourly || [1]));
                      const h = Math.max((v / max) * 100, 3);
                      const hour = i;
                      const label = hour === 0 ? '12ص' : hour < 12 ? `${hour}ص` : hour === 12 ? '12م' : `${hour - 12}م`;
                      const isHigh = v >= max * 0.7;
                      return (
                        <Tooltip key={i} title={`${label}: ${v} مستخدم`}>
                          <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: i * 0.02 }}
                            style={{ flex: 1, height: h, borderRadius: 4, background: isHigh ? '#6366f1' : isDark ? 'rgba(99,102,241,0.3)' : 'rgba(99,102,241,0.25)', transformOrigin: 'bottom', cursor: 'pointer', transition: 'opacity 0.2s' }} />
                        </Tooltip>
                      );
                    })}
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    {['12ص', '3ص', '6ص', '9ص', '12م', '3م', '6م', '9م'].map((t, i) => (
                      <Typography key={i} variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)', fontSize: 9 }}>{t}</Typography>
                    ))}
                  </Box>
                  <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {[
                      { label: 'ذروة النشاط', value: '11:00 - 14:00', color: '#6366f1' },
                      { label: 'أقل نشاط', value: '02:00 - 05:00', color: '#94a3b8' },
                    ].map((s, i) => (
                      <Box key={i} sx={{ flex: 1, p: 1.5, borderRadius: 2, background: `${s.color}11`, border: `1px solid ${s.color}22` }}>
                        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', fontSize: 10 }}>{s.label}</Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* TAB 3: Geography */}
          {tab === 3 && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🗺️ توزيع المستخدمين جغرافياً</Typography>
                  {(data?.geographic || []).map((g, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5 }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: 2, background: `${g.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: `1px solid ${g.color}33` }}>🏙️</Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)' }}>{g.region}</Typography>
                            <Typography variant="caption" fontWeight={700} sx={{ color: g.color }}>{g.users.toLocaleString()} مستخدم ({g.pct}%)</Typography>
                          </Box>
                          <Box sx={{ height: 8, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                            <motion.div initial={{ width: 0 }} animate={{ width: `${g.pct}%` }} transition={{ delay: i * 0.12, duration: 0.8 }}
                              style={{ height: '100%', borderRadius: 4, background: g.color }} />
                          </Box>
                        </Box>
                      </Box>
                    </motion.div>
                  ))}
                </Glass>
              </Grid>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📊 إحصائيات الفروع</Typography>
                  <Grid container spacing={2}>
                    {[
                      { label: 'الرياض', sessions: 18420, revenue: '1.2M', growth: '+24%', color: '#6366f1' },
                      { label: 'جدة', sessions: 9870, revenue: '680K', growth: '+18%', color: '#22c55e' },
                      { label: 'الدمام', sessions: 4320, revenue: '310K', growth: '+31%', color: '#f59e0b' },
                      { label: 'مكة', sessions: 2180, revenue: '175K', growth: '+15%', color: '#06b6d4' },
                    ].map((b, i) => (
                      <Grid item xs={6} key={i}>
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
                          <Box sx={{ p: 2, borderRadius: 2, background: `${b.color}0d`, border: `1px solid ${b.color}22` }}>
                            <Typography variant="body2" fontWeight={700} sx={{ color: b.color, mb: 1 }}>{b.label}</Typography>
                            <Typography variant="h6" fontWeight={800} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>{b.revenue}</Typography>
                            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>{b.sessions.toLocaleString()} جلسة</Typography>
                            <Chip label={b.growth} size="small" sx={{ background: '#22c55e22', color: '#22c55e', fontWeight: 700, fontSize: 10, display: 'block', mt: 0.5 }} />
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* TAB 4: Funnel */}
          {tab === 4 && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🔻 مسار تحويل المستخدمين</Typography>
                  <Funnel stages={data?.funnel || []} />
                  <Box sx={{ mt: 3, p: 2, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}>
                    <Typography variant="body2" fontWeight={700} mb={1} sx={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)' }}>📌 نقاط الانقطاع الرئيسية</Typography>
                    {[
                      { from: 'الزوار → تسجيل الدخول', loss: '61%', reason: 'صعوبة في التسجيل' },
                      { from: 'الدخول → استخدام الميزات', loss: '42%', reason: 'بحاجة لتوجيه أفضل' },
                    ].map((d, i) => (
                      <Box key={i} sx={{ display: 'flex', gap: 1, mb: i < 1 ? 1 : 0 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444', mt: 0.5, flexShrink: 0 }} />
                        <Box>
                          <Typography variant="caption" fontWeight={600} sx={{ color: '#ef4444' }}>{d.from}: {d.loss} انقطاع</Typography>
                          <Typography variant="caption" display="block" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)', fontSize: 10 }}>{d.reason}</Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Glass>
              </Grid>
              <Grid item xs={12} md={5}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🎯 مؤشرات التحويل</Typography>
                  {[
                    { label: 'معدل التحويل الكلي', value: '6.3%', color: '#22c55e', prev: '5.8%' },
                    { label: 'تحويل الزيارة → تسجيل', value: '38.7%', color: '#6366f1', prev: '34.2%' },
                    { label: 'تحويل التسجيل → استخدام', value: '58.3%', color: '#f59e0b', prev: '52.1%' },
                    { label: 'معدل الاحتفاظ (30 يوم)', value: '72.4%', color: '#06b6d4', prev: '68.9%' },
                  ].map((m, i) => (
                    <Box key={i} sx={{ mb: 2.5, p: 2, borderRadius: 2, background: `${m.color}0d`, border: `1px solid ${m.color}22` }}>
                      <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)' }}>{m.label}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.3 }}>
                        <Typography variant="h5" fontWeight={800} sx={{ color: m.color }}>{m.value}</Typography>
                        <Typography variant="caption" sx={{ color: '#22c55e', fontSize: 10 }}>↑ من {m.prev}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* TAB 5: AI Insights */}
          {tab === 5 && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: 2, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🤖</Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>رؤى التحليلات الذكية</Typography>
                      <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>تحليل عميق للبيانات بالذكاء الاصطناعي</Typography>
                    </Box>
                  </Box>
                  <Grid container spacing={2}>
                    {(data?.insights || []).map((ins, i) => (
                      <Grid item xs={12} md={6} key={i}>
                        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
                          <Box sx={{ p: 2.5, borderRadius: 2, background: `${ins.color}0d`, border: `1px solid ${ins.color}33`, height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                              <span style={{ fontSize: 22 }}>{ins.icon}</span>
                              <Typography variant="body2" fontWeight={700} sx={{ color: ins.color }}>{ins.title}</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', lineHeight: 1.7 }}>{ins.text}</Typography>
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>
              <Grid item xs={12}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🔮 التوقعات للربع القادم</Typography>
                  <Grid container spacing={2}>
                    {[
                      { label: 'الزيارات المتوقعة', value: '+28%', detail: '~159K زيارة', icon: '👁️', color: '#6366f1' },
                      { label: 'الإيرادات المتوقعة', value: '+31%', detail: '~3.7M ريال', icon: '💰', color: '#22c55e' },
                      { label: 'مستخدمون جدد', value: '+19%', detail: '~9,800 مستخدم', icon: '👥', color: '#f59e0b' },
                      { label: 'تحسن التحويل', value: '+0.8%', detail: 'يصل إلى 7.2%', icon: '🎯', color: '#06b6d4' },
                    ].map((p, i) => (
                      <Grid item xs={12} sm={6} md={3} key={i}>
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                          <Box sx={{ p: 2.5, borderRadius: 2, background: `${p.color}0d`, border: `1px solid ${p.color}33`, textAlign: 'center' }}>
                            <span style={{ fontSize: 28 }}>{p.icon}</span>
                            <Typography variant="h5" fontWeight={800} sx={{ color: p.color, mt: 1 }}>{p.value}</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)', mt: 0.5 }}>{p.label}</Typography>
                            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{p.detail}</Typography>
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>
            </Grid>
          )}

          {loading && (
            <Grid container spacing={3}>
              {Array(4).fill(null).map((_, i) => <Grid item xs={12} md={6} key={i}><Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} /></Grid>)}
            </Grid>
          )}

        </motion.div>
      </AnimatePresence>
    </Box>
  );
}
