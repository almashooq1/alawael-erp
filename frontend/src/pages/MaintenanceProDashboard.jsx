/**
 * MaintenanceProDashboard — لوحة الصيانة والمرافق البريميوم
 * Premium Glassmorphism Dashboard for Maintenance & Facilities
 *
 * Gradient: #f59e0b → #22c55e → #06b6d4
 */

import { useState } from 'react';
import {
  Box, Typography, Grid, Card, LinearProgress, Chip, Avatar,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  useTheme, alpha, IconButton, Tooltip,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, RadarChart,
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend,
} from 'recharts';
import BuildIcon from '@mui/icons-material/Build';
import HandymanIcon from '@mui/icons-material/Handyman';
import ApartmentIcon from '@mui/icons-material/Apartment';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import EngineeringIcon from '@mui/icons-material/Engineering';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

// ─── Gradient Palette ───────────────────────────────────────────────────────
const GRADIENT = 'linear-gradient(135deg, #f59e0b 0%, #22c55e 50%, #06b6d4 100%)';
const COLORS = ['#f59e0b', '#22c55e', '#06b6d4', '#8b5cf6', '#ef4444', '#ec4899'];

// ─── Mock Data ──────────────────────────────────────────────────────────────
const kpiCards = [
  { title: 'أوامر العمل النشطة', value: '٦٧', change: '-١٨٪', up: false, icon: BuildIcon, color: '#f59e0b' },
  { title: 'نسبة الإنجاز', value: '٩١٪', change: '+٤٪', up: true, icon: EngineeringIcon, color: '#22c55e' },
  { title: 'متوسط الاستجابة', value: '٢.٤ س', change: '-٢٠٪', up: false, icon: HandymanIcon, color: '#06b6d4' },
  { title: 'الصيانة الوقائية', value: '٩٤٪', change: '+٧٪', up: true, icon: ApartmentIcon, color: '#8b5cf6' },
];

const monthlyWorkOrders = [
  { month: 'يناير', تصحيحية: 45, وقائية: 62, طارئة: 12, تحسينية: 18 },
  { month: 'فبراير', تصحيحية: 38, وقائية: 68, طارئة: 8, تحسينية: 22 },
  { month: 'مارس', تصحيحية: 42, وقائية: 70, طارئة: 14, تحسينية: 20 },
  { month: 'أبريل', تصحيحية: 35, وقائية: 75, طارئة: 10, تحسينية: 25 },
  { month: 'مايو', تصحيحية: 30, وقائية: 78, طارئة: 7, تحسينية: 28 },
  { month: 'يونيو', تصحيحية: 28, وقائية: 80, طارئة: 6, تحسينية: 30 },
];

const categoryBreakdown = [
  { name: 'كهربائية', value: 28 },
  { name: 'ميكانيكية', value: 22 },
  { name: 'تكييف', value: 18 },
  { name: 'سباكة', value: 15 },
  { name: 'مدنية', value: 10 },
  { name: 'أخرى', value: 7 },
];

const performanceRadar = [
  { metric: 'سرعة الاستجابة', score: 88 },
  { metric: 'جودة الإصلاح', score: 93 },
  { metric: 'الصيانة الوقائية', score: 94 },
  { metric: 'رضا العملاء', score: 90 },
  { metric: 'إدارة المخزون', score: 86 },
  { metric: 'السلامة', score: 95 },
];

const buildingStatus = [
  { building: 'المبنى الرئيسي', health: 94, issues: 3, status: 'ممتاز' },
  { building: 'مبنى التأهيل', health: 89, issues: 5, status: 'جيد' },
  { building: 'مبنى الإدارة', health: 96, issues: 1, status: 'ممتاز' },
  { building: 'مبنى العيادات', health: 87, issues: 6, status: 'جيد' },
  { building: 'مبنى الخدمات', health: 82, issues: 8, status: 'مقبول' },
];

const technicianLoad = [
  { name: 'كهرباء', مكتمل: 42, جاري: 8, معلق: 3 },
  { name: 'تكييف', مكتمل: 35, جاري: 6, معلق: 4 },
  { name: 'سباكة', مكتمل: 28, جاري: 5, معلق: 2 },
  { name: 'ميكانيكا', مكتمل: 32, جاري: 7, معلق: 3 },
  { name: 'مدني', مكتمل: 20, جاري: 4, معلق: 1 },
];

