/**
 * MontessoriDashboard — لوحة تحكم برنامج مونتيسوري الاحترافية
 *
 * Professional dashboard featuring:
 *  - Animated KPI cards with gradient accents & decorative circles
 *  - Glassmorphism header with gradient background
 *  - Professional Recharts with SVG gradient fills & custom glass tooltips
 *  - Navigation grid with motion stagger
 *  - Progress rings for key metrics
 *  - Print / Export CSV support
 *
 * @version 2.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme, alpha,
} from '@mui/material';



import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, statusColors } from '../../theme/palette';
import logger from '../../utils/logger';
import montessoriService from '../../services/montessoriService';

/* ─── Animated counter hook (same pattern as StatCard v3) ─── */
const useAnimatedCounter = (endValue, duration = 1200) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const hasAnimated = useRef(false);
  useEffect(() => {
    if (hasAnimated.current || !endValue) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          const start = Date.now();
          const step = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            setCount(Math.floor(eased * endValue));
            if (progress < 1) requestAnimationFrame(step);
          };
          requestAnimationFrame(step);
        }
      },
      { threshold: 0.3 },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [endValue, duration]);
  return { count, ref };
};

/* ─── Animated KPI Component ─── */
const AnimatedKPI = ({ title, value, subtitle, icon, gradient, delay = 0 }) => {
  const { count, ref } = useAnimatedCounter(typeof value === 'number' ? value : 0, 1400);
  const isZero = value === 0;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1, duration: 0.5, ease: 'easeOut' }}
      whileHover={{ y: -6, scale: 1.02 }}
      style={{ height: '100%' }}
    >
      <Paper
        elevation={0}
        sx={{
          p: 2.5, borderRadius: 3, height: '100%',
          background: gradient, color: '#fff',
          position: 'relative', overflow: 'hidden',
          ...(isZero && { opacity: 0.65, filter: 'grayscale(0.3)' }),
          '&:hover': {
            ...(isZero && { opacity: 0.85, filter: 'grayscale(0)' }),
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          },
          '&::after': {
            content: '""', position: 'absolute', top: -30, right: -30,
            width: 110, height: 110, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
          },
          '&::before': {
            content: '""', position: 'absolute', bottom: -20, left: -20,
            width: 80, height: 80, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.85, fontWeight: 500, letterSpacing: 0.5 }}>
              {title}
            </Typography>
            <Typography variant="h3" fontWeight={800} sx={{ lineHeight: 1.2, my: 0.5 }}>
              {typeof value === 'number' ? count.toLocaleString('ar-SA') : value}
            </Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 52, height: 52, backdropFilter: 'blur(4px)' }}>
            {icon}
          </Avatar>
        </Box>
      </Paper>
    </motion.div>
  );
};

