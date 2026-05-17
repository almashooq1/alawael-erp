/**
 * RehabProgramsPage — إدارة البرامج التأهيلية
 *
 * Tabs:
 *  0 — لوحة المتابعة    → getDashboard
 *  1 — البرامج          → list + create + update
 *  2 — التسجيل والتقدم → getEnrollments + enroll + updateProgress
 *  3 — التوصيات         → getRecommendations(beneficiaryId)
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Button,
  IconButton,
  Stack,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Snackbar,
  Tooltip,
  InputAdornment,
  Slider,
  Divider,
} from '@mui/material';
import {
  FitnessCenter as ProgramIcon,
  PersonAdd as EnrollIcon,
  Recommend as RecommendIcon,
  BarChart as ChartIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  TrendingUp as ProgressIcon,
  People as GroupIcon,
  AccessTime as DurationIcon,
  EmojiEvents as GoalIcon,
  ShowChart as TrackerIcon,
} from '@mui/icons-material';
import { programsAPI } from '../../services/ddd';
import { formatDate as _fmtDate } from 'utils/dateUtils';
import RehabProgressTracker from '../rehab/RehabProgressTracker';

/* ── palette ───────────────────────────────────────────── */
const PRIMARY = '#1b5e20';
const BG = '#f1f8e9';

/* ── helpers ───────────────────────────────────────────── */
const fmt = d => (d ? _fmtDate(d) : '—');

const difficultyLabel = d =>
  ({ beginner: 'مبتدئ', intermediate: 'متوسط', advanced: 'متقدم' })[d] || d || '—';
const difficultyColor = d =>
  ({ beginner: 'success', intermediate: 'warning', advanced: 'error' })[d] || 'default';

const statusLabel = s =>
  ({
    active: 'نشط',
    draft: 'مسودة',
    archived: 'مؤرشف',
    completed: 'مكتمل',
  })[s] ||
  s ||
  '—';
const statusColor = s =>
  ({
    active: 'success',
    draft: 'default',
    archived: 'secondary',
    completed: 'primary',
  })[s] || 'default';

const enrollStatusLabel = s =>
  ({
    active: 'نشط',
    completed: 'مكتمل',
    withdrawn: 'منسحب',
    suspended: 'موقوف',
  })[s] ||
  s ||
  '—';
const enrollStatusColor = s =>
  ({
    active: 'success',
    completed: 'primary',
    withdrawn: 'default',
    suspended: 'warning',
  })[s] || 'default';

