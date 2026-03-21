/**
 * SessionAnalyticsDashboard — لوحة تحليلات الجلسات العلاجية المتقدمة
 *
 * Comprehensive analytics dashboard for therapy sessions featuring:
 *  - KPI overview cards (total, completed, cancelled, no-show, attendance %, avg duration)
 *  - Session trends chart (daily / weekly / monthly)
 *  - Therapist performance comparison table
 *  - Room utilization chart
 *  - Attendance heatmap-style bar chart
 *  - Billing summary with billed / unbilled breakdown
 *  - Goal progress analytics
 *  - Cancellation analysis pie chart
 *  - Export report button
 *
 * @version 1.0.0
 */

import { useState, useEffect, useCallback, useMemo } from 'react';





import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, chartColors, statusColors } from '../../theme/palette';
import logger from '../../utils/logger';
import { therapistService } from '../../services/therapistService';

/* ──────────── Demo / fallback data ──────────── */

const DEMO_OVERVIEW = {
  totalSessions: 248,
  completedSessions: 198,
  cancelledSessions: 22,
  noShowSessions: 12,
  scheduledSessions: 16,
  attendanceRate: 85.3,
  completionRate: 79.8,
  avgDuration: 47,
  totalTherapists: 14,
  totalPatients: 68,
  billedAmount: 45600,
  unbilledAmount: 8400,
};

const DEMO_TRENDS = [
  { label: 'الأسبوع 1', completed: 42, cancelled: 5, noShow: 3 },
  { label: 'الأسبوع 2', completed: 48, cancelled: 4, noShow: 2 },
  { label: 'الأسبوع 3', completed: 52, cancelled: 6, noShow: 4 },
  { label: 'الأسبوع 4', completed: 56, cancelled: 7, noShow: 3 },
];

const DEMO_THERAPIST_PERF = [
  { name: 'أ. محمد العلي', totalSessions: 38, completionRate: 95, avgRating: 4.8, avgDuration: 48 },
  { name: 'أ. فاطمة أحمد', totalSessions: 34, completionRate: 91, avgRating: 4.6, avgDuration: 45 },
  { name: 'أ. سارة الخالد', totalSessions: 30, completionRate: 88, avgRating: 4.5, avgDuration: 50 },
  { name: 'أ. عبدالله الحربي', totalSessions: 28, completionRate: 92, avgRating: 4.7, avgDuration: 42 },
  { name: 'أ. نورة السعيد', totalSessions: 25, completionRate: 86, avgRating: 4.4, avgDuration: 46 },
];

const DEMO_ROOMS = [
  { room: 'غرفة العلاج الطبيعي 1', utilization: 88, totalHours: 120 },
  { room: 'غرفة العلاج الوظيفي', utilization: 76, totalHours: 95 },
  { room: 'غرفة النطق والتخاطب', utilization: 82, totalHours: 108 },
  { room: 'غرفة العلاج السلوكي', utilization: 69, totalHours: 86 },
  { room: 'غرفة التعليم الخاص', utilization: 72, totalHours: 91 },
];

const DEMO_ATTENDANCE = {
  overall: 85,
  byDay: [
    { day: 'السبت', rate: 88 },
    { day: 'الأحد', rate: 92 },
    { day: 'الاثنين', rate: 84 },
    { day: 'الثلاثاء', rate: 86 },
    { day: 'الأربعاء', rate: 80 },
    { day: 'الخميس', rate: 78 },
  ],
};

const DEMO_BILLING = {
  totalAmount: 54000,
  billedAmount: 45600,
  unbilledAmount: 8400,
  billedPercentage: 84.4,
  byType: [
    { type: 'علاج طبيعي', amount: 18000, billed: 16200 },
    { type: 'علاج نطق', amount: 14000, billed: 12800 },
    { type: 'علاج وظيفي', amount: 12000, billed: 9600 },
    { type: 'علاج سلوكي', amount: 10000, billed: 7000 },
  ],
};