/* ─── Progress Ring ─── */
const ProgressRing = ({ value, size = 80, color = '#66bb6a', label }) => (
  <Box sx={{ position: 'relative', display: 'inline-flex' }}>
    <CircularProgress
      variant="determinate" value={Math.min(value, 100)} size={size} thickness={4}
      sx={{ color, '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }}
    />
    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Typography variant="h6" fontWeight={800} color="text.primary">{value}%</Typography>
      {label && <Typography variant="caption" color="text.secondary" sx={{ fontSize: 9 }}>{label}</Typography>}
    </Box>
  </Box>
);

/* ──────── Demo data ──────── */
const DEMO = {
  programs: [
    { _id: '1', name: 'برنامج الطفولة المبكرة', ageGroup: '3-6 سنوات', capacity: 20, enrolled: 15, status: 'active', instructor: 'أ. نورة السالم' },
    { _id: '2', name: 'برنامج الحسي الحركي', ageGroup: '2-4 سنوات', capacity: 12, enrolled: 10, status: 'active', instructor: 'أ. سارة المحمد' },
    { _id: '3', name: 'برنامج اللغة والتواصل', ageGroup: '4-7 سنوات', capacity: 15, enrolled: 8, status: 'active', instructor: 'أ. هند العتيبي' },
    { _id: '4', name: 'برنامج المهارات الحياتية', ageGroup: '5-8 سنوات', capacity: 18, enrolled: 14, status: 'planned', instructor: 'أ. ريم الشمري' },
  ],
  students: [
    { _id: '1', fullName: 'أحمد محمد العلي', gender: 'ذكر', disabilityTypes: ['توحد'] },
    { _id: '2', fullName: 'سارة خالد المحمد', gender: 'أنثى', disabilityTypes: ['ذهنية'] },
    { _id: '3', fullName: 'عبدالله فهد الأحمد', gender: 'ذكر', disabilityTypes: ['حركية'] },
    { _id: '4', fullName: 'لمى سعد الحربي', gender: 'أنثى', disabilityTypes: ['سمعية'] },
    { _id: '5', fullName: 'محمد عبدالرحمن', gender: 'ذكر', disabilityTypes: ['توحد', 'ذهنية'] },
  ],
  sessions: Array.from({ length: 24 }, (_, i) => ({ _id: `s${i}`, attendance: Math.random() > 0.15 })),
  evaluations: [
    { _id: '1', area: 'حسي', level: 'جيد', skill: 'التمييز البصري', student: { fullName: 'أحمد' } },
    { _id: '2', area: 'لغوي', level: 'ممتاز', skill: 'المفردات', student: { fullName: 'سارة' } },
    { _id: '3', area: 'حركي', level: 'متوسط', skill: 'المهارات الدقيقة', student: { fullName: 'عبدالله' } },
    { _id: '4', area: 'اجتماعي', level: 'جيد', skill: 'التفاعل مع الأقران', student: { fullName: 'لمى' } },
    { _id: '5', area: 'معرفي', level: 'ممتاز', skill: 'التصنيف والترتيب', student: { fullName: 'محمد' } },
    { _id: '6', area: 'استقلالية', level: 'ضعيف', skill: 'الاعتناء بالنفس', student: { fullName: 'أحمد' } },
  ],
  plans: [
    { _id: '1', goals: [{ area: 'حسي', achieved: true }, { area: 'لغوي', achieved: false }, { area: 'حركي', achieved: true }] },
    { _id: '2', goals: [{ area: 'اجتماعي', achieved: false }, { area: 'معرفي', achieved: true }] },
    { _id: '3', goals: [{ area: 'استقلالية', achieved: true }, { area: 'سلوكي', achieved: false }] },
  ],
  activities: Array.from({ length: 12 }, (_, i) => ({ _id: `a${i}`, name: `نشاط ${i + 1}` })),
  team: [
    { _id: '1', name: 'أ. نورة السالم', role: 'معلم' },
    { _id: '2', name: 'د. سعاد الخالد', role: 'أخصائي' },
    { _id: '3', name: 'أ. ريم الشمري', role: 'مشرف' },
    { _id: '4', name: 'أ. فاطمة الأحمد', role: 'معلم' },
  ],
  parents: [
    { _id: '1', name: 'محمد العلي' },
    { _id: '2', name: 'خالد المحمد' },
    { _id: '3', name: 'فهد الأحمد' },
  ],
};

/* ──────── Utility ──────── */
const arr = (v) => (Array.isArray(v) ? v : []);
const levelColors = { 'ضعيف': '#ef5350', 'متوسط': '#ff9800', 'جيد': '#66bb6a', 'ممتاز': '#42a5f5' };
const CHART_COLORS = ['#667eea', '#43e97b', '#ff9800', '#ef5350', '#ab47bc', '#26c6da', '#f093fb', '#ffb347'];

const statusConfig = {
  active: { label: 'نشط', color: 'success' },
  planned: { label: 'مخطط', color: 'info' },
  suspended: { label: 'موقف', color: 'error' },
  completed: { label: 'مكتمل', color: 'primary' },
};

/* ──────── Nav Cards ──────── */
const NAV_CARDS = [
  { id: 'students', label: 'إدارة الطلاب', icon: <ChildIcon sx={{ fontSize: 28 }} />, path: '/montessori/students', gradient: gradients.info, desc: 'تسجيل وإدارة ملفات الطلاب والخطط الفردية', count: 'students' },
  { id: 'programs', label: 'إدارة البرامج', icon: <ProgramIcon sx={{ fontSize: 28 }} />, path: '/montessori/programs', gradient: gradients.success, desc: 'البرامج التعليمية والحصص والجداول', count: 'programs' },
  { id: 'sessions', label: 'الجلسات والتقييمات', icon: <SessionIcon sx={{ fontSize: 28 }} />, path: '/montessori/sessions', gradient: gradients.warning, desc: 'تسجيل الحضور وتقييم الأداء اليومي', count: 'sessions' },
  { id: 'team', label: 'الفريق وأولياء الأمور', icon: <TeamIcon sx={{ fontSize: 28 }} />, path: '/montessori/team', gradient: gradients.primary, desc: 'إدارة المعلمين والأخصائيين والتواصل', count: 'team' },
];

/* ══════════════════════════════════════════════════════════════════ */
const MontessoriDashboard = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const showSnackbar = useSnackbar();
  const isDark = theme.palette.mode === 'dark';
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    programs: [], students: [], sessions: [], evaluations: [],
    plans: [], activities: [], team: [], parents: [], reports: [],
  });

  /* ── Data loading ── */
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        montessoriService.getPrograms(),
        montessoriService.getStudents(),
        montessoriService.getSessions(),
        montessoriService.getEvaluations(),
        montessoriService.getPlans(),
        montessoriService.getActivities(),
        montessoriService.getTeamMembers(),
        montessoriService.getParents(),
        montessoriService.getReports(),
      ]);
      const keys = ['programs', 'students', 'sessions', 'evaluations', 'plans', 'activities', 'team', 'parents', 'reports'];
      const parsed = {};
      results.forEach((r, i) => {
        parsed[keys[i]] =
          r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0
            ? r.value
            : DEMO[keys[i]] || [];
      });
      setData(parsed);
    } catch (err) {
      logger.error('Montessori dashboard load error', err);
      setData({ ...DEMO, reports: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Computed stats ── */
  const programs = arr(data.programs);
  const students = arr(data.students);
  const sessions = arr(data.sessions);
  const evaluations = arr(data.evaluations);
  const plans = arr(data.plans);
  const team = arr(data.team);
  const parents = arr(data.parents);

  const activePrograms = programs.filter((p) => p.status === 'active').length;
  const totalCapacity = programs.reduce((s, p) => s + (p.capacity || 0), 0);
  const totalEnrolled = programs.reduce((s, p) => s + (p.enrolled || 0), 0);
  const attendanceRate = sessions.length > 0 ? Math.round((sessions.filter((s) => s.attendance).length / sessions.length) * 100) : 0;
  const allGoals = plans.flatMap((p) => p.goals || []);
  const achievedGoals = allGoals.filter((g) => g.achieved).length;
  const goalRate = allGoals.length > 0 ? Math.round((achievedGoals / allGoals.length) * 100) : 0;
  const capacityRate = totalCapacity > 0 ? Math.round((totalEnrolled / totalCapacity) * 100) : 0;
  const goodEvals = evaluations.filter((e) => e.level === 'ممتاز' || e.level === 'جيد').length;
  const evalQuality = evaluations.length > 0 ? Math.round((goodEvals / evaluations.length) * 100) : 0;
  const countsMap = { students: students.length, programs: programs.length, sessions: sessions.length, team: team.length };

  /* ── Chart data ── */
  const disabilityDist = (() => {
    const map = {};
    students.forEach((s) => (s.disabilityTypes || []).forEach((d) => { map[d] = (map[d] || 0) + 1; }));
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  const evalByLevel = [
    { name: 'ضعيف', value: evaluations.filter((e) => e.level === 'ضعيف').length, fill: '#ef5350' },
    { name: 'متوسط', value: evaluations.filter((e) => e.level === 'متوسط').length, fill: '#ff9800' },
    { name: 'جيد', value: evaluations.filter((e) => e.level === 'جيد').length, fill: '#66bb6a' },
    { name: 'ممتاز', value: evaluations.filter((e) => e.level === 'ممتاز').length, fill: '#42a5f5' },
  ];

  const goalByArea = (() => {
    const map = {};
    allGoals.forEach((g) => {
      if (!map[g.area]) map[g.area] = { area: g.area, achieved: 0, pending: 0 };
      g.achieved ? map[g.area].achieved++ : map[g.area].pending++;
    });
    return Object.values(map);
  })();

  /* ── Export CSV ── */
  const handleExport = () => {
    const csv = [
      'المؤشر,القيمة',
      `إجمالي الطلاب,${students.length}`,
      `البرامج النشطة,${activePrograms}`,
      `إجمالي الجلسات,${sessions.length}`,
      `نسبة الحضور,${attendanceRate}%`,
      `التقييمات,${evaluations.length}`,
      `نسبة تحقيق الأهداف,${goalRate}%`,
      `أعضاء الفريق,${team.length}`,
      `أولياء الأمور,${parents.length}`,
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `montessori_report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showSnackbar('تم تصدير التقرير بنجاح', 'success');
  };

  /* ══════════ Render ══════════ */
  return (
    <DashboardErrorBoundary>
      <Box sx={{ minHeight: '100vh', bgcolor: isDark ? 'background.default' : '#f8f9fc' }}>

        {/* ═══ Gradient Header ═══ */}
        <Box
          sx={{
            background: gradients.primary, py: 4, px: 3, mb: -4,
            borderRadius: '0 0 24px 24px', position: 'relative', overflow: 'hidden',
            '&::after': {
              content: '""', position: 'absolute', top: -60, right: -60,
              width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.08)',
            },
            '&::before': {
              content: '""', position: 'absolute', bottom: -40, left: '30%',
              width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.05)',
            },
          }}
        >
          <Container maxWidth="xl">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48, backdropFilter: 'blur(4px)' }}>
                    <AutoAwesomeIcon sx={{ fontSize: 28 }} />
                  </Avatar>
                  <Typography variant="h4" fontWeight={800} color="#fff">
                    برنامج مونتيسوري
                  </Typography>
                </Box>
                <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.85)', maxWidth: 500 }}>
                  لوحة التحكم الشاملة — إدارة البرامج والطلاب والجلسات والتقييمات
                </Typography>
              </Box>
              <Stack direction="row" spacing={1}>
                <Tooltip title="تصدير التقرير">
                  <IconButton onClick={handleExport} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="طباعة">
                  <IconButton onClick={() => window.print()} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
                    <PrintIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="تحديث البيانات">
                  <IconButton onClick={loadData} disabled={loading} sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.15)', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          </Container>
        </Box>

        <Container maxWidth="xl" sx={{ pt: 6, pb: 4 }}>
          {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          {/* ═══ KPI Row ═══ */}
          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            {[
              { title: 'إجمالي الطلاب', value: students.length, icon: <ChildIcon />, gradient: gradients.info, subtitle: `${students.filter((s) => s.gender === 'ذكر').length} ذكور • ${students.filter((s) => s.gender === 'أنثى').length} إناث` },
              { title: 'البرامج النشطة', value: activePrograms, icon: <ProgramIcon />, gradient: gradients.success, subtitle: `${programs.length} إجمالي • ${capacityRate}% استيعاب` },
              { title: 'الجلسات المنعقدة', value: sessions.length, icon: <SessionIcon />, gradient: gradients.warning, subtitle: `الحضور ${attendanceRate}%` },
              { title: 'التقييمات', value: evaluations.length, icon: <EvalIcon />, gradient: gradients.assessmentPurple, subtitle: `${goodEvals} جيد/ممتاز` },
              { title: 'الخطط الفردية', value: plans.length, icon: <PlanIcon />, gradient: gradients.ocean, subtitle: `${allGoals.length} هدف — ${goalRate}% محقق` },
              { title: 'فريق العمل', value: team.length, icon: <TeamIcon />, gradient: gradients.fire, subtitle: `${parents.length} ولي أمر` },
            ].map((kpi, i) => (
              <Grid item xs={6} sm={4} md={2} key={i}>
                {loading
                  ? <Skeleton variant="rounded" height={130} sx={{ borderRadius: 3 }} />
                  : <AnimatedKPI {...kpi} delay={i} />
                }
              </Grid>
            ))}
          </Grid>

          {/* ═══ Progress Rings ═══ */}
          <Paper elevation={0} sx={{ p: 3, mb: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InsightsIcon color="primary" /> مؤشرات الأداء الرئيسية
            </Typography>
            <Grid container spacing={3} justifyContent="center" sx={{ mt: 1 }}>
              {[
                { value: attendanceRate, label: 'نسبة الحضور', color: statusColors.success },
                { value: goalRate, label: 'تحقيق الأهداف', color: statusColors.info },
                { value: capacityRate, label: 'نسبة الاستيعاب', color: statusColors.warning },
                { value: evalQuality, label: 'جودة التقييمات', color: statusColors.purple },
              ].map((ring, i) => (
                <Grid item xs={6} sm={3} key={i} sx={{ textAlign: 'center' }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.15, type: 'spring', stiffness: 150 }}>
                    <ProgressRing {...ring} size={90} />
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* ═══ Navigation Cards ═══ */}
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <ArrowIcon color="primary" /> الأقسام الرئيسية
          </Typography>
          <Grid container spacing={2.5} sx={{ mb: 4 }}>
            {NAV_CARDS.map((card, i) => (
              <Grid item xs={12} sm={6} md={3} key={card.id}>
                <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.12 }}>
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%', background: card.gradient, color: '#fff',
                      borderRadius: 3, cursor: 'pointer', position: 'relative', overflow: 'hidden',
                      transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
                      '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 12px 40px rgba(0,0,0,0.2)' },
                      '&::after': {
                        content: '""', position: 'absolute', top: -20, right: -20,
                        width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.1)',
                      },
                    }}
                  >
                    <CardActionArea onClick={() => navigate(card.path)} sx={{ p: 2.5, height: '100%' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, position: 'relative', zIndex: 1 }}>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 52, height: 52, backdropFilter: 'blur(4px)' }}>
                          {card.icon}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle1" fontWeight={700}>{card.label}</Typography>
                            <Badge
                              badgeContent={countsMap[card.count] || 0} color="error"
                              sx={{ '& .MuiBadge-badge': { bgcolor: 'rgba(255,255,255,0.3)', color: '#fff', fontWeight: 700 } }}
                            />
                          </Box>
                          <Typography variant="caption" sx={{ opacity: 0.85, display: 'block', mt: 0.3 }}>
                            {card.desc}
                          </Typography>
                        </Box>
                        <ArrowIcon sx={{ opacity: 0.7 }} />
                      </Box>
                    </CardActionArea>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* ═══ Charts Row ═══ */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {/* Disability Distribution */}
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 2.5, height: 370, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  توزيع أنواع الإعاقة
                </Typography>
                {disabilityDist.length === 0 ? (
                  <EmptyState title="لا توجد بيانات" height={260} />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <defs>
                        {disabilityDist.map((_, idx) => (
                          <linearGradient key={idx} id={`pieGrad${idx}`} x1="0" y1="0" x2="1" y2="1">
                            <stop offset="0%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={1} />
                            <stop offset="100%" stopColor={CHART_COLORS[idx % CHART_COLORS.length]} stopOpacity={0.65} />
                          </linearGradient>
                        ))}
                      </defs>
                      <Pie
                        data={disabilityDist} cx="50%" cy="45%" outerRadius={85} innerRadius={45}
                        dataKey="value" paddingAngle={3} cornerRadius={4}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {disabilityDist.map((_, idx) => (
                          <Cell key={idx} fill={`url(#pieGrad${idx})`} stroke="none" />
                        ))}
                      </Pie>
                      <RTooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>

            {/* Evaluation Levels */}
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 2.5, height: 370, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  مستويات التقييم
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={evalByLevel} layout="vertical" barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#eee'} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={55} tick={{ fontSize: 12, fontWeight: 600 }} />
                    <RTooltip content={<ChartTooltip />} />
                    <Bar dataKey="value" name="العدد" radius={[0, 8, 8, 0]}>
                      {evalByLevel.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Goal Achievement */}
            <Grid item xs={12} md={4}>
              <Paper elevation={0} sx={{ p: 2.5, height: 370, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  تحقيق الأهداف حسب المجال
                </Typography>
                {goalByArea.length === 0 ? (
                  <EmptyState title="لا توجد أهداف" height={260} />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={goalByArea} barSize={16}>
                      <defs>
                        <linearGradient id="gAchieved" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={statusColors.success} stopOpacity={0.9} />
                          <stop offset="95%" stopColor={statusColors.success} stopOpacity={0.5} />
                        </linearGradient>
                        <linearGradient id="gPending" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={statusColors.warning} stopOpacity={0.9} />
                          <stop offset="95%" stopColor={statusColors.warning} stopOpacity={0.5} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#333' : '#eee'} />
                      <XAxis dataKey="area" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <RTooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="achieved" name="محقق" fill="url(#gAchieved)" stackId="a" />
                      <Bar dataKey="pending" name="قيد التنفيذ" fill="url(#gPending)" stackId="a" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* ═══ Programs + Recent Evaluations ═══ */}
          <Grid container spacing={3}>
            {/* Programs List */}
            <Grid item xs={12} md={7}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ProgramIcon color="primary" fontSize="small" /> البرامج الحالية
                  </Typography>
                  <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate('/montessori/programs')}>
                    عرض الكل
                  </Button>
                </Box>
                {programs.length === 0 ? (
                  <EmptyState title="لا توجد برامج" height={150} />
                ) : (
                  <List disablePadding>
                    {programs.slice(0, 5).map((p, i) => {
                      const pct = p.capacity ? Math.round((p.enrolled / p.capacity) * 100) : 0;
                      return (
                        <ListItem
                          key={p._id || i} divider={i < Math.min(programs.length, 5) - 1}
                          sx={{ px: 0 }}
                          secondaryAction={
                            <Chip
                              label={statusConfig[p.status]?.label || p.status} size="small"
                              color={statusConfig[p.status]?.color || 'default'} variant="outlined"
                            />
                          }
                        >
                          <ListItemAvatar>
                            <Avatar sx={{ bgcolor: alpha(CHART_COLORS[i % CHART_COLORS.length], 0.15), color: CHART_COLORS[i % CHART_COLORS.length] }}>
                              <ProgramIcon />
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={<Typography variant="body2" fontWeight={600}>{p.name}</Typography>}
                            secondary={
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  {p.ageGroup || '-'} • {p.instructor || '-'} • {p.enrolled || 0}/{p.capacity || 0}
                                </Typography>
                                <LinearProgress
                                  variant="determinate" value={Math.min(pct, 100)}
                                  color={pct >= 90 ? 'error' : pct >= 70 ? 'warning' : 'success'}
                                  sx={{ mt: 0.5, height: 4, borderRadius: 2 }}
                                />
                              </Box>
                            }
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                )}
              </Paper>
            </Grid>

            {/* Recent Evaluations */}
            <Grid item xs={12} md={5}>
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EvalIcon color="secondary" fontSize="small" /> آخر التقييمات
                  </Typography>
                  <Button size="small" endIcon={<ArrowIcon />} onClick={() => navigate('/montessori/sessions')}>
                    عرض الكل
                  </Button>
                </Box>
                {evaluations.length === 0 ? (
                  <EmptyState title="لا توجد تقييمات" height={150} />
                ) : (
                  <List disablePadding>
                    {evaluations.slice(0, 6).map((ev, i) => (
                      <ListItem key={ev._id || i} divider={i < Math.min(evaluations.length, 6) - 1} sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: alpha(levelColors[ev.level] || '#999', 0.15), color: levelColors[ev.level] || '#999', width: 38, height: 38 }}>
                            <StarIcon fontSize="small" />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={<Typography variant="body2" fontWeight={600}>{ev.skill || ev.area}</Typography>}
                          secondary={`${ev.student?.fullName || '-'} • ${ev.area || '-'}`}
                        />
                        <Chip
                          label={ev.level} size="small"
                          sx={{
                            bgcolor: alpha(levelColors[ev.level] || '#ccc', 0.15),
                            color: levelColors[ev.level] || '#666', fontWeight: 700, minWidth: 52,
                          }}
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </Paper>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </DashboardErrorBoundary>
  );
};

export default MontessoriDashboard;
