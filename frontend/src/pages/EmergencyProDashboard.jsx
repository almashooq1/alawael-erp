/**
 * EmergencyProDashboard — لوحة الطوارئ والإسعاف البريميوم
 * Premium Glassmorphism + Framer Motion
 * Gradient: #ef4444 → #f59e0b → #06b6d4
 */

import { useTheme,
} from '@mui/material';

import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import AirportShuttleIcon from '@mui/icons-material/AirportShuttle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PeopleIcon from '@mui/icons-material/People';

// ─── Data ──────────────────────────────────────────────────────────────────────
const kpiData = [
  { title: 'حالات اليوم', value: '٨٧', sub: '+١٢ عن الأمس', icon: LocalHospitalIcon, trend: 'up', color: '#ef4444' },
  { title: 'الإسعاف النشط', value: '٦', sub: '٣ في الطريق', icon: AirportShuttleIcon, trend: 'up', color: '#f59e0b' },
  { title: 'متوسط الانتظار', value: '١٨ د', sub: '-٤ دقائق', icon: AccessTimeIcon, trend: 'down', color: '#22c55e' },
  { title: 'الطاقم المتاح', value: '٢٤', sub: 'من أصل ٣٠', icon: PeopleIcon, trend: 'up', color: '#06b6d4' },
];

const hourlyData = [
  { hour: '٦ص', cases: 8, critical: 2 },
  { hour: '٨ص', cases: 15, critical: 4 },
  { hour: '١٠ص', cases: 22, critical: 5 },
  { hour: '١٢م', cases: 18, critical: 3 },
  { hour: '٢م', cases: 25, critical: 6 },
  { hour: '٤م', cases: 20, critical: 4 },
  { hour: '٦م', cases: 28, critical: 7 },
  { hour: '٨م', cases: 24, critical: 5 },
  { hour: '١٠م', cases: 16, critical: 3 },
  { hour: '١٢ص', cases: 10, critical: 2 },
];

const triageData = [
  { name: 'أحمر - حرج', value: 15, color: '#ef4444' },
  { name: 'برتقالي - عاجل', value: 25, color: '#f59e0b' },
  { name: 'أصفر - متوسط', value: 30, color: '#eab308' },
  { name: 'أخضر - بسيط', value: 25, color: '#22c55e' },
  { name: 'أزرق - غير طارئ', value: 5, color: '#06b6d4' },
];

const performanceMetrics = [
  { subject: 'وقت الاستجابة', A: 88 },
  { subject: 'دقة التصنيف', A: 94 },
  { subject: 'رضا المرضى', A: 82 },
  { subject: 'كفاءة الطاقم', A: 90 },
  { subject: 'معدل التحويل', A: 76 },
  { subject: 'التوثيق', A: 85 },
];

const bedOccupancy = [
  { area: 'العناية المركزة', occupied: 8, total: 10, color: '#ef4444' },
  { area: 'غرف الطوارئ', occupied: 12, total: 15, color: '#f59e0b' },
  { area: 'الملاحظة', occupied: 6, total: 8, color: '#06b6d4' },
  { area: 'غرف الإنعاش', occupied: 2, total: 3, color: '#8b5cf6' },
  { area: 'غرف العزل', occupied: 3, total: 5, color: '#ec4899' },
];

const activeCases = [
  { id: 'ER-0087', patient: 'خالد أحمد', age: '٤٥', triage: 'أحمر', complaint: 'ألم صدري حاد', doctor: 'د. محمد', time: '١٠ د', status: 'قيد العلاج' },
  { id: 'ER-0086', patient: 'سارة عبدالله', age: '٣٢', triage: 'برتقالي', complaint: 'صعوبة تنفس', doctor: 'د. فاطمة', time: '٢٥ د', status: 'قيد الفحص' },
  { id: 'ER-0085', patient: 'عمر محمد', age: '٢٨', triage: 'أصفر', complaint: 'كسر ذراع', doctor: 'د. أحمد', time: '٤٠ د', status: 'بانتظار الأشعة' },
  { id: 'ER-0084', patient: 'نورة فهد', age: '٦٠', triage: 'أحمر', complaint: 'سكتة دماغية', doctor: 'د. خالد', time: '٥ د', status: 'إنعاش' },
  { id: 'ER-0083', patient: 'يوسف علي', age: '١٢', triage: 'أخضر', complaint: 'حمى وسعال', doctor: 'د. ليلى', time: '٥٥ د', status: 'بانتظار النتائج' },
];

const GRADIENT = 'linear-gradient(135deg, #ef4444 0%, #f59e0b 50%, #06b6d4 100%)';

const glass = (isDark) => ({
  borderRadius: '20px',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
  background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
});

const triageColor = (t) =>
  t === 'أحمر' ? '#ef4444' : t === 'برتقالي' ? '#f59e0b' : t === 'أصفر' ? '#eab308' : t === 'أخضر' ? '#22c55e' : '#06b6d4';

