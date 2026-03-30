/**
 * KPIProDashboard — لوحة مؤشرات الأداء الاستراتيجية (بريميوم)
 * Glassmorphism KPI dashboard with strategic metrics
 * Gradient: #f59e0b → #ec4899 → #6366f1
 */

import {
  Box, Typography, Grid, Paper, Chip, LinearProgress,
  Table, TableHead, TableBody, TableRow, TableCell,
  useTheme,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  SpeedOutlined,
  TrendingUpOutlined,
  TrendingDownOutlined,
  RemoveOutlined,
  EmojiEventsOutlined,
  WarningAmberOutlined,
  CheckCircleOutlined,
  FlagOutlined,
  InsightsOutlined,
} from '@mui/icons-material';
import {
  ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell,
  ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from 'recharts';

const GRAD = 'linear-gradient(135deg, #f59e0b 0%, #ec4899 50%, #6366f1 100%)';
const G1 = '#f59e0b';
const G2 = '#ec4899';
const G3 = '#6366f1';

// ─── Mock Data ─────────────────────────────────────────────────────────────────
const MONTHLY_PERF = [
  { month: 'أكتوبر', target: 80, actual: 74, prev: 68 },
  { month: 'نوفمبر', target: 82, actual: 79, prev: 74 },
  { month: 'ديسمبر', target: 85, actual: 83, prev: 79 },
  { month: 'يناير', target: 85, actual: 88, prev: 83 },
  { month: 'فبراير', target: 87, actual: 85, prev: 88 },
  { month: 'مارس', target: 90, actual: 92, prev: 85 },
];

const DEPT_RADAR = [
  { dept: 'التأهيل', score: 88 },
  { dept: 'الموارد البشرية', score: 74 },
  { dept: 'المالية', score: 92 },
  { dept: 'العمليات', score: 78 },
  { dept: 'الجودة', score: 85 },
  { dept: 'التعليم', score: 71 },
];

const OBJECTIVES = [
  { id: 1, title: 'رفع نسبة تعافي المرضى إلى ٩٠٪', progress: 88, target: 90, status: 'on-track', dept: 'التأهيل', due: 'Q2 2026', owner: 'د. فاطمة' },
  { id: 2, title: 'تحقيق رضا الموظفين ٩٥٪', progress: 78, target: 95, status: 'at-risk', dept: 'الموارد البشرية', due: 'Q2 2026', owner: 'م. أحمد' },
  { id: 3, title: 'تخفيض التكاليف التشغيلية ١٥٪', progress: 62, target: 100, status: 'behind', dept: 'المالية', due: 'Q3 2026', owner: 'م. محمد' },
  { id: 4, title: 'رفع درجة الجودة إلى ٩٨٪', progress: 94, target: 98, status: 'on-track', dept: 'الجودة', due: 'Q1 2026', owner: 'م. نورة' },
  { id: 5, title: 'استقطاب ٢٠ متخصصاً جديداً', progress: 75, target: 20, status: 'on-track', dept: 'الموارد البشرية', due: 'Q2 2026', owner: 'م. خالد' },
  { id: 6, title: 'توسيع خدمات الطب عن بُعد ٥٠٪', progress: 40, target: 50, status: 'behind', dept: 'التقنية', due: 'Q3 2026', owner: 'م. سارة' },
];

const PIE_DATA = [
  { name: 'محقق', value: 38, color: '#10b981' },
  { name: 'في المسار', value: 44, color: G3 },
  { name: 'في خطر', value: 12, color: G1 },
  { name: 'متأخر', value: 6, color: '#f43f5e' },
];

const STATUS_MAP = {
  'on-track': { label: 'في المسار', color: '#10b981', bg: '#ecfdf5', icon: CheckCircleOutlined },
  'at-risk': { label: 'في خطر', color: G1, bg: '#fffbeb', icon: WarningAmberOutlined },
  'behind': { label: 'متأخر', color: '#f43f5e', bg: '#fff1f2', icon: TrendingDownOutlined },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
function KPICard({ label, value, target, change, trend, color, unit = '', index, isDark }) {
  const TrendIcon = trend === 'up' ? TrendingUpOutlined : trend === 'down' ? TrendingDownOutlined : RemoveOutlined;
  const trendColor = trend === 'up' ? '#10b981' : trend === 'down' ? '#f43f5e' : '#94A3B8';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index, duration: 0.4 }}
    >
      <Paper elevation={0} sx={{
        p: 2.5, borderRadius: '18px',
        background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : `${color}18`}`,
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : `0 4px 24px ${color}10`,
        position: 'relative', overflow: 'hidden',
        transition: 'transform 0.3s ease',
        '&:hover': { transform: 'translateY(-4px)' },
      }}>
        {/* Top bar */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: color }} />
        <Box sx={{ position: 'absolute', top: -25, right: -25, width: 80, height: 80, borderRadius: '50%',
          background: `radial-gradient(circle, ${color}20 0%, transparent 70%)` }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Box
            sx={{ width: 38, height: 38, borderRadius: '11px', background: `${color}18`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${color}28` }}
          >
            <SpeedOutlined sx={{ fontSize: 19, color }} />
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.4, px: 0.9, py: 0.3,
            borderRadius: '8px', background: `${trendColor}14`, border: `1px solid ${trendColor}28` }}>
            <TrendIcon sx={{ fontSize: 12, color: trendColor }} />
            <Typography sx={{ fontSize: '0.68rem', fontWeight: 700, color: trendColor }}>{change}</Typography>
          </Box>
        </Box>

        <Typography sx={{ fontSize: '2rem', fontWeight: 900, color: isDark ? '#F1F5F9' : '#0F172A', lineHeight: 1, mb: 0.3 }}>
          {value}<span style={{ fontSize: '1rem', fontWeight: 600, color, marginRight: 2 }}>{unit}</span>
        </Typography>
        <Typography sx={{ fontSize: '0.72rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', mb: 1.5 }}>{label}</Typography>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
          <Typography sx={{ fontSize: '0.65rem', color: isDark ? 'rgba(255,255,255,0.3)' : '#CBD5E1' }}>المستهدف: {target}{unit}</Typography>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color }}>
            {Math.round((parseFloat(value) / parseFloat(target)) * 100)}٪
          </Typography>
        </Box>
        <LinearProgress variant="determinate" value={Math.min(100, Math.round((parseFloat(value) / parseFloat(target)) * 100))}
          sx={{ height: 5, borderRadius: 3,
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
            '& .MuiLinearProgress-bar': { borderRadius: 3, background: color },
          }}
        />
      </Paper>
    </motion.div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────────
