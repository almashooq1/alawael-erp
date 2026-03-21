import { useState, useEffect, useCallback } from 'react';





import { useSnackbar } from '../../contexts/SnackbarContext';
import { gradients, chartColors, statusColors, brandColors } from '../../theme/palette';
import logger from '../../utils/logger';
import qualityService from '../../services/quality.service';
import { useNavigate } from 'react-router-dom';

/* ──────── بيانات تجريبية ──────── */
const DEMO_STATS = {
  complianceScore: 92,
  totalAudits: 24,
  passedAudits: 21,
  failedAudits: 3,
  openIssues: 7,
  resolvedIssues: 45,
  openTickets: 5,
  avgResolutionDays: 3.2,
};

const DEMO_COMPLIANCE_TREND = [
  { month: 'يناير', score: 88, audits: 4 },
  { month: 'فبراير', score: 85, audits: 3 },
  { month: 'مارس', score: 90, audits: 5 },
  { month: 'أبريل', score: 87, audits: 4 },
  { month: 'مايو', score: 92, audits: 4 },
  { month: 'يونيو', score: 94, audits: 4 },
];

const DEMO_ISSUES_BY_CATEGORY = [
  { name: 'سلامة المرافق', value: 12, color: statusColors.error },
  { name: 'التوثيق', value: 8, color: statusColors.warning },
  { name: 'إجراءات العمل', value: 15, color: statusColors.primaryBlue },
  { name: 'تدريب الموظفين', value: 6, color: statusColors.purple },
  { name: 'نظافة وتعقيم', value: 4, color: chartColors.category[2] },
];

const DEMO_AUDIT_RESULTS = [
  { name: 'ناجح', value: 21, color: statusColors.success },
  { name: 'يحتاج تحسين', value: 5, color: statusColors.warning },
  { name: 'فشل', value: 3, color: statusColors.error },
];

const DEMO_CORRECTIVE_ACTIONS = [
  { month: 'يناير', opened: 5, closed: 4 },
  { month: 'فبراير', opened: 3, closed: 5 },
  { month: 'مارس', opened: 7, closed: 6 },
  { month: 'أبريل', opened: 4, closed: 5 },
  { month: 'مايو', opened: 2, closed: 4 },
  { month: 'يونيو', opened: 3, closed: 3 },
];

const DEMO_RECENT_AUDITS = [
  { id: 1, area: 'قسم العلاج الطبيعي', auditor: 'أ. سلطان المقبل', date: '2026-03-08', score: 95, status: 'passed' },
  { id: 2, area: 'المختبر', auditor: 'أ. هند الراشد', date: '2026-03-05', score: 88, status: 'passed' },
  { id: 3, area: 'المطبخ', auditor: 'أ. سلطان المقبل', date: '2026-03-03', score: 72, status: 'needs-improvement' },
  { id: 4, area: 'صالة الاستقبال', auditor: 'أ. هند الراشد', date: '2026-03-01', score: 91, status: 'passed' },
  { id: 5, area: 'قسم العلاج الوظيفي', auditor: 'أ. سلطان المقبل', date: '2026-02-28', score: 60, status: 'failed' },
];

const STATUS_MAP = {
  passed: { label: 'ناجح', color: 'success' },
  'needs-improvement': { label: 'يحتاج تحسين', color: 'warning' },
  failed: { label: 'فشل', color: 'error' },
};

