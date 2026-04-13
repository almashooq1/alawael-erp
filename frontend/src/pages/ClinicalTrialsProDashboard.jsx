/**
 * ClinicalTrialsProDashboard — لوحة الأبحاث السريرية
 * Premium Glassmorphism Dashboard
 * Gradient: #8b5cf6 → #ec4899 → #06b6d4
 */

import { useTheme, alpha,
} from '@mui/material';

import ScienceIcon from '@mui/icons-material/Science';
import GroupsIcon from '@mui/icons-material/Groups';
import DescriptionIcon from '@mui/icons-material/Description';
import VerifiedIcon from '@mui/icons-material/Verified';

/* ─── Mock Data ────────────────────────────────────────────────────────────── */
const KPI_DATA = [
  { title: 'الدراسات النشطة', value: '٢٤', unit: 'دراسة سريرية', change: 8.3, icon: ScienceIcon, color: '#8b5cf6' },
  { title: 'المشاركون', value: '١,٤٨٧', unit: 'مشارك مسجّل', change: 15.2, icon: GroupsIcon, color: '#ec4899' },
  { title: 'المنشورات', value: '١٨', unit: 'ورقة بحثية', change: 22.1, icon: DescriptionIcon, color: '#06b6d4' },
  { title: 'نسبة الإنجاز', value: '٧٢٪', unit: 'من الأهداف', change: 5.4, icon: VerifiedIcon, color: '#22c55e' },
];

const monthlyData = [
  { month: 'يناير', enrollments: 45, completions: 28, publications: 2 },
  { month: 'فبراير', enrollments: 52, completions: 34, publications: 3 },
  { month: 'مارس', enrollments: 68, completions: 42, publications: 2 },
  { month: 'أبريل', enrollments: 74, completions: 48, publications: 4 },
  { month: 'مايو', enrollments: 82, completions: 55, publications: 3 },
  { month: 'يونيو', enrollments: 90, completions: 62, publications: 4 },
];

const trialTypesData = [
  { name: 'المرحلة الثالثة', value: 35, color: '#8b5cf6' },
  { name: 'المرحلة الثانية', value: 28, color: '#ec4899' },
  { name: 'المرحلة الأولى', value: 18, color: '#06b6d4' },
  { name: 'دراسات رصدية', value: 12, color: '#f59e0b' },
  { name: 'ما بعد التسويق', value: 7, color: '#22c55e' },
];

const qualityRadar = [
  { subject: 'الأخلاقيات', A: 98 },
  { subject: 'جمع البيانات', A: 92 },
  { subject: 'المتابعة', A: 88 },
  { subject: 'التوثيق', A: 95 },
  { subject: 'الامتثال', A: 96 },
  { subject: 'الإبلاغ', A: 90 },
];

const deptResearchData = [
  { dept: 'الباطنية', studies: 8 },
  { dept: 'الأورام', studies: 6 },
  { dept: 'القلب', studies: 5 },
  { dept: 'الأعصاب', studies: 4 },
  { dept: 'الأطفال', studies: 3 },
  { dept: 'الجراحة', studies: 2 },
];

const trialProgress = [
  { trial: 'دراسة العلاج الجيني', progress: 85, color: '#8b5cf6' },
  { trial: 'لقاح المرحلة ٣', progress: 72, color: '#ec4899' },
  { trial: 'دواء السكري الجديد', progress: 58, color: '#06b6d4' },
  { trial: 'علاج الأورام المناعي', progress: 45, color: '#22c55e' },
];