const recentOrders = [
  { id: 'WO-1247', desc: 'إصلاح تكييف - الطابق الثالث', type: 'تصحيحية', priority: 'عالي', tech: 'أحمد سالم', date: '٢٠٢٦/٠٣/٣٠', status: 'جاري' },
  { id: 'WO-1246', desc: 'صيانة مولد كهربائي', type: 'وقائية', priority: 'متوسط', tech: 'فهد العنزي', date: '٢٠٢٦/٠٣/٣٠', status: 'مكتمل' },
  { id: 'WO-1245', desc: 'تسريب مياه - الحمامات', type: 'طارئة', priority: 'حرج', tech: 'خالد محمد', date: '٢٠٢٦/٠٣/٢٩', status: 'مكتمل' },
  { id: 'WO-1244', desc: 'تركيب إضاءة LED جديدة', type: 'تحسينية', priority: 'منخفض', tech: 'سعيد القرني', date: '٢٠٢٦/٠٣/٢٩', status: 'معلق' },
  { id: 'WO-1243', desc: 'فحص دوري - مصاعد', type: 'وقائية', priority: 'عالي', tech: 'عمر الشهري', date: '٢٠٢٦/٠٣/٢٨', status: 'جاري' },
];

// ─── Glass Card ─────────────────────────────────────────────────────────────
const GlassCard = ({ children, sx, ...props }) => {
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
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
        p: 2.5, ...sx,
      }}
      {...props}
    >
      {children}
    </Card>
  );
};