export default function QualityDashboard() {
  const showSnackbar = useSnackbar();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(DEMO_STATS);
  const [complianceTrend, _setComplianceTrend] = useState(DEMO_COMPLIANCE_TREND);
  const [issuesByCategory, _setIssuesByCategory] = useState(DEMO_ISSUES_BY_CATEGORY);
  const [auditResults, setAuditResults] = useState(DEMO_AUDIT_RESULTS);
  const [correctiveActions, _setCorrectiveActions] = useState(DEMO_CORRECTIVE_ACTIONS);
  const [recentAudits, setRecentAudits] = useState(DEMO_RECENT_AUDITS);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const [qualityRes, auditsRes, casesRes, ticketsRes] = await Promise.all([
        qualityService.getQualityRecords().catch(err => { logger.warn('Quality: records fetch', err); return null; }),
        qualityService.getAudits().catch(err => { logger.warn('Quality: audits fetch', err); return null; }),
        qualityService.getCases().catch(err => { logger.warn('Quality: cases fetch', err); return null; }),
        qualityService.getTickets().catch(err => { logger.warn('Quality: tickets fetch', err); return null; }),
      ]);

      const _quality = qualityRes?.data || qualityRes || [];
      const audits = auditsRes?.data || auditsRes || [];
      const cases = casesRes?.data || casesRes || [];
      const tickets = ticketsRes?.data || ticketsRes || [];

      if (Array.isArray(audits) && audits.length > 0) {
        const passed = audits.filter(a => a.result === 'passed' || a.status === 'passed').length;
        const failed = audits.filter(a => a.result === 'failed' || a.status === 'failed').length;
        const needsImprove = audits.length - passed - failed;
        const avgScore = audits.reduce((sum, a) => sum + (a.score || 0), 0) / audits.length;

        setStats(prev => ({
          ...prev,
          complianceScore: Math.round(avgScore) || prev.complianceScore,
          totalAudits: audits.length,
          passedAudits: passed,
          failedAudits: failed,
          openIssues: Array.isArray(cases) ? cases.filter(c => c.status !== 'resolved' && c.status !== 'closed').length : prev.openIssues,
          resolvedIssues: Array.isArray(cases) ? cases.filter(c => c.status === 'resolved' || c.status === 'closed').length : prev.resolvedIssues,
          openTickets: Array.isArray(tickets) ? tickets.filter(t => t.status !== 'closed').length : prev.openTickets,
        }));

        setAuditResults([
          { name: 'ناجح', value: passed, color: statusColors.success },
          { name: 'يحتاج تحسين', value: needsImprove, color: statusColors.warning },
          { name: 'فشل', value: failed, color: statusColors.error },
        ]);

        const recent = audits
          .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt))
          .slice(0, 5)
          .map((a, i) => ({
            id: a._id || i,
            area: a.area || a.department || '-',
            auditor: a.auditor || a.auditorName || '-',
            date: (a.date || a.createdAt || '').slice(0, 10),
            score: a.score || 0,
            status: a.result || a.status || 'passed',
          }));
        setRecentAudits(recent);
      }
    } catch (err) {
      logger.warn('QualityDashboard: load error', err);
      showSnackbar('تعذر تحميل بيانات الجودة — يتم عرض بيانات تجريبية', 'warning');
    } finally {
      setLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  return (
    <DashboardErrorBoundary>
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Header */}
      <Box sx={{ background: gradients.primary, borderRadius: 3, p: 3, mb: 4, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <SecurityIcon sx={{ fontSize: 44 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold">لوحة تحكم الجودة والامتثال</Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>مؤشرات الجودة ونتائج التدقيق والإجراءات التصحيحية</Typography>
          </Box>
        </Box>
        <Button variant="contained" color="inherit" sx={{ color: brandColors.primaryEnd, fontWeight: 600 }} startIcon={<ArrowForwardIcon />} onClick={() => navigate('/quality')}>
          إدارة الجودة
        </Button>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="نسبة الامتثال" value={`${stats.complianceScore}%`} subtitle="المعدل العام" icon={<ComplianceIcon />} color="primary" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="عمليات التدقيق" value={stats.totalAudits} subtitle={`${stats.passedAudits} ناجحة`} icon={<AuditIcon />} color="success" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="تدقيق فاشل" value={stats.failedAudits} subtitle="يحتاج متابعة" icon={<ErrorIcon />} color="error" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="مخالفات مفتوحة" value={stats.openIssues} subtitle={`${stats.resolvedIssues} تم حلها`} icon={<TicketIcon />} color="warning" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="تذاكر الدعم" value={stats.openTickets} subtitle="مفتوحة" icon={<AssessmentIcon />} color="info" />
        </Grid>
        <Grid item xs={12} sm={6} md={3} lg={2}>
          <ModuleKPICard title="متوسط الحل" value={`${stats.avgResolutionDays} يوم`} subtitle="للمخالفات" icon={<TrendingUpIcon />} color="secondary" />
        </Grid>
      </Grid>

      {/* Charts Row 1 */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>اتجاه درجة الامتثال</Typography>
            {complianceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} role="img" aria-label="رسم بياني لاتجاه درجة الامتثال">
                <AreaChart data={complianceTrend}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={brandColors.primaryStart} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={brandColors.primaryStart} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis domain={[60, 100]} />
                  <RTooltip />
                  <Legend />
                  <Area type="monotone" dataKey="score" stroke={brandColors.primaryStart} fillOpacity={1} fill="url(#colorScore)" strokeWidth={3} name="درجة الامتثال" />
                  <Bar dataKey="audits" fill={chartColors.primary[1]} name="عدد التدقيقات" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={280} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>نتائج التدقيق</Typography>
            {auditResults.length > 0 ? (
              <ResponsiveContainer width="100%" height={280} role="img" aria-label="رسم بياني لنتائج التدقيق">
                <PieChart>
                  <Pie data={auditResults} cx="50%" cy="50%" outerRadius={90} innerRadius={50} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}>
                    {auditResults.map((e, i) => <Cell key={i} fill={e.color} />)}
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
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>المخالفات حسب الفئة</Typography>
            {issuesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height={260} role="img" aria-label="رسم بياني للمخالفات حسب الفئة">
                <BarChart data={issuesByCategory} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={120} />
                  <RTooltip />
                  <Bar dataKey="value" name="عدد المخالفات" radius={[0, 4, 4, 0]}>
                    {issuesByCategory.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={260} />
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="h6" fontWeight={600} gutterBottom>الإجراءات التصحيحية</Typography>
            {correctiveActions.length > 0 ? (
              <ResponsiveContainer width="100%" height={260} role="img" aria-label="رسم بياني للإجراءات التصحيحية">
                <LineChart data={correctiveActions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="opened" stroke={statusColors.error} strokeWidth={2} name="مفتوحة" dot={{ r: 5 }} />
                  <Line type="monotone" dataKey="closed" stroke={statusColors.success} strokeWidth={2} name="مغلقة" dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState height={260} />
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Audits */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={600}>آخر عمليات التدقيق</Typography>
          <Button size="small" onClick={() => navigate('/quality')}>عرض الكل</Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>المنطقة / القسم</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>المدقق</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>التاريخ</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>الدرجة</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>النتيجة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentAudits.map(a => (
                <TableRow key={a.id} hover>
                  <TableCell>{a.area}</TableCell>
                  <TableCell>{a.auditor}</TableCell>
                  <TableCell>{a.date}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      <LinearProgress
                        variant="determinate"
                        value={a.score}
                        sx={{ width: 60, height: 8, borderRadius: 4 }}
                        color={a.score >= 85 ? 'success' : a.score >= 70 ? 'warning' : 'error'}
                      />
                      <Typography variant="caption" fontWeight={600}>{a.score}%</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUS_MAP[a.status]?.label || a.status}
                      color={STATUS_MAP[a.status]?.color || 'default'}
                      size="small"
                    />
                  </TableCell>
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
