/**
 * OperationsProDashboard — لوحة العمليات والتشغيل البريميوم
 * Premium Glassmorphism Dashboard for Operations & Facility Management
 *
 * Gradient: #ef4444 → #f59e0b → #22c55e
 */

import { useTheme, alpha, TableRow,
} from '@mui/material';


import SettingsIcon from '@mui/icons-material/Settings';
import BuildIcon from '@mui/icons-material/Build';
import InventoryIcon from '@mui/icons-material/Inventory';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import EngineeringIcon from '@mui/icons-material/Engineering';

/* ═══════════════════════════════════════════════════════════════════ */
const GRAD = ['#ef4444', '#f59e0b', '#22c55e'];
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
  { label: 'أوامر العمل النشطة', value: '١٤٧', change: '+١٢', icon: BuildIcon, color: GRAD[0] },
  { label: 'نسبة التشغيل', value: '٩٤٪', change: '+٢٪', icon: SettingsIcon, color: GRAD[1] },
  { label: 'أصناف المخزون', value: '٢,٤٨٠', change: '+٨٥', icon: InventoryIcon, color: GRAD[2] },
  { label: 'طلبات الشراء', value: '٦٨', change: '+٩', icon: LocalShippingIcon, color: '#6366f1' },
  { label: 'طلبات الصيانة', value: '٣٢', change: '-٥', icon: EngineeringIcon, color: '#06b6d4' },
  { label: 'حوادث مُبلّغة', value: '٣', change: '-٢', icon: WarningAmberIcon, color: '#ec4899' },
];

/* ═══════════════════════════════════════════════════════════════════ */
const MONTHLY_OPERATIONS = [
  { month: 'يناير', workOrders: 125, completed: 118, maintenance: 28 },
  { month: 'فبراير', workOrders: 132, completed: 125, maintenance: 24 },
  { month: 'مارس', workOrders: 148, completed: 140, maintenance: 32 },
  { month: 'أبريل', workOrders: 138, completed: 130, maintenance: 26 },
  { month: 'مايو', workOrders: 155, completed: 148, maintenance: 30 },
  { month: 'يونيو', workOrders: 162, completed: 155, maintenance: 35 },
  { month: 'يوليو', workOrders: 145, completed: 138, maintenance: 28 },
  { month: 'أغسطس', workOrders: 158, completed: 150, maintenance: 32 },
  { month: 'سبتمبر', workOrders: 172, completed: 165, maintenance: 38 },
  { month: 'أكتوبر', workOrders: 168, completed: 160, maintenance: 34 },
  { month: 'نوفمبر', workOrders: 180, completed: 172, maintenance: 40 },
  { month: 'ديسمبر', workOrders: 175, completed: 168, maintenance: 36 },
];

const RESOURCE_ALLOCATION = [
  { name: 'صيانة', value: 30, color: GRAD[0] },
  { name: 'تشغيل', value: 25, color: GRAD[1] },
  { name: 'مشتريات', value: 20, color: GRAD[2] },
  { name: 'نقل وإمداد', value: 15, color: '#6366f1' },
  { name: 'أمن وسلامة', value: 10, color: '#06b6d4' },
];

const FACILITY_METRICS = [
  { metric: 'كفاءة الطاقة', value: 88, fullMark: 100 },
  { metric: 'استخدام المساحات', value: 75, fullMark: 100 },
  { metric: 'جودة الخدمات', value: 92, fullMark: 100 },
  { metric: 'زمن الاستجابة', value: 85, fullMark: 100 },
  { metric: 'رضا المستفيدين', value: 90, fullMark: 100 },
  { metric: 'السلامة المهنية', value: 95, fullMark: 100 },
];

const INVENTORY_STATUS = [
  { category: 'مستلزمات طبية', available: 850, reorderPoint: 200, status: 'good' },
  { category: 'أدوات مكتبية', available: 420, reorderPoint: 150, status: 'good' },
  { category: 'معدات تأهيلية', available: 95, reorderPoint: 50, status: 'warning' },
  { category: 'مواد نظافة', available: 180, reorderPoint: 200, status: 'critical' },
  { category: 'قطع غيار', available: 310, reorderPoint: 100, status: 'good' },
  { category: 'مستلزمات IT', available: 125, reorderPoint: 80, status: 'warning' },
];

