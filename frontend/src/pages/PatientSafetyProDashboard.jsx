/**
 * PatientSafetyProDashboard — لوحة سلامة المرضى
 * Premium Glassmorphism Dashboard
 * Gradient: #22c55e → #06b6d4 → #6366f1
 */

import {
  Box, Typography, Grid, Card, useTheme, alpha, LinearProgress, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
} from '@mui/material';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import ShieldIcon from '@mui/icons-material/Shield';

/* ─── Mock Data ────────────────────────────────────────────────────────────── */
const KPI_DATA = [
  { title: 'أيام بدون حوادث', value: '٤٧', unit: 'يوم متتالي', change: 15.2, icon: HealthAndSafetyIcon, color: '#22c55e' },
  { title: 'بلاغات الشهر', value: '١٢', unit: 'بلاغ سلامة', change: -24.5, icon: ReportProblemIcon, color: '#f59e0b' },
  { title: 'نسبة الامتثال', value: '٩٧.٢٪', unit: 'معايير السلامة', change: 3.8, icon: VerifiedUserIcon, color: '#06b6d4' },
  { title: 'معدل السقوط', value: '٠.٨', unit: 'لكل ١٠٠٠ يوم', change: -18.3, icon: TrendingDownIcon, color: '#8b5cf6' },
];

const monthlyData = [
  { month: 'يناير', incidents: 18, nearMiss: 24, resolved: 15 },
  { month: 'فبراير', incidents: 15, nearMiss: 20, resolved: 14 },
  { month: 'مارس', incidents: 12, nearMiss: 18, resolved: 12 },
  { month: 'أبريل', incidents: 10, nearMiss: 15, resolved: 10 },
  { month: 'مايو', incidents: 14, nearMiss: 22, resolved: 13 },
  { month: 'يونيو', incidents: 8, nearMiss: 12, resolved: 8 },
];

const incidentTypesData = [
  { name: 'أخطاء دوائية', value: 28, color: '#ef4444' },
  { name: 'سقوط المرضى', value: 22, color: '#f59e0b' },
  { name: 'عدوى مكتسبة', value: 18, color: '#8b5cf6' },
  { name: 'أخطاء تشخيصية', value: 15, color: '#06b6d4' },
  { name: 'أخطاء جراحية', value: 10, color: '#ec4899' },
  { name: 'أخرى', value: 7, color: '#22c55e' },
];

const safetyRadar = [
  { subject: 'تعريف المريض', A: 98 },
  { subject: 'سلامة الدواء', A: 92 },
  { subject: 'منع العدوى', A: 95 },
  { subject: 'منع السقوط', A: 88 },
  { subject: 'سلامة الجراحة', A: 96 },
  { subject: 'الإبلاغ', A: 90 },
];

const deptIncidentData = [
  { dept: 'الجراحة', incidents: 8 },
  { dept: 'الباطنية', incidents: 6 },
  { dept: 'الطوارئ', incidents: 5 },
  { dept: 'الأطفال', incidents: 4 },
  { dept: 'العناية المركزة', incidents: 3 },
  { dept: 'التوليد', incidents: 2 },
];

const safetyGoals = [
  { goal: 'تعريف المرضى بشكل صحيح', progress: 98, color: '#22c55e' },
  { goal: 'تحسين التواصل الفعال', progress: 92, color: '#06b6d4' },
  { goal: 'تحسين سلامة الأدوية', progress: 88, color: '#f59e0b' },
  { goal: 'ضمان سلامة الجراحة', progress: 95, color: '#8b5cf6' },
];

const recentIncidents = [
  { id: 'PS-3487', type: 'خطأ دوائي', severity: 'متوسط', dept: 'الباطنية', action: 'إجراء تصحيحي', status: 'مُعالج', date: '٢٠٢٥/٠٤/١٠' },
  { id: 'PS-3486', type: 'سقوط مريض', severity: 'بسيط', dept: 'العظام', action: 'تدريب إضافي', status: 'مُعالج', date: '٢٠٢٥/٠٤/٠٩' },
  { id: 'PS-3485', type: 'وشيك الحدوث', severity: 'بسيط', dept: 'الصيدلية', action: 'مراجعة الإجراء', status: 'قيد المتابعة', date: '٢٠٢٥/٠٤/٠٨' },
  { id: 'PS-3484', type: 'عدوى مكتسبة', severity: 'خطير', dept: 'العناية المركزة', action: 'تحقيق جذري', status: 'قيد التحقيق', date: '٢٠٢٥/٠٤/٠٧' },
  { id: 'PS-3483', type: 'خطأ تشخيصي', severity: 'متوسط', dept: 'الأشعة', action: 'مراجعة الحالة', status: 'مُعالج', date: '٢٠٢٥/٠٤/٠٦' },
];

/* ─── Glass Card ───────────────────────────────────────────────────────────── */
const GlassCard = ({ children, sx, ...props }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Card elevation={0} sx={{
      borderRadius: '20px',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
      background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)',
      backdropFilter: 'blur(20px) saturate(180%)', WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
      p: 3, ...sx,
    }} {...props}>{children}</Card>
  );
};

