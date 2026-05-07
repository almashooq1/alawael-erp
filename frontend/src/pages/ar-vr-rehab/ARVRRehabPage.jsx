/**
 * ARVRRehabPage — جلسات التأهيل بالواقع المعزز والافتراضي
 *
 * Tabs:
 *  0 — لوحة المتابعة  → getDashboard
 *  1 — الجلسات        → list + create + start/pause/resume/complete/abort + recordSafety
 *  2 — تتبع التقدم    → getProgress(beneficiaryId)
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
} from '@mui/material';
import {
  ViewInAr as ARIcon,
  VideogameAsset as VRIcon,
  Timeline as TimelineIcon,
  BarChart as ChartIcon,
  Add as AddIcon,
  Refresh as RefreshIcon,
  Search as SearchIcon,
  PlayArrow as StartIcon,
  Pause as PauseIcon,
  PlayCircle as ResumeIcon,
  CheckCircle as CompleteIcon,
  Cancel as AbortIcon,
  Warning as SafetyIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { arVrAPI } from '../../services/ddd';

/* ── constants ─────────────────────────────────────────── */
const PRIMARY = '#1565c0';
const BG = '#f3f7fc';

/* ── helpers ───────────────────────────────────────────── */
const fmt = d => (d ? new Date(d).toLocaleString('ar-SA') : '—');
const fmtDate = d => (d ? new Date(d).toLocaleDateString('ar-SA') : '—');
const minsToStr = m => (m != null ? `${m} دقيقة` : '—');

const sessionTypeLabel = t => {
  const map = {
    vr: 'واقع افتراضي (VR)',
    ar: 'واقع معزز (AR)',
    xr: 'واقع ممتد (XR)',
    hologram: 'هولوجرام',
    bci: 'واجهة دماغ-حاسوب (BCI)',
  };
  return map[t] || t || '—';
};

const statusLabel = s => {
  const map = {
    pending: 'معلقة',
    active: 'نشطة',
    paused: 'موقوفة',
    completed: 'مكتملة',
    aborted: 'ملغاة',
  };
  return map[s] || s || '—';
};

const statusColor = s => {
  const map = {
    pending: 'warning',
    active: 'success',
    paused: 'info',
    completed: 'primary',
    aborted: 'error',
  };
  return map[s] || 'default';
};

