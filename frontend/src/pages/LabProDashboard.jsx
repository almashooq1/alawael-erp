/**
 * LabProDashboard — لوحة المختبرات والتحاليل البريميوم
 * تصميم Glassmorphism احترافي مع Framer Motion
 *
 * Gradient: #0ea5e9 → #6366f1 → #a855f7
 */

import { useState } from 'react';
import {
  Box, Typography, Grid, Card, useTheme, alpha,
  LinearProgress, Chip, Avatar, IconButton, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import BiotechIcon from '@mui/icons-material/Biotech';
import ScienceIcon from '@mui/icons-material/Science';
import BloodtypeIcon from '@mui/icons-material/Bloodtype';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TimerIcon from '@mui/icons-material/Timer';
import VerifiedIcon from '@mui/icons-material/Verified';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import PendingIcon from '@mui/icons-material/Pending';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PersonIcon from '@mui/icons-material/Person';

// ─── Gradient + Glass helpers ──────────────────────────────────────────────────
const GRAD = 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #a855f7 100%)';
const glass = (isDark) => ({
  background: isDark ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.75)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
  borderRadius: '20px',
});

// ─── Static Data ───────────────────────────────────────────────────────────────
const KPI_CARDS = [
  { title: 'تحليل اليوم', value: '٣٤٢', sub: 'متوسط ٢٨٠ يومياً', icon: BiotechIcon, color: '#0ea5e9', trend: '+٢٢٪' },
  { title: 'قيد الإجراء', value: '٨٧', sub: '٢٣ عاجل', icon: HourglassBottomIcon, color: '#f59e0b', trend: '+١٢٪' },
  { title: 'نتائج جاهزة', value: '٢٥٥', sub: 'بانتظار التسليم', icon: AssignmentIcon, color: '#10b981', trend: '+١٨٪' },
  { title: 'متوسط الانتظار', value: '٤٥ د', sub: 'هدف: ٦٠ دقيقة', icon: TimerIcon, color: '#6366f1', trend: '-١٥٪' },
  { title: 'دقة النتائج', value: '٩٩.٢٪', sub: 'معايير ISO 15189', icon: VerifiedIcon, color: '#a855f7', trend: '+٠.٣٪' },
  { title: 'عينات الدم', value: '١,٢٨٦', sub: 'هذا الشهر', icon: BloodtypeIcon, color: '#ef4444', trend: '+٨٪' },
];

const MONTHLY_TESTS = [
  { month: 'يناير', تحاليل: 7200, عاجلة: 1200, نتائج: 7100 },
  { month: 'فبراير', تحاليل: 7600, عاجلة: 1350, نتائج: 7480 },
  { month: 'مارس', تحاليل: 8100, عاجلة: 1500, نتائج: 7950 },
  { month: 'أبريل', تحاليل: 8500, عاجلة: 1420, نتائج: 8400 },
  { month: 'مايو', تحاليل: 9000, عاجلة: 1600, نتائج: 8850 },
  { month: 'يونيو', تحاليل: 9400, عاجلة: 1700, نتائج: 9280 },
];

const TEST_TYPES_PIE = [
  { name: 'تحاليل دم شاملة', value: 32, color: '#0ea5e9' },
  { name: 'كيمياء حيوية', value: 25, color: '#6366f1' },
  { name: 'هرمونات', value: 15, color: '#a855f7' },
  { name: 'ميكروبيولوجي', value: 12, color: '#10b981' },
  { name: 'أمراض مناعية', value: 9, color: '#f59e0b' },
  { name: 'أخرى', value: 7, color: '#64748B' },
];

const DEPARTMENT_PERFORMANCE = [
  { dept: 'أمراض الدم', completed: 1250, pending: 45, turnaround: '٣٢ د', accuracy: 99.5 },
  { dept: 'الكيمياء الحيوية', completed: 980, pending: 62, turnaround: '٤٨ د', accuracy: 99.1 },
  { dept: 'الميكروبيولوجي', completed: 540, pending: 38, turnaround: '٧٢ ساعة', accuracy: 98.8 },
  { dept: 'المناعة', completed: 420, pending: 28, turnaround: '٢٤ ساعة', accuracy: 99.3 },
  { dept: 'الهرمونات', completed: 680, pending: 35, turnaround: '٦ ساعات', accuracy: 99.0 },
];

