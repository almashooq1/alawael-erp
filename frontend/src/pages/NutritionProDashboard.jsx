/**
 * NutritionProDashboard — لوحة التغذية والمطبخ البريميوم
 * Premium Glassmorphism Dashboard for Nutrition & Kitchen Management
 *
 * Gradient: #22c55e → #f59e0b → #ef4444
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
import RestaurantIcon from '@mui/icons-material/Restaurant';
import LocalDiningIcon from '@mui/icons-material/LocalDining';
import KitchenIcon from '@mui/icons-material/Kitchen';
import FlatwareIcon from '@mui/icons-material/Flatware';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SetMealIcon from '@mui/icons-material/SetMeal';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';

// ─── Gradient Palette ───────────────────────────────────────────────────────
const GRADIENT = 'linear-gradient(135deg, #22c55e 0%, #f59e0b 50%, #ef4444 100%)';
const COLORS = ['#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#ec4899'];

// ─── Mock Data ──────────────────────────────────────────────────────────────
const kpiCards = [
  { title: 'الوجبات اليومية', value: '٨٤٧', change: '+١٢٪', up: true, icon: RestaurantIcon, color: '#22c55e' },
  { title: 'الحمية الخاصة', value: '١٢٤', change: '+٨٪', up: true, icon: MonitorHeartIcon, color: '#f59e0b' },
  { title: 'رضا المرضى', value: '٩٢٪', change: '+٣٪', up: true, icon: SetMealIcon, color: '#06b6d4' },
  { title: 'هدر الطعام', value: '٤.٢٪', change: '-١.٥٪', up: false, icon: KitchenIcon, color: '#ef4444' },
];

const monthlyMeals = [
  { month: 'يناير', فطور: 780, غداء: 820, عشاء: 650, وجبات_خفيفة: 320 },
  { month: 'فبراير', فطور: 810, غداء: 850, عشاء: 680, وجبات_خفيفة: 340 },
  { month: 'مارس', فطور: 790, غداء: 870, عشاء: 700, وجبات_خفيفة: 360 },
  { month: 'أبريل', فطور: 830, غداء: 900, عشاء: 720, وجبات_خفيفة: 380 },
  { month: 'مايو', فطور: 860, غداء: 920, عشاء: 740, وجبات_خفيفة: 400 },
  { month: 'يونيو', فطور: 847, غداء: 940, عشاء: 760, وجبات_خفيفة: 420 },
];

const dietCategories = [
  { name: 'عادي', value: 45 },
  { name: 'سكري', value: 18 },
  { name: 'قليل الملح', value: 12 },
  { name: 'سائل', value: 10 },
  { name: 'لين', value: 8 },
  { name: 'أخرى', value: 7 },
];

const qualityRadar = [
  { metric: 'جودة الطعام', score: 92 },
  { metric: 'النظافة', score: 96 },
  { metric: 'التوقيت', score: 88 },
  { metric: 'التنوع', score: 85 },
  { metric: 'القيمة الغذائية', score: 90 },
  { metric: 'رضا المرضى', score: 92 },
];

const mealDistribution = [
  { name: 'الفطور', قسم_الرجال: 180, قسم_النساء: 160, قسم_الأطفال: 120, الموظفون: 200 },
  { name: 'الغداء', قسم_الرجال: 200, قسم_النساء: 180, قسم_الأطفال: 140, الموظفون: 220 },
  { name: 'العشاء', قسم_الرجال: 170, قسم_النساء: 150, قسم_الأطفال: 110, الموظفون: 180 },
  { name: 'وجبة خفيفة', قسم_الرجال: 80, قسم_النساء: 70, قسم_الأطفال: 90, الموظفون: 100 },
];

const inventoryStatus = [
  { item: 'اللحوم والدواجن', stock: 85, status: 'جيد' },
  { item: 'الخضروات والفواكه', stock: 72, status: 'جيد' },
  { item: 'منتجات الألبان', stock: 45, status: 'تحذير' },
  { item: 'الحبوب والمعكرونة', stock: 90, status: 'ممتاز' },
  { item: 'التوابل والبهارات', stock: 65, status: 'جيد' },
];

const todayMenu = [
  { meal: 'الفطور', items: 'بيض مسلوق، جبنة، خبز، شاي', time: '٧:٠٠ ص', served: 780, status: 'مكتمل' },
  { meal: 'الغداء', items: 'أرز بالدجاج، سلطة، شوربة', time: '١٢:٣٠ م', served: 640, status: 'جاري' },
  { meal: 'العشاء', items: 'معكرونة، خضار مشوي، فاكهة', time: '٦:٣٠ م', served: 0, status: 'قادم' },
  { meal: 'وجبة خفيفة', items: 'بسكويت، عصير، فاكهة', time: '٣:٣٠ م', served: 320, status: 'مكتمل' },
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
        p: 2.5,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Card>
  );
};

// ─── Section Header ─────────────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle, action }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
      <Box>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.45)' : '#64748B', mt: 0.25 }}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action || (
        <IconButton size="small" sx={{ color: isDark ? 'rgba(255,255,255,0.3)' : '#94A3B8' }}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      )}
    </Box>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
export default function NutritionProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [hoveredKpi, setHoveredKpi] = useState(null);

  return (
    <Box sx={{ direction: 'rtl', minHeight: '100vh' }}>
      {/* ── Hero Header ──────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box
          sx={{
            position: 'relative',
            borderRadius: '28px',
            overflow: 'hidden',
            mb: 3,
            p: { xs: 3, md: 4 },
            background: isDark
              ? 'linear-gradient(135deg, rgba(34,197,94,0.25) 0%, rgba(245,158,11,0.2) 50%, rgba(239,68,68,0.15) 100%)'
              : 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(245,158,11,0.08) 50%, rgba(239,68,68,0.06) 100%)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(34,197,94,0.15)'}`,
            backdropFilter: 'blur(20px)',
          }}
        >
          <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {[
              { left: '-5%', top: '-10%', size: 250, color: 'rgba(34,197,94,0.15)' },
              { right: '-3%', bottom: '-15%', size: 200, color: 'rgba(245,158,11,0.12)' },
              { left: '50%', top: '30%', size: 180, color: 'rgba(239,68,68,0.08)' },
            ].map((b, i) => (
              <motion.div
                key={i}
                animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 6 + i * 2, repeat: Infinity }}
                style={{
                  position: 'absolute', ...b, width: b.size, height: b.size, borderRadius: '50%',
                  background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)`,
                }}
              />
            ))}
          </Box>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Avatar sx={{ width: 52, height: 52, background: GRADIENT, boxShadow: '0 8px 24px rgba(34,197,94,0.4)' }}>
                <RestaurantIcon sx={{ fontSize: 26 }} />
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' }, background: GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  لوحة التغذية والمطبخ
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }}>
                  إدارة الوجبات والحمية والمخزون الغذائي
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -4 }}
                onHoverStart={() => setHoveredKpi(i)}
                onHoverEnd={() => setHoveredKpi(null)}
              >
                <GlassCard>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.75rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B', mb: 0.5 }}>
                        {kpi.title}
                      </Typography>
                      <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, background: GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        {kpi.value}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        {kpi.up ? <TrendingUpIcon sx={{ fontSize: 14, color: '#22c55e' }} /> : <TrendingDownIcon sx={{ fontSize: 14, color: '#22c55e' }} />}
                        <Typography sx={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 600 }}>{kpi.change}</Typography>
                      </Box>
                    </Box>
                    <Avatar
                      sx={{
                        width: 44, height: 44, borderRadius: '14px',
                        background: hoveredKpi === i ? GRADIENT : alpha(kpi.color, 0.12),
                        transition: 'all 0.3s',
                      }}
                    >
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
        {/* Monthly Meals Area Chart */}
        <Grid item xs={12} md={8}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <GlassCard>
              <SectionHeader title="الوجبات الشهرية" subtitle="توزيع الوجبات حسب النوع" />
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyMeals}>
                  <defs>
                    {['فطور', 'غداء', 'عشاء', 'وجبات_خفيفة'].map((key, i) => (
                      <linearGradient key={key} id={`nutGrad${i}`} x1="0" y1="0" x2="0" y2="1">
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
                  {['فطور', 'غداء', 'عشاء', 'وجبات_خفيفة'].map((key, i) => (
                    <Area key={key} type="monotone" dataKey={key} stroke={COLORS[i]} fill={`url(#nutGrad${i})`} strokeWidth={2} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>

        {/* Diet Categories Pie */}
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard>
              <SectionHeader title="أنواع الحمية" subtitle="توزيع الأنظمة الغذائية" />
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={dietCategories} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {dietCategories.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
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
        {/* Quality Radar */}
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <GlassCard>
              <SectionHeader title="مؤشرات الجودة" subtitle="تقييم شامل للخدمة" />
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={qualityRadar}>
                  <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                  <Radar name="التقييم" dataKey="score" stroke="#22c55e" fill="#22c55e" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>

        {/* Inventory Status */}
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <GlassCard>
              <SectionHeader title="مخزون المواد الغذائية" subtitle="حالة المخزون الحالية" />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                {inventoryStatus.map((item, i) => (
                  <Box key={i}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>
                        {item.item}
                      </Typography>
                      <Chip
                        label={item.status}
                        size="small"
                        sx={{
                          height: 20, fontSize: '0.6rem', fontWeight: 700,
                          backgroundColor: item.status === 'ممتاز' ? alpha('#22c55e', 0.12) : item.status === 'تحذير' ? alpha('#f59e0b', 0.12) : alpha('#06b6d4', 0.12),
                          color: item.status === 'ممتاز' ? '#22c55e' : item.status === 'تحذير' ? '#f59e0b' : '#06b6d4',
                        }}
                      />
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={item.stock}
                      sx={{
                        height: 6, borderRadius: 3,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 3,
                          background: item.stock > 80 ? '#22c55e' : item.stock > 50 ? '#f59e0b' : '#ef4444',
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </GlassCard>
          </motion.div>
        </Grid>

        {/* Meal Distribution Bar Chart */}
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <GlassCard>
              <SectionHeader title="توزيع الوجبات" subtitle="حسب القسم" />
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={mealDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <YAxis tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <RTooltip contentStyle={{ background: isDark ? '#1E293B' : '#fff', border: 'none', borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="قسم_الرجال" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="قسم_النساء" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="قسم_الأطفال" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="الموظفون" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
      </Grid>

      {/* ── Today's Menu Table ────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <GlassCard>
          <SectionHeader
            title="قائمة اليوم"
            subtitle="الوجبات المجدولة لليوم"
            action={
              <Tooltip title="تحديث">
                <IconButton size="small" sx={{ color: '#22c55e' }}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            }
          />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['الوجبة', 'الأصناف', 'الوقت', 'تم التقديم', 'الحالة'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {todayMenu.map((row, i) => (
                  <TableRow key={i} sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } }}>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 30, height: 30, borderRadius: '8px', background: alpha(COLORS[i % COLORS.length], 0.12) }}>
                          <FlatwareIcon sx={{ fontSize: 14, color: COLORS[i % COLORS.length] }} />
                        </Avatar>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#1E293B' }}>
                          {row.meal}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', maxWidth: 200 }}>
                      {row.items}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      {row.time}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 700, color: isDark ? '#E2E8F0' : '#1E293B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      {row.served}
                    </TableCell>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Chip
                        icon={row.status === 'مكتمل' ? <CheckCircleIcon sx={{ fontSize: '12px !important' }} /> : row.status === 'جاري' ? <LocalDiningIcon sx={{ fontSize: '12px !important' }} /> : <WarningAmberIcon sx={{ fontSize: '12px !important' }} />}
                        label={row.status}
                        size="small"
                        sx={{
                          height: 22, fontSize: '0.65rem', fontWeight: 700,
                          backgroundColor: row.status === 'مكتمل' ? alpha('#22c55e', 0.12) : row.status === 'جاري' ? alpha('#f59e0b', 0.12) : alpha('#06b6d4', 0.12),
                          color: row.status === 'مكتمل' ? '#22c55e' : row.status === 'جاري' ? '#f59e0b' : '#06b6d4',
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
