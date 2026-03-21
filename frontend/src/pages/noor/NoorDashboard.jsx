/**
 * Noor Integration Dashboard — لوحة نظام نور
 *
 * Saudi Ministry of Education Noor system integration:
 *  - Student enrollment management & sync status
 *  - Individual Education Plans (IEPs) tracking
 *  - Academic progress reports
 *  - Disability type & placement analytics
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Paper,
} from '@mui/material';


import noorService from '../../services/noor.service';

/* ─── Status label maps ─── */
const enrollmentStatusMap = {
  active: { label: 'نشط', color: 'success' },
  transferred: { label: 'منقول', color: 'info' },
  graduated: { label: 'متخرج', color: 'primary' },
  withdrawn: { label: 'منسحب', color: 'warning' },
  suspended: { label: 'موقوف', color: 'error' },
};

const syncStatusMap = {
  synced: { label: 'مُزامَن', color: 'success' },
  pending: { label: 'قيد المزامنة', color: 'warning' },
  error: { label: 'خطأ', color: 'error' },
  not_synced: { label: 'غير مُزامَن', color: 'default' },
};

const iepStatusMap = {
  draft: { label: 'مسودة', color: 'default' },
  active: { label: 'نشطة', color: 'success' },
  completed: { label: 'مكتملة', color: 'primary' },
  cancelled: { label: 'ملغاة', color: 'error' },
};

const disabilityTypeMap = {
  intellectual: 'إعاقة ذهنية',
  physical: 'إعاقة جسدية',
  hearing: 'إعاقة سمعية',
  visual: 'إعاقة بصرية',
  autism: 'اضطراب طيف التوحد',
  learning_disability: 'صعوبات تعلم',
  speech_language: 'اضطرابات النطق واللغة',
  multiple: 'إعاقات متعددة',
  other: 'أخرى',
};

const placementMap = {
  special_center: 'مركز تأهيل متخصص',
  special_class: 'فصل خاص',
  resource_room: 'غرفة مصادر',
  inclusive: 'دمج كلي',
  home_based: 'تعليم منزلي',
  hospital_based: 'تعليم مستشفى',
};

