/**
 * NursingProDashboard — لوحة التمريض والرعاية البريميوم
 * Premium Glassmorphism Dashboard for Nursing & Patient Care
 *
 * Gradient: #ec4899 → #8b5cf6 → #06b6d4
 */

import { useState } from 'react';
import {
  Box, Typography, Grid, Card, useTheme, alpha, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, IconButton, Tooltip,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';

import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PeopleIcon from '@mui/icons-material/People';
import FavoriteIcon from '@mui/icons-material/Favorite';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';

/* ═══════════════════════════════════════════════════════════════════ */
const GRAD = ['#ec4899', '#8b5cf6', '#06b6d4'];
const gradient = `linear-gradient(135deg, ${GRAD[0]} 0%, ${GRAD[1]} 50%, ${GRAD[2]} 100%)`;

const glass = (isDark) => ({
  borderRadius: '20px',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
  background: isDark ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.8)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
});

/* ═══════════════════════════════════════════════════════════════════ */
const KPI_CARDS = [
  { label: 'الممرضون النشطون', value: '٨٦', change: '+٤', icon: PeopleIcon, color: GRAD[0] },
  { label: 'المرضى تحت الرعاية', value: '٣٤٨', change: '+١٨', icon: FavoriteIcon, color: GRAD[1] },
  { label: 'معدل رضا المرضى', value: '٩٥٪', change: '+٢٪', icon: MonitorHeartIcon, color: '#10b981' },
  { label: 'الجولات المنجزة', value: '١,٢٤٦', change: '+٨٤', icon: MedicalServicesIcon, color: GRAD[2] },
  { label: 'متوسط الاستجابة', value: '٣.٢ د', change: '-٠.٥', icon: AccessTimeIcon, color: '#f59e0b' },
  { label: 'حالات طوارئ', value: '٧', change: '-٣', icon: LocalHospitalIcon, color: '#ef4444' },
];

/* ═══════════════════════════════════════════════════════════════════ */
const MONTHLY_CARE = [
  { month: 'يناير', rounds: 980, medications: 2450, vitals: 3200 },
  { month: 'فبراير', rounds: 1020, medications: 2580, vitals: 3350 },
  { month: 'مارس', rounds: 1150, medications: 2820, vitals: 3680 },
  { month: 'أبريل', rounds: 1080, medications: 2680, vitals: 3500 },
  { month: 'مايو', rounds: 1200, medications: 2950, vitals: 3820 },
  { month: 'يونيو', rounds: 1250, medications: 3100, vitals: 3950 },
  { month: 'يوليو', rounds: 1180, medications: 2880, vitals: 3720 },
  { month: 'أغسطس', rounds: 1300, medications: 3200, vitals: 4100 },
  { month: 'سبتمبر', rounds: 1350, medications: 3350, vitals: 4280 },
  { month: 'أكتوبر', rounds: 1280, medications: 3180, vitals: 4050 },
  { month: 'نوفمبر', rounds: 1400, medications: 3480, vitals: 4420 },
  { month: 'ديسمبر', rounds: 1320, medications: 3280, vitals: 4180 },
];

const CARE_CATEGORIES = [
  { name: 'رعاية عامة', value: 35, color: GRAD[0] },
  { name: 'تأهيل', value: 25, color: GRAD[1] },
  { name: 'عناية مركزة', value: 15, color: GRAD[2] },
  { name: 'رعاية أطفال', value: 15, color: '#f59e0b' },
  { name: 'طوارئ', value: 10, color: '#ef4444' },
];

const QUALITY_METRICS = [
  { metric: 'دقة الأدوية', value: 98, fullMark: 100 },
  { metric: 'توثيق الملفات', value: 92, fullMark: 100 },
  { metric: 'مكافحة العدوى', value: 96, fullMark: 100 },
  { metric: 'سلامة المريض', value: 97, fullMark: 100 },
  { metric: 'التواصل', value: 90, fullMark: 100 },
  { metric: 'رعاية الجروح', value: 94, fullMark: 100 },
];