const TURNAROUND_DATA = [
  { hour: '٨ ص', عاجل: 15, روتيني: 35, متوسط: 25 },
  { hour: '٩ ص', عاجل: 22, روتيني: 48, متوسط: 35 },
  { hour: '١٠ ص', عاجل: 30, روتيني: 55, متوسط: 42 },
  { hour: '١١ ص', عاجل: 28, روتيني: 60, متوسط: 44 },
  { hour: '١٢ م', عاجل: 18, روتيني: 42, متوسط: 30 },
  { hour: '١ م', عاجل: 25, روتيني: 50, متوسط: 37 },
  { hour: '٢ م', عاجل: 20, روتيني: 38, متوسط: 29 },
  { hour: '٣ م', عاجل: 12, روتيني: 28, متوسط: 20 },
];

const RECENT_RESULTS = [
  { id: 'LAB-78421', patient: 'أحمد محمد العتيبي', test: 'CBC شامل', status: 'جاهز', priority: 'عادي', time: '١٠:٣٢ ص' },
  { id: 'LAB-78422', patient: 'فاطمة سعد الشمري', test: 'وظائف الكبد', status: 'قيد الإجراء', priority: 'عاجل', time: '١٠:٤٥ ص' },
  { id: 'LAB-78423', patient: 'عبدالله خالد الدوسري', test: 'هرمونات الغدة', status: 'جاهز', priority: 'عادي', time: '١١:٠٠ ص' },
  { id: 'LAB-78424', patient: 'نورة إبراهيم القحطاني', test: 'زراعة بكتيرية', status: 'بانتظار العينة', priority: 'عادي', time: '١١:١٥ ص' },
  { id: 'LAB-78425', patient: 'محمد فهد السبيعي', test: 'سكر تراكمي', status: 'جاهز', priority: 'عاجل', time: '١١:٣٠ ص' },
  { id: 'LAB-78426', patient: 'سارة عمر الحربي', test: 'فيتامين D', status: 'قيد الإجراء', priority: 'عادي', time: '١١:٤٥ ص' },
];

// ─── Animation Variants ────────────────────────────────────────────────────────
const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

// ─── Sub-components ────────────────────────────────────────────────────────────
function GlassCard({ children, sx = {}, delay = 0, isDark }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card elevation={0} sx={{ ...glass(isDark), p: 2.5, ...sx }}>
        {children}
      </Card>
    </motion.div>
  );
}

function SectionHeader({ title, icon: Icon, action }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '10px',
          background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Icon sx={{ fontSize: 18, color: '#fff' }} />
        </Box>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>{title}</Typography>
      </Box>
      {action}
    </Box>
  );
}