export default function EmergencyProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const sub = isDark ? 'rgba(255,255,255,0.45)' : '#64748B';

  return (
    <Box sx={{ direction: 'rtl', minHeight: '100vh' }}>
      {/* Hero */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box sx={{
          ...glass(isDark), mb: 3, p: { xs: 2.5, md: 4 }, overflow: 'hidden',
          background: isDark
            ? 'linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(245,158,11,0.2) 50%, rgba(6,182,212,0.15) 100%)'
            : 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(245,158,11,0.08) 50%, rgba(6,182,212,0.06) 100%)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 52, height: 52, borderRadius: '16px',
              background: GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(239,68,68,0.4)',
            }}>
              <LocalHospitalIcon sx={{ fontSize: 26, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' },
                background: GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                لوحة الطوارئ والإسعاف
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: sub }}>
                متابعة حية للحالات الطارئة والإسعاف والأسرّة
              </Typography>
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* KPIs */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        {kpiData.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <Card elevation={0} sx={{ ...glass(isDark), p: 2.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.78rem', color: sub, mb: 0.5 }}>{kpi.title}</Typography>
                      <Typography sx={{ fontWeight: 800, fontSize: '1.5rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>
                        {kpi.value}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        {kpi.trend === 'up'
                          ? <TrendingUpIcon sx={{ fontSize: 14, color: '#22c55e' }} />
                          : <TrendingDownIcon sx={{ fontSize: 14, color: '#22c55e' }} />}
                        <Typography sx={{ fontSize: '0.7rem', color: '#22c55e' }}>{kpi.sub}</Typography>
                      </Box>
                    </Box>
                    <Box sx={{
                      width: 44, height: 44, borderRadius: '14px',
                      background: `${kpi.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon sx={{ fontSize: 22, color: kpi.color }} />
                    </Box>
                  </Box>
                </Card>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card elevation={0} sx={{ ...glass(isDark), p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                الحالات بالساعة (اليوم)
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={hourlyData}>
                  <defs>
                    <linearGradient id="emGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="emGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="hour" tick={{ fontSize: 11, fill: sub }} />
                  <YAxis tick={{ fontSize: 11, fill: sub }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Legend />
                  <Area type="monotone" dataKey="cases" name="إجمالي الحالات" stroke="#ef4444" fill="url(#emGrad1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="critical" name="حالات حرجة" stroke="#f59e0b" fill="url(#emGrad2)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card elevation={0} sx={{ ...glass(isDark), p: 2.5, height: '100%' }}>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                تصنيف الفرز (Triage)
              </Typography>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={triageData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" paddingAngle={3} stroke="none">
                    {triageData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card elevation={0} sx={{ ...glass(isDark), p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                مقاييس الأداء
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={performanceMetrics}>
                  <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: sub }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: sub }} />
                  <Radar name="الأداء" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={8}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card elevation={0} sx={{ ...glass(isDark), p: 2.5, height: '100%' }}>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                إشغال الأسرّة
              </Typography>
              {bedOccupancy.map((b, i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                      {b.area}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: b.color }}>
                      {b.occupied}/{b.total}
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={(b.occupied / b.total) * 100}
                    sx={{
                      height: 10, borderRadius: 5,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      '& .MuiLinearProgress-bar': { borderRadius: 5, background: b.color },
                    }}
                  />
                </Box>
              ))}
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Active Cases Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <Card elevation={0} sx={{ ...glass(isDark), p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
            الحالات النشطة
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['رقم الحالة', 'المريض', 'العمر', 'الفرز', 'الشكوى', 'الطبيب', 'الوقت', 'الحالة'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: sub, border: 'none' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {activeCases.map((c) => (
                  <TableRow key={c.id} sx={{ '&:hover': { background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } }}>
                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#ef4444', border: 'none' }}>{c.id}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#F1F5F9' : '#0F172A', border: 'none' }}>{c.patient}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: sub, border: 'none' }}>{c.age}</TableCell>
                    <TableCell sx={{ border: 'none' }}>
                      <Chip label={c.triage} size="small" sx={{
                        height: 22, fontSize: '0.62rem', fontWeight: 600,
                        backgroundColor: `${triageColor(c.triage)}22`, color: triageColor(c.triage),
                      }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#F1F5F9' : '#0F172A', border: 'none' }}>{c.complaint}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: sub, border: 'none' }}>{c.doctor}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#f59e0b', border: 'none' }}>{c.time}</TableCell>
                    <TableCell sx={{ border: 'none' }}>
                      <Chip label={c.status} size="small" sx={{
                        height: 22, fontSize: '0.62rem', fontWeight: 600,
                        backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
                        color: isDark ? '#F1F5F9' : '#334155',
                      }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </motion.div>
    </Box>
  );
}