const SHIFT_WORKLOAD = [
  { shift: 'صباحي', nurses: 32, patients: 145, ratio: '1:4.5' },
  { shift: 'مسائي', nurses: 28, patients: 130, ratio: '1:4.6' },
  { shift: 'ليلي', nurses: 18, patients: 120, ratio: '1:6.7' },
];

const NURSE_TASKS = [
  { id: 'NRS-801', nurse: 'فاطمة الحربي', patient: 'محمد العلي', task: 'جولة علامات حيوية', ward: 'القسم أ', status: 'completed', time: '٠٨:٣٠' },
  { id: 'NRS-802', nurse: 'نورة الشهري', patient: 'أحمد القحطاني', task: 'إعطاء أدوية', ward: 'القسم ب', status: 'active', time: '٠٩:١٥' },
  { id: 'NRS-803', nurse: 'سارة الدوسري', patient: 'خالد العمري', task: 'تغيير ضمادات', ward: 'العناية المركزة', status: 'active', time: '٠٩:٤٥' },
  { id: 'NRS-804', nurse: 'منى الغامدي', patient: 'عبدالله السبيعي', task: 'تقييم ألم', ward: 'القسم أ', status: 'pending', time: '١٠:٠٠' },
  { id: 'NRS-805', nurse: 'ليلى الحسن', patient: 'فهد المحمدي', task: 'مراقبة محاليل', ward: 'القسم ج', status: 'completed', time: '٠٨:٠٠' },
  { id: 'NRS-806', nurse: 'هند العتيبي', patient: 'سعد الحربي', task: 'تثقيف صحي', ward: 'القسم ب', status: 'pending', time: '١٠:٣٠' },
  { id: 'NRS-807', nurse: 'ريم السعيد', patient: 'نورة الزهراء', task: 'جولة علامات حيوية', ward: 'الأطفال', status: 'active', time: '٠٩:٣٠' },
];

const TOP_NURSES = [
  { name: 'فاطمة الحربي', dept: 'القسم أ', tasks: 48, rating: 4.9, shifts: 22 },
  { name: 'نورة الشهري', dept: 'القسم ب', tasks: 45, rating: 4.8, shifts: 21 },
  { name: 'سارة الدوسري', dept: 'العناية المركزة', tasks: 42, rating: 4.8, shifts: 23 },
  { name: 'منى الغامدي', dept: 'القسم أ', tasks: 40, rating: 4.7, shifts: 20 },
];

/* ═══════════════════════════════════════════════════════════════════ */
const GlassCard = ({ children, isDark, sx = {} }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
    <Card elevation={0} sx={{ ...glass(isDark), p: 2.5, ...sx }}>{children}</Card>
  </motion.div>
);