export default function KPIProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const cardBg = isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(245,158,11,0.1)';

  return (
    <Box sx={{ direction: 'rtl', minHeight: '100vh' }}>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box sx={{
          p: { xs: 3, md: 4 }, mb: 4, borderRadius: '24px', overflow: 'hidden', position: 'relative',
          background: isDark
            ? 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(236,72,153,0.15) 50%, rgba(99,102,241,0.15) 100%)'
            : 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(236,72,153,0.07) 50%, rgba(99,102,241,0.06) 100%)',
          border: `1px solid ${isDark ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.15)'}`,
          backdropFilter: 'blur(20px)',
        }}>
          {/* Animated blobs */}
          {[
            { color: 'rgba(245,158,11,0.2)', size: 220, right: '-5%', top: '-15%' },
            { color: 'rgba(236,72,153,0.15)', size: 180, left: '45%', bottom: '-20%' },
            { color: 'rgba(99,102,241,0.12)', size: 160, right: '30%', top: '10%' },
          ].map((b, i) => (
            <motion.div key={i}
              animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 6 + i * 2, repeat: Infinity }}
              style={{ position: 'absolute', right: b.right, left: b.left, top: b.top, bottom: b.bottom,
                width: b.size, height: b.size, borderRadius: '50%',
                background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)` }}
            />
          ))}

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{
                width: 72, height: 72, borderRadius: '20px', background: GRAD,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 24px rgba(245,158,11,0.4)',
              }}>
                <InsightsOutlined sx={{ fontSize: 36, color: '#fff' }} />
              </Box>
              <Box sx={{ flex: 1 }}>
                <Typography sx={{
                  fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' },
                  background: GRAD, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
                  لوحة مؤشرات الأداء الاستراتيجية
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B', mt: 0.3 }}>
                  الربع الأول ٢٠٢٦ · آخر تحديث: ٣١ مارس ٢٠٢٦
                </Typography>
              </Box>
            </Box>
            {/* Summary row */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {[
                { label: 'أهداف محققة', value: '٣٨٪', color: '#10b981' },
                { label: 'في المسار', value: '٤٤٪', color: G3 },
                { label: 'في خطر', value: '١٢٪', color: G1 },
                { label: 'متأخرة', value: '٦٪', color: '#f43f5e' },
              ].map((s) => (
                <Box key={s.label} sx={{
                  px: 1.75, py: 0.75, borderRadius: '12px',
                  background: `${s.color}14`, border: `1px solid ${s.color}28`,
                  display: 'flex', alignItems: 'center', gap: 0.75,
                }}>
                  <Typography sx={{ fontWeight: 800, fontSize: '1rem', color: s.color }}>{s.value}</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }}>{s.label}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {[
          { label: 'نسبة تعافي المرضى', value: '88', target: '90', change: '+٤٪', trend: 'up', color: '#10b981', unit: '٪' },
          { label: 'رضا الأسر', value: '92', target: '95', change: '+٢٪', trend: 'up', color: G3, unit: '٪' },
          { label: 'كفاءة الجلسات', value: '87', target: '90', change: '-١٪', trend: 'down', color: G1, unit: '٪' },
          { label: 'معدل دوران الموظفين', value: '8', target: '5', change: '+١٪', trend: 'down', color: '#f43f5e', unit: '٪' },
          { label: 'تحقيق الميزانية', value: '94', target: '100', change: '±٠', trend: 'flat', color: G2, unit: '٪' },
          { label: 'مؤشر الجودة الشاملة', value: '89', target: '95', change: '+٣٪', trend: 'up', color: '#8b5cf6', unit: '٪' },
        ].map((k, i) => (
          <Grid item xs={6} sm={4} md={2} key={i}>
            <KPICard {...k} index={i} isDark={isDark} />
          </Grid>
        ))}
      </Grid>

      {/* ── Charts ────────────────────────────────────────────────── */}
      <Grid container spacing={3} sx={{ mb: 3 }}>

        {/* Performance Trend */}
        <Grid item xs={12} md={8}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
            <Paper elevation={0} sx={{
              p: 3, borderRadius: '20px', background: cardBg, backdropFilter: 'blur(20px)',
              border: `1px solid ${border}`,
              boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(245,158,11,0.06)',
            }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
                <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                  📈 مسار الأداء مقابل الهدف (٦ أشهر)
                </Typography>
                <Chip label="H1 2026" size="small" sx={{ height: 22, fontSize: '0.7rem', background: `${G1}18`, color: G1, border: `1px solid ${G1}30` }} />
              </Box>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={MONTHLY_PERF}>
                  <defs>
                    <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={G3} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={G3} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis domain={[60, 100]} tick={{ fontSize: 11, fill: isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }} />
                  <Legend iconType="circle" iconSize={8} />
                  <Area dataKey="actual" name="الفعلي" fill="url(#gradActual)" stroke={G3} strokeWidth={2.5} dot={{ fill: G3, r: 4 }} />
                  <Line dataKey="target" name="الهدف" stroke={G1} strokeWidth={2} strokeDasharray="6 3" dot={false} />
                  <Bar dataKey="prev" name="الفترة السابقة" fill={`${G2}44`} radius={[4, 4, 0, 0]} />
                </ComposedChart>
              </ResponsiveContainer>
            </Paper>
          </motion.div>
        </Grid>

        {/* Pie + Radar */}
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
            <Paper elevation={0} sx={{
              p: 3, borderRadius: '20px', background: cardBg, backdropFilter: 'blur(20px)',
              border: `1px solid ${border}`,
              boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(245,158,11,0.06)',
              mb: 2,
            }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: isDark ? '#F1F5F9' : '#0F172A', mb: 1.5 }}>
                🎯 توزيع حالة الأهداف
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ResponsiveContainer width="55%" height={150}>
                  <PieChart>
                    <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {PIE_DATA.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v}٪`, '']} contentStyle={{ borderRadius: 10, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ flex: 1 }}>
                  {PIE_DATA.map((d) => (
                    <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.75 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <Typography sx={{ fontSize: '0.7rem', color: isDark ? 'rgba(255,255,255,0.6)' : '#64748B', flex: 1 }}>{d.name}</Typography>
                      <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: d.color }}>{d.value}٪</Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Paper>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <Paper elevation={0} sx={{
              p: 3, borderRadius: '20px', background: cardBg, backdropFilter: 'blur(20px)',
              border: `1px solid ${border}`,
              boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(245,158,11,0.06)',
            }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', color: isDark ? '#F1F5F9' : '#0F172A', mb: 1 }}>
                🕸️ أداء الأقسام
              </Typography>
              <ResponsiveContainer width="100%" height={160}>
                <RadarChart data={DEPT_RADAR}>
                  <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.07)' : '#E2E8F0'} />
                  <PolarAngleAxis dataKey="dept" tick={{ fontSize: 9, fill: isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8' }} />
                  <Radar name="الأداء" dataKey="score" stroke={G3} fill={G3} fillOpacity={0.2} strokeWidth={2} />
                  <Tooltip contentStyle={{ borderRadius: 10, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                </RadarChart>
              </ResponsiveContainer>
            </Paper>
          </motion.div>
        </Grid>
      </Grid>

      {/* ── Objectives Table ──────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Paper elevation={0} sx={{
          borderRadius: '20px', background: cardBg, backdropFilter: 'blur(20px)',
          border: `1px solid ${border}`,
          boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(245,158,11,0.06)',
          overflow: 'hidden',
        }}>
          <Box sx={{
            px: 3, py: 2.5,
            background: isDark
              ? 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(99,102,241,0.1))'
              : 'linear-gradient(135deg, rgba(245,158,11,0.06), rgba(99,102,241,0.04))',
            borderBottom: `1px solid ${border}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <FlagOutlined sx={{ color: G1, fontSize: 20 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                الأهداف الاستراتيجية
              </Typography>
            </Box>
            <Chip label={`${OBJECTIVES.length} هدف`} size="small"
              sx={{ height: 22, fontSize: '0.7rem', background: `${G1}18`, color: G1, border: `1px solid ${G1}30` }} />
          </Box>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': {
                  fontWeight: 700, fontSize: '0.75rem', py: 1.5,
                  color: isDark ? 'rgba(255,255,255,0.45)' : '#94A3B8',
                  borderBottom: `1px solid ${border}`,
                  backgroundColor: 'transparent',
                }}}>
                  <TableCell>الهدف</TableCell>
                  <TableCell>القسم</TableCell>
                  <TableCell>المسؤول</TableCell>
                  <TableCell>التقدم</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>الموعد</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {OBJECTIVES.map((obj, i) => {
                  const st = STATUS_MAP[obj.status];
                  const StatusIcon = st.icon;
                  return (
                    <motion.tr key={obj.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.55 + i * 0.07 }}
                      component="tr"
                    >
                      <TableCell sx={{
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC'}`,
                        py: 1.5,
                      }}>
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                          {obj.title}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC'}` }}>
                        <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }}>
                          {obj.dept}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC'}` }}>
                        <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }}>
                          {obj.owner}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC'}`, minWidth: 140 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <LinearProgress variant="determinate" value={obj.progress}
                              sx={{
                                height: 6, borderRadius: 3,
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                                '& .MuiLinearProgress-bar': {
                                  borderRadius: 3,
                                  background: st.color === '#10b981'
                                    ? 'linear-gradient(90deg, #10b981, #059669)'
                                    : st.color === G1
                                      ? `linear-gradient(90deg, ${G1}, #d97706)`
                                      : 'linear-gradient(90deg, #f43f5e, #e11d48)',
                                },
                              }}
                            />
                          </Box>
                          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: st.color, minWidth: 30 }}>
                            {obj.progress}٪
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC'}` }}>
                        <Chip
                          icon={<StatusIcon sx={{ fontSize: '12px !important' }} />}
                          label={st.label}
                          size="small"
                          sx={{
                            height: 22, fontSize: '0.65rem', fontWeight: 700,
                            backgroundColor: isDark ? `${st.color}18` : st.bg,
                            color: st.color,
                            border: `1px solid ${st.color}30`,
                            '& .MuiChip-label': { px: 0.8 },
                            '& .MuiChip-icon': { color: `${st.color} !important`, mr: -0.25 },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : '#F8FAFC'}` }}>
                        <Typography sx={{ fontSize: '0.72rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8' }}>
                          {obj.due}
                        </Typography>
                      </TableCell>
                    </motion.tr>
                  );
                })}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      </motion.div>
    </Box>
  );
}
