/**
 * QualityProDashboard — لوحة الجودة والامتثال البريميوم
 * Premium Glassmorphism Dashboard for Quality & Compliance Management
 *
 * Gradient: #8b5cf6 → #06b6d4 → #10b981
 */

import { useState } from 'react';
import {
  Box, Typography, Grid, Card, useTheme, alpha, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  LinearProgress, IconButton, Tooltip,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';

import VerifiedIcon from '@mui/icons-material/Verified';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import BugReportIcon from '@mui/icons-material/BugReport';
import GavelIcon from '@mui/icons-material/Gavel';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';
import CancelIcon from '@mui/icons-material/Cancel';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ShieldIcon from '@mui/icons-material/Shield';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import RefreshIcon from '@mui/icons-material/Refresh';
import StarIcon from '@mui/icons-material/Star';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/* ═══════════════════════════════════════════════════════════════════ */
/*  Constants                                                          */
/* ═══════════════════════════════════════════════════════════════════ */
const GRAD = ['#8b5cf6', '#06b6d4', '#10b981'];
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
  { label: 'نسبة الامتثال', value: '٩٤.٧٪', change: '+٢.٣٪', icon: VerifiedIcon, color: GRAD[0] },
  { label: 'عمليات التدقيق', value: '١٢٨', change: '+١٨', icon: AssignmentTurnedInIcon, color: GRAD[1] },
  { label: 'الملاحظات المفتوحة', value: '٢٣', change: '-٨', icon: BugReportIcon, color: '#f59e0b' },
  { label: 'معايير CBAHI', value: '٩٢٪', change: '+٤٪', icon: ShieldIcon, color: GRAD[2] },
  { label: 'الإجراءات التصحيحية', value: '٤٧', change: '+١٢', icon: FactCheckIcon, color: '#ec4899' },
  { label: 'حوادث الجودة', value: '٥', change: '-٣', icon: WarningAmberIcon, color: '#ef4444' },
];

/* ═══════════════════════════════════════════════════════════════════ */
/*  Chart Data                                                         */
/* ═══════════════════════════════════════════════════════════════════ */
const MONTHLY_COMPLIANCE = [
  { month: 'يناير', compliance: 88, audits: 8, issues: 12 },
  { month: 'فبراير', compliance: 89, audits: 10, issues: 10 },
  { month: 'مارس', compliance: 91, audits: 12, issues: 8 },
  { month: 'أبريل', compliance: 90, audits: 11, issues: 9 },
  { month: 'مايو', compliance: 92, audits: 14, issues: 7 },
  { month: 'يونيو', compliance: 93, audits: 12, issues: 6 },
  { month: 'يوليو', compliance: 91, audits: 10, issues: 8 },
  { month: 'أغسطس', compliance: 93, audits: 13, issues: 5 },
  { month: 'سبتمبر', compliance: 94, audits: 15, issues: 4 },
  { month: 'أكتوبر', compliance: 94, audits: 11, issues: 5 },
  { month: 'نوفمبر', compliance: 95, audits: 12, issues: 3 },
  { month: 'ديسمبر', compliance: 95, audits: 14, issues: 3 },
];

const ISSUE_CATEGORIES = [
  { name: 'سلامة المرضى', value: 28, color: '#ef4444' },
  { name: 'التوثيق', value: 22, color: GRAD[0] },
  { name: 'العمليات', value: 20, color: GRAD[1] },
  { name: 'البيئة', value: 15, color: GRAD[2] },
  { name: 'التدريب', value: 15, color: '#f59e0b' },
];

const STANDARDS_RADAR = [
  { standard: 'القيادة', score: 95, target: 100 },
  { standard: 'سلامة المرضى', score: 92, target: 100 },
  { standard: 'مكافحة العدوى', score: 97, target: 100 },
  { standard: 'التوثيق', score: 88, target: 100 },
  { standard: 'التعليم والتدريب', score: 90, target: 100 },
  { standard: 'البيئة والسلامة', score: 93, target: 100 },
  { standard: 'حقوق المرضى', score: 96, target: 100 },
  { standard: 'إدارة الأدوية', score: 91, target: 100 },
];

const DEPT_PERFORMANCE = [
  { dept: 'التأهيل', score: 97, audits: 18 },
  { dept: 'التمريض', score: 95, audits: 22 },
  { dept: 'الصيدلة', score: 94, audits: 14 },
  { dept: 'المختبر', score: 93, audits: 12 },
  { dept: 'الإدارة', score: 92, audits: 16 },
  { dept: 'المخازن', score: 90, audits: 10 },
  { dept: 'المطبخ', score: 88, audits: 8 },
  { dept: 'الصيانة', score: 86, audits: 6 },
];

