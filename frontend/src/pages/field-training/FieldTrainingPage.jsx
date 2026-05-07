/**
 * Field Training Page — صفحة التدريب الميداني
 *
 * الهدف التشغيلي: إدارة برامج التدريب الميداني وتسجيل المتدربين،
 * توثيق الساعات والتقييمات والملاحظات الإشرافية، وتتبع الكفاءات.
 *
 * يستخدم: fieldTrainingAPI من services/ddd
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  IconButton,
  Stack,
  Alert,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Divider,
  Rating,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  Edit as EditIcon,
  Close as CloseIcon,
  School as SchoolIcon,
  Group as TraineesIcon,
  Dashboard as DashboardIcon,
  AccessTime as HoursIcon,
  Star as EvalIcon,
} from '@mui/icons-material';
import { fieldTrainingAPI } from '../../services/ddd';

// ── Constants ─────────────────────────────────────────────────────────────────
const PROGRAM_TYPES = [
  { value: 'internship', label: 'تدريب داخلي' },
  { value: 'practicum', label: 'تطبيق ميداني' },
  { value: 'rotation', label: 'دوران تخصصي' },
  { value: 'volunteer', label: 'تطوعي' },
  { value: 'observation', label: 'ملاحظة وتتبع' },
];

const PROGRAM_STATUSES = {
  active: { label: 'نشط', color: 'success' },
  upcoming: { label: 'قادم', color: 'primary' },
  completed: { label: 'منتهي', color: 'default' },
  suspended: { label: 'موقوف', color: 'warning' },
};

const TRAINEE_STATUSES = {
  enrolled: { label: 'مسجّل', color: 'primary' },
  active: { label: 'نشط', color: 'success' },
  completed: { label: 'مكتمل', color: 'default' },
  withdrawn: { label: 'منسحب', color: 'error' },
  failed: { label: 'راسب', color: 'error' },
};

const SPECIALTIES = [
  'علاج وظيفي',
  'علاج طبيعي',
  'علاج نطق ولغة',
  'أخصائي اجتماعي',
  'علم نفس',
  'تأهيل مهني',
  'تعليم خاص',
  'تحليل السلوك التطبيقي',
  'أخرى',
];

const EVAL_CRITERIA = [
  { key: 'clinicalSkills', label: 'المهارات السريرية' },
  { key: 'professionalConduct', label: 'السلوك المهني' },
  { key: 'communicationSkills', label: 'مهارات التواصل' },
  { key: 'documentationQuality', label: 'جودة التوثيق' },
  { key: 'patientInteraction', label: 'التعامل مع المستفيد' },
];

const INITIAL_PROGRAM_FORM = {
  name: '',
  type: 'practicum',
  specialty: '',
  description: '',
  startDate: '',
  endDate: '',
  maxTrainees: 5,
  supervisorName: '',
  supervisorEmail: '',
  objectives: '',
};

const INITIAL_ENROLL_FORM = {
  programId: '',
  name: '',
  university: '',
  studentId: '',
  specialty: '',
  startDate: '',
  phone: '',
  email: '',
};

const INITIAL_HOURS_FORM = {
  traineeId: '',
  date: new Date().toISOString().slice(0, 10),
  hours: 4,
  type: 'direct',
  notes: '',
};

const INITIAL_EVAL_FORM = {
  traineeId: '',
  type: 'midterm',
  clinicalSkills: 3,
  professionalConduct: 3,
  communicationSkills: 3,
  documentationQuality: 3,
  patientInteraction: 3,
  overallRating: 3,
  comments: '',
  recommendations: '',
};

const fmtDate = d => (d ? new Date(d).toLocaleDateString('ar-SA') : '—');

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon, color, loading: busy }) {
  return (
    <Card sx={{ borderRadius: 2, border: `1px solid ${color}33` }}>
      <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: color, width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          {busy ? (
            <CircularProgress size={24} />
          ) : (
            <Typography variant="h4" fontWeight="bold" lineHeight={1}>
              {value ?? 0}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function FieldTrainingPage() {
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Data
  const [programs, setPrograms] = useState([]);
  const [trainees, setTrainees] = useState([]);
  const [dashboardData, setDashboardData] = useState(null);

  // Dialogs
  const [programDialog, setProgramDialog] = useState(false);
  const [enrollDialog, setEnrollDialog] = useState(false);
  const [hoursDialog, setHoursDialog] = useState(false);
  const [evalDialog, setEvalDialog] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);

  // Forms
  const [programForm, setProgramForm] = useState(INITIAL_PROGRAM_FORM);
  const [enrollForm, setEnrollForm] = useState(INITIAL_ENROLL_FORM);
  const [hoursForm, setHoursForm] = useState(INITIAL_HOURS_FORM);
  const [evalForm, setEvalForm] = useState(INITIAL_EVAL_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Filters
  const [filterProgramStatus, setFilterProgramStatus] = useState('');
  const [filterTraineeStatus, setFilterTraineeStatus] = useState('');

  // ── Fetch ───────────────────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fieldTrainingAPI.getDashboard({});
      setDashboardData(res?.data?.data || res?.data || null);
    } catch {
      setDashboardData(null);
    }
  }, []);

  const fetchPrograms = useCallback(async () => {
    try {
      const params = { limit: 50, ...(filterProgramStatus && { status: filterProgramStatus }) };
      const res = await fieldTrainingAPI.listPrograms(params);
      const data = res?.data?.data || res?.data?.programs || res?.data || [];
      setPrograms(Array.isArray(data) ? data : []);
    } catch {
      setPrograms([]);
    }
  }, [filterProgramStatus]);

  const fetchTrainees = useCallback(async () => {
    try {
      const params = { limit: 50, ...(filterTraineeStatus && { status: filterTraineeStatus }) };
      const res = await fieldTrainingAPI.listTrainees(params);
      const data = res?.data?.data || res?.data?.trainees || res?.data || [];
      setTrainees(Array.isArray(data) ? data : []);
    } catch {
      setTrainees([]);
    }
  }, [filterTraineeStatus]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.allSettled([fetchDashboard(), fetchPrograms(), fetchTrainees()]);
    } finally {
      setLoading(false);
    }
  }, [fetchDashboard, fetchPrograms, fetchTrainees]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── KPIs ────────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const d = dashboardData;
    return {
      activePrograms: d?.activePrograms ?? programs.filter(p => p.status === 'active').length,
      totalTrainees: d?.totalTrainees ?? trainees.length,
      activeTrainees: d?.activeTrainees ?? trainees.filter(t => t.status === 'active').length,
      completedTrainees:
        d?.completedTrainees ?? trainees.filter(t => t.status === 'completed').length,
    };
  }, [dashboardData, programs, trainees]);

  // ── Program Handlers ─────────────────────────────────────────────────────────
  const handleOpenAddProgram = () => {
    setEditingProgram(null);
    setProgramForm(INITIAL_PROGRAM_FORM);
    setFormError('');
    setProgramDialog(true);
  };
  const handleOpenEditProgram = p => {
    setEditingProgram(p);
    setProgramForm({
      name: p.name || '',
      type: p.type || 'practicum',
      specialty: p.specialty || '',
      description: p.description || '',
      startDate: p.startDate?.slice(0, 10) || '',
      endDate: p.endDate?.slice(0, 10) || '',
      maxTrainees: p.maxTrainees || 5,
      supervisorName: p.supervisorName || '',
      supervisorEmail: p.supervisorEmail || '',
      objectives: p.objectives || '',
    });
    setFormError('');
    setProgramDialog(true);
  };
  const handleSaveProgram = async () => {
    if (!programForm.name.trim()) {
      setFormError('اسم البرنامج مطلوب');
      return;
    }
    if (!programForm.startDate) {
      setFormError('تاريخ البداية مطلوب');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        ...programForm,
        maxTrainees: Number(programForm.maxTrainees),
        startDate: new Date(programForm.startDate).toISOString(),
        endDate: programForm.endDate ? new Date(programForm.endDate).toISOString() : undefined,
      };
      if (editingProgram) {
        await fieldTrainingAPI.updateProgram(editingProgram._id, payload);
      } else {
        await fieldTrainingAPI.createProgram(payload);
      }
      setProgramDialog(false);
      fetchPrograms();
      fetchDashboard();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  // ── Enroll Handlers ──────────────────────────────────────────────────────────
  const handleEnroll = async () => {
    if (!enrollForm.name.trim()) {
      setFormError('اسم المتدرب مطلوب');
      return;
    }
    if (!enrollForm.programId.trim()) {
      setFormError('يرجى اختيار البرنامج');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await fieldTrainingAPI.enrollTrainee(enrollForm.programId, {
        ...enrollForm,
        startDate: enrollForm.startDate ? new Date(enrollForm.startDate).toISOString() : undefined,
      });
      setEnrollDialog(false);
      setEnrollForm(INITIAL_ENROLL_FORM);
      fetchTrainees();
      fetchDashboard();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  // ── Hours Handler ────────────────────────────────────────────────────────────
  const handleLogHours = async () => {
    if (!hoursForm.traineeId.trim()) {
      setFormError('معرّف المتدرب مطلوب');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await fieldTrainingAPI.logHours(hoursForm.traineeId, {
        date: new Date(hoursForm.date).toISOString(),
        hours: Number(hoursForm.hours),
        type: hoursForm.type,
        notes: hoursForm.notes,
      });
      setHoursDialog(false);
      setHoursForm(INITIAL_HOURS_FORM);
      fetchTrainees();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  // ── Evaluation Handler ───────────────────────────────────────────────────────
  const handleAddEval = async () => {
    if (!evalForm.traineeId.trim()) {
      setFormError('معرّف المتدرب مطلوب');
      return;
    }
    setSaving(true);
    setFormError('');
    try {
      await fieldTrainingAPI.addEvaluation(evalForm.traineeId, {
        type: evalForm.type,
        scores: {
          clinicalSkills: Number(evalForm.clinicalSkills),
          professionalConduct: Number(evalForm.professionalConduct),
          communicationSkills: Number(evalForm.communicationSkills),
          documentationQuality: Number(evalForm.documentationQuality),
          patientInteraction: Number(evalForm.patientInteraction),
        },
        overallRating: Number(evalForm.overallRating),
        comments: evalForm.comments,
        recommendations: evalForm.recommendations,
      });
      setEvalDialog(false);
      setEvalForm(INITIAL_EVAL_FORM);
      fetchTrainees();
    } catch (err) {
      setFormError(err?.response?.data?.message || 'حدث خطأ');
    } finally {
      setSaving(false);
    }
  };

  const setProgField = k => e => setProgramForm(f => ({ ...f, [k]: e.target.value }));
  const setEnrField = k => e => setEnrollForm(f => ({ ...f, [k]: e.target.value }));
  const setHoursField = k => e => setHoursForm(f => ({ ...f, [k]: e.target.value }));
  const setEvalField = k => e => setEvalForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <Box sx={{ p: 3, direction: 'rtl' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Avatar sx={{ bgcolor: '#5c6bc0', width: 44, height: 44 }}>
            <SchoolIcon />
          </Avatar>
          <Box>
            <Typography variant="h5" fontWeight="bold">
              التدريب الميداني
            </Typography>
            <Typography variant="caption" color="text.secondary">
              إدارة برامج التدريب الميداني وتقييم المتدربين وتتبع الكفاءات
            </Typography>
          </Box>
        </Box>
        <Tooltip title="تحديث">
          <IconButton onClick={fetchAll} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {loading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab icon={<DashboardIcon fontSize="small" />} iconPosition="start" label="لوحة المتابعة" />
        <Tab
          icon={<SchoolIcon fontSize="small" />}
          iconPosition="start"
          label={`البرامج (${programs.length})`}
        />
        <Tab
          icon={<TraineesIcon fontSize="small" />}
          iconPosition="start"
          label={`المتدربون (${trainees.length})`}
        />
        <Tab icon={<EvalIcon fontSize="small" />} iconPosition="start" label="التقييم والساعات" />
      </Tabs>

      {/* ── TAB 0: Dashboard ── */}
      {tab === 0 && (
        <Box>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="برامج نشطة"
                value={kpis.activePrograms}
                icon={<SchoolIcon />}
                color="#5c6bc0"
                loading={loading}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="إجمالي المتدربين"
                value={kpis.totalTrainees}
                icon={<TraineesIcon />}
                color="#0288d1"
                loading={loading}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="متدربون نشطون"
                value={kpis.activeTrainees}
                icon={<HoursIcon />}
                color="#ff9800"
                loading={loading}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <KpiCard
                label="متدربون أتمّوا"
                value={kpis.completedTrainees}
                icon={<EvalIcon />}
                color="#4caf50"
                loading={loading}
              />
            </Grid>
          </Grid>

          {/* Active programs list */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      البرامج النشطة
                    </Typography>
                    <Button size="small" onClick={() => setTab(1)}>
                      عرض الكل
                    </Button>
                  </Box>
                  {programs.filter(p => p.status === 'active').length === 0 ? (
                    <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                      لا توجد برامج نشطة
                    </Typography>
                  ) : (
                    programs
                      .filter(p => p.status === 'active')
                      .slice(0, 4)
                      .map((p, i) => (
                        <Box key={p._id}>
                          {i > 0 && <Divider sx={{ my: 1 }} />}
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                {p.name}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {PROGRAM_TYPES.find(t => t.value === p.type)?.label} •{' '}
                                {p.specialty || '—'}
                              </Typography>
                            </Box>
                            <Chip
                              label={`${p.enrolledCount || 0}/${p.maxTrainees} متدرب`}
                              size="small"
                            />
                          </Stack>
                        </Box>
                      ))
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      المتدربون النشطون
                    </Typography>
                    <Button size="small" onClick={() => setTab(2)}>
                      عرض الكل
                    </Button>
                  </Box>
                  {trainees.filter(t => t.status === 'active').length === 0 ? (
                    <Typography color="text.secondary" align="center" sx={{ py: 3 }}>
                      لا يوجد متدربون نشطون
                    </Typography>
                  ) : (
                    trainees
                      .filter(t => t.status === 'active')
                      .slice(0, 4)
                      .map((t, i) => (
                        <Box key={t._id}>
                          {i > 0 && <Divider sx={{ my: 1 }} />}
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar
                                sx={{
                                  width: 28,
                                  height: 28,
                                  bgcolor: '#5c6bc022',
                                  color: '#5c6bc0',
                                  fontSize: 12,
                                }}
                              >
                                {(t.name || '?')[0]}
                              </Avatar>
                              <Box>
                                <Typography variant="body2">{t.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {t.university || '—'}
                                </Typography>
                              </Box>
                            </Box>
                            <Typography variant="caption" color="text.secondary">
                              {t.totalHoursLogged || 0} ساعة
                            </Typography>
                          </Stack>
                        </Box>
                      ))
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ── TAB 1: Programs ── */}
      {tab === 1 && (
        <Box>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mb: 2 }}
            flexWrap="wrap"
            useFlexGap
          >
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>الحالة</InputLabel>
              <Select
                value={filterProgramStatus}
                onChange={e => {
                  setFilterProgramStatus(e.target.value);
                  fetchPrograms();
                }}
                label="الحالة"
              >
                <MenuItem value="">الكل</MenuItem>
                {Object.entries(PROGRAM_STATUSES).map(([v, s]) => (
                  <MenuItem key={v} value={v}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenAddProgram}
              sx={{ bgcolor: '#5c6bc0', '&:hover': { bgcolor: '#3949ab' } }}
            >
              برنامج جديد
            </Button>
          </Stack>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>اسم البرنامج</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>التخصص</TableCell>
                  <TableCell>تاريخ البداية</TableCell>
                  <TableCell>تاريخ النهاية</TableCell>
                  <TableCell>المشرف</TableCell>
                  <TableCell>المتدربون</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell align="center">تعديل</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {programs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      لا توجد برامج مسجلة
                    </TableCell>
                  </TableRow>
                ) : (
                  programs.map(p => {
                    const ps = PROGRAM_STATUSES[p.status] || { label: p.status, color: 'default' };
                    return (
                      <TableRow key={p._id} hover>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {p.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {PROGRAM_TYPES.find(t => t.value === p.type)?.label || p.type}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{p.specialty || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{fmtDate(p.startDate)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{fmtDate(p.endDate)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{p.supervisorName || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip label={`${p.enrolledCount || 0}/${p.maxTrainees}`} size="small" />
                        </TableCell>
                        <TableCell>
                          <Chip label={ps.label} color={ps.color} size="small" />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton size="small" onClick={() => handleOpenEditProgram(p)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── TAB 2: Trainees ── */}
      {tab === 2 && (
        <Box>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mb: 2 }}
            flexWrap="wrap"
            useFlexGap
          >
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>حالة المتدرب</InputLabel>
              <Select
                value={filterTraineeStatus}
                onChange={e => {
                  setFilterTraineeStatus(e.target.value);
                  fetchTrainees();
                }}
                label="حالة المتدرب"
              >
                <MenuItem value="">الكل</MenuItem>
                {Object.entries(TRAINEE_STATUSES).map(([v, s]) => (
                  <MenuItem key={v} value={v}>
                    {s.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }} />
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setFormError('');
                setEnrollDialog(true);
              }}
              sx={{ bgcolor: '#0288d1', '&:hover': { bgcolor: '#01579b' } }}
            >
              تسجيل متدرب
            </Button>
          </Stack>
          <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: 'grey.50' }}>
                  <TableCell>الاسم</TableCell>
                  <TableCell>الجامعة</TableCell>
                  <TableCell>التخصص</TableCell>
                  <TableCell>البرنامج</TableCell>
                  <TableCell>تاريخ البداية</TableCell>
                  <TableCell>الساعات</TableCell>
                  <TableCell>الحالة</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {trainees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      لا يوجد متدربون مسجلون
                    </TableCell>
                  </TableRow>
                ) : (
                  trainees.map(t => {
                    const ts = TRAINEE_STATUSES[t.status] || { label: t.status, color: 'default' };
                    return (
                      <TableRow key={t._id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Avatar
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: '#5c6bc022',
                                color: '#5c6bc0',
                                fontSize: 12,
                              }}
                            >
                              {(t.name || '?')[0]}
                            </Avatar>
                            <Typography variant="body2">{t.name}</Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{t.university || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{t.specialty || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {t.programId?.name || t.programId || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{fmtDate(t.startDate)}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={`${t.totalHoursLogged || 0} ساعة`}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell>
                          <Chip label={ts.label} color={ts.color} size="small" />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ── TAB 3: Evaluations & Hours ── */}
      {tab === 3 && (
        <Box>
          <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
            <Button
              variant="contained"
              startIcon={<HoursIcon />}
              onClick={() => {
                setFormError('');
                setHoursDialog(true);
              }}
              sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#e65100' } }}
            >
              تسجيل ساعات
            </Button>
            <Button
              variant="contained"
              startIcon={<EvalIcon />}
              onClick={() => {
                setFormError('');
                setEvalDialog(true);
              }}
              sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#2e7d32' } }}
            >
              إضافة تقييم
            </Button>
          </Stack>
          <Card sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
                المتدربون — ملخص الساعات والتقييمات
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'grey.50' }}>
                      <TableCell>المتدرب</TableCell>
                      <TableCell>إجمالي الساعات</TableCell>
                      <TableCell>عدد التقييمات</TableCell>
                      <TableCell>آخر تقييم</TableCell>
                      <TableCell>الحالة</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {trainees.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          align="center"
                          sx={{ py: 4, color: 'text.secondary' }}
                        >
                          سجّل المتدربين أولاً من تبويب المتدربون
                        </TableCell>
                      </TableRow>
                    ) : (
                      trainees.map(t => {
                        const ts = TRAINEE_STATUSES[t.status] || {
                          label: t.status,
                          color: 'default',
                        };
                        return (
                          <TableRow key={t._id} hover>
                            <TableCell>{t.name}</TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium" color="primary">
                                {t.totalHoursLogged || 0} ساعة
                              </Typography>
                            </TableCell>
                            <TableCell>{t.evaluations?.length || 0}</TableCell>
                            <TableCell>
                              {t.evaluations?.length ? (
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                  <Rating
                                    value={t.evaluations.at(-1)?.overallRating || 0}
                                    readOnly
                                    size="small"
                                    max={5}
                                  />
                                </Stack>
                              ) : (
                                '—'
                              )}
                            </TableCell>
                            <TableCell>
                              <Chip label={ts.label} color={ts.color} size="small" />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* ── Add/Edit Program Dialog ── */}
      <Dialog open={programDialog} onClose={() => setProgramDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight="bold">
              {editingProgram ? 'تعديل برنامج التدريب' : 'إنشاء برنامج تدريب جديد'}
            </Typography>
            <IconButton onClick={() => setProgramDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                size="small"
                label="اسم البرنامج *"
                value={programForm.name}
                onChange={setProgField('name')}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>النوع</InputLabel>
                <Select value={programForm.type} onChange={setProgField('type')} label="النوع">
                  {PROGRAM_TYPES.map(t => (
                    <MenuItem key={t.value} value={t.value}>
                      {t.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>التخصص</InputLabel>
                <Select
                  value={programForm.specialty}
                  onChange={setProgField('specialty')}
                  label="التخصص"
                >
                  {SPECIALTIES.map(s => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="أقصى عدد متدربين"
                value={programForm.maxTrainees}
                onChange={setProgField('maxTrainees')}
                inputProps={{ min: 1, max: 50 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="تاريخ البداية *"
                value={programForm.startDate}
                onChange={setProgField('startDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="تاريخ النهاية"
                value={programForm.endDate}
                onChange={setProgField('endDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="اسم المشرف"
                value={programForm.supervisorName}
                onChange={setProgField('supervisorName')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                type="email"
                label="بريد المشرف"
                value={programForm.supervisorEmail}
                onChange={setProgField('supervisorEmail')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="وصف البرنامج"
                value={programForm.description}
                onChange={setProgField('description')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="أهداف البرنامج"
                value={programForm.objectives}
                onChange={setProgField('objectives')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProgramDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleSaveProgram}
            disabled={saving}
            sx={{ bgcolor: '#5c6bc0', '&:hover': { bgcolor: '#3949ab' } }}
          >
            {saving ? (
              <CircularProgress size={20} />
            ) : editingProgram ? (
              'حفظ التعديلات'
            ) : (
              'إنشاء البرنامج'
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Enroll Trainee Dialog ── */}
      <Dialog open={enrollDialog} onClose={() => setEnrollDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight="bold">تسجيل متدرب في برنامج</Typography>
            <IconButton onClick={() => setEnrollDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>البرنامج *</InputLabel>
                <Select
                  value={enrollForm.programId}
                  onChange={setEnrField('programId')}
                  label="البرنامج *"
                >
                  {programs
                    .filter(p => p.status === 'active' || p.status === 'upcoming')
                    .map(p => (
                      <MenuItem key={p._id} value={p._id}>
                        {p.name}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={7}>
              <TextField
                fullWidth
                size="small"
                label="اسم المتدرب *"
                value={enrollForm.name}
                onChange={setEnrField('name')}
              />
            </Grid>
            <Grid item xs={12} md={5}>
              <TextField
                fullWidth
                size="small"
                label="رقم الطالب"
                value={enrollForm.studentId}
                onChange={setEnrField('studentId')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="الجامعة / المعهد"
                value={enrollForm.university}
                onChange={setEnrField('university')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>التخصص</InputLabel>
                <Select
                  value={enrollForm.specialty}
                  onChange={setEnrField('specialty')}
                  label="التخصص"
                >
                  {SPECIALTIES.map(s => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                label="الهاتف"
                value={enrollForm.phone}
                onChange={setEnrField('phone')}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="تاريخ بداية التدريب"
                value={enrollForm.startDate}
                onChange={setEnrField('startDate')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnrollDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleEnroll}
            disabled={saving}
            sx={{ bgcolor: '#0288d1', '&:hover': { bgcolor: '#01579b' } }}
          >
            {saving ? <CircularProgress size={20} /> : 'تسجيل'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Log Hours Dialog ── */}
      <Dialog open={hoursDialog} onClose={() => setHoursDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight="bold">تسجيل ساعات تدريب</Typography>
            <IconButton onClick={() => setHoursDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>المتدرب *</InputLabel>
                <Select
                  value={hoursForm.traineeId}
                  onChange={e => setHoursForm(f => ({ ...f, traineeId: e.target.value }))}
                  label="المتدرب *"
                >
                  {trainees.map(t => (
                    <MenuItem key={t._id} value={t._id}>
                      {t.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label="التاريخ"
                value={hoursForm.date}
                onChange={setHoursField('date')}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label="عدد الساعات"
                value={hoursForm.hours}
                onChange={setHoursField('hours')}
                inputProps={{ min: 0.5, max: 12, step: 0.5 }}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع الساعات</InputLabel>
                <Select value={hoursForm.type} onChange={setHoursField('type')} label="نوع الساعات">
                  <MenuItem value="direct">مباشر مع المستفيد</MenuItem>
                  <MenuItem value="indirect">غير مباشر (توثيق/اجتماعات)</MenuItem>
                  <MenuItem value="supervision">إشراف</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label="ملاحظات"
                value={hoursForm.notes}
                onChange={setHoursField('notes')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHoursDialog(false)}>إلغاء</Button>
          <Button
            variant="contained"
            onClick={handleLogHours}
            disabled={saving}
            sx={{ bgcolor: '#ff9800', '&:hover': { bgcolor: '#e65100' } }}
          >
            {saving ? <CircularProgress size={20} /> : 'تسجيل'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Add Evaluation Dialog ── */}
      <Dialog open={evalDialog} onClose={() => setEvalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography fontWeight="bold">إضافة تقييم متدرب</Typography>
            <IconButton onClick={() => setEvalDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <FormControl fullWidth size="small">
                <InputLabel>المتدرب *</InputLabel>
                <Select
                  value={evalForm.traineeId}
                  onChange={e => setEvalForm(f => ({ ...f, traineeId: e.target.value }))}
                  label="المتدرب *"
                >
                  {trainees.map(t => (
                    <MenuItem key={t._id} value={t._id}>
                      {t.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={5}>
              <FormControl fullWidth size="small">
                <InputLabel>نوع التقييم</InputLabel>
                <Select value={evalForm.type} onChange={setEvalField('type')} label="نوع التقييم">
                  <MenuItem value="midterm">منتصف الفترة</MenuItem>
                  <MenuItem value="final">نهائي</MenuItem>
                  <MenuItem value="formative">تكويني</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            {EVAL_CRITERIA.map(({ key, label }) => (
              <Grid item xs={12} md={6} key={key}>
                <Typography variant="caption" color="text.secondary">
                  {label}
                </Typography>
                <Rating
                  value={Number(evalForm[key])}
                  onChange={(_, v) => setEvalForm(f => ({ ...f, [key]: v }))}
                  max={5}
                />
              </Grid>
            ))}
            <Grid item xs={12}>
              <Typography variant="caption" color="text.secondary">
                التقييم الكلي
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Rating
                  value={Number(evalForm.overallRating)}
                  onChange={(_, v) => setEvalForm(f => ({ ...f, overallRating: v }))}
                  max={5}
                  size="large"
                />
              </Stack>
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="ملاحظات وتغذية راجعة"
                value={evalForm.comments}
                onChange={setEvalField('comments')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                label="توصيات للمتدرب"
                value={evalForm.recommendations}
                onChange={setEvalField('recommendations')}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEvalDialog(false)}>إلغاء</Button>
          <Button variant="contained" color="success" onClick={handleAddEval} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : 'حفظ التقييم'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