export default function NoorDashboard() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Dashboard
  const [dashboard, setDashboard] = useState(null);

  // Students
  const [students, setStudents] = useState([]);
  const [studentTotal, setStudentTotal] = useState(0);

  // IEPs
  const [ieps, setIeps] = useState([]);
  const [iepTotal, setIepTotal] = useState(0);

  // Progress Reports
  const [reports, setReports] = useState([]);
  const [reportTotal, setReportTotal] = useState(0);

  // Dialogs
  const [studentDialog, setStudentDialog] = useState(false);
  const [iepDialog, setIepDialog] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [bulkSyncing, setBulkSyncing] = useState(false);

  // Forms
  const [studentForm, setStudentForm] = useState({
    noorId: '',
    nationalId: '',
    studentName: { ar: '', en: '' },
    dateOfBirth: '',
    gender: 'male',
    disabilityType: 'intellectual',
    disabilitySeverity: 'moderate',
    educationalPlacement: 'special_center',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
  });
  const [iepForm, setIepForm] = useState({
    noorStudentId: '',
    academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
    semester: 1,
    goals: [],
  });

  /* ─── Data loading ─── */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashRes, studRes, iepRes, repRes] = await Promise.all([
        noorService.getDashboard().catch(() => ({ data: { data: null } })),
        noorService.getStudents({ limit: 25 }).catch(() => ({
          data: { data: { students: [], total: 0 } },
        })),
        noorService.getIEPs({ limit: 20 }).catch(() => ({
          data: { data: { ieps: [], total: 0 } },
        })),
        noorService.getProgressReports({ limit: 20 }).catch(() => ({
          data: { data: { reports: [], total: 0 } },
        })),
      ]);

      setDashboard(dashRes?.data?.data || null);
      const studData = studRes?.data?.data || {};
      setStudents(studData.students || []);
      setStudentTotal(studData.total || 0);
      const iepData = iepRes?.data?.data || {};
      setIeps(iepData.ieps || []);
      setIepTotal(iepData.total || 0);
      const repData = repRes?.data?.data || {};
      setReports(repData.reports || []);
      setReportTotal(repData.total || 0);
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ─── Handlers ─── */
  const handleCreateStudent = async () => {
    try {
      await noorService.createStudent(studentForm);
      setStudentDialog(false);
      setStudentForm({
        noorId: '',
        nationalId: '',
        studentName: { ar: '', en: '' },
        dateOfBirth: '',
        gender: 'male',
        disabilityType: 'intellectual',
        disabilitySeverity: 'moderate',
        educationalPlacement: 'special_center',
        academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`,
      });
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل إنشاء الطالب');
    }
  };

  const handleSyncStudent = async (id) => {
    setSyncingId(id);
    try {
      await noorService.syncStudent(id);
      loadData();
    } catch {
      setError('فشلت المزامنة');
    } finally {
      setSyncingId(null);
    }
  };

  const handleBulkSync = async () => {
    setBulkSyncing(true);
    try {
      const year = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
      await noorService.bulkSync(year);
      loadData();
    } catch {
      setError('فشلت المزامنة الجماعية');
    } finally {
      setBulkSyncing(false);
    }
  };

  const handleCreateIEP = async () => {
    try {
      await noorService.createIEP(iepForm);
      setIepDialog(false);
      loadData();
    } catch (err) {
      setError(err?.response?.data?.message || 'فشل إنشاء الخطة التربوية');
    }
  };

  const handleSubmitIEP = async (id) => {
    try {
      await noorService.submitIEPToNoor(id);
      loadData();
    } catch {
      setError('فشل إرسال الخطة إلى نور');
    }
  };

  /* ─── Render helpers ─── */
  const StatCard = ({ title, value, icon, color = 'primary.main' }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1} mb={1}>
          <Box sx={{ color }}>{icon}</Box>
          <Typography variant="subtitle2" color="text.secondary">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" fontWeight="bold">
          {value ?? '—'}
        </Typography>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box p={4} textAlign="center">
        <CircularProgress />
        <Typography mt={2}>جاري تحميل بيانات نظام نور...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3} dir="rtl">
      {/* Header */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h4" fontWeight="bold">
            <SchoolIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            نظام نور — وزارة التعليم
          </Typography>
          <Typography color="text.secondary">
            إدارة التكامل مع نظام نور للطلاب ذوي الإعاقة
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={loadData}
        >
          تحديث
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* KPI Cards */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="إجمالي الطلاب"
            value={dashboard?.students?.total || studentTotal}
            icon={<StudentIcon />}
            color="primary.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="الطلاب المُزامَنون"
            value={dashboard?.students?.synced || 0}
            icon={<SyncIcon />}
            color="success.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="الخطط التربوية النشطة"
            value={dashboard?.ieps?.active || iepTotal}
            icon={<IEPIcon />}
            color="info.main"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="تقارير الأداء"
            value={dashboard?.reports?.total || reportTotal}
            icon={<ReportIcon />}
            color="warning.main"
          />
        </Grid>
      </Grid>

      {/* Tabs */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ mb: 2 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab label="الطلاب" icon={<StudentIcon />} iconPosition="start" />
        <Tab label="الخطط التربوية (IEP)" icon={<IEPIcon />} iconPosition="start" />
        <Tab label="تقارير الأداء" icon={<ReportIcon />} iconPosition="start" />
      </Tabs>

      {/* ────── Tab 0: Students ────── */}
      {tab === 0 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="h6">
                الطلاب المسجلون ({studentTotal})
              </Typography>
              <Box display="flex" gap={1}>
                <Button
                  variant="outlined"
                  startIcon={<SyncIcon />}
                  onClick={handleBulkSync}
                  disabled={bulkSyncing}
                >
                  {bulkSyncing ? 'جارٍ المزامنة...' : 'مزامنة جماعية'}
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setStudentDialog(true)}
                >
                  تسجيل طالب
                </Button>
              </Box>
            </Box>

            {bulkSyncing && <LinearProgress sx={{ mb: 1 }} />}

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>رقم نور</TableCell>
                    <TableCell>اسم الطالب</TableCell>
                    <TableCell>نوع الإعاقة</TableCell>
                    <TableCell>التصنيف التعليمي</TableCell>
                    <TableCell>حالة القيد</TableCell>
                    <TableCell>المزامنة</TableCell>
                    <TableCell>إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">
                        لا يوجد طلاب مسجلون بعد
                      </TableCell>
                    </TableRow>
                  ) : (
                    students.map((s) => (
                      <TableRow key={s._id}>
                        <TableCell>{s.noorId}</TableCell>
                        <TableCell>{s.studentName?.ar || '—'}</TableCell>
                        <TableCell>
                          {disabilityTypeMap[s.disabilityType] || s.disabilityType}
                        </TableCell>
                        <TableCell>
                          {placementMap[s.educationalPlacement] || s.educationalPlacement}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={enrollmentStatusMap[s.enrollmentStatus]?.label || s.enrollmentStatus}
                            color={enrollmentStatusMap[s.enrollmentStatus]?.color || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={syncStatusMap[s.syncStatus]?.label || s.syncStatus}
                            color={syncStatusMap[s.syncStatus]?.color || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Tooltip title="مزامنة مع نور">
                            <IconButton
                              size="small"
                              onClick={() => handleSyncStudent(s._id)}
                              disabled={syncingId === s._id}
                            >
                              {syncingId === s._id ? (
                                <CircularProgress size={18} />
                              ) : (
                                <SyncIcon fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ────── Tab 1: IEPs ────── */}
      {tab === 1 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="h6">
                الخطط التربوية الفردية ({iepTotal})
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setIepDialog(true)}
              >
                إنشاء خطة تربوية
              </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>رقم الخطة</TableCell>
                    <TableCell>الطالب</TableCell>
                    <TableCell>السنة الدراسية</TableCell>
                    <TableCell>الفصل</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>حالة نور</TableCell>
                    <TableCell>الأهداف</TableCell>
                    <TableCell>إجراءات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ieps.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center">
                        لا توجد خطط تربوية بعد
                      </TableCell>
                    </TableRow>
                  ) : (
                    ieps.map((iep) => (
                      <TableRow key={iep._id}>
                        <TableCell>{iep.planNumber || '—'}</TableCell>
                        <TableCell>
                          {iep.student?.studentName?.ar || '—'}
                        </TableCell>
                        <TableCell>{iep.academicYear}</TableCell>
                        <TableCell>
                          {iep.semester === 1 ? 'الأول' : 'الثاني'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={iepStatusMap[iep.status]?.label || iep.status}
                            color={iepStatusMap[iep.status]?.color || 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              iep.noorSubmissionStatus === 'submitted'
                                ? 'مُرسلة'
                                : iep.noorSubmissionStatus === 'approved'
                                ? 'معتمدة'
                                : 'غير مُرسلة'
                            }
                            color={
                              iep.noorSubmissionStatus === 'approved'
                                ? 'success'
                                : iep.noorSubmissionStatus === 'submitted'
                                ? 'info'
                                : 'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {iep.goals?.length || 0} أهداف
                        </TableCell>
                        <TableCell>
                          {iep.status === 'active' &&
                            iep.noorSubmissionStatus !== 'submitted' && (
                              <Tooltip title="إرسال إلى نور">
                                <IconButton
                                  size="small"
                                  color="primary"
                                  onClick={() => handleSubmitIEP(iep._id)}
                                >
                                  <SubmitIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ────── Tab 2: Progress Reports ────── */}
      {tab === 2 && (
        <Card>
          <CardContent>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Typography variant="h6">
                تقارير الأداء الأكاديمي ({reportTotal})
              </Typography>
            </Box>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>الطالب</TableCell>
                    <TableCell>الفترة</TableCell>
                    <TableCell>السنة / الفصل</TableCell>
                    <TableCell>الأداء العام</TableCell>
                    <TableCell>نسبة الحضور</TableCell>
                    <TableCell>مُرسل لنور</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        لا توجد تقارير بعد
                      </TableCell>
                    </TableRow>
                  ) : (
                    reports.map((r) => (
                      <TableRow key={r._id}>
                        <TableCell>
                          {r.student?.studentName?.ar || '—'}
                        </TableCell>
                        <TableCell>
                          {r.reportPeriod === 'monthly'
                            ? 'شهري'
                            : r.reportPeriod === 'quarterly'
                            ? 'ربع سنوي'
                            : r.reportPeriod === 'semester'
                            ? 'فصلي'
                            : 'سنوي'}
                        </TableCell>
                        <TableCell>
                          {r.academicYear} — فصل {r.semester}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={
                              r.overallProgress === 'excellent'
                                ? 'ممتاز'
                                : r.overallProgress === 'good'
                                ? 'جيد'
                                : r.overallProgress === 'satisfactory'
                                ? 'مقبول'
                                : r.overallProgress === 'needs_improvement'
                                ? 'يحتاج تحسين'
                                : 'غير مرضٍ'
                            }
                            color={
                              r.overallProgress === 'excellent'
                                ? 'success'
                                : r.overallProgress === 'good'
                                ? 'primary'
                                : r.overallProgress === 'satisfactory'
                                ? 'info'
                                : 'warning'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {r.attendance?.attendanceRate != null ? (
                            <Box display="flex" alignItems="center" gap={1}>
                              <LinearProgress
                                variant="determinate"
                                value={r.attendance.attendanceRate}
                                sx={{ flex: 1, height: 8, borderRadius: 4 }}
                                color={
                                  r.attendance.attendanceRate >= 90
                                    ? 'success'
                                    : r.attendance.attendanceRate >= 75
                                    ? 'warning'
                                    : 'error'
                                }
                              />
                              <Typography variant="caption">
                                {r.attendance.attendanceRate}%
                              </Typography>
                            </Box>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={r.noorSubmitted ? 'نعم' : 'لا'}
                            color={r.noorSubmitted ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* ────── Student Dialog ────── */}
      <Dialog
        open={studentDialog}
        onClose={() => setStudentDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>تسجيل طالب جديد في نظام نور</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="رقم نور"
                value={studentForm.noorId}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, noorId: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="رقم الهوية الوطنية"
                value={studentForm.nationalId}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, nationalId: e.target.value })
                }
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="اسم الطالب (عربي)"
                value={studentForm.studentName.ar}
                onChange={(e) =>
                  setStudentForm({
                    ...studentForm,
                    studentName: {
                      ...studentForm.studentName,
                      ar: e.target.value,
                    },
                  })
                }
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="اسم الطالب (إنجليزي)"
                value={studentForm.studentName.en}
                onChange={(e) =>
                  setStudentForm({
                    ...studentForm,
                    studentName: {
                      ...studentForm.studentName,
                      en: e.target.value,
                    },
                  })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="تاريخ الميلاد"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={studentForm.dateOfBirth}
                onChange={(e) =>
                  setStudentForm({
                    ...studentForm,
                    dateOfBirth: e.target.value,
                  })
                }
                required
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="الجنس"
                value={studentForm.gender}
                onChange={(e) =>
                  setStudentForm({ ...studentForm, gender: e.target.value })
                }
              >
                <MenuItem value="male">ذكر</MenuItem>
                <MenuItem value="female">أنثى</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="نوع الإعاقة"
                value={studentForm.disabilityType}
                onChange={(e) =>
                  setStudentForm({
                    ...studentForm,
                    disabilityType: e.target.value,
                  })
                }
              >
                {Object.entries(disabilityTypeMap).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="التصنيف التعليمي"
                value={studentForm.educationalPlacement}
                onChange={(e) =>
                  setStudentForm({
                    ...studentForm,
                    educationalPlacement: e.target.value,
                  })
                }
              >
                {Object.entries(placementMap).map(([k, v]) => (
                  <MenuItem key={k} value={k}>
                    {v}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="الشدة"
                value={studentForm.disabilitySeverity}
                onChange={(e) =>
                  setStudentForm({
                    ...studentForm,
                    disabilitySeverity: e.target.value,
                  })
                }
              >
                <MenuItem value="mild">خفيفة</MenuItem>
                <MenuItem value="moderate">متوسطة</MenuItem>
                <MenuItem value="severe">شديدة</MenuItem>
                <MenuItem value="profound">عميقة</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="السنة الدراسية"
                value={studentForm.academicYear}
                onChange={(e) =>
                  setStudentForm({
                    ...studentForm,
                    academicYear: e.target.value,
                  })
                }
                placeholder="2025-2026"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStudentDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateStudent}>
            تسجيل
          </Button>
        </DialogActions>
      </Dialog>

      {/* ────── IEP Dialog ────── */}
      <Dialog
        open={iepDialog}
        onClose={() => setIepDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>إنشاء خطة تربوية فردية جديدة</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="رقم نور للطالب"
                value={iepForm.noorStudentId}
                onChange={(e) =>
                  setIepForm({ ...iepForm, noorStudentId: e.target.value })
                }
                required
                helperText="أدخل رقم نور الخاص بالطالب"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                label="السنة الدراسية"
                value={iepForm.academicYear}
                onChange={(e) =>
                  setIepForm({ ...iepForm, academicYear: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                select
                label="الفصل الدراسي"
                value={iepForm.semester}
                onChange={(e) =>
                  setIepForm({ ...iepForm, semester: Number(e.target.value) })
                }
              >
                <MenuItem value={1}>الفصل الأول</MenuItem>
                <MenuItem value={2}>الفصل الثاني</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIepDialog(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleCreateIEP}>
            إنشاء الخطة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
