/**
 * AdminExecutiveDashboard — لوحة الإدارة التنفيذية البريميوم
 * Design: Premium Glassmorphism + Framer Motion
 * Gradient: #7c3aed → #dc2626 → #ea580c
 */

import { useState } from 'react';
import {
  Box, Typography, Grid, Card, useTheme, LinearProgress,
  Chip, Avatar, Divider, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  ComposedChart, Bar, Line, Area, AreaChart,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import BusinessIcon from '@mui/icons-material/Business';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GavelIcon from '@mui/icons-material/Gavel';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import FlagIcon from '@mui/icons-material/Flag';

// ─── Data ──────────────────────────────────────────────────────────────────────
const GRADIENT = 'linear-gradient(135deg, #7c3aed 0%, #dc2626 50%, #ea580c 100%)';
const GLOW = 'rgba(124,58,237,0.4)';

const monthlyOps = [
  { month: 'يناير', قرارات: 18, مذكرات: 32, عقود: 8, إجراءات: 45 },
  { month: 'فبراير', قرارات: 22, مذكرات: 38, عقود: 11, إجراءات: 52 },
  { month: 'مارس', قرارات: 15, مذكرات: 29, عقود: 9, إجراءات: 48 },
  { month: 'أبريل', قرارات: 27, مذكرات: 44, عقود: 14, إجراءات: 61 },
  { month: 'مايو', قرارات: 31, مذكرات: 52, عقود: 17, إجراءات: 68 },
  { month: 'يونيو', قرارات: 24, مذكرات: 41, عقود: 12, إجراءات: 55 },
];

const deptPerformance = [
  { dept: 'الإدارة', completion: 92, pending: 4, overdue: 1 },
  { dept: 'الموارد البشرية', completion: 87, pending: 8, overdue: 2 },
  { dept: 'المالية', completion: 95, pending: 3, overdue: 0 },
  { dept: 'العمليات', completion: 78, pending: 12, overdue: 3 },
  { dept: 'التأهيل', completion: 91, pending: 5, overdue: 1 },
];

const taskStatus = [
  { name: 'مكتملة', value: 68, color: '#10b981' },
  { name: 'قيد التنفيذ', value: 22, color: '#7c3aed' },
  { name: 'معلّقة', value: 7, color: '#f59e0b' },
  { name: 'متأخرة', value: 3, color: '#dc2626' },
];

const recentDecisions = [
  { id: 'Q-2024-042', title: 'اعتماد خطة التوسع الجديدة', dept: 'مجلس الإدارة', date: '٢٠٢٦/٠١/١٥', status: 'مُنفَّذ', priority: 'عالية' },
  { id: 'Q-2024-043', title: 'تعيين مدير تقنية المعلومات', dept: 'الموارد البشرية', date: '٢٠٢٦/٠١/٢٠', status: 'قيد التنفيذ', priority: 'عالية' },
  { id: 'Q-2024-044', title: 'مراجعة هيكل الرواتب', dept: 'المالية', date: '٢٠٢٦/٠٢/٠٥', status: 'قيد المراجعة', priority: 'متوسطة' },
  { id: 'Q-2024-045', title: 'إطلاق برنامج التدريب السنوي', dept: 'التدريب', date: '٢٠٢٦/٠٢/١٠', status: 'مُنفَّذ', priority: 'متوسطة' },
  { id: 'Q-2024-046', title: 'تجديد عقود الموردين الرئيسيين', dept: 'المشتريات', date: '٢٠٢٦/٠٢/١٨', status: 'معلّق', priority: 'منخفضة' },
];

const KPI_CARDS = [
  { label: 'قرار إداري صادر', value: '١٣٧', sub: 'هذا العام', icon: GavelIcon, color: '#7c3aed' },
  { label: 'إجراء مُنجز', value: '٩٤٪', sub: '+٣٪ عن الشهر الماضي', icon: CheckCircleIcon, color: '#10b981' },
  { label: 'مشروع نشط', value: '٢٤', sub: '٨ على وشك الانتهاء', icon: AccountTreeIcon, color: '#0ea5e9' },
  { label: 'عقد إداري نشط', value: '٦٢', sub: '١٢ للتجديد قريباً', icon: AssignmentIcon, color: '#f59e0b' },
  { label: 'موظف في الدوام', value: '٢٣١', sub: 'من إجمالي ٢٤٨', icon: PeopleAltIcon, color: '#ec4899' },
  { label: 'هدف استراتيجي مُحقَّق', value: '١٨/٢٤', sub: '٧٥٪ من الخطة السنوية', icon: FlagIcon, color: '#dc2626' },
];

// ─── Sub Components ────────────────────────────────────────────────────────────
function GlassCard({ children, sx = {}, hoverGlow = GLOW }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: '20px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
        background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
        transition: 'all 0.3s ease',
        '&:hover': { boxShadow: `0 12px 40px ${hoverGlow}` },
        ...sx,
      }}
    >
      {children}
    </Card>
  );
}

const CustomTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  return (
    <Box sx={{
      background: isDark ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.97)',
      border: '1px solid rgba(124,58,237,0.3)',
      borderRadius: '12px', p: 1.5, backdropFilter: 'blur(10px)',
    }}>
      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, mb: 0.5, color: isDark ? '#F1F5F9' : '#0F172A' }}>{label}</Typography>
      {payload.map((p, i) => (
        <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: p.color }} />
          <Typography sx={{ fontSize: '0.72rem', color: p.color }}>{p.name}: <strong>{p.value}</strong></Typography>
        </Box>
      ))}
    </Box>
  );
};

const statusConfig = {
  'مُنفَّذ': { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: CheckCircleIcon },
  'قيد التنفيذ': { color: '#7c3aed', bg: 'rgba(124,58,237,0.12)', icon: HourglassEmptyIcon },
  'قيد المراجعة': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: HourglassEmptyIcon },
  'معلّق': { color: '#dc2626', bg: 'rgba(220,38,38,0.12)', icon: WarningAmberIcon },
};

const priorityConfig = {
  'عالية': { color: '#dc2626', bg: 'rgba(220,38,38,0.1)' },
  'متوسطة': { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  'منخفضة': { color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminExecutiveDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [activeIdx, setActiveIdx] = useState(null);

  return (
    <Box sx={{ minHeight: '100vh', direction: 'rtl' }}>

      {/* ── Hero Header ──────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box sx={{
          position: 'relative', borderRadius: '28px', overflow: 'hidden',
          mb: 3.5, p: { xs: 2.5, md: 3.5 },
          background: isDark
            ? 'linear-gradient(135deg, rgba(124,58,237,0.22) 0%, rgba(220,38,38,0.16) 50%, rgba(234,88,12,0.12) 100%)'
            : 'linear-gradient(135deg, rgba(124,58,237,0.1) 0%, rgba(220,38,38,0.07) 50%, rgba(234,88,12,0.05) 100%)',
          border: `1px solid ${isDark ? 'rgba(124,58,237,0.25)' : 'rgba(124,58,237,0.15)'}`,
          backdropFilter: 'blur(20px)',
        }}>
          {/* Blobs */}
          {[
            { left: '-4%', top: '-20%', size: 300, color: 'rgba(124,58,237,0.15)' },
            { right: '-3%', bottom: '-15%', size: 240, color: 'rgba(220,38,38,0.12)' },
            { left: '42%', top: '5%', size: 200, color: 'rgba(234,88,12,0.1)' },
          ].map((b, i) => (
            <motion.div key={i}
              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                position: 'absolute', left: b.left, right: b.right, top: b.top, bottom: b.bottom,
                width: b.size, height: b.size, borderRadius: '50%',
                background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
            />
          ))}
          <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: '18px',
              background: GRADIENT, display: 'flex', alignItems: 'center',
              justifyContent: 'center', boxShadow: `0 8px 24px ${GLOW}`, flexShrink: 0,
            }}>
              <BusinessIcon sx={{ fontSize: 28, color: '#fff' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.7rem' },
                background: GRADIENT,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                lineHeight: 1.2,
              }}>
                لوحة الإدارة التنفيذية
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B', mt: 0.3 }}>
                متابعة القرارات والعمليات الإدارية والأهداف الاستراتيجية
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['تنفيذية', 'استراتيجي', 'Glassmorphism'].map((t, i) => (
                <Chip key={i} label={t} size="small" sx={{
                  fontSize: '0.72rem', fontWeight: 600, height: 24,
                  background: isDark ? 'rgba(124,58,237,0.15)' : 'rgba(124,58,237,0.1)',
                  color: '#7c3aed', border: '1px solid rgba(124,58,237,0.3)',
                }} />
              ))}
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── KPI Cards ────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {KPI_CARDS.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.07 * i, duration: 0.5 }}
              >
                <GlassCard hoverGlow={`${kpi.color}44`} sx={{ p: 2 }}>
                  <Box sx={{ mb: 1.5 }}>
                    <Box sx={{
                      width: 40, height: 40, borderRadius: '12px',
                      background: `${kpi.color}20`, display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      border: `1px solid ${kpi.color}33`,
                    }}>
                      <Icon sx={{ fontSize: 20, color: kpi.color }} />
                    </Box>
                  </Box>
                  <Typography sx={{ fontSize: '1.5rem', fontWeight: 800, color: kpi.color, lineHeight: 1 }}>
                    {kpi.value}
                  </Typography>
                  <Typography sx={{ fontSize: '0.72rem', fontWeight: 600, color: isDark ? '#CBD5E1' : '#374151', mt: 0.5, lineHeight: 1.3 }}>
                    {kpi.label}
                  </Typography>
                  <Typography sx={{ fontSize: '0.65rem', color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8', mt: 0.25 }}>
                    {kpi.sub}
                  </Typography>
                </GlassCard>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Row 2: Ops Chart + Task Pie ──────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        {/* Monthly Operations ComposedChart */}
        <Grid item xs={12} md={7}>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>
            <GlassCard sx={{ p: 2.5, height: '100%' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A', mb: 0.5 }}>
                📋 النشاط الإداري الشهري
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', mb: 2 }}>
                القرارات، المذكرات، العقود، والإجراءات
              </Typography>
              <ResponsiveContainer width="100%" height={230}>
                <ComposedChart data={monthlyOps}>
                  <defs>
                    <linearGradient id="gIjraat" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip isDark={isDark} />} />
                  <Legend wrapperStyle={{ fontSize: '0.72rem', paddingTop: '8px' }} />
                  <Area type="monotone" dataKey="إجراءات" stroke="#7c3aed" strokeWidth={0} fill="url(#gIjraat)" />
                  <Bar dataKey="قرارات" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="مذكرات" fill="#ea580c" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Bar dataKey="عقود" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={22} />
                  <Line type="monotone" dataKey="إجراءات" stroke="#7c3aed" strokeWidth={2.5} dot={{ fill: '#7c3aed', r: 4 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>

        {/* Task Status Pie */}
        <Grid item xs={12} md={5}>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35, duration: 0.5 }}>
            <GlassCard sx={{ p: 2.5, height: '100%' }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A', mb: 0.5 }}>
                🎯 حالة المهام والإجراءات
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', mb: 1 }}>
                توزيع حالة المهام الحالية
              </Typography>
              <ResponsiveContainer width="100%" height={195}>
                <PieChart>
                  <Pie
                    data={taskStatus}
                    cx="50%" cy="50%"
                    innerRadius={52} outerRadius={82}
                    paddingAngle={3} dataKey="value"
                    onMouseEnter={(_, idx) => setActiveIdx(idx)}
                    onMouseLeave={() => setActiveIdx(null)}
                  >
                    {taskStatus.map((entry, i) => (
                      <Cell
                        key={i} fill={entry.color}
                        opacity={activeIdx === null || activeIdx === i ? 1 : 0.45}
                        stroke={activeIdx === i ? '#fff' : 'transparent'}
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `${v}٪`} />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {taskStatus.map((s, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: s.color }} />
                    <Typography sx={{ fontSize: '0.68rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }}>
                      {s.name} ({s.value}٪)
                    </Typography>
                  </Box>
                ))}
              </Box>
            </GlassCard>
          </motion.div>
        </Grid>
      </Grid>

      {/* ── Row 3: Department Performance ──────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 2.5 }}>
        <Grid item xs={12}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
            <GlassCard sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A', mb: 0.5 }}>
                🏢 أداء الأقسام — معدل الإنجاز
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', mb: 2 }}>
                نسبة إتمام المهام لكل قسم
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {deptPerformance.map((dept, i) => (
                  <Box key={i}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{
                          width: 32, height: 32, fontSize: '0.75rem', fontWeight: 700,
                          background: `linear-gradient(135deg, #7c3aed, #dc2626)`,
                          color: '#fff',
                        }}>
                          {dept.dept.charAt(0)}
                        </Avatar>
                        <Typography sx={{ fontWeight: 600, fontSize: '0.88rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                          {dept.dept}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <HourglassEmptyIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                          <Typography sx={{ fontSize: '0.7rem', color: isDark ? 'rgba(255,255,255,0.45)' : '#64748B' }}>
                            {dept.pending} معلّق
                          </Typography>
                        </Box>
                        {dept.overdue > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <WarningAmberIcon sx={{ fontSize: 14, color: '#dc2626' }} />
                            <Typography sx={{ fontSize: '0.7rem', color: '#dc2626' }}>
                              {dept.overdue} متأخر
                            </Typography>
                          </Box>
                        )}
                        <Typography sx={{
                          fontSize: '0.85rem', fontWeight: 800,
                          color: dept.completion >= 90 ? '#10b981' : dept.completion >= 80 ? '#f59e0b' : '#dc2626',
                        }}>
                          {dept.completion}٪
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={dept.completion}
                      sx={{
                        height: 8, borderRadius: 4,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          background: dept.completion >= 90
                            ? 'linear-gradient(90deg, #10b981, #06b6d4)'
                            : dept.completion >= 80
                              ? 'linear-gradient(90deg, #f59e0b, #ea580c)'
                              : 'linear-gradient(90deg, #dc2626, #7c3aed)',
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </GlassCard>
          </motion.div>
        </Grid>
      </Grid>

      {/* ── Row 4: Recent Decisions Table ─────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
        <GlassCard sx={{ p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A', mb: 0.5 }}>
            📑 أحدث القرارات الإدارية
          </Typography>
          <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8', mb: 2 }}>
            آخر القرارات والإجراءات الصادرة
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['رقم القرار', 'الموضوع', 'الجهة', 'التاريخ', 'الأولوية', 'الحالة'].map((h) => (
                    <TableCell key={h} sx={{
                      fontWeight: 700, fontSize: '0.72rem',
                      color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B',
                      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                      py: 1.2, px: 1.5,
                    }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {recentDecisions.map((dec, i) => {
                  const s = statusConfig[dec.status] || { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)', icon: CheckCircleIcon };
                  const pr = priorityConfig[dec.priority] || { color: '#94A3B8', bg: 'rgba(148,163,184,0.1)' };
                  const SIcon = s.icon;
                  return (
                    <TableRow key={i} sx={{
                      '&:hover': { background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' },
                      transition: 'background 0.2s',
                    }}>
                      <TableCell sx={{
                        fontSize: '0.72rem', fontWeight: 700, color: '#7c3aed',
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                        py: 1.2, px: 1.5,
                      }}>
                        {dec.id}
                      </TableCell>
                      <TableCell sx={{
                        fontSize: '0.78rem', fontWeight: 600, color: isDark ? '#F1F5F9' : '#0F172A',
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                        maxWidth: 200, py: 1.2, px: 1.5,
                      }}>
                        {dec.title}
                      </TableCell>
                      <TableCell sx={{
                        fontSize: '0.72rem', color: isDark ? 'rgba(255,255,255,0.45)' : '#64748B',
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                        py: 1.2, px: 1.5,
                      }}>
                        {dec.dept}
                      </TableCell>
                      <TableCell sx={{
                        fontSize: '0.72rem', color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8',
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                        py: 1.2, px: 1.5,
                      }}>
                        {dec.date}
                      </TableCell>
                      <TableCell sx={{
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                        py: 1.2, px: 1.5,
                      }}>
                        <Chip label={dec.priority} size="small" sx={{
                          height: 18, fontSize: '0.6rem', fontWeight: 700,
                          backgroundColor: pr.bg, color: pr.color,
                          '& .MuiChip-label': { px: 0.8 },
                        }} />
                      </TableCell>
                      <TableCell sx={{
                        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                        py: 1.2, px: 1.5,
                      }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <SIcon sx={{ fontSize: 13, color: s.color }} />
                          <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: s.color }}>
                            {dec.status}
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </GlassCard>
      </motion.div>
    </Box>
  );
}
