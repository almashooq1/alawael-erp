/**
 * WasteManagementProDashboard — لوحة إدارة النفايات الطبية
 * Premium Glassmorphism Dashboard
 * Gradient: #ef4444 → #f59e0b → #22c55e
 */

import { useTheme, alpha,
} from '@mui/material';

import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import RecyclingIcon from '@mui/icons-material/Recycling';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

/* ─── Mock Data ────────────────────────────────────────────────────────────── */
const KPI_DATA = [
  { title: 'إجمالي النفايات', value: '٢,٤٨٧', unit: 'كجم/شهر', change: -8.2, icon: DeleteSweepIcon, color: '#ef4444' },
  { title: 'نسبة إعادة التدوير', value: '٣٤٪', unit: 'من الإجمالي', change: 12.5, icon: RecyclingIcon, color: '#22c55e' },
  { title: 'رحلات النقل', value: '١٤٧', unit: 'رحلة/شهر', change: 3.1, icon: LocalShippingIcon, color: '#f59e0b' },
  { title: 'الامتثال البيئي', value: '٩٦.٨٪', unit: 'نسبة الامتثال', change: 2.4, icon: CheckCircleIcon, color: '#06b6d4' },
];

const monthlyData = [
  { month: 'يناير', hazardous: 420, nonHazardous: 680, recycled: 280 },
  { month: 'فبراير', hazardous: 390, nonHazardous: 640, recycled: 310 },
  { month: 'مارس', hazardous: 450, nonHazardous: 720, recycled: 340 },
  { month: 'أبريل', hazardous: 380, nonHazardous: 600, recycled: 360 },
  { month: 'مايو', hazardous: 410, nonHazardous: 660, recycled: 380 },
  { month: 'يونيو', hazardous: 370, nonHazardous: 580, recycled: 400 },
];

const wasteTypesData = [
  { name: 'نفايات خطرة', value: 35, color: '#ef4444' },
  { name: 'نفايات عادية', value: 30, color: '#f59e0b' },
  { name: 'نفايات حادة', value: 15, color: '#8b5cf6' },
  { name: 'نفايات صيدلانية', value: 12, color: '#06b6d4' },
  { name: 'نفايات قابلة للتدوير', value: 8, color: '#22c55e' },
];

const complianceRadar = [
  { subject: 'الفصل', A: 95 },
  { subject: 'التخزين', A: 88 },
  { subject: 'النقل', A: 92 },
  { subject: 'المعالجة', A: 90 },
  { subject: 'التوثيق', A: 96 },
  { subject: 'التدريب', A: 85 },
];

const deptWasteData = [
  { dept: 'الجراحة', amount: 420 },
  { dept: 'المختبر', amount: 380 },
  { dept: 'الطوارئ', amount: 340 },
  { dept: 'الأشعة', amount: 280 },
  { dept: 'الصيدلية', amount: 220 },
  { dept: 'العيادات', amount: 190 },
];

const storageStatus = [
  { category: 'حاويات خطرة', used: 78, total: 100, color: '#ef4444' },
  { category: 'حاويات عادية', used: 55, total: 100, color: '#f59e0b' },
  { category: 'حاويات حادة', used: 82, total: 100, color: '#8b5cf6' },
  { category: 'حاويات تدوير', used: 40, total: 100, color: '#22c55e' },
];

const recentDisposals = [
  { id: 'D-4872', type: 'نفايات خطرة', dept: 'الجراحة', weight: '٢٤.٥ كجم', method: 'حرق', status: 'مكتمل', date: '٢٠٢٥/٠٤/١٠' },
  { id: 'D-4871', type: 'نفايات حادة', dept: 'المختبر', weight: '١٨.٢ كجم', method: 'تعقيم', status: 'قيد النقل', date: '٢٠٢٥/٠٤/١٠' },
  { id: 'D-4870', type: 'نفايات صيدلانية', dept: 'الصيدلية', weight: '١٢.٨ كجم', method: 'حرق', status: 'مكتمل', date: '٢٠٢٥/٠٤/٠٩' },
  { id: 'D-4869', type: 'نفايات عادية', dept: 'العيادات', weight: '٣٥.٠ كجم', method: 'مكب صحي', status: 'مكتمل', date: '٢٠٢٥/٠٤/٠٩' },
  { id: 'D-4868', type: 'نفايات خطرة', dept: 'الطوارئ', weight: '٢١.٣ كجم', method: 'حرق', status: 'جاري المعالجة', date: '٢٠٢٥/٠٤/٠٩' },
];

/* ─── Glass Card ───────────────────────────────────────────────────────────── */
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
        p: 3,
        ...sx,
      }}
      {...props}
    >
      {children}
    </Card>
  );
};

