/**
 * InfectionControlProDashboard — لوحة مكافحة العدوى البريميوم
 * Premium Glassmorphism Dashboard for Infection Control
 *
 * Gradient: #ef4444 → #8b5cf6 → #06b6d4
 */

import { useState } from 'react';
import {
  useTheme, alpha,
} from '@mui/material';

import CoronavirusIcon from '@mui/icons-material/Coronavirus';
import CleanHandsIcon from '@mui/icons-material/CleanHands';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import ShieldIcon from '@mui/icons-material/Shield';

// ─── Gradient Palette ───────────────────────────────────────────────────────
const GRADIENT = 'linear-gradient(135deg, #ef4444 0%, #8b5cf6 50%, #06b6d4 100%)';
const COLORS = ['#ef4444', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b', '#ec4899'];

// ─── Mock Data ──────────────────────────────────────────────────────────────
const kpiCards = [
  { title: 'الحالات النشطة', value: '١٢', change: '-٢٣٪', up: false, icon: CoronavirusIcon, color: '#ef4444' },
  { title: 'نسبة الامتثال', value: '٩٤.٧٪', change: '+٢.١٪', up: true, icon: ShieldIcon, color: '#8b5cf6' },
  { title: 'معدل نظافة اليدين', value: '٨٩٪', change: '+٥٪', up: true, icon: CleanHandsIcon, color: '#06b6d4' },
  { title: 'أيام بدون عدوى', value: '٤٧', change: '+١٢', up: true, icon: HealthAndSafetyIcon, color: '#22c55e' },
];

const monthlyInfections = [
  { month: 'يناير', بكتيرية: 8, فيروسية: 5, فطرية: 2, مكتسبة: 3 },
  { month: 'فبراير', بكتيرية: 6, فيروسية: 7, فطرية: 1, مكتسبة: 2 },
  { month: 'مارس', بكتيرية: 10, فيروسية: 12, فطرية: 3, مكتسبة: 4 },
  { month: 'أبريل', بكتيرية: 7, فيروسية: 8, فطرية: 2, مكتسبة: 3 },
  { month: 'مايو', بكتيرية: 5, فيروسية: 4, فطرية: 1, مكتسبة: 2 },
  { month: 'يونيو', بكتيرية: 4, فيروسية: 3, فطرية: 1, مكتسبة: 1 },
];

const infectionTypes = [
  { name: 'التهابات تنفسية', value: 32 },
  { name: 'التهابات مسالك بولية', value: 24 },
  { name: 'التهابات جراحية', value: 18 },
  { name: 'التهابات دموية', value: 14 },
  { name: 'التهابات جلدية', value: 8 },
  { name: 'أخرى', value: 4 },
];

const complianceRadar = [
  { metric: 'نظافة اليدين', score: 89 },
  { metric: 'التعقيم', score: 95 },
  { metric: 'العزل', score: 92 },
  { metric: 'PPE', score: 87 },
  { metric: 'النفايات الطبية', score: 94 },
  { metric: 'التدريب', score: 91 },
];

const departmentCompliance = [
  { dept: 'العناية المركزة', compliance: 96, status: 'ممتاز' },
  { dept: 'الجراحة', compliance: 93, status: 'جيد جداً' },
  { dept: 'الباطنية', compliance: 91, status: 'جيد جداً' },
  { dept: 'الطوارئ', compliance: 87, status: 'جيد' },
  { dept: 'الأطفال', compliance: 94, status: 'ممتاز' },
  { dept: 'التأهيل', compliance: 90, status: 'جيد جداً' },
];

const deptInfectionRate = [
  { name: 'العناية المركزة', الحالات: 5, المعدل: 2.1 },
  { name: 'الجراحة', الحالات: 3, المعدل: 1.4 },
  { name: 'الباطنية', الحالات: 4, المعدل: 1.8 },
  { name: 'الطوارئ', الحالات: 2, المعدل: 0.9 },
  { name: 'الأطفال', الحالات: 1, المعدل: 0.5 },
];

const activeAlerts = [
  { id: 'IC-001', type: 'MRSA', dept: 'العناية المركزة', date: '٢٠٢٦/٠٣/٢٨', severity: 'حرج', status: 'نشط' },
  { id: 'IC-002', type: 'C. diff', dept: 'الباطنية', date: '٢٠٢٦/٠٣/٢٧', severity: 'متوسط', status: 'قيد المتابعة' },
  { id: 'IC-003', type: 'VRE', dept: 'الجراحة', date: '٢٠٢٦/٠٣/٢٥', severity: 'عالي', status: 'معزول' },
  { id: 'IC-004', type: 'Influenza', dept: 'الأطفال', date: '٢٠٢٦/٠٣/٢٤', severity: 'منخفض', status: 'متعافي' },
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
export default function InfectionControlProDashboard() {
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
              ? 'linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(139,92,246,0.2) 50%, rgba(6,182,212,0.15) 100%)'
              : 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(6,182,212,0.06) 100%)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.15)'}`,
            backdropFilter: 'blur(20px)',
          }}
        >
          <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {[
              { left: '-5%', top: '-10%', size: 250, color: 'rgba(239,68,68,0.15)' },
              { right: '-3%', bottom: '-15%', size: 200, color: 'rgba(139,92,246,0.12)' },
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
              <Avatar sx={{ width: 52, height: 52, background: GRADIENT, boxShadow: '0 8px 24px rgba(239,68,68,0.4)' }}>
                <CoronavirusIcon sx={{ fontSize: 26 }} />
              </Avatar>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' }, background: GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  لوحة مكافحة العدوى
                </Typography>
                <Typography sx={{ fontSize: '0.85rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }}>
                  مراقبة العدوى والتعقيم ومعايير السلامة
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
              <SectionHeader title="العدوى الشهرية" subtitle="حسب النوع والمصدر" />
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyInfections}>
                  <defs>
                    {['بكتيرية', 'فيروسية', 'فطرية', 'مكتسبة'].map((key, i) => (
                      <linearGradient key={key} id={`icGrad${i}`} x1="0" y1="0" x2="0" y2="1">
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
                  {['بكتيرية', 'فيروسية', 'فطرية', 'مكتسبة'].map((key, i) => (
                    <Area key={key} type="monotone" dataKey={key} stroke={COLORS[i]} fill={`url(#icGrad${i})`} strokeWidth={2} />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard>
              <SectionHeader title="أنواع العدوى" subtitle="التوزيع حسب الموقع" />
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={infectionTypes} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                    {infectionTypes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
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
              <SectionHeader title="مؤشرات الامتثال" subtitle="تقييم شامل لمعايير مكافحة العدوى" />
              <ResponsiveContainer width="100%" height={280}>
                <RadarChart data={complianceRadar}>
                  <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                  <Radar name="الامتثال" dataKey="score" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <GlassCard>
              <SectionHeader title="امتثال الأقسام" subtitle="نسبة الالتزام بالمعايير" />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                {departmentCompliance.map((dept, i) => (
                  <Box key={i}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>{dept.dept}</Typography>
                      <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: dept.compliance >= 95 ? '#22c55e' : dept.compliance >= 90 ? '#06b6d4' : '#f59e0b' }}>{dept.compliance}٪</Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate" value={dept.compliance}
                      sx={{
                        height: 6, borderRadius: 3,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': { borderRadius: 3, background: dept.compliance >= 95 ? '#22c55e' : dept.compliance >= 90 ? '#06b6d4' : '#f59e0b' },
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
              <SectionHeader title="معدل العدوى بالأقسام" subtitle="عدد الحالات والمعدل لكل 1000 يوم" />
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={deptInfectionRate}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <YAxis tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <RTooltip contentStyle={{ background: isDark ? '#1E293B' : '#fff', border: 'none', borderRadius: 12 }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="الحالات" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="المعدل" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
      </Grid>

      {/* ── Active Alerts Table ───────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <GlassCard>
          <SectionHeader title="التنبيهات النشطة" subtitle="حالات العدوى المُبلَّغ عنها" action={<Tooltip title="تحديث"><IconButton size="small" sx={{ color: '#ef4444' }}><RefreshIcon fontSize="small" /></IconButton></Tooltip>} />
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['رقم البلاغ', 'نوع العدوى', 'القسم', 'التاريخ', 'الخطورة', 'الحالة'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {activeAlerts.map((row, i) => (
                  <TableRow key={i} sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } }}>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#ef4444' }}>{row.id}</Typography>
                    </TableCell>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar sx={{ width: 28, height: 28, borderRadius: '8px', background: alpha(COLORS[i % COLORS.length], 0.12) }}>
                          <BiotechIcon sx={{ fontSize: 14, color: COLORS[i % COLORS.length] }} />
                        </Avatar>
                        <Typography sx={{ fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#1E293B' }}>{row.type}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.dept}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.date}</TableCell>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Chip
                        icon={row.severity === 'حرج' ? <ErrorIcon sx={{ fontSize: '12px !important' }} /> : <WarningAmberIcon sx={{ fontSize: '12px !important' }} />}
                        label={row.severity} size="small"
                        sx={{
                          height: 22, fontSize: '0.65rem', fontWeight: 700,
                          backgroundColor: row.severity === 'حرج' ? alpha('#ef4444', 0.12) : row.severity === 'عالي' ? alpha('#f59e0b', 0.12) : row.severity === 'متوسط' ? alpha('#06b6d4', 0.12) : alpha('#22c55e', 0.12),
                          color: row.severity === 'حرج' ? '#ef4444' : row.severity === 'عالي' ? '#f59e0b' : row.severity === 'متوسط' ? '#06b6d4' : '#22c55e',
                          '& .MuiChip-icon': { color: 'inherit' },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Chip
                        label={row.status} size="small"
                        sx={{
                          height: 22, fontSize: '0.65rem', fontWeight: 700,
                          backgroundColor: row.status === 'نشط' ? alpha('#ef4444', 0.12) : row.status === 'معزول' ? alpha('#f59e0b', 0.12) : row.status === 'متعافي' ? alpha('#22c55e', 0.12) : alpha('#8b5cf6', 0.12),
                          color: row.status === 'نشط' ? '#ef4444' : row.status === 'معزول' ? '#f59e0b' : row.status === 'متعافي' ? '#22c55e' : '#8b5cf6',
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
