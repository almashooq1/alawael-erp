/**
 * CRMProDashboard — لوحة إدارة علاقات العملاء البريميوم
 * Premium Glassmorphism Dashboard for Customer Relationship Management
 *
 * Gradient: #6366f1 → #06b6d4 → #10b981
 */

import { useTheme, alpha, TableRow,
} from '@mui/material';



import HandshakeIcon from '@mui/icons-material/Handshake';
import PeopleIcon from '@mui/icons-material/People';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import StarIcon from '@mui/icons-material/Star';
import EmailIcon from '@mui/icons-material/Email';

/* ═══════════════════════════════════════════════════════════════════ */
const GRAD = ['#6366f1', '#06b6d4', '#10b981'];
const gradient = `linear-gradient(135deg, ${GRAD[0]} 0%, ${GRAD[1]} 50%, ${GRAD[2]} 100%)`;

const glass = (isDark) => ({
  borderRadius: '20px',
  border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
  background: isDark ? 'rgba(15,23,42,0.65)' : 'rgba(255,255,255,0.8)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  boxShadow: isDark ? '0 8px 32px rgba(0,0,0,0.3)' : '0 4px 24px rgba(0,0,0,0.06)',
});

/* ═══════════════════════════════════════════════════════════════════ */
const KPI_CARDS = [
  { label: 'إجمالي العملاء', value: '١,٨٤٢', change: '+٦٨', icon: PeopleIcon, color: GRAD[0] },
  { label: 'عملاء جدد (الشهر)', value: '١٢٤', change: '+١٨', icon: PersonAddIcon, color: GRAD[1] },
  { label: 'معدل الاحتفاظ', value: '٩٢٪', change: '+٣٪', icon: StarIcon, color: '#10b981' },
  { label: 'الصفقات المفتوحة', value: '٨٧', change: '+١٢', icon: TrendingUpIcon, color: GRAD[2] },
  { label: 'المتابعات اليومية', value: '٤٦', change: '+٨', icon: PhoneInTalkIcon, color: '#f59e0b' },
  { label: 'رسائل مُرسلة', value: '٣٤٢', change: '+٥٤', icon: EmailIcon, color: '#ec4899' },
];

/* ═══════════════════════════════════════════════════════════════════ */
const MONTHLY_LEADS = [
  { month: 'يناير', leads: 85, converted: 42, revenue: 180 },
  { month: 'فبراير', leads: 92, converted: 48, revenue: 210 },
  { month: 'مارس', leads: 110, converted: 58, revenue: 265 },
  { month: 'أبريل', leads: 98, converted: 52, revenue: 238 },
  { month: 'مايو', leads: 125, converted: 68, revenue: 310 },
  { month: 'يونيو', leads: 135, converted: 72, revenue: 342 },
  { month: 'يوليو', leads: 118, converted: 62, revenue: 285 },
  { month: 'أغسطس', leads: 142, converted: 78, revenue: 368 },
  { month: 'سبتمبر', leads: 155, converted: 85, revenue: 402 },
  { month: 'أكتوبر', leads: 148, converted: 80, revenue: 385 },
  { month: 'نوفمبر', leads: 165, converted: 92, revenue: 438 },
  { month: 'ديسمبر', leads: 172, converted: 95, revenue: 462 },
];

const LEAD_SOURCES = [
  { name: 'إحالات', value: 35, color: GRAD[0] },
  { name: 'موقع إلكتروني', value: 25, color: GRAD[1] },
  { name: 'وسائل التواصل', value: 20, color: GRAD[2] },
  { name: 'معارض ومؤتمرات', value: 12, color: '#f59e0b' },
  { name: 'اتصال مباشر', value: 8, color: '#ec4899' },
];

const PIPELINE_DATA = [
  { stage: 'استفسار أولي', count: 45, value: 520 },
  { stage: 'عرض سعر', count: 32, value: 380 },
  { stage: 'مفاوضات', count: 18, value: 245 },
  { stage: 'موافقة مبدئية', count: 12, value: 185 },
  { stage: 'توقيع عقد', count: 8, value: 142 },
  { stage: 'تنفيذ', count: 15, value: 210 },
];

