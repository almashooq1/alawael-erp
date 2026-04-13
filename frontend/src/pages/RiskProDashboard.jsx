/**
 * RiskProDashboard — لوحة إدارة المخاطر البريميوم
 * Premium Glassmorphism + Framer Motion
 * Gradient: #f59e0b → #ef4444 → #8b5cf6
 */

import { useTheme,
} from '@mui/material';

import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ShieldIcon from '@mui/icons-material/Shield';
import GppBadIcon from '@mui/icons-material/GppBad';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

// ─── Data ──────────────────────────────────────────────────────────────────────
const kpiData = [
  { title: 'المخاطر النشطة', value: '٣٤', sub: '+٣ هذا الأسبوع', icon: WarningAmberIcon, trend: 'up', color: '#f59e0b' },
  { title: 'مخاطر حرجة', value: '٧', sub: '-٢ عن الشهر السابق', icon: GppBadIcon, trend: 'down', color: '#ef4444' },
  { title: 'الإجراءات التصحيحية', value: '٤٨', sub: '٨٢٪ مكتملة', icon: ShieldIcon, trend: 'up', color: '#8b5cf6' },
  { title: 'مؤشر المخاطر', value: '٧٢٪', sub: 'ضمن الحد المقبول', icon: VerifiedUserIcon, trend: 'up', color: '#22c55e' },
];

const monthlyRisks = [
  { month: 'يناير', identified: 12, mitigated: 8, residual: 4 },
  { month: 'فبراير', identified: 15, mitigated: 11, residual: 4 },
  { month: 'مارس', identified: 10, mitigated: 9, residual: 3 },
  { month: 'أبريل', identified: 18, mitigated: 14, residual: 5 },
  { month: 'مايو', identified: 14, mitigated: 12, residual: 4 },
  { month: 'يونيو', identified: 16, mitigated: 13, residual: 5 },
];

const riskCategories = [
  { name: 'تشغيلية', value: 30, color: '#f59e0b' },
  { name: 'مالية', value: 20, color: '#ef4444' },
  { name: 'تقنية', value: 18, color: '#8b5cf6' },
  { name: 'تنظيمية', value: 15, color: '#06b6d4' },
  { name: 'سمعة', value: 10, color: '#ec4899' },
  { name: 'أخرى', value: 7, color: '#22c55e' },
];

const riskAssessment = [
  { subject: 'الاحتمالية', A: 65 },
  { subject: 'التأثير', A: 78 },
  { subject: 'الاستعداد', A: 85 },
  { subject: 'الاستجابة', A: 72 },
  { subject: 'المراقبة', A: 88 },
  { subject: 'التوثيق', A: 90 },
];

const riskLevels = [
  { level: 'حرج', count: 7, color: '#ef4444' },
  { level: 'مرتفع', count: 12, color: '#f59e0b' },
  { level: 'متوسط', count: 18, color: '#eab308' },
  { level: 'منخفض', count: 24, color: '#22c55e' },
  { level: 'ضئيل', count: 8, color: '#06b6d4' },
];

const departmentRisks = [
  { dept: 'العمليات', risks: 8, color: '#ef4444' },
  { dept: 'المالية', risks: 6, color: '#f59e0b' },
  { dept: 'تقنية المعلومات', risks: 7, color: '#8b5cf6' },
  { dept: 'الموارد البشرية', risks: 4, color: '#06b6d4' },
  { dept: 'الجودة', risks: 5, color: '#22c55e' },
  { dept: 'المشتريات', risks: 4, color: '#ec4899' },
];

const riskRegister = [
  { id: 'RSK-034', title: 'تعطل نظام المعلومات الصحي', category: 'تقنية', level: 'حرج', owner: 'م. سامي', status: 'قيد المعالجة', dueDate: '٢٠٢٤/٠٤/١٥' },
  { id: 'RSK-033', title: 'نقص الكوادر التمريضية', category: 'تشغيلية', level: 'مرتفع', owner: 'أ. نورة', status: 'مفتوح', dueDate: '٢٠٢٤/٠٤/٢٠' },
  { id: 'RSK-032', title: 'تأخر توريد الأدوية', category: 'تشغيلية', level: 'مرتفع', owner: 'د. فهد', status: 'قيد المعالجة', dueDate: '٢٠٢٤/٠٤/١٠' },
  { id: 'RSK-031', title: 'عدم الامتثال لمعايير CBAHI', category: 'تنظيمية', level: 'حرج', owner: 'أ. ريم', status: 'مفتوح', dueDate: '٢٠٢٤/٠٥/٠١' },
  { id: 'RSK-030', title: 'تجاوز الميزانية التشغيلية', category: 'مالية', level: 'متوسط', owner: 'أ. عبدالله', status: 'مغلق', dueDate: '٢٠٢٤/٠٣/٣٠' },
];

const GRADIENT = 'linear-gradient(135deg, #f59e0b 0%, #ef4444 50%, #8b5cf6 100%)';

