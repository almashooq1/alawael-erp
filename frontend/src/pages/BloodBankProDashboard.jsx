/**
 * BloodBankProDashboard — لوحة بنك الدم البريميوم
 * Premium Glassmorphism Dashboard for Blood Bank Management
 *
 * Gradient: #ef4444 → #dc2626 → #8b5cf6
 */

import { useTheme, alpha,
} from '@mui/material';

import BloodtypeIcon from '@mui/icons-material/Bloodtype';
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism';
import ScienceIcon from '@mui/icons-material/Science';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';

// ─── Fake Data ──────────────────────────────────────────────────────────────
const KPI_DATA = [
  { title: 'وحدات الدم المتاحة', value: '٨٤٧', change: '+١٢', icon: BloodtypeIcon, color: '#ef4444' },
  { title: 'متبرع هذا الشهر', value: '١٢٤', change: '+١٨', icon: VolunteerActivismIcon, color: '#dc2626' },
  { title: 'تحليل مكتمل', value: '٣٤٢', change: '+٢٧', icon: ScienceIcon, color: '#8b5cf6' },
  { title: 'طلب نقل دم', value: '٥٦', change: '+٨', icon: LocalHospitalIcon, color: '#f59e0b' },
];

const monthlyData = [
  { month: 'يناير', donations: 95, transfusions: 72, expired: 5 },
  { month: 'فبراير', donations: 108, transfusions: 84, expired: 3 },
  { month: 'مارس', donations: 112, transfusions: 91, expired: 4 },
  { month: 'أبريل', donations: 98, transfusions: 78, expired: 6 },
  { month: 'مايو', donations: 124, transfusions: 95, expired: 2 },
  { month: 'يونيو', donations: 131, transfusions: 102, expired: 3 },
];

const bloodTypeData = [
  { name: 'O+', value: 280, color: '#ef4444' },
  { name: 'A+', value: 220, color: '#dc2626' },
  { name: 'B+', value: 160, color: '#8b5cf6' },
  { name: 'AB+', value: 80, color: '#f59e0b' },
  { name: 'O-', value: 45, color: '#06b6d4' },
  { name: 'A-', value: 35, color: '#10b981' },
  { name: 'B-', value: 18, color: '#ec4899' },
  { name: 'AB-', value: 9, color: '#64748b' },
];

const qualityRadar = [
  { metric: 'سلامة الدم', value: 98 },
  { metric: 'دقة الفصيلة', value: 99 },
  { metric: 'التخزين', value: 94 },
  { metric: 'النقل', value: 91 },
  { metric: 'التوثيق', value: 96 },
  { metric: 'الامتثال', value: 95 },
];

const storageStatus = [
  { type: 'كريات حمراء', count: 420, capacity: 500, color: '#ef4444' },
  { type: 'بلازما', count: 180, capacity: 250, color: '#f59e0b' },
  { type: 'صفائح دموية', count: 85, capacity: 120, color: '#8b5cf6' },
  { type: 'دم كامل', count: 162, capacity: 200, color: '#dc2626' },
];

const deptDemand = [
  { dept: 'العمليات', demand: 45 },
  { dept: 'الطوارئ', demand: 38 },
  { dept: 'الباطنة', demand: 22 },
  { dept: 'الأورام', demand: 18 },
  { dept: 'النساء', demand: 12 },
];