const SATISFACTION_DATA = [
  { month: 'يناير', score: 4.2, responses: 85 },
  { month: 'فبراير', score: 4.3, responses: 92 },
  { month: 'مارس', score: 4.5, responses: 110 },
  { month: 'أبريل', score: 4.4, responses: 98 },
  { month: 'مايو', score: 4.6, responses: 125 },
  { month: 'يونيو', score: 4.7, responses: 135 },
];

const RECENT_ACTIVITIES = [
  { id: 'ACT-501', client: 'مستشفى الأمل', contact: 'د. عبدالله العمري', type: 'اجتماع', status: 'completed', date: '٢٠٢٦/٠٣/٣٠', value: '٨٥,٠٠٠' },
  { id: 'ACT-502', client: 'مركز الشفاء', contact: 'أ. فاطمة الحربي', type: 'عرض سعر', status: 'pending', date: '٢٠٢٦/٠٣/٢٩', value: '١٢٠,٠٠٠' },
  { id: 'ACT-503', client: 'عيادات النور', contact: 'م. خالد السبيعي', type: 'متابعة', status: 'scheduled', date: '٢٠٢٦/٠٣/٣١', value: '٤٥,٠٠٠' },
  { id: 'ACT-504', client: 'مجمع الرعاية', contact: 'د. نورة الشهري', type: 'توقيع عقد', status: 'completed', date: '٢٠٢٦/٠٣/٢٨', value: '٢٤٠,٠٠٠' },
  { id: 'ACT-505', client: 'مركز التأهيل الحديث', contact: 'أ. سعد القحطاني', type: 'اجتماع', status: 'scheduled', date: '٢٠٢٦/٠٤/٠١', value: '٩٢,٠٠٠' },
  { id: 'ACT-506', client: 'مستشفى الحياة', contact: 'د. منى الغامدي', type: 'عرض تجريبي', status: 'pending', date: '٢٠٢٦/٠٣/٣٠', value: '١٨٠,٠٠٠' },
  { id: 'ACT-507', client: 'عيادات البسمة', contact: 'أ. أحمد الدوسري', type: 'متابعة', status: 'completed', date: '٢٠٢٦/٠٣/٢٧', value: '٦٥,٠٠٠' },
];

const TOP_CLIENTS = [
  { name: 'مستشفى الأمل', revenue: '٤٨٠,٠٠٠', deals: 8, satisfaction: 4.9 },
  { name: 'مجمع الرعاية', revenue: '٣٥٠,٠٠٠', deals: 6, satisfaction: 4.8 },
  { name: 'مركز الشفاء', revenue: '٢٩٠,٠٠٠', deals: 5, satisfaction: 4.7 },
  { name: 'عيادات النور', revenue: '٢١٥,٠٠٠', deals: 4, satisfaction: 4.6 },
];

/* ═══════════════════════════════════════════════════════════════════ */
const GlassCard = ({ children, isDark, sx = {} }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
    <Card elevation={0} sx={{ ...glass(isDark), p: 2.5, ...sx }}>{children}</Card>
  </motion.div>
);

