/**
 * SocialWorkProDashboard — لوحة الخدمة الاجتماعية البريميوم
 * Premium Glassmorphism Dashboard for Social Work Services
 *
 * Gradient: #8b5cf6 → #ec4899 → #f59e0b
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
import Diversity3Icon from '@mui/icons-material/Diversity3';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import PsychologyIcon from '@mui/icons-material/Psychology';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import RefreshIcon from '@mui/icons-material/Refresh';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Pending';

// ─── Gradient Palette ───────────────────────────────────────────────────────
const GRADIENT = 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #f59e0b 100%)';
const COLORS = ['#8b5cf6', '#ec4899', '#f59e0b', '#06b6d4', '#22c55e', '#ef4444'];

// ─── Mock Data ──────────────────────────────────────────────────────────────
const kpiCards = [
  { title: 'الحالات النشطة', value: '١٨٧', change: '+١٤٪', up: true, icon: Diversity3Icon, color: '#8b5cf6' },
  { title: 'جلسات الدعم', value: '٣٤٢', change: '+٢٢٪', up: true, icon: PsychologyIcon, color: '#ec4899' },
  { title: 'رضا الأسر', value: '٩١٪', change: '+٤٪', up: true, icon: FamilyRestroomIcon, color: '#f59e0b' },
  { title: 'الإحالات المغلقة', value: '٨٧٪', change: '+٦٪', up: true, icon: VolunteerActivismIcon, color: '#22c55e' },
];

const monthlyCases = [
  { month: 'يناير', حالات_جديدة: 42, جلسات_إرشاد: 86, إحالات: 28, متابعة: 65 },
  { month: 'فبراير', حالات_جديدة: 38, جلسات_إرشاد: 92, إحالات: 32, متابعة: 70 },
  { month: 'مارس', حالات_جديدة: 45, جلسات_إرشاد: 104, إحالات: 36, متابعة: 78 },
  { month: 'أبريل', حالات_جديدة: 50, جلسات_إرشاد: 110, إحالات: 30, متابعة: 82 },
  { month: 'مايو', حالات_جديدة: 47, جلسات_إرشاد: 98, إحالات: 34, متابعة: 88 },
  { month: 'يونيو', حالات_جديدة: 52, جلسات_إرشاد: 115, إحالات: 38, متابعة: 92 },
];

const serviceTypes = [
  { name: 'إرشاد نفسي', value: 30 },
  { name: 'دعم أسري', value: 25 },
  { name: 'تأهيل مجتمعي', value: 18 },
  { name: 'إحالات طبية', value: 12 },
  { name: 'مساعدة مالية', value: 10 },
  { name: 'أخرى', value: 5 },
];

const performanceRadar = [
  { metric: 'سرعة الاستجابة', score: 88 },
  { metric: 'جودة الخدمة', score: 92 },
  { metric: 'رضا المستفيدين', score: 91 },
  { metric: 'المتابعة', score: 85 },
  { metric: 'التوثيق', score: 94 },
  { metric: 'التنسيق', score: 87 },
];

const workerCaseload = [
  { name: 'أحمد الشمري', active: 24, completed: 48, satisfaction: 94 },
  { name: 'نورة القحطاني', active: 28, completed: 52, satisfaction: 96 },
  { name: 'خالد العتيبي', active: 22, completed: 44, satisfaction: 91 },
  { name: 'سارة الدوسري', active: 26, completed: 50, satisfaction: 93 },
  { name: 'محمد الحربي', active: 20, completed: 40, satisfaction: 89 },
];

const caseCategories = [
  { name: 'أحمد', نفسي: 8, أسري: 6, مجتمعي: 5, طبي: 5 },
  { name: 'نورة', نفسي: 10, أسري: 7, مجتمعي: 6, طبي: 5 },
  { name: 'خالد', نفسي: 7, أسري: 5, مجتمعي: 6, طبي: 4 },
  { name: 'سارة', نفسي: 9, أسري: 8, مجتمعي: 5, طبي: 4 },
  { name: 'محمد', نفسي: 6, أسري: 5, مجتمعي: 5, طبي: 4 },
];

const recentCases = [
  { id: 'SW-287', patient: 'عبدالله أحمد', type: 'إرشاد نفسي', worker: 'نورة القحطاني', date: '٢٠٢٦/٠٣/٣٠', status: 'نشطة' },
  { id: 'SW-286', patient: 'فاطمة محمد', type: 'دعم أسري', worker: 'أحمد الشمري', date: '٢٠٢٦/٠٣/٢٩', status: 'قيد المتابعة' },
  { id: 'SW-285', patient: 'سعود خالد', type: 'تأهيل مجتمعي', worker: 'سارة الدوسري', date: '٢٠٢٦/٠٣/٢٨', status: 'مكتملة' },
  { id: 'SW-284', patient: 'ريم عبدالرحمن', type: 'إحالة طبية', worker: 'خالد العتيبي', date: '٢٠٢٦/٠٣/٢٧', status: 'نشطة' },
  { id: 'SW-283', patient: 'يوسف علي', type: 'مساعدة مالية', worker: 'محمد الحربي', date: '٢٠٢٦/٠٣/٢٦', status: 'مكتملة' },
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
export default function SocialWorkProDashboard() {
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
              ? 'linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(236,72,153,0.2) 50%, rgba(245,158,11,0.15) 100%)'
              : 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(236,72,153,0.08) 50%, rgba(245,158,11,0.06) 100%)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(139,92,246,0.15)'}`,
            backdropFilter: 'blur(20px)',
          }}
        >
          <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {[
              { left: '-5%', top: '-10%', size: 250, color: 'rgba(139,92,246,0.15)' },
              { right: '-3%', bottom: '-15%', size: 200, color: 'rgba(236,72,153,0.12)' },
              { left: '50%', top: '30%', size: 180, color: 'rgba(245,158,11,0.08)' },
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
              <Avatar sx={{ width: 52, height: 52, background: GRADIENT, boxShadow: '0 8px 24px rgba(139,92,246,0.4)' }}>
                <Diversity3Icon sx={{ fontSize: 26 }} />
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' }, background: GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  لوحة الخدمة الاجتماعية
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }}>
                  إدارة الحالات والإرشاد والدعم الأسري
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
                        {kpi.up ? <TrendingUpIcon sx={{ fontSize: 14, color: '#22c55e' }} /> : <TrendingDownIcon sx={{ fontSize: 14, color: '#ef4444' }} />}
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
              <SectionHeader title="الحالات الشهرية" subtitle="حالات جديدة وجلسات إرشاد وإحالات" />
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyCases}>
                  <defs>
                    {['حالات_جديدة', 'جلسات_إرشاد', 'إحالات', 'متابعة'].map((key, i) => (
                      <linearGradient key={key} id={`swGrad${i}`} x1="0" y1="0" x2="0" y2="1">
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
                  {['حالات_جديدة', 'جلسات_إرشاد', 'إحالات', 'متابعة'].map((key, i) => (
                    <Area key={key} type="monotone" dataKey={key} stroke={COLORS[i]} fill={`url(#swGrad${i})`} strokeWidth={2} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard>
              <SectionHeader title="أنواع الخدمات" subtitle="توزيع الخدمات الاجتماعية" />
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={serviceTypes} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {serviceTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
              <SectionHeader title="مؤشرات الأداء" subtitle="تقييم فريق الخدمة الاجتماعية" />
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={performanceRadar}>
                  <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                  <Radar name="الأداء" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <GlassCard>
              <SectionHeader title="أعباء العمل" subtitle="حالات كل أخصائي اجتماعي" />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                {workerCaseload.map((w, i) => (
                  <Box key={i}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.65rem', background: alpha(COLORS[i % COLORS.length], 0.15), color: COLORS[i % COLORS.length] }}>
                          {w.name.charAt(0)}
                        </Avatar>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>{w.name}</Typography>
                      </Box>
                      <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: COLORS[i % COLORS.length] }}>{w.active} حالة</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate" value={(w.active / 30) * 100}
                      sx={{
                        height: 6, borderRadius: 3,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': { borderRadius: 3, background: COLORS[i % COLORS.length] },
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
              <SectionHeader title="فئات الحالات" subtitle="حسب الأخصائي والنوع" />
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={caseCategories}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <YAxis tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <RTooltip contentStyle={{ background: isDark ? '#1E293B' : '#fff', border: 'none', borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="نفسي" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="أسري" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="مجتمعي" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="طبي" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
      </Grid>

      {/* ── Recent Cases Table ────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <GlassCard>
          <SectionHeader title="أحدث الحالات" subtitle="آخر الحالات المسجلة" action={<Tooltip title="تحديث"><IconButton size="small" sx={{ color: '#8b5cf6' }}><RefreshIcon fontSize="small" /></IconButton></Tooltip>} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['رقم الحالة', 'المستفيد', 'نوع الخدمة', 'الأخصائي', 'التاريخ', 'الحالة'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {recentCases.map((row, i) => (
                  <TableRow key={i} sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } }}>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#8b5cf6' }}>{row.id}</Typography>
                    </TableCell>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, borderRadius: '8px', background: alpha(COLORS[i % COLORS.length], 0.12), fontSize: '0.65rem', color: COLORS[i % COLORS.length] }}>
                          {row.patient.charAt(0)}
                        </Avatar>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#1E293B' }}>{row.patient}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.type}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.worker}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.date}</TableCell>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Chip
                        icon={row.status === 'مكتملة' ? <CheckCircleIcon sx={{ fontSize: '12px !important' }} /> : <PendingIcon sx={{ fontSize: '12px !important' }} />}
                        label={row.status} size="small"
                        sx={{
                          height: 22, fontSize: '0.65rem', fontWeight: 700,
                          backgroundColor: row.status === 'مكتملة' ? alpha('#22c55e', 0.12) : row.status === 'نشطة' ? alpha('#8b5cf6', 0.12) : alpha('#f59e0b', 0.12),
                          color: row.status === 'مكتملة' ? '#22c55e' : row.status === 'نشطة' ? '#8b5cf6' : '#f59e0b',
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
