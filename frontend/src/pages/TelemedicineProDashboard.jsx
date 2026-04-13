/**
 * TelemedicineProDashboard — لوحة الطب عن بُعد
 * Premium Glassmorphism Dashboard
 * Gradient: #6366f1 → #06b6d4 → #22c55e
 */

import { useTheme, alpha,
} from '@mui/material';

import VideocamIcon from '@mui/icons-material/Videocam';
import PeopleIcon from '@mui/icons-material/People';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import StarIcon from '@mui/icons-material/Star';

/* ─── Mock Data ────────────────────────────────────────────────────────────── */
const KPI_DATA = [
  { title: 'جلسات الشهر', value: '١,٢٤٨', unit: 'جلسة عن بُعد', change: 24.5, icon: VideocamIcon, color: '#6366f1' },
  { title: 'المرضى النشطون', value: '٨٤٧', unit: 'مريض مُسجّل', change: 18.2, icon: PeopleIcon, color: '#06b6d4' },
  { title: 'متوسط المدة', value: '٢٢ د', unit: 'لكل جلسة', change: -5.3, icon: AccessTimeIcon, color: '#f59e0b' },
  { title: 'رضا المرضى', value: '٤.٧', unit: 'من ٥', change: 3.8, icon: StarIcon, color: '#22c55e' },
];

const monthlyData = [
  { month: 'يناير', video: 180, audio: 120, chat: 80 },
  { month: 'فبراير', video: 220, audio: 140, chat: 95 },
  { month: 'مارس', video: 260, audio: 160, chat: 110 },
  { month: 'أبريل', video: 300, audio: 180, chat: 130 },
  { month: 'مايو', video: 340, audio: 200, chat: 145 },
  { month: 'يونيو', video: 380, audio: 210, chat: 160 },
];

const consultTypesData = [
  { name: 'استشارة فيديو', value: 45, color: '#6366f1' },
  { name: 'استشارة صوتية', value: 25, color: '#06b6d4' },
  { name: 'دردشة طبية', value: 15, color: '#22c55e' },
  { name: 'متابعة دورية', value: 10, color: '#f59e0b' },
  { name: 'طوارئ عن بُعد', value: 5, color: '#ef4444' },
];

const qualityRadar = [
  { subject: 'جودة الصوت', A: 92 },
  { subject: 'جودة الفيديو', A: 88 },
  { subject: 'سرعة الاتصال', A: 95 },
  { subject: 'رضا الطبيب', A: 90 },
  { subject: 'رضا المريض', A: 94 },
  { subject: 'الأمان', A: 97 },
];

const specialtyData = [
  { specialty: 'الباطنية', sessions: 280 },
  { specialty: 'الأطفال', sessions: 220 },
  { specialty: 'الجلدية', sessions: 190 },
  { specialty: 'النفسية', sessions: 170 },
  { specialty: 'العظام', sessions: 140 },
  { specialty: 'العيون', sessions: 110 },
];

const platformUsage = [
  { platform: 'تطبيق الجوال', usage: 62, color: '#6366f1' },
  { platform: 'متصفح الويب', usage: 28, color: '#06b6d4' },
  { platform: 'تطبيق سطح المكتب', usage: 8, color: '#22c55e' },
  { platform: 'أجهزة لوحية', usage: 2, color: '#f59e0b' },
];