const SectionHeader = ({ icon: Icon, title, isDark }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
    <Box sx={{ width: 36, height: 36, borderRadius: '12px', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 14px ${alpha(GRAD[0], 0.35)}` }}>
      <Icon sx={{ fontSize: 18, color: '#fff' }} />
    </Box>
    <Typography sx={{ fontWeight: 700, fontSize: '1rem', color: isDark ? '#F1F5F9' : '#0F172A' }}>{title}</Typography>
  </Box>
);

const StatusChip = ({ status }) => {
  const map = {
    completed: { label: 'مكتمل', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
    pending: { label: 'قيد المتابعة', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <PendingIcon sx={{ fontSize: 14 }} /> },
    scheduled: { label: 'مجدول', color: '#6366f1', bg: 'rgba(99,102,241,0.12)', icon: <ScheduleIcon sx={{ fontSize: 14 }} /> },
  };
  const s = map[status] || map.pending;
  return (
    <Chip icon={s.icon} label={s.label} size="small"
      sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600, backgroundColor: s.bg, color: s.color, border: `1px solid ${alpha(s.color, 0.25)}`, '& .MuiChip-icon': { color: s.color }, '& .MuiChip-label': { px: 0.8 } }}
    />
  );
};

/* ═══════════════════════════════════════════════════════════════════ */
export default function CRMProDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box sx={{ minHeight: '100vh', direction: 'rtl' }}>
      {/* ── Hero ──────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <Box sx={{
          position: 'relative', borderRadius: '28px', overflow: 'hidden', mb: 4, p: { xs: 3, md: 4 },
          background: isDark
            ? `linear-gradient(135deg, ${alpha(GRAD[0], 0.25)} 0%, ${alpha(GRAD[1], 0.18)} 50%, ${alpha(GRAD[2], 0.12)} 100%)`
            : `linear-gradient(135deg, ${alpha(GRAD[0], 0.12)} 0%, ${alpha(GRAD[1], 0.08)} 50%, ${alpha(GRAD[2], 0.05)} 100%)`,
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : alpha(GRAD[0], 0.15)}`,
          backdropFilter: 'blur(20px)',
        }}>
          <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {[
              { left: '-5%', top: '-10%', size: 300, color: alpha(GRAD[0], 0.15) },
              { right: '-3%', bottom: '-15%', size: 250, color: alpha(GRAD[1], 0.12) },
              { left: '40%', top: '20%', size: 200, color: alpha(GRAD[2], 0.1) },
            ].map((b, i) => (
              <motion.div key={i} animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }} transition={{ duration: 6 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ position: 'absolute', ...b, width: b.size, height: b.size, borderRadius: '50%', background: `radial-gradient(circle, ${b.color} 0%, transparent 70%)` }} />
            ))}
          </Box>
          <Box sx={{ position: 'relative', zIndex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: '18px', background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 8px 24px ${alpha(GRAD[0], 0.4)}` }}>
                <HandshakeIcon sx={{ fontSize: 28, color: '#fff' }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' }, background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.2 }}>
                  لوحة إدارة علاقات العملاء
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B', mt: 0.25 }}>
                  متابعة العملاء والصفقات والفرص البيعية في الوقت الفعلي
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </motion.div>

      {/* ── KPI Cards ──────────────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {KPI_CARDS.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <Grid item xs={6} sm={4} md={2} key={i}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 * i, duration: 0.5 }}>
                <Card elevation={0} sx={{ ...glass(isDark), p: 2, textAlign: 'center' }}>
                  <Box sx={{ width: 44, height: 44, borderRadius: '14px', mx: 'auto', mb: 1.5, background: `linear-gradient(135deg, ${alpha(kpi.color, 0.15)}, ${alpha(kpi.color, 0.05)})`, border: `1px solid ${alpha(kpi.color, 0.2)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon sx={{ fontSize: 22, color: kpi.color }} />
                  </Box>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', color: isDark ? '#F1F5F9' : '#0F172A', fontFamily: 'monospace' }}>{kpi.value}</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: isDark ? 'rgba(255,255,255,0.45)' : '#64748B', mb: 0.5 }}>{kpi.label}</Typography>
                  <Chip label={kpi.change} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, backgroundColor: kpi.change.startsWith('+') ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)', color: kpi.change.startsWith('+') ? '#10b981' : '#ef4444', '& .MuiChip-label': { px: 0.6 } }} />
                </Card>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Row 1: Monthly Leads + Lead Sources ──────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={TrendingUpIcon} title="العملاء المحتملون والتحويلات الشهرية" isDark={isDark} />
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={MONTHLY_LEADS}>
                <defs>
                  <linearGradient id="crmGradLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GRAD[0]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GRAD[0]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <RTooltip contentStyle={{ background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)', border: 'none', borderRadius: 12, backdropFilter: 'blur(10px)' }} />
                <Legend />
                <Area yAxisId="left" type="monotone" dataKey="leads" name="عملاء محتملون" stroke={GRAD[0]} fill="url(#crmGradLeads)" strokeWidth={2.5} />
                <Bar yAxisId="left" dataKey="converted" name="تم التحويل" fill={GRAD[1]} radius={[4, 4, 0, 0]} barSize={16} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" name="الإيرادات (ألف)" stroke={GRAD[2]} strokeWidth={2.5} dot={{ fill: GRAD[2], r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <GlassCard isDark={isDark} sx={{ height: '100%' }}>
            <SectionHeader icon={PersonAddIcon} title="مصادر العملاء" isDark={isDark} />
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={LEAD_SOURCES} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                  {LEAD_SOURCES.map((entry, i) => (<Cell key={i} fill={entry.color} stroke="none" />))}
                </Pie>
                <RTooltip contentStyle={{ background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)', border: 'none', borderRadius: 12 }} />
                <Legend formatter={(val) => <span style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B' }}>{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Row 2: Pipeline + Satisfaction ────────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={7}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={HandshakeIcon} title="خط أنابيب الصفقات" isDark={isDark} />
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={PIPELINE_DATA} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis type="number" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} width={85} />
                <RTooltip contentStyle={{ background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)', border: 'none', borderRadius: 12 }} />
                <Legend />
                <Bar dataKey="count" name="عدد الصفقات" radius={[0, 8, 8, 0]} barSize={18} fill={GRAD[0]} />
                <Bar dataKey="value" name="القيمة (ألف)" radius={[0, 8, 8, 0]} barSize={18} fill={GRAD[1]} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
        <Grid item xs={12} md={5}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={StarIcon} title="رضا العملاء" isDark={isDark} />
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={SATISFACTION_DATA}>
                <defs>
                  <linearGradient id="crmGradSat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GRAD[2]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GRAD[2]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis domain={[3.5, 5]} tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <RTooltip contentStyle={{ background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)', border: 'none', borderRadius: 12 }} />
                <Area type="monotone" dataKey="score" name="معدل الرضا" stroke={GRAD[2]} fill="url(#crmGradSat)" strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Row 3: Top Clients + Activities ───────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={StarIcon} title="أفضل العملاء" isDark={isDark} />
            {TOP_CLIENTS.map((c, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * i }}>
                <Box sx={{ p: 2, borderRadius: '14px', mb: 1.5, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}` }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                    <Avatar sx={{ width: 36, height: 36, background: gradient, fontSize: '0.85rem', fontWeight: 700 }}>{i + 1}</Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: '0.85rem', fontWeight: 700, color: isDark ? '#E2E8F0' : '#1E293B' }}>{c.name}</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: isDark ? 'rgba(255,255,255,0.4)' : '#94A3B8' }}>{c.deals} صفقات</Typography>
                    </Box>
                    <Chip label={`${c.satisfaction}★`} size="small" sx={{ height: 22, fontWeight: 700, fontSize: '0.7rem', background: gradient, color: '#fff' }} />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '0.78rem', fontWeight: 700, color: GRAD[0], fontFamily: 'monospace' }}>{c.revenue} ر.س</Typography>
                  </Box>
                </Box>
              </motion.div>
            ))}
          </GlassCard>
        </Grid>
        <Grid item xs={12} md={8}>
          <GlassCard isDark={isDark}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <SectionHeader icon={PhoneInTalkIcon} title="أحدث الأنشطة" isDark={isDark} />
              <Tooltip title="تحديث"><IconButton size="small"><RefreshIcon sx={{ fontSize: 18, color: isDark ? '#94A3B8' : '#64748B' }} /></IconButton></Tooltip>
            </Box>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['الرمز', 'العميل', 'جهة الاتصال', 'النوع', 'القيمة', 'الحالة'].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B', backgroundColor: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(248,250,252,0.95)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {RECENT_ACTIVITIES.map((act, i) => (
                    <motion.tr key={act.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} component={TableRow} style={{ display: 'table-row' }}>
                      <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: GRAD[0], fontFamily: 'monospace', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{act.id}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{act.client}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{act.contact}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{act.type}</TableCell>
                      <TableCell sx={{ fontSize: '0.78rem', fontWeight: 700, color: isDark ? '#E2E8F0' : '#334155', fontFamily: 'monospace', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{act.value} ر.س</TableCell>
                      <TableCell sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}><StatusChip status={act.status} /></TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Footer ────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        <Box sx={{ mt: 4, p: 2.5, borderRadius: '16px', background: isDark ? alpha(GRAD[0], 0.08) : alpha(GRAD[0], 0.04), border: `1px solid ${isDark ? alpha(GRAD[0], 0.2) : alpha(GRAD[0], 0.1)}`, display: 'flex', alignItems: 'center', gap: 2 }}>
          <AutoAwesomeIcon sx={{ fontSize: 20, color: GRAD[0], flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.82rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }}>
            لوحة CRM — متابعة العملاء والصفقات والفرص البيعية مع تحليلات متقدمة لخط الأنابيب ورضا العملاء
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
}