const recentTransfusions = [
  { id: 'TR-001', patient: 'أحمد محمد', bloodType: 'O+', units: 2, status: 'مكتمل', time: '٠٩:٣٠' },
  { id: 'TR-002', patient: 'فاطمة علي', bloodType: 'A+', units: 1, status: 'جاري', time: '١٠:١٥' },
  { id: 'TR-003', patient: 'خالد سعد', bloodType: 'B+', units: 3, status: 'مكتمل', time: '١١:٠٠' },
  { id: 'TR-004', patient: 'نورة عبدالله', bloodType: 'AB+', units: 1, status: 'معلق', time: '١١:٤٥' },
  { id: 'TR-005', patient: 'سعد إبراهيم', bloodType: 'O-', units: 2, status: 'جاري', time: '١٢:٣٠' },
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
          p: 2.5,
          height: '100%',
          ...sx,
        }}
      >
        {children}
      </Card>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function BloodBankProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const GRADIENT = 'linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #8b5cf6 100%)';

  return (
    <Box sx={{ direction: 'rtl', minHeight: '100vh', p: { xs: 2, md: 3 } }}>
      {/* ── Hero Header ────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box sx={{
          borderRadius: '24px', overflow: 'hidden', mb: 3, p: { xs: 3, md: 4 },
          background: isDark
            ? 'linear-gradient(135deg, rgba(239,68,68,0.2) 0%, rgba(220,38,38,0.15) 50%, rgba(139,92,246,0.1) 100%)'
            : 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(220,38,38,0.07) 50%, rgba(139,92,246,0.05) 100%)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(239,68,68,0.15)'}`,
          backdropFilter: 'blur(20px)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: '14px',
              background: GRADIENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(239,68,68,0.4)',
            }}>
              <BloodtypeIcon sx={{ fontSize: 26, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.7rem' },
                background: GRADIENT, WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                لوحة بنك الدم
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }}>
                إدارة التبرعات والمخزون ونقل الدم والتحاليل
              </Typography>
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── KPI Cards ──────────────────────────────────────────────── */}
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

      {/* ── Charts Row 1 ──────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Monthly Donations/Transfusions */}
        <Grid item xs={12} md={8}>
          <GlassCard delay={0.3}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              التبرعات والنقل الشهري
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="bbDon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="bbTrans" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
                <Legend />
                <Area type="monotone" dataKey="donations" name="تبرعات" stroke="#ef4444" fill="url(#bbDon)" strokeWidth={2} />
                <Area type="monotone" dataKey="transfusions" name="نقل دم" stroke="#8b5cf6" fill="url(#bbTrans)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>

        {/* Blood Types Pie */}
        <Grid item xs={12} md={4}>
          <GlassCard delay={0.4}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              فصائل الدم المتاحة
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={bloodTypeData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {bloodTypeData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Charts Row 2 ──────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {/* Quality Radar */}
        <Grid item xs={12} md={4}>
          <GlassCard delay={0.5}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              مؤشرات الجودة
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={qualityRadar}>
                <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} />
                <Radar name="الجودة" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>

        {/* Storage Status */}
        <Grid item xs={12} md={4}>
          <GlassCard delay={0.6}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              حالة التخزين
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {storageStatus.map((s, i) => (
                <Box key={i}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>
                      {s.type}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }}>
                      {s.count}/{s.capacity}
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={(s.count / s.capacity) * 100}
                    sx={{
                      height: 8, borderRadius: 4,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      '& .MuiLinearProgress-bar': { borderRadius: 4, background: `linear-gradient(90deg, ${s.color}, ${s.color}CC)` },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </GlassCard>
        </Grid>

        {/* Department Demand */}
        <Grid item xs={12} md={4}>
          <GlassCard delay={0.7}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              الطلب حسب القسم
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={deptDemand} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis type="number" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} width={60} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                <Bar dataKey="demand" name="طلبات" fill="#ef4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Recent Transfusions Table ─────────────────────────────── */}
      <GlassCard delay={0.8}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
          آخر عمليات نقل الدم
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['رقم العملية', 'المريض', 'فصيلة الدم', 'الوحدات', 'الحالة', 'الوقت'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.78rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {recentTransfusions.map((row) => (
                <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#ef4444', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.id}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#E2E8F0' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.patient}</TableCell>
                  <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <Chip label={row.bloodType} size="small" sx={{ height: 22, fontSize: '0.72rem', fontWeight: 700, backgroundColor: alpha('#ef4444', 0.12), color: '#ef4444' }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', fontWeight: 700, color: isDark ? '#E2E8F0' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.units}</TableCell>
                  <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <Chip label={row.status} size="small" sx={{
                      height: 22, fontSize: '0.7rem', fontWeight: 600,
                      backgroundColor: row.status === 'مكتمل' ? alpha('#10b981', 0.12) : row.status === 'جاري' ? alpha('#f59e0b', 0.12) : alpha('#64748b', 0.12),
                      color: row.status === 'مكتمل' ? '#10b981' : row.status === 'جاري' ? '#f59e0b' : '#64748b',
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