const glass = (isDark) => ({
  borderRadius: '20px',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
  background: isDark ? 'rgba(15,23,42,0.7)' : 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow: isDark ? '0 4px 24px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
});

const levelColor = (l) =>
  l === 'حرج' ? '#ef4444' : l === 'مرتفع' ? '#f59e0b' : l === 'متوسط' ? '#eab308' : '#22c55e';
const statusColor = (s) =>
  s === 'مغلق' ? '#22c55e' : s === 'قيد المعالجة' ? '#f59e0b' : '#ef4444';

export default function RiskProDashboard() {
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
            ? 'linear-gradient(135deg, rgba(245,158,11,0.25) 0%, rgba(239,68,68,0.2) 50%, rgba(139,92,246,0.15) 100%)'
            : 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(239,68,68,0.08) 50%, rgba(139,92,246,0.06) 100%)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              width: 52, height: 52, borderRadius: '16px',
              background: GRADIENT, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(245,158,11,0.4)',
            }}>
              <WarningAmberIcon sx={{ fontSize: 26, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' },
                background: GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                لوحة إدارة المخاطر
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: sub }}>
                تحديد وتقييم ومتابعة المخاطر المؤسسية
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
                المخاطر الشهرية
              </Typography>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyRisks}>
                  <defs>
                    <linearGradient id="riskGrad1" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="riskGrad2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="riskGrad3" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: sub }} />
                  <YAxis tick={{ fontSize: 11, fill: sub }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Legend />
                  <Area type="monotone" dataKey="identified" name="مُحددة" stroke="#ef4444" fill="url(#riskGrad1)" strokeWidth={2} />
                  <Area type="monotone" dataKey="mitigated" name="مُعالجة" stroke="#22c55e" fill="url(#riskGrad2)" strokeWidth={2} />
                  <Area type="monotone" dataKey="residual" name="متبقية" stroke="#f59e0b" fill="url(#riskGrad3)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card elevation={0} sx={{ ...glass(isDark), p: 2.5, height: '100%' }}>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                تصنيف المخاطر
              </Typography>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={riskCategories} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    dataKey="value" paddingAngle={3} stroke="none">
                    {riskCategories.map((e, i) => <Cell key={i} fill={e.color} />)}
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
                تقييم المخاطر
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={riskAssessment}>
                  <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: sub }} />
                  <PolarRadiusAxis tick={{ fontSize: 9, fill: sub }} />
                  <Radar name="التقييم" dataKey="A" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={4}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card elevation={0} sx={{ ...glass(isDark), p: 2.5, height: '100%' }}>
              <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                مستويات الخطورة
              </Typography>
              {riskLevels.map((r, i) => (
                <Box key={i} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                      {r.level}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: r.color }}>
                      {r.count}
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={(r.count / 30) * 100}
                    sx={{
                      height: 8, borderRadius: 4,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      '& .MuiLinearProgress-bar': { borderRadius: 4, background: r.color },
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
                المخاطر حسب القسم
              </Typography>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={departmentRisks}>
                  <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                  <XAxis dataKey="dept" tick={{ fontSize: 10, fill: sub }} />
                  <YAxis tick={{ fontSize: 11, fill: sub }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                  <Bar dataKey="risks" name="المخاطر" fill="#ef4444" radius={[8, 8, 0, 0]}>
                    {departmentRisks.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Risk Register Table */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <Card elevation={0} sx={{ ...glass(isDark), p: 2.5 }}>
          <Typography sx={{ fontWeight: 700, mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
            سجل المخاطر
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {['الرمز', 'الوصف', 'التصنيف', 'المستوى', 'المسؤول', 'الحالة', 'الموعد'].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: sub, border: 'none' }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {riskRegister.map((r) => (
                  <TableRow key={r.id} sx={{ '&:hover': { background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } }}>
                    <TableCell sx={{ fontSize: '0.75rem', fontWeight: 600, color: '#f59e0b', border: 'none' }}>{r.id}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#F1F5F9' : '#0F172A', border: 'none', maxWidth: 200 }}>{r.title}</TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: sub, border: 'none' }}>{r.category}</TableCell>
                    <TableCell sx={{ border: 'none' }}>
                      <Chip label={r.level} size="small" sx={{
                        height: 22, fontSize: '0.62rem', fontWeight: 600,
                        backgroundColor: `${levelColor(r.level)}22`, color: levelColor(r.level),
                      }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#F1F5F9' : '#0F172A', border: 'none' }}>{r.owner}</TableCell>
                    <TableCell sx={{ border: 'none' }}>
                      <Chip label={r.status} size="small" sx={{
                        height: 22, fontSize: '0.62rem', fontWeight: 600,
                        backgroundColor: `${statusColor(r.status)}22`, color: statusColor(r.status),
                      }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.72rem', color: sub, border: 'none' }}>{r.dueDate}</TableCell>
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
