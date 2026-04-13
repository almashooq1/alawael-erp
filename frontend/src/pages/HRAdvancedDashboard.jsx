/**
 * HRAdvancedDashboard.jsx — لوحة الموارد البشرية المتقدمة
 * تصميم Glassmorphism بريميوم | Framer Motion | RTL | Dark/Light
 */
import { useState, useEffect, useCallback, memo } from 'react';
import { useTheme, alpha,
} from '@mui/material';
import { motion } from 'framer-motion';

/* ─── Glass component ─── */
const Glass = memo(({ children, sx = {}, ...rest }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  return (
    <Box
      sx={{
        background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.72)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.9)'}`,
        borderRadius: 3,
        ...sx,
      }}
      {...rest}
    >
      {children}
    </Box>
  );
});

/* ─── KPI Card ─── */
const KPICard = memo(({ title, value, subtitle, icon, gradient, trend, delay = 0 }) => {
  const theme = useTheme();
  const up = trend >= 0;
  return (
    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring', stiffness: 120 }}>
      <Glass sx={{
        p: 2.5, height: '100%', position: 'relative', overflow: 'hidden',
        transition: 'transform .2s, box-shadow .2s',
        '&:hover': { transform: 'translateY(-4px)', boxShadow: `0 16px 40px ${alpha(theme.palette.common.black, .15)}` },
      }}>
        <Box sx={{ position: 'absolute', insetInlineEnd: -20, top: -20, width: 90, height: 90, borderRadius: '50%', background: gradient, opacity: .12 }} />
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ width: 42, height: 42, borderRadius: 2, background: gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
            {icon}
          </Box>
          <Chip size="small"
            icon={up ? <TrendingUpIcon sx={{ fontSize: 13 }} /> : <TrendingDownIcon sx={{ fontSize: 13 }} />}
            label={`${up ? '+' : ''}${trend}%`}
            sx={{ background: alpha(up ? '#22c55e' : '#ef4444', .15), color: up ? '#16a34a' : '#dc2626', fontWeight: 700, fontSize: 11 }}
          />
        </Box>
        <Typography variant="h4" fontWeight={800} sx={{ background: gradient, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {value}
        </Typography>
        <Typography variant="body2" fontWeight={600} color="text.primary" mt={0.5}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
      </Glass>
    </motion.div>
  );
});

/* ─── Tab Button ─── */
const TabBtn = memo(({ label, active, onClick, count, color = '#6366f1' }) => {
  const theme = useTheme();
  return (
    <motion.button onClick={onClick} whileTap={{ scale: .96 }} style={{
      background: active ? `linear-gradient(135deg,${color},${color}cc)` : 'transparent',
      color: active ? '#fff' : theme.palette.text.secondary,
      border: active ? 'none' : `1px solid ${alpha(theme.palette.divider, .5)}`,
      borderRadius: 10, padding: '7px 16px', cursor: 'pointer',
      fontWeight: active ? 700 : 500, fontSize: 13,
      display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s',
    }}>
      {label}
      {count !== undefined && (
        <Box component="span" sx={{ background: active ? 'rgba(255,255,255,.25)' : alpha(color, .15), borderRadius: 10, px: .8, py: .1, fontSize: 11, fontWeight: 700, color: active ? '#fff' : color }}>
          {count}
        </Box>
      )}
    </motion.button>
  );
});

/* ─── Employee Row ─── */
const EmployeeRow = memo(({ name, role, dept, score, status, joinDate }) => {
  const theme = useTheme();
  const statusColors = { نشط: '#22c55e', إجازة: '#f59e0b', غائب: '#ef4444', 'في التدريب': '#6366f1' };
  const c = statusColors[status] || '#6366f1';
  return (
    <TableRow sx={{ '&:hover': { background: alpha(theme.palette.primary.main, .04) }, transition: 'background .2s' }}>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ width: 36, height: 36, background: `linear-gradient(135deg,${c},${c}99)`, fontSize: 14, fontWeight: 700 }}>
            {name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="body2" fontWeight={600}>{name}</Typography>
            <Typography variant="caption" color="text.secondary">{role}</Typography>
          </Box>
        </Box>
      </TableCell>
      <TableCell><Typography variant="body2">{dept}</Typography></TableCell>
      <TableCell>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LinearProgress variant="determinate" value={score} sx={{ width: 60, height: 5, borderRadius: 3, '& .MuiLinearProgress-bar': { background: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444' } }} />
          <Typography variant="caption" fontWeight={700}>{score}%</Typography>
        </Box>
      </TableCell>
      <TableCell>
        <Chip size="small" label={status} sx={{ background: alpha(c, .15), color: c, fontWeight: 700, fontSize: 10 }} />
      </TableCell>
      <TableCell><Typography variant="caption" color="text.secondary">{joinDate}</Typography></TableCell>
    </TableRow>
  );
});

/* ─── Training Card ─── */
const TrainingCard = memo(({ title, instructor, enrolled, capacity, progress, category, delay = 0 }) => {
  const _theme = useTheme();
  const catColors = { 'طبي': '#06b6d4', 'إداري': '#6366f1', 'تقني': '#f59e0b', 'سلوكي': '#22c55e', 'سلامة': '#ef4444' };
  const c = catColors[category] || '#6366f1';
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, type: 'spring' }}>
      <Glass sx={{ p: 2.5, height: '100%', transition: 'transform .2s', '&:hover': { transform: 'translateY(-3px)' } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
          <Chip size="small" label={category} sx={{ background: alpha(c, .15), color: c, fontWeight: 700, fontSize: 10 }} />
          <Typography variant="caption" color="text.secondary">{enrolled}/{capacity} مسجل</Typography>
        </Box>
        <Typography variant="body1" fontWeight={700} mb={.5}>{title}</Typography>
        <Typography variant="caption" color="text.secondary" mb={1.5} display="block">المدرب: {instructor}</Typography>
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .5 }}>
            <Typography variant="caption" color="text.secondary">التقدم</Typography>
            <Typography variant="caption" fontWeight={700}>{progress}%</Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress} sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg,${c},${c}aa)` } }} />
        </Box>
      </Glass>
    </motion.div>
  );
});

/* ─── Alert Item ─── */
const AlertItem = memo(({ type, msg, dept, time }) => {
  const _theme = useTheme();
  const colors = { critical: '#ef4444', warning: '#f59e0b', info: '#6366f1', success: '#22c55e' };
  const c = colors[type] || colors.info;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1.5, borderInlineStart: `3px solid ${c}`, background: alpha(c, .06), borderRadius: '0 8px 8px 0', mb: 1 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0, boxShadow: `0 0 6px ${c}` }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body2" fontWeight={600}>{msg}</Typography>
        <Typography variant="caption" color="text.secondary">{dept} · {time}</Typography>
      </Box>
      <Chip size="small" label={type === 'critical' ? 'حرج' : type === 'warning' ? 'تحذير' : type === 'success' ? 'إنجاز' : 'معلومة'}
        sx={{ background: alpha(c, .15), color: c, fontWeight: 700, fontSize: 10 }} />
    </Box>
  );
});

/* ─── Ring Gauge ─── */
const RingGauge = memo(({ value, max = 100, color, label, size = 80 }) => {
  const r = 32;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(value / max, 1) * circ;
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: .5 }}>
      <svg width={size} height={size} viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(128,128,128,.15)" strokeWidth="8" />
        <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" transform="rotate(-90 40 40)" />
        <text x="40" y="45" textAnchor="middle" fill={color} fontSize="14" fontWeight="bold">{Math.round((value / max) * 100)}%</text>
      </svg>
      <Typography variant="caption" color="text.secondary" fontWeight={600} textAlign="center">{label}</Typography>
    </Box>
  );
});

/* ─── Demo Data ─── */
const DEMO = {
  kpis: [
    { title: 'إجمالي الموظفين', value: '348', subtitle: 'في جميع الفروع', icon: <GroupsIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', trend: 3.2 },
    { title: 'موظفون جدد', value: '12', subtitle: 'هذا الشهر', icon: <PersonAddIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#22c55e,#16a34a)', trend: 20 },
    { title: 'معدل الغياب', value: '4.2%', subtitle: 'هذا الأسبوع', icon: <EventBusyIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#ef4444,#dc2626)', trend: -8 },
    { title: 'متوسط الأداء', value: '82%', subtitle: 'تقييم الربع', icon: <StarIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', trend: 4.5 },
    { title: 'برامج التدريب', value: '14', subtitle: 'نشطة حالياً', icon: <SchoolIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#06b6d4,#0891b2)', trend: 16.7 },
    { title: 'الاستقالات', value: '3', subtitle: 'هذا الشهر', icon: <PersonOffIcon fontSize="small" />, gradient: 'linear-gradient(135deg,#f97316,#ea580c)', trend: -25 },
  ],
  employees: [
    { name: 'أحمد الشمري', role: 'معالج فيزيائي', dept: 'التأهيل', score: 92, status: 'نشط', joinDate: '2022-03-15' },
    { name: 'سارة القحطاني', role: 'ممرضة أولى', dept: 'التمريض', score: 88, status: 'نشط', joinDate: '2021-07-01' },
    { name: 'محمد العتيبي', role: 'أخصائي معالجة', dept: 'التأهيل', score: 76, status: 'في التدريب', joinDate: '2023-01-10' },
    { name: 'نورة البلوي', role: 'مديرة إدارية', dept: 'الإدارة', score: 95, status: 'نشط', joinDate: '2019-09-20' },
    { name: 'فيصل الدوسري', role: 'طبيب عام', dept: 'الطب', score: 84, status: 'إجازة', joinDate: '2020-05-12' },
    { name: 'منيرة الحربي', role: 'محاسبة', dept: 'المالية', score: 79, status: 'نشط', joinDate: '2022-11-03' },
    { name: 'خالد السبيعي', role: 'مسؤول IT', dept: 'التقنية', score: 87, status: 'نشط', joinDate: '2021-02-28' },
    { name: 'ريم المطيري', role: 'أخصائية نفسية', dept: 'الصحة النفسية', score: 91, status: 'نشط', joinDate: '2020-08-15' },
  ],
  trainings: [
    { title: 'إدارة المرضى الرقمية', instructor: 'د. خالد العمري', enrolled: 18, capacity: 20, progress: 65, category: 'تقني' },
    { title: 'بروتوكولات السلامة المهنية', instructor: 'م. سعد الغامدي', enrolled: 25, capacity: 25, progress: 100, category: 'سلامة' },
    { title: 'مهارات التواصل مع المرضى', instructor: 'د. هدى الزهراني', enrolled: 12, capacity: 15, progress: 40, category: 'سلوكي' },
    { title: 'تقنيات التأهيل الحديثة', instructor: 'د. فارس النمر', enrolled: 8, capacity: 10, progress: 80, category: 'طبي' },
    { title: 'إدارة الموارد البشرية', instructor: 'أ. منى السلمي', enrolled: 6, capacity: 8, progress: 55, category: 'إداري' },
    { title: 'الذكاء الاصطناعي في الرعاية', instructor: 'د. وليد المالكي', enrolled: 14, capacity: 15, progress: 30, category: 'تقني' },
  ],
  alerts: [
    { type: 'warning', msg: 'انتهاء عقود 3 موظفين خلال 30 يوماً', dept: 'الموارد البشرية', time: 'اليوم' },
    { type: 'critical', msg: 'نسبة غياب مرتفعة في قسم التأهيل (12%)', dept: 'التأهيل', time: 'منذ ساعتين' },
    { type: 'success', msg: 'اجتياز 25 موظف لبرنامج السلامة بنجاح', dept: 'التدريب', time: 'أمس' },
    { type: 'info', msg: 'موعد مراجعة الرواتب الربعية في 15 أبريل', dept: 'المالية', time: 'تذكير' },
    { type: 'warning', msg: 'طلب إجازة مفاجئة من 4 موظفين في نفس اليوم', dept: 'التمريض', time: 'منذ 4 ساعات' },
  ],
  deptDist: [
    { name: 'التأهيل', count: 89, color: '#6366f1' },
    { name: 'التمريض', count: 72, color: '#06b6d4' },
    { name: 'الطب', count: 45, color: '#22c55e' },
    { name: 'الإدارة', count: 38, color: '#f59e0b' },
    { name: 'التقنية', count: 28, color: '#ec4899' },
    { name: 'المالية', count: 22, color: '#f97316' },
    { name: 'أخرى', count: 54, color: '#8b5cf6' },
  ],
  performance: [
    { label: 'الرضا الوظيفي', value: 78, color: '#22c55e' },
    { label: 'الإنتاجية', value: 84, color: '#6366f1' },
    { label: 'الانضباط', value: 91, color: '#06b6d4' },
    { label: 'التطوير المهني', value: 72, color: '#f59e0b' },
  ],
  aiInsights: [
    { icon: '🎯', text: 'يُتوقع ارتفاع معدل الغياب في فصل الصيف — يُنصح بمراجعة سياسة الإجازات مسبقاً.' },
    { icon: '📊', text: 'موظفو قسم التأهيل الذين أتموا البرامج التدريبية أظهروا أداءً أعلى بنسبة 23%.' },
    { icon: '⚠️', text: '8 موظفين لم يجتازوا التقييم الربعي — يحتاجون برامج دعم مكثفة.' },
    { icon: '💡', text: 'توظيف 5 معالجين جدد في الرياض سيقلل العبء الوظيفي الحالي بنسبة 18%.' },
  ],
};

const TABS = ['نظرة عامة', 'الموظفون', 'التدريب والتطوير', 'الأداء', 'التنبيهات', 'ذكاء اصطناعي'];

/* ─── Main Component ─── */
export default function HRAdvancedDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [addDialog, setAddDialog] = useState(false);
  const [searchQ, setSearchQ] = useState('');

  const bg = isDark
    ? 'radial-gradient(ellipse at 20% 0%, rgba(34,197,94,.12) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(6,182,212,.1) 0%, transparent 50%), #0f0f1a'
    : 'radial-gradient(ellipse at 20% 0%, rgba(34,197,94,.07) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(6,182,212,.06) 0%, transparent 50%), #f1f5f9';

  const refresh = useCallback(() => {
    setLoading(true);
    setTimeout(() => { setLoading(false); setLastRefresh(new Date()); }, 700);
  }, []);

  useEffect(() => { const t = setTimeout(() => setLoading(false), 800); return () => clearTimeout(t); }, []);
  useEffect(() => { const id = setInterval(refresh, 5 * 60 * 1000); return () => clearInterval(id); }, [refresh]);

  const filteredEmp = DEMO.employees.filter(e =>
    !searchQ || e.name.includes(searchQ) || e.dept.includes(searchQ) || e.role.includes(searchQ)
  );

  return (
    <Box sx={{ minHeight: '100vh', background: bg, p: { xs: 2, md: 3 }, direction: 'rtl' }}>

      {/* ─── Header ─── */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .5 }}>
        <Glass sx={{
          p: { xs: 2.5, md: 3 }, mb: 3, overflow: 'hidden', position: 'relative',
          background: isDark
            ? 'linear-gradient(135deg,rgba(34,197,94,.18),rgba(6,182,212,.12))'
            : 'linear-gradient(135deg,rgba(34,197,94,.1),rgba(6,182,212,.07))',
        }}>
          <Box sx={{ position: 'absolute', insetInlineEnd: -60, top: -60, width: 240, height: 240, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#06b6d4)', opacity: .07 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Box sx={{ width: 56, height: 56, borderRadius: 3, background: 'linear-gradient(135deg,#22c55e,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(34,197,94,.35)' }}>
                <GroupsIcon sx={{ color: '#fff', fontSize: 28 }} />
              </Box>
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ background: 'linear-gradient(135deg,#22c55e,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  الموارد البشرية المتقدمة
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  إدارة شاملة وذكية لكادر المنظمة · آخر تحديث: {lastRefresh.toLocaleTimeString('ar-SA')}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: .95 }}>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setAddDialog(true)}
                  sx={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', borderRadius: 2, fontWeight: 700, boxShadow: '0 4px 14px rgba(34,197,94,.35)', fontSize: 13 }}
                >
                  إضافة موظف
                </Button>
              </motion.div>
              <Badge badgeContent={DEMO.alerts.filter(a => a.type === 'critical' || a.type === 'warning').length} color="warning">
                <IconButton size="small" sx={{ background: alpha(theme.palette.warning.main, .1) }}>
                  <NotificationsActiveIcon fontSize="small" color="warning" />
                </IconButton>
              </Badge>
              <Tooltip title="تحديث">
                <IconButton onClick={refresh} size="small" sx={{ background: alpha('#22c55e', .1) }}>
                  <RefreshIcon fontSize="small" sx={{ color: '#22c55e' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Quick stats */}
          <Box sx={{ display: 'flex', gap: 3, mt: 2.5, flexWrap: 'wrap' }}>
            {[
              { label: 'حضور اليوم', value: '324/348' },
              { label: 'في إجازة', value: '18' },
              { label: 'في التدريب', value: '6' },
              { label: 'نسبة الإشغال', value: '93%' },
            ].map((s, i) => (
              <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 6, height: 6, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#06b6d4)' }} />
                <Typography variant="caption" color="text.secondary">{s.label}:</Typography>
                <Typography variant="caption" fontWeight={700} sx={{ color: '#22c55e' }}>{s.value}</Typography>
              </Box>
            ))}
          </Box>
        </Glass>
      </motion.div>

      {/* ─── KPI Cards ─── */}
      {loading ? (
        <Grid container spacing={2} mb={3}>
          {[...Array(6)].map((_, i) => <Grid item xs={12} sm={6} md={4} lg={2} key={i}><Skeleton variant="rounded" height={140} sx={{ borderRadius: 3 }} /></Grid>)}
        </Grid>
      ) : (
        <Grid container spacing={2} mb={3}>
          {DEMO.kpis.map((k, i) => (
            <Grid item xs={12} sm={6} md={4} lg={2} key={i}>
              <KPICard {...k} delay={i * 0.07} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* ─── Tabs ─── */}
      <Glass sx={{ p: 1.5, mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {TABS.map((t, i) => (
          <TabBtn key={i} label={t} active={tab === i} onClick={() => setTab(i)}
            color="#22c55e"
            count={i === 4 ? DEMO.alerts.length : undefined}
          />
        ))}
      </Glass>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .3 }}>

          {/* ─── Tab 0: نظرة عامة ─── */}
          {tab === 0 && (
            <Grid container spacing={3}>
              {/* توزيع الأقسام */}
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>توزيع الموظفين حسب القسم</Typography>
                  {DEMO.deptDist.map((d, i) => {
                    const _pct = (d.count / DEMO.kpis[0].value.replace(',', '')) * 100;
                    return (
                      <Box key={i} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .4 }}>
                          <Typography variant="body2" fontWeight={600}>{d.name}</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ color: d.color }}>{d.count} موظف</Typography>
                        </Box>
                        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * .08, type: 'spring' }} style={{ transformOrigin: 'right' }}>
                          <LinearProgress variant="determinate" value={(d.count / 89) * 100} sx={{ height: 7, borderRadius: 4, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg,${d.color},${d.color}99)` } }} />
                        </motion.div>
                      </Box>
                    );
                  })}
                </Glass>
              </Grid>

              {/* مؤشرات الأداء */}
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>مؤشرات الموارد البشرية</Typography>
                  <Grid container spacing={2}>
                    {DEMO.performance.map((p, i) => (
                      <Grid item xs={6} key={i} sx={{ display: 'flex', justifyContent: 'center' }}>
                        <motion.div initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * .1 }}>
                          <RingGauge value={p.value} color={p.color} label={p.label} />
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                  <Divider sx={{ my: 2 }} />
                  <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 1 }}>
                    {[
                      { label: 'معدل الدوران', value: '8.6%', color: '#ef4444' },
                      { label: 'متوسط الخبرة', value: '4.2 سنة', color: '#6366f1' },
                      { label: 'نسبة التدريب', value: '41%', color: '#22c55e' },
                    ].map((s, i) => (
                      <Box key={i} sx={{ textAlign: 'center', p: 1.5, background: alpha(s.color, .08), borderRadius: 2, minWidth: 90 }}>
                        <Typography variant="h6" fontWeight={800} sx={{ color: s.color }}>{s.value}</Typography>
                        <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Glass>
              </Grid>

              {/* أحدث التنبيهات */}
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>أحدث التنبيهات</Typography>
                  {DEMO.alerts.slice(0, 3).map((a, i) => <AlertItem key={i} {...a} />)}
                </Glass>
              </Grid>

              {/* أفضل موظفين */}
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                    <EmojiEventsIcon sx={{ color: '#f59e0b' }} />
                    <Typography variant="h6" fontWeight={700}>أبرز الموظفين هذا الشهر</Typography>
                  </Box>
                  {DEMO.employees.sort((a, b) => b.score - a.score).slice(0, 4).map((e, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .08 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
                        <Box sx={{ width: 24, height: 24, borderRadius: '50%', background: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#92400e' : alpha('#6366f1', .3), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#fff' }}>
                          {i + 1}
                        </Box>
                        <Avatar sx={{ width: 34, height: 34, background: 'linear-gradient(135deg,#22c55e,#06b6d4)', fontSize: 13, fontWeight: 700 }}>
                          {e.name.charAt(0)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight={600}>{e.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{e.role}</Typography>
                        </Box>
                        <Chip size="small" label={`${e.score}%`} sx={{ background: alpha('#22c55e', .15), color: '#16a34a', fontWeight: 700 }} />
                      </Box>
                    </motion.div>
                  ))}
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ─── Tab 1: الموظفون ─── */}
          {tab === 1 && (
            <Glass sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h6" fontWeight={700}>قائمة الموظفين</Typography>
                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <TextField
                    size="small"
                    placeholder="بحث بالاسم أو القسم..."
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    sx={{ width: 220, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  />
                  <IconButton size="small" sx={{ background: alpha(theme.palette.primary.main, .1) }}>
                    <FilterListIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['الموظف', 'القسم', 'الأداء', 'الحالة', 'تاريخ الانضمام'].map(h => (
                      <TableCell key={h} sx={{ fontWeight: 700, color: 'text.secondary', fontSize: 12 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredEmp.map((e, i) => (
                    <motion.tr key={i} component={motion.tr} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * .05 }}>
                      <EmployeeRow {...e} />
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
              {filteredEmp.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography color="text.secondary">لا توجد نتائج مطابقة</Typography>
                </Box>
              )}
            </Glass>
          )}

          {/* ─── Tab 2: التدريب والتطوير ─── */}
          {tab === 2 && (
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Box>
                  <Typography variant="h6" fontWeight={700}>برامج التدريب والتطوير</Typography>
                  <Typography variant="caption" color="text.secondary">14 برنامج نشط | 132 موظف مسجل</Typography>
                </Box>
                <Chip label="نسبة الإتمام: 62%" icon={<SchoolIcon />} sx={{ background: alpha('#06b6d4', .15), color: '#06b6d4', fontWeight: 700 }} />
              </Box>
              <Grid container spacing={2.5}>
                {DEMO.trainings.map((t, i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <TrainingCard {...t} delay={i * .07} />
                  </Grid>
                ))}
              </Grid>

              <Glass sx={{ p: 3, mt: 3 }}>
                <Typography variant="h6" fontWeight={700} mb={2}>إحصائيات التدريب</Typography>
                <Grid container spacing={2}>
                  {[
                    { label: 'ساعات التدريب الإجمالية', value: '1,240 ساعة', color: '#6366f1', icon: <AccessTimeIcon /> },
                    { label: 'متوسط ساعات/موظف', value: '3.6 ساعة', color: '#22c55e', icon: <WorkIcon /> },
                    { label: 'نسبة النجاح', value: '87%', color: '#f59e0b', icon: <AssessmentIcon /> },
                    { label: 'ميزانية التدريب', value: '85,000 ر.س', color: '#06b6d4', icon: <MonetizationOnIcon /> },
                  ].map((s, i) => (
                    <Grid item xs={12} sm={6} md={3} key={i}>
                      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .08 }}>
                        <Box sx={{ p: 2, background: alpha(s.color, .1), borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Box sx={{ color: s.color }}>{s.icon}</Box>
                          <Box>
                            <Typography variant="body1" fontWeight={700} sx={{ color: s.color }}>{s.value}</Typography>
                            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                          </Box>
                        </Box>
                      </motion.div>
                    </Grid>
                  ))}
                </Grid>
              </Glass>
            </Box>
          )}

          {/* ─── Tab 3: الأداء ─── */}
          {tab === 3 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Glass sx={{ p: 3, background: isDark ? 'linear-gradient(135deg,rgba(245,158,11,.15),rgba(249,115,22,.1))' : 'linear-gradient(135deg,rgba(245,158,11,.08),rgba(249,115,22,.05))' }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>مراجعة الأداء الربعية — Q1 2026</Typography>
                  <Grid container spacing={2}>
                    {[
                      { label: 'متميز (90%+)', count: 68, color: '#22c55e' },
                      { label: 'جيد جداً (75-90%)', count: 142, color: '#6366f1' },
                      { label: 'جيد (60-75%)', count: 98, color: '#f59e0b' },
                      { label: 'يحتاج تطوير (<60%)', count: 40, color: '#ef4444' },
                    ].map((s, i) => (
                      <Grid item xs={6} md={3} key={i}>
                        <motion.div initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * .1 }}>
                          <Box sx={{ p: 2, background: alpha(s.color, .12), borderRadius: 2, textAlign: 'center', border: `1px solid ${alpha(s.color, .25)}` }}>
                            <Typography variant="h4" fontWeight={800} sx={{ color: s.color }}>{s.count}</Typography>
                            <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>

              <Grid item xs={12} md={7}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>أداء الأقسام</Typography>
                  {DEMO.deptDist.map((d, i) => {
                    const scores = [88, 84, 91, 79, 87, 82, 76];
                    return (
                      <Box key={i} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .5 }}>
                          <Typography variant="body2" fontWeight={600}>{d.name}</Typography>
                          <Typography variant="body2" fontWeight={700} sx={{ color: d.color }}>{scores[i]}%</Typography>
                        </Box>
                        <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: i * .1, type: 'spring' }} style={{ transformOrigin: 'right' }}>
                          <LinearProgress variant="determinate" value={scores[i]} sx={{ height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg,${d.color},${d.color}99)` } }} />
                        </motion.div>
                      </Box>
                    );
                  })}
                </Glass>
              </Grid>

              <Grid item xs={12} md={5}>
                <Glass sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>الحضور والانضباط</Typography>
                  {[
                    { label: 'معدل الحضور', value: 93, color: '#22c55e' },
                    { label: 'الالتزام بالمواعيد', value: 88, color: '#6366f1' },
                    { label: 'إتمام المهام', value: 85, color: '#f59e0b' },
                    { label: 'التعاون الفريقي', value: 91, color: '#06b6d4' },
                  ].map((s, i) => (
                    <Box key={i} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .5 }}>
                        <Typography variant="body2" fontWeight={600}>{s.label}</Typography>
                        <Typography variant="body2" fontWeight={700} sx={{ color: s.color }}>{s.value}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={s.value} sx={{ height: 7, borderRadius: 3, '& .MuiLinearProgress-bar': { background: `linear-gradient(90deg,${s.color},${s.color}99)` } }} />
                    </Box>
                  ))}
                  <Box sx={{ mt: 2, p: 2, background: alpha('#22c55e', .08), borderRadius: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <HealthAndSafetyIcon fontSize="small" sx={{ color: '#22c55e' }} />
                      <Typography variant="caption" color="success.main" fontWeight={600}>
                        الأداء العام للمنظمة أعلى من المعدل القطاعي بنسبة 12%
                      </Typography>
                    </Box>
                  </Box>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ─── Tab 4: التنبيهات ─── */}
          {tab === 4 && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Glass sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                    <WarningAmberIcon color="warning" />
                    <Typography variant="h6" fontWeight={700}>تنبيهات الموارد البشرية</Typography>
                    <Chip label={`${DEMO.alerts.length}`} size="small" color="warning" />
                  </Box>
                  {DEMO.alerts.map((a, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .08 }}>
                      <AlertItem {...a} />
                    </motion.div>
                  ))}
                </Glass>
              </Grid>
              <Grid item xs={12} md={4}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>ملخص التنبيهات</Typography>
                  {[
                    { label: 'حرجة', count: DEMO.alerts.filter(a => a.type === 'critical').length, color: '#ef4444' },
                    { label: 'تحذير', count: DEMO.alerts.filter(a => a.type === 'warning').length, color: '#f59e0b' },
                    { label: 'إنجاز', count: DEMO.alerts.filter(a => a.type === 'success').length, color: '#22c55e' },
                    { label: 'معلومة', count: DEMO.alerts.filter(a => a.type === 'info').length, color: '#6366f1' },
                  ].map((s, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, mb: 1.5, background: alpha(s.color, .1), borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: s.color }} />
                        <Typography variant="body2" fontWeight={600}>{s.label}</Typography>
                      </Box>
                      <Typography variant="h5" fontWeight={800} sx={{ color: s.color }}>{s.count}</Typography>
                    </Box>
                  ))}
                  <Box sx={{ mt: 2, p: 2, background: alpha('#22c55e', .08), borderRadius: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleOutlineIcon color="success" fontSize="small" />
                    <Typography variant="caption" color="success.main">تم حل 12 تنبيهاً هذا الشهر</Typography>
                  </Box>
                </Glass>
              </Grid>
            </Grid>
          )}

          {/* ─── Tab 5: ذكاء اصطناعي ─── */}
          {tab === 5 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Glass sx={{
                  p: 3,
                  background: isDark ? 'linear-gradient(135deg,rgba(34,197,94,.18),rgba(6,182,212,.12))' : 'linear-gradient(135deg,rgba(34,197,94,.1),rgba(6,182,212,.07))',
                }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 2.5, background: 'linear-gradient(135deg,#22c55e,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PsychologyIcon sx={{ color: '#fff' }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" fontWeight={700}>توصيات ذكاء اصطناعي — HR</Typography>
                      <Typography variant="caption" color="text.secondary">تحليل بيانات الموظفين وتوقعات مستقبلية</Typography>
                    </Box>
                    <Chip label="AI-Powered" sx={{ ml: 'auto', background: 'linear-gradient(135deg,#22c55e,#06b6d4)', color: '#fff', fontWeight: 700 }} />
                  </Box>
                  <Grid container spacing={2}>
                    {DEMO.aiInsights.map((ins, i) => (
                      <Grid item xs={12} md={6} key={i}>
                        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .1 }}>
                          <Box sx={{ p: 2.5, background: isDark ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.7)', borderRadius: 2, border: `1px solid ${alpha('#22c55e', .2)}`, display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                            <Typography fontSize={24}>{ins.icon}</Typography>
                            <Typography variant="body2" color="text.primary" lineHeight={1.7}>{ins.text}</Typography>
                          </Box>
                        </motion.div>
                      </Grid>
                    ))}
                  </Grid>
                </Glass>
              </Grid>

              {/* توقعات الاحتياجات */}
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>توقعات الاحتياجات — الربع القادم</Typography>
                  {[
                    { dept: 'التأهيل الطبيعي', need: '+5 موظفين', urgency: 'عاجل', color: '#ef4444' },
                    { dept: 'التمريض', need: '+3 موظفين', urgency: 'قريباً', color: '#f59e0b' },
                    { dept: 'الصحة النفسية', need: '+2 موظفين', urgency: 'مخطط', color: '#6366f1' },
                    { dept: 'تقنية المعلومات', need: '+1 موظف', urgency: 'مخطط', color: '#22c55e' },
                  ].map((n, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * .08 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, mb: 1.5, background: alpha(n.color, .08), borderRadius: 2, border: `1px solid ${alpha(n.color, .15)}` }}>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{n.dept}</Typography>
                          <Typography variant="caption" color="text.secondary">{n.need}</Typography>
                        </Box>
                        <Chip size="small" label={n.urgency} sx={{ background: alpha(n.color, .15), color: n.color, fontWeight: 700, fontSize: 10 }} />
                      </Box>
                    </motion.div>
                  ))}
                </Glass>
              </Grid>

              {/* مخاطر الاستقالة */}
              <Grid item xs={12} md={6}>
                <Glass sx={{ p: 3 }}>
                  <Typography variant="h6" fontWeight={700} mb={2}>تحليل مخاطر الاستقالة</Typography>
                  <Typography variant="caption" color="text.secondary" display="block" mb={2}>بناءً على نمط الأداء والرضا الوظيفي</Typography>
                  {[
                    { name: 'خالد السبيعي', risk: 72, dept: 'التقنية' },
                    { name: 'فيصل الدوسري', risk: 58, dept: 'الطب' },
                    { name: 'محمد العتيبي', risk: 44, dept: 'التأهيل' },
                  ].map((r, i) => (
                    <Box key={i} sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: .5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar sx={{ width: 28, height: 28, fontSize: 12, background: r.risk > 60 ? '#ef4444' : r.risk > 40 ? '#f59e0b' : '#22c55e' }}>{r.name.charAt(0)}</Avatar>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>{r.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{r.dept}</Typography>
                          </Box>
                        </Box>
                        <Typography variant="body2" fontWeight={700} sx={{ color: r.risk > 60 ? '#ef4444' : r.risk > 40 ? '#f59e0b' : '#22c55e' }}>{r.risk}%</Typography>
                      </Box>
                      <LinearProgress variant="determinate" value={r.risk} sx={{ height: 6, borderRadius: 3, '& .MuiLinearProgress-bar': { background: r.risk > 60 ? 'linear-gradient(90deg,#ef4444,#dc2626)' : r.risk > 40 ? 'linear-gradient(90deg,#f59e0b,#d97706)' : 'linear-gradient(90deg,#22c55e,#16a34a)' } }} />
                    </Box>
                  ))}
                </Glass>
              </Grid>
            </Grid>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ─── Dialog: إضافة موظف ─── */}
      <Dialog open={addDialog} onClose={() => setAddDialog(false)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 3, background: isDark ? '#1e1e2e' : '#fff' } }}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: 2, background: 'linear-gradient(135deg,#22c55e,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PersonAddIcon sx={{ color: '#fff', fontSize: 18 }} />
            </Box>
            <Typography fontWeight={700}>إضافة موظف جديد</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} mt={.5}>
            {[
              { label: 'الاسم الكامل', placeholder: 'أحمد محمد الشمري' },
              { label: 'البريد الإلكتروني', placeholder: 'ahmed@example.com' },
              { label: 'رقم الجوال', placeholder: '05xxxxxxxx' },
            ].map((f, i) => (
              <Grid item xs={12} sm={i < 2 ? 6 : 12} key={i}>
                <TextField fullWidth label={f.label} placeholder={f.placeholder} size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }} />
              </Grid>
            ))}
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="القسم" size="small" defaultValue="" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                {['التأهيل', 'التمريض', 'الطب', 'الإدارة', 'التقنية', 'المالية'].map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="الفرع" size="small" defaultValue="" sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}>
                {['الرياض', 'جدة', 'الدمام', 'مكة', 'المدينة'].map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddDialog(false)} color="inherit" sx={{ borderRadius: 2 }}>إلغاء</Button>
          <Button variant="contained" onClick={() => setAddDialog(false)}
            sx={{ background: 'linear-gradient(135deg,#22c55e,#16a34a)', borderRadius: 2, fontWeight: 700 }}>
            إضافة الموظف
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
