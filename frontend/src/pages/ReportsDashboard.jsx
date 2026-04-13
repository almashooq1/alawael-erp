import { useState, useEffect, useCallback, memo } from 'react';
import { useTheme } from '@mui/material/styles';

/* ─── Glass Component ─── */
const Glass = memo(({ children, sx, ...rest }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box sx={{
      background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)',
      backdropFilter: 'blur(20px) saturate(180%)',
      WebkitBackdropFilter: 'blur(20px) saturate(180%)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
      borderRadius: 3,
      ...sx,
    }} {...rest}>
      {children}
    </Box>
  );
});

/* ─── KPI Card ─── */
const KPICard = memo(({ title, value, subtitle, icon, gradient, trend, delay = 0 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isPos = trend >= 0;
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring', stiffness: 120 }}>
      <Glass sx={{ p: 3, height: '100%', position: 'relative', overflow: 'hidden', cursor: 'default' }}>
        <Box sx={{ position: 'absolute', top: -20, insetInlineEnd: -20, width: 100, height: 100, borderRadius: '50%', background: gradient, opacity: 0.12, filter: 'blur(2px)' }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: 2, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: `0 4px 16px ${gradient.includes('f59e') ? '#f59e0b44' : '#6366f144'}` }}>
            {icon}
          </Box>
          <Chip label={`${isPos ? '+' : ''}${trend}%`} size="small" sx={{ background: isPos ? '#22c55e22' : '#ef444422', color: isPos ? '#22c55e' : '#ef4444', fontWeight: 700, fontSize: 11, border: `1px solid ${isPos ? '#22c55e44' : '#ef444444'}` }} />
        </Box>
        <Typography variant="h4" fontWeight={800} sx={{ background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', mb: 0.5 }}>{value}</Typography>
        <Typography variant="body2" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)', mb: 0.5 }}>{title}</Typography>
        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>{subtitle}</Typography>
      </Glass>
    </motion.div>
  );
});

/* ─── Tab Button ─── */
const TabBtn = memo(({ label, active, onClick, icon }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} onClick={onClick}
      style={{ background: active ? 'linear-gradient(135deg,#f59e0b,#ef4444)' : 'transparent', border: active ? 'none' : `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 10, padding: '8px 18px', cursor: 'pointer', color: active ? '#fff' : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)', fontWeight: active ? 700 : 500, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s', whiteSpace: 'nowrap' }}>
      {icon && <span style={{ fontSize: 15 }}>{icon}</span>}{label}
    </motion.button>
  );
});

/* ─── SVG Bar Chart ─── */
const BarChart = memo(({ data, color1 = '#f59e0b', color2 = '#ef4444', height = 120 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const max = Math.max(...data.map(d => d.value), 1);
  const w = 40; const gap = 8; const total = data.length * (w + gap) - gap;
  return (
    <svg width="100%" viewBox={`0 0 ${total} ${height + 30}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="bcGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color1} />
          <stop offset="100%" stopColor={color2} />
        </linearGradient>
      </defs>
      {data.map((d, i) => {
        const barH = Math.max((d.value / max) * height, 4);
        const x = i * (w + gap);
        const y = height - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={barH} rx={6} fill="url(#bcGrad)" opacity={0.85} />
            <text x={x + w / 2} y={height + 16} textAnchor="middle" fontSize={10} fill={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)'}>{d.label}</text>
            <text x={x + w / 2} y={y - 5} textAnchor="middle" fontSize={10} fill={color1} fontWeight="bold">{d.value}</text>
          </g>
        );
      })}
    </svg>
  );
});