/* ─── Main Component ───────────────────────────────────────────────────────── */
export default function WasteManagementProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ direction: 'rtl', minHeight: '100vh' }}>
      {/* Hero Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box
          sx={{
            position: 'relative', borderRadius: '28px', overflow: 'hidden', mb: 4,
            p: { xs: 3, md: 4.5 },
            background: isDark
              ? 'linear-gradient(135deg, rgba(239,68,68,0.25) 0%, rgba(245,158,11,0.2) 50%, rgba(34,197,94,0.15) 100%)'
              : 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(245,158,11,0.08) 50%, rgba(34,197,94,0.06) 100%)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.15)'}`,
            backdropFilter: 'blur(20px)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 56, height: 56, borderRadius: '16px',
              background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(239,68,68,0.4)',
            }}>
              <DeleteSweepIcon sx={{ fontSize: 28, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' },
                background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 50%, #22c55e 100%)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                لوحة إدارة النفايات الطبية
              </Typography>
              <Typography sx={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B' }}>
                مراقبة النفايات والتخلص الآمن وإعادة التدوير والامتثال البيئي
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
                  <Chip
                    label={`${kpi.change > 0 ? '+' : ''}${kpi.change}%`}
                    size="small"
                    sx={{
                      mt: 1, height: 22, fontSize: '0.7rem', fontWeight: 700,
                      backgroundColor: kpi.change > 0 ? alpha('#22c55e', 0.1) : alpha('#ef4444', 0.1),
                      color: kpi.change > 0 ? '#22c55e' : '#ef4444',
                    }}
                  />
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
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>حركة النفايات الشهرية</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="wmHazardous" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} /><stop offset="95%" stopColor="#ef4444" stopOpacity={0} /></linearGradient>
                    <linearGradient id="wmNonHazardous" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} /><stop offset="95%" stopColor="#f59e0b" stopOpacity={0} /></linearGradient>
                    <linearGradient id="wmRecycled" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} /><stop offset="95%" stopColor="#22c55e" stopOpacity={0} /></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Legend />
                  <Area type="monotone" dataKey="hazardous" name="خطرة" stroke="#ef4444" fill="url(#wmHazardous)" strokeWidth={2} />
                  <Area type="monotone" dataKey="nonHazardous" name="عادية" stroke="#f59e0b" fill="url(#wmNonHazardous)" strokeWidth={2} />
                  <Area type="monotone" dataKey="recycled" name="مُعاد تدويرها" stroke="#22c55e" fill="url(#wmRecycled)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <GlassCard>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>أنواع النفايات</Typography>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={wasteTypesData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                    {wasteTypesData.map((entry, i) => (<Cell key={i} fill={entry.color} />))}
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
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>مؤشرات الامتثال</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={complianceRadar}>
                  <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <PolarRadiusAxis tick={{ fontSize: 9 }} />
                  <Radar name="الامتثال" dataKey="A" stroke="#ef4444" fill="#ef4444" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}>
            <GlassCard>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>سعة التخزين</Typography>
              {storageStatus.map((s, i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.78rem', color: isDark ? '#CBD5E1' : '#475569' }}>{s.category}</Typography>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: s.color }}>{s.used}%</Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={s.used} sx={{
                    height: 8, borderRadius: 4, backgroundColor: alpha(s.color, 0.12),
                    '& .MuiLinearProgress-bar': { borderRadius: 4, background: `linear-gradient(90deg, ${s.color}, ${alpha(s.color, 0.7)})` },
                  }} />
                </Box>
              ))}
            </GlassCard>
          </motion.div>
        </Grid>
        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <GlassCard>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>النفايات حسب القسم</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={deptWasteData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                  <YAxis dataKey="dept" type="category" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} width={60} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Bar dataKey="amount" name="كجم" fill="#ef4444" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </motion.div>
        </Grid>
      </Grid>

      {/* Recent Disposals Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
        <GlassCard>
          <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>آخر عمليات التخلص</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['رقم العملية', 'نوع النفايات', 'القسم', 'الوزن', 'طريقة التخلص', 'الحالة', 'التاريخ'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {recentDisposals.map((row) => (
                  <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } }}>
                    <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#ef4444', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.id}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#CBD5E1' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.type}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#CBD5E1' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.dept}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#CBD5E1' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.weight}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#CBD5E1' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.method}</TableCell>
                    <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                      <Chip label={row.status} size="small" sx={{
                        height: 22, fontSize: '0.68rem', fontWeight: 600,
                        backgroundColor: row.status === 'مكتمل' ? alpha('#22c55e', 0.1) : row.status === 'قيد النقل' ? alpha('#f59e0b', 0.1) : alpha('#06b6d4', 0.1),
                        color: row.status === 'مكتمل' ? '#22c55e' : row.status === 'قيد النقل' ? '#f59e0b' : '#06b6d4',
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
