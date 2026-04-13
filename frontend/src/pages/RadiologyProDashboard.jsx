/**
 * RadiologyProDashboard — لوحة الأشعة والتصوير الطبي البريميوم
 * Premium Glassmorphism + Framer Motion
 * Gradient: #06b6d4 → #8b5cf6 → #ec4899
 */

import { useTheme,
} from '@mui/material';

import RadiologyIcon from '@mui/icons-material/CoronavirusOutlined';
import ScannerIcon from '@mui/icons-material/Scanner';
import ImageSearchIcon from '@mui/icons-material/ImageSearch';
import AccessTimeIcon from '@mui/icons-material/AccessTime';

// ─── Data ──────────────────────────────────────────────────────────────────────
const kpiData = [
  { title: 'فحوصات اليوم', value: '١٢٤', sub: '+١٥٪ عن الأمس', icon: ScannerIcon, trend: 'up', color: '#06b6d4' },
  { title: 'التقارير الجاهزة', value: '٩٨', sub: '٧٩٪ معدل الإنجاز', icon: ImageSearchIcon, trend: 'up', color: '#8b5cf6' },
  { title: 'متوسط الانتظار', value: '٢٥ د', sub: '-٥ دقائق عن الأمس', icon: AccessTimeIcon, trend: 'down', color: '#22c55e' },
  { title: 'الأجهزة العاملة', value: '١٨/٢٠', sub: '٢ تحت الصيانة', icon: RadiologyIcon, trend: 'up', color: '#ec4899' },
];

const monthlyScans = [
  { month: 'يناير', xray: 420, ct: 180, mri: 95, ultrasound: 310 },
  { month: 'فبراير', xray: 450, ct: 195, mri: 102, ultrasound: 340 },
  { month: 'مارس', xray: 480, ct: 210, mri: 110, ultrasound: 360 },
  { month: 'أبريل', xray: 510, ct: 225, mri: 118, ultrasound: 385 },
  { month: 'مايو', xray: 495, ct: 218, mri: 115, ultrasound: 370 },
  { month: 'يونيو', xray: 530, ct: 240, mri: 124, ultrasound: 395 },
];

const modalityData = [
  { name: 'أشعة سينية', value: 40, color: '#06b6d4' },
  { name: 'التصوير المقطعي', value: 22, color: '#8b5cf6' },
  { name: 'الرنين المغناطيسي', value: 15, color: '#ec4899' },
  { name: 'الموجات فوق الصوتية', value: 18, color: '#f59e0b' },
  { name: 'أخرى', value: 5, color: '#22c55e' },
];

const qualityMetrics = [
  { subject: 'دقة التشخيص', A: 96 },
  { subject: 'سرعة التقرير', A: 82 },
  { subject: 'جودة الصورة', A: 94 },
  { subject: 'رضا المرضى', A: 89 },
  { subject: 'كفاءة الأجهزة', A: 90 },
  { subject: 'السلامة الإشعاعية', A: 97 },
];

const departmentLoad = [
  { dept: 'الطوارئ', scans: 85, color: '#ef4444' },
  { dept: 'العيادات', scans: 65, color: '#06b6d4' },
  { dept: 'التنويم', scans: 55, color: '#8b5cf6' },
  { dept: 'العمليات', scans: 40, color: '#f59e0b' },
  { dept: 'ICU', scans: 30, color: '#ec4899' },
];

const recentExams = [
  { id: 'RAD-4821', patient: 'أحمد محمد', type: 'CT صدر', radiologist: 'د. سارة', status: 'جاهز', priority: 'عادي' },
  { id: 'RAD-4820', patient: 'فاطمة علي', type: 'MRI دماغ', radiologist: 'د. خالد', status: 'قيد القراءة', priority: 'مستعجل' },
  { id: 'RAD-4819', patient: 'عمر حسن', type: 'أشعة سينية يد', radiologist: 'د. سارة', status: 'جاهز', priority: 'عادي' },
  { id: 'RAD-4818', patient: 'نورة سعد', type: 'موجات بطن', radiologist: 'د. ليلى', status: 'جاهز', priority: 'عادي' },
  { id: 'RAD-4817', patient: 'محمد إبراهيم', type: 'CT بطن', radiologist: 'د. خالد', status: 'قيد التصوير', priority: 'طارئ' },
];

const GRADIENT = 'linear-gradient(135deg, #06b6d4 0%, #8b5cf6 50%, #ec4899 100%)';

const glass = (isDark) => ({
  borderRadius: '20px',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
  background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
});