/* ─── SVG Line Chart ─── */
const LineChart = memo(({ data, color = '#f59e0b', height = 100, width = 300 }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const max = Math.max(...data.map(d => d.value), 1);
  const min = Math.min(...data.map(d => d.value), 0);
  const range = max - min || 1;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((d.value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height + 20}`} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="lcGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill="url(#lcGrad)" />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((d.value - min) / range) * height;
        return <circle key={i} cx={x} cy={y} r={4} fill={color} stroke={isDark ? '#1e1e2e' : '#fff'} strokeWidth={2} />;
      })}
    </svg>
  );
});

/* ─── Ring Gauge ─── */
const Ring = memo(({ value, max = 100, color, size = 80, label }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const r = 32; const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
      <Box sx={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 80 80">
          <circle cx={40} cy={40} r={r} fill="none" stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'} strokeWidth={8} />
          <circle cx={40} cy={40} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)} strokeLinecap="round" transform="rotate(-90 40 40)" style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
          <text x={40} y={45} textAnchor="middle" fontSize={14} fontWeight="bold" fill={color}>{Math.round(pct * 100)}%</text>
        </svg>
      </Box>
      <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)', textAlign: 'center', fontSize: 10 }}>{label}</Typography>
    </Box>
  );
});

/* ─── Report Row ─── */
const ReportRow = memo(({ report, onView, onDownload }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const statusColors = { 'جاهز': '#22c55e', 'قيد المعالجة': '#f59e0b', 'فشل': '#ef4444', 'مجدول': '#6366f1' };
  const typeIcons = { 'مالي': '💰', 'HR': '👥', 'مرضى': '🏥', 'جدولة': '📅', 'عمليات': '⚙️', 'تحليلي': '📊' };
  return (
    <motion.tr initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} whileHover={{ backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }}>
      <td style={{ padding: '12px 16px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <span style={{ fontSize: 20 }}>{typeIcons[report.type] || '📋'}</span>
          <Box>
            <Typography variant="body2" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>{report.name}</Typography>
            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{report.id}</Typography>
          </Box>
        </Box>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <Chip label={report.type} size="small" sx={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', fontSize: 11 }} />
      </td>
      <td style={{ padding: '12px 16px' }}>
        <Chip label={report.status} size="small" sx={{ background: `${statusColors[report.status]}22`, color: statusColors[report.status], border: `1px solid ${statusColors[report.status]}44`, fontWeight: 700, fontSize: 11 }} />
      </td>
      <td style={{ padding: '12px 16px' }}>
        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>{report.date}</Typography>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)' }}>{report.size}</Typography>
      </td>
      <td style={{ padding: '12px 16px' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="عرض"><IconButton size="small" onClick={() => onView(report)} sx={{ color: '#6366f1' }}>👁️</IconButton></Tooltip>
          <Tooltip title="تحميل"><IconButton size="small" onClick={() => onDownload(report)} sx={{ color: '#22c55e' }}>⬇️</IconButton></Tooltip>
        </Box>
      </td>
    </motion.tr>
  );
});

/* ─── Metric Card ─── */
const MetricCard = memo(({ label, value, icon, color, change }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Glass sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
      <Box sx={{ width: 44, height: 44, borderRadius: 2, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, border: `1px solid ${color}33` }}>{icon}</Box>
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>{label}</Typography>
        <Typography variant="h6" fontWeight={700} sx={{ color, lineHeight: 1.2 }}>{value}</Typography>
        {change !== undefined && <Typography variant="caption" sx={{ color: change >= 0 ? '#22c55e' : '#ef4444', fontSize: 10 }}>{change >= 0 ? '↑' : '↓'} {Math.abs(change)}% هذا الشهر</Typography>}
      </Box>
    </Glass>
  );
});

/* ─── DEMO DATA ─── */
const DEMO = {
  kpis: [
    { title: 'إجمالي التقارير', value: '1,247', subtitle: 'هذا العام', icon: '📊', gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)', trend: 18 },
    { title: 'تقارير اليوم', value: '34', subtitle: 'تم إنشاؤها اليوم', icon: '📋', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', trend: 12 },
    { title: 'معدل التحميل', value: '89%', subtitle: 'من إجمالي التقارير', icon: '⬇️', gradient: 'linear-gradient(135deg,#22c55e,#06b6d4)', trend: 5 },
    { title: 'وقت المعالجة', value: '2.3ث', subtitle: 'متوسط الإنشاء', icon: '⚡', gradient: 'linear-gradient(135deg,#f97316,#f59e0b)', trend: -8 },
    { title: 'التقارير المجدولة', value: '156', subtitle: 'قيد الانتظار', icon: '🗓️', gradient: 'linear-gradient(135deg,#06b6d4,#6366f1)', trend: 23 },
    { title: 'مستخدمو التقارير', value: '412', subtitle: 'مستخدم نشط', icon: '👥', gradient: 'linear-gradient(135deg,#8b5cf6,#ec4899)', trend: 7 },
  ],
  reports: [
    { id: 'RPT-001', name: 'التقرير المالي الشهري - مارس 2026', type: 'مالي', status: 'جاهز', date: '30/03/2026', size: '2.4 MB' },
    { id: 'RPT-002', name: 'تقرير الموارد البشرية الأسبوعي', type: 'HR', status: 'جاهز', date: '29/03/2026', size: '1.1 MB' },
    { id: 'RPT-003', name: 'إحصائيات المرضى - الربع الأول', type: 'مرضى', status: 'قيد المعالجة', date: '30/03/2026', size: '—' },
    { id: 'RPT-004', name: 'تقرير الجدولة والمواعيد', type: 'جدولة', status: 'جاهز', date: '28/03/2026', size: '890 KB' },
    { id: 'RPT-005', name: 'تحليل الكفاءة التشغيلية', type: 'عمليات', status: 'جاهز', date: '27/03/2026', size: '3.2 MB' },
    { id: 'RPT-006', name: 'تقرير مخاطر المرضى بالذكاء الاصطناعي', type: 'تحليلي', status: 'مجدول', date: '01/04/2026', size: '—' },
    { id: 'RPT-007', name: 'التقرير السنوي 2025', type: 'مالي', status: 'جاهز', date: '15/01/2026', size: '8.7 MB' },
    { id: 'RPT-008', name: 'تقرير التدريب والكفاءات', type: 'HR', status: 'فشل', date: '25/03/2026', size: '—' },
  ],
  monthlyTrend: [
    { label: 'يناير', value: 89 }, { label: 'فبراير', value: 112 }, { label: 'مارس', value: 98 },
    { label: 'أبريل', value: 134 }, { label: 'مايو', value: 127 }, { label: 'يونيو', value: 145 },
    { label: 'يوليو', value: 110 }, { label: 'أغسطس', value: 138 }, { label: 'سبتمبر', value: 151 },
    { label: 'أكتوبر', value: 163 }, { label: 'نوفمبر', value: 142 }, { label: 'ديسمبر', value: 178 },
  ],
  weeklyLine: [
    { value: 28 }, { value: 35 }, { value: 31 }, { value: 42 }, { value: 38 }, { value: 29 }, { value: 34 },
  ],
  typeDistribution: [
    { label: 'مالي', value: 28, color: '#22c55e' },
    { label: 'HR', value: 20, color: '#6366f1' },
    { label: 'مرضى', value: 25, color: '#06b6d4' },
    { label: 'جدولة', value: 12, color: '#8b5cf6' },
    { label: 'عمليات', value: 10, color: '#f59e0b' },
    { label: 'تحليلي', value: 5, color: '#ec4899' },
  ],
  gauges: [
    { label: 'دقة البيانات', value: 96, color: '#22c55e' },
    { label: 'اكتمال التقارير', value: 87, color: '#6366f1' },
    { label: 'رضا المستخدمين', value: 91, color: '#f59e0b' },
    { label: 'وقت الاستجابة', value: 78, color: '#06b6d4' },
  ],
  aiInsights: [
    { icon: '🔍', title: 'اكتشاف نمط', text: 'ارتفع معدل طلب التقارير المالية بنسبة 34% في نهايات الشهر، يُنصح بزيادة طاقة الخوادم في هذه الفترة.', color: '#6366f1' },
    { icon: '⚠️', title: 'تنبيه', text: 'فشل 3 تقارير HR في الأسبوع الماضي بسبب بيانات ناقصة. يُوصى بمراجعة قواعد التحقق.', color: '#ef4444' },
    { icon: '📈', title: 'توقع', text: 'من المتوقع ارتفاع طلبات التقارير بنسبة 20% في أبريل نظرًا لنهاية الربع المالي الأول.', color: '#22c55e' },
    { icon: '💡', title: 'اقتراح تحسين', text: 'يمكن تقليل وقت إنشاء التقارير التحليلية بنسبة 45% باستخدام ذاكرة تخزين مؤقت للبيانات الأكثر طلبًا.', color: '#f59e0b' },
  ],
  topUsers: [
    { name: 'د. سارة الأحمد', role: 'مدير مالي', reports: 89, avatar: '👩‍💼' },
    { name: 'م. خالد العمري', role: 'مدير HR', reports: 67, avatar: '👨‍💼' },
    { name: 'د. ليلى السالم', role: 'رئيس قسم', reports: 54, avatar: '👩‍⚕️' },
    { name: 'أ. فهد الراشد', role: 'محلل بيانات', reports: 47, avatar: '👨‍💻' },
    { name: 'د. نورا الزهراني', role: 'مدير عمليات', reports: 41, avatar: '👩‍🔬' },
  ],
};

const TABS = [
  { label: 'نظرة عامة', icon: '📊' },
  { label: 'قائمة التقارير', icon: '📋' },
  { label: 'التحليلات', icon: '📈' },
  { label: 'الجدولة', icon: '🗓️' },
  { label: 'كبار المستخدمين', icon: '🏆' },
  { label: 'ذكاء اصطناعي', icon: '🤖' },
];

/* ═══════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════ */
export default function ReportsDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tab, setTab] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('الكل');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [newReport, setNewReport] = useState({ name: '', type: 'مالي', period: '', format: 'PDF' });

  const bg = isDark
    ? 'linear-gradient(135deg,#0f0f1a 0%,#1a0f2e 50%,#0f1a1a 100%)'
    : 'linear-gradient(135deg,#fff8e7 0%,#fef3c7 50%,#fff7ed 100%)';

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => { setData(DEMO); setLoading(false); }, 900);
    return () => clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    const iv = setInterval(() => setRefresh(r => r + 1), 60000);
    return () => clearInterval(iv);
  }, []);

  const handleGenerate = useCallback(() => {
    setGenerating(true);
    setTimeout(() => { setGenerating(false); setDialogOpen(false); setNewReport({ name: '', type: 'مالي', period: '', format: 'PDF' }); }, 2000);
  }, []);

  const filteredReports = data?.reports?.filter(r =>
    (typeFilter === 'الكل' || r.type === typeFilter) &&
    (r.name.includes(search) || r.id.includes(search) || r.type.includes(search))
  ) || [];

  const G = 'linear-gradient(135deg,#f59e0b,#ef4444)';

  return (
    <Box sx={{ minHeight: '100vh', background: bg, p: { xs: 2, md: 3 }, direction: 'rtl' }}>

      {/* ── Header ── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring', stiffness: 120 }}>
        <Glass sx={{ p: 3, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: 3, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: '0 8px 24px #f59e0b44' }}>📊</Box>
            <Box>
              <Typography variant="h5" fontWeight={800} sx={{ background: G, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                لوحة التقارير والتحليلات
              </Typography>
              <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                مركز التقارير الذكي المتكامل
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Chip label="● مباشر" size="small" sx={{ background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44', fontWeight: 700 }} />
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
              onClick={() => setRefresh(r => r + 1)}
              style={{ background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)'), borderRadius: 10, padding: '8px 14px', cursor: 'pointer', color: isDark ? '#fff' : '#000', fontSize: 13 }}>
              🔄 تحديث
            </motion.button>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.96 }}
              onClick={() => setDialogOpen(true)}
              style={{ background: G, border: 'none', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', color: '#fff', fontWeight: 700, fontSize: 13, boxShadow: '0 4px 16px #f59e0b44' }}>
              + إنشاء تقرير
            </motion.button>
          </Box>
        </Glass>
      </motion.div>

      {/* ── KPI Cards ── */}
      <Grid container spacing={2} mb={3}>
        {(loading ? Array(6).fill(null) : data?.kpis || []).map((kpi, i) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
            {loading ? <Skeleton variant="rounded" height={160} sx={{ borderRadius: 3 }} /> :
              <KPICard {...kpi} delay={i * 0.07} />}
          </Grid>
        ))}
      </Grid>

      {/* ── Tabs ── */}
      <Glass sx={{ p: 1.5, mb: 3, display: 'flex', gap: 1, overflowX: 'auto', flexWrap: 'nowrap' }}>
        {TABS.map((t, i) => (
          <TabBtn key={i} label={t.label} icon={t.icon} active={tab === i} onClick={() => setTab(i)} />
        ))}
      </Glass>

      {/* ── Content ── */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.25 }}>

          {/* ── TAB 0: Overview ── */}
          {tab === 0 && !loading && (
            <Grid container spacing={3}>
              {/* Bar Chart */}
              <Grid item xs={12} md={8}>
                <Glass sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📊 التقارير الشهرية - 2025</Typography>
                  <BarChart data={data?.monthlyTrend || []} color1="#f59e0b" color2="#ef4444" height={130} />
                </Glass>
              </Grid>
              {/* Gauges */}
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🎯 مؤشرات الجودة</Typography>
                  <Grid container spacing={2} justifyContent="center">
                    {(data?.gauges || []).map((g, i) => (
                      <Grid item xs={6} key={i} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Ring value={g.value} color={g.color} label={g.label} size={90} />
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>
              {/* Donut-like distribution */}
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🍩 توزيع التقارير حسب النوع</Typography>
                  {(data?.typeDistribution || []).map((item, i) => (
                    <Box key={i} sx={{ mb: 1.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)' }}>{item.label}</Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ color: item.color }}>{item.value}%</Typography>
                      </Box>
                      <Box sx={{ height: 6, borderRadius: 3, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${item.value}%` }} transition={{ delay: i * 0.1, duration: 0.7 }}
                          style={{ height: '100%', borderRadius: 3, background: item.color }} />
                      </Box>
                    </Box>
                  ))}
                </Glass>
              </Grid>
              {/* Weekly Line */}
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📉 نشاط هذا الأسبوع</Typography>
                  <LineChart data={data?.weeklyLine || []} color="#f59e0b" height={90} width={280} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1 }}>
                    {['أحد', 'اثن', 'ثلا', 'أرب', 'خمس', 'جمع', 'سبت'].map((d, i) => (
                      <Typography key={i} variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', fontSize: 9 }}>{d}</Typography>
                    ))}
                  </Box>
                </Glass>
              </Grid>
              {/* Quick Metrics */}
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <MetricCard label="حجم البيانات الإجمالي" value="47.3 GB" icon="🗄️" color="#6366f1" change={12} />
                  <MetricCard label="متوسط وقت التقرير" value="2.3 ثانية" icon="⚡" color="#f59e0b" change={-15} />
                  <MetricCard label="التقارير المصدّرة PDF" value="893" icon="📄" color="#22c55e" change={8} />
                </Box>
              </Grid>
            </Grid>
          )}

          {/* ── TAB 1: Reports List ── */}
          {tab === 1 && !loading && (
            <Glass sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="h6" fontWeight={700} sx={{ flex: 1, color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📋 جميع التقارير</Typography>
                <TextField size="small" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)}
                  InputProps={{ sx: { borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: isDark ? '#fff' : '#000' } }}
                  sx={{ minWidth: 180 }} />
                <FormControl size="small" sx={{ minWidth: 130 }}>
                  <Select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    sx={{ borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', color: isDark ? '#fff' : '#000' }}>
                    {['الكل', 'مالي', 'HR', 'مرضى', 'جدولة', 'عمليات', 'تحليلي'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' }}>
                      {['اسم التقرير', 'النوع', 'الحالة', 'التاريخ', 'الحجم', 'إجراءات'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredReports.map((r) => (
                      <ReportRow key={r.id} report={r} onView={() => {}} onDownload={() => {}} />
                    ))}
                    {filteredReports.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40, color: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)' }}>لا توجد تقارير مطابقة</td></tr>
                    )}
                  </tbody>
                </table>
              </Box>
            </Glass>
          )}

          {/* ── TAB 2: Analytics ── */}
          {tab === 2 && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📊 اتجاه الطلبات الشهري</Typography>
                  <BarChart data={data?.monthlyTrend || []} color1="#6366f1" color2="#8b5cf6" height={120} />
                </Glass>
              </Grid>
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📈 أداء المنصة</Typography>
                  <Grid container spacing={2} mt={1}>
                    {[
                      { label: 'وقت الاستجابة', value: '99.8%', sub: 'uptime', color: '#22c55e', icon: '✅' },
                      { label: 'معدل الخطأ', value: '0.2%', sub: 'من الطلبات', color: '#ef4444', icon: '❌' },
                      { label: 'طلبات/دقيقة', value: '124', sub: 'الآن', color: '#f59e0b', icon: '⚡' },
                      { label: 'استخدام الذاكرة', value: '68%', sub: 'من المتاح', color: '#6366f1', icon: '💾' },
                    ].map((m, i) => (
                      <Grid item xs={6} key={i}>
                        <MetricCard label={m.label} value={m.value} icon={m.icon} color={m.color} />
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>
              <Grid item xs={12}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🎯 مؤشرات الجودة التفصيلية</Typography>
                  <Grid container spacing={3} justifyContent="center">
                    {(data?.gauges || []).map((g, i) => (
                      <Grid item key={i} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <Ring value={g.value} color={g.color} label={g.label} size={100} />
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ── TAB 3: Scheduling ── */}
          {tab === 3 && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🗓️ التقارير المجدولة</Typography>
                  {[
                    { name: 'التقرير المالي الأسبوعي', next: 'كل اثنين 08:00', type: 'مالي', color: '#22c55e' },
                    { name: 'تقرير الحضور والغياب', next: 'يوميًا 07:00', type: 'HR', color: '#6366f1' },
                    { name: 'إحصائيات المرضى اليومية', next: 'يوميًا 23:00', type: 'مرضى', color: '#06b6d4' },
                    { name: 'تقرير أداء النظام', next: 'كل ساعة', type: 'عمليات', color: '#f59e0b' },
                    { name: 'التقرير الشهري الشامل', next: 'أول كل شهر 06:00', type: 'تحليلي', color: '#8b5cf6' },
                    { name: 'تقرير المخاطر بالذكاء الاصطناعي', next: 'كل أحد 09:00', type: 'تحليلي', color: '#ec4899' },
                  ].map((s, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, mb: 1.5, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: 2, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, border: `1px solid ${s.color}33` }}>🗓️</Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.85)' }}>{s.name}</Typography>
                          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>التالي: {s.next}</Typography>
                        </Box>
                        <Chip label={s.type} size="small" sx={{ background: `${s.color}22`, color: s.color, border: `1px solid ${s.color}33`, fontSize: 10 }} />
                        <IconButton size="small" sx={{ color: '#ef4444', fontSize: 14 }}>⏸️</IconButton>
                      </Box>
                    </motion.div>
                  ))}
                </Glass>
              </Grid>
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📊 إحصائيات الجدولة</Typography>
                  {[
                    { label: 'تقارير مجدولة نشطة', value: '12', icon: '✅', color: '#22c55e' },
                    { label: 'إجمالي التشغيلات اليوم', value: '48', icon: '▶️', color: '#6366f1' },
                    { label: 'فشل في آخر 7 أيام', value: '3', icon: '❌', color: '#ef4444' },
                    { label: 'متوسط وقت التنفيذ', value: '18 ث', icon: '⏱️', color: '#f59e0b' },
                  ].map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 1.5, borderRadius: 2, background: `${s.color}11`, border: `1px solid ${s.color}22` }}>
                      <span style={{ fontSize: 20 }}>{s.icon}</span>
                      <Box>
                        <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>{s.label}</Typography>
                        <Typography variant="h6" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ── TAB 4: Top Users ── */}
          {tab === 4 && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🏆 أكثر المستخدمين نشاطًا</Typography>
                  {(data?.topUsers || []).map((u, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, mb: 1.5, borderRadius: 2, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>
                        <Box sx={{ width: 36, height: 36, borderRadius: '50%', background: i === 0 ? '#f59e0b22' : i === 1 ? '#94a3b822' : '#cd7f3222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: `2px solid ${i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#cd7f32'}` }}>{u.avatar}</Box>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>{u.name}</Typography>
                          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>{u.role}</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" fontWeight={800} sx={{ color: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#cd7f32', lineHeight: 1 }}>{u.reports}</Typography>
                          <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)', fontSize: 9 }}>تقرير</Typography>
                        </Box>
                        <Box sx={{ width: 28, height: 28, borderRadius: '50%', background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#cd7f32', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 13 }}>{i + 1}</Box>
                      </Box>
                    </motion.div>
                  ))}
                </Glass>
              </Grid>
              <Grid item xs={12} md={5}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>📊 نشاط المستخدمين حسب القسم</Typography>
                  {[
                    { dept: 'المالية', count: 312, pct: 78, color: '#22c55e' },
                    { dept: 'الموارد البشرية', count: 248, pct: 62, color: '#6366f1' },
                    { dept: 'الأطباء', count: 198, pct: 50, color: '#06b6d4' },
                    { dept: 'الإدارة', count: 167, pct: 42, color: '#f59e0b' },
                    { dept: 'العمليات', count: 89, pct: 22, color: '#8b5cf6' },
                  ].map((d, i) => (
                    <Box key={i} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="body2" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)' }}>{d.dept}</Typography>
                        <Typography variant="caption" fontWeight={700} sx={{ color: d.color }}>{d.count} تقرير</Typography>
                      </Box>
                      <Box sx={{ height: 8, borderRadius: 4, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${d.pct}%` }} transition={{ delay: i * 0.1, duration: 0.8 }}
                          style={{ height: '100%', borderRadius: 4, background: d.color }} />
                      </Box>
                    </Box>
                  ))}
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ── TAB 5: AI Insights ── */}
          {tab === 5 && !loading && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Glass sx={{ p: 3, mb: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ width: 44, height: 44, borderRadius: 2, background: 'linear-gradient(135deg,#f59e0b,#ef4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🤖</Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>تحليلات الذكاء الاصطناعي للتقارير</Typography>
                      <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)' }}>رؤى ذكية مبنية على بيانات الاستخدام وأنماط التقارير</Typography>
                    </Box>
                  </Box>
                  <Grid container spacing={2}>
                    {(data?.aiInsights || []).map((ins, i) => (
                      <Grid item xs={12} md={6} key={i}>
                        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
                          <Box sx={{ p: 2.5, borderRadius: 2, background: `${ins.color}0d`, border: `1px solid ${ins.color}33`, height: '100%' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                              <span style={{ fontSize: 22 }}>{ins.icon}</span>
                              <Typography variant="body2" fontWeight={700} sx={{ color: ins.color }}>{ins.title}</Typography>
                            </Box>
                            <Typography variant="body2" sx={{ color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)', lineHeight: 1.7 }}>{ins.text}</Typography>
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>
              {/* Prediction Cards */}
              <Grid item xs={12}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={3} sx={{ color: isDark ? 'rgba(255,255,255,0.9)' : 'rgba(0,0,0,0.85)' }}>🔮 توقعات الشهر القادم</Typography>
                  <Grid container spacing={2}>
                    {[
                      { label: 'عدد التقارير المتوقعة', value: '+18%', detail: '~1,472 تقرير', icon: '📊', color: '#6366f1' },
                      { label: 'الطلبات المتوقعة', value: '+22%', detail: 'نهاية الربع الأول', icon: '📈', color: '#22c55e' },
                      { label: 'وقت المعالجة المتوقع', value: '−12%', detail: 'تحسين الخوارزميات', icon: '⚡', color: '#f59e0b' },
                      { label: 'تقارير الذكاء الاصطناعي', value: '+35%', detail: 'زيادة الطلب', icon: '🤖', color: '#ec4899' },
                    ].map((p, i) => (
                      <Grid item xs={12} sm={6} md={3} key={i}>
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                          <Box sx={{ p: 2.5, borderRadius: 2, background: `${p.color}0d`, border: `1px solid ${p.color}33`, textAlign: 'center' }}>
                            <span style={{ fontSize: 28 }}>{p.icon}</span>
                            <Typography variant="h5" fontWeight={800} sx={{ color: p.color, mt: 1 }}>{p.value}</Typography>
                            <Typography variant="body2" fontWeight={600} sx={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)', mt: 0.5 }}>{p.label}</Typography>
                            <Typography variant="caption" sx={{ color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)' }}>{p.detail}</Typography>
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* Loading Skeleton */}
          {loading && (
            <Grid container spacing={3}>
              {Array(4).fill(null).map((_, i) => (
                <Grid item xs={12} md={6} key={i}>
                  <Skeleton variant="rounded" height={220} sx={{ borderRadius: 3 }} />
                </Grid>
              ))}
            </Grid>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Create Report Dialog ── */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { background: isDark ? '#1a1a2e' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 3, direction: 'rtl' } }}>
        <DialogTitle sx={{ background: G, color: '#fff', fontWeight: 700, borderRadius: '12px 12px 0 0' }}>
          📊 إنشاء تقرير جديد
        </DialogTitle>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <TextField label="اسم التقرير" fullWidth value={newReport.name} onChange={e => setNewReport(p => ({ ...p, name: e.target.value }))}
            InputLabelProps={{ sx: { right: 14, left: 'auto', transformOrigin: 'right top' } }} />
          <FormControl fullWidth>
            <InputLabel sx={{ right: 14, left: 'auto', transformOrigin: 'right top' }}>نوع التقرير</InputLabel>
            <Select value={newReport.type} onChange={e => setNewReport(p => ({ ...p, type: e.target.value }))} label="نوع التقرير">
              {['مالي', 'HR', 'مرضى', 'جدولة', 'عمليات', 'تحليلي'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="الفترة الزمنية" fullWidth value={newReport.period} onChange={e => setNewReport(p => ({ ...p, period: e.target.value }))}
            placeholder="مثال: مارس 2026"
            InputLabelProps={{ sx: { right: 14, left: 'auto', transformOrigin: 'right top' } }} />
          <FormControl fullWidth>
            <InputLabel sx={{ right: 14, left: 'auto', transformOrigin: 'right top' }}>صيغة الإخراج</InputLabel>
            <Select value={newReport.format} onChange={e => setNewReport(p => ({ ...p, format: e.target.value }))} label="صيغة الإخراج">
              {['PDF', 'Excel', 'CSV', 'JSON'].map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ borderRadius: 2 }}>إلغاء</Button>
          <Button variant="contained" onClick={handleGenerate} disabled={generating || !newReport.name}
            sx={{ background: G, borderRadius: 2, fontWeight: 700, minWidth: 130 }}>
            {generating ? <><CircularProgress size={16} sx={{ color: '#fff', mr: 1 }} /> جاري الإنشاء...</> : '🚀 إنشاء التقرير'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