const DEMO_GOALS = {
  overallProgress: 72,
  goalsByStatus: [
    { status: 'مكتمل', count: 45, color: statusColors.success },
    { status: 'قيد التقدم', count: 62, color: statusColors.primaryBlue || chartColors.category[0] },
    { status: 'متأخر', count: 18, color: statusColors.warning },
    { status: 'لم يبدأ', count: 8, color: statusColors.error },
  ],
};

const DEMO_CANCELLATIONS = {
  total: 22,
  reasons: [
    { reason: 'مرض المريض', count: 8, color: chartColors.category[0] },
    { reason: 'ظرف عائلي', count: 5, color: chartColors.category[1] },
    { reason: 'إلغاء من المعالج', count: 4, color: chartColors.category[2] },
    { reason: 'عدم توفر الغرفة', count: 3, color: chartColors.category[3] },
    { reason: 'أخرى', count: 2, color: chartColors.category[4] },
  ],
};

/* ──────────── Date filter helpers ──────────── */
const PERIOD_OPTIONS = [
  { value: 'week', label: 'أسبوع' },
  { value: 'month', label: 'شهر' },
  { value: '3months', label: '3 أشهر' },
  { value: '6months', label: '6 أشهر' },
  { value: 'year', label: 'سنة' },
];

const TREND_GROUP_OPTIONS = [
  { value: 'daily', label: 'يومي' },
  { value: 'weekly', label: 'أسبوعي' },
  { value: 'monthly', label: 'شهري' },
];

/* ──────────── KPI card animation wrapper ──────────── */
const KPICard = ({ title, value, subtitle, icon, gradient, delay = 0, trend, loading }) => (
  <Grid item xs={12} sm={6} md={4} lg={2}>
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.08 }}
    >
      <Card sx={{ background: gradient, color: '#fff', borderRadius: 3 }} elevation={3}>
        <CardContent sx={{ px: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box>
              <Typography variant="caption" sx={{ opacity: 0.9 }}>{title}</Typography>
              {loading ? (
                <Skeleton width={50} sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
              ) : (
                <Typography variant="h5" fontWeight="bold">{value}</Typography>
              )}
              {subtitle && (
                <Typography variant="caption" sx={{ opacity: 0.85 }}>
                  {subtitle}
                  {trend != null && (
                    <>
                      {' '}
                      {trend >= 0 ? (
                        <TrendingUpIcon sx={{ fontSize: 14, verticalAlign: 'middle', color: '#c8e6c9' }} />
                      ) : (
                        <TrendingDownIcon sx={{ fontSize: 14, verticalAlign: 'middle', color: '#ef9a9a' }} />
                      )}
                      {' '}{Math.abs(trend)}%
                    </>
                  )}
                </Typography>
              )}
            </Box>
            <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 44, height: 44 }}>{icon}</Avatar>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  </Grid>
);