const SectionHeader = ({ title, subtitle, action }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.45)' : '#64748B', mt: 0.25 }}>{subtitle}</Typography>}
      </Box>
      {action || <IconButton size="small" sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94A3B8' }}><MoreVertIcon fontSize="small" /></IconButton>}
    </Box>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function MaintenanceProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [hoveredKpi, setHoveredKpi] = useState(null);

  return (
    <Box sx={{ direction: 'rtl', minHeight: '100vh' }}>
      {/* ── Hero Header ──────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box
          sx={{
            position: 'relative', borderRadius: '28px', overflow: 'hidden', mb: 3, p: { xs: 3, md: 4 },
            background: isDark
              ? 'linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(34,197,94,0.2) 50%, rgba(6,182,212,0.15) 100%)'
              : 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(34,197,94,0.08) 50%, rgba(6,182,212,0.06) 100%)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(245,158,11,0.15)'}`,
            backdropFilter: 'blur(20px)',
          }}
        >
          <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {[
              { left: '-5%', top: '-10%', size: 250, color: 'rgba(245,158,11,0.15)' },
              { right: '-3%', bottom: '-15%', size: 200, color: 'rgba(34,197,94,0.12)' },
              { left: '50%', top: '30%', size: 180, color: 'rgba(6,182,212,0.08)' },
            ].map((b, i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 6 + i * 2, repeat: Infinity }}
                style={{ position: 'absolute', ...b, width: b.size, height: b.size, borderRadius: '50%', background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)` }}
              />
            ))}
          </Box>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Avatar sx={{ width: 52, height: 52, background: GRADIENT, boxShadow: '0 8px 24px rgba(245,158,11,0.4)' }}>
                <BuildIcon sx={{ fontSize: 26 }} />
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' }, background: GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  لوحة الصيانة والمرافق
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }}>
                  إدارة أوامر العمل والصيانة الوقائية والمباني
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── KPI Cards ────────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {kpiCards.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} whileHover={{ y: -4 }} onHoverStart={() => setHoveredKpi(i)} onHoverEnd={() => setHoveredKpi(null)}>
                <GlassCard>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B', mb: 0.5 }}>{kpi.title}</Typography>
                      <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, background: GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{kpi.value}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        {kpi.up ? <TrendingUpIcon sx={{ fontSize: 14, color: '#22c55e' }} /> : <TrendingDownIcon sx={{ fontSize: 14, color: '#22c55e' }} />}
                        <Typography sx={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 600 }}>{kpi.change}</Typography>
                      </Box>
                    </Box>
                    <Avatar sx={{ width: 44, height: 44, borderRadius: '14px', background: hoveredKpi === i ? GRADIENT : alpha(kpi.color, 0.12), transition: 'all 0.3s' }}>
                      <Icon sx={{ fontSize: 22, color: hoveredKpi === i ? '#fff' : kpi.color }} />
                    </Avatar>
                  </Box>
                </GlassCard>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Charts Row 1 ─────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <GlassCard>
              <SectionHeader title="أوامر العمل الشهرية" subtitle="حسب نوع الصيانة" />
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyWorkOrders}>
                  <defs>
                    {['تصحيحية', 'وقائية', 'طارئة', 'تحسينية'].map((key, i) => (
                      <linearGradient key={key} id={`mtGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={COLORS[i]} stopOpacity={0.3} />
                        <stop offset="100%" stopColor={COLORS[i]} stopOpacity={0.02} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <RTooltip contentStyle={{ background: isDark ? '#1E293B' : '#fff', border: 'none', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }} />
                  <Legend />
                  {['تصحيحية', 'وقائية', 'طارئة', 'تحسينية'].map((key, i) => (
                    <Area key={key} type="monotone" dataKey={key} stroke={COLORS[i]} fill={`url(#mtGrad${i})`} strokeWidth={2} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard>
              <SectionHeader title="فئات الصيانة" subtitle="التوزيع حسب التخصص" />
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={categoryBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <RTooltip contentStyle={{ background: isDark ? '#1E293B' : '#fff', border: 'none', borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
      </Grid>

      {/* ── Charts Row 2 ─────────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <GlassCard>
              <SectionHeader title="مؤشرات الأداء" subtitle="تقييم شامل لخدمات الصيانة" />
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={performanceRadar}>
                  <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                  <Radar name="الأداء" dataKey="score" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <GlassCard>
              <SectionHeader title="حالة المباني" subtitle="صحة المباني والأعطال" />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                {buildingStatus.map((b, i) => (
                  <Box key={i}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, borderRadius: '6px', background: alpha(COLORS[i % COLORS.length], 0.15) }}>
                          <ApartmentIcon sx={{ fontSize: 13, color: COLORS[i % COLORS.length] }} />
                        </Avatar>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>{b.building}</Typography>
                      </Box>
                      <Chip label={`${b.issues} أعطال`} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, backgroundColor: alpha(b.health >= 90 ? '#22c55e' : b.health >= 85 ? '#f59e0b' : '#ef4444', 0.12), color: b.health >= 90 ? '#22c55e' : b.health >= 85 ? '#f59e0b' : '#ef4444' }} />
                    </Box>
                    <LinearProgress
                      variant="determinate" value={b.health}
                      sx={{
                        height: 6, borderRadius: 3,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': { borderRadius: 3, background: b.health >= 90 ? '#22c55e' : b.health >= 85 ? '#f59e0b' : '#ef4444' },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <GlassCard>
              <SectionHeader title="أعباء الفرق الفنية" subtitle="حالة الأوامر حسب التخصص" />
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={technicianLoad}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <YAxis tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <RTooltip contentStyle={{ background: isDark ? '#1E293B' : '#fff', border: 'none', borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="مكتمل" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="جاري" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="معلق" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
      </Grid>

      {/* ── Recent Work Orders Table ──────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <GlassCard>
          <SectionHeader title="أحدث أوامر العمل" subtitle="آخر طلبات الصيانة" action={<Tooltip title="تحديث"><IconButton size="small" sx={{ color: '#f59e0b' }}><RefreshIcon fontSize="small" /></IconButton></Tooltip>} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['رقم الأمر', 'الوصف', 'النوع', 'الأولوية', 'الفني', 'التاريخ', 'الحالة'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {recentOrders.map((row, i) => (
                  <TableRow key={i} sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } }}>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b' }}>{row.id}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#E2E8F0' : '#1E293B', fontWeight: 500, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', maxWidth: 180 }}>{row.desc}</TableCell>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Chip label={row.type} size="small" sx={{ height: 20, fontSize: '0.6rem', fontWeight: 700, backgroundColor: alpha(row.type === 'طارئة' ? '#ef4444' : row.type === 'وقائية' ? '#22c55e' : row.type === 'تصحيحية' ? '#f59e0b' : '#06b6d4', 0.12), color: row.type === 'طارئة' ? '#ef4444' : row.type === 'وقائية' ? '#22c55e' : row.type === 'تصحيحية' ? '#f59e0b' : '#06b6d4' }} />
                    </TableCell>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Chip
                        icon={row.priority === 'حرج' ? <WarningAmberIcon sx={{ fontSize: '12px !important' }} /> : undefined}
                        label={row.priority} size="small"
                        sx={{
                          height: 20, fontSize: '0.6rem', fontWeight: 700,
                          backgroundColor: alpha(row.priority === 'حرج' ? '#ef4444' : row.priority === 'عالي' ? '#f59e0b' : row.priority === 'متوسط' ? '#06b6d4' : '#22c55e', 0.12),
                          color: row.priority === 'حرج' ? '#ef4444' : row.priority === 'عالي' ? '#f59e0b' : row.priority === 'متوسط' ? '#06b6d4' : '#22c55e',
                          '& .MuiChip-icon': { color: 'inherit' },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.tech}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.date}</TableCell>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Chip
                        icon={row.status === 'مكتمل' ? <CheckCircleIcon sx={{ fontSize: '12px !important' }} /> : <PendingActionsIcon sx={{ fontSize: '12px !important' }} />}
                        label={row.status} size="small"
                        sx={{
                          height: 22, fontSize: '0.65rem', fontWeight: 700,
                          backgroundColor: row.status === 'مكتمل' ? alpha('#22c55e', 0.12) : row.status === 'جاري' ? alpha('#f59e0b', 0.12) : alpha('#ef4444', 0.12),
                          color: row.status === 'مكتمل' ? '#22c55e' : row.status === 'جاري' ? '#f59e0b' : '#ef4444',
                          '& .MuiChip-icon': { color: 'inherit' },
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </GlassCard>
      </motion.div>
    </Box>
  );
}