const recentTrials = [
  { id: 'CT-2487', title: 'علاج جيني للسرطان', phase: 'المرحلة ٣', participants: '٢٤٨', pi: 'د. أحمد محمد', status: 'نشط', date: '٢٠٢٥/٠٤/١٠' },
  { id: 'CT-2486', title: 'لقاح فيروسي جديد', phase: 'المرحلة ٢', participants: '١٨٧', pi: 'د. سارة علي', status: 'تجنيد', date: '٢٠٢٥/٠٤/٠٩' },
  { id: 'CT-2485', title: 'دواء لعلاج السكري', phase: 'المرحلة ٣', participants: '٣٤٢', pi: 'د. عمر حسن', status: 'نشط', date: '٢٠٢٥/٠٤/٠٨' },
  { id: 'CT-2484', title: 'علاج مناعي للأورام', phase: 'المرحلة ١', participants: '٨٧', pi: 'د. نورة أحمد', status: 'مراجعة', date: '٢٠٢٥/٠٤/٠٧' },
  { id: 'CT-2483', title: 'مضاد حيوي متقدم', phase: 'المرحلة ٢', participants: '١٤٢', pi: 'د. خالد سعد', status: 'مكتمل', date: '٢٠٢٥/٠٤/٠٦' },
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
export default function ClinicalTrialsProDashboard() {
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
            ? 'linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(236,72,153,0.2) 50%, rgba(6,182,212,0.15) 100%)'
            : 'linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(236,72,153,0.08) 50%, rgba(6,182,212,0.06) 100%)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(139,92,246,0.15)'}`,
          backdropFilter: 'blur(20px)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: '16px',
              background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #06b6d4 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(139,92,246,0.4)',
            }}>
              <ScienceIcon sx={{ fontSize: 28, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' },
                background: 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #06b6d4 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                لوحة الأبحاث السريرية
              </Typography>
              <Typography sx={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }}>
                إدارة التجارب السريرية والمشاركين والمنشورات العلمية
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
                    backgroundColor: alpha('#22c55e', 0.1), color: '#22c55e',
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
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>حركة الأبحاث الشهرية</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="ctEnroll" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} /><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /></linearGradient>
                    <linearGradient id="ctComplete" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} /><stop offset="95%" stopColor="#ec4899" stopOpacity={0} /></linearGradient>
                    <linearGradient id="ctPub" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} /><stop offset="95%" stopColor="#06b6d4" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Legend />
                  <Area type="monotone" dataKey="enrollments" name="تسجيلات" stroke="#8b5cf6" fill="url(#ctEnroll)" strokeWidth={2} />
                  <Area type="monotone" dataKey="completions" name="إنجازات" stroke="#ec4899" fill="url(#ctComplete)" strokeWidth={2} />
                  <Area type="monotone" dataKey="publications" name="منشورات" stroke="#06b6d4" fill="url(#ctPub)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>مراحل الدراسات</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={trialTypesData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                    {trialTypesData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
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
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>معايير الجودة البحثية</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={qualityRadar}>
                  <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} />
                  <Radar name="الجودة" dataKey="A" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <GlassCard>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>تقدم الدراسات الرئيسية</Typography>
              {trialProgress.map((t, i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.78rem', color: isDark ? '#CBD5E1' : '#475569' }}>{t.trial}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: t.color }}>{t.progress}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={t.progress} sx={{
                    height: 8, borderRadius: 4, backgroundColor: alpha(t.color, 0.12),
                    '& .MuiLinearProgress-bar': { borderRadius: 4, background: `linear-gradient(90deg, ${t.color}, ${alpha(t.color, 0.7)})` },
                  }} />
                </Box>
              ))}
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <GlassCard>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>الأبحاث حسب القسم</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={deptResearchData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <YAxis dataKey="dept" type="category" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} width={60} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Bar dataKey="studies" name="دراسة" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
      </Grid>

      {/* Recent Trials Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <GlassCard>
          <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>آخر التجارب السريرية</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['رقم الدراسة', 'العنوان', 'المرحلة', 'المشاركون', 'الباحث الرئيسي', 'الحالة', 'التاريخ'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {recentTrials.map((row) => (
                  <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } }}>
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#8b5cf6', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.id}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#CBD5E1' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.title}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#CBD5E1' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.phase}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 700, color: '#ec4899', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.participants}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#CBD5E1' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.pi}</TableCell>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Chip label={row.status} size="small" sx={{
                        height: 22, fontSize: '0.68rem', fontWeight: 600,
                        backgroundColor: row.status === 'نشط' ? alpha('#22c55e', 0.1) : row.status === 'تجنيد' ? alpha('#06b6d4', 0.1) : row.status === 'مكتمل' ? alpha('#8b5cf6', 0.1) : alpha('#f59e0b', 0.1),
                        color: row.status === 'نشط' ? '#22c55e' : row.status === 'تجنيد' ? '#06b6d4' : row.status === 'مكتمل' ? '#8b5cf6' : '#f59e0b',
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
