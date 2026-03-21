/**
 * Post-Rehab Follow-Up Dashboard — متابعة ما بعد التأهيل
 *
 * Case tracking, follow-up visits, impact measurement,
 * satisfaction surveys, re-enrollment requests.
 */
import { useState, useEffect, useCallback } from 'react';
import { Paper,
} from '@mui/material';

import postRehabApi from '../../services/postRehab.service';

function TabPanel({ children, value, index }) {
  return value === index ? <Box py={2}>{children}</Box> : null;
}

const caseStatusMap = {
  active: { label: 'نشط', color: 'success' },
  closed: { label: 'مغلق', color: 'default' },
  overdue: { label: 'متأخر', color: 'error' },
  pending: { label: 'قيد المتابعة', color: 'warning' },
  completed: { label: 'مكتمل', color: 'info' },
};
const visitStatusMap = {
  scheduled: { label: 'مجدول', color: 'info' },
  completed: { label: 'مكتمل', color: 'success' },
  missed: { label: 'فائت', color: 'error' },
  cancelled: { label: 'ملغي', color: 'default' },
};
const enrollStatusMap = {
  pending: { label: 'قيد المراجعة', color: 'warning' },
  approved: { label: 'مقبول', color: 'success' },
  rejected: { label: 'مرفوض', color: 'error' },
};