/* ══════════════════════════════════════════════════════════════════════════ */
/*                        MAIN COMPONENT                                    */
/* ══════════════════════════════════════════════════════════════════════════ */
export default function SessionAnalyticsDashboard() {
  const showSnackbar = useSnackbar();

  // ─── State ──────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);
  const [period, setPeriod] = useState('month');
  const [trendGroup, setTrendGroup] = useState('weekly');

  const [overview, setOverview] = useState(DEMO_OVERVIEW);
  const [trends, setTrends] = useState(DEMO_TRENDS);
  const [therapistPerf, setTherapistPerf] = useState(DEMO_THERAPIST_PERF);
  const [rooms, setRooms] = useState(DEMO_ROOMS);
  const [attendance, setAttendance] = useState(DEMO_ATTENDANCE);
  const [billing, setBilling] = useState(DEMO_BILLING);
  const [goals, setGoals] = useState(DEMO_GOALS);
  const [cancellations, setCancellations] = useState(DEMO_CANCELLATIONS);
  const [exporting, setExporting] = useState(false);

  // ─── Fetch all analytics ──────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const q = { period };
      const results = await Promise.allSettled([
        therapistService.getAnalyticsOverview(q),
        therapistService.getSessionTrends({ ...q, groupBy: trendGroup }),
        therapistService.getTherapistPerformanceComparison(q),
        therapistService.getRoomUtilization(q),
        therapistService.getAttendanceReport(q),
        therapistService.getBillingSummary(q),
        therapistService.getGoalProgress(q),
        therapistService.getCancellationAnalysis(q),
      ]);

      const [ovRes, trRes, thRes, rmRes, atRes, blRes, glRes, caRes] = results;

      if (ovRes.status === 'fulfilled' && ovRes.value) setOverview(prev => ({ ...prev, ...ovRes.value }));
      if (trRes.status === 'fulfilled' && trRes.value?.trends) setTrends(trRes.value.trends);
      if (thRes.status === 'fulfilled' && Array.isArray(thRes.value?.therapists)) setTherapistPerf(thRes.value.therapists);
      if (rmRes.status === 'fulfilled' && Array.isArray(rmRes.value?.rooms)) setRooms(rmRes.value.rooms);
      if (atRes.status === 'fulfilled' && atRes.value) setAttendance(prev => ({ ...prev, ...atRes.value }));
      if (blRes.status === 'fulfilled' && blRes.value) setBilling(prev => ({ ...prev, ...blRes.value }));
      if (glRes.status === 'fulfilled' && glRes.value) setGoals(prev => ({ ...prev, ...glRes.value }));
      if (caRes.status === 'fulfilled' && caRes.value) setCancellations(prev => ({ ...prev, ...caRes.value }));
    } catch (err) {
      logger.warn('SessionAnalyticsDashboard: fetch error', err);
      showSnackbar('تعذر تحميل التحليلات — يتم عرض بيانات تجريبية', 'warning');
    } finally {
      setLoading(false);
    }
  }, [period, trendGroup, showSnackbar]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // ─── Export handler ──────────────────────────────────────────
  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const result = await therapistService.exportReport({ period, format: 'csv', sections: ['overview', 'trends', 'therapistPerformance', 'billing'] });
      if (result?.csvContent) {
        const blob = new Blob([result.csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `therapy-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        showSnackbar('تم تصدير التقرير بنجاح', 'success');
      } else {
        showSnackbar('تم تصدير البيانات', 'success');
      }
    } catch (err) {
      logger.warn('Export failed:', err);
      showSnackbar('فشل تصدير التقرير', 'error');
    } finally {
      setExporting(false);
    }
  }, [period, showSnackbar]);

  // ─── Derived data ────────────────────────────────────────────
  const billingChartData = useMemo(() => {
    if (!billing?.byType) return [];
    return billing.byType.map((b, i) => ({
      type: b.type || b._id || `نوع ${i + 1}`,
      billed: b.billed || b.billedAmount || 0,
      unbilled: (b.amount || b.totalAmount || 0) - (b.billed || b.billedAmount || 0),
    }));
  }, [billing]);

  /* ═══════════════════════════════════════════════════════════════ */
  /*                          RENDER                                */
  /* ═══════════════════════════════════════════════════════════════ */
  return (
    <DashboardErrorBoundary>
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

        {/* ──── Header ──── */}
        <Box
          sx={{
            background: gradients.primary,
            borderRadius: 3, p: 3, mb: 4, color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexWrap: 'wrap', gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AnalyticsIcon sx={{ fontSize: 44 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">
                تحليلات الجلسات العلاجية
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                إحصائيات وتقارير متقدمة عن أداء الجلسات والمعالجين
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              select
              size="small"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              sx={{
                minWidth: 120,
                '& .MuiOutlinedInput-root': {
                  color: 'white',
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
                  '&:hover fieldset': { borderColor: 'white' },
                },
                '& .MuiSelect-icon': { color: 'white' },
                '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.8)' },
              }}
              label="الفترة"
            >
              {PERIOD_OPTIONS.map(p => <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>)}
            </TextField>
            <Tooltip title="تحديث البيانات">
              <IconButton onClick={fetchAnalytics} sx={{ color: 'white' }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              color="inherit"
              startIcon={<ExportIcon />}
              onClick={handleExport}
              disabled={exporting}
              sx={{ color: '#1565c0', fontWeight: 600 }}
            >
              {exporting ? 'جاري التصدير...' : 'تصدير التقرير'}
            </Button>
          </Stack>
        </Box>

        {/* ──── KPI Cards ──── */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <KPICard
            title="إجمالي الجلسات" value={overview.totalSessions}
            subtitle={`${overview.scheduledSessions || 0} مجدولة`}
            icon={<ScheduleIcon />} gradient={gradients.primary} delay={0} loading={loading}
          />
          <KPICard
            title="مكتملة" value={overview.completedSessions}
            subtitle={`${overview.completionRate?.toFixed?.(1) || overview.completionRate || 0}%`}
            icon={<CheckCircleIcon />} gradient={gradients.success} delay={1} loading={loading}
          />
          <KPICard
            title="ملغاة" value={overview.cancelledSessions}
            icon={<CancelIcon />} gradient={gradients.warning} delay={2} loading={loading}
          />
          <KPICard
            title="لم يحضر" value={overview.noShowSessions}
            icon={<NoShowIcon />} gradient={gradients.error || gradients.danger} delay={3} loading={loading}
          />
          <KPICard
            title="نسبة الحضور" value={`${overview.attendanceRate?.toFixed?.(1) || overview.attendanceRate || 0}%`}
            subtitle={`${overview.totalPatients || 0} مريض`}
            icon={<GroupsIcon />} gradient={gradients.info} delay={4} loading={loading}
          />
          <KPICard
            title="متوسط المدة" value={`${overview.avgDuration || 0} د`}
            subtitle={`${overview.totalTherapists || 0} معالج`}
            icon={<AccessTimeIcon />} gradient={gradients.secondary || gradients.purple} delay={5} loading={loading}
          />
        </Grid>

        {/* ──── Tabs ──── */}
        <Paper sx={{ mb: 3, borderRadius: 3 }}>
          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTabIndex(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ px: 2, pt: 1 }}
          >
            <Tab icon={<TrendingUpIcon />} iconPosition="start" label="الاتجاهات" />
            <Tab icon={<GroupsIcon />} iconPosition="start" label="أداء المعالجين" />
            <Tab icon={<RoomIcon />} iconPosition="start" label="استغلال الغرف" />
            <Tab icon={<BarChartIcon />} iconPosition="start" label="الحضور" />
            <Tab icon={<MoneyIcon />} iconPosition="start" label="الفوترة" />
            <Tab icon={<GoalIcon />} iconPosition="start" label="تقدم الأهداف" />
            <Tab icon={<CancelAnalysisIcon />} iconPosition="start" label="تحليل الإلغاء" />
          </Tabs>
        </Paper>

        {/* ──── Tab 0: Trends ──── */}
        {tabIndex === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight={600}>
                  اتجاه الجلسات
                </Typography>
                <TextField
                  select size="small" value={trendGroup}
                  onChange={(e) => setTrendGroup(e.target.value)}
                  sx={{ minWidth: 110 }}
                >
                  {TREND_GROUP_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
              </Box>
              {trends.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={statusColors.success} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={statusColors.success} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gCancelled" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={statusColors.error} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={statusColors.error} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis />
                    <RTooltip />
                    <Legend />
                    <Area type="monotone" dataKey="completed" stroke={statusColors.success} fill="url(#gCompleted)" name="مكتملة" strokeWidth={2} />
                    <Area type="monotone" dataKey="cancelled" stroke={statusColors.error} fill="url(#gCancelled)" name="ملغاة" strokeWidth={2} />
                    <Area type="monotone" dataKey="noShow" stroke={statusColors.warning} fill="transparent" name="لم يحضر" strokeWidth={2} strokeDasharray="5 5" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState height={340} />
              )}
            </Paper>
          </motion.div>
        )}

        {/* ──── Tab 1: Therapist Performance ──── */}
        {tabIndex === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={7}>
                <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    مقارنة أداء المعالجين
                  </Typography>
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>#</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>المعالج</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>الجلسات</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>نسبة الإنجاز</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>التقييم</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700 }}>متوسط المدة</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {therapistPerf.map((t, i) => (
                          <TableRow key={i} hover>
                            <TableCell>
                              <Chip
                                label={i + 1}
                                size="small"
                                color={i === 0 ? 'success' : i < 3 ? 'primary' : 'default'}
                              />
                            </TableCell>
                            <TableCell sx={{ fontWeight: 600 }}>{t.name || t.therapistName}</TableCell>
                            <TableCell align="center">
                              <Chip label={t.totalSessions} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <LinearProgress
                                  variant="determinate"
                                  value={t.completionRate || 0}
                                  sx={{ flex: 1, height: 8, borderRadius: 4 }}
                                  color={t.completionRate >= 90 ? 'success' : t.completionRate >= 80 ? 'warning' : 'error'}
                                />
                                <Typography variant="caption" fontWeight={600}>
                                  {t.completionRate?.toFixed?.(0) || t.completionRate || 0}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={`⭐ ${t.avgRating?.toFixed?.(1) || t.avgRating || '-'}`}
                                size="small"
                                color={t.avgRating >= 4.5 ? 'success' : t.avgRating >= 4 ? 'primary' : 'default'}
                              />
                            </TableCell>
                            <TableCell align="center">{t.avgDuration || '-'} د</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Paper>
              </Grid>
              <Grid item xs={12} md={5}>
                <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    رادار الأداء
                  </Typography>
                  {therapistPerf.length > 0 ? (
                    <ResponsiveContainer width="100%" height={320}>
                      <RadarChart data={therapistPerf.slice(0, 5).map(t => ({
                        name: (t.name || t.therapistName || '').split(' ').slice(-1)[0],
                        sessions: (t.totalSessions / (therapistPerf[0]?.totalSessions || 1)) * 100,
                        completion: t.completionRate || 0,
                        rating: ((t.avgRating || 0) / 5) * 100,
                        duration: ((t.avgDuration || 0) / 60) * 100,
                      }))}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="name" />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                        <Radar name="الجلسات" dataKey="sessions" stroke={chartColors.category[0]} fill={chartColors.category[0]} fillOpacity={0.2} />
                        <Radar name="الإنجاز" dataKey="completion" stroke={chartColors.category[1]} fill={chartColors.category[1]} fillOpacity={0.2} />
                        <Radar name="التقييم" dataKey="rating" stroke={chartColors.category[2]} fill={chartColors.category[2]} fillOpacity={0.2} />
                        <Legend />
                      </RadarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState height={320} />
                  )}
                </Paper>
              </Grid>
            </Grid>
          </motion.div>
        )}

        {/* ──── Tab 2: Room Utilization ──── */}
        {tabIndex === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Paper sx={{ p: 3, borderRadius: 3 }}>
              <Typography variant="h6" fontWeight={600} gutterBottom>
                <RoomIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                نسبة استغلال الغرف
              </Typography>
              {rooms.length > 0 ? (
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={rooms} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="room" width={160} />
                    <RTooltip formatter={(v) => `${v}%`} />
                    <Bar dataKey="utilization" name="نسبة الاستغلال" radius={[0, 6, 6, 0]}>
                      {rooms.map((r, i) => (
                        <Cell
                          key={i}
                          fill={
                            (r.utilization || 0) >= 85 ? statusColors.success :
                            (r.utilization || 0) >= 70 ? (statusColors.primaryBlue || chartColors.category[0]) :
                            statusColors.warning
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState height={340} />
              )}
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                {rooms.map((r, i) => (
                  <Grid item xs={12} sm={6} md={4} key={i}>
                    <Card variant="outlined" sx={{ borderRadius: 2 }}>
                      <CardContent sx={{ py: 1.5 }}>
                        <Typography variant="subtitle2" fontWeight={600}>{r.room}</Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                          <LinearProgress
                            variant="determinate"
                            value={r.utilization || 0}
                            sx={{ flex: 1, height: 8, borderRadius: 4 }}
                            color={(r.utilization || 0) >= 85 ? 'success' : (r.utilization || 0) >= 70 ? 'primary' : 'warning'}
                          />
                          <Typography variant="body2" fontWeight={600}>{r.utilization}%</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {r.totalHours || 0} ساعة إجمالية
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          </motion.div>
        )}

        {/* ──── Tab 3: Attendance ──── */}
        {tabIndex === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    نسبة الحضور الإجمالية
                  </Typography>
                  <Box sx={{ position: 'relative', display: 'inline-flex', mx: 'auto', my: 2 }}>
                    <Box
                      sx={{
                        width: 160, height: 160, borderRadius: '50%',
                        background: `conic-gradient(${statusColors.success} ${(attendance.overall || 0) * 3.6}deg, #e0e0e0 0deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Box
                        sx={{
                          width: 120, height: 120, borderRadius: '50%',
                          bgcolor: 'background.paper', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Typography variant="h3" fontWeight="bold" color="primary">
                          {attendance.overall || 0}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  <Alert severity={attendance.overall >= 85 ? 'success' : attendance.overall >= 70 ? 'warning' : 'error'} sx={{ mt: 2 }}>
                    {attendance.overall >= 85 ? 'ممتاز — نسبة حضور مرتفعة' :
                     attendance.overall >= 70 ? 'جيد — يمكن تحسين نسبة الحضور' :
                     'تحتاج تحسين — نسبة حضور منخفضة'}
                  </Alert>
                </Paper>
              </Grid>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    نسبة الحضور حسب اليوم
                  </Typography>
                  {attendance.byDay?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={attendance.byDay}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="day" />
                        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                        <RTooltip formatter={(v) => `${v}%`} />
                        <Bar dataKey="rate" name="نسبة الحضور" radius={[6, 6, 0, 0]}>
                          {(attendance.byDay || []).map((d, i) => (
                            <Cell
                              key={i}
                              fill={
                                (d.rate || 0) >= 85 ? statusColors.success :
                                (d.rate || 0) >= 70 ? (statusColors.primaryBlue || chartColors.category[0]) :
                                statusColors.warning
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState height={300} />
                  )}
                </Paper>
              </Grid>
            </Grid>
          </motion.div>
        )}

        {/* ──── Tab 4: Billing ──── */}
        {tabIndex === 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Grid container spacing={3}>
              {/* Billing KPI row */}
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ background: gradients.success, color: '#fff', borderRadius: 3 }}>
                      <CardContent>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>إجمالي المبالغ</Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {(billing.totalAmount || 0).toLocaleString()} ر.س
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ background: gradients.info, color: '#fff', borderRadius: 3 }}>
                      <CardContent>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>تم الفوترة</Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {(billing.billedAmount || 0).toLocaleString()} ر.س
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.85 }}>
                          {billing.billedPercentage?.toFixed?.(1) || billing.billedPercentage || 0}% من الإجمالي
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Card sx={{ background: gradients.warning, color: '#fff', borderRadius: 3 }}>
                      <CardContent>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>غير مفوتر</Typography>
                        <Typography variant="h4" fontWeight="bold">
                          {(billing.unbilledAmount || 0).toLocaleString()} ر.س
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>
              {/* Billing chart by type */}
              <Grid item xs={12}>
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    الفوترة حسب نوع الجلسة
                  </Typography>
                  {billingChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={billingChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="type" />
                        <YAxis />
                        <RTooltip />
                        <Legend />
                        <Bar dataKey="billed" name="مفوتر" fill={statusColors.success} stackId="billing" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="unbilled" name="غير مفوتر" fill={statusColors.warning} stackId="billing" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState height={300} />
                  )}
                </Paper>
              </Grid>
            </Grid>
          </motion.div>
        )}

        {/* ──── Tab 5: Goal Progress ──── */}
        {tabIndex === 5 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={5}>
                <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    التقدم الإجمالي في الأهداف
                  </Typography>
                  <Box sx={{ position: 'relative', display: 'inline-flex', mx: 'auto', my: 2 }}>
                    <Box
                      sx={{
                        width: 160, height: 160, borderRadius: '50%',
                        background: `conic-gradient(${chartColors.category[0]} ${(goals.overallProgress || 0) * 3.6}deg, #e0e0e0 0deg)`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Box
                        sx={{
                          width: 120, height: 120, borderRadius: '50%',
                          bgcolor: 'background.paper', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                        }}
                      >
                        <Typography variant="h3" fontWeight="bold" color="primary">
                          {goals.overallProgress || 0}%
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              </Grid>
              <Grid item xs={12} md={7}>
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    الأهداف حسب الحالة
                  </Typography>
                  {goals.goalsByStatus?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={goals.goalsByStatus}
                          cx="50%" cy="50%"
                          outerRadius={100} innerRadius={55}
                          dataKey="count"
                          nameKey="status"
                          label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                        >
                          {goals.goalsByStatus.map((g, i) => (
                            <Cell key={i} fill={g.color || chartColors.category[i]} />
                          ))}
                        </Pie>
                        <RTooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <EmptyState height={280} />
                  )}
                </Paper>
              </Grid>
            </Grid>
          </motion.div>
        )}

        {/* ──── Tab 6: Cancellation Analysis ──── */}
        {tabIndex === 6 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Paper sx={{ p: 3, borderRadius: 3, textAlign: 'center' }}>
                  <CancelAnalysisIcon sx={{ fontSize: 48, color: statusColors.error, mb: 1 }} />
                  <Typography variant="h6" fontWeight={600}>إجمالي الإلغاءات</Typography>
                  <Typography variant="h2" fontWeight="bold" color="error">
                    {cancellations.total || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    خلال الفترة المحددة
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={12} md={8}>
                <Paper sx={{ p: 3, borderRadius: 3 }}>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    أسباب الإلغاء
                  </Typography>
                  {cancellations.reasons?.length > 0 ? (
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <ResponsiveContainer width="100%" height={260}>
                          <PieChart>
                            <Pie
                              data={cancellations.reasons}
                              cx="50%" cy="50%"
                              outerRadius={90} innerRadius={45}
                              dataKey="count"
                              nameKey="reason"
                            >
                              {cancellations.reasons.map((r, i) => (
                                <Cell key={i} fill={r.color || chartColors.category[i]} />
                              ))}
                            </Pie>
                            <RTooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Stack spacing={1.5} sx={{ pt: 2 }}>
                          {cancellations.reasons.map((r, i) => (
                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <Box sx={{ width: 14, height: 14, borderRadius: '50%', bgcolor: r.color || chartColors.category[i], flexShrink: 0 }} />
                              <Typography variant="body2" sx={{ flex: 1 }}>{r.reason}</Typography>
                              <Chip label={r.count} size="small" variant="outlined" />
                            </Box>
                          ))}
                        </Stack>
                      </Grid>
                    </Grid>
                  ) : (
                    <EmptyState height={260} />
                  )}
                </Paper>
              </Grid>
            </Grid>
          </motion.div>
        )}
      </Container>
    </DashboardErrorBoundary>
  );
}