const statusColor = (s) =>
  s === 'جاهز' ? '#22c55e' : s === 'قيد القراءة' ? '#f59e0b' : '#06b6d4';
const priorityColor = (p) =>
  p === 'طارئ' ? '#ef4444' : p === 'مستعجل' ? '#f59e0b' : '#64748B';

export default function RadiologyProDashboard() {
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
            ? 'linear-gradient(135deg, rgba(6,182,212,0.25) 0%, rgba(139,92,246,0.2) 50%, rgba(236,72,153,0.15) 100%)'
            : 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(139,92,246,0.08) 50%, rgba(236,72,153,0.06) 100%)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 52, height: 52, borderRadius: '16px',
              background: GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(6,182,212,0.4)',
            }}>
              <ScannerIcon sx={{ fontSize: 26, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' },
                background: GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                لوحة الأشعة والتصوير الطبي
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: sub }}>
                متابعة الفحوصات والتقارير وأداء الأجهزة
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
                الفحوصات الشهرية حسب النوع
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyScans}>
                  <defs>
                    {[
                      { id: 'radGrad1', color: '#06b6d4' },
                      { id: 'radGrad2', color: '#8b5cf6' },
                      { id: 'radGrad3', color: '#ec4899' },
                      { id: 'radGrad4', color: '#f59e0b' },
                    ].map((g) => (
                      <linearGradient key={g.id} id={g.id} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={g.color} stopOpacity={0.25} />
                        <stop offset="100%" stopColor={g.color} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: sub }} />
                  <YAxis tick={{ fontSize: 11, fill: sub }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Legend />
                  <Area type="monotone" dataKey="xray" name="أشعة سينية" stroke="#06b6d4" fill="url(#radGrad1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="ct" name="مقطعي" stroke="#8b5cf6" fill="url(#radGrad2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="mri" name="رنين" stroke="#ec4899" fill="url(#radGrad3)" strokeWidth={2} />
                  <Area type="monotone" dataKey="ultrasound" name="موجات" stroke="#f59e0b" fill="url(#radGrad4)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card elevation={0} sx={{ ...glass(isDark), p: 2.5, height: '100%' }}>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                توزيع أنواع الفحوصات
              </Typography>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={modalityData} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" paddingAngle={3} stroke="none">
                    {modalityData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
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
                مقاييس الجودة
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={qualityMetrics}>
                  <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: sub }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: sub }} />
                  <Radar name="الأداء" dataKey="A" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card elevation={0} sx={{ ...glass(isDark), p: 2.5, height: '100%' }}>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                حمل الأقسام (فحص/يوم)
              </Typography>
              {departmentLoad.map((d, i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                      {d.dept}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: d.color }}>
                      {d.scans}
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={d.scans}
                    sx={{
                      height: 8, borderRadius: 4,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      '& .MuiLinearProgress-bar': { borderRadius: 4, background: d.color },
                    }}
                  />
                </Box>
              ))}
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Card elevation={0} sx={{ ...glass(isDark), p: 2.5 }}>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                فحوصات حسب القسم
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={departmentLoad} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: sub }} />
                  <YAxis dataKey="dept" type="category" tick={{ fontSize: 11, fill: sub }} width={60} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Bar dataKey="scans" name="فحوصات" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Recent Exams Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <Card elevation={0} sx={{ ...glass(isDark), p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
            آخر الفحوصات
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['رقم الفحص', 'المريض', 'النوع', 'الأخصائي', 'الحالة', 'الأولوية'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: sub, border: 'none' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {recentExams.map((e) => (
                  <TableRow key={e.id} sx={{ '&:hover': { background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } }}>
                    <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: '#06b6d4', border: 'none' }}>{e.id}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: isDark ? '#F1F5F9' : '#0F172A', border: 'none' }}>{e.patient}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: sub, border: 'none' }}>{e.type}</TableCell>
                    <TableCell sx={{ fontSize: '0.78rem', color: isDark ? '#F1F5F9' : '#0F172A', border: 'none' }}>{e.radiologist}</TableCell>
                    <TableCell sx={{ border: 'none' }}>
                      <Chip label={e.status} size="small" sx={{
                        height: 22, fontSize: '0.65rem', fontWeight: 600,
                        backgroundColor: `${statusColor(e.status)}22`, color: statusColor(e.status),
                      }} />
                    </TableCell>
                    <TableCell sx={{ border: 'none' }}>
                      <Chip label={e.priority} size="small" sx={{
                        height: 22, fontSize: '0.65rem', fontWeight: 600,
                        backgroundColor: `${priorityColor(e.priority)}22`, color: priorityColor(e.priority),
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