const WORK_ORDERS = [
  { id: 'WO-3401', title: 'صيانة نظام التكييف — المبنى A', assignee: 'فريق الصيانة', priority: 'high', status: 'active', date: '٢٠٢٦/٠٣/٣٠' },
  { id: 'WO-3402', title: 'إصلاح شبكة المياه — الدور الثاني', assignee: 'م. سعد الحربي', priority: 'critical', status: 'active', date: '٢٠٢٦/٠٣/٣٠' },
  { id: 'WO-3403', title: 'تركيب كاميرات مراقبة — المدخل', assignee: 'فريق الأمن', priority: 'medium', status: 'pending', date: '٢٠٢٦/٠٣/٣١' },
  { id: 'WO-3404', title: 'فحص معدات الإطفاء الدوري', assignee: 'م. خالد العتيبي', priority: 'medium', status: 'completed', date: '٢٠٢٦/٠٣/٢٩' },
  { id: 'WO-3405', title: 'تحديث أنظمة الإضاءة LED', assignee: 'فريق الكهرباء', priority: 'low', status: 'pending', date: '٢٠٢٦/٠٤/٠٢' },
  { id: 'WO-3406', title: 'صيانة المصاعد — فحص ربع سنوي', assignee: 'شركة المصاعد', priority: 'high', status: 'active', date: '٢٠٢٦/٠٣/٣١' },
  { id: 'WO-3407', title: 'تنظيف خزانات المياه', assignee: 'م. فهد الدوسري', priority: 'medium', status: 'completed', date: '٢٠٢٦/٠٣/٢٨' },
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

const PriorityChip = ({ priority }) => {
  const map = {
    critical: { label: 'حرج', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: <ErrorIcon sx={{ fontSize: 14 }} /> },
    high: { label: 'عالي', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: <WarningAmberIcon sx={{ fontSize: 14 }} /> },
    medium: { label: 'متوسط', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', icon: <PendingIcon sx={{ fontSize: 14 }} /> },
    low: { label: 'منخفض', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: <CheckCircleIcon sx={{ fontSize: 14 }} /> },
  };
  const s = map[priority] || map.medium;
  return (
    <Chip icon={s.icon} label={s.label} size="small"
      sx={{ height: 24, fontSize: '0.7rem', fontWeight: 600, backgroundColor: s.bg, color: s.color, border: `1px solid ${alpha(s.color, 0.25)}`, '& .MuiChip-icon': { color: s.color }, '& .MuiChip-label': { px: 0.8 } }}
    />
  );
};

const StatusChip = ({ status }) => {
  const map = {
    active: { label: 'جاري', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    completed: { label: 'مكتمل', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    pending: { label: 'قيد الانتظار', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  };
  const s = map[status] || map.pending;
  return <Chip label={s.label} size="small" sx={{ height: 22, fontSize: '0.65rem', fontWeight: 600, backgroundColor: s.bg, color: s.color, border: `1px solid ${alpha(s.color, 0.2)}`, '& .MuiChip-label': { px: 0.6 } }} />;
};

/* ═══════════════════════════════════════════════════════════════════ */
export default function OperationsProDashboard() {
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
                <SettingsIcon sx={{ fontSize: 28, color: '#fff' }} />
              </Box>
              <Box>
                <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.8rem' }, background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', lineHeight: 1.2 }}>
                  لوحة العمليات والتشغيل
                </Typography>
                <Typography sx={{ fontSize: '0.9rem', color: isDark ? 'rgba(255,255,255,0.55)' : '#64748B', mt: 0.25 }}>
                  إدارة أوامر العمل والصيانة والمخزون والمرافق
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
                  <Chip label={kpi.change} size="small" sx={{ height: 20, fontSize: '0.65rem', fontWeight: 700, backgroundColor: kpi.change.startsWith('-') ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: kpi.change.startsWith('-') ? '#10b981' : '#f59e0b', '& .MuiChip-label': { px: 0.6 } }} />
                </Card>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {/* ── Row 1: Monthly Ops + Resource Allocation ─────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={TrendingUpIcon} title="أوامر العمل الشهرية" isDark={isDark} />
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={MONTHLY_OPERATIONS}>
                <defs>
                  <linearGradient id="opsGradWO" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GRAD[1]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GRAD[1]} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="opsGradComp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={GRAD[2]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={GRAD[2]} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <RTooltip contentStyle={{ background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)', border: 'none', borderRadius: 12, backdropFilter: 'blur(10px)' }} />
                <Legend />
                <Area type="monotone" dataKey="workOrders" name="أوامر العمل" stroke={GRAD[1]} fill="url(#opsGradWO)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="completed" name="المنجز" stroke={GRAD[2]} fill="url(#opsGradComp)" strokeWidth={2.5} />
                <Area type="monotone" dataKey="maintenance" name="الصيانة" stroke={GRAD[0]} fill={alpha(GRAD[0], 0.1)} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
        <Grid item xs={12} md={4}>
          <GlassCard isDark={isDark} sx={{ height: '100%' }}>
            <SectionHeader icon={SettingsIcon} title="توزيع الموارد" isDark={isDark} />
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={RESOURCE_ALLOCATION} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value">
                  {RESOURCE_ALLOCATION.map((entry, i) => (<Cell key={i} fill={entry.color} stroke="none" />))}
                </Pie>
                <RTooltip contentStyle={{ background: isDark ? 'rgba(15,23,42,0.9)' : 'rgba(255,255,255,0.95)', border: 'none', borderRadius: 12 }} />
                <Legend formatter={(val) => <span style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B' }}>{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Row 2: Facility Radar + Inventory ────────────────── */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={EngineeringIcon} title="مقاييس أداء المرافق" isDark={isDark} />
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={FACILITY_METRICS}>
                <PolarGrid stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'} />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: isDark ? '#94A3B8' : '#64748B' }} />
                <PolarRadiusAxis tick={{ fontSize: 9 }} domain={[0, 100]} />
                <Radar name="الأداء الحالي" dataKey="value" stroke={GRAD[1]} fill={alpha(GRAD[1], 0.25)} strokeWidth={2} />
                <Legend formatter={(val) => <span style={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B' }}>{val}</span>} />
              </RadarChart>
            </ResponsiveContainer>
          </GlassCard>
        </Grid>
        <Grid item xs={12} md={7}>
          <GlassCard isDark={isDark}>
            <SectionHeader icon={InventoryIcon} title="حالة المخزون" isDark={isDark} />
            {INVENTORY_STATUS.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 * i }}>
                <Box sx={{ p: 1.5, borderRadius: '12px', mb: 1.5, background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'}` }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography sx={{ fontSize: '0.82rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#1E293B' }}>{item.category}</Typography>
                    <Chip label={item.status === 'good' ? 'جيد' : item.status === 'warning' ? 'تحذير' : 'حرج'} size="small"
                      sx={{ height: 20, fontSize: '0.62rem', fontWeight: 700,
                        backgroundColor: item.status === 'good' ? 'rgba(16,185,129,0.12)' : item.status === 'warning' ? 'rgba(245,158,11,0.12)' : 'rgba(239,68,68,0.12)',
                        color: item.status === 'good' ? '#10b981' : item.status === 'warning' ? '#f59e0b' : '#ef4444',
                        '& .MuiChip-label': { px: 0.6 } }} />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinearProgress variant="determinate" value={Math.min((item.available / (item.reorderPoint * 3)) * 100, 100)}
                      sx={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        '& .MuiLinearProgress-bar': { borderRadius: 3, background: item.status === 'good' ? GRAD[2] : item.status === 'warning' ? GRAD[1] : GRAD[0] } }} />
                    <Typography sx={{ fontSize: '0.7rem', fontWeight: 600, color: isDark ? '#94A3B8' : '#64748B', minWidth: 50 }}>{item.available} وحدة</Typography>
                  </Box>
                </Box>
              </motion.div>
            ))}
          </GlassCard>
        </Grid>
      </Grid>

      {/* ── Row 3: Work Orders Table ─────────────────────────── */}
      <GlassCard isDark={isDark} sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <SectionHeader icon={BuildIcon} title="أوامر العمل الحالية" isDark={isDark} />
          <Tooltip title="تحديث"><IconButton size="small"><RefreshIcon sx={{ fontSize: 18, color: isDark ? '#94A3B8' : '#64748B' }} /></IconButton></Tooltip>
        </Box>
        <TableContainer sx={{ maxHeight: 400 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {['الرمز', 'الوصف', 'المسؤول', 'الأولوية', 'الحالة', 'التاريخ'].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#64748B', backgroundColor: isDark ? 'rgba(15,23,42,0.8)' : 'rgba(248,250,252,0.95)', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}` }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {WORK_ORDERS.map((wo, i) => (
                <motion.tr key={wo.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }} component={TableRow} style={{ display: 'table-row' }}>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: GRAD[0], fontFamily: 'monospace', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{wo.id}</TableCell>
                  <TableCell sx={{ fontSize: '0.78rem', fontWeight: 600, color: isDark ? '#E2E8F0' : '#334155', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`, maxWidth: 250 }}>{wo.title}</TableCell>
                  <TableCell sx={{ fontSize: '0.75rem', color: isDark ? '#94A3B8' : '#64748B', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{wo.assignee}</TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}><PriorityChip priority={wo.priority} /></TableCell>
                  <TableCell sx={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}><StatusChip status={wo.status} /></TableCell>
                  <TableCell sx={{ fontSize: '0.72rem', color: isDark ? '#94A3B8' : '#94A3B8', fontFamily: 'monospace', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}` }}>{wo.date}</TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </GlassCard>

      {/* ── Footer ────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
        <Box sx={{ mt: 4, p: 2.5, borderRadius: '16px', background: isDark ? alpha(GRAD[1], 0.08) : alpha(GRAD[1], 0.04), border: `1px solid ${isDark ? alpha(GRAD[1], 0.2) : alpha(GRAD[1], 0.1)}`, display: 'flex', alignItems: 'center', gap: 2 }}>
          <AutoAwesomeIcon sx={{ fontSize: 20, color: GRAD[1], flexShrink: 0 }} />
          <Typography sx={{ fontSize: '0.82rem', color: isDark ? 'rgba(255,255,255,0.5)' : '#64748B' }}>
            لوحة العمليات والتشغيل — متابعة أوامر العمل والصيانة وإدارة المخزون والمرافق في الوقت الفعلي
          </Typography>
        </Box>
      </motion.div>
    </Box>
  );
}