const recentSessions = [
  { id: 'TM-8472', patient: 'أحمد محمد', doctor: 'د. سارة علي', type: 'فيديو', duration: '٢٥ د', rating: '٤.٨', status: 'مكتمل', date: '٢٠٢٥/٠٤/١٠' },
  { id: 'TM-8471', patient: 'فاطمة خالد', doctor: 'د. عمر حسن', type: 'صوتي', duration: '١٨ د', rating: '٤.٥', status: 'مكتمل', date: '٢٠٢٥/٠٤/١٠' },
  { id: 'TM-8470', patient: 'خالد سعد', doctor: 'د. نورة أحمد', type: 'فيديو', duration: '٣٠ د', rating: '٤.٩', status: 'جارية', date: '٢٠٢٥/٠٤/١٠' },
  { id: 'TM-8469', patient: 'مريم عبدالله', doctor: 'د. يوسف عمر', type: 'دردشة', duration: '١٢ د', rating: '٤.٣', status: 'مكتمل', date: '٢٠٢٥/٠٤/٠٩' },
  { id: 'TM-8468', patient: 'عبدالرحمن علي', doctor: 'د. هند محمد', type: 'فيديو', duration: '٢٢ د', rating: '٤.٧', status: 'ملغاة', date: '٢٠٢٥/٠٤/٠٩' },
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
export default function TelemedicineProDashboard() {
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
            ? 'linear-gradient(135deg, rgba(99,102,241,0.25) 0%, rgba(6,182,212,0.2) 50%, rgba(34,197,94,0.15) 100%)'
            : 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(6,182,212,0.08) 50%, rgba(34,197,94,0.06) 100%)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(99,102,241,0.15)'}`,
          backdropFilter: 'blur(20px)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: '16px',
              background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 50%, #22c55e 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(99,102,241,0.4)',
            }}>
              <VideocamIcon sx={{ fontSize: 28, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' },
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 50%, #22c55e 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                لوحة الطب عن بُعد
              </Typography>
              <Typography sx={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }}>
                إدارة الاستشارات الافتراضية والجلسات عن بُعد ومتابعة الجودة
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
                    backgroundColor: kpi.change > 0 ? alpha('#22c55e', 0.1) : alpha('#ef4444', 0.1),
                    color: kpi.change > 0 ? '#22c55e' : '#ef4444',
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
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>الجلسات الشهرية حسب النوع</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="tmVideo" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0} /></linearGradient>
                    <linearGradient id="tmAudio" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} /><stop offset="95%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient>
                    <linearGradient id="tmChat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Legend />
                  <Area type="monotone" dataKey="video" name="فيديو" stroke="#6366f1" fill="url(#tmVideo)" strokeWidth={2} />
                  <Area type="monotone" dataKey="audio" name="صوتي" stroke="#06b6d4" fill="url(#tmAudio)" strokeWidth={2} />
                  <Area type="monotone" dataKey="chat" name="دردشة" stroke="#22c55e" fill="url(#tmChat)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>أنواع الاستشارات</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={consultTypesData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                    {consultTypesData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
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
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>مؤشرات الجودة</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={qualityRadar}>
                  <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} />
                  <Radar name="الجودة" dataKey="A" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <GlassCard>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>استخدام المنصات</Typography>
              {platformUsage.map((p, i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.78rem', color: isDark ? '#CBD5E1' : '#475569' }}>{p.platform}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: p.color }}>{p.usage}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={p.usage} sx={{
                    height: 8, borderRadius: 4, backgroundColor: alpha(p.color, 0.12),
                    '& .MuiLinearProgress-bar': { borderRadius: 4, background: `linear-gradient(90deg, ${p.color}, ${alpha(p.color, 0.7)})` },
                  }} />
                </Box>
              ))}
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <GlassCard>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>الجلسات حسب التخصص</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={specialtyData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <YAxis dataKey="specialty" type="category" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} width={60} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Bar dataKey="sessions" name="جلسة" fill="#6366f1" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
      </Grid>

      {/* Recent Sessions Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <GlassCard>
          <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>آخر الجلسات عن بُعد</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['رقم الجلسة', 'المريض', 'الطبيب', 'النوع', 'المدة', 'التقييم', 'الحالة', 'التاريخ'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {recentSessions.map((row) => (
                  <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } }}>
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#6366f1', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.id}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#CBD5E1' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.patient}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#CBD5E1' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.doctor}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#CBD5E1' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.type}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#CBD5E1' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.duration}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>⭐ {row.rating}</TableCell>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Chip label={row.status} size="small" sx={{
                        height: 22, fontSize: '0.68rem', fontWeight: 600,
                        backgroundColor: row.status === 'مكتمل' ? alpha('#22c55e', 0.1) : row.status === 'جارية' ? alpha('#06b6d4', 0.1) : alpha('#ef4444', 0.1),
                        color: row.status === 'مكتمل' ? '#22c55e' : row.status === 'جارية' ? '#06b6d4' : '#ef4444',
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
