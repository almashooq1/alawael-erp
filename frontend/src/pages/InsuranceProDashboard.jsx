/**
 * InsuranceProDashboard — لوحة التأمين الصحي البريميوم
 * Premium Glassmorphism Dashboard for Health Insurance Management
 *
 * Gradient: #0ea5e9 → #22c55e → #f59e0b
 */

import { useState } from 'react';
import {
  Box, Typography, Grid, Card, useTheme, alpha, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, IconButton, Tooltip,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';

import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import PeopleIcon from '@mui/icons-material/People';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Constants                                                          */
/* ═══════════════════════════════════════════════════════════════════ */
const GRAD = ['#0ea5e9', '#22c55e', '#f59e0b'];
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
/*  KPI Data                                                           */
/* ═══════════════════════════════════════════════════════════════════ */
const KPI_CARDS = [
  { label: 'إجمالي المؤمّنين', value: '١,٢٤٨', change: '+٤٢', icon: PeopleIcon, color: GRAD[0] },
  { label: 'المطالبات النشطة', value: '٣٨٧', change: '+١٥', icon: ReceiptLongIcon, color: GRAD[1] },
  { label: 'نسبة الموافقة', value: '٨٧٪', change: '+٣٪', icon: CheckCircleIcon, color: '#10b981' },
  { label: 'المبلغ المستحق', value: '٢.٤م', change: '-٣٢٠ك', icon: TrendingUpIcon, color: GRAD[2] },
  { label: 'مقدمي الخدمة', value: '٥٦', change: '+٤', icon: LocalHospitalIcon, color: '#8b5cf6' },
  { label: 'مطالبات مرفوضة', value: '٤٨', change: '-٧', icon: WarningAmberIcon, color: '#ef4444' },
];

/* ═══════════════════════════════════════════════════════════════════ */
/*  Chart Data                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
const MONTHLY_CLAIMS = [
  { month: 'يناير', submitted: 120, approved: 105, rejected: 15 },
  { month: 'فبراير', submitted: 145, approved: 128, rejected: 17 },
  { month: 'مارس', submitted: 158, approved: 142, rejected: 16 },
  { month: 'أبريل', submitted: 132, approved: 118, rejected: 14 },
  { month: 'مايو', submitted: 175, approved: 158, rejected: 17 },
  { month: 'يونيو', submitted: 190, approved: 170, rejected: 20 },
  { month: 'يوليو', submitted: 168, approved: 152, rejected: 16 },
  { month: 'أغسطس', submitted: 205, approved: 185, rejected: 20 },
  { month: 'سبتمبر', submitted: 198, approved: 178, rejected: 20 },
  { month: 'أكتوبر', submitted: 215, approved: 192, rejected: 23 },
  { month: 'نوفمبر', submitted: 230, approved: 205, rejected: 25 },
  { month: 'ديسمبر', submitted: 245, approved: 220, rejected: 25 },
];

const CLAIM_TYPES = [
  { name: 'علاج طبيعي', value: 35, color: GRAD[0] },
  { name: 'أدوية', value: 25, color: GRAD[1] },
  { name: 'فحوصات', value: 20, color: GRAD[2] },
  { name: 'إقامة', value: 12, color: '#8b5cf6' },
  { name: 'أخرى', value: 8, color: '#ef4444' },
];

const PROVIDER_PERFORMANCE = [
  { provider: 'وقت المعالجة', A: 92, B: 85, fullMark: 100 },
  { provider: 'دقة المطالبات', A: 88, B: 78, fullMark: 100 },
  { provider: 'رضا المرضى', A: 95, B: 82, fullMark: 100 },
  { provider: 'سرعة الرد', A: 78, B: 90, fullMark: 100 },
  { provider: 'جودة الخدمة', A: 90, B: 87, fullMark: 100 },
  { provider: 'التزام العقد', A: 85, B: 92, fullMark: 100 },
];

const COVERAGE_DATA = [
  { category: 'طب عام', covered: 95, limit: 100 },
  { category: 'أسنان', covered: 70, limit: 100 },
  { category: 'نظر', covered: 60, limit: 100 },
  { category: 'نفسي', covered: 80, limit: 100 },
  { category: 'تأهيل', covered: 90, limit: 100 },
  { category: 'طوارئ', covered: 98, limit: 100 },
];

const RECENT_CLAIMS = [
  { id: 'CLM-2847', patient: 'أحمد المحمدي', type: 'علاج طبيعي', amount: '٣,٢٥٠', status: 'approved', date: '٢٠٢٦/٠٣/٢٨' },
  { id: 'CLM-2846', patient: 'فاطمة الزهراء', type: 'فحوصات مخبرية', amount: '١,٨٧٠', status: 'pending', date: '٢٠٢٦/٠٣/٢٨' },
  { id: 'CLM-2845', patient: 'محمد العلي', type: 'أدوية', amount: '٩٤٥', status: 'approved', date: '٢٠٢٦/٠٣/٢٧' },
  { id: 'CLM-2844', patient: 'نورة السعيد', type: 'إقامة مستشفى', amount: '١٢,٥٠٠', status: 'review', date: '٢٠٢٦/٠٣/٢٧' },
  { id: 'CLM-2843', patient: 'عبدالله القحطاني', type: 'طوارئ', amount: '٥,٣٢٠', status: 'approved', date: '٢٠٢٦/٠٣/٢٦' },
  { id: 'CLM-2842', patient: 'سارة الحربي', type: 'أسنان', amount: '٢,١٠٠', status: 'rejected', date: '٢٠٢٦/٠٣/٢٦' },
  { id: 'CLM-2841', patient: 'خالد الدوسري', type: 'علاج طبيعي', amount: '٤,٧٨٠', status: 'approved', date: '٢٠٢٦/٠٣/٢٥' },
];

const POLICY_SUMMARY = [
  { plan: 'VIP', members: 124, premium: '٢,٥٠٠', utilization: 82 },
  { plan: 'A', members: 348, premium: '١,٨٠٠', utilization: 75 },
  { plan: 'B', members: 512, premium: '١,٢٠٠', utilization: 68 },
  { plan: 'C', members: 264, premium: '٨٠٠', utilization: 55 },
];

/* ═══════════════════════════════════════════════════════════════════ */
/*  Sub-components                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
const GlassCard = ({ children, isDark, sx = {} }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
  >
    <Card elevation={0} sx={{ ...glass(isDark), p: 2.5, ...sx }}>
      {children}
    </Card>
  </motion.div>
);

const SectionHeader = ({ icon: Icon, title, isDark }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
    <Box
      sx={{
        width: 36, height: 36, borderRadius: '12px',
        background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 14px ${alpha(GRAD[0], 0.35)}`,
      }}
    >
      <Icon sx={{ fontSize: 18, color: '#fff' }} />
    </Box>
    <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
      {title}
    </Typography>
  </Box>
);

const StatusChip = ({ status }) => {
  const map = {
    approved: { label: 'موافق', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
    pending: { label: 'قيد المراجعة', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <PendingIcon sx={{ fontSize: 14 }} /> },
    rejected: { label: 'مرفوض', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: <CancelIcon sx={{ fontSize: 14 }} /> },
    review: { label: 'مراجعة طبية', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: <VisibilityIcon sx={{ fontSize: 14 }} /> },
  };
  const s = map[status] || map.pending;
  return (
    <Chip
      icon={s.icon}
      label={s.label}
      size="small"
      sx={{
        height: 24, fontSize: '0.7rem', fontWeight: 600,
        backgroundColor: s.bg, color: s.color,
        border: `1px solid ${alpha(s.color, 0.25)}`,
        '& .MuiChip-icon': { color: s.color },
        '& .MuiChip-label': { px: 0.8 },
      }}
    />
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  Main Component                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
export default function InsuranceProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ minHeight: '100vh', direction: 'rtl' }}>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box
          sx={{
            position: 'relative', borderRadius: '28px', overflow: 'hidden', mb: 4,
            p: { xs: 3, md: 4 },
            background: isDark
              ? `linear-gradient(135deg, ${alpha(GRAD[0], 0.25)} 0%, ${alpha(GRAD[1], 0.18)} 50%, ${alpha(GRAD[2], 0.12)} 100%)`
              : `linear-gradient(135deg, ${alpha(GRAD[0], 0.12)} 0%, ${alpha(GRAD[1], 0.08)} 50%, ${alpha(GRAD[2], 0.05)} 100%)`,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : alpha(GRAD[0], 0.15)}`,
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Animated blobs */}
          <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {[
              { left: '-5%', top: '-10%', size: 300, color: alpha(GRAD[0], 0.15) },
              { right: '-3%', bottom: '-15%', size: 250, color: alpha(GRAD[1], 0.12) },
              { left: '40%', top: '20%', size: 200, color: alpha(GRAD[2], 0.1) },
            ].map((b, i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 6 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', ...b,
                  width: b.size, height: b.size, borderRadius: '50%',
                  background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
                }}
              />
            ))}
          </Box>

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box
                sx={{
                  width: 56, height: 56, borderRadius: '18px',
                  background: gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: `0 8px 24px ${alpha(GRAD[0], 0.4)}`,
                }}
              >
                <HealthAndSafetyIcon sx={{ fontSize: 28, color: '#fff' }} />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' },
                    background: gradient,
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text', lineHeight: 1.2,
                  }}
                >
                  لوحة التأمين الصحي
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B', mt: 0.25 }}>
                  إدارة شاملة لبوالص التأمين والمطالبات ومقدمي الخدمة
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {KPI_CARDS.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i, duration: 0.5 }}
              >
                <Card elevation={0} sx={{ ...glass(isDark), p: 2, textAlign: 'center' }}>
                  <Box
                    sx={{
                      width: 44, height: 44, borderRadius: '14px', mx: 'auto', mb: 1.5,
                      background: `linear-gradient(135deg, ${alpha(kpi.color, 0.15)}, ${alpha(kpi.color, 0.05)})`,
                      border: `1px solid ${alpha(kpi.color, 0.2)}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <Icon sx={{ fontSize: 22, color: kpi.color }} />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: isDark ? '#F1F5F9' : '#0F172A', fontFamily: 'monospace' }}>
                    {kpi.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: isDark ? 'rgba(255,255,255,0.45)' : '#64748B', mb: 0.5 }}>
                    {kpi.label}
                  </Typography>
                  <Chip
                    label={kpi.change}
                    size="small"
                    sx={{
                      height: 20, fontSize: '0.65rem', fontWeight: 700,
                      backgroundColor: kpi.change.startsWith('+') ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                      color: kpi.change.startsWith('+') ? '#10b981' : '#ef4444',
                      '& .MuiChip-label': { px: 0.6 },
                    }}
                  />
                </Card>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Row 1: Monthly Claims + Claim Types ──────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={ReceiptLongIcon} title="المطالبات الشهرية" isDark={isDark} />
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={MONTHLY_CLAIMS}>
                <defs>
                  <linearGradient id="insGradApproved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GRAD[1]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GRAD[1]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="insGradSubmitted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GRAD[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GRAD[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <RTooltip
                  contentStyle={{
                    background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)',
                    border: 'none', borderRadius: 12, backdropFilter: 'blur(10px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  }}
                />
                <Legend />
                <Area type="monotone" dataKey="submitted" name="مقدمة" stroke={GRAD[0]} fill="url(#insGradSubmitted)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="approved" name="موافقة" stroke={GRAD[1]} fill="url(#insGradApproved)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="rejected" name="مرفوضة" stroke="#ef4444" fill="rgba(239,68,68,0.1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <GlassCard isDark={isDark} sx={{ height: '100%' }}>
            <SectionHeader icon={HealthAndSafetyIcon} title="أنواع المطالبات" isDark={isDark} />
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={CLAIM_TYPES}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {CLAIM_TYPES.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <RTooltip
                  contentStyle={{
                    background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)',
                    border: 'none', borderRadius: 12,
                  }}
                />
                <Legend
                  formatter={(val) => <span style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B' }}>{val}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Row 2: Provider Radar + Coverage Bars ────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={LocalHospitalIcon} title="أداء مقدمي الخدمة" isDark={isDark} />
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={PROVIDER_PERFORMANCE}>
                <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} />
                <PolarAngleAxis
                  dataKey="provider"
                  tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }}
                />
                <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                <Radar name="شبكة أ" dataKey="A" stroke={GRAD[0]} fill={alpha(GRAD[0], 0.25)} strokeWidth={2} />
                <Radar name="شبكة ب" dataKey="B" stroke={GRAD[2]} fill={alpha(GRAD[2], 0.2)} strokeWidth={2} />
                <Legend
                  formatter={(val) => <span style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B' }}>{val}</span>}
                />
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={7}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={TrendingUpIcon} title="نسبة التغطية حسب الفئة" isDark={isDark} />
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={COVERAGE_DATA} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} width={60} />
                <RTooltip
                  contentStyle={{
                    background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)',
                    border: 'none', borderRadius: 12,
                  }}
                />
                <Bar dataKey="covered" name="نسبة التغطية" radius={[0, 8, 8, 0]} barSize={20}>
                  {COVERAGE_DATA.map((entry, i) => (
                    <Cell key={i} fill={entry.covered >= 90 ? GRAD[1] : entry.covered >= 70 ? GRAD[0] : GRAD[2]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Row 3: Policy Summary ────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={HealthAndSafetyIcon} title="ملخص خطط التأمين" isDark={isDark} />
            {POLICY_SUMMARY.map((plan, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * i }}
              >
                <Box
                  sx={{
                    p: 2, borderRadius: '14px', mb: 1.5,
                    background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}`,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip
                        label={plan.plan}
                        size="small"
                        sx={{
                          height: 22, fontWeight: 700, fontSize: '0.7rem',
                          background: gradient, color: '#fff',
                        }}
                      />
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>
                        {plan.members} عضو
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: GRAD[0], fontFamily: 'monospace' }}>
                      {plan.premium} ر.س
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={plan.utilization}
                      sx={{
                        flex: 1, height: 6, borderRadius: 3,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          background: gradient,
                        },
                      }}
                    />
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B', minWidth: 35 }}>
                      {plan.utilization}٪
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            ))}
          </GlassCard>
        </Grid>

        {/* ── Recent Claims Table ────────────────────────────────────── */}
        <Grid item xs={12} md={7}>
          <GlassCard isDark={isDark}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <SectionHeader icon={ReceiptLongIcon} title="أحدث المطالبات" isDark={isDark} />
              <Tooltip title="تحديث">
                <IconButton size="small">
                  <RefreshIcon sx={{ fontSize: 18, color: isDark ? '#94A3B8' : '#64748B' }} />
                </IconButton>
              </Tooltip>
            </Box>
            <TableContainer sx={{ maxHeight: 380 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['رقم المطالبة', 'المريض', 'النوع', 'المبلغ', 'الحالة', 'التاريخ'].map((h) => (
                      <TableCell
                        key={h}
                        sx={{
                          fontWeight: 700, fontSize: '0.72rem',
                          color: isDark ? '#94A3B8' : '#64748B',
                          backgroundColor: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(248,250,252,0.95)',
                          borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                        }}
                      >
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {RECENT_CLAIMS.map((claim, i) => (
                    <motion.tr
                      key={claim.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      component={TableRow}
                      style={{ display: 'table-row' }}
                    >
                      <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: GRAD[0], fontFamily: 'monospace', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                        {claim.id}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', color: isDark ? '#E2E8F0' : '#334155', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                        {claim.patient}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                        {claim.type}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', fontWeight: 700, color: isDark ? '#E2E8F0' : '#334155', fontFamily: 'monospace', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                        {claim.amount} ر.س
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                        <StatusChip status={claim.status} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#94A3B8', fontFamily: 'monospace', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                        {claim.date}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        <Box
          sx={{
            mt: 4, p: 2.5, borderRadius: '16px',
            background: isDark ? alpha(GRAD[0], 0.08) : alpha(GRAD[0], 0.04),
            border: `1px solid ${isDark ? alpha(GRAD[0], 0.2) : alpha(GRAD[0], 0.1)}`,
            display: 'flex', alignItems: 'center', gap: 2,
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 20, color: GRAD[0], flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.82rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }}>
            لوحة التأمين الصحي — تتبع المطالبات وبوالص التأمين ومقدمي الخدمة في الوقت الفعلي مع تحليلات ذكية
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
}
