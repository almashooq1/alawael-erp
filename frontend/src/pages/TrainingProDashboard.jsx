/**
 * TrainingProDashboard — لوحة التدريب والتطوير البريميوم
 * Premium Glassmorphism Dashboard for Training & Professional Development
 *
 * Gradient: #f59e0b → #ec4899 → #8b5cf6
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

import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import SchoolIcon from '@mui/icons-material/School';
import PeopleIcon from '@mui/icons-material/People';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TimerIcon from '@mui/icons-material/Timer';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import RefreshIcon from '@mui/icons-material/Refresh';
import StarIcon from '@mui/icons-material/Star';

/* ═══════════════════════════════════════════════════════════════════ */
const GRAD = ['#f59e0b', '#ec4899', '#8b5cf6'];
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
  { label: 'البرامج التدريبية', value: '٤٨', change: '+٦', icon: SchoolIcon, color: GRAD[0] },
  { label: 'المتدربون النشطون', value: '٣٢٤', change: '+٢٨', icon: PeopleIcon, color: GRAD[1] },
  { label: 'معدل الإنجاز', value: '٧٨٪', change: '+٥٪', icon: CheckCircleIcon, color: '#10b981' },
  { label: 'ساعات التدريب', value: '٢,٨٤٠', change: '+٣٢٠', icon: TimerIcon, color: GRAD[2] },
  { label: 'الشهادات الممنوحة', value: '١٨٦', change: '+١٢', icon: EmojiEventsIcon, color: '#06b6d4' },
  { label: 'رضا المتدربين', value: '٤.٧', change: '+٠.٢', icon: StarIcon, color: '#22c55e' },
];

/* ═══════════════════════════════════════════════════════════════════ */
const MONTHLY_TRAINING = [
  { month: 'يناير', sessions: 32, attendees: 245, hours: 180 },
  { month: 'فبراير', sessions: 28, attendees: 210, hours: 156 },
  { month: 'مارس', sessions: 45, attendees: 340, hours: 270 },
  { month: 'أبريل', sessions: 38, attendees: 295, hours: 228 },
  { month: 'مايو', sessions: 42, attendees: 310, hours: 252 },
  { month: 'يونيو', sessions: 35, attendees: 268, hours: 210 },
  { month: 'يوليو', sessions: 20, attendees: 155, hours: 120 },
  { month: 'أغسطس', sessions: 25, attendees: 192, hours: 150 },
  { month: 'سبتمبر', sessions: 50, attendees: 380, hours: 300 },
  { month: 'أكتوبر', sessions: 48, attendees: 365, hours: 288 },
  { month: 'نوفمبر', sessions: 52, attendees: 395, hours: 312 },
  { month: 'ديسمبر', sessions: 30, attendees: 228, hours: 180 },
];

const CATEGORY_DATA = [
  { name: 'تأهيل طبي', value: 30, color: GRAD[0] },
  { name: 'إداري وقيادي', value: 22, color: GRAD[1] },
  { name: 'تقني ورقمي', value: 18, color: GRAD[2] },
  { name: 'سلامة مهنية', value: 15, color: '#06b6d4' },
  { name: 'مهارات شخصية', value: 15, color: '#10b981' },
];

const SKILLS_RADAR = [
  { skill: 'القيادة', before: 55, after: 82, fullMark: 100 },
  { skill: 'التواصل', before: 60, after: 88, fullMark: 100 },
  { skill: 'التقنية', before: 45, after: 78, fullMark: 100 },
  { skill: 'حل المشكلات', before: 50, after: 85, fullMark: 100 },
  { skill: 'العمل الجماعي', before: 65, after: 90, fullMark: 100 },
  { skill: 'إدارة الوقت', before: 48, after: 75, fullMark: 100 },
];

const DEPT_TRAINING = [
  { dept: 'التأهيل', hours: 480, target: 600 },
  { dept: 'التمريض', hours: 420, target: 500 },
  { dept: 'الإدارة', hours: 350, target: 400 },
  { dept: 'المالية', hours: 280, target: 350 },
  { dept: 'تقنية المعلومات', hours: 320, target: 380 },
  { dept: 'الموارد البشرية', hours: 260, target: 300 },
];