/* ─── Main Component ───────────────────────────────────────────────────────── */
export default function PatientSafetyProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ direction: 'rtl', minHeight: '100vh' }}>
      {/* Hero Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box sx={{
          position: 'relative', borderRadius: '28px', overflow: 'hidden', mb: 4,
          p: { xs: 3, md: 4.5 },
          background: isDark
            ? 'linear-gradient(135deg, rgba(34,197,94,0.25) 0%, rgba(6,182,212,0.2) 50%, rgba(99,102,241,0.15) 100%)'
            : 'linear-gradient(135deg, rgba(34,197,94,0.12) 0%, rgba(6,182,212,0.08) 50%, rgba(99,102,241,0.06) 100%)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(34,197,94,0.15)'}`,
          backdropFilter: 'blur(20px)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: '16px',
              background: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 50%, #6366f1 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(34,197,94,0.4)',
            }}>
              <ShieldIcon sx={{ fontSize: 28, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' },
                background: 'linear-gradient(135deg, #22c55e 0%, #06b6d4 50%, #6366f1 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                لوحة سلامة المرضى
              </Typography>
              <Typography sx={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }}>
                مراقبة الحوادث وأهداف السلامة ومؤشرات الأداء والإجراءات التصحيحية
              </Typography>
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* KPI Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {KPI_DATA.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <GlassCard>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.78rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B', mb: 0.5 }}>{kpi.title}</Typography>
                      <Typography sx={{ fontSize: '1.6rem', fontWeight: 800, color: isDark ? '#F1F5F9' : '#0F172A' }}>{kpi.value}</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: isDark ? 'rgba(255,255,255,0.35)' : '#94A3B8' }}>{kpi.unit}</Typography>
                    </Box>
                    <Box sx={{
                      width: 44, height: 44, borderRadius: '14px',
                      background: `linear-gradient(135deg, ${kpi.color}, ${alpha(kpi.color, 0.7)})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon sx={{ color: '#fff', fontSize: 22 }} />
                    </Box>
                  </Box>
                  <Chip label={`${kpi.change > 0 ? '+' : ''}${kpi.change}%`} size="small" sx={{
                    mt: 1, height: 22, fontSize: '0.7rem', fontWeight: 700,
                    backgroundColor: kpi.change < 0 ? alpha('#22c55e', 0.1) : alpha('#22c55e', 0.1),
                    color: '#22c55e',
                  }} />
                </GlassCard>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <GlassCard>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>اتجاه الحوادث الشهري</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="psIncident" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                    <linearGradient id="psNearMiss" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                    <linearGradient id="psResolved" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Legend />
                  <Area type="monotone" dataKey="incidents" name="حوادث" stroke="#ef4444" fill="url(#psIncident)" strokeWidth={2} />
                  <Area type="monotone" dataKey="nearMiss" name="وشيكة الحدوث" stroke="#f59e0b" fill="url(#psNearMiss)" strokeWidth={2} />
                  <Area type="monotone" dataKey="resolved" name="مُعالجة" stroke="#22c55e" fill="url(#psResolved)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>أنواع الحوادث</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={incidentTypesData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                    {incidentTypesData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
                </PieChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <GlassCard>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>مؤشرات السلامة</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={safetyRadar}>
                  <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} />
                  <Radar name="السلامة" dataKey="A" stroke="#22c55e" fill="#22c55e" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <GlassCard>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>أهداف السلامة الدولية</Typography>
              {safetyGoals.map((g, i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.78rem', color: isDark ? '#CBD5E1' : '#475569' }}>{g.goal}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: g.color }}>{g.progress}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={g.progress} sx={{
                    height: 8, borderRadius: 4, backgroundColor: alpha(g.color, 0.12),
                    '& .MuiLinearProgress-bar': { borderRadius: 4, background: `linear-gradient(90deg, ${g.color}, ${alpha(g.color, 0.7)})` },
                  }} />
                </Box>
              ))}
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <GlassCard>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>الحوادث حسب القسم</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={deptIncidentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <YAxis dataKey="dept" type="category" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} width={80} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Bar dataKey="incidents" name="حادثة" fill="#22c55e" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
      </Grid>

      {/* Recent Incidents Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <GlassCard>
          <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>آخر بلاغات السلامة</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['رقم البلاغ', 'النوع', 'الخطورة', 'القسم', 'الإجراء', 'الحالة', 'التاريخ'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {recentIncidents.map((row) => (
                  <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } }}>
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#22c55e', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.id}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#CBD5E1' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.type}</TableCell>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Chip label={row.severity} size="small" sx={{
                        height: 20, fontSize: '0.65rem', fontWeight: 600,
                        backgroundColor: row.severity === 'خطير' ? alpha('#ef4444', 0.1) : row.severity === 'متوسط' ? alpha('#f59e0b', 0.1) : alpha('#22c55e', 0.1),
                        color: row.severity === 'خطير' ? '#ef4444' : row.severity === 'متوسط' ? '#f59e0b' : '#22c55e',
                      }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#CBD5E1' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.dept}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#CBD5E1' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.action}</TableCell>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Chip label={row.status} size="small" sx={{
                        height: 22, fontSize: '0.68rem', fontWeight: 600,
                        backgroundColor: row.status === 'مُعالج' ? alpha('#22c55e', 0.1) : row.status === 'قيد المتابعة' ? alpha('#f59e0b', 0.1) : alpha('#06b6d4', 0.1),
                        color: row.status === 'مُعالج' ? '#22c55e' : row.status === 'قيد المتابعة' ? '#f59e0b' : '#06b6d4',
                      }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.date}</TableCell>
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