const RECENT_AUDITS = [
  { id: 'AUD-0124', dept: 'التأهيل الطبيعي', type: 'داخلي', score: 97, status: 'passed', date: '٢٠٢٦/٠٣/٢٨' },
  { id: 'AUD-0123', dept: 'الصيدلية', type: 'خارجي', score: 94, status: 'passed', date: '٢٠٢٦/٠٣/٢٦' },
  { id: 'AUD-0122', dept: 'المختبرات', type: 'داخلي', score: 92, status: 'passed', date: '٢٠٢٦/٠٣/٢٤' },
  { id: 'AUD-0121', dept: 'المطبخ والتغذية', type: 'داخلي', score: 78, status: 'action', date: '٢٠٢٦/٠٣/٢٢' },
  { id: 'AUD-0120', dept: 'مكافحة العدوى', type: 'خارجي', score: 96, status: 'passed', date: '٢٠٢٦/٠٣/٢٠' },
  { id: 'AUD-0119', dept: 'الموارد البشرية', type: 'داخلي', score: 88, status: 'review', date: '٢٠٢٦/٠٣/١٨' },
  { id: 'AUD-0118', dept: 'إدارة المخاطر', type: 'داخلي', score: 91, status: 'passed', date: '٢٠٢٦/٠٣/١٥' },
];