function StatusChip({ status }) {
  const map = {
    'جاهز': { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
    'قيد الإجراء': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <HourglassBottomIcon sx={{ fontSize: 14 }} /> },
    'بانتظار العينة': { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: <PendingIcon sx={{ fontSize: 14 }} /> },
    'عاجل': { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: <ErrorOutlineIcon sx={{ fontSize: 14 }} /> },
    'عادي': { color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  };
  const s = map[status] || map['قيد الإجراء'];
  return (
    <Chip
      icon={s.icon}
      label={status}
      size="small"
      sx={{
        height: 24, fontSize: '0.7rem', fontWeight: 600,
        color: s.color, backgroundColor: s.bg,
        border: `1px solid ${s.color}33`,
        '& .MuiChip-icon': { color: s.color },
        '& .MuiChip-label': { px: 0.75 },
      }}
    />
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function LabProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ direction: 'rtl', minHeight: '100vh' }}>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Box sx={{
          position: 'relative', borderRadius: '24px', overflow: 'hidden',
          mb: 3.5, p: { xs: 2.5, md: 4 },
          background: isDark
            ? 'linear-gradient(135deg, rgba(14,165,233,0.25) 0%, rgba(99,102,241,0.2) 50%, rgba(168,85,247,0.15) 100%)'
            : 'linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(99,102,241,0.08) 50%, rgba(168,85,247,0.06) 100%)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(14,165,233,0.15)'}`,
          backdropFilter: 'blur(20px)',
        }}>
          {/* Animated blobs */}
          <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {[
              { left: '-5%', top: '-10%', size: 280, color: 'rgba(14,165,233,0.15)' },
              { right: '-3%', bottom: '-15%', size: 240, color: 'rgba(99,102,241,0.12)' },
              { left: '45%', top: '15%', size: 200, color: 'rgba(168,85,247,0.1)' },
            ].map((blob, i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 6 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', ...blob, width: blob.size, height: blob.size,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${blob.color} 0%, transparent 70%)`,
                }}
              />
            ))}
          </Box>

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box sx={{
                width: 56, height: 56, borderRadius: '18px',
                background: GRAD, display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 8px 28px rgba(14,165,233,0.35)',
              }}>
                <BiotechIcon sx={{ fontSize: 28, color: '#fff' }} />
              </Box>
              <Box>
                <Typography sx={{
                  fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' },
                  background: GRAD, WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.2,
                }}>
                  لوحة المختبرات والتحاليل
                </Typography>
                <Typography sx={{ fontSize: '0.88rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B', mt: 0.25 }}>
                  إدارة شاملة للتحاليل المخبرية والنتائج ومراقبة الجودة
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              {['التحاليل', 'العينات', 'النتائج', 'الجودة', 'ISO 15189'].map((tag) => (
                <Chip key={tag} label={tag} size="small" sx={{
                  height: 26, fontSize: '0.73rem', fontWeight: 600,
                  backgroundColor: isDark ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.08)',
                  color: '#0ea5e9', border: '1px solid rgba(14,165,233,0.25)',
                  '& .MuiChip-label': { px: 1 },
                }} />
              ))}
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3.5 }}>
        {KPI_CARDS.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Grid item xs={6} sm={4} md={2} key={kpi.title}>
              <motion.div custom={i} variants={cardVariants} initial="hidden" animate="visible">
                <Card elevation={0} sx={{
                  ...glass(isDark), p: 2, textAlign: 'center',
                  transition: 'all 0.3s ease',
                  '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 12px 32px ${kpi.color}33` },
                }}>
                  <Box sx={{
                    width: 44, height: 44, borderRadius: '14px', mx: 'auto', mb: 1.5,
                    background: `linear-gradient(135deg, ${kpi.color} 0%, ${kpi.color}BB 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 6px 16px ${kpi.color}40`,
                  }}>
                    <Icon sx={{ fontSize: 22, color: '#fff' }} />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: kpi.color, fontFamily: 'monospace' }}>
                    {kpi.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: isDark ? '#CBD5E1' : '#334155', mt: 0.25 }}>
                    {kpi.title}
                  </Typography>
                  <Typography sx={{ fontSize: '0.65rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', mt: 0.25 }}>
                    {kpi.sub}
                  </Typography>
                  <Chip label={kpi.trend} size="small" sx={{
                    mt: 1, height: 20, fontSize: '0.62rem', fontWeight: 700,
                    color: kpi.trend.startsWith('-') ? '#10b981' : kpi.trend.startsWith('+') ? '#10b981' : '#64748B',
                    backgroundColor: 'rgba(16,185,129,0.12)',
                    border: '1px solid rgba(16,185,129,0.3)',
                    '& .MuiChip-label': { px: 0.75 },
                  }} />
                </Card>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Charts Row 1 ──────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Area Chart - Monthly Tests */}
        <Grid item xs={12} md={8}>
          <GlassCard isDark={isDark} delay={0.2}>
            <SectionHeader title="حركة التحاليل الشهرية" icon={TrendingUpIcon}
              action={<Tooltip title="تحديث"><IconButton size="small"><RefreshIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>} />
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={MONTHLY_TESTS}>
                <defs>
                  <linearGradient id="labGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0ea5e9" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="labGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <RTooltip contentStyle={{
                  backgroundColor: isDark ? '#1E293B' : '#fff', border: 'none',
                  borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', fontSize: 12,
                }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="تحاليل" stroke="#0ea5e9" fill="url(#labGrad1)" strokeWidth={2.5} dot={{ r: 4, fill: '#0ea5e9' }} />
                <Area type="monotone" dataKey="نتائج" stroke="#10b981" fill="none" strokeWidth={2} dot={{ r: 3, fill: '#10b981' }} />
                <Area type="monotone" dataKey="عاجلة" stroke="#a855f7" fill="url(#labGrad2)" strokeWidth={2} dot={{ r: 3, fill: '#a855f7' }} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>

        {/* Pie Chart - Test Types */}
        <Grid item xs={12} md={4}>
          <GlassCard isDark={isDark} delay={0.3}>
            <SectionHeader title="أنواع التحاليل" icon={ScienceIcon} />
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={TEST_TYPES_PIE} cx="50%" cy="50%" innerRadius={55} outerRadius={90}
                  paddingAngle={4} dataKey="value" stroke="none">
                  {TEST_TYPES_PIE.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <RTooltip formatter={(val) => `${val}٪`} contentStyle={{
                  backgroundColor: isDark ? '#1E293B' : '#fff', border: 'none',
                  borderRadius: 12, fontSize: 12,
                }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Charts Row 2 ──────────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Composed Chart - Turnaround */}
        <Grid item xs={12} md={7}>
          <GlassCard isDark={isDark} delay={0.35}>
            <SectionHeader title="أوقات إنجاز التحاليل (دقيقة)" icon={TimerIcon} />
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={TURNAROUND_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="hour" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <RTooltip contentStyle={{
                  backgroundColor: isDark ? '#1E293B' : '#fff', border: 'none',
                  borderRadius: 12, fontSize: 12,
                }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="عاجل" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={16} opacity={0.85} />
                <Bar dataKey="روتيني" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={16} opacity={0.85} />
                <Line type="monotone" dataKey="متوسط" stroke="#a855f7" strokeWidth={2.5} dot={{ r: 4, fill: '#a855f7' }} />
              </ComposedChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>

        {/* Department Performance */}
        <Grid item xs={12} md={5}>
          <GlassCard isDark={isDark} delay={0.4}>
            <SectionHeader title="أداء أقسام المختبر" icon={VerifiedIcon} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {DEPARTMENT_PERFORMANCE.map((dept, i) => (
                <motion.div key={dept.dept}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                >
                  <Box sx={{
                    p: 1.5, borderRadius: '14px',
                    background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
                  }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: isDark ? '#E2E8F0' : '#1E293B' }}>
                        {dept.dept}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                        <Chip label={dept.turnaround} size="small" sx={{
                          height: 20, fontSize: '0.6rem', fontWeight: 600,
                          color: '#6366f1', backgroundColor: 'rgba(99,102,241,0.1)',
                          border: '1px solid rgba(99,102,241,0.2)',
                          '& .MuiChip-label': { px: 0.5 },
                        }} />
                        <Typography sx={{
                          fontSize: '0.75rem', fontWeight: 800,
                          color: dept.accuracy >= 99 ? '#10b981' : '#f59e0b',
                          fontFamily: 'monospace',
                        }}>
                          {dept.accuracy}٪
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={dept.accuracy}
                      sx={{
                        height: 5, borderRadius: 3,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          background: GRAD,
                        },
                      }}
                    />
                    <Box sx={{ display: 'flex', gap: 2, mt: 0.75 }}>
                      <Typography sx={{ fontSize: '0.65rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8' }}>
                        مكتمل: <strong style={{ color: '#10b981' }}>{dept.completed}</strong>
                      </Typography>
                      <Typography sx={{ fontSize: '0.65rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8' }}>
                        قيد الإجراء: <strong style={{ color: '#f59e0b' }}>{dept.pending}</strong>
                      </Typography>
                    </Box>
                  </Box>
                </motion.div>
              ))}
            </Box>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Recent Results Table ──────────────────────────────────────────── */}
      <GlassCard isDark={isDark} delay={0.5}>
        <SectionHeader title="أحدث نتائج التحاليل" icon={AssignmentIcon}
          action={<Tooltip title="المزيد"><IconButton size="small"><MoreVertIcon sx={{ fontSize: 18 }} /></IconButton></Tooltip>} />
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['رقم التحليل', 'المريض', 'نوع التحليل', 'الحالة', 'الأولوية', 'الوقت'].map((h) => (
                  <TableCell key={h} sx={{
                    fontWeight: 700, fontSize: '0.72rem',
                    color: isDark ? '#94A3B8' : '#64748B',
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    py: 1.25,
                  }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {RECENT_RESULTS.map((result, i) => (
                <motion.tr key={result.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + i * 0.07 }}
                  style={{ display: 'table-row' }}
                >
                  <TableCell sx={{
                    fontSize: '0.78rem', fontWeight: 700, color: '#0ea5e9', fontFamily: 'monospace',
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  }}>{result.id}</TableCell>
                  <TableCell sx={{
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{
                        width: 28, height: 28, fontSize: '0.65rem', fontWeight: 700,
                        background: GRAD,
                      }}>
                        {result.patient.charAt(0)}
                      </Avatar>
                      <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#1E293B' }}>
                        {result.patient}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{
                    fontSize: '0.78rem', color: isDark ? '#CBD5E1' : '#475569',
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  }}>{result.test}</TableCell>
                  <TableCell sx={{
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  }}>
                    <StatusChip status={result.status} />
                  </TableCell>
                  <TableCell sx={{
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  }}>
                    <StatusChip status={result.priority} />
                  </TableCell>
                  <TableCell sx={{
                    fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B', fontFamily: 'monospace',
                    borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                  }}>{result.time}</TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </GlassCard>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
        <Box sx={{
          mt: 4, p: 2, borderRadius: '14px',
          background: isDark ? 'rgba(14,165,233,0.06)' : 'rgba(14,165,233,0.03)',
          border: `1px solid ${isDark ? 'rgba(14,165,233,0.15)' : 'rgba(14,165,233,0.1)'}`,
          display: 'flex', alignItems: 'center', gap: 1.5,
        }}>
          <BiotechIcon sx={{ fontSize: 18, color: '#0ea5e9' }} />
          <Typography sx={{ fontSize: '0.78rem', color: isDark ? 'rgba(255,255,255,0.45)' : '#64748B' }}>
            نظام المختبرات — إدارة متكاملة للتحاليل والعينات والنتائج وفق معايير ISO 15189
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
}