/* ── KPI ───────────────────────────────────────────────── */
function KpiCard({ label, value, icon, color, sub }) {
  return (
    <Card variant="outlined" sx={{ borderRight: `4px solid ${color}`, height: '100%' }}>
      <CardContent
        sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1.5, '&:last-child': { pb: 1.5 } }}
      >
        <Avatar sx={{ bgcolor: `${color}18`, color, width: 48, height: 48 }}>{icon}</Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ color }}>
            {value ?? '—'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          {sub && (
            <Typography variant="caption" color="text.disabled">
              {sub}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

/* ══════════════════════════════════════════════════════ */
export default function RehabProgramsPage() {
  const [tab, setTab] = useState(0);

  /* ── dashboard ── */
  const [dashboard, setDashboard] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);

  /* ── programs list ── */
  const [programs, setPrograms] = useState([]);
  const [progSearch, setProgSearch] = useState('');
  const [progLoading, setProgLoading] = useState(false);
  const [progError, setProgError] = useState(null);

  /* ── enrollments ── */
  const [enrollProgramId, setEnrollProgramId] = useState('');
  const [enrollments, setEnrollments] = useState([]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollError, setEnrollError] = useState(null);

  /* ── recommendations ── */
  const [recBenId, setRecBenId] = useState('');
  const [recommendations, setRecommendations] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [recError, setRecError] = useState(null);

  /* ── create/edit dialog ── */
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: '',
    duration: '',
    difficulty: 'beginner',
    maxEnrollment: '',
    goals: '',
    category: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  /* ── enroll dialog ── */
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ beneficiaryId: '', startDate: '', notes: '' });
  const [enrollSubmitLoading, setEnrollSubmitLoading] = useState(false);

  /* ── progress dialog ── */
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressTarget, setProgressTarget] = useState(null);
  const [progressPct, setProgressPct] = useState(0);
  const [progressNotes, setProgressNotes] = useState('');
  const [progressLoading, setProgressLoading] = useState(false);

  /* ── snackbar ── */
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const toast = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  /* ── loaders ── */
  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    setDashError(null);
    try {
      const res = await programsAPI.getDashboard({});
      setDashboard(res?.data?.data || res?.data || null);
    } catch (e) {
      setDashError(e.message);
    } finally {
      setDashLoading(false);
    }
  }, []);

  const loadPrograms = useCallback(async () => {
    setProgLoading(true);
    setProgError(null);
    try {
      const res = await programsAPI.list({ search: progSearch, limit: 50 });
      const data = res?.data?.data || res?.data;
      setPrograms(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      setProgError(e.message);
    } finally {
      setProgLoading(false);
    }
  }, [progSearch]);

  const loadEnrollments = useCallback(async () => {
    if (!enrollProgramId) return;
    setEnrollLoading(true);
    setEnrollError(null);
    try {
      const res = await programsAPI.getEnrollments(enrollProgramId);
      const data = res?.data?.data || res?.data;
      setEnrollments(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      setEnrollError(e.message);
    } finally {
      setEnrollLoading(false);
    }
  }, [enrollProgramId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);
  useEffect(() => {
    if (tab === 1) loadPrograms();
  }, [tab, loadPrograms]);
  useEffect(() => {
    if (tab === 2) loadEnrollments();
  }, [tab, enrollProgramId, loadEnrollments]);

  /* ── create / update ── */
  const openCreate = () => {
    setEditTarget(null);
    setForm({
      name: '',
      description: '',
      type: '',
      duration: '',
      difficulty: 'beginner',
      maxEnrollment: '',
      goals: '',
      category: '',
    });
    setFormOpen(true);
  };

  const openEdit = prog => {
    setEditTarget(prog);
    setForm({
      name: prog.name || '',
      description: prog.description || '',
      type: prog.type || '',
      duration: prog.duration ?? '',
      difficulty: prog.difficulty || 'beginner',
      maxEnrollment: prog.maxEnrollment ?? '',
      goals: Array.isArray(prog.goals) ? prog.goals.join('\n') : prog.goals || '',
      category: prog.category || '',
    });
    setFormOpen(true);
  };

  const handleSubmitForm = async () => {
    setFormLoading(true);
    try {
      const payload = {
        ...form,
        duration: form.duration ? Number(form.duration) : undefined,
        maxEnrollment: form.maxEnrollment ? Number(form.maxEnrollment) : undefined,
        goals: form.goals ? form.goals.split('\n').filter(Boolean) : [],
      };
      if (editTarget) {
        await programsAPI.update(editTarget._id, payload);
        toast('تم تحديث البرنامج بنجاح');
      } else {
        await programsAPI.create(payload);
        toast('تم إنشاء البرنامج بنجاح');
      }
      setFormOpen(false);
      loadPrograms();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setFormLoading(false);
    }
  };

  /* ── enroll ── */
  const handleEnroll = async () => {
    setEnrollSubmitLoading(true);
    try {
      await programsAPI.enroll(enrollProgramId, enrollForm);
      toast('تم تسجيل المستفيد في البرنامج');
      setEnrollOpen(false);
      setEnrollForm({ beneficiaryId: '', startDate: '', notes: '' });
      loadEnrollments();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setEnrollSubmitLoading(false);
    }
  };

  /* ── update progress ── */
  const handleUpdateProgress = async () => {
    setProgressLoading(true);
    try {
      await programsAPI.updateProgress(progressTarget._id, {
        progressPercentage: progressPct,
        notes: progressNotes,
        date: new Date().toISOString(),
      });
      toast('تم تحديث نسبة التقدم');
      setProgressOpen(false);
      setProgressNotes('');
      loadEnrollments();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setProgressLoading(false);
    }
  };

  /* ── recommendations ── */
  const loadRecommendations = async () => {
    if (!recBenId) return;
    setRecLoading(true);
    setRecError(null);
    try {
      const res = await programsAPI.getRecommendations(recBenId);
      const data = res?.data?.data || res?.data;
      setRecommendations(Array.isArray(data) ? data : data?.programs || []);
    } catch (e) {
      setRecError(e.message);
      setRecommendations([]);
    } finally {
      setRecLoading(false);
    }
  };

  const kpis = [
    {
      label: 'إجمالي البرامج',
      value: dashboard?.totalPrograms ?? 0,
      icon: <ProgramIcon />,
      color: PRIMARY,
    },
    {
      label: 'البرامج النشطة',
      value: dashboard?.activePrograms ?? 0,
      icon: <GoalIcon />,
      color: '#2e7d32',
    },
    {
      label: 'إجمالي المسجلين',
      value: dashboard?.totalEnrollments ?? 0,
      icon: <GroupIcon />,
      color: '#1565c0',
    },
    {
      label: 'معدل الإكمال',
      value: dashboard?.completionRate != null ? `${dashboard.completionRate}%` : '—',
      icon: <ProgressIcon />,
      color: '#6a1b9a',
    },
  ];

  return (
    <Box sx={{ p: 3, direction: 'rtl', bgcolor: BG, minHeight: '100vh' }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 52, height: 52 }}>
          <ProgramIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" color={PRIMARY}>
            البرامج التأهيلية
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة البرامج التأهيلية والتسجيل وتتبع التقدم
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={loadDashboard}
          sx={{ borderColor: PRIMARY, color: PRIMARY }}
        >
          تحديث
        </Button>
      </Box>

      {/* ── Tabs ── */}
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          mb: 3,
          '& .MuiTab-root': { fontWeight: 600 },
          '& .Mui-selected': { color: PRIMARY },
          '& .MuiTabs-indicator': { bgcolor: PRIMARY },
        }}
      >
        <Tab icon={<ChartIcon />} iconPosition="start" label="لوحة المتابعة" />
        <Tab icon={<ProgramIcon />} iconPosition="start" label="البرامج" />
        <Tab icon={<EnrollIcon />} iconPosition="start" label="التسجيل والتقدم" />
        <Tab icon={<RecommendIcon />} iconPosition="start" label="التوصيات" />
        <Tab icon={<TrackerIcon />} iconPosition="start" label="متابعة التقدم" />
      </Tabs>

      {/* ════════════════════════════════
          TAB 0 — Dashboard
      ════════════════════════════════ */}
      {tab === 0 && (
        <Box>
          {dashLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}
          {dashError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {dashError}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {kpis.map((k, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <KpiCard {...k} />
              </Grid>
            ))}
          </Grid>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    توزيع البرامج حسب الفئة
                  </Typography>
                  {(dashboard?.byCategory || []).length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      لا توجد بيانات
                    </Typography>
                  ) : (
                    (dashboard?.byCategory || []).map((c, i) => {
                      const pct = Math.round((c.count / (dashboard?.totalPrograms || 1)) * 100);
                      return (
                        <Box key={i} sx={{ mb: 1.5 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                            <Typography variant="body2">{c.category || c._id || '—'}</Typography>
                            <Typography variant="body2">
                              {c.count} ({pct}%)
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                              height: 7,
                              borderRadius: 4,
                              '& .MuiLinearProgress-bar': { bgcolor: PRIMARY },
                            }}
                          />
                        </Box>
                      );
                    })
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    مؤشرات البرامج
                  </Typography>
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    {[
                      {
                        label: 'متوسط مدة البرنامج',
                        val: dashboard?.avgDuration ? `${dashboard.avgDuration} أسبوع` : '—',
                      },
                      { label: 'أكثر برنامج تسجيلاً', val: dashboard?.topProgram?.name || '—' },
                      { label: 'التسجيلات هذا الشهر', val: dashboard?.enrollmentsThisMonth ?? '—' },
                      {
                        label: 'معدل الاستمرار',
                        val: dashboard?.retentionRate != null ? `${dashboard.retentionRate}%` : '—',
                      },
                      { label: 'البرامج المؤرشفة', val: dashboard?.archivedPrograms ?? '—' },
                    ].map((r, i) => (
                      <Box
                        key={i}
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          py: 0.5,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                        }}
                      >
                        <Typography variant="body2" color="text.secondary">
                          {r.label}
                        </Typography>
                        <Typography variant="body2" fontWeight="bold" color={PRIMARY}>
                          {r.val}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* ════════════════════════════════
          TAB 1 — Programs
      ════════════════════════════════ */}
      {tab === 1 && (
        <Box>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField
              size="small"
              placeholder="بحث في البرامج..."
              value={progSearch}
              onChange={e => setProgSearch(e.target.value)}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={openCreate}
              sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#1a3c1a' } }}
            >
              برنامج جديد
            </Button>
            <IconButton onClick={loadPrograms} size="small">
              <RefreshIcon />
            </IconButton>
          </Stack>

          {progError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {progError}
            </Alert>
          )}
          {progLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#f1f8e9' }}>
                  <TableCell>اسم البرنامج</TableCell>
                  <TableCell>الفئة</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>المدة</TableCell>
                  <TableCell>الصعوبة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>التسجيلات</TableCell>
                  <TableCell align="center">تعديل</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {programs.length === 0 && !progLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">لا توجد برامج مسجلة</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  programs.map((prog, i) => (
                    <TableRow key={prog._id || i} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="bold">
                          {prog.name || '—'}
                        </Typography>
                        {prog.description && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{ maxWidth: 200, display: 'block' }}
                          >
                            {prog.description}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{prog.category || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{prog.type || '—'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <DurationIcon fontSize="small" color="disabled" />
                          <Typography variant="body2">
                            {prog.duration ? `${prog.duration} أسبوع` : '—'}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={difficultyLabel(prog.difficulty)}
                          color={difficultyColor(prog.difficulty)}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={statusLabel(prog.status)}
                          color={statusColor(prog.status)}
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <GroupIcon fontSize="small" color="disabled" />
                          <Typography variant="body2">
                            {prog.enrollmentCount ?? prog.enrollments?.length ?? 0}
                          </Typography>
                          {prog.maxEnrollment && (
                            <Typography variant="caption" color="text.disabled">
                              / {prog.maxEnrollment}
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="تعديل">
                          <IconButton size="small" onClick={() => openEdit(prog)}>
                            <EditIcon fontSize="small" sx={{ color: PRIMARY }} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* ════════════════════════════════
          TAB 2 — Enrollment & Progress
      ════════════════════════════════ */}
      {tab === 2 && (
        <Box>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField
              select
              size="small"
              label="اختر البرنامج"
              value={enrollProgramId}
              onChange={e => setEnrollProgramId(e.target.value)}
              sx={{ minWidth: 280 }}
            >
              <MenuItem value="">— اختر برنامجاً —</MenuItem>
              {programs.map(p => (
                <MenuItem key={p._id} value={p._id}>
                  {p.name}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="contained"
              size="small"
              disabled={!enrollProgramId}
              startIcon={<EnrollIcon />}
              onClick={() => setEnrollOpen(true)}
              sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#1a3c1a' } }}
            >
              تسجيل مستفيد
            </Button>
            <IconButton onClick={loadEnrollments} size="small">
              <RefreshIcon />
            </IconButton>
          </Stack>

          {enrollError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {enrollError}
            </Alert>
          )}
          {enrollLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          {!enrollProgramId ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <EnrollIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary">اختر برنامجاً لعرض التسجيلات</Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#f1f8e9' }}>
                    <TableCell>المستفيد</TableCell>
                    <TableCell>تاريخ التسجيل</TableCell>
                    <TableCell>الحالة</TableCell>
                    <TableCell>التقدم</TableCell>
                    <TableCell>تاريخ الانتهاء</TableCell>
                    <TableCell align="center">تحديث التقدم</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {enrollments.length === 0 && !enrollLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          لا يوجد مسجلون في هذا البرنامج
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    enrollments.map((enr, i) => {
                      const pct = enr.progressPercentage ?? enr.progress ?? 0;
                      const name =
                        enr.beneficiaryId?.name?.full || enr.beneficiaryName || `مستفيد #${i + 1}`;
                      return (
                        <TableRow key={enr._id || i} hover>
                          <TableCell>
                            <Typography variant="body2">{name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {fmt(enr.startDate || enr.enrolledAt)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={enrollStatusLabel(enr.status)}
                              color={enrollStatusColor(enr.status)}
                            />
                          </TableCell>
                          <TableCell sx={{ minWidth: 140 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LinearProgress
                                variant="determinate"
                                value={pct}
                                sx={{
                                  flexGrow: 1,
                                  height: 8,
                                  borderRadius: 4,
                                  '& .MuiLinearProgress-bar': { bgcolor: PRIMARY },
                                }}
                              />
                              <Typography variant="caption" fontWeight="bold">
                                {pct}%
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {fmt(enr.expectedEndDate || enr.endDate)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Tooltip title="تحديث التقدم">
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setProgressTarget(enr);
                                  setProgressPct(pct);
                                  setProgressNotes('');
                                  setProgressOpen(true);
                                }}
                              >
                                <ProgressIcon fontSize="small" sx={{ color: PRIMARY }} />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* ════════════════════════════════
          TAB 3 — Recommendations
      ════════════════════════════════ */}
      {tab === 3 && (
        <Box>
          <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            <TextField
              size="small"
              label="معرف المستفيد (ID)"
              value={recBenId}
              onChange={e => setRecBenId(e.target.value)}
              sx={{ flexGrow: 1 }}
            />
            <Button
              variant="contained"
              size="small"
              disabled={!recBenId || recLoading}
              onClick={loadRecommendations}
              sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#1a3c1a' } }}
            >
              عرض التوصيات
            </Button>
          </Stack>

          {recError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {recError}
            </Alert>
          )}
          {recLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          {!recBenId && recommendations.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <RecommendIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary" variant="h6">
                أدخل معرف المستفيد لعرض البرامج الموصى بها
              </Typography>
            </Box>
          )}

          {recommendations.length > 0 && (
            <Grid container spacing={2}>
              {recommendations.map((prog, i) => (
                <Grid item xs={12} sm={6} md={4} key={prog._id || i}>
                  <Card
                    variant="outlined"
                    sx={{
                      borderRight: `4px solid ${PRIMARY}`,
                      transition: 'box-shadow .2s',
                      '&:hover': { boxShadow: 3 },
                    }}
                  >
                    <CardContent>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          mb: 1,
                        }}
                      >
                        <Typography variant="subtitle1" fontWeight="bold">
                          {prog.name || '—'}
                        </Typography>
                        <Chip
                          size="small"
                          label={difficultyLabel(prog.difficulty)}
                          color={difficultyColor(prog.difficulty)}
                        />
                      </Box>
                      {prog.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                          {prog.description}
                        </Typography>
                      )}
                      <Divider sx={{ mb: 1 }} />
                      <Stack spacing={0.5}>
                        {prog.category && (
                          <Typography variant="caption" color="text.disabled">
                            الفئة: {prog.category}
                          </Typography>
                        )}
                        {prog.duration && (
                          <Typography variant="caption" color="text.disabled">
                            المدة: {prog.duration} أسبوع
                          </Typography>
                        )}
                        {prog.matchScore != null && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                            <Typography variant="caption" color={PRIMARY} fontWeight="bold">
                              درجة التطابق: {prog.matchScore}%
                            </Typography>
                            <LinearProgress
                              variant="determinate"
                              value={prog.matchScore}
                              sx={{
                                flexGrow: 1,
                                height: 5,
                                borderRadius: 3,
                                '& .MuiLinearProgress-bar': { bgcolor: PRIMARY },
                              }}
                            />
                          </Box>
                        )}
                      </Stack>
                      {prog.matchReason && (
                        <Alert severity="info" sx={{ mt: 1.5, py: 0.5 }}>
                          <Typography variant="caption">{prog.matchReason}</Typography>
                        </Alert>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* ════════════════════════════════
          TAB 4 — Progress Tracker
      ════════════════════════════════ */}
      {tab === 4 && (
        <Box>
          {enrollments.length === 0 ? (
            <Alert severity="info">اختر مستفيدًا مسجلاً من تبويب «التسجيل والتقدم» أولاً.</Alert>
          ) : (
            <RehabProgressTracker
              programData={{
                measures: [],
                goals: enrollments
                  .filter(e => e.status === 'active')
                  .map(e => ({
                    text: e.program?.name || e.programName || 'برنامج تأهيل',
                    progress: e.progressPercentage ?? e.progress ?? 0,
                    target: 100,
                  })),
              }}
              programName={
                enrollments.find(e => e.status === 'active')?.program?.name || 'البرنامج التأهيلي'
              }
            />
          )}
        </Box>
      )}

      {/* ══ Create / Edit Program Dialog ══ */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#f1f8e9', color: PRIMARY }}>
          {editTarget ? 'تعديل البرنامج التأهيلي' : 'إنشاء برنامج تأهيلي جديد'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="اسم البرنامج *"
              fullWidth
              size="small"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />
            <TextField
              label="الوصف"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  label="الفئة"
                  fullWidth
                  size="small"
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="النوع"
                  fullWidth
                  size="small"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                />
              </Grid>
            </Grid>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  label="المدة (أسبوع)"
                  fullWidth
                  size="small"
                  type="number"
                  value={form.duration}
                  onChange={e => setForm(f => ({ ...f, duration: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="الحد الأقصى للتسجيل"
                  fullWidth
                  size="small"
                  type="number"
                  value={form.maxEnrollment}
                  onChange={e => setForm(f => ({ ...f, maxEnrollment: e.target.value }))}
                />
              </Grid>
            </Grid>
            <TextField
              select
              fullWidth
              size="small"
              label="مستوى الصعوبة"
              value={form.difficulty}
              onChange={e => setForm(f => ({ ...f, difficulty: e.target.value }))}
            >
              <MenuItem value="beginner">مبتدئ</MenuItem>
              <MenuItem value="intermediate">متوسط</MenuItem>
              <MenuItem value="advanced">متقدم</MenuItem>
            </TextField>
            <TextField
              label="الأهداف (سطر لكل هدف)"
              fullWidth
              multiline
              rows={3}
              size="small"
              value={form.goals}
              onChange={e => setForm(f => ({ ...f, goals: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!form.name || formLoading}
            onClick={handleSubmitForm}
            sx={{ bgcolor: PRIMARY }}
          >
            {formLoading ? 'جاري...' : editTarget ? 'حفظ التعديلات' : 'إنشاء البرنامج'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ Enroll Dialog ══ */}
      <Dialog open={enrollOpen} onClose={() => setEnrollOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>تسجيل مستفيد في البرنامج</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Stack spacing={2}>
            <TextField
              label="معرف المستفيد *"
              fullWidth
              size="small"
              value={enrollForm.beneficiaryId}
              onChange={e => setEnrollForm(f => ({ ...f, beneficiaryId: e.target.value }))}
            />
            <TextField
              label="تاريخ البدء"
              type="date"
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
              value={enrollForm.startDate}
              onChange={e => setEnrollForm(f => ({ ...f, startDate: e.target.value }))}
            />
            <TextField
              label="ملاحظات"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={enrollForm.notes}
              onChange={e => setEnrollForm(f => ({ ...f, notes: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEnrollOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!enrollForm.beneficiaryId || enrollSubmitLoading}
            onClick={handleEnroll}
            sx={{ bgcolor: PRIMARY }}
          >
            {enrollSubmitLoading ? 'جاري...' : 'تسجيل'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ Progress Dialog ══ */}
      <Dialog open={progressOpen} onClose={() => setProgressOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>تحديث نسبة التقدم</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {progressTarget?.beneficiaryId?.name?.full ||
              progressTarget?.beneficiaryName ||
              'المستفيد'}
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            نسبة التقدم: <strong>{progressPct}%</strong>
          </Typography>
          <Slider
            value={progressPct}
            onChange={(_, v) => setProgressPct(v)}
            min={0}
            max={100}
            step={5}
            marks
            valueLabelDisplay="auto"
            sx={{ color: PRIMARY, mb: 2 }}
          />
          <TextField
            label="ملاحظات التقدم"
            fullWidth
            multiline
            rows={2}
            size="small"
            value={progressNotes}
            onChange={e => setProgressNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setProgressOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={progressLoading}
            onClick={handleUpdateProgress}
            sx={{ bgcolor: PRIMARY }}
          >
            {progressLoading ? 'جاري...' : 'تحديث'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnack(s => ({ ...s, open: false }))}
          severity={snack.severity}
          sx={{ width: '100%' }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