const CORRECTIVE_ACTIONS = [
  { id: 'CA-087', title: 'تحديث بروتوكول مكافحة العدوى', priority: 'عالية', progress: 85, due: '٢٠٢٦/٠٤/٠٥' },
  { id: 'CA-086', title: 'تدريب الموظفين على سلامة المرضى', priority: 'عالية', progress: 60, due: '٢٠٢٦/٠٤/١٠' },
  { id: 'CA-085', title: 'مراجعة إجراءات التوثيق', priority: 'متوسطة', progress: 40, due: '٢٠٢٦/٠٤/١٥' },
  { id: 'CA-084', title: 'تحسين نظام صرف الأدوية', priority: 'عالية', progress: 95, due: '٢٠٢٦/٠٣/٣٠' },
  { id: 'CA-083', title: 'تحديث خطة الإخلاء', priority: 'متوسطة', progress: 30, due: '٢٠٢٦/٠٤/٢٠' },
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
    passed: { label: 'ناجح', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
    action: { label: 'إجراء تصحيحي', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: <ErrorOutlineIcon sx={{ fontSize: 14 }} /> },
    review: { label: 'قيد المراجعة', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <PendingIcon sx={{ fontSize: 14 }} /> },
  };
  const s = map[status] || map.review;
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

const PriorityChip = ({ priority }) => {
  const map = {
    'عالية': { color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    'متوسطة': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    'منخفضة': { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  };
  const s = map[priority] || map['متوسطة'];
  return (
    <Chip
      label={priority}
      size="small"
      sx={{
        height: 22, fontSize: '0.65rem', fontWeight: 700,
        backgroundColor: s.bg, color: s.color,
        border: `1px solid ${alpha(s.color, 0.25)}`,
        '& .MuiChip-label': { px: 0.6 },
      }}
    />
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
/*  Main Component                                                     */
/* ═══════════════════════════════════════════════════════════════════ */
export default function QualityProDashboard() {
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
                <VerifiedIcon sx={{ fontSize: 28, color: '#fff' }} />
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
                  لوحة الجودة والامتثال
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B', mt: 0.25 }}>
                  إدارة معايير الجودة والتدقيق والامتثال التنظيمي CBAHI
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

      {/* ── Row 1: Compliance Trend + Issue Categories ───────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={TrendingUpIcon} title="اتجاه الامتثال الشهري" isDark={isDark} />
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={MONTHLY_COMPLIANCE}>
                <defs>
                  <linearGradient id="qualGradComp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GRAD[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GRAD[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} domain={[80, 100]} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <RTooltip
                  contentStyle={{
                    background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)',
                    border: 'none', borderRadius: 12, backdropFilter: 'blur(10px)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                  }}
                />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="compliance" name="نسبة الامتثال %" stroke={GRAD[0]} fill="url(#qualGradComp)" strokeWidth={2.5} />
                <Bar yAxisId="right" dataKey="audits" name="عمليات التدقيق" fill={GRAD[1]} radius={[4, 4, 0, 0]} barSize={16} opacity={0.8} />
                <Line yAxisId="right" type="monotone" dataKey="issues" name="الملاحظات" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <GlassCard isDark={isDark} sx={{ height: '100%' }}>
            <SectionHeader icon={BugReportIcon} title="فئات الملاحظات" isDark={isDark} />
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={ISSUE_CATEGORIES}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={90}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {ISSUE_CATEGORIES.map((entry, i) => (
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

      {/* ── Row 2: CBAHI Radar + Department Performance ──────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={ShieldIcon} title="معايير CBAHI" isDark={isDark} />
            <ResponsiveContainer width="100%" height={320}>
              <RadarChart data={STANDARDS_RADAR}>
                <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} />
                <PolarAngleAxis
                  dataKey="standard"
                  tick={{ fontSize: 9, fill: isDark ? '#94A3B8' : '#64748B' }}
                />
                <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                <Radar name="النتيجة" dataKey="score" stroke={GRAD[0]} fill={alpha(GRAD[0], 0.25)} strokeWidth={2} />
                <Radar name="المستهدف" dataKey="target" stroke={GRAD[2]} fill="none" strokeWidth={1.5} strokeDasharray="5 5" />
                <Legend
                  formatter={(val) => <span style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B' }}>{val}</span>}
                />
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={7}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={FactCheckIcon} title="أداء الأقسام" isDark={isDark} />
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={DEPT_PERFORMANCE} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} width={65} />
                <RTooltip
                  contentStyle={{
                    background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)',
                    border: 'none', borderRadius: 12,
                  }}
                />
                <Bar dataKey="score" name="نتيجة الجودة" radius={[0, 8, 8, 0]} barSize={18}>
                  {DEPT_PERFORMANCE.map((entry, i) => (
                    <Cell key={i} fill={entry.score >= 95 ? GRAD[2] : entry.score >= 90 ? GRAD[1] : GRAD[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Row 3: Corrective Actions + Recent Audits ────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={GavelIcon} title="الإجراءات التصحيحية" isDark={isDark} />
            {CORRECTIVE_ACTIONS.map((action, i) => (
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
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: GRAD[0], fontFamily: 'monospace' }}>
                          {action.id}
                        </Typography>
                        <PriorityChip priority={action.priority} />
                      </Box>
                      <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>
                        {action.title}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: '0.68rem', color: isDark ? '#94A3B8' : '#94A3B8', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {action.due}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={action.progress}
                      sx={{
                        flex: 1, height: 6, borderRadius: 3,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          background: action.progress >= 80 ? `linear-gradient(90deg, ${GRAD[2]}, ${GRAD[1]})` : gradient,
                        },
                      }}
                    />
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B', minWidth: 35 }}>
                      {action.progress}٪
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            ))}
          </GlassCard>
        </Grid>

        {/* ── Recent Audits Table ─────────────────────────────────────── */}
        <Grid item xs={12} md={7}>
          <GlassCard isDark={isDark}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <SectionHeader icon={AssignmentTurnedInIcon} title="أحدث عمليات التدقيق" isDark={isDark} />
              <Tooltip title="تحديث">
                <IconButton size="small">
                  <RefreshIcon sx={{ fontSize: 18, color: isDark ? '#94A3B8' : '#64748B' }} />
                </IconButton>
              </Tooltip>
            </Box>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['رقم التدقيق', 'القسم', 'النوع', 'النتيجة', 'الحالة', 'التاريخ'].map((h) => (
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
                  {RECENT_AUDITS.map((audit, i) => (
                    <motion.tr
                      key={audit.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 * i }}
                      component={TableRow}
                      style={{ display: 'table-row' }}
                    >
                      <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: GRAD[0], fontFamily: 'monospace', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                        {audit.id}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', color: isDark ? '#E2E8F0' : '#334155', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                        {audit.dept}
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                        <Chip
                          label={audit.type}
                          size="small"
                          sx={{
                            height: 22, fontSize: '0.65rem', fontWeight: 600,
                            backgroundColor: audit.type === 'خارجي' ? alpha(GRAD[2], 0.12) : alpha(GRAD[1], 0.12),
                            color: audit.type === 'خارجي' ? GRAD[2] : GRAD[1],
                            '& .MuiChip-label': { px: 0.6 },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography sx={{ fontSize: '0.82rem', fontWeight: 700, color: audit.score >= 90 ? '#10b981' : audit.score >= 80 ? '#f59e0b' : '#ef4444', fontFamily: 'monospace' }}>
                            {audit.score}٪
                          </Typography>
                          {audit.score >= 95 && <StarIcon sx={{ fontSize: 14, color: '#f59e0b' }} />}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                        <StatusChip status={audit.status} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#94A3B8', fontFamily: 'monospace', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>
                        {audit.date}
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
            لوحة الجودة والامتثال — مراقبة معايير CBAHI وعمليات التدقيق والإجراءات التصحيحية في الوقت الفعلي
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
}
