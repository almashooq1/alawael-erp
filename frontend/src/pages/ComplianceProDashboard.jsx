/**
 * ComplianceProDashboard — لوحة الامتثال التنظيمي البريميوم
 * Premium Glassmorphism Dashboard for Regulatory Compliance
 *
 * Gradient: #8b5cf6 → #06b6d4 → #22c55e
 */

import { useTheme, alpha,
} from '@mui/material';

import PolicyIcon from '@mui/icons-material/Policy';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import AssuredWorkloadIcon from '@mui/icons-material/AssuredWorkload';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';

// ─── Fake Data ──────────────────────────────────────────────────────────────
const KPI_DATA = [
  { title: 'نسبة الامتثال العام', value: '٩٤.٧٪', change: '+١.٢٪', icon: AssuredWorkloadIcon, color: '#8b5cf6' },
  { title: 'معيار مُطبّق', value: '٢٤٨', change: '+١٢', icon: FactCheckIcon, color: '#06b6d4' },
  { title: 'مخالفة مفتوحة', value: '١٤', change: '-٣', icon: ReportProblemIcon, color: '#ef4444' },
  { title: 'تدقيق مكتمل', value: '٣٨', change: '+٥', icon: PolicyIcon, color: '#22c55e' },
];

const monthlyCompliance = [
  { month: 'يناير', compliance: 91, audits: 5, violations: 8 },
  { month: 'فبراير', compliance: 92, audits: 6, violations: 6 },
  { month: 'مارس', compliance: 93, audits: 7, violations: 5 },
  { month: 'أبريل', compliance: 92, audits: 5, violations: 7 },
  { month: 'مايو', compliance: 94, audits: 8, violations: 4 },
  { month: 'يونيو', compliance: 95, audits: 7, violations: 3 },
];

const standardCategories = [
  { name: 'CBAHI', value: 85, color: '#8b5cf6' },
  { name: 'JCI', value: 42, color: '#06b6d4' },
  { name: 'وزارة الصحة', value: 68, color: '#22c55e' },
  { name: 'HIPAA', value: 35, color: '#f59e0b' },
  { name: 'ISO 9001', value: 18, color: '#ec4899' },
];

const complianceRadar = [
  { metric: 'سلامة المرضى', value: 96 },
  { metric: 'حماية البيانات', value: 94 },
  { metric: 'مكافحة العدوى', value: 93 },
  { metric: 'إدارة الأدوية', value: 91 },
  { metric: 'السجلات الطبية', value: 95 },
  { metric: 'حقوق المرضى', value: 97 },
];

const deptCompliance = [
  { dept: 'التمريض', compliance: 97, target: 100, color: '#8b5cf6' },
  { dept: 'الصيدلية', compliance: 95, target: 100, color: '#06b6d4' },
  { dept: 'المختبر', compliance: 93, target: 100, color: '#22c55e' },
  { dept: 'التأهيل', compliance: 96, target: 100, color: '#f59e0b' },
  { dept: 'الطوارئ', compliance: 91, target: 100, color: '#ef4444' },
];

const auditByDept = [
  { dept: 'التمريض', audits: 12 },
  { dept: 'الصيدلية', audits: 8 },
  { dept: 'المختبر', audits: 7 },
  { dept: 'التأهيل', audits: 6 },
  { dept: 'الإدارة', audits: 5 },
];

