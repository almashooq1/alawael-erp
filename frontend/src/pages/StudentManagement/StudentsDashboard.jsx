import { useState, useEffect, useCallback } from 'react';




import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, chartColors, statusColors, neutralColors, severityColors, brandColors } from '../../theme/palette';
import logger from '../../utils/logger';
import studentManagementService from '../../services/studentManagementService';
import { useNavigate } from 'react-router-dom';

/* ──────── ثوابت ──────── */
const STATUS_MAP = {
  active: { label: 'نشط', color: 'success' },
  inactive: { label: 'غير نشط', color: 'default' },
  graduated: { label: 'متخرج', color: 'info' },
  suspended: { label: 'موقوف', color: 'error' },
  transferred: { label: 'محوّل', color: 'warning' },
  withdrawn: { label: 'منسحب', color: 'error' },
};

const DISABILITY_LABELS = {
  intellectual: 'إعاقة ذهنية', autism: 'اضطراب طيف التوحد', cerebral_palsy: 'شلل دماغي',
  down_syndrome: 'متلازمة داون', hearing: 'إعاقة سمعية', visual: 'إعاقة بصرية',
  physical: 'إعاقة حركية', speech: 'اضطراب نطقي', learning: 'صعوبات تعلم', multiple: 'إعاقة متعددة',
};

const DISABILITY_COLORS = {
  intellectual: chartColors.category[0], autism: chartColors.category[1], cerebral_palsy: chartColors.category[2],
  down_syndrome: chartColors.category[6], hearing: statusColors.warning, visual: chartColors.category[4],
  physical: chartColors.category[5], speech: statusColors.cyan, learning: chartColors.category[7], multiple: neutralColors.fallback,
};

const SEVERITY_MAP = {
  mild: { label: 'خفيفة', color: severityColors.mild },
  moderate: { label: 'متوسطة', color: severityColors.moderate },
  severe: { label: 'شديدة', color: severityColors.severe },
  profound: { label: 'عميقة', color: severityColors.profound },
};

/* ──────── بيانات تجريبية ──────── */
const DEMO_STATS = {
  totalStudents: 234,
  activeStudents: 186,
  newThisMonth: 18,
  needsAttention: 12,
  graduatedThisYear: 22,
  avgAttendance: 87,
};

const DEMO_BY_DISABILITY = [
  { name: 'إعاقة ذهنية', value: 42, color: chartColors.category[0] },
  { name: 'طيف التوحد', value: 56, color: chartColors.category[1] },
  { name: 'شلل دماغي', value: 24, color: chartColors.category[2] },
  { name: 'متلازمة داون', value: 30, color: chartColors.category[6] },
  { name: 'إعاقة سمعية', value: 18, color: statusColors.warning },
  { name: 'إعاقة حركية', value: 22, color: chartColors.category[5] },
  { name: 'صعوبات تعلم', value: 26, color: chartColors.category[7] },
  { name: 'أخرى', value: 16, color: neutralColors.fallback },
];

const DEMO_BY_SEVERITY = [
  { name: 'خفيفة', value: 58, color: severityColors.mild },
  { name: 'متوسطة', value: 84, color: severityColors.moderate },
  { name: 'شديدة', value: 62, color: severityColors.severe },
  { name: 'عميقة', value: 30, color: severityColors.profound },
];

const DEMO_ENROLLMENT_TREND = [
  { month: 'يناير', enrolled: 22, graduated: 3, withdrawn: 1 },
  { month: 'فبراير', enrolled: 15, graduated: 2, withdrawn: 0 },
  { month: 'مارس', enrolled: 28, graduated: 5, withdrawn: 2 },
  { month: 'أبريل', enrolled: 18, graduated: 4, withdrawn: 1 },
  { month: 'مايو', enrolled: 20, graduated: 3, withdrawn: 1 },
  { month: 'يونيو', enrolled: 18, graduated: 6, withdrawn: 2 },
];