const ACTIVE_PROGRAMS = [
  { id: 'TRN-401', name: 'برنامج القيادة التنفيذية', trainer: 'د. سعد العمري', attendees: 24, progress: 85, status: 'active', startDate: '٢٠٢٦/٠١/١٥' },
  { id: 'TRN-402', name: 'التأهيل المتقدم للمعالجين', trainer: 'د. ليلى الحسن', attendees: 18, progress: 62, status: 'active', startDate: '٢٠٢٦/٠٢/٠١' },
  { id: 'TRN-403', name: 'الأمن السيبراني الأساسي', trainer: 'م. خالد السبيعي', attendees: 45, progress: 100, status: 'completed', startDate: '٢٠٢٦/٠١/١٠' },
  { id: 'TRN-404', name: 'إدارة الجودة الشاملة', trainer: 'د. منى الشهري', attendees: 32, progress: 45, status: 'active', startDate: '٢٠٢٦/٠٣/٠١' },
  { id: 'TRN-405', name: 'الإسعافات الأولية المتقدمة', trainer: 'د. فهد القحطاني', attendees: 28, progress: 30, status: 'active', startDate: '٢٠٢٦/٠٣/١٥' },
  { id: 'TRN-406', name: 'مهارات التواصل الفعّال', trainer: 'أ. نورة العتيبي', attendees: 38, progress: 0, status: 'upcoming', startDate: '٢٠٢٦/٠٤/٠١' },
  { id: 'TRN-407', name: 'تحليل البيانات وPower BI', trainer: 'م. أحمد الغامدي', attendees: 20, progress: 72, status: 'active', startDate: '٢٠٢٦/٠٢/١٥' },
];