const recentActions = [
  { id: 'CA-001', standard: 'CBAHI 3.2.1', finding: 'عدم اكتمال التوثيق', priority: 'عالي', status: 'جاري', dueDate: '٢٠٢٦/٠٤/١٥' },
  { id: 'CA-002', standard: 'JCI MMU.4', finding: 'مراجعة الوصفات', priority: 'متوسط', status: 'مكتمل', dueDate: '٢٠٢٦/٠٣/٢٨' },
  { id: 'CA-003', standard: 'MOH 12.5', finding: 'تحديث البروتوكولات', priority: 'عالي', status: 'جاري', dueDate: '٢٠٢٦/٠٤/٢٠' },
  { id: 'CA-004', standard: 'HIPAA §164', finding: 'تشفير البيانات', priority: 'حرج', status: 'معلق', dueDate: '٢٠٢٦/٠٤/١٠' },
  { id: 'CA-005', standard: 'ISO 9001:8.7', finding: 'معالجة عدم المطابقة', priority: 'متوسط', status: 'مكتمل', dueDate: '٢٠٢٦/٠٣/٢٥' },
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
          p: 2.5, height: '100%', ...sx,
        }}
      >
        {children}
      </Card>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function ComplianceProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const GRADIENT = 'linear-gradient(135deg, #8b5cf6 0%, #06b6d4 50%, #22c55e 100%)';

  return (
    <Box sx={{ direction: 'rtl', minHeight: '100vh', p: { xs: 2, md: 3 } }}>
      {/* ── Hero Header ───────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box sx={{
          borderRadius: '24px', overflow: 'hidden', mb: 3, p: { xs: 3, md: 4 },
          background: isDark
            ? 'linear-gradient(135deg, rgba(139,92,246,0.2) 0%, rgba(6,182,212,0.15) 50%, rgba(34,197,94,0.1) 100%)'
            : 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(6,182,212,0.07) 50%, rgba(34,197,94,0.05) 100%)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(139,92,246,0.15)'}`,
          backdropFilter: 'blur(20px)',
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <Box sx={{
              width: 48, height: 48, borderRadius: '14px', background: GRADIENT,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(139,92,246,0.4)',
            }}>
              <GavelIcon sx={{ fontSize: 26, color: '#fff' }} />
            </Box>
            <Box>
              <Typography sx={{
                fontWeight: 800, fontSize: { xs: '1.3rem', md: '1.7rem' },
                background: GRADIENT, WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                لوحة الامتثال التنظيمي
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }}>
                متابعة المعايير والتدقيق والمخالفات والإجراءات التصحيحية
              </Typography>
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
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

      {/* ── Charts Row 1 ─────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <GlassCard delay={0.3}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              اتجاه الامتثال الشهري
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthlyCompliance}>
                <defs>
                  <linearGradient id="cpComp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} domain={[85, 100]} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }} />
                <Legend />
                <Area type="monotone" dataKey="compliance" name="نسبة الامتثال ٪" stroke="#8b5cf6" fill="url(#cpComp)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <GlassCard delay={0.4}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              المعايير حسب الجهة
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={standardCategories} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                  {standardCategories.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Charts Row 2 ─────────────────────────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <GlassCard delay={0.5}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              مؤشرات الامتثال التفصيلية
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={complianceRadar}>
                <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} />
                <Radar name="الامتثال" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <GlassCard delay={0.6}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              امتثال الأقسام
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              {deptCompliance.map((d, i) => (
                <Box key={i}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155' }}>
                      {d.dept}
                    </Typography>
                    <Typography sx={{ fontSize: '0.78rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }}>
                      {d.compliance}٪
                    </Typography>
                  </Box>
                  <LinearProgress variant="determinate" value={d.compliance}
                    sx={{
                      height: 8, borderRadius: 4,
                      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                      '& .MuiLinearProgress-bar': { borderRadius: 4, background: `linear-gradient(90deg, ${d.color}, ${d.color}CC)` },
                    }}
                  />
                </Box>
              ))}
            </Box>
          </GlassCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <GlassCard delay={0.7}>
            <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
              التدقيقات حسب القسم
            </Typography>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={auditByDept} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis type="number" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis dataKey="dept" type="category" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} width={60} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', background: isDark ? '#1E293B' : '#fff' }} />
                <Bar dataKey="audits" name="تدقيقات" fill="#06b6d4" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Corrective Actions Table ──────────────────────────────── */}
      <GlassCard delay={0.8}>
        <Typography sx={{ fontWeight: 700, fontSize: '1rem', mb: 2, color: isDark ? '#F1F5F9' : '#0F172A' }}>
          الإجراءات التصحيحية
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {['الرقم', 'المعيار', 'الملاحظة', 'الأولوية', 'الحالة', 'التاريخ المستهدف'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.78rem', color: isDark ? '#94A3B8' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {recentActions.map((row) => (
                <TableRow key={row.id} sx={{ '&:hover': { backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' } }}>
                  <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, color: '#8b5cf6', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.id}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.standard}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: isDark ? '#E2E8F0' : '#334155', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.finding}</TableCell>
                  <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <Chip label={row.priority} size="small" sx={{
                      height: 22, fontSize: '0.7rem', fontWeight: 600,
                      backgroundColor: row.priority === 'حرج' ? alpha('#ef4444', 0.12) : row.priority === 'عالي' ? alpha('#f59e0b', 0.12) : alpha('#06b6d4', 0.12),
                      color: row.priority === 'حرج' ? '#ef4444' : row.priority === 'عالي' ? '#f59e0b' : '#06b6d4',
                    }} />
                  </TableCell>
                  <TableCell sx={{ borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                    <Chip label={row.status} size="small" sx={{
                      height: 22, fontSize: '0.7rem', fontWeight: 600,
                      backgroundColor: row.status === 'مكتمل' ? alpha('#22c55e', 0.12) : row.status === 'جاري' ? alpha('#f59e0b', 0.12) : alpha('#64748b', 0.12),
                      color: row.status === 'مكتمل' ? '#22c55e' : row.status === 'جاري' ? '#f59e0b' : '#64748b',
                    }} />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B', borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>{row.dueDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </GlassCard>
    </Box>
  );
}