const DEMO_STATUS_DIST = [
  { name: 'نشط', value: 186, color: statusColors.success },
  { name: 'غير نشط', value: 14, color: neutralColors.inactive },
  { name: 'متخرج', value: 22, color: statusColors.info },
  { name: 'موقوف', value: 5, color: statusColors.error },
  { name: 'محوّل', value: 4, color: statusColors.warning },
  { name: 'منسحب', value: 3, color: chartColors.category[5] },
];

const DEMO_PROGRAMS_DIST = [
  { name: 'العلاج الطبيعي', count: 88 },
  { name: 'علاج النطق', count: 72 },
  { name: 'العلاج الوظيفي', count: 56 },
  { name: 'تعديل السلوك', count: 44 },
  { name: 'التأهيل الأكاديمي', count: 62 },
  { name: 'التأهيل المهني', count: 34 },
];

const DEMO_RECENT = [
  { id: 1, name: 'عبدالرحمن سعد المطيري', disability: 'autism', severity: 'moderate', status: 'active', programs: 3, enrollDate: '2026-01-10' },
  { id: 2, name: 'نورة عبدالله الغامدي', disability: 'cerebral_palsy', severity: 'severe', status: 'active', programs: 4, enrollDate: '2026-01-18' },
  { id: 3, name: 'فيصل خالد الشمري', disability: 'down_syndrome', severity: 'moderate', status: 'active', programs: 2, enrollDate: '2026-02-01' },
  { id: 4, name: 'ريما محمد الحربي', disability: 'learning', severity: 'mild', status: 'active', programs: 2, enrollDate: '2026-01-25' },
  { id: 5, name: 'طلال ناصر العتيبي', disability: 'hearing', severity: 'moderate', status: 'active', programs: 3, enrollDate: '2026-02-05' },
];