const TOP_PERFORMERS = [
  { name: 'أحمد المحمدي', dept: 'التأهيل', courses: 12, hours: 96, score: 98 },
  { name: 'فاطمة الزهراء', dept: 'التمريض', courses: 10, hours: 84, score: 96 },
  { name: 'محمد العلي', dept: 'تقنية المعلومات', courses: 11, hours: 88, score: 95 },
  { name: 'نورة السعيد', dept: 'الإدارة', courses: 9, hours: 72, score: 94 },
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
    active: { label: 'جاري', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <PlayCircleIcon sx={{ fontSize: 14 }} /> },
    completed: { label: 'مكتمل', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
    upcoming: { label: 'قريباً', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <PendingIcon sx={{ fontSize: 14 }} /> },
  };
  const s = map[status] || map.active;
  return (
    <Chip icon={s.icon} label={s.label} size="small"
      sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600, backgroundColor: s.bg, color: s.color, border: `1px solid ${alpha(s.color, 0.25)}`, '& .MuiChip-icon': { color: s.color }, '& .MuiChip-label': { px: 0.8 } }}
    />
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
export default function TrainingProDashboard() {
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
                <ModelTrainingIcon sx={{ fontSize: 28, color: '#fff' }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' }, background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.2 }}>
                  لوحة التدريب والتطوير
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B', mt: 0.25 }}>
                  إدارة البرامج التدريبية والتطوير المهني للموظفين
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
                  <Chip label={kpi.change} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, backgroundColor: kpi.change.startsWith('+') ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: kpi.change.startsWith('+') ? '#10b981' : '#ef4444', '& .MuiChip-label': { px: 0.6 } }} />
                </Card>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Row 1: Monthly Training + Categories ──────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={TrendingUpIcon} title="التدريب الشهري" isDark={isDark} />
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={MONTHLY_TRAINING}>
                <defs>
                  <linearGradient id="trnGradSess" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GRAD[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GRAD[0]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="trnGradAtt" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GRAD[1]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GRAD[1]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <RTooltip contentStyle={{ background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)', border: 'none', borderRadius: 12, backdropFilter: 'blur(10px)', boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }} />
                <Legend />
                <Area type="monotone" dataKey="attendees" name="المتدربون" stroke={GRAD[1]} fill="url(#trnGradAtt)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="hours" name="الساعات" stroke={GRAD[0]} fill="url(#trnGradSess)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <GlassCard isDark={isDark} sx={{ height: '100%' }}>
            <SectionHeader icon={SchoolIcon} title="فئات التدريب" isDark={isDark} />
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={CATEGORY_DATA} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                  {CATEGORY_DATA.map((entry, i) => (<Cell key={i} fill={entry.color} stroke="none" />))}
                </Pie>
                <RTooltip contentStyle={{ background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)', border: 'none', borderRadius: 12 }} />
                <Legend formatter={(val) => <span style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B' }}>{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Row 2: Skills Radar + Dept Training ──────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={EmojiEventsIcon} title="تطوّر المهارات (قبل/بعد)" isDark={isDark} />
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={SKILLS_RADAR}>
                <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                <Radar name="قبل التدريب" dataKey="before" stroke="#94A3B8" fill="rgba(148,163,184,0.2)" strokeWidth={2} />
                <Radar name="بعد التدريب" dataKey="after" stroke={GRAD[1]} fill={alpha(GRAD[1], 0.25)} strokeWidth={2} />
                <Legend formatter={(val) => <span style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B' }}>{val}</span>} />
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
        <Grid item xs={12} md={7}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={TimerIcon} title="ساعات التدريب حسب القسم" isDark={isDark} />
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={DEPT_TRAINING} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis type="number" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} width={90} />
                <RTooltip contentStyle={{ background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)', border: 'none', borderRadius: 12 }} />
                <Legend />
                <Bar dataKey="hours" name="الساعات المنجزة" radius={[0, 8, 8, 0]} barSize={18} fill={GRAD[1]} />
                <Bar dataKey="target" name="المستهدف" radius={[0, 8, 8, 0]} barSize={18} fill={isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)'} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Row 3: Top Performers + Active Programs ──────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={EmojiEventsIcon} title="أفضل المتدربين" isDark={isDark} />
            {TOP_PERFORMERS.map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }}>
                <Box sx={{ p: 2, borderRadius: '14px', mb: 1.5, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Avatar sx={{ width: 36, height: 36, background: gradient, fontSize: '0.85rem', fontWeight: 700 }}>
                      {i + 1}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#E2E8F0' : '#1E293B' }}>{p.name}</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8' }}>{p.dept}</Typography>
                    </Box>
                    <Chip label={`${p.score}%`} size="small" sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem', background: gradient, color: '#fff' }} />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Typography sx={{ fontSize: '0.7rem', color: isDark ? '#94A3B8' : '#64748B' }}>
                      <strong style={{ color: GRAD[0] }}>{p.courses}</strong> دورة
                    </Typography>
                    <Typography sx={{ fontSize: '0.7rem', color: isDark ? '#94A3B8' : '#64748B' }}>
                      <strong style={{ color: GRAD[1] }}>{p.hours}</strong> ساعة
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            ))}
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={8}>
          <GlassCard isDark={isDark}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <SectionHeader icon={SchoolIcon} title="البرامج التدريبية النشطة" isDark={isDark} />
              <Tooltip title="تحديث"><IconButton size="small"><RefreshIcon sx={{ fontSize: 18, color: isDark ? '#94A3B8' : '#64748B' }} /></IconButton></Tooltip>
            </Box>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['الرمز', 'البرنامج', 'المدرب', 'المتدربون', 'التقدم', 'الحالة'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B', backgroundColor: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(248,250,252,0.95)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ACTIVE_PROGRAMS.map((prog, i) => (
                    <motion.tr key={prog.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} component={TableRow} style={{ display: 'table-row' }}>
                      <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: GRAD[0], fontFamily: 'monospace', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{prog.id}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{prog.name}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{prog.trainer}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', fontWeight: 700, color: isDark ? '#E2E8F0' : '#334155', fontFamily: 'monospace', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{prog.attendees}</TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`, minWidth: 120 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinearProgress variant="determinate" value={prog.progress} sx={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', '& .MuiLinearProgress-bar': { borderRadius: 3, background: gradient } }} />
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B', minWidth: 30 }}>{prog.progress}%</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}><StatusChip status={prog.status} /></TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Footer ────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        <Box sx={{ mt: 4, p: 2.5, borderRadius: '16px', background: isDark ? alpha(GRAD[0], 0.08) : alpha(GRAD[0], 0.04), border: `1px solid ${isDark ? alpha(GRAD[0], 0.2) : alpha(GRAD[0], 0.1)}`, display: 'flex', alignItems: 'center', gap: 2 }}>
          <AutoAwesomeIcon sx={{ fontSize: 20, color: GRAD[0], flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.82rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }}>
            لوحة التدريب والتطوير — متابعة البرامج التدريبية وتطوير المهارات المهنية في الوقت الفعلي
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
}
