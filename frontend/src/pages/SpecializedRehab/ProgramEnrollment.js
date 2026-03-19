/**
 * 📝 تسجيل ومتابعة البرنامج — Program Enrollment & Session Tracking
 * AlAwael ERP — Enroll beneficiaries, log sessions, track goals
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Chip,
  TextField,
  Button,
  Avatar,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Divider,
  Stack,
  LinearProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  useTheme,
  alpha,
  CircularProgress,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  PersonAdd as EnrollIcon,
  Person as PersonIcon,
  Assessment as AssessmentIcon,
  EventNote as SessionIcon,
  Flag as GoalIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  Close as CloseIcon,
  CalendarToday as CalendarIcon,
  ArrowBack as BackIcon,
} from '@mui/icons-material';
import {
  REHAB_PROGRAM_TEMPLATES_CATALOG,
  PROGRAM_CATEGORY_LABELS,
  rehabProgramTemplatesService,
} from 'services/specializedRehab.service';
import { useSnackbar } from 'contexts/SnackbarContext';

/* ── helpers ── */
const STATUS_MAP = {
  pending: { label: 'قيد الانتظار', color: 'default' },
  active: { label: 'نشط', color: 'success' },
  on_hold: { label: 'معلق', color: 'warning' },
  completed: { label: 'مكتمل', color: 'info' },
  graduated: { label: 'تخرج', color: 'primary' },
  withdrawn: { label: 'منسحب', color: 'error' },
  transferred: { label: 'محوّل', color: 'secondary' },
};

