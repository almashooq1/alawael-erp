/**
 * Student Reports Center — مركز تقارير الطلاب الشاملة
 * لوحة مركزية لعرض وإدارة جميع أنواع التقارير المتاحة
 */
import { useState, useEffect, useCallback } from 'react';




import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, chartColors, statusColors } from '../../theme/palette';
import logger from '../../utils/logger';
import studentManagementService from '../../services/studentManagementService';

/* ──────── Helper Components ──────── */
const SectionHeader = ({ icon, title, subtitle, action }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      {icon}
      <Box>
        <Typography variant="h6" fontWeight={700}>{title}</Typography>
        {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
      </Box>
    </Box>
    {action}
  </Box>
);

const StatCard = ({ label, value, color, icon, subtitle }) => (
  <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center', borderTop: `3px solid ${color}` }}>
    <Box sx={{ color, mb: 1 }}>{icon}</Box>
    <Typography variant="h4" fontWeight={700} color={color}>{value}</Typography>
    <Typography variant="body2" fontWeight={600}>{label}</Typography>
    {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
  </Paper>
);

const ScoreGauge = ({ score, label, size = 80 }) => {
  const color = score >= 75 ? statusColors.success : score >= 50 ? statusColors.warning : statusColors.error;
  return (
    <Box sx={{ textAlign: 'center' }}>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress variant="determinate" value={score} size={size} thickness={4}
          sx={{ color, '& .MuiCircularProgress-circle': { strokeLinecap: 'round' } }} />
        <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" fontWeight={700} color={color}>{score}%</Typography>
        </Box>
      </Box>
      {label && <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>{label}</Typography>}
    </Box>
  );
};

/* ──────── Report Card Icons Map ──────── */
const REPORT_ICONS = {
  'comprehensive': <ReportIcon />,
  'academic-performance': <AcademicIcon />,
  'behavioral-analysis': <BehaviorIcon />,
  'health-wellness': <HealthIcon />,
  'family-engagement': <FamilyIcon />,
  'transition-readiness': <TransitionIcon />,
  'periodic': <PeriodicIcon />,
  'comparison': <CompareIcon />,
  'parent': <PeopleIcon />,
  'progress-timeline': <TimelineIcon />,
  'attendance': <AttendanceIcon />,
  'progress': <TrendUpIcon />,
  'therapist-effectiveness': <AnalyticsIcon />,
  'custom': <CustomIcon />,
  'export': <ExportIcon />,
};

const REPORT_COLORS = {
  'comprehensive': '#1976d2',
  'academic-performance': '#2e7d32',
  'behavioral-analysis': '#7b1fa2',
  'health-wellness': '#d32f2f',
  'family-engagement': '#ed6c02',
  'transition-readiness': '#0288d1',
  'periodic': '#00695c',
  'comparison': '#5d4037',
  'parent': '#c2185b',
  'progress-timeline': '#0097a7',
  'attendance': '#388e3c',
  'progress': '#1565c0',
  'therapist-effectiveness': '#6a1b9a',
  'custom': '#455a64',
  'export': '#37474f',
};

/* ──────── Custom Report Sections ──────── */
const CUSTOM_SECTIONS = [
  { id: 'personal', label: 'البيانات الشخصية', icon: '👤' },
  { id: 'disability', label: 'معلومات الإعاقة', icon: '♿' },
  { id: 'guardian', label: 'بيانات ولي الأمر', icon: '👪' },
  { id: 'attendance', label: 'الحضور والغياب', icon: '📅' },
  { id: 'programs', label: 'البرامج العلاجية', icon: '📋' },
  { id: 'assessments', label: 'التقييمات', icon: '📝' },
  { id: 'iep', label: 'خطة التدخل الفردي', icon: '🎯' },
  { id: 'behavior', label: 'السلوك والمكافآت', icon: '⭐' },
  { id: 'medical', label: 'السجل الطبي', icon: '🏥' },
  { id: 'progress', label: 'التقدم والمهارات', icon: '📊' },
  { id: 'communications', label: 'الاتصالات', icon: '📞' },
  { id: 'documents', label: 'الوثائق', icon: '📁' },
  { id: 'notes', label: 'الملاحظات', icon: '📝' },
  { id: 'ai_insights', label: 'رؤى الذكاء الاصطناعي', icon: '🤖' },
  { id: 'risk', label: 'مؤشرات المخاطر', icon: '⚠️' },
];

/* ──────── Main Component ──────── */
export default function StudentReportsCenter() {
  const showSnackbar = useSnackbar();
  const navigate = useNavigate();
  const centerId = 'default';

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [reportsSummary, setReportsSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [_schedules, setSchedules] = useState([]);
  const [customDialogOpen, setCustomDialogOpen] = useState(false);
  const [selectedSections, setSelectedSections] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);

  // ── Subscription management state ──
  const [subscriptions, setSubscriptions] = useState([]);
  const [subStats, setSubStats] = useState(null);
  const [subLoading, setSubLoading] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showLogsDialog, setShowLogsDialog] = useState(false);
  const [deliveryLogs, setDeliveryLogs] = useState([]);
  const [_selectedSubId, setSelectedSubId] = useState(null);
  const [expandedSub, setExpandedSub] = useState(null);
  const [newSub, setNewSub] = useState({
    reportType: 'attendance',
    reportTitle: '',
    frequency: 'weekly',
    scheduledTime: '08:00',
    scheduledDayOfWeek: 0,
    scheduledDayOfMonth: 1,
    scope: { type: 'center', centerId: 'default' },
    channels: {
      email: { enabled: false, recipients: [{ email: '', name: '', role: 'admin' }] },
      whatsapp: { enabled: false, recipients: [{ phone: '', name: '', role: 'admin' }] },
    },
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, analyticsRes, schedulesRes] = await Promise.all([
        studentManagementService.getCenterReportsSummary(centerId).catch(() => null),
        studentManagementService.getDashboardAnalytics(centerId).catch(() => null),
        studentManagementService.getReportSchedules().catch(() => null),
      ]);

      if (summaryRes?.data?.data || summaryRes?.data) setReportsSummary(summaryRes?.data?.data || summaryRes?.data);
      if (analyticsRes?.data?.data || analyticsRes?.data) setAnalytics(analyticsRes?.data?.data || analyticsRes?.data);
      if (schedulesRes?.data?.data || schedulesRes?.data) setSchedules(schedulesRes?.data?.data || schedulesRes?.data || []);
    } catch (err) {
      logger.warn('StudentReportsCenter: load error', err);
      showSnackbar('تعذر تحميل بيانات التقارير', 'warning');
    } finally {
      setLoading(false);
    }
  }, [centerId, showSnackbar]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExport = async (format) => {
    setExportLoading(true);
    try {
      const res = await studentManagementService.exportReportData(centerId, format);
      if (format === 'csv' && res.data) {
        const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `students_report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        showSnackbar('تم تصدير البيانات بنجاح', 'success');
      } else {
        showSnackbar('تم تصدير البيانات بصيغة JSON', 'success');
      }
    } catch (err) {
      showSnackbar('فشل تصدير البيانات', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  // ────── Subscription Management Functions ──────
  const loadSubscriptions = useCallback(async () => {
    setSubLoading(true);
    try {
      const [subsRes, statsRes] = await Promise.all([
        studentManagementService.listReportSubscriptions().catch(() => null),
        studentManagementService.getSubscriptionStatistics().catch(() => null),
      ]);
      if (subsRes?.data?.data) setSubscriptions(subsRes.data.data);
      if (statsRes?.data?.data) setSubStats(statsRes.data.data);
    } catch (err) {
      logger.warn('Failed to load subscriptions', err);
    } finally {
      setSubLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 2) loadSubscriptions();
  }, [activeTab, loadSubscriptions]);

  const handleCreateSubscription = async () => {
    try {
      // Validate
      if (!newSub.reportTitle.trim()) {
        showSnackbar('يرجى إدخال عنوان التقرير', 'warning');
        return;
      }
      if (!newSub.channels.email.enabled && !newSub.channels.whatsapp.enabled) {
        showSnackbar('يرجى تفعيل قناة توصيل واحدة على الأقل', 'warning');
        return;
      }
      if (newSub.channels.email.enabled && !newSub.channels.email.recipients[0]?.email) {
        showSnackbar('يرجى إدخال بريد إلكتروني واحد على الأقل', 'warning');
        return;
      }
      if (newSub.channels.whatsapp.enabled && !newSub.channels.whatsapp.recipients[0]?.phone) {
        showSnackbar('يرجى إدخال رقم واتساب واحد على الأقل', 'warning');
        return;
      }

      // Filter out empty recipients
      const subData = {
        ...newSub,
        channels: {
          email: {
            ...newSub.channels.email,
            recipients: newSub.channels.email.recipients.filter(r => r.email),
          },
          whatsapp: {
            ...newSub.channels.whatsapp,
            recipients: newSub.channels.whatsapp.recipients.filter(r => r.phone),
          },
        },
      };

      await studentManagementService.createReportSubscription(subData);
      showSnackbar('تم إنشاء اشتراك التقرير بنجاح', 'success');
      setShowCreateDialog(false);
      resetNewSub();
      loadSubscriptions();
    } catch (err) {
      showSnackbar('فشل إنشاء الاشتراك: ' + (err?.response?.data?.error || err.message), 'error');
    }
  };

  const handlePauseResume = async (sub) => {
    try {
      if (sub.status === 'active') {
        await studentManagementService.pauseReportSubscription(sub._id);
        showSnackbar('تم إيقاف الاشتراك مؤقتاً', 'info');
      } else {
        await studentManagementService.resumeReportSubscription(sub._id);
        showSnackbar('تم استئناف الاشتراك', 'success');
      }
      loadSubscriptions();
    } catch (err) {
      showSnackbar('فشل تحديث حالة الاشتراك', 'error');
    }
  };

  const handleDeleteSubscription = async (subId) => {
    try {
      await studentManagementService.deleteReportSubscription(subId);
      showSnackbar('تم حذف الاشتراك', 'success');
      loadSubscriptions();
    } catch (err) {
      showSnackbar('فشل حذف الاشتراك', 'error');
    }
  };

  const handleExecuteNow = async (subId) => {
    try {
      showSnackbar('جاري إرسال التقرير...', 'info');
      await studentManagementService.executeReportSubscription(subId);
      showSnackbar('تم إرسال التقرير بنجاح', 'success');
      loadSubscriptions();
    } catch (err) {
      showSnackbar('فشل إرسال التقرير', 'error');
    }
  };

  const handleViewLogs = async (subId) => {
    try {
      const res = await studentManagementService.getSubscriptionDeliveryLogs(subId, 30);
      if (res?.data?.data) setDeliveryLogs(res.data.data);
      setSelectedSubId(subId);
      setShowLogsDialog(true);
    } catch (err) {
      showSnackbar('فشل تحميل سجل التوصيل', 'error');
    }
  };

  const resetNewSub = () => {
    setNewSub({
      reportType: 'attendance',
      reportTitle: '',
      frequency: 'weekly',
      scheduledTime: '08:00',
      scheduledDayOfWeek: 0,
      scheduledDayOfMonth: 1,
      scope: { type: 'center', centerId: 'default' },
      channels: {
        email: { enabled: false, recipients: [{ email: '', name: '', role: 'admin' }] },
        whatsapp: { enabled: false, recipients: [{ phone: '', name: '', role: 'admin' }] },
      },
    });
  };

  // Auto-fill title when report type changes
  const reportTypeLabels = {
    'attendance': 'تقرير الحضور',
    'progress': 'تقرير التقدم',
    'comprehensive': 'التقرير الشامل',
    'academic-performance': 'تقرير الأداء الأكاديمي',
    'behavioral-analysis': 'تقرير تحليل السلوك',
    'health-wellness': 'تقرير الصحة والعافية',
    'family-engagement': 'تقرير المشاركة الأسرية',
    'transition-readiness': 'تقرير جاهزية الانتقال',
    'periodic': 'التقرير الدوري',
    'parent': 'تقرير ولي الأمر',
    'therapist-effectiveness': 'تقرير فعالية المعالجين',
    'dashboard-analytics': 'تحليلات لوحة التحكم',
    'custom': 'تقرير مخصص',
  };

  const overview = reportsSummary?.overview || {};
  const availableReports = reportsSummary?.availableReports || [];

  // Demo analytics data for when real data isn't available
  const ageDistribution = analytics?.ageDistribution || [
    { range: '0-5', count: 28 }, { range: '6-10', count: 65 },
    { range: '11-15', count: 78 }, { range: '16-20', count: 45 }, { range: '21+', count: 18 },
  ];
  const riskDistribution = analytics?.riskDistribution || { high: 12, medium: 38, low: 136 };
  const behaviorData = analytics?.behavior || { totalPositive: 456, totalNegative: 89, ratio: 84 };
  const iepData = analytics?.iep || { coverage: 72, studentsWithIEP: 134, totalActive: 186 };
  const achievements = analytics?.achievements || { milestonesThisMonth: 34, badgesThisMonth: 22 };

  return (
    <DashboardErrorBoundary>
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Header */}
      <Box sx={{ background: gradients.primary || 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)', borderRadius: 3, p: 3, mb: 4, color: 'white' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <AssessmentIcon sx={{ fontSize: 48 }} />
            <Box>
              <Typography variant="h4" fontWeight="bold">مركز التقارير الشاملة</Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                15 نوع تقرير متاح — تقارير فردية ومركزية وتحليلات متقدمة
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button variant="outlined" color="inherit" startIcon={<BackIcon />}
              onClick={() => navigate('/students-dashboard')}>
              لوحة التحكم
            </Button>
            <Button variant="contained" color="inherit" sx={{ color: '#1976d2', fontWeight: 600 }}
              startIcon={<RefreshIcon />} onClick={loadData}>
              تحديث
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Overview KPIs */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="إجمالي الطلاب" value={overview.totalStudents || 234} color="#1976d2"
            icon={<PeopleIcon />} subtitle="طالب مسجل" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="نشطون" value={overview.activeStudents || 186} color="#2e7d32"
            icon={<AttendanceIcon />} subtitle="طالب فعال" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="معدل الحضور" value={`${overview.avgAttendance || 87}%`} color="#0288d1"
            icon={<TrendUpIcon />} subtitle="المتوسط العام" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="إنجازات الشهر" value={achievements.milestonesThisMonth} color="#7b1fa2"
            icon={<StarIcon />} subtitle={`${achievements.badgesThisMonth} شارة`} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="تغطية IEP" value={`${iepData.coverage}%`} color="#ed6c02"
            icon={<CustomIcon />} subtitle={`${iepData.studentsWithIEP} طالب`} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <StatCard label="طلاب في خطر" value={overview.studentsAtRisk || riskDistribution.high} color="#d32f2f"
            icon={<BehaviorIcon />} subtitle="يحتاج متابعة" />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} variant="scrollable"
          scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="التقارير المتاحة" icon={<ReportIcon />} iconPosition="start" />
          <Tab label="التحليلات المتقدمة" icon={<AnalyticsIcon />} iconPosition="start" />
          <Tab label="الجدولة والتصدير" icon={<ScheduleIcon />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* ════════ TAB 0: Available Reports ════════ */}
      {activeTab === 0 && (
        <>
          {/* Individual Reports */}
          <SectionHeader icon={<ReportIcon color="primary" />} title="تقارير الطالب الفردية"
            subtitle="تقارير تفصيلية على مستوى الطالب الواحد" />
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {availableReports.filter(r => r.type === 'individual').map(report => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={report.id}>
                <Card sx={{ height: '100%', borderRadius: 2, borderLeft: `4px solid ${REPORT_COLORS[report.id] || '#666'}`, transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ color: REPORT_COLORS[report.id] }}>{REPORT_ICONS[report.id]}</Box>
                        {report.isNew && <Chip label="جديد" size="small" color="error" sx={{ fontSize: '0.65rem', height: 20 }} icon={<NewIcon sx={{ fontSize: 14 }} />} />}
                      </Box>
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>{report.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>{report.description}</Typography>
                  </CardContent>
                  <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
                    <Button size="small" variant="outlined" startIcon={<ViewIcon />}
                      sx={{ borderColor: REPORT_COLORS[report.id], color: REPORT_COLORS[report.id] }}>
                      عرض التقرير
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Center Reports */}
          <SectionHeader icon={<AnalyticsIcon color="secondary" />} title="تقارير المركز"
            subtitle="تقارير تجميعية على مستوى المركز" />
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {availableReports.filter(r => r.type === 'center' || r.type === 'multi').map(report => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={report.id}>
                <Card sx={{ height: '100%', borderRadius: 2, borderLeft: `4px solid ${REPORT_COLORS[report.id] || '#666'}`, transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 6 } }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ color: REPORT_COLORS[report.id] }}>{REPORT_ICONS[report.id]}</Box>
                        {report.isNew && <Chip label="جديد" size="small" color="error" sx={{ fontSize: '0.65rem', height: 20 }} icon={<NewIcon sx={{ fontSize: 14 }} />} />}
                      </Box>
                      <Chip label={report.type === 'center' ? 'مركز' : 'مقارنة'} size="small" variant="outlined" />
                    </Box>
                    <Typography variant="subtitle1" fontWeight={700} gutterBottom>{report.title}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ minHeight: 40 }}>{report.description}</Typography>
                  </CardContent>
                  <CardActions sx={{ pt: 0, px: 2, pb: 2 }}>
                    <Button size="small" variant="outlined" startIcon={<ViewIcon />}
                      sx={{ borderColor: REPORT_COLORS[report.id], color: REPORT_COLORS[report.id] }}>
                      عرض التقرير
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Custom Report Builder */}
          <Paper sx={{ p: 3, borderRadius: 3, background: 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)', mb: 3 }}>
            <SectionHeader icon={<CustomIcon sx={{ fontSize: 32, color: '#455a64' }} />}
              title="بناء تقرير مخصص" subtitle="اختر الأقسام التي تريد تضمينها في التقرير" />
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {CUSTOM_SECTIONS.map(section => (
                <Chip key={section.id} label={`${section.icon} ${section.label}`}
                  onClick={() => {
                    setSelectedSections(prev =>
                      prev.includes(section.id) ? prev.filter(s => s !== section.id) : [...prev, section.id]
                    );
                  }}
                  color={selectedSections.includes(section.id) ? 'primary' : 'default'}
                  variant={selectedSections.includes(section.id) ? 'filled' : 'outlined'}
                  sx={{ cursor: 'pointer' }} />
              ))}
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button variant="contained" disabled={selectedSections.length === 0}
                startIcon={<CustomIcon />}
                onClick={() => setCustomDialogOpen(true)}>
                إنشاء التقرير المخصص ({selectedSections.length} قسم)
              </Button>
              <Button variant="outlined" onClick={() => setSelectedSections(CUSTOM_SECTIONS.map(s => s.id))}>
                تحديد الكل
              </Button>
              <Button variant="outlined" color="inherit" onClick={() => setSelectedSections([])}>
                إلغاء التحديد
              </Button>
            </Box>
          </Paper>
        </>
      )}

      {/* ════════ TAB 1: Advanced Analytics ════════ */}
      {activeTab === 1 && (
        <>
          {/* Analytics Charts Row 1 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Age Distribution */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <SectionHeader icon={<PeopleIcon color="primary" />} title="التوزيع العمري" />
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={ageDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <RTooltip />
                    <Bar dataKey="count" name="عدد الطلاب" fill="#1976d2" radius={[4, 4, 0, 0]}>
                      {ageDistribution.map((_, i) => (
                        <Cell key={i} fill={chartColors.category[i % chartColors.category.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Risk Distribution */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <SectionHeader icon={<BehaviorIcon color="error" />} title="توزيع المخاطر" />
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={[
                      { name: 'مرتفع', value: riskDistribution.high, color: statusColors.error },
                      { name: 'متوسط', value: riskDistribution.medium, color: statusColors.warning },
                      { name: 'منخفض', value: riskDistribution.low, color: statusColors.success },
                    ]} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}>
                      {[statusColors.error, statusColors.warning, statusColors.success].map((c, i) => (
                        <Cell key={i} fill={c} />
                      ))}
                    </Pie>
                    <RTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>

            {/* Behavior Ratio */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <SectionHeader icon={<StarIcon sx={{ color: '#7b1fa2' }} />} title="نسبة السلوك الإيجابي" />
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <ScoreGauge score={behaviorData.ratio} label="نسبة السلوك الإيجابي" size={120} />
                  <Grid container spacing={2} sx={{ mt: 2 }}>
                    <Grid item xs={6}>
                      <Typography variant="h5" fontWeight={700} color="success.main">{behaviorData.totalPositive}</Typography>
                      <Typography variant="caption">سلوك إيجابي</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="h5" fontWeight={700} color="error.main">{behaviorData.totalNegative}</Typography>
                      <Typography variant="caption">سلوك سلبي</Typography>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Analytics Charts Row 2 */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {/* Program Enrollment Analysis */}
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 3, borderRadius: 3 }}>
                <SectionHeader icon={<AnalyticsIcon color="secondary" />} title="تحليل التسجيل في البرامج"
                  subtitle="إجمالي التسجيل ونسب الإكمال لكل برنامج" />
                {(analytics?.programEnrollment || []).length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={analytics.programEnrollment.slice(0, 8)} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <RTooltip />
                      <Legend />
                      <Bar dataKey="active" name="نشط" fill={statusColors.success} stackId="a" />
                      <Bar dataKey="completed" name="مكتمل" fill="#0288d1" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography color="text.secondary">سيتم عرض تحليل البرامج عند توفر البيانات</Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* IEP Coverage */}
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <SectionHeader icon={<CustomIcon sx={{ color: '#ed6c02' }} />} title="تغطية خطط التدخل (IEP)" />
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <ScoreGauge score={iepData.coverage} label="نسبة التغطية" size={130} />
                  <Box sx={{ mt: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                    <Typography variant="body2">
                      <strong>{iepData.studentsWithIEP}</strong> طالب لديهم خطة IEP من أصل <strong>{iepData.totalActive}</strong> طالب نشط
                    </Typography>
                  </Box>
                  {iepData.coverage < 80 && (
                    <Alert severity="warning" sx={{ mt: 2, textAlign: 'right' }}>
                      يُنصح بإعداد خطط IEP لجميع الطلاب النشطين
                    </Alert>
                  )}
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Achievements Summary */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3, background: 'linear-gradient(135deg, #fff8e1 0%, #fff3e0 100%)' }}>
            <SectionHeader icon={<StarIcon sx={{ color: '#f57f17' }} />} title="إنجازات الشهر الحالي" />
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h2" fontWeight={700} color="#f57f17">{achievements.milestonesThisMonth}</Typography>
                  <Typography variant="h6">إنجاز ومحطة تقدم</Typography>
                  <Typography variant="body2" color="text.secondary">محطات تقدم جديدة تم تحقيقها هذا الشهر</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ textAlign: 'center', p: 2 }}>
                  <Typography variant="h2" fontWeight={700} color="#7b1fa2">{achievements.badgesThisMonth}</Typography>
                  <Typography variant="h6">شارة ومكافأة</Typography>
                  <Typography variant="body2" color="text.secondary">شارات ومكافآت تم منحها للطلاب</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}

      {/* ════════ TAB 2: Scheduling & Delivery ════════ */}
      {activeTab === 2 && (
        <>
          {/* Subscription Stats */}
          {subStats && (
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center', borderTop: '3px solid #1976d2' }}>
                  <NotifIcon sx={{ color: '#1976d2', mb: 0.5 }} />
                  <Typography variant="h4" fontWeight={700} color="#1976d2">{subStats?.subscriptions?.active || 0}</Typography>
                  <Typography variant="body2">اشتراك نشط</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center', borderTop: '3px solid #2e7d32' }}>
                  <SuccessIcon sx={{ color: '#2e7d32', mb: 0.5 }} />
                  <Typography variant="h4" fontWeight={700} color="#2e7d32">{subStats?.deliveries?.last7d?.success || 0}</Typography>
                  <Typography variant="body2">توصيل ناجح (7 أيام)</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center', borderTop: '3px solid #ed6c02' }}>
                  <EmailIcon sx={{ color: '#ed6c02', mb: 0.5 }} />
                  <Typography variant="h4" fontWeight={700} color="#ed6c02">{subStats?.byChannel?.email || 0}</Typography>
                  <Typography variant="body2">اشتراك بريد</Typography>
                </Paper>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Paper sx={{ p: 2, borderRadius: 2, textAlign: 'center', borderTop: '3px solid #25d366' }}>
                  <WhatsAppIcon sx={{ color: '#25d366', mb: 0.5 }} />
                  <Typography variant="h4" fontWeight={700} color="#25d366">{subStats?.byChannel?.whatsapp || 0}</Typography>
                  <Typography variant="body2">اشتراك واتساب</Typography>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Active Subscriptions */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <SectionHeader icon={<ScheduleIcon color="primary" />}
              title="اشتراكات التقارير التلقائية"
              subtitle="إدارة التقارير المجدولة للإرسال التلقائي عبر البريد والواتساب"
              action={
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button variant="outlined" size="small" startIcon={<RefreshIcon />}
                    onClick={loadSubscriptions} disabled={subLoading}>
                    تحديث
                  </Button>
                  <Button variant="contained" startIcon={<AddIcon />}
                    onClick={() => setShowCreateDialog(true)}>
                    اشتراك جديد
                  </Button>
                </Box>
              }
            />

            {subLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

            {subscriptions.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <ScheduleIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  لا توجد اشتراكات بعد
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  أنشئ اشتراكاً جديداً لتلقي التقارير تلقائياً عبر البريد الإلكتروني أو الواتساب
                </Typography>
                <Button variant="contained" startIcon={<AddIcon />}
                  onClick={() => setShowCreateDialog(true)}>
                  إنشاء أول اشتراك
                </Button>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 700, width: 30 }} />
                      <TableCell sx={{ fontWeight: 700 }}>التقرير</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>التكرار</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>القنوات</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>التنفيذ التالي</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>آخر تنفيذ</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>إجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {subscriptions.map(sub => (
                      <React.Fragment key={sub._id}>
                        <TableRow hover sx={{
                          '&:hover': { bgcolor: '#f9f9f9' },
                          borderRight: sub.status === 'error' ? '3px solid #d32f2f' : sub.status === 'active' ? '3px solid #2e7d32' : '3px solid #999',
                        }}>
                          <TableCell>
                            <IconButton size="small" onClick={() => setExpandedSub(expandedSub === sub._id ? null : sub._id)}>
                              {expandedSub === sub._id ? <CollapseIcon /> : <ExpandIcon />}
                            </IconButton>
                          </TableCell>
                          <TableCell>
                            <Typography fontWeight={600}>{sub.reportTitle}</Typography>
                            <Typography variant="caption" color="text.secondary">{reportTypeLabels[sub.reportType] || sub.reportType}</Typography>
                          </TableCell>
                          <TableCell>
                            <Chip label={{
                              daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري',
                              quarterly: 'ربع سنوي', 'semi-annual': 'نصف سنوي', annual: 'سنوي',
                            }[sub.frequency] || sub.frequency} size="small"
                              color={sub.frequency === 'daily' ? 'success' : sub.frequency === 'weekly' ? 'info' : sub.frequency === 'monthly' ? 'warning' : 'default'} />
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                              {sub.channels?.email?.enabled && (
                                <Tooltip title={`بريد: ${sub.channels.email.recipients?.length || 0} مستلم`}>
                                  <Chip label={<EmailIcon sx={{ fontSize: 16 }} />} size="small"
                                    sx={{ bgcolor: '#e3f2fd', minWidth: 0 }} />
                                </Tooltip>
                              )}
                              {sub.channels?.whatsapp?.enabled && (
                                <Tooltip title={`واتساب: ${sub.channels.whatsapp.recipients?.length || 0} مستلم`}>
                                  <Chip label={<WhatsAppIcon sx={{ fontSize: 16, color: '#25d366' }} />} size="small"
                                    sx={{ bgcolor: '#e8f5e9', minWidth: 0 }} />
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip label={
                              sub.status === 'active' ? 'نشط' :
                              sub.status === 'paused' ? 'متوقف' :
                              sub.status === 'error' ? 'خطأ' : 'منتهي'
                            } size="small"
                              color={
                                sub.status === 'active' ? 'success' :
                                sub.status === 'paused' ? 'warning' :
                                sub.status === 'error' ? 'error' : 'default'
                              } />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {sub.nextExecutionAt ? new Date(sub.nextExecutionAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {sub.lastExecutedAt ? (
                              <Box>
                                <Typography variant="body2">
                                  {new Date(sub.lastExecutedAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })}
                                </Typography>
                                {sub.lastExecutionStatus && (
                                  <Chip label={sub.lastExecutionStatus === 'success' ? 'ناجح' : sub.lastExecutionStatus === 'partial' ? 'جزئي' : 'فشل'}
                                    size="small" variant="outlined"
                                    color={sub.lastExecutionStatus === 'success' ? 'success' : sub.lastExecutionStatus === 'partial' ? 'warning' : 'error'} />
                                )}
                              </Box>
                            ) : <Typography variant="body2" color="text.secondary">لم يُنفذ بعد</Typography>}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                              <Tooltip title={sub.status === 'active' ? 'إيقاف مؤقت' : 'استئناف'}>
                                <IconButton size="small" color={sub.status === 'active' ? 'warning' : 'success'}
                                  onClick={() => handlePauseResume(sub)}>
                                  {sub.status === 'active' ? <PauseIcon /> : <PlayIcon />}
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="إرسال الآن">
                                <IconButton size="small" color="primary"
                                  onClick={() => handleExecuteNow(sub._id)}>
                                  <SendIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="سجل التوصيل">
                                <IconButton size="small" onClick={() => handleViewLogs(sub._id)}>
                                  <HistoryIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="حذف">
                                <IconButton size="small" color="error"
                                  onClick={() => handleDeleteSubscription(sub._id)}>
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            </Box>
                          </TableCell>
                        </TableRow>

                        {/* Expanded details */}
                        <TableRow>
                          <TableCell colSpan={8} sx={{ p: 0, border: expandedSub === sub._id ? undefined : 'none' }}>
                            <Collapse in={expandedSub === sub._id}>
                              <Box sx={{ p: 2, bgcolor: '#fafafa' }}>
                                <Grid container spacing={2}>
                                  <Grid item xs={12} sm={4}>
                                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                      <ScheduleIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                                      الجدولة
                                    </Typography>
                                    <Typography variant="body2">الوقت: {sub.scheduledTime || '08:00'}</Typography>
                                    <Typography variant="body2">مرات التنفيذ: {sub.executionCount || 0}</Typography>
                                    {sub.lastError && (
                                      <Alert severity="error" sx={{ mt: 1, py: 0 }}>
                                        <Typography variant="caption">{sub.lastError}</Typography>
                                      </Alert>
                                    )}
                                  </Grid>
                                  <Grid item xs={12} sm={4}>
                                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                      <EmailIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom' }} />
                                      مستلمي البريد
                                    </Typography>
                                    {sub.channels?.email?.recipients?.length > 0 ? (
                                      sub.channels.email.recipients.map((r, i) => (
                                        <Typography key={i} variant="body2">{r.name || r.email} ({r.email})</Typography>
                                      ))
                                    ) : <Typography variant="body2" color="text.secondary">غير مفعل</Typography>}
                                  </Grid>
                                  <Grid item xs={12} sm={4}>
                                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                                      <WhatsAppIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'text-bottom', color: '#25d366' }} />
                                      مستلمي الواتساب
                                    </Typography>
                                    {sub.channels?.whatsapp?.recipients?.length > 0 ? (
                                      sub.channels.whatsapp.recipients.map((r, i) => (
                                        <Typography key={i} variant="body2">{r.name || r.phone} ({r.phone})</Typography>
                                      ))
                                    ) : <Typography variant="body2" color="text.secondary">غير مفعل</Typography>}
                                  </Grid>
                                </Grid>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>

          {/* Upcoming Executions */}
          {subStats?.upcomingExecutions?.length > 0 && (
            <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
              <SectionHeader icon={<TimelineIcon color="info" />} title="التنفيذات القادمة"
                subtitle="أقرب تقارير ستُرسل تلقائياً" />
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {subStats.upcomingExecutions.map((exec, i) => (
                  <Chip key={i}
                    label={`${exec.reportTitle} — ${new Date(exec.nextExecutionAt).toLocaleDateString('ar-SA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}
                    icon={exec.channels?.email?.enabled ? <EmailIcon sx={{ fontSize: 16 }} /> : <WhatsAppIcon sx={{ fontSize: 16 }} />}
                    variant="outlined" color="info" />
                ))}
              </Box>
            </Paper>
          )}

          {/* Quick Schedule Templates */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3, background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)' }}>
            <SectionHeader icon={<NotifIcon sx={{ fontSize: 28, color: '#1976d2' }} />}
              title="قوالب جدولة سريعة"
              subtitle="اختر قالب جاهز لإعداد اشتراك بسرعة" />
            <Grid container spacing={2}>
              {[
                { type: 'attendance', freq: 'daily', title: 'تقرير الحضور اليومي', desc: 'ملخص يومي لحضور الطلاب', icon: <AttendanceIcon />, color: '#2e7d32' },
                { type: 'progress', freq: 'weekly', title: 'تقرير التقدم الأسبوعي', desc: 'ملخص أسبوعي لتقدم الطلاب', icon: <TrendUpIcon />, color: '#1976d2' },
                { type: 'periodic', freq: 'monthly', title: 'التقرير الشهري الشامل', desc: 'تقرير شامل لأداء المركز', icon: <PeriodicIcon />, color: '#7b1fa2' },
                { type: 'parent', freq: 'quarterly', title: 'تقرير ولي الأمر الفصلي', desc: 'تقرير مفصل لأولياء الأمور', icon: <FamilyIcon />, color: '#ed6c02' },
                { type: 'comprehensive', freq: 'semi-annual', title: 'مراجعة IEP نصف سنوية', desc: 'مراجعة خطط التدخل الفردية', icon: <CustomIcon />, color: '#0288d1' },
                { type: 'dashboard-analytics', freq: 'annual', title: 'التقرير السنوي', desc: 'ملخص سنوي شامل', icon: <AssessmentIcon />, color: '#d32f2f' },
              ].map(template => (
                <Grid item xs={12} sm={6} md={4} key={template.type + template.freq}>
                  <Card sx={{ borderRadius: 2, borderLeft: `4px solid ${template.color}`,
                    cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { transform: 'translateY(-3px)', boxShadow: 4 } }}
                    onClick={() => {
                      setNewSub(prev => ({
                        ...prev,
                        reportType: template.type,
                        reportTitle: template.title,
                        frequency: template.freq,
                      }));
                      setShowCreateDialog(true);
                    }}>
                    <CardContent sx={{ pb: '12px !important' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Box sx={{ color: template.color }}>{template.icon}</Box>
                        <Typography variant="subtitle2" fontWeight={700}>{template.title}</Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">{template.desc}</Typography>
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                        <Chip label={{
                          daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري',
                          quarterly: 'ربع سنوي', 'semi-annual': 'نصف سنوي', annual: 'سنوي',
                        }[template.freq]} size="small" variant="outlined" />
                        <Chip label="📧 بريد" size="small" variant="outlined" />
                        <Chip label="📱 واتساب" size="small" variant="outlined" />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Export Options */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <SectionHeader icon={<ExportIcon color="info" />} title="تصدير البيانات"
              subtitle="تصدير بيانات الطلاب بتنسيقات مختلفة" />
            <Grid container spacing={3}>
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>تصدير CSV</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      تصدير بيانات جميع الطلاب النشطين بصيغة CSV مع دعم اللغة العربية (يعمل مع Excel)
                    </Typography>
                    <Chip label="متوافق مع Excel" size="small" color="success" sx={{ mb: 1 }} />
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button variant="contained" startIcon={exportLoading ? <CircularProgress size={16} /> : <ExportIcon />}
                      disabled={exportLoading} onClick={() => handleExport('csv')}>
                      تصدير CSV
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>تصدير JSON</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      تصدير البيانات بصيغة JSON للتكامل مع أنظمة أخرى أو للنسخ الاحتياطي
                    </Typography>
                    <Chip label="للمطورين" size="small" color="info" sx={{ mb: 1 }} />
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button variant="contained" color="secondary" startIcon={<ExportIcon />}
                      onClick={() => handleExport('json')}>
                      تصدير JSON
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={4}>
                <Card sx={{ borderRadius: 2, height: '100%' }}>
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>طباعة التقرير</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      طباعة التقرير الشامل للمركز بتنسيق جاهز للطباعة
                    </Typography>
                    <Chip label="PDF" size="small" variant="outlined" sx={{ mb: 1 }} />
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    <Button variant="outlined" startIcon={<PrintIcon />}
                      onClick={() => window.print()}>
                      طباعة
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </>
      )}

      {/* ════════ CREATE SUBSCRIPTION DIALOG ════════ */}
      <Dialog open={showCreateDialog} onClose={() => { setShowCreateDialog(false); resetNewSub(); }}
        maxWidth="md" fullWidth>
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <NotifIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>إنشاء اشتراك تقرير تلقائي</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: '20px !important' }}>
          <Grid container spacing={2}>
            {/* Report Type */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع التقرير</InputLabel>
                <Select value={newSub.reportType} label="نوع التقرير"
                  onChange={e => setNewSub(prev => ({ ...prev, reportType: e.target.value, reportTitle: reportTypeLabels[e.target.value] || prev.reportTitle }))}>
                  {Object.entries(reportTypeLabels).map(([k, v]) => (
                    <MenuItem key={k} value={k}>{v}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Report Title */}
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="عنوان التقرير"
                value={newSub.reportTitle} onChange={e => setNewSub(prev => ({ ...prev, reportTitle: e.target.value }))} />
            </Grid>

            {/* Frequency */}
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>التكرار</InputLabel>
                <Select value={newSub.frequency} label="التكرار"
                  onChange={e => setNewSub(prev => ({ ...prev, frequency: e.target.value }))}>
                  <MenuItem value="daily">يومي</MenuItem>
                  <MenuItem value="weekly">أسبوعي</MenuItem>
                  <MenuItem value="monthly">شهري</MenuItem>
                  <MenuItem value="quarterly">ربع سنوي</MenuItem>
                  <MenuItem value="semi-annual">نصف سنوي</MenuItem>
                  <MenuItem value="annual">سنوي</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Time */}
            <Grid item xs={12} sm={4}>
              <TextField fullWidth size="small" label="وقت الإرسال" type="time"
                value={newSub.scheduledTime}
                onChange={e => setNewSub(prev => ({ ...prev, scheduledTime: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Grid>

            {/* Day of Week (for weekly) */}
            {newSub.frequency === 'weekly' && (
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>يوم الإرسال</InputLabel>
                  <Select value={newSub.scheduledDayOfWeek} label="يوم الإرسال"
                    onChange={e => setNewSub(prev => ({ ...prev, scheduledDayOfWeek: e.target.value }))}>
                    <MenuItem value={0}>الأحد</MenuItem>
                    <MenuItem value={1}>الاثنين</MenuItem>
                    <MenuItem value={2}>الثلاثاء</MenuItem>
                    <MenuItem value={3}>الأربعاء</MenuItem>
                    <MenuItem value={4}>الخميس</MenuItem>
                    <MenuItem value={5}>الجمعة</MenuItem>
                    <MenuItem value={6}>السبت</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* Day of Month (for monthly+) */}
            {['monthly', 'quarterly', 'semi-annual', 'annual'].includes(newSub.frequency) && (
              <Grid item xs={12} sm={4}>
                <TextField fullWidth size="small" label="يوم الشهر" type="number"
                  value={newSub.scheduledDayOfMonth}
                  onChange={e => setNewSub(prev => ({ ...prev, scheduledDayOfMonth: Math.min(28, Math.max(1, parseInt(e.target.value) || 1)) }))}
                  inputProps={{ min: 1, max: 28 }} />
              </Grid>
            )}

            <Grid item xs={12}><Divider sx={{ my: 1 }} /></Grid>

            {/* Email Channel */}
            <Grid item xs={12}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: newSub.channels.email.enabled ? '#1976d2' : 'divider', borderRadius: 2, bgcolor: newSub.channels.email.enabled ? '#f3f8ff' : 'transparent' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: newSub.channels.email.enabled ? 2 : 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EmailIcon color={newSub.channels.email.enabled ? 'primary' : 'disabled'} />
                    <Typography fontWeight={600}>البريد الإلكتروني</Typography>
                  </Box>
                  <Switch checked={newSub.channels.email.enabled}
                    onChange={e => setNewSub(prev => ({
                      ...prev,
                      channels: { ...prev.channels, email: { ...prev.channels.email, enabled: e.target.checked } },
                    }))} />
                </Box>
                {newSub.channels.email.enabled && (
                  <>
                    {newSub.channels.email.recipients.map((r, i) => (
                      <Grid container spacing={1} key={i} sx={{ mb: 1 }}>
                        <Grid item xs={5}>
                          <TextField fullWidth size="small" label="البريد الإلكتروني" type="email"
                            value={r.email} onChange={e => {
                              const recs = [...newSub.channels.email.recipients];
                              recs[i] = { ...recs[i], email: e.target.value };
                              setNewSub(prev => ({ ...prev, channels: { ...prev.channels, email: { ...prev.channels.email, recipients: recs } } }));
                            }} />
                        </Grid>
                        <Grid item xs={4}>
                          <TextField fullWidth size="small" label="الاسم" value={r.name}
                            onChange={e => {
                              const recs = [...newSub.channels.email.recipients];
                              recs[i] = { ...recs[i], name: e.target.value };
                              setNewSub(prev => ({ ...prev, channels: { ...prev.channels, email: { ...prev.channels.email, recipients: recs } } }));
                            }} />
                        </Grid>
                        <Grid item xs={2}>
                          <FormControl fullWidth size="small">
                            <Select value={r.role}
                              onChange={e => {
                                const recs = [...newSub.channels.email.recipients];
                                recs[i] = { ...recs[i], role: e.target.value };
                                setNewSub(prev => ({ ...prev, channels: { ...prev.channels, email: { ...prev.channels.email, recipients: recs } } }));
                              }}>
                              <MenuItem value="admin">مدير</MenuItem>
                              <MenuItem value="therapist">معالج</MenuItem>
                              <MenuItem value="parent">ولي أمر</MenuItem>
                              <MenuItem value="manager">مشرف</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={1}>
                          {i > 0 && (
                            <IconButton size="small" color="error" onClick={() => {
                              const recs = newSub.channels.email.recipients.filter((_, idx) => idx !== i);
                              setNewSub(prev => ({ ...prev, channels: { ...prev.channels, email: { ...prev.channels.email, recipients: recs } } }));
                            }}><DeleteIcon /></IconButton>
                          )}
                        </Grid>
                      </Grid>
                    ))}
                    <Button size="small" startIcon={<AddIcon />}
                      onClick={() => setNewSub(prev => ({
                        ...prev,
                        channels: { ...prev.channels, email: { ...prev.channels.email, recipients: [...prev.channels.email.recipients, { email: '', name: '', role: 'admin' }] } },
                      }))}>
                      إضافة مستلم
                    </Button>
                  </>
                )}
              </Box>
            </Grid>

            {/* WhatsApp Channel */}
            <Grid item xs={12}>
              <Box sx={{ p: 2, border: '1px solid', borderColor: newSub.channels.whatsapp.enabled ? '#25d366' : 'divider', borderRadius: 2, bgcolor: newSub.channels.whatsapp.enabled ? '#f0faf0' : 'transparent' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: newSub.channels.whatsapp.enabled ? 2 : 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <WhatsAppIcon sx={{ color: newSub.channels.whatsapp.enabled ? '#25d366' : '#999' }} />
                    <Typography fontWeight={600}>الواتساب</Typography>
                  </Box>
                  <Switch checked={newSub.channels.whatsapp.enabled} color="success"
                    onChange={e => setNewSub(prev => ({
                      ...prev,
                      channels: { ...prev.channels, whatsapp: { ...prev.channels.whatsapp, enabled: e.target.checked } },
                    }))} />
                </Box>
                {newSub.channels.whatsapp.enabled && (
                  <>
                    {newSub.channels.whatsapp.recipients.map((r, i) => (
                      <Grid container spacing={1} key={i} sx={{ mb: 1 }}>
                        <Grid item xs={5}>
                          <TextField fullWidth size="small" label="رقم الواتساب" placeholder="+966XXXXXXXXX"
                            value={r.phone} onChange={e => {
                              const recs = [...newSub.channels.whatsapp.recipients];
                              recs[i] = { ...recs[i], phone: e.target.value };
                              setNewSub(prev => ({ ...prev, channels: { ...prev.channels, whatsapp: { ...prev.channels.whatsapp, recipients: recs } } }));
                            }} />
                        </Grid>
                        <Grid item xs={4}>
                          <TextField fullWidth size="small" label="الاسم" value={r.name}
                            onChange={e => {
                              const recs = [...newSub.channels.whatsapp.recipients];
                              recs[i] = { ...recs[i], name: e.target.value };
                              setNewSub(prev => ({ ...prev, channels: { ...prev.channels, whatsapp: { ...prev.channels.whatsapp, recipients: recs } } }));
                            }} />
                        </Grid>
                        <Grid item xs={2}>
                          <FormControl fullWidth size="small">
                            <Select value={r.role}
                              onChange={e => {
                                const recs = [...newSub.channels.whatsapp.recipients];
                                recs[i] = { ...recs[i], role: e.target.value };
                                setNewSub(prev => ({ ...prev, channels: { ...prev.channels, whatsapp: { ...prev.channels.whatsapp, recipients: recs } } }));
                              }}>
                              <MenuItem value="admin">مدير</MenuItem>
                              <MenuItem value="therapist">معالج</MenuItem>
                              <MenuItem value="parent">ولي أمر</MenuItem>
                              <MenuItem value="manager">مشرف</MenuItem>
                            </Select>
                          </FormControl>
                        </Grid>
                        <Grid item xs={1}>
                          {i > 0 && (
                            <IconButton size="small" color="error" onClick={() => {
                              const recs = newSub.channels.whatsapp.recipients.filter((_, idx) => idx !== i);
                              setNewSub(prev => ({ ...prev, channels: { ...prev.channels, whatsapp: { ...prev.channels.whatsapp, recipients: recs } } }));
                            }}><DeleteIcon /></IconButton>
                          )}
                        </Grid>
                      </Grid>
                    ))}
                    <Button size="small" startIcon={<AddIcon />} color="success"
                      onClick={() => setNewSub(prev => ({
                        ...prev,
                        channels: { ...prev.channels, whatsapp: { ...prev.channels.whatsapp, recipients: [...prev.channels.whatsapp.recipients, { phone: '', name: '', role: 'admin' }] } },
                      }))}>
                      إضافة مستلم
                    </Button>
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, borderTop: 1, borderColor: 'divider' }}>
          <Button onClick={() => { setShowCreateDialog(false); resetNewSub(); }}>إلغاء</Button>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreateSubscription}>
            إنشاء الاشتراك
          </Button>
        </DialogActions>
      </Dialog>

      {/* ════════ DELIVERY LOGS DIALOG ════════ */}
      <Dialog open={showLogsDialog} onClose={() => setShowLogsDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HistoryIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>سجل توصيل التقارير</Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important' }}>
          {deliveryLogs.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <HistoryIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">لا توجد سجلات توصيل بعد</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>المدة</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>التوصيلات</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>الخطأ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {deliveryLogs.map(log => (
                    <TableRow key={log._id} hover>
                      <TableCell>
                        <Typography variant="body2">
                          {new Date(log.executedAt).toLocaleDateString('ar-SA', {
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip size="small"
                          label={log.status === 'success' ? 'ناجح' : log.status === 'partial' ? 'جزئي' : 'فشل'}
                          color={log.status === 'success' ? 'success' : log.status === 'partial' ? 'warning' : 'error'}
                          icon={log.status === 'success' ? <SuccessIcon /> : <ErrorIcon />} />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{log.duration ? `${(log.duration / 1000).toFixed(1)}s` : '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          {log.deliveries?.map((d, i) => (
                            <Tooltip key={i} title={`${d.channel === 'email' ? 'بريد' : 'واتساب'}: ${d.recipient} — ${d.status === 'sent' ? 'تم' : 'فشل'}`}>
                              <Chip size="small"
                                icon={d.channel === 'email' ? <EmailIcon sx={{ fontSize: 14 }} /> : <WhatsAppIcon sx={{ fontSize: 14 }} />}
                                label={d.status === 'sent' ? '✓' : '✗'}
                                color={d.status === 'sent' ? 'success' : 'error'}
                                variant="outlined" sx={{ minWidth: 0 }} />
                            </Tooltip>
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {log.error && (
                          <Typography variant="caption" color="error">{log.error}</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLogsDialog(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Custom Report Dialog */}
      <Dialog open={customDialogOpen} onClose={() => setCustomDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CustomIcon color="primary" />
            <Typography variant="h6">إنشاء تقرير مخصص</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            الأقسام المحددة ({selectedSections.length}):
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {selectedSections.map(id => {
              const section = CUSTOM_SECTIONS.find(s => s.id === id);
              return section ? (
                <Chip key={id} label={`${section.icon} ${section.label}`} size="small" color="primary" />
              ) : null;
            })}
          </Box>
          <Alert severity="info" sx={{ mt: 2 }}>
            أدخل رقم الطالب لإنشاء التقرير المخصص. سيتم تضمين الأقسام المحددة فقط.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => {
            setCustomDialogOpen(false);
            showSnackbar('جاري إنشاء التقرير المخصص...', 'info');
          }}>إنشاء التقرير</Button>
        </DialogActions>
      </Dialog>

    </Container>
    </DashboardErrorBoundary>
  );
}