/* ── KPI card ──────────────────────────────────────────── */
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
export default function ARVRRehabPage() {
  const [tab, setTab] = useState(0);

  /* ── dashboard ── */
  const [dashboard, setDashboard] = useState(null);
  const [dashLoading, setDashLoading] = useState(true);
  const [dashError, setDashError] = useState(null);

  /* ── sessions ── */
  const [sessions, setSessions] = useState([]);
  const [sessSearch, setSessSearch] = useState('');
  const [sessLoading, setSessLoading] = useState(false);
  const [sessError, setSessError] = useState(null);

  /* ── progress ── */
  const [progBenId, setProgBenId] = useState('');
  const [progress, setProgress] = useState(null);
  const [progLoading, setProgLoading] = useState(false);
  const [progError, setProgError] = useState(null);

  /* ── create dialog ── */
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    beneficiaryId: '',
    sessionType: 'vr',
    duration: '',
    environment: '',
    goals: '',
    difficulty: 'medium',
  });
  const [createLoading, setCreateLoading] = useState(false);

  /* ── complete dialog ── */
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completeSession, setCompleteSession] = useState(null);
  const [completeNotes, setCompleteNotes] = useState('');
  const [completeScore, setCompleteScore] = useState('');
  const [completeLoading, setCompleteLoading] = useState(false);

  /* ── safety dialog ── */
  const [safetyOpen, setSafetyOpen] = useState(false);
  const [safetySession, setSafetySession] = useState(null);
  const [safetyForm, setSafetyForm] = useState({
    type: 'discomfort',
    severity: 'low',
    description: '',
  });
  const [safetyLoading, setSafetyLoading] = useState(false);

  /* ── snackbar ── */
  const [snack, setSnack] = useState({ open: false, msg: '', severity: 'success' });
  const toast = (msg, severity = 'success') => setSnack({ open: true, msg, severity });

  /* ── loaders ── */
  const loadDashboard = useCallback(async () => {
    setDashLoading(true);
    setDashError(null);
    try {
      const res = await arVrAPI.getDashboard({});
      setDashboard(res?.data?.data || res?.data || null);
    } catch (e) {
      setDashError(e.message);
    } finally {
      setDashLoading(false);
    }
  }, []);

  const loadSessions = useCallback(async () => {
    setSessLoading(true);
    setSessError(null);
    try {
      const res = await arVrAPI.list({ search: sessSearch, limit: 50 });
      const data = res?.data?.data || res?.data;
      setSessions(Array.isArray(data) ? data : data?.items || []);
    } catch (e) {
      setSessError(e.message);
    } finally {
      setSessLoading(false);
    }
  }, [sessSearch]);

  const loadProgress = useCallback(async () => {
    if (!progBenId) return;
    setProgLoading(true);
    setProgError(null);
    try {
      const res = await arVrAPI.getProgress(progBenId, {});
      setProgress(res?.data?.data || res?.data || null);
    } catch (e) {
      setProgError(e.message);
      setProgress(null);
    } finally {
      setProgLoading(false);
    }
  }, [progBenId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);
  useEffect(() => {
    if (tab === 1) loadSessions();
  }, [tab, loadSessions]);

  /* ── session action handler ── */
  const doAction = async (id, action, _data = undefined) => {
    try {
      if (action === 'start') await arVrAPI.start(id);
      else if (action === 'pause') await arVrAPI.pause(id);
      else if (action === 'resume') await arVrAPI.resume(id);
      else if (action === 'abort') await arVrAPI.abort(id, { reason: 'إلغاء يدوي' });
      toast(`تم تنفيذ الإجراء بنجاح`);
      loadSessions();
    } catch (e) {
      toast(e.message, 'error');
    }
  };

  /* ── create ── */
  const handleCreate = async () => {
    setCreateLoading(true);
    try {
      await arVrAPI.create({
        ...createForm,
        duration: createForm.duration ? Number(createForm.duration) : undefined,
        goals: createForm.goals ? createForm.goals.split('\n').filter(Boolean) : [],
      });
      toast('تم إنشاء الجلسة بنجاح');
      setCreateOpen(false);
      setCreateForm({
        beneficiaryId: '',
        sessionType: 'vr',
        duration: '',
        environment: '',
        goals: '',
        difficulty: 'medium',
      });
      loadSessions();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setCreateLoading(false);
    }
  };

  /* ── complete ── */
  const handleComplete = async () => {
    setCompleteLoading(true);
    try {
      await arVrAPI.complete(completeSession._id, {
        notes: completeNotes,
        performanceScore: completeScore ? Number(completeScore) : undefined,
      });
      toast('تم اكتمال الجلسة بنجاح');
      setCompleteOpen(false);
      setCompleteNotes('');
      setCompleteScore('');
      loadSessions();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setCompleteLoading(false);
    }
  };

  /* ── record safety ── */
  const handleSafety = async () => {
    setSafetyLoading(true);
    try {
      await arVrAPI.recordSafety(safetySession._id, safetyForm);
      toast('تم توثيق الحادثة الأمنية');
      setSafetyOpen(false);
      setSafetyForm({ type: 'discomfort', severity: 'low', description: '' });
      loadSessions();
    } catch (e) {
      toast(e.message, 'error');
    } finally {
      setSafetyLoading(false);
    }
  };

  const kpis = [
    {
      label: 'إجمالي الجلسات',
      value: dashboard?.totalSessions ?? 0,
      icon: <ARIcon />,
      color: PRIMARY,
    },
    {
      label: 'الجلسات النشطة',
      value: dashboard?.activeSessions ?? 0,
      icon: <VRIcon />,
      color: '#2e7d32',
    },
    {
      label: 'المكتملة',
      value: dashboard?.completedSessions ?? 0,
      icon: <CompleteIcon />,
      color: '#00695c',
    },
    {
      label: 'المستفيدون',
      value: dashboard?.totalBeneficiaries ?? 0,
      icon: <PersonIcon />,
      color: '#6a1b9a',
    },
  ];

  const typeColors = {
    vr: '#1565c0',
    ar: '#00695c',
    xr: '#6a1b9a',
    hologram: '#e65100',
    bci: '#c62828',
  };

  return (
    <Box sx={{ p: 3, direction: 'rtl', bgcolor: BG, minHeight: '100vh' }}>
      {/* ── Header ── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Avatar sx={{ bgcolor: PRIMARY, width: 52, height: 52 }}>
          <ARIcon sx={{ fontSize: 28 }} />
        </Avatar>
        <Box>
          <Typography variant="h5" fontWeight="bold" color={PRIMARY}>
            التأهيل بالواقع المعزز والافتراضي
          </Typography>
          <Typography variant="body2" color="text.secondary">
            إدارة جلسات AR/VR/XR والهولوجرام وواجهة الدماغ-حاسوب
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
        <Tab icon={<VRIcon />} iconPosition="start" label="الجلسات" />
        <Tab icon={<TimelineIcon />} iconPosition="start" label="تتبع التقدم" />
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
            {/* Session type distribution */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    توزيع أنواع الجلسات
                  </Typography>
                  {['vr', 'ar', 'xr', 'hologram', 'bci'].map(type => {
                    const count = dashboard?.byType?.[type] ?? 0;
                    const total = dashboard?.totalSessions || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <Box key={type} sx={{ mb: 1.5 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Chip
                            size="small"
                            label={sessionTypeLabel(type)}
                            sx={{
                              bgcolor: `${typeColors[type]}18`,
                              color: typeColors[type],
                              fontWeight: 600,
                            }}
                          />
                          <Typography variant="body2">
                            {count} جلسة ({pct}%)
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={pct}
                          sx={{
                            height: 7,
                            borderRadius: 4,
                            '& .MuiLinearProgress-bar': { bgcolor: typeColors[type] },
                          }}
                        />
                      </Box>
                    );
                  })}
                </CardContent>
              </Card>
            </Grid>

            {/* Stats summary */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    مؤشرات الأداء
                  </Typography>
                  <Stack spacing={1.5} sx={{ mt: 1 }}>
                    {[
                      { label: 'متوسط مدة الجلسة', val: minsToStr(dashboard?.avgDuration) },
                      {
                        label: 'معدل الإكمال',
                        val:
                          dashboard?.completionRate != null ? `${dashboard.completionRate}%` : '—',
                      },
                      {
                        label: 'حوادث السلامة (هذا الشهر)',
                        val: dashboard?.safetyIncidents ?? '—',
                      },
                      {
                        label: 'متوسط نقاط الأداء',
                        val:
                          dashboard?.avgPerformanceScore != null
                            ? `${dashboard.avgPerformanceScore}/100`
                            : '—',
                      },
                      { label: 'الجلسات الموقوفة', val: dashboard?.pausedSessions ?? '—' },
                      { label: 'الجلسات الملغاة', val: dashboard?.abortedSessions ?? '—' },
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
          TAB 1 — Sessions
      ════════════════════════════════ */}
      {tab === 1 && (
        <Box>
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <TextField
              size="small"
              placeholder="بحث في الجلسات..."
              value={sessSearch}
              onChange={e => setSessSearch(e.target.value)}
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
              onClick={() => setCreateOpen(true)}
              sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#0d47a1' } }}
            >
              جلسة جديدة
            </Button>
            <IconButton onClick={loadSessions} size="small">
              <RefreshIcon />
            </IconButton>
          </Stack>

          {sessError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {sessError}
            </Alert>
          )}
          {sessLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                  <TableCell>المستفيد</TableCell>
                  <TableCell>النوع</TableCell>
                  <TableCell>البيئة</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>المدة (دقيقة)</TableCell>
                  <TableCell>وقت البدء</TableCell>
                  <TableCell align="center">إجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sessions.length === 0 && !sessLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">لا توجد جلسات مسجلة</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((sess, i) => {
                    const benName =
                      sess.beneficiaryId?.name?.full || sess.beneficiaryName || `مستفيد #${i + 1}`;
                    const status = sess.status;
                    return (
                      <TableRow key={sess._id || i} hover>
                        <TableCell>
                          <Typography variant="body2">{benName}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={sessionTypeLabel(sess.sessionType || sess.type)}
                            sx={{
                              bgcolor: `${typeColors[sess.sessionType || sess.type] || '#1565c0'}18`,
                              color: typeColors[sess.sessionType || sess.type] || '#1565c0',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">{sess.environment || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={statusLabel(status)}
                            color={statusColor(status)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {sess.duration ?? sess.plannedDuration ?? '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {fmt(sess.startedAt || sess.startTime)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} justifyContent="center">
                            {status === 'pending' && (
                              <Tooltip title="بدء الجلسة">
                                <IconButton
                                  size="small"
                                  onClick={() => doAction(sess._id, 'start')}
                                >
                                  <StartIcon fontSize="small" color="success" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {status === 'active' && (
                              <>
                                <Tooltip title="إيقاف مؤقت">
                                  <IconButton
                                    size="small"
                                    onClick={() => doAction(sess._id, 'pause')}
                                  >
                                    <PauseIcon fontSize="small" color="info" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="اكتمال الجلسة">
                                  <IconButton
                                    size="small"
                                    onClick={() => {
                                      setCompleteSession(sess);
                                      setCompleteOpen(true);
                                    }}
                                  >
                                    <CompleteIcon fontSize="small" color="primary" />
                                  </IconButton>
                                </Tooltip>
                              </>
                            )}
                            {status === 'paused' && (
                              <Tooltip title="استئناف">
                                <IconButton
                                  size="small"
                                  onClick={() => doAction(sess._id, 'resume')}
                                >
                                  <ResumeIcon fontSize="small" color="success" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {(status === 'active' || status === 'paused') && (
                              <Tooltip title="إلغاء الجلسة">
                                <IconButton
                                  size="small"
                                  onClick={() => doAction(sess._id, 'abort')}
                                >
                                  <AbortIcon fontSize="small" color="error" />
                                </IconButton>
                              </Tooltip>
                            )}
                            {status !== 'completed' && status !== 'aborted' && (
                              <Tooltip title="توثيق حادثة أمان">
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    setSafetySession(sess);
                                    setSafetyOpen(true);
                                  }}
                                >
                                  <SafetyIcon fontSize="small" sx={{ color: '#e65100' }} />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
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

      {/* ════════════════════════════════
          TAB 2 — Progress Tracking
      ════════════════════════════════ */}
      {tab === 2 && (
        <Box>
          <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
            <TextField
              size="small"
              label="معرف المستفيد (ID)"
              value={progBenId}
              onChange={e => setProgBenId(e.target.value)}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="contained"
              size="small"
              disabled={!progBenId || progLoading}
              onClick={loadProgress}
              sx={{ bgcolor: PRIMARY, '&:hover': { bgcolor: '#0d47a1' } }}
            >
              عرض التقدم
            </Button>
          </Stack>

          {progError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {progError}
            </Alert>
          )}
          {progLoading && <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />}

          {!progBenId && !progress && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <TimelineIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography color="text.secondary" variant="h6">
                أدخل معرف المستفيد لعرض تقدمه في جلسات AR/VR
              </Typography>
            </Box>
          )}

          {progress && (
            <Grid container spacing={2}>
              {/* Summary cards */}
              <Grid item xs={12}>
                <Grid container spacing={2}>
                  {[
                    { label: 'إجمالي الجلسات', val: progress.totalSessions ?? 0, color: PRIMARY },
                    { label: 'المكتملة', val: progress.completedSessions ?? 0, color: '#2e7d32' },
                    {
                      label: 'إجمالي وقت التدريب',
                      val: progress.totalDuration ? `${progress.totalDuration} دقيقة` : '—',
                      color: '#00695c',
                    },
                    {
                      label: 'متوسط نقاط الأداء',
                      val: progress.avgScore != null ? `${progress.avgScore}/100` : '—',
                      color: '#6a1b9a',
                    },
                  ].map((c, i) => (
                    <Grid item xs={6} md={3} key={i}>
                      <Card variant="outlined" sx={{ borderRight: `4px solid ${c.color}` }}>
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Typography variant="h5" fontWeight="bold" color={c.color}>
                            {c.val}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {c.label}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>

              {/* Sessions history */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                      سجل الجلسات
                    </Typography>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={{ bgcolor: '#e3f2fd' }}>
                            <TableCell>التاريخ</TableCell>
                            <TableCell>النوع</TableCell>
                            <TableCell>المدة</TableCell>
                            <TableCell>نقاط الأداء</TableCell>
                            <TableCell>الحالة</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {(progress.sessions || []).length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                                <Typography color="text.secondary">لا يوجد سجل جلسات</Typography>
                              </TableCell>
                            </TableRow>
                          ) : (
                            (progress.sessions || []).map((s, i) => (
                              <TableRow key={s._id || i} hover>
                                <TableCell>
                                  <Typography variant="caption">
                                    {fmtDate(s.startedAt || s.date)}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={sessionTypeLabel(s.sessionType || s.type)}
                                    variant="outlined"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2">{s.duration ?? '—'} د</Typography>
                                </TableCell>
                                <TableCell>
                                  {s.performanceScore != null ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <LinearProgress
                                        variant="determinate"
                                        value={s.performanceScore}
                                        sx={{ width: 60, height: 6, borderRadius: 3 }}
                                      />
                                      <Typography variant="caption">
                                        {s.performanceScore}
                                      </Typography>
                                    </Box>
                                  ) : (
                                    '—'
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Chip
                                    size="small"
                                    label={statusLabel(s.status)}
                                    color={statusColor(s.status)}
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
              </Grid>

              {/* Progress notes */}
              {progress.progressNotes && (
                <Grid item xs={12}>
                  <Card variant="outlined" sx={{ borderRight: `4px solid ${PRIMARY}` }}>
                    <CardContent>
                      <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                        ملاحظات التقدم
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {progress.progressNotes}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          )}
        </Box>
      )}

      {/* ══ Create Session Dialog ══ */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#e3f2fd', color: PRIMARY }}>
          إنشاء جلسة AR/VR جديدة
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Stack spacing={2}>
            <TextField
              label="معرف المستفيد *"
              fullWidth
              size="small"
              value={createForm.beneficiaryId}
              onChange={e => setCreateForm(f => ({ ...f, beneficiaryId: e.target.value }))}
            />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="نوع الجلسة"
                  value={createForm.sessionType}
                  onChange={e => setCreateForm(f => ({ ...f, sessionType: e.target.value }))}
                >
                  {['vr', 'ar', 'xr', 'hologram', 'bci'].map(t => (
                    <MenuItem key={t} value={t}>
                      {sessionTypeLabel(t)}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={6}>
                <TextField
                  select
                  fullWidth
                  size="small"
                  label="مستوى الصعوبة"
                  value={createForm.difficulty}
                  onChange={e => setCreateForm(f => ({ ...f, difficulty: e.target.value }))}
                >
                  {['easy', 'medium', 'hard'].map(d => (
                    <MenuItem key={d} value={d}>
                      {d === 'easy' ? 'سهل' : d === 'medium' ? 'متوسط' : 'صعب'}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
            </Grid>
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <TextField
                  label="المدة المخططة (دقيقة)"
                  fullWidth
                  size="small"
                  type="number"
                  value={createForm.duration}
                  onChange={e => setCreateForm(f => ({ ...f, duration: e.target.value }))}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="البيئة الافتراضية"
                  fullWidth
                  size="small"
                  value={createForm.environment}
                  onChange={e => setCreateForm(f => ({ ...f, environment: e.target.value }))}
                />
              </Grid>
            </Grid>
            <TextField
              label="الأهداف العلاجية (سطر لكل هدف)"
              fullWidth
              multiline
              rows={3}
              size="small"
              value={createForm.goals}
              onChange={e => setCreateForm(f => ({ ...f, goals: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={!createForm.beneficiaryId || createLoading}
            onClick={handleCreate}
            sx={{ bgcolor: PRIMARY }}
          >
            {createLoading ? 'جاري...' : 'إنشاء الجلسة'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ Complete Session Dialog ══ */}
      <Dialog open={completeOpen} onClose={() => setCompleteOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>إكمال الجلسة</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Stack spacing={2}>
            <TextField
              label="نقاط الأداء (0-100)"
              fullWidth
              size="small"
              type="number"
              inputProps={{ min: 0, max: 100 }}
              value={completeScore}
              onChange={e => setCompleteScore(e.target.value)}
            />
            <TextField
              label="ملاحظات ختامية"
              fullWidth
              multiline
              rows={3}
              size="small"
              value={completeNotes}
              onChange={e => setCompleteNotes(e.target.value)}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompleteOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={completeLoading}
            onClick={handleComplete}
            sx={{ bgcolor: '#2e7d32' }}
          >
            {completeLoading ? 'جاري...' : 'تأكيد الاكتمال'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ══ Safety Incident Dialog ══ */}
      <Dialog open={safetyOpen} onClose={() => setSafetyOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ bgcolor: '#fff3e0', color: '#e65100' }}>توثيق حادثة أمان</DialogTitle>
        <DialogContent sx={{ mt: 1 }}>
          <Stack spacing={2}>
            <TextField
              select
              fullWidth
              size="small"
              label="نوع الحادثة"
              value={safetyForm.type}
              onChange={e => setSafetyForm(f => ({ ...f, type: e.target.value }))}
            >
              {[
                { v: 'discomfort', l: 'إزعاج / عدم ارتياح' },
                { v: 'nausea', l: 'غثيان' },
                { v: 'dizziness', l: 'دوخة' },
                { v: 'fall', l: 'سقوط' },
                { v: 'other', l: 'أخرى' },
              ].map(o => (
                <MenuItem key={o.v} value={o.v}>
                  {o.l}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              fullWidth
              size="small"
              label="الشدة"
              value={safetyForm.severity}
              onChange={e => setSafetyForm(f => ({ ...f, severity: e.target.value }))}
            >
              {[
                { v: 'low', l: 'خفيف' },
                { v: 'medium', l: 'متوسط' },
                { v: 'high', l: 'شديد' },
              ].map(o => (
                <MenuItem key={o.v} value={o.v}>
                  {o.l}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="الوصف التفصيلي"
              fullWidth
              multiline
              rows={2}
              size="small"
              value={safetyForm.description}
              onChange={e => setSafetyForm(f => ({ ...f, description: e.target.value }))}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSafetyOpen(false)}>إلغاء</Button>
          <Button
            variant="contained"
            disabled={safetyLoading}
            onClick={handleSafety}
            sx={{ bgcolor: '#e65100' }}
          >
            {safetyLoading ? 'جاري...' : 'توثيق'}
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