export default function ProgramEnrollment() {
  const theme = useTheme();
  const g = theme.palette.gradients || {};
  const { showSnackbar } = useSnackbar();

  const [tab, setTab] = useState(0); // 0=enroll, 1=active enrollments, 2=log session
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(false);

  /* ── Enroll form ── */
  const [enrollForm, setEnrollForm] = useState({
    programCode: '',
    beneficiary: '',
    startDate: '',
    notes: '',
  });
  const [enrolling, setEnrolling] = useState(false);

  /* ── Session log ── */
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [sessionForm, setSessionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    duration: 60,
    attendance: 'present',
    engagementLevel: 3,
    mood: 'neutral',
    activitiesCompleted: '',
    therapistNotes: '',
    objectiveData: '',
    subjectiveData: '',
    plan: '',
  });
  const [savingSession, setSavingSession] = useState(false);

  /* ── Goal form ── */
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalForm, setGoalForm] = useState({
    description: '',
    targetDate: '',
    measureMethod: '',
    targetValue: 100,
  });

  /* ── Load enrollments ── */
  const loadEnrollments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await rehabProgramTemplatesService.getEnrollments({ limit: 100 });
      setEnrollments(res.data?.enrollments || res.data || []);
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEnrollments();
  }, [loadEnrollments]);

  /* ── Enroll handler ── */
  const handleEnroll = useCallback(async () => {
    if (!enrollForm.programCode || !enrollForm.beneficiary) {
      showSnackbar('يرجى اختيار البرنامج والمستفيد', 'warning');
      return;
    }
    setEnrolling(true);
    try {
      // Find template from catalog or pass code
      const _template = REHAB_PROGRAM_TEMPLATES_CATALOG.find(
        p => p.programCode === enrollForm.programCode
      );
      await rehabProgramTemplatesService.enroll({
        programTemplate: enrollForm.programCode,
        beneficiary: enrollForm.beneficiary,
        startDate: enrollForm.startDate || undefined,
        notes: enrollForm.notes,
      });
      showSnackbar('تم تسجيل المستفيد في البرنامج بنجاح', 'success');
      setEnrollForm({ programCode: '', beneficiary: '', startDate: '', notes: '' });
      loadEnrollments();
    } catch (err) {
      showSnackbar('خطأ في التسجيل: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setEnrolling(false);
    }
  }, [enrollForm, showSnackbar, loadEnrollments]);

  /* ── Log session handler ── */
  const handleLogSession = useCallback(async () => {
    if (!selectedEnrollment) return;
    setSavingSession(true);
    try {
      await rehabProgramTemplatesService.logSession(selectedEnrollment._id || selectedEnrollment, {
        date: sessionForm.date,
        duration: Number(sessionForm.duration),
        attendance: sessionForm.attendance,
        engagementLevel: Number(sessionForm.engagementLevel),
        mood: sessionForm.mood,
        activitiesCompleted: sessionForm.activitiesCompleted.split('\n').filter(a => a.trim()),
        soapNotes: {
          subjective: sessionForm.subjectiveData,
          objective: sessionForm.objectiveData,
          assessment: sessionForm.therapistNotes,
          plan: sessionForm.plan,
        },
      });
      showSnackbar('تم تسجيل الجلسة بنجاح', 'success');
      setSessionForm({
        date: new Date().toISOString().split('T')[0],
        duration: 60,
        attendance: 'present',
        engagementLevel: 3,
        mood: 'neutral',
        activitiesCompleted: '',
        therapistNotes: '',
        objectiveData: '',
        subjectiveData: '',
        plan: '',
      });
      loadEnrollments();
    } catch (err) {
      showSnackbar('خطأ: ' + (err.response?.data?.message || err.message), 'error');
    } finally {
      setSavingSession(false);
    }
  }, [selectedEnrollment, sessionForm, showSnackbar, loadEnrollments]);

  /* ── Add goal handler ── */
  const handleAddGoal = useCallback(async () => {
    if (!selectedEnrollment || !goalForm.description) return;
    try {
      await rehabProgramTemplatesService.addGoal(selectedEnrollment._id || selectedEnrollment, {
        description: goalForm.description,
        targetDate: goalForm.targetDate || undefined,
        measureMethod: goalForm.measureMethod,
        targetValue: Number(goalForm.targetValue),
      });
      showSnackbar('تمت إضافة الهدف بنجاح', 'success');
      setGoalDialogOpen(false);
      setGoalForm({ description: '', targetDate: '', measureMethod: '', targetValue: 100 });
      loadEnrollments();
    } catch (err) {
      showSnackbar('خطأ: ' + (err.response?.data?.message || err.message), 'error');
    }
  }, [selectedEnrollment, goalForm, showSnackbar, loadEnrollments]);

  /* ═══════════════════ RENDER ═══════════════════ */
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, direction: 'rtl' }}>
      {/* ── Header ── */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 3,
          background: g.info || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#fff',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: alpha('#fff', 0.2) }}>
            <EnrollIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              تسجيل ومتابعة البرنامج
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              تسجيل المستفيدين في البرامج — تسجيل الجلسات — تتبع الأهداف
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {/* ── Tabs ── */}
      <Paper sx={{ mb: 3, borderRadius: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth">
          <Tab icon={<EnrollIcon />} label="تسجيل جديد" />
          <Tab icon={<AssessmentIcon />} label="التسجيلات النشطة" />
          <Tab icon={<SessionIcon />} label="تسجيل جلسة" />
        </Tabs>
      </Paper>

      {/* ═══════ TAB 0: Enroll ═══════ */}
      {tab === 0 && (
        <Paper sx={{ p: 3, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={700} mb={2}>
            تسجيل مستفيد في برنامج تأهيلي
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>البرنامج التأهيلي</InputLabel>
                <Select
                  value={enrollForm.programCode}
                  onChange={e => setEnrollForm(f => ({ ...f, programCode: e.target.value }))}
                  label="البرنامج التأهيلي"
                >
                  {REHAB_PROGRAM_TEMPLATES_CATALOG.map(p => (
                    <MenuItem key={p.programCode} value={p.programCode}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip label={p.abbreviation} size="small" sx={{ fontWeight: 700 }} />
                        <Typography variant="body2">{p.nameAr}</Typography>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="معرف المستفيد"
                value={enrollForm.beneficiary}
                onChange={e => setEnrollForm(f => ({ ...f, beneficiary: e.target.value }))}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="تاريخ البدء"
                type="date"
                value={enrollForm.startDate}
                onChange={e => setEnrollForm(f => ({ ...f, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="ملاحظات"
                value={enrollForm.notes}
                onChange={e => setEnrollForm(f => ({ ...f, notes: e.target.value }))}
              />
            </Grid>
          </Grid>

          {/* Selected program summary */}
          {enrollForm.programCode &&
            (() => {
              const p = REHAB_PROGRAM_TEMPLATES_CATALOG.find(
                t => t.programCode === enrollForm.programCode
              );
              if (!p) return null;
              const cat = PROGRAM_CATEGORY_LABELS[p.category] || {};
              return (
                <Alert severity="info" sx={{ mt: 2, borderRadius: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {p.nameAr}
                  </Typography>
                  <Typography variant="body2">
                    المدة: {p.totalDurationWeeks} أسبوع | الجلسات: {p.sessionsPerWeek}×/أسبوع | مدة
                    الجلسة: {p.sessionDuration} دقيقة | الفئة: {cat.nameAr || p.category}
                  </Typography>
                </Alert>
              );
            })()}

          <Stack direction="row" justifyContent="flex-end" mt={3}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<EnrollIcon />}
              onClick={handleEnroll}
              disabled={enrolling || !enrollForm.programCode || !enrollForm.beneficiary}
            >
              {enrolling ? 'جارٍ التسجيل...' : 'تسجيل المستفيد'}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* ═══════ TAB 1: Active Enrollments ═══════ */}
      {tab === 1 && (
        <Box>
          <Stack direction="row" justifyContent="space-between" mb={2}>
            <Typography variant="h6" fontWeight={700}>
              التسجيلات ({enrollments.length})
            </Typography>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadEnrollments}
              disabled={loading}
            >
              تحديث
            </Button>
          </Stack>

          {loading ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <CircularProgress />
            </Box>
          ) : enrollments.length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <EnrollIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                لا توجد تسجيلات بعد
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={2}>
              {enrollments.map((enr, idx) => {
                const st = STATUS_MAP[enr.status] || STATUS_MAP.pending;
                return (
                  <Grid item xs={12} sm={6} md={4} key={enr._id || idx}>
                    <Card
                      sx={{
                        borderRadius: 2,
                        borderRight: `4px solid ${theme.palette[st.color]?.main || '#999'}`,
                      }}
                    >
                      <CardContent>
                        <Stack
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          mb={1}
                        >
                          <Typography variant="subtitle2" fontWeight={700}>
                            {enr.programTemplate?.nameAr || enr.programTemplate || 'برنامج'}
                          </Typography>
                          <Chip label={st.label} size="small" color={st.color} variant="outlined" />
                        </Stack>
                        <Typography variant="body2" color="text.secondary" mb={1}>
                          المستفيد:{' '}
                          {enr.beneficiary?.nameAr ||
                            enr.beneficiary?.name ||
                            enr.beneficiary ||
                            '—'}
                        </Typography>
                        <Stack direction="row" spacing={1} mb={1}>
                          <Chip
                            icon={<CalendarIcon />}
                            label={
                              enr.startDate
                                ? new Date(enr.startDate).toLocaleDateString('ar-SA')
                                : '—'
                            }
                            size="small"
                          />
                          <Chip
                            icon={<SessionIcon />}
                            label={`${enr.sessionLogs?.length || 0} جلسة`}
                            size="small"
                            variant="outlined"
                          />
                          <Chip
                            icon={<GoalIcon />}
                            label={`${enr.individualGoals?.length || 0} هدف`}
                            size="small"
                            variant="outlined"
                          />
                        </Stack>
                        {/* Progress bar */}
                        {enr.overallProgress?.completionPercentage != null && (
                          <Box>
                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="caption">التقدم</Typography>
                              <Typography variant="caption" fontWeight={700}>
                                {enr.overallProgress.completionPercentage}%
                              </Typography>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={enr.overallProgress.completionPercentage}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                        )}
                        <Stack direction="row" spacing={1} mt={1.5}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<SessionIcon />}
                            onClick={() => {
                              setSelectedEnrollment(enr);
                              setTab(2);
                            }}
                          >
                            تسجيل جلسة
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<GoalIcon />}
                            onClick={() => {
                              setSelectedEnrollment(enr);
                              setGoalDialogOpen(true);
                            }}
                          >
                            إضافة هدف
                          </Button>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Box>
      )}

      {/* ═══════ TAB 2: Log Session ═══════ */}
      {tab === 2 && (
        <Box>
          {!selectedEnrollment ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <SessionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                اختر تسجيلاً من التبويب السابق لإضافة جلسة
              </Typography>
              <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setTab(1)}>
                عرض التسجيلات
              </Button>
            </Paper>
          ) : (
            <Paper sx={{ p: 3, borderRadius: 2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight={700}>
                  تسجيل جلسة جديدة
                </Typography>
                <Button variant="text" startIcon={<BackIcon />} onClick={() => setTab(1)}>
                  العودة للتسجيلات
                </Button>
              </Stack>

              <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
                البرنامج:{' '}
                {selectedEnrollment.programTemplate?.nameAr ||
                  selectedEnrollment.programTemplate ||
                  '—'}{' '}
                | المستفيد:{' '}
                {selectedEnrollment.beneficiary?.nameAr || selectedEnrollment.beneficiary || '—'}
              </Alert>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="التاريخ"
                    type="date"
                    value={sessionForm.date}
                    onChange={e => setSessionForm(f => ({ ...f, date: e.target.value }))}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="المدة (دقيقة)"
                    type="number"
                    value={sessionForm.duration}
                    onChange={e => setSessionForm(f => ({ ...f, duration: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>الحضور</InputLabel>
                    <Select
                      value={sessionForm.attendance}
                      onChange={e => setSessionForm(f => ({ ...f, attendance: e.target.value }))}
                      label="الحضور"
                    >
                      <MenuItem value="present">حاضر</MenuItem>
                      <MenuItem value="absent">غائب</MenuItem>
                      <MenuItem value="late">متأخر</MenuItem>
                      <MenuItem value="cancelled">ملغاة</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>مستوى التفاعل</InputLabel>
                    <Select
                      value={sessionForm.engagementLevel}
                      onChange={e =>
                        setSessionForm(f => ({ ...f, engagementLevel: e.target.value }))
                      }
                      label="مستوى التفاعل"
                    >
                      {[1, 2, 3, 4, 5].map(v => (
                        <MenuItem key={v} value={v}>
                          {v} — {v <= 2 ? 'منخفض' : v <= 3 ? 'متوسط' : 'مرتفع'}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>المزاج</InputLabel>
                    <Select
                      value={sessionForm.mood}
                      onChange={e => setSessionForm(f => ({ ...f, mood: e.target.value }))}
                      label="المزاج"
                    >
                      <MenuItem value="happy">سعيد 😊</MenuItem>
                      <MenuItem value="neutral">محايد 😐</MenuItem>
                      <MenuItem value="sad">حزين 😢</MenuItem>
                      <MenuItem value="anxious">قلق 😰</MenuItem>
                      <MenuItem value="frustrated">محبط 😤</MenuItem>
                      <MenuItem value="calm">هادئ 😌</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="الأنشطة المنجزة (سطر لكل نشاط)"
                    value={sessionForm.activitiesCompleted}
                    onChange={e =>
                      setSessionForm(f => ({ ...f, activitiesCompleted: e.target.value }))
                    }
                  />
                </Grid>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Chip label="ملاحظات SOAP" size="small" />
                  </Divider>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="S — شكوى المريض / ملاحظات ذاتية"
                    value={sessionForm.subjectiveData}
                    onChange={e => setSessionForm(f => ({ ...f, subjectiveData: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="O — بيانات موضوعية"
                    value={sessionForm.objectiveData}
                    onChange={e => setSessionForm(f => ({ ...f, objectiveData: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="A — تقييم المعالج"
                    value={sessionForm.therapistNotes}
                    onChange={e => setSessionForm(f => ({ ...f, therapistNotes: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="P — الخطة"
                    value={sessionForm.plan}
                    onChange={e => setSessionForm(f => ({ ...f, plan: e.target.value }))}
                  />
                </Grid>
              </Grid>

              <Stack direction="row" justifyContent="flex-end" mt={3}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<SaveIcon />}
                  onClick={handleLogSession}
                  disabled={savingSession}
                >
                  {savingSession ? 'جارٍ الحفظ...' : 'حفظ الجلسة'}
                </Button>
              </Stack>
            </Paper>
          )}
        </Box>
      )}

      {/* ═══════ Add Goal Dialog ═══════ */}
      <Dialog
        open={goalDialogOpen}
        onClose={() => setGoalDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={700}>
              إضافة هدف جديد
            </Typography>
            <IconButton onClick={() => setGoalDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="وصف الهدف"
                value={goalForm.description}
                onChange={e => setGoalForm(f => ({ ...f, description: e.target.value }))}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="التاريخ المستهدف"
                type="date"
                value={goalForm.targetDate}
                onChange={e => setGoalForm(f => ({ ...f, targetDate: e.target.value }))}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="القيمة المستهدفة (%)"
                type="number"
                value={goalForm.targetValue}
                onChange={e => setGoalForm(f => ({ ...f, targetValue: e.target.value }))}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="طريقة القياس"
                value={goalForm.measureMethod}
                onChange={e => setGoalForm(f => ({ ...f, measureMethod: e.target.value }))}
                placeholder="مثال: ملاحظة مباشرة، اختبار أداء..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGoalDialogOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddGoal}
            disabled={!goalForm.description}
          >
            إضافة
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