export default function PostRehabFollowupDashboard() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [cases, setCases] = useState([]);
  const [visits, setVisits] = useState([]);
  const [impacts, setImpacts] = useState([]);
  const [surveys, setSurveys] = useState([]);
  const [reEnrollments, setReEnrollments] = useState([]);
  const [overdue, setOverdue] = useState([]);
  // dialogs
  const [caseDialog, setCaseDialog] = useState(false);
  const [caseForm, setCaseForm] = useState({ beneficiaryId: '', programCompleted: '', notes: '' });
  const [visitDialog, setVisitDialog] = useState(false);
  const [visitForm, setVisitForm] = useState({ caseId: '', scheduledDate: '', type: 'home_visit', notes: '' });
  const [reEnrollDialog, setReEnrollDialog] = useState(false);
  const [reEnrollForm, setReEnrollForm] = useState({ caseId: '', reason: '', requestedProgram: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, caseRes, visitRes, impactRes, surveyRes, reRes, overdueRes] = await Promise.allSettled([
        postRehabApi.getDashboard(),
        postRehabApi.getCases({}),
        postRehabApi.getVisits({}),
        postRehabApi.getImpactMeasurements({}),
        postRehabApi.getSurveys({}),
        postRehabApi.getReEnrollments({}),
        postRehabApi.getOverdueCases(),
      ]);
      setDashboard(dashRes.status === 'fulfilled' ? dashRes.value?.data?.data : null);
      setCases(caseRes.status === 'fulfilled' ? (caseRes.value?.data?.data?.cases || caseRes.value?.data?.data || []) : []);
      setVisits(visitRes.status === 'fulfilled' ? (visitRes.value?.data?.data?.visits || visitRes.value?.data?.data || []) : []);
      setImpacts(impactRes.status === 'fulfilled' ? (impactRes.value?.data?.data?.measurements || impactRes.value?.data?.data || []) : []);
      setSurveys(surveyRes.status === 'fulfilled' ? (surveyRes.value?.data?.data?.surveys || surveyRes.value?.data?.data || []) : []);
      setReEnrollments(reRes.status === 'fulfilled' ? (reRes.value?.data?.data?.requests || reRes.value?.data?.data || []) : []);
      setOverdue(overdueRes.status === 'fulfilled' ? (overdueRes.value?.data?.data || []) : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleCreateCase = async () => {
    try {
      await postRehabApi.createCase(caseForm);
      setCaseDialog(false);
      setCaseForm({ beneficiaryId: '', programCompleted: '', notes: '' });
      loadData();
    } catch { setError('فشل إنشاء الحالة'); }
  };

  const handleCreateVisit = async () => {
    try {
      await postRehabApi.createVisit(visitForm);
      setVisitDialog(false);
      setVisitForm({ caseId: '', scheduledDate: '', type: 'home_visit', notes: '' });
      loadData();
    } catch { setError('فشل جدولة الزيارة'); }
  };

  const handleCreateReEnroll = async () => {
    try {
      await postRehabApi.createReEnrollment(reEnrollForm);
      setReEnrollDialog(false);
      setReEnrollForm({ caseId: '', reason: '', requestedProgram: '' });
      loadData();
    } catch { setError('فشل تقديم طلب إعادة التسجيل'); }
  };

  const getChip = (status, map) => {
    const s = map[status] || { label: status || '—', color: 'default' };
    return <Chip label={s.label} color={s.color} size="small" />;
  };

  const KPI = ({ title, value, icon, color = 'primary.main' }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="subtitle2" color="text.secondary">{title}</Typography>
        </Box>
        <Typography variant="h4" fontWeight="bold">{value ?? '—'}</Typography>
      </CardContent>
    </Card>
  );

  if (loading) return <Box p={4} textAlign="center"><CircularProgress /><Typography mt={2}>جاري تحميل بيانات المتابعة...</Typography></Box>;

  return (
    <Box p={3} dir="rtl">
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold"><FollowIcon sx={{ mr: 1, verticalAlign: 'middle' }} />متابعة ما بعد التأهيل</Typography>
          <Typography color="text.secondary">تتبع الحالات، الزيارات، قياس الأثر، وإعادة التسجيل</Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCaseDialog(true)}>حالة جديدة</Button>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadData}>تحديث</Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

      {/* Overdue Alert */}
      {overdue.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }} icon={<OverdueIcon />}>
          يوجد {overdue.length} حالة متأخرة عن موعد المتابعة — يرجى المراجعة
        </Alert>
      )}

      {/* KPIs */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} md={2.4}><KPI title="الحالات النشطة" value={dashboard?.activeCases || cases.filter(c => c.status === 'active').length} icon={<FollowIcon />} /></Grid>
        <Grid item xs={6} md={2.4}><KPI title="الزيارات المجدولة" value={dashboard?.scheduledVisits || visits.filter(v => v.status === 'scheduled').length} icon={<VisitIcon />} color="info.main" /></Grid>
        <Grid item xs={6} md={2.4}><KPI title="الحالات المتأخرة" value={overdue.length} icon={<OverdueIcon />} color="error.main" /></Grid>
        <Grid item xs={6} md={2.4}><KPI title="قياسات الأثر" value={impacts.length} icon={<ImpactIcon />} color="success.main" /></Grid>
        <Grid item xs={6} md={2.4}><KPI title="طلبات إعادة تسجيل" value={reEnrollments.filter(r => r.status === 'pending').length} icon={<ReEnrollIcon />} color="warning.main" /></Grid>
      </Grid>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ mb: 1 }}>
        <Tab label="الحالات" />
        <Tab label="الزيارات" />
        <Tab label="قياس الأثر" />
        <Tab label="الاستبيانات" />
        <Tab label="إعادة التسجيل" />
      </Tabs>

      {/* Tab 0 — Cases */}
      <TabPanel value={tab} index={0}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>المستفيد</TableCell><TableCell>البرنامج المكتمل</TableCell><TableCell>تاريخ الإنشاء</TableCell><TableCell>الحالة</TableCell><TableCell>التنبيهات</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {cases.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">لا توجد حالات</TableCell></TableRow>
              ) : cases.map((c) => (
                <TableRow key={c._id || c.id}>
                  <TableCell>{c.beneficiaryName || c.beneficiaryId || '—'}</TableCell>
                  <TableCell>{c.programCompleted || '—'}</TableCell>
                  <TableCell>{c.createdAt ? new Date(c.createdAt).toLocaleDateString('ar-SA') : '—'}</TableCell>
                  <TableCell>{getChip(c.status, caseStatusMap)}</TableCell>
                  <TableCell>{c.alerts?.length || 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tab 1 — Visits */}
      <TabPanel value={tab} index={1}>
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setVisitDialog(true)}>جدولة زيارة</Button>
        </Box>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>الحالة</TableCell><TableCell>النوع</TableCell><TableCell>التاريخ المجدول</TableCell><TableCell>الحالة</TableCell><TableCell>ملاحظات</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {visits.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">لا توجد زيارات</TableCell></TableRow>
              ) : visits.map((v) => (
                <TableRow key={v._id || v.id}>
                  <TableCell>{v.caseName || v.caseId || '—'}</TableCell>
                  <TableCell>{v.type === 'home_visit' ? 'زيارة منزلية' : v.type === 'clinic' ? 'عيادة' : v.type === 'phone' ? 'هاتفية' : v.type || '—'}</TableCell>
                  <TableCell>{v.scheduledDate ? new Date(v.scheduledDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                  <TableCell>{getChip(v.status, visitStatusMap)}</TableCell>
                  <TableCell>{v.notes?.substring(0, 50) || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tab 2 — Impact */}
      <TabPanel value={tab} index={2}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>الحالة</TableCell><TableCell>الفترة</TableCell><TableCell>التاريخ</TableCell><TableCell>النتيجة الإجمالية</TableCell><TableCell>التحسن</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {impacts.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">لا توجد قياسات</TableCell></TableRow>
              ) : impacts.map((m) => (
                <TableRow key={m._id || m.id}>
                  <TableCell>{m.caseName || m.caseId || '—'}</TableCell>
                  <TableCell>{m.period === '6_months' ? '6 أشهر' : m.period === '1_year' ? 'سنة' : m.period === '2_years' ? 'سنتان' : m.period || '—'}</TableCell>
                  <TableCell>{m.assessmentDate ? new Date(m.assessmentDate).toLocaleDateString('ar-SA') : '—'}</TableCell>
                  <TableCell>{m.overallScore ?? '—'}</TableCell>
                  <TableCell>
                    {m.improvement != null ? (
                      <Chip label={`${m.improvement > 0 ? '+' : ''}${m.improvement}%`} color={m.improvement > 0 ? 'success' : 'error'} size="small" />
                    ) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tab 3 — Surveys */}
      <TabPanel value={tab} index={3}>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>العنوان</TableCell><TableCell>الحالة</TableCell><TableCell>التاريخ</TableCell><TableCell>النتيجة</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {surveys.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center">لا توجد استبيانات</TableCell></TableRow>
              ) : surveys.map((s) => (
                <TableRow key={s._id || s.id}>
                  <TableCell>{s.title || s.templateName || '—'}</TableCell>
                  <TableCell>{getChip(s.status, { submitted: { label: 'مكتمل', color: 'success' }, pending: { label: 'معلق', color: 'warning' }, draft: { label: 'مسودة', color: 'default' } })}</TableCell>
                  <TableCell>{s.createdAt ? new Date(s.createdAt).toLocaleDateString('ar-SA') : '—'}</TableCell>
                  <TableCell>{s.score ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tab 4 — Re-Enrollment */}
      <TabPanel value={tab} index={4}>
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setReEnrollDialog(true)}>طلب إعادة تسجيل</Button>
        </Box>
        <TableContainer component={Paper} variant="outlined">
          <Table size="small">
            <TableHead><TableRow>
              <TableCell>الحالة</TableCell><TableCell>السبب</TableCell><TableCell>البرنامج المطلوب</TableCell><TableCell>الحالة</TableCell><TableCell>التاريخ</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {reEnrollments.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center">لا توجد طلبات</TableCell></TableRow>
              ) : reEnrollments.map((r) => (
                <TableRow key={r._id || r.id}>
                  <TableCell>{r.caseName || r.caseId || '—'}</TableCell>
                  <TableCell>{r.reason?.substring(0, 60) || '—'}</TableCell>
                  <TableCell>{r.requestedProgram || '—'}</TableCell>
                  <TableCell>{getChip(r.status, enrollStatusMap)}</TableCell>
                  <TableCell>{r.createdAt ? new Date(r.createdAt).toLocaleDateString('ar-SA') : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* ─── New Case Dialog ─── */}
      <Dialog open={caseDialog} onClose={() => setCaseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إنشاء حالة متابعة جديدة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="رقم/معرف المستفيد" value={caseForm.beneficiaryId} onChange={(e) => setCaseForm({ ...caseForm, beneficiaryId: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="البرنامج المكتمل" value={caseForm.programCompleted} onChange={(e) => setCaseForm({ ...caseForm, programCompleted: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline rows={3} label="ملاحظات" value={caseForm.notes} onChange={(e) => setCaseForm({ ...caseForm, notes: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCaseDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateCase}>إنشاء</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Schedule Visit Dialog ─── */}
      <Dialog open={visitDialog} onClose={() => setVisitDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>جدولة زيارة متابعة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="معرف الحالة" value={visitForm.caseId} onChange={(e) => setVisitForm({ ...visitForm, caseId: e.target.value })} /></Grid>
            <Grid item xs={6}><TextField fullWidth label="التاريخ" type="date" InputLabelProps={{ shrink: true }} value={visitForm.scheduledDate} onChange={(e) => setVisitForm({ ...visitForm, scheduledDate: e.target.value })} /></Grid>
            <Grid item xs={6}>
              <TextField select fullWidth label="النوع" value={visitForm.type} onChange={(e) => setVisitForm({ ...visitForm, type: e.target.value })}>
                <MenuItem value="home_visit">زيارة منزلية</MenuItem>
                <MenuItem value="clinic">عيادة</MenuItem>
                <MenuItem value="phone">هاتفية</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}><TextField fullWidth multiline rows={2} label="ملاحظات" value={visitForm.notes} onChange={(e) => setVisitForm({ ...visitForm, notes: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVisitDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateVisit}>جدولة</Button>
        </DialogActions>
      </Dialog>

      {/* ─── Re-Enroll Dialog ─── */}
      <Dialog open={reEnrollDialog} onClose={() => setReEnrollDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>طلب إعادة تسجيل</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}><TextField fullWidth label="معرف الحالة" value={reEnrollForm.caseId} onChange={(e) => setReEnrollForm({ ...reEnrollForm, caseId: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="البرنامج المطلوب" value={reEnrollForm.requestedProgram} onChange={(e) => setReEnrollForm({ ...reEnrollForm, requestedProgram: e.target.value })} /></Grid>
            <Grid item xs={12}><TextField fullWidth multiline rows={3} label="السبب" value={reEnrollForm.reason} onChange={(e) => setReEnrollForm({ ...reEnrollForm, reason: e.target.value })} /></Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReEnrollDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateReEnroll}>تقديم</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
