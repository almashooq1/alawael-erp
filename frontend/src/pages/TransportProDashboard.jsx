/**
 * TransportProDashboard — لوحة النقل والمواصلات البريميوم
 * Premium Glassmorphism Dashboard for Transport & Fleet Management
 *
 * Gradient: #f59e0b → #ef4444 → #6366f1
 */

import { useState } from 'react';
import {
  Box, Typography, Grid, Card, useTheme, alpha, LinearProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import DirectionsBusIcon from '@mui/icons-material/DirectionsBus';
import RouteIcon from '@mui/icons-material/Route';
import SpeedIcon from '@mui/icons-material/Speed';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';

// ─── Fake Data ──────────────────────────────────────────────────────────────
const KPI_DATA = [
  { title: 'مركبة نشطة', value: '٤٨', change: '+٣', icon: DirectionsBusIcon, color: '#f59e0b' },
  { title: 'رحلة اليوم', value: '١٢٤', change: '+١٨', icon: RouteIcon, color: '#ef4444' },
  { title: 'سائق متاح', value: '٣٨', change: '+٥', icon: LocalShippingIcon, color: '#6366f1' },
  { title: 'كفاءة الأسطول', value: '٩٢٪', change: '+١٪', icon: SpeedIcon, color: '#10b981' },
];

const monthlyTrips = [
  { month: 'يناير', trips: 2450, patients: 1820, staff: 630 },
  { month: 'فبراير', trips: 2680, patients: 1950, staff: 730 },
  { month: 'مارس', trips: 2890, patients: 2100, staff: 790 },
  { month: 'أبريل', trips: 2560, patients: 1870, staff: 690 },
  { month: 'مايو', trips: 3120, patients: 2340, staff: 780 },
  { month: 'يونيو', trips: 3340, patients: 2520, staff: 820 },
];

const vehicleTypes = [
  { name: 'سيارات إسعاف', value: 12, color: '#ef4444' },
  { name: 'حافلات نقل', value: 8, color: '#f59e0b' },
  { name: 'سيارات إدارية', value: 15, color: '#6366f1' },
  { name: 'شاحنات توريد', value: 6, color: '#10b981' },
  { name: 'مركبات خاصة', value: 7, color: '#ec4899' },
];

const performanceRadar = [
  { metric: 'الالتزام بالمواعيد', value: 94 },
  { metric: 'سلامة القيادة', value: 97 },
  { metric: 'كفاءة الوقود', value: 88 },
  { metric: 'رضا المستفيدين', value: 91 },
  { metric: 'صيانة المركبات', value: 93 },
  { metric: 'التوثيق', value: 89 },
];

const fuelConsumption = [
  { vehicle: 'إسعاف ١', fuel: 85, budget: 100, color: '#ef4444' },
  { vehicle: 'حافلة ١', fuel: 120, budget: 150, color: '#f59e0b' },
  { vehicle: 'إدارية ١', fuel: 45, budget: 60, color: '#6366f1' },
  { vehicle: 'شاحنة ١', fuel: 95, budget: 110, color: '#10b981' },
];

const routeStats = [
  { route: 'المستشفى-المركز', trips: 48 },
  { route: 'الأقسام الداخلية', trips: 36 },
  { route: 'العيادات الخارجية', trips: 28 },
  { route: 'المختبرات', trips: 22 },
  { route: 'الطوارئ', trips: 18 },
];

const recentTrips = [
  { id: 'TP-001', driver: 'سعد الحربي', vehicle: 'إسعاف-٣', route: 'المستشفى → المركز', status: 'مكتمل', time: '٠٨:٣٠' },
  { id: 'TP-002', driver: 'فهد العنزي', vehicle: 'حافلة-١', route: 'نقل موظفين', status: 'جاري', time: '٠٩:٠٠' },
  { id: 'TP-003', driver: 'خالد الشهري', vehicle: 'إدارية-٥', route: 'عيادات خارجية', status: 'مكتمل', time: '٠٩:٤٥' },
  { id: 'TP-004', driver: 'عبدالرحمن المالكي', vehicle: 'إسعاف-١', route: 'حالة طوارئ', status: 'عاجل', time: '١٠:١٥' },
  { id: 'TP-005', driver: 'محمد القرني', vehicle: 'شاحنة-٢', route: 'توريد أدوية', status: 'جاري', time: '١٠:٤٥' },
];

// ─── Glassmorphism Card ─────────────────────────────────────────────────────
function GlassCard({ children, sx = {}, delay = 0 }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card
        elevation={0}
        sx={{
          borderRadius: '20px',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
          background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
          p: 2.5, height: '100%', ...sx,
        }}
      >
        {children}
      </Card>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function TransportProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const GRADIENT = 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #6366f1 100%)';

  return (
    <Box sx={{ direction: 'rtl', minHeight: '100vh', p: { xs: 2, md: 3 } }}>
      {/* ── Hero Header ───────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box sx={{
          borderRadius: '24px', overflow: 'hidden', mb: 3, p: { xs: 3, md: 4 },
          background: isDark
            ? 'linear-gradient(135deg, rgba(245,158,11,0.2) 0%, rgba(239,68,68,0.15) 50%, rgba(99,102,241,0.1) 100%)'
            : 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(239,68,68,0.07) 50%, rgba(99,102,241,0.05) 100%)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(245,158,11,0.15)'}`,
          backdropFilter: 'blur(20px)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: '14px', background: GRADIENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(245,158,11,0.4)',
            }}>
              <LocalShippingIcon sx={{ fontSize: 26, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.7rem' },
                background: GRADIENT, WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                لوحة النقل والمواصلات
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }}>
                إدارة الأسطول والرحلات والسائقين واستهلاك الوقود
              </Typography>
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {KPI_DATA.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <GlassCard delay={0.1 * i}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.78rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B', mb: 0.5 }}>
                      {kpi.title}
                    </Typography>
                    <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, background: GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                      {kpi.value}
                    </Typography>
                    <Chip label={kpi.change} size="small" sx={{
                      mt: 0.5, height: 20, fontSize: '0.68rem', fontWeight: 700,
                      backgroundColor: alpha(kpi.color, 0.12), color: kpi.color,
                    }} />
                  </Box>
                  <Box sx={{
                    width: 44, height: 44, borderRadius: '12px',
                    background: `${kpi.color}18`, display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon sx={{ fontSize: 22, color: kpi.color }} />
                  </Box>
                </Box>
              </GlassCard>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Charts Row 1 ─────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <GlassCard delay={0.3}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              الرحلات الشهرية
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyTrips}>
                <defs>
                  <linearGradient id="tpTrips" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="tpPatients" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
                <Legend />
                <Area type="monotone" dataKey="patients" name="نقل مرضى" stroke="#ef4444" fill="url(#tpPatients)" strokeWidth={2} />
                <Area type="monotone" dataKey="staff" name="نقل موظفين" stroke="#f59e0b" fill="url(#tpTrips)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <GlassCard delay={0.4}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              أنواع المركبات
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={vehicleTypes} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {vehicleTypes.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Charts Row 2 ─────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <GlassCard delay={0.5}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              مؤشرات الأداء
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={performanceRadar}>
                <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} />
                <Radar name="الأداء" dataKey="value" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <GlassCard delay={0.6}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              استهلاك الوقود
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {fuelConsumption.map((f, i) => (
                <Box key={i}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>
                      {f.vehicle}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }}>
                      {f.fuel}/{f.budget} لتر
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={(f.fuel / f.budget) * 100}
                    sx={{
                      height: 8, borderRadius: 4,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      '& .MuiLinearProgress-bar': { borderRadius: 4, background: `linear-gradient(90deg, ${f.color}, ${f.color}CC)` },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <GlassCard delay={0.7}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              المسارات الأكثر طلباً
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={routeStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis type="number" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis dataKey="route" type="category" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} width={90} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                <Bar dataKey="trips" name="رحلات" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Recent Trips Table ────────────────────────────────────── */}
      <GlassCard delay={0.8}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
          آخر الرحلات
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['رقم الرحلة', 'السائق', 'المركبة', 'المسار', 'الحالة', 'الوقت'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.78rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {recentTrips.map((row) => (
                <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#f59e0b', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.id}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#E2E8F0' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.driver}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#E2E8F0' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.vehicle}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.route}</TableCell>
                  <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <Chip label={row.status} size="small" sx={{
                      height: 22, fontSize: '0.7rem', fontWeight: 600,
                      backgroundColor: row.status === 'مكتمل' ? alpha('#10b981', 0.12) : row.status === 'جاري' ? alpha('#f59e0b', 0.12) : alpha('#ef4444', 0.12),
                      color: row.status === 'مكتمل' ? '#10b981' : row.status === 'جاري' ? '#f59e0b' : '#ef4444',
                    }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </GlassCard>
    </Box>
  );
}