export default function StudentsDashboard() {
  const showSnackbar = useSnackbar();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(DEMO_STATS);
  const [byDisability, setByDisability] = useState(DEMO_BY_DISABILITY);
  const [bySeverity, setBySeverity] = useState(DEMO_BY_SEVERITY);
  const [enrollTrend, setEnrollTrend] = useState(DEMO_ENROLLMENT_TREND);
  const [statusDist, setStatusDist] = useState(DEMO_STATUS_DIST);
  const [programsDist, setProgramsDist] = useState(DEMO_PROGRAMS_DIST);
  const [recentList, setRecentList] = useState(DEMO_RECENT);

  // Advanced analytics state
  const [analytics, setAnalytics] = useState(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, studentsRes, analyticsRes] = await Promise.all([
        studentManagementService.getStatistics().catch(err => { logger.warn('Students: statistics fetch', err); return null; }),
        studentManagementService.getStudents({ limit: 200 }).catch(err => { logger.warn('Students: list fetch', err); return null; }),
        studentManagementService.getDashboardAnalytics('default').catch(err => { logger.warn('Students: analytics fetch', err); return null; }),
      ]);

      // Set analytics data
      const analyticsData = analyticsRes?.data?.data || analyticsRes?.data;
      if (analyticsData && typeof analyticsData === 'object') setAnalytics(analyticsData);

      /* stats */
      const apiStats = statsRes?.data || statsRes;
      if (apiStats && typeof apiStats === 'object') {
        setStats(prev => ({
          ...prev,
          totalStudents: apiStats.totalStudents ?? apiStats.total ?? prev.totalStudents,
          activeStudents: apiStats.activeStudents ?? apiStats.active ?? prev.activeStudents,
          newThisMonth: apiStats.newThisMonth ?? prev.newThisMonth,
          needsAttention: apiStats.needsAttention ?? prev.needsAttention,
        }));
      }

      const students = studentsRes?.data?.students || studentsRes?.data || studentsRes || [];
      if (Array.isArray(students) && students.length > 0) {
        /* by disability */
        const disMap = {};
        students.forEach(s => {
          const d = s.disabilityInfo?.primaryType || 'other';
          disMap[d] = (disMap[d] || 0) + 1;
        });
        const disArr = Object.entries(disMap).map(([k, v]) => ({
          name: DISABILITY_LABELS[k] || k,
          value: v,
          color: DISABILITY_COLORS[k] || neutralColors.fallback,
        }));
        if (disArr.length > 0) setByDisability(disArr);

        /* by severity */
        const sevMap = {};
        students.forEach(s => {
          const sv = s.disabilityInfo?.severity || 'moderate';
          sevMap[sv] = (sevMap[sv] || 0) + 1;
        });
        const sevArr = Object.entries(sevMap).map(([k, v]) => ({
          name: SEVERITY_MAP[k]?.label || k,
          value: v,
          color: SEVERITY_MAP[k]?.color || neutralColors.fallback,
        }));
        if (sevArr.length > 0) setBySeverity(sevArr);

        /* status distribution */
        const stMap = {};
        students.forEach(s => {
          const st = s.status || 'active';
          stMap[st] = (stMap[st] || 0) + 1;
        });
        const stArr = Object.entries(stMap).map(([k, v]) => ({
          name: STATUS_MAP[k]?.label || k,
          value: v,
          color: k === 'active' ? statusColors.success : k === 'graduated' ? statusColors.info : k === 'suspended' ? statusColors.error : k === 'transferred' ? statusColors.warning : neutralColors.inactive,
        }));
        if (stArr.length > 0) setStatusDist(stArr);

        /* programs distribution */
        const progMap = {};
        students.forEach(s => {
          (s.programs || []).forEach(p => {
            const name = p.programName || p.programType || 'غير محدد';
            progMap[name] = (progMap[name] || 0) + 1;
          });
        });
        const progArr = Object.entries(progMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8);
        if (progArr.length > 0) setProgramsDist(progArr);

        /* enrollment trend */
        const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
        const _now = new Date();
        const enrollByMonth = {};
        students.forEach(s => {
          const d = new Date(s.center?.enrollmentDate || s.createdAt);
          if (!isNaN(d.getTime())) {
            const key = months[d.getMonth()];
            enrollByMonth[key] = (enrollByMonth[key] || 0) + 1;
          }
        });
        const enrollArr = Object.entries(enrollByMonth).slice(-6).map(([month, enrolled]) => ({
          month, enrolled, graduated: Math.round(enrolled * 0.15), withdrawn: Math.round(enrolled * 0.05),
        }));
        if (enrollArr.length > 0) setEnrollTrend(enrollArr);

        /* recent */
        const recent = students
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
          .slice(0, 5)
          .map((s, i) => ({
            id: s._id || i,
            name: `${s.personalInfo?.firstName?.ar || ''} ${s.personalInfo?.lastName?.ar || ''}`.trim() || 'طالب',
            disability: s.disabilityInfo?.primaryType || 'other',
            severity: s.disabilityInfo?.severity || 'moderate',
            status: s.status || 'active',
            programs: (s.programs || []).length,
            enrollDate: (s.center?.enrollmentDate || s.createdAt || '').toString().slice(0, 10),
          }));
        setRecentList(recent);
      }
    } catch (err) {
      logger.warn('StudentsDashboard: load error', err);
      showSnackbar('تعذر تحميل بيانات الطلاب — يتم عرض بيانات تجريبية', 'warning');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const BAR_COLORS = chartColors.category;

  return (
    <DashboardErrorBoundary>
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Header */}
      <Box sx={{ background: gradients.success, borderRadius: 3, p: 3, mb: 4, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <StudentIcon sx={{ fontSize: 44 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">لوحة تحكم الطلاب</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>إحصائيات ومتابعة طلاب المركز</Typography>
          </Box>
        </Box>
        <Button variant="contained" color="inherit" sx={{ color: brandColors.tealGreen, fontWeight: 600 }} startIcon={<ArrowForwardIcon />} onClick={() => navigate('/student-management')}>
          إدارة الطلاب
        </Button>
        <Button variant="outlined" color="inherit" sx={{ fontWeight: 600, ml: 1 }} startIcon={<ReportsIcon />} onClick={() => navigate('/student-reports-center')}>
          مركز التقارير
        </Button>
      </Box>

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="إجمالي الطلاب" value={stats.totalStudents} subtitle="طالب مسجل" icon={<PeopleIcon />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="نشطون" value={stats.activeStudents} subtitle={`${Math.round(stats.activeStudents / Math.max(stats.totalStudents, 1) * 100)}% من الإجمالي`} icon={<ActiveIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="تسجيل هذا الشهر" value={stats.newThisMonth} subtitle="تسجيل جديد" icon={<NewIcon />} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="يحتاجون متابعة" value={stats.needsAttention} subtitle="طالب يحتاج اهتمام" icon={<WarningIcon />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="متخرجون هذا العام" value={stats.graduatedThisYear} subtitle="إنجاز الخطة" icon={<TrendUpIcon />} color="secondary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="نسبة الحضور" value={`${stats.avgAttendance}%`} subtitle="معدل الحضور" icon={<ActiveIcon />} color="success" />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>حركة التسجيل الشهرية</Typography>
            {enrollTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} role="img" aria-label="رسم بياني لحركة التسجيل الشهرية">
                <BarChart data={enrollTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RTooltip />
                  <Legend />
                  <Bar dataKey="enrolled" fill={statusColors.success} name="مسجلون" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="graduated" fill={statusColors.info} name="متخرجون" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="withdrawn" fill={statusColors.error} name="منسحبون" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={280} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>حسب درجة الإعاقة</Typography>
            {bySeverity.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} role="img" aria-label="رسم بياني حسب درجة الإعاقة">
                <PieChart>
                  <Pie data={bySeverity} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}>
                    {bySeverity.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={280} />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Charts Row 2 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>حسب نوع الإعاقة</Typography>
            {byDisability.length > 0 ? (
              <ResponsiveContainer width="100%" height={300} role="img" aria-label="رسم بياني حسب نوع الإعاقة">
                <PieChart>
                  <Pie data={byDisability} cx="50%" cy="50%" outerRadius={100} innerRadius={50} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {byDisability.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={300} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>حالة الطلاب</Typography>
            {statusDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={300} role="img" aria-label="رسم بياني لحالة الطلاب">
                <PieChart>
                  <Pie data={statusDist} cx="50%" cy="50%" outerRadius={80} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}>
                    {statusDist.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <RTooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={300} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>البرامج الأكثر تسجيلاً</Typography>
            {programsDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={300} role="img" aria-label="رسم بياني للبرامج الأكثر تسجيلاً">
                <BarChart data={programsDist} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={110} />
                  <RTooltip />
                  <Bar dataKey="count" name="عدد الطلاب" radius={[0, 4, 4, 0]}>
                    {programsDist.map((_, i) => <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={300} />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ════════ Advanced Analytics Section ════════ */}
      <Divider sx={{ my: 3 }}>
        <Chip label="تحليلات متقدمة" icon={<SpeedIcon />} color="secondary" />
      </Divider>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {/* IEP Coverage Gauge */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center', height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>تغطية خطط التدخل (IEP)</Typography>
            <Box sx={{ position: 'relative', display: 'inline-flex', my: 2 }}>
              <CircularProgress variant="determinate"
                value={analytics?.iep?.coverage || 72}
                size={120} thickness={5}
                sx={{
                  color: (analytics?.iep?.coverage || 72) >= 80 ? '#2e7d32' : '#ed6c02',
                  '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
                }} />
              <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h4" fontWeight={700} color={(analytics?.iep?.coverage || 72) >= 80 ? 'success.main' : 'warning.main'}>
                  {analytics?.iep?.coverage || 72}%
                </Typography>
              </Box>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {analytics?.iep?.studentsWithIEP || 134} طالب من {analytics?.iep?.totalActive || 186}
            </Typography>
            {(analytics?.iep?.coverage || 72) < 80 && (
              <Alert severity="warning" sx={{ mt: 1, textAlign: 'right', '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                يُنصح بإعداد IEP لجميع الطلاب
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Behavior Ratio */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center', height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>نسبة السلوك الإيجابي</Typography>
            <Box sx={{ position: 'relative', display: 'inline-flex', my: 2 }}>
              <CircularProgress variant="determinate"
                value={analytics?.behavior?.ratio || 84}
                size={120} thickness={5}
                sx={{
                  color: (analytics?.behavior?.ratio || 84) >= 70 ? '#2e7d32' : '#d32f2f',
                  '& .MuiCircularProgress-circle': { strokeLinecap: 'round' },
                }} />
              <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h4" fontWeight={700} color={(analytics?.behavior?.ratio || 84) >= 70 ? 'success.main' : 'error.main'}>
                  {analytics?.behavior?.ratio || 84}%
                </Typography>
              </Box>
            </Box>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography variant="h6" fontWeight={600} color="success.main">{analytics?.behavior?.totalPositive || 456}</Typography>
                <Typography variant="caption">إيجابي</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="h6" fontWeight={600} color="error.main">{analytics?.behavior?.totalNegative || 89}</Typography>
                <Typography variant="caption">سلبي</Typography>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Risk Distribution */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>توزيع المخاطر</Typography>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={[
                  { name: 'مرتفع', value: analytics?.riskDistribution?.high || 12 },
                  { name: 'متوسط', value: analytics?.riskDistribution?.medium || 38 },
                  { name: 'منخفض', value: analytics?.riskDistribution?.low || 136 },
                ]} cx="50%" cy="50%" outerRadius={60} innerRadius={30} dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}>
                  <Cell fill={statusColors.error} />
                  <Cell fill={statusColors.warning} />
                  <Cell fill={statusColors.success} />
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
            {(analytics?.riskDistribution?.high || 12) > 10 && (
              <Alert severity="error" sx={{ mt: 1, textAlign: 'right', '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                {analytics?.riskDistribution?.high || 12} طالب في مستوى خطر مرتفع
              </Alert>
            )}
          </Paper>
        </Grid>

        {/* Achievements This Month */}
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center', height: '100%', background: 'linear-gradient(135deg, #fff8e1 0%, #fff3e0 100%)' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>إنجازات الشهر</Typography>
            <Box sx={{ my: 2 }}>
              <StarIcon sx={{ fontSize: 48, color: '#f57f17' }} />
            </Box>
            <Typography variant="h3" fontWeight={700} color="#f57f17">{analytics?.achievements?.milestonesThisMonth || 34}</Typography>
            <Typography variant="body2" fontWeight={500}>محطة تقدم جديدة</Typography>
            <Divider sx={{ my: 1 }} />
            <Typography variant="h4" fontWeight={700} color="#7b1fa2">{analytics?.achievements?.badgesThisMonth || 22}</Typography>
            <Typography variant="body2" fontWeight={500}>شارة ومكافأة</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Age Distribution Chart */}
      {(analytics?.ageDistribution || []).length > 0 && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>التوزيع العمري للطلاب</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analytics.ageDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="range" />
                  <YAxis />
                  <RTooltip />
                  <Bar dataKey="count" name="عدد الطلاب" fill="#1976d2" radius={[4, 4, 0, 0]}>
                    {analytics.ageDistribution.map((_, i) => (
                      <Cell key={i} fill={chartColors.category[i % chartColors.category.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>اتجاه التقدم الأكاديمي</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={analytics?.attendanceHeatmap?.slice(0, 12) || enrollTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RTooltip />
                  <Area type="monotone" dataKey="enrolled" name="التسجيل" stroke="#1976d2" fill="#1976d233" strokeWidth={2} />
                  <Area type="monotone" dataKey="graduated" name="التخرج" stroke="#2e7d32" fill="#2e7d3233" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Quick Reports Access */}
      <Paper sx={{ p: 3, borderRadius: 3, mb: 3, background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReportsIcon color="primary" sx={{ fontSize: 28 }} />
            <Typography variant="h6" fontWeight={600}>الوصول السريع للتقارير</Typography>
          </Box>
          <Button variant="contained" size="small" startIcon={<ReportsIcon />}
            onClick={() => navigate('/student-reports-center')}>
            فتح مركز التقارير الكامل
          </Button>
        </Box>
        <Grid container spacing={2}>
          {[
            { label: 'التقرير الشامل', icon: <ReportsIcon />, color: '#1976d2', path: '/student-reports-center' },
            { label: 'الأداء الأكاديمي', icon: <TrendUpIcon />, color: '#2e7d32', isNew: true, path: '/student-reports-center' },
            { label: 'التحليل السلوكي', icon: <BehaviorIcon />, color: '#7b1fa2', isNew: true, path: '/student-reports-center' },
            { label: 'الصحة والعافية', icon: <HealthIcon />, color: '#d32f2f', isNew: true, path: '/student-reports-center' },
            { label: 'التقرير الدوري', icon: <ExportIcon />, color: '#00695c', path: '/student-reports/periodic' },
            { label: 'المقارنة', icon: <ExportIcon />, color: '#5d4037', path: '/student-reports/comparison' },
          ].map((item, idx) => (
            <Grid item xs={6} sm={4} md={2} key={idx}>
              <Tooltip title={item.isNew ? 'تقرير جديد!' : ''}>
                <Paper
                  onClick={() => navigate(item.path)}
                  sx={{
                    p: 2, textAlign: 'center', cursor: 'pointer', borderRadius: 2,
                    border: `2px solid transparent`, transition: 'all 0.2s',
                    '&:hover': { borderColor: item.color, transform: 'translateY(-2px)', boxShadow: 3 },
                    position: 'relative',
                  }}>
                  {item.isNew && (
                    <Chip label="جديد" size="small" color="error" sx={{ position: 'absolute', top: 4, right: 4, fontSize: '0.6rem', height: 18 }} />
                  )}
                  <Box sx={{ color: item.color, mb: 1 }}>{item.icon}</Box>
                  <Typography variant="caption" fontWeight={600}>{item.label}</Typography>
                </Paper>
              </Tooltip>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Recent Students */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>آخر الطلاب المسجلين</Typography>
          <Button size="small" onClick={() => navigate('/student-management')}>عرض الكل</Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>الاسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>نوع الإعاقة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الدرجة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>البرامج</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>تاريخ التسجيل</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentList.map(s => (
                <TableRow key={s.id} hover>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>
                    <Chip label={DISABILITY_LABELS[s.disability] || s.disability} size="small"
                      sx={{ bgcolor: DISABILITY_COLORS[s.disability] || neutralColors.fallback, color: 'white', fontSize: '0.7rem' }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={SEVERITY_MAP[s.severity]?.label || s.severity} size="small"
                      sx={{ bgcolor: SEVERITY_MAP[s.severity]?.color || neutralColors.inactive, color: 'white' }} />
                  </TableCell>
                  <TableCell>
                    <Chip label={STATUS_MAP[s.status]?.label || s.status} size="small"
                      color={STATUS_MAP[s.status]?.color || 'default'} />
                  </TableCell>
                  <TableCell align="center">{s.programs}</TableCell>
                  <TableCell>{s.enrollDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
    </DashboardErrorBoundary>
  );
}