const SectionHeader = ({ icon: Icon, title, isDark }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
    <Box sx={{ width: 36, height: 36, borderRadius: '12px', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${alpha(GRAD[0], 0.35)}` }}>
      <Icon sx={{ fontSize: 18, color: '#fff' }} />
    </Box>
    <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>{title}</Typography>
  </Box>
);

const StatusChip = ({ status }) => {
  const map = {
    completed: { label: 'مكتمل', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
    active: { label: 'جاري', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <PendingIcon sx={{ fontSize: 14 }} /> },
    pending: { label: 'قادم', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: <AccessTimeIcon sx={{ fontSize: 14 }} /> },
    urgent: { label: 'عاجل', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: <WarningAmberIcon sx={{ fontSize: 14 }} /> },
  };
  const s = map[status] || map.pending;
  return (
    <Chip icon={s.icon} label={s.label} size="small"
      sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600, backgroundColor: s.bg, color: s.color, border: `1px solid ${alpha(s.color, 0.25)}`, '& .MuiChip-icon': { color: s.color }, '& .MuiChip-label': { px: 0.8 } }}
    />
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
export default function NursingProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ minHeight: '100vh', direction: 'rtl' }}>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box sx={{
          position: 'relative', borderRadius: '28px', overflow: 'hidden', mb: 4, p: { xs: 3, md: 4 },
          background: isDark
            ? `linear-gradient(135deg, ${alpha(GRAD[0], 0.25)} 0%, ${alpha(GRAD[1], 0.18)} 50%, ${alpha(GRAD[2], 0.12)} 100%)`
            : `linear-gradient(135deg, ${alpha(GRAD[0], 0.12)} 0%, ${alpha(GRAD[1], 0.08)} 50%, ${alpha(GRAD[2], 0.05)} 100%)`,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : alpha(GRAD[0], 0.15)}`,
          backdropFilter: 'blur(20px)',
        }}>
          <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {[
              { left: '-5%', top: '-10%', size: 300, color: alpha(GRAD[0], 0.15) },
              { right: '-3%', bottom: '-15%', size: 250, color: alpha(GRAD[1], 0.12) },
              { left: '40%', top: '20%', size: 200, color: alpha(GRAD[2], 0.1) },
            ].map((b, i) => (
              <motion.div key={i} animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 6 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', ...b, width: b.size, height: b.size, borderRadius: '50%', background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)` }} />
            ))}
          </Box>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '18px', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${alpha(GRAD[0], 0.4)}` }}>
                <FavoriteIcon sx={{ fontSize: 28, color: '#fff' }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' }, background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.2 }}>
                  لوحة التمريض والرعاية
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B', mt: 0.25 }}>
                  متابعة فريق التمريض وجولات الرعاية وعلامات المرضى الحيوية
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {KPI_CARDS.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i, duration: 0.5 }}>
                <Card elevation={0} sx={{ ...glass(isDark), p: 2, textAlign: 'center' }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '14px', mx: 'auto', mb: 1.5, background: `linear-gradient(135deg, ${alpha(kpi.color, 0.15)}, ${alpha(kpi.color, 0.05)})`, border: `1px solid ${alpha(kpi.color, 0.2)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon sx={{ fontSize: 22, color: kpi.color }} />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: isDark ? '#F1F5F9' : '#0F172A', fontFamily: 'monospace' }}>{kpi.value}</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: isDark ? 'rgba(255,255,255,0.45)' : '#64748B', mb: 0.5 }}>{kpi.label}</Typography>
                  <Chip label={kpi.change} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, backgroundColor: kpi.change.startsWith('-') ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.12)', color: '#10b981', '& .MuiChip-label': { px: 0.6 } }} />
                </Card>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Row 1: Monthly Care + Categories ──────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={TrendingUpIcon} title="أنشطة الرعاية الشهرية" isDark={isDark} />
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={MONTHLY_CARE}>
                <defs>
                  <linearGradient id="nrsGradRounds" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GRAD[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GRAD[0]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="nrsGradMeds" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GRAD[1]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GRAD[1]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <RTooltip contentStyle={{ background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)', border: 'none', borderRadius: 12, backdropFilter: 'blur(10px)' }} />
                <Legend />
                <Area type="monotone" dataKey="vitals" name="علامات حيوية" stroke={GRAD[2]} fill="rgba(6,182,212,0.1)" strokeWidth={2} />
                <Area type="monotone" dataKey="medications" name="أدوية" stroke={GRAD[1]} fill="url(#nrsGradMeds)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="rounds" name="جولات" stroke={GRAD[0]} fill="url(#nrsGradRounds)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <GlassCard isDark={isDark} sx={{ height: '100%' }}>
            <SectionHeader icon={FavoriteIcon} title="فئات الرعاية" isDark={isDark} />
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={CARE_CATEGORIES} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                  {CARE_CATEGORIES.map((entry, i) => (<Cell key={i} fill={entry.color} stroke="none" />))}
                </Pie>
                <RTooltip contentStyle={{ background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)', border: 'none', borderRadius: 12 }} />
                <Legend formatter={(val) => <span style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B' }}>{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Row 2: Quality Radar + Shift Workload ────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={MonitorHeartIcon} title="مقاييس جودة التمريض" isDark={isDark} />
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={QUALITY_METRICS}>
                <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                <Radar name="الأداء الحالي" dataKey="value" stroke={GRAD[0]} fill={alpha(GRAD[0], 0.25)} strokeWidth={2} />
                <Legend formatter={(val) => <span style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B' }}>{val}</span>} />
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
        <Grid item xs={12} md={7}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={PeopleIcon} title="حمل العمل حسب الوردية" isDark={isDark} />
            <Box sx={{ mb: 2 }}>
              {SHIFT_WORKLOAD.map((shift, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }}>
                  <Box sx={{ p: 2, borderRadius: '14px', mb: 1.5, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}` }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip label={shift.shift} size="small" sx={{ height: 24, fontWeight: 700, fontSize: '0.72rem', background: gradient, color: '#fff' }} />
                        <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>
                          {shift.nurses} ممرض/ة — {shift.patients} مريض
                        </Typography>
                      </Box>
                      <Chip label={`نسبة ${shift.ratio}`} size="small" sx={{ height: 22, fontSize: '0.7rem', fontWeight: 600, backgroundColor: alpha(GRAD[1], 0.12), color: GRAD[1], border: `1px solid ${alpha(GRAD[1], 0.25)}` }} />
                    </Box>
                    <LinearProgress variant="determinate" value={(shift.nurses / 35) * 100}
                      sx={{ height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', '& .MuiLinearProgress-bar': { borderRadius: 3, background: gradient } }} />
                  </Box>
                </motion.div>
              ))}
            </Box>

            {/* Top Nurses */}
            <SectionHeader icon={LocalHospitalIcon} title="أفضل الممرضين/الممرضات" isDark={isDark} />
            {TOP_NURSES.map((n, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + 0.1 * i }}>
                <Box sx={{ p: 1.5, borderRadius: '12px', mb: 1, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.015)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Avatar sx={{ width: 32, height: 32, background: gradient, fontSize: '0.75rem', fontWeight: 700 }}>{i + 1}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: isDark ? '#E2E8F0' : '#1E293B' }}>{n.name}</Typography>
                      <Typography sx={{ fontSize: '0.68rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8' }}>{n.dept} — {n.shifts} وردية — {n.tasks} مهمة</Typography>
                    </Box>
                    <Chip label={`${n.rating}★`} size="small" sx={{ height: 20, fontWeight: 700, fontSize: '0.68rem', background: gradient, color: '#fff' }} />
                  </Box>
                </Box>
              </motion.div>
            ))}
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Row 3: Nurse Tasks Table ─────────────────────────── */}
      <GlassCard isDark={isDark} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <SectionHeader icon={MedicalServicesIcon} title="مهام التمريض الحالية" isDark={isDark} />
          <Tooltip title="تحديث"><IconButton size="small"><RefreshIcon sx={{ fontSize: 18, color: isDark ? '#94A3B8' : '#64748B' }} /></IconButton></Tooltip>
        </Box>
        <TableContainer sx={{ maxHeight: 380 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {['الرمز', 'الممرض/ة', 'المريض', 'المهمة', 'القسم', 'الوقت', 'الحالة'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B', backgroundColor: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(248,250,252,0.95)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {NURSE_TASKS.map((task, i) => (
                <motion.tr key={task.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} component={TableRow} style={{ display: 'table-row' }}>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: GRAD[0], fontFamily: 'monospace', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{task.id}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{task.nurse}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{task.patient}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#E2E8F0' : '#334155', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{task.task}</TableCell>
                  <TableCell sx={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{task.ward}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600, color: GRAD[1], fontFamily: 'monospace', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{task.time}</TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}><StatusChip status={task.status} /></TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </GlassCard>

      {/* ── Footer ────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        <Box sx={{ mt: 4, p: 2.5, borderRadius: '16px', background: isDark ? alpha(GRAD[0], 0.08) : alpha(GRAD[0], 0.04), border: `1px solid ${isDark ? alpha(GRAD[0], 0.2) : alpha(GRAD[0], 0.1)}`, display: 'flex', alignItems: 'center', gap: 2 }}>
          <AutoAwesomeIcon sx={{ fontSize: 20, color: GRAD[0], flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.82rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }}>
            لوحة التمريض والرعاية — متابعة فريق التمريض وجولات الرعاية وعلامات المرضى الحيوية وجودة الخدمة
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
}
